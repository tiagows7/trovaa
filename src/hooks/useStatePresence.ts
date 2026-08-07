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
};

export function useStatePresence(
  stateCode: string,
  userId: string,
  gender: ProfileGender | null,
  lookingFor: ProfileGender | null = null,
  options?: { inConversation?: boolean }
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

  useEffect(() => {
    if (!stateCode || !userId || !gender) {
      setOnlineUsers([]);
      setPresenceStatus("idle");
      return;
    }

    let active = true;

    function refreshOnlineUsers() {
      if (!channelRef.current || !subscribedRef.current) return;
      setOnlineUsers(readStateChannelUsers(channelRef.current, userId));
    }

    const profileGender = gender;

    async function connect() {
      setPresenceStatus("connecting");

      const authed = await prepareSupabaseRealtimeAuth(supabase);
      if (!active) return;

      if (!authed) {
        setPresenceStatus("error");
        return;
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

          try {
            await applyStateChannelTrack(channel, {
              stateCode: normalizedState,
              userId,
              gender: profileGender,
              lookingFor,
              inConversation,
            });
          } catch {
            setPresenceStatus("error");
            return;
          }

          refreshOnlineUsers();
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          subscribedRef.current = false;
          setPresenceStatus("error");
        }
      });

      channelRef.current = channel;
      reportLobbyState(ownerKey, normalizedState);
    }

    void connect();

    const interval = window.setInterval(refreshOnlineUsers, 2000);

    return () => {
      active = false;
      subscribedRef.current = false;
      window.clearInterval(interval);
      reportLobbyState(ownerKey, null);

      const channel = channelRef.current;
      if (channel) {
        void channel.untrack().catch(() => undefined);
        supabase.removeChannel(channel);
        channelRef.current = null;
      }

      setOnlineUsers([]);
      setPresenceStatus("idle");
    };
  }, [
    gender,
    inConversation,
    lookingFor,
    normalizedState,
    ownerKey,
    reportLobbyState,
    stateCode,
    supabase,
    userId,
  ]);

  useEffect(() => {
    if (!subscribedRef.current || !channelRef.current || !gender) return;

    void applyStateChannelTrack(channelRef.current, {
      stateCode: normalizedState,
      userId,
      gender,
      lookingFor,
      inConversation,
    })
      .then(() => {
        if (channelRef.current) {
          setOnlineUsers(readStateChannelUsers(channelRef.current, userId));
        }
      })
      .catch(() => undefined);
  }, [
    gender,
    inConversation,
    lookingFor,
    normalizedState,
    userId,
    presenceStatus,
  ]);

  return { onlineUsers, presenceStatus };
}
