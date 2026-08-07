"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient, prepareSupabaseRealtimeAuth } from "@/lib/supabase/client";
import {
  applyStateChannelTrack,
  createStatePresenceChannel,
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
  const connectingRef = useRef(false);

  const publishTrack = useCallback(async (channel: RealtimeChannel) => {
    const current = trackRef.current;
    if (!subscribedRef.current || !current) return false;

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
      if (!active || !current || connectingRef.current) return;

      connectingRef.current = true;
      subscribedRef.current = false;

      try {
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

        const existing = channelRef.current;
        if (existing) {
          try {
            await existing.untrack();
          } catch {
            // ignore
          }
          supabase.removeChannel(existing);
          channelRef.current = null;
        }

        const channel = createStatePresenceChannel(
          supabase,
          current.stateCode,
          current.userId
        );
        channelRef.current = channel;

        channel.subscribe(async (status: string) => {
          if (!active || !trackRef.current) return;

          if (status === "SUBSCRIBED") {
            subscribedRef.current = true;
            const tracked = await publishTrack(channel);
            if (!tracked || !active) return;

            for (const delay of [250, 750, 1500, 3000, 6000]) {
              window.setTimeout(() => {
                if (active) void publishTrack(channel);
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
      } finally {
        connectingRef.current = false;
      }
    }

    void connect();

    const interval = window.setInterval(() => {
      const channel = channelRef.current;
      if (channel) {
        void publishTrack(channel);
      }
    }, 5000);

    return () => {
      active = false;
      subscribedRef.current = false;
      connectingRef.current = false;
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
    const channel = channelRef.current;
    if (!authReady || !trackRef.current || !subscribedRef.current || !channel) {
      return;
    }

    void publishTrack(channel);
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
