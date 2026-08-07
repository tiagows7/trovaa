"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient, prepareSupabaseRealtimeAuth } from "@/lib/supabase/client";
import {
  applyStateChannelTrack,
  type StatePresenceTrack,
} from "@/lib/state-presence-utils";
import { useSupabaseRealtimeAuth } from "@/hooks/useSupabaseRealtimeAuth";

export type { StatePresenceTrack } from "@/lib/state-presence-utils";
export {
  applyStateChannelTrack,
  readStateChannelUsers,
} from "@/lib/state-presence-utils";

export function useStateChannelTracker(
  track: StatePresenceTrack | null,
  options?: { onSync?: () => void }
) {
  const supabase = useMemo(() => createClient(), []);
  const authReady = useSupabaseRealtimeAuth(supabase);
  const trackRef = useRef(track);
  trackRef.current = track;
  const onSyncRef = useRef(options?.onSync);
  onSyncRef.current = options?.onSync;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);

  const publishTrack = useCallback(async () => {
    const channel = channelRef.current;
    const current = trackRef.current;
    if (!channel || !subscribedRef.current || !current) return false;

    try {
      await applyStateChannelTrack(channel, current);
      onSyncRef.current?.();
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!authReady || !track) {
      return;
    }

    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function connect(attempt = 0) {
      const current = trackRef.current;
      if (!active || !current) return;

      subscribedRef.current = false;

      const authed = await prepareSupabaseRealtimeAuth(supabase);
      if (!active || !trackRef.current) return;

      if (!authed) {
        if (attempt < 8) {
          retryTimer = setTimeout(() => {
            void connect(attempt + 1);
          }, 500 * (attempt + 1));
        }
        return;
      }

      if (channelRef.current) {
        try {
          await channelRef.current.untrack();
        } catch {
          // ignore
        }
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase.channel(`state:${current.stateCode}`, {
        config: { presence: { key: current.userId } },
      });

      channel.on("presence", { event: "sync" }, () => onSyncRef.current?.());
      channel.on("presence", { event: "join" }, () => {
        window.setTimeout(() => onSyncRef.current?.(), 150);
      });
      channel.on("presence", { event: "leave" }, () => onSyncRef.current?.());

      channel.subscribe(async (status: string) => {
        if (!active || !trackRef.current) return;

        if (status === "SUBSCRIBED") {
          subscribedRef.current = true;
          const tracked = await publishTrack();
          if (!tracked || !active) return;

          for (const delay of [250, 750, 1500, 3000, 6000]) {
            window.setTimeout(() => {
              if (active) void publishTrack();
            }, delay);
          }
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          subscribedRef.current = false;
          retryTimer = setTimeout(() => {
            void connect(0);
          }, 2000);
        }
      });

      channelRef.current = channel;
    }

    void connect();

    const interval = window.setInterval(() => {
      void publishTrack();
    }, 5000);

    return () => {
      active = false;
      subscribedRef.current = false;
      if (retryTimer) clearTimeout(retryTimer);
      clearInterval(interval);

      const channel = channelRef.current;
      channelRef.current = null;
      if (channel) {
        void channel.untrack().catch(() => undefined);
        supabase.removeChannel(channel);
      }
    };
  }, [
    authReady,
    publishTrack,
    supabase,
    track?.gender,
    track?.inConversation,
    track?.isVip,
    track?.lookingFor,
    track?.stateCode,
    track?.userId,
  ]);

  useEffect(() => {
    if (!authReady || !trackRef.current || !subscribedRef.current) return;

    void publishTrack();
  }, [
    authReady,
    publishTrack,
    track?.gender,
    track?.inConversation,
    track?.isVip,
    track?.lookingFor,
    track?.stateCode,
    track?.userId,
  ]);
}
