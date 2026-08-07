"use client";

import { useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  acquireStatePresenceChannel,
  trackManagedStatePresence,
} from "@/lib/state-presence-channel";
import type { StatePresenceTrack } from "@/lib/state-presence-utils";
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

  useEffect(() => {
    if (!authReady || !track) {
      return;
    }

    let active = true;
    let retryTimer: number | null = null;
    let releaseChannel: (() => void) | null = null;

    const notify = () => {
      onSyncRef.current?.();
    };

    async function syncTrack() {
      if (!active || !trackRef.current) return false;

      const tracked = await trackManagedStatePresence(
        trackRef.current.stateCode,
        trackRef.current.userId,
        trackRef.current
      );

      if (tracked) {
        notify();
      }

      return tracked;
    }

    async function connect(current: StatePresenceTrack) {
      if (!active || !trackRef.current) return;

      try {
        if (!releaseChannel) {
          releaseChannel = await acquireStatePresenceChannel(
            supabase,
            current.stateCode,
            current.userId,
            notify
          );
        }

        if (!active || !trackRef.current) return;

        const tracked = await syncTrack();
        if (!tracked) {
          throw new Error("Presence track failed");
        }

        for (const delay of [250, 750, 1500, 3000, 6000]) {
          window.setTimeout(() => {
            if (active) {
              void syncTrack();
            }
          }, delay);
        }
      } catch {
        if (!active) return;

        releaseChannel?.();
        releaseChannel = null;

        retryTimer = window.setTimeout(() => {
          if (active && trackRef.current) {
            void connect(trackRef.current);
          }
        }, 2000);
      }
    }

    void connect(track);

    const interval = window.setInterval(() => {
      void syncTrack();
    }, 5000);

    return () => {
      active = false;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
      window.clearInterval(interval);
      releaseChannel?.();
      releaseChannel = null;
    };
  }, [
    authReady,
    supabase,
    track?.gender,
    track?.inConversation,
    track?.isVip,
    track?.lookingFor,
    track?.stateCode,
    track?.userId,
  ]);

  useEffect(() => {
    if (!authReady || !trackRef.current) return;

    void trackManagedStatePresence(
      trackRef.current.stateCode,
      trackRef.current.userId,
      trackRef.current
    ).then((tracked) => {
      if (tracked) {
        onSyncRef.current?.();
      }
    });
  }, [
    authReady,
    track?.gender,
    track?.inConversation,
    track?.isVip,
    track?.lookingFor,
    track?.stateCode,
    track?.userId,
  ]);
}
