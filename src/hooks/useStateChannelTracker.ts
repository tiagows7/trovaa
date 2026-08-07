"use client";

import { useEffect, useMemo, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  acquireStatePresenceChannel,
  trackManagedStatePresence,
} from "@/lib/state-presence-channel";
import { useSupabaseRealtimeAuth } from "@/hooks/useSupabaseRealtimeAuth";
import type { ProfileGender } from "@/types/database";

export type StatePresenceTrack = {
  userId: string;
  gender: ProfileGender;
  lookingFor: ProfileGender | null;
  inConversation: boolean;
  isVip: boolean;
};

type TrackOptions = StatePresenceTrack & {
  stateCode: string;
};

export async function applyStateChannelTrack(
  channel: RealtimeChannel,
  track: TrackOptions
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

export function useStateChannelTracker(
  track: TrackOptions | null,
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

    async function connect(current: TrackOptions) {
      if (!active || !trackRef.current) return;

      try {
        releaseChannel?.();
        releaseChannel = await acquireStatePresenceChannel(
          supabase,
          current.stateCode,
          current.userId,
          notify
        );

        if (!active || !trackRef.current) {
          releaseChannel();
          releaseChannel = null;
          return;
        }

        await trackManagedStatePresence(
          current.stateCode,
          current.userId,
          trackRef.current
        );
        notify();

        for (const delay of [250, 750, 1500]) {
          window.setTimeout(() => {
            if (active && trackRef.current) {
              void trackManagedStatePresence(
                trackRef.current.stateCode,
                trackRef.current.userId,
                trackRef.current
              ).then(() => notify());
            }
          }, delay);
        }
      } catch {
        if (!active) return;
        retryTimer = window.setTimeout(() => {
          if (active && trackRef.current) {
            void connect(trackRef.current);
          }
        }, 2000);
      }
    }

    void connect(track);

    const interval = window.setInterval(() => {
      if (!trackRef.current) return;

      void trackManagedStatePresence(
        trackRef.current.stateCode,
        trackRef.current.userId,
        trackRef.current
      ).then(() => notify());
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

export function readStateChannelUsers(
  channel: RealtimeChannel,
  viewerUserId: string
) {
  type PresencePayload = {
    user_id?: string;
    gender?: ProfileGender;
    looking_for?: ProfileGender | null;
    in_conversation?: boolean;
    is_vip?: boolean;
  };

  const state = channel.presenceState<PresencePayload>();
  const byId = new Map<
    string,
    {
      userId: string;
      gender: ProfileGender;
      lookingFor: ProfileGender | null;
      inConversation: boolean;
      isVip: boolean;
    }
  >();

  for (const presences of Object.values(state)) {
    for (const presence of presences) {
      if (
        presence.user_id &&
        presence.gender &&
        presence.user_id !== viewerUserId
      ) {
        const inConversation = presence.in_conversation ?? false;
        const isVip = presence.is_vip ?? false;
        const existing = byId.get(presence.user_id);

        byId.set(presence.user_id, {
          userId: presence.user_id,
          gender: presence.gender,
          lookingFor: presence.looking_for ?? existing?.lookingFor ?? null,
          inConversation: existing?.inConversation || inConversation,
          isVip: existing?.isVip || isVip,
        });
      }
    }
  }

  return [...byId.values()];
}
