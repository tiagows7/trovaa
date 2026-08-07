import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { ProfileGender } from "@/types/database";

export type StatePresenceTrack = {
  userId: string;
  gender: ProfileGender;
  lookingFor: ProfileGender | null;
  inConversation: boolean;
  isVip: boolean;
  stateCode: string;
};

export type LivePresenceUser = {
  userId: string;
  gender: ProfileGender;
  lookingFor: ProfileGender | null;
  inConversation: boolean;
  isVip: boolean;
};

type PresencePayload = {
  user_id?: string;
  gender?: ProfileGender;
  looking_for?: ProfileGender | null;
  in_conversation?: boolean;
  is_vip?: boolean;
};

type RawPresenceEntry = {
  metas?: PresencePayload[];
};

export type RawPresenceState = Record<string, RawPresenceEntry>;

export type RawPresenceDiff = {
  joins?: RawPresenceState;
  leaves?: RawPresenceState;
};

function mergePresenceMeta(
  byId: Map<string, LivePresenceUser>,
  meta: PresencePayload
) {
  if (!meta.user_id || !meta.gender) return;

  const existing = byId.get(meta.user_id);
  const inConversation = meta.in_conversation ?? false;
  const isVip = meta.is_vip ?? false;

  byId.set(meta.user_id, {
    userId: meta.user_id,
    gender: meta.gender,
    lookingFor: meta.looking_for ?? existing?.lookingFor ?? null,
    inConversation: existing?.inConversation || inConversation,
    isVip: existing?.isVip || isVip,
  });
}

export function parseRawPresenceState(
  raw: RawPresenceState,
  viewerUserId: string
): LivePresenceUser[] {
  const byId = new Map<string, LivePresenceUser>();

  for (const entry of Object.values(raw)) {
    for (const meta of entry.metas ?? []) {
      if (meta.user_id && meta.user_id !== viewerUserId) {
        mergePresenceMeta(byId, meta);
      }
    }
  }

  return [...byId.values()];
}

export function applyRawPresenceDiff(
  current: Map<string, LivePresenceUser>,
  diff: RawPresenceDiff,
  viewerUserId: string
) {
  for (const entry of Object.values(diff.joins ?? {})) {
    for (const meta of entry.metas ?? []) {
      if (meta.user_id && meta.user_id !== viewerUserId) {
        mergePresenceMeta(current, meta);
      }
    }
  }

  for (const entry of Object.values(diff.leaves ?? {})) {
    for (const meta of entry.metas ?? []) {
      if (meta.user_id) {
        current.delete(meta.user_id);
      }
    }
  }
}

export function attachRawPresenceListeners(
  channel: RealtimeChannel,
  viewerUserId: string,
  onUpdate: (users: LivePresenceUser[]) => void
) {
  const liveUsers = new Map<string, LivePresenceUser>();

  const emit = () => {
    onUpdate([...liveUsers.values()]);
  };

  const syncFromSdk = () => {
    const fromSdk = readStateChannelUsers(channel, viewerUserId);
    if (fromSdk.length === 0) return;

    liveUsers.clear();
    for (const user of fromSdk) {
      liveUsers.set(user.userId, user);
    }
    emit();
  };

  const rawChannel = channel as RealtimeChannel & {
    on(
      event: "presence_state",
      filter: Record<string, never>,
      callback: (payload: RawPresenceState) => void
    ): RealtimeChannel;
    on(
      event: "presence_diff",
      filter: Record<string, never>,
      callback: (payload: RawPresenceDiff) => void
    ): RealtimeChannel;
  };

  rawChannel.on("presence_state", {}, (payload) => {
    liveUsers.clear();
    for (const user of parseRawPresenceState(payload, viewerUserId)) {
      liveUsers.set(user.userId, user);
    }
    emit();
  });

  rawChannel.on("presence_diff", {}, (payload) => {
    applyRawPresenceDiff(liveUsers, payload, viewerUserId);
    emit();
  });

  channel.on("presence", { event: "sync" }, syncFromSdk);
  channel.on("presence", { event: "join" }, () => {
    window.setTimeout(syncFromSdk, 150);
  });
  channel.on("presence", { event: "leave" }, syncFromSdk);

  return emit;
}

export function createStatePresenceChannel(
  supabase: SupabaseClient,
  stateCode: string,
  userId: string
) {
  return supabase.channel(`state:${stateCode.toUpperCase()}`, {
    config: {
      presence: {
        key: userId,
        enabled: true,
      },
    },
  });
}

export async function applyStateChannelTrack(
  channel: RealtimeChannel,
  track: StatePresenceTrack
) {
  const normalizedState = track.stateCode.toUpperCase();
  await channel.track({
    user_id: track.userId,
    gender: track.gender,
    looking_for: track.lookingFor,
    state_code: normalizedState,
    in_conversation: track.inConversation,
    is_vip: track.isVip,
  });
}

export function readStateChannelUsers(
  channel: RealtimeChannel,
  viewerUserId: string
): LivePresenceUser[] {
  const state = channel.presenceState<PresencePayload>();
  const byId = new Map<string, LivePresenceUser>();

  for (const presences of Object.values(state)) {
    for (const presence of presences) {
      if (
        presence.user_id &&
        presence.gender &&
        presence.user_id !== viewerUserId
      ) {
        mergePresenceMeta(byId, presence);
      }
    }
  }

  return [...byId.values()];
}
