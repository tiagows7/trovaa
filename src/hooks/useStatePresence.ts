"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { usePlatformPresence } from "@/contexts/PlatformPresenceContext";
import {
  applyStateChannelTrack,
  readStateChannelUsers,
} from "@/hooks/useStateChannelTracker";
import { createClient, prepareSupabaseRealtimeAuth } from "@/lib/supabase/client";
import type { ProfileGender } from "@/types/database";

export type PresenceUser = {
  userId: string;
  gender: ProfileGender;
  lookingFor: ProfileGender | null;
  inConversation?: boolean;
  isVip?: boolean;
};

export function useStatePresence(
  stateCode: string,
  userId: string,
  gender: ProfileGender | null,
  lookingFor: ProfileGender | null = null,
  options?: { inConversation?: boolean; isVip?: boolean }
) {
  const supabase = useMemo(() => createClient(), []);
  const { reportLobbyState } = usePlatformPresence();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [presenceStatus, setPresenceStatus] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");

  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);

  const ownerKey = useMemo(
    () => `match:${stateCode.toUpperCase()}`,
    [stateCode]
  );

  const normalizedState = stateCode.toUpperCase();
  const inConversation = options?.inConversation ?? false;
  const isVip = options?.isVip ?? false;

  const trackRef = useRef({
    userId,
    gender: gender as ProfileGender,
    lookingFor,
    inConversation,
    isVip,
    stateCode: normalizedState,
  });

  trackRef.current = {
    userId,
    gender: gender as ProfileGender,
    lookingFor,
    inConversation,
    isVip,
    stateCode: normalizedState,
  };

  useEffect(() => {
    if (!stateCode || !userId || !gender) {
      reportLobbyState(ownerKey, null);
      return;
    }

    reportLobbyState(ownerKey, normalizedState);

    return () => {
      reportLobbyState(ownerKey, null);
    };
  }, [gender, normalizedState, ownerKey, reportLobbyState, stateCode, userId]);

  useEffect(() => {
    if (!stateCode || !userId || !gender) {
      setOnlineUsers([]);
      setPresenceStatus("idle");
      return;
    }

    let active = true;
    let retryTimer: number | null = null;

    function refreshOnlineUsers() {
      if (!channelRef.current || !subscribedRef.current) return;
      setOnlineUsers(readStateChannelUsers(channelRef.current, userId));
    }

    async function syncTrack() {
      const channel = channelRef.current;
      const track = trackRef.current;
      if (!channel || !subscribedRef.current || !track.gender) return;

      try {
        await applyStateChannelTrack(channel, track);
        refreshOnlineUsers();
      } catch {
        // channel may be reconnecting
      }
    }

    async function connect() {
      if (!active) return;

      setPresenceStatus("connecting");

      const authed = await prepareSupabaseRealtimeAuth(supabase);
      if (!active) return;

      if (!authed) {
        setPresenceStatus("error");
        retryTimer = window.setTimeout(() => {
          if (active) {
            void connect();
          }
        }, 2000);
        return;
      }

      const existing = channelRef.current;
      if (existing) {
        void existing.untrack().catch(() => undefined);
        supabase.removeChannel(existing);
        channelRef.current = null;
        subscribedRef.current = false;
      }

      const channel = supabase.channel(`state:${normalizedState}`, {
        config: { presence: { key: userId } },
      });

      channel.on("presence", { event: "sync" }, refreshOnlineUsers);
      channel.on("presence", { event: "join" }, refreshOnlineUsers);
      channel.on("presence", { event: "leave" }, refreshOnlineUsers);

      channel.subscribe(async (status: string) => {
        if (!active) return;

        if (status === "SUBSCRIBED") {
          subscribedRef.current = true;
          setPresenceStatus("connected");
          await syncTrack();
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          subscribedRef.current = false;
          setPresenceStatus("error");
          retryTimer = window.setTimeout(() => {
            if (active) {
              void connect();
            }
          }, 2000);
        }
      });

      channelRef.current = channel;
    }

    void connect();

    const interval = window.setInterval(refreshOnlineUsers, 2000);

    return () => {
      active = false;
      subscribedRef.current = false;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
      window.clearInterval(interval);

      const channel = channelRef.current;
      if (channel) {
        void channel.untrack().catch(() => undefined);
        supabase.removeChannel(channel);
        channelRef.current = null;
      }

      setOnlineUsers([]);
      setPresenceStatus("idle");
    };
  }, [gender, normalizedState, stateCode, supabase, userId]);

  useEffect(() => {
    if (!subscribedRef.current || !channelRef.current || !gender) return;

    void applyStateChannelTrack(channelRef.current, trackRef.current)
      .then(() => {
        if (channelRef.current && subscribedRef.current) {
          setOnlineUsers(
            readStateChannelUsers(channelRef.current, trackRef.current.userId)
          );
        }
      })
      .catch(() => undefined);
  }, [gender, inConversation, isVip, lookingFor, userId]);

  return { onlineUsers, presenceStatus };
}
