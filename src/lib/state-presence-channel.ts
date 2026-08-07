import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { prepareSupabaseRealtimeAuth } from "@/lib/supabase/client";
import {
  applyStateChannelTrack,
  readStateChannelUsers,
  type StatePresenceTrack,
} from "@/lib/state-presence-utils";

type Entry = {
  channel: RealtimeChannel;
  stateCode: string;
  userId: string;
  subscribed: boolean;
  refCount: number;
  syncListeners: Set<() => void>;
  ready: Promise<void>;
};

const entries = new Map<string, Entry>();

function entryKey(stateCode: string, userId: string) {
  return `${stateCode.toUpperCase()}:${userId}`;
}

function notifyEntry(entry: Entry) {
  for (const listener of entry.syncListeners) {
    listener();
  }
}

function waitForSubscribe(entry: Entry, timeoutMs = 20000) {
  if (entry.subscribed) {
    return Promise.resolve();
  }

  return Promise.race([
    entry.ready,
    new Promise<void>((_, reject) => {
      window.setTimeout(
        () => reject(new Error("Presence subscribe timeout")),
        timeoutMs
      );
    }),
  ]);
}

export function isStatePresenceSubscribed(stateCode: string, userId: string) {
  return entries.get(entryKey(stateCode, userId))?.subscribed ?? false;
}

export function readManagedStateUsers(stateCode: string, userId: string) {
  const entry = entries.get(entryKey(stateCode, userId));
  if (!entry?.subscribed) {
    return [];
  }

  return readStateChannelUsers(entry.channel, userId);
}

export async function trackManagedStatePresence(
  stateCode: string,
  userId: string,
  track: StatePresenceTrack
) {
  const entry = entries.get(entryKey(stateCode, userId));
  if (!entry) {
    return false;
  }

  await waitForSubscribe(entry);
  await applyStateChannelTrack(entry.channel, track);
  notifyEntry(entry);
  return true;
}

export async function acquireStatePresenceChannel(
  supabase: SupabaseClient,
  stateCode: string,
  userId: string,
  onSync: () => void
): Promise<() => void> {
  const normalizedState = stateCode.toUpperCase();
  const key = entryKey(normalizedState, userId);
  let entry = entries.get(key);

  if (!entry) {
    const authed = await prepareSupabaseRealtimeAuth(supabase);
    if (!authed) {
      throw new Error("Realtime auth unavailable");
    }

    const channel = supabase.channel(`state:${normalizedState}`, {
      config: { presence: { key: userId } },
    });

    let resolveReady!: () => void;
    let rejectReady!: (error: Error) => void;

    const ready = new Promise<void>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });

    entry = {
      channel,
      stateCode: normalizedState,
      userId,
      subscribed: false,
      refCount: 0,
      syncListeners: new Set(),
      ready,
    };
    entries.set(key, entry);

    channel.on("presence", { event: "sync" }, () => notifyEntry(entry!));
    channel.on("presence", { event: "join" }, () => {
      window.setTimeout(() => notifyEntry(entry!), 150);
    });
    channel.on("presence", { event: "leave" }, () => notifyEntry(entry!));

    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        entry!.subscribed = true;
        resolveReady();
        notifyEntry(entry!);
        return;
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        entry!.subscribed = false;
        rejectReady(new Error(`Presence channel ${status}`));
      }
    });
  }

  entry.refCount += 1;
  entry.syncListeners.add(onSync);

  await waitForSubscribe(entry);

  return () => {
    const current = entries.get(key);
    if (!current) return;

    current.refCount -= 1;
    current.syncListeners.delete(onSync);

    if (current.refCount > 0) {
      return;
    }

    void current.channel.untrack().catch(() => undefined);
    supabase.removeChannel(current.channel);
    entries.delete(key);
  };
}
