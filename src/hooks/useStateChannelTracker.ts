"use client";

import { useEffect, useMemo, useRef } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { createClient, prepareSupabaseRealtimeAuth } from "@/lib/supabase/client";
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
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);
  const trackRef = useRef(track);
  trackRef.current = track;

  useEffect(() => {
    if (!track) {
      subscribedRef.current = false;
      const channel = channelRef.current;
      if (channel) {
        void channel.untrack().catch(() => undefined);
        supabase.removeChannel(channel);
        channelRef.current = null;
      }
      return;
    }

    let active = true;
    const normalizedState = track.stateCode.toUpperCase();

    async function connect() {
      const authed = await prepareSupabaseRealtimeAuth(supabase);
      if (!active || !authed || !trackRef.current) return;

      const channel = supabase.channel(`state:${normalizedState}`, {
        config: { presence: { key: trackRef.current.userId } },
      });

      const notify = () => options?.onSync?.();

      channel.on("presence", { event: "sync" }, notify);
      channel.on("presence", { event: "join" }, notify);
      channel.on("presence", { event: "leave" }, notify);

      channel.subscribe(async (status: string) => {
        if (!active || !trackRef.current) return;

        if (status === "SUBSCRIBED") {
          subscribedRef.current = true;
          try {
            await applyStateChannelTrack(channel, trackRef.current);
            notify();
          } catch {
            subscribedRef.current = false;
          }
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          subscribedRef.current = false;
        }
      });

      channelRef.current = channel;
    }

    void connect();

    const interval = window.setInterval(() => {
      if (!subscribedRef.current || !channelRef.current || !trackRef.current) {
        return;
      }

      void applyStateChannelTrack(channelRef.current, trackRef.current).catch(
        () => undefined
      );
    }, 5000);

    return () => {
      active = false;
      subscribedRef.current = false;
      window.clearInterval(interval);

      const channel = channelRef.current;
      if (channel) {
        void channel.untrack().catch(() => undefined);
        supabase.removeChannel(channel);
        channelRef.current = null;
      }
    };
  }, [
    options?.onSync,
    supabase,
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
        byId.set(presence.user_id, {
          userId: presence.user_id,
          gender: presence.gender,
          lookingFor: presence.looking_for ?? null,
          inConversation: presence.in_conversation ?? false,
          isVip: presence.is_vip ?? false,
        });
      }
    }
  }

  return [...byId.values()];
}
