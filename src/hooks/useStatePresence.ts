"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { usePlatformPresence } from "@/contexts/PlatformPresenceContext";
import { createClient, prepareSupabaseRealtimeAuth } from "@/lib/supabase/client";
import type { ProfileGender } from "@/types/database";

export type PresenceUser = {
  userId: string;
  gender: ProfileGender;
  lookingFor: ProfileGender | null;
  inConversation?: boolean;
};

type PresencePayload = {
  user_id?: string;
  gender?: ProfileGender;
  looking_for?: ProfileGender | null;
  in_conversation?: boolean;
};

function readOnlineUsers(
  channel: RealtimeChannel,
  viewerUserId: string
): PresenceUser[] {
  const state = channel.presenceState<PresencePayload>();
  const byId = new Map<string, PresenceUser>();

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
        });
      }
    }
  }

  return Array.from(byId.values());
}

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

  useEffect(() => {
    if (!stateCode || !userId || !gender) {
      setOnlineUsers([]);
      setPresenceStatus("idle");
      return;
    }

    let active = true;

    function refreshOnlineUsers() {
      if (!channelRef.current || !subscribedRef.current) return;
      setOnlineUsers(readOnlineUsers(channelRef.current, userId));
    }

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
            await channel.track({
              user_id: userId,
              gender,
              looking_for: lookingFor,
              state_code: normalizedState,
              in_conversation: options?.inConversation ?? false,
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
    lookingFor,
    normalizedState,
    options?.inConversation,
    ownerKey,
    reportLobbyState,
    stateCode,
    supabase,
    userId,
  ]);

  useEffect(() => {
    if (!subscribedRef.current || !channelRef.current || !gender) return;

    void channelRef.current
      .track({
        user_id: userId,
        gender,
        looking_for: lookingFor,
        state_code: normalizedState,
        in_conversation: options?.inConversation ?? false,
      })
      .then(() => {
        if (channelRef.current) {
          setOnlineUsers(readOnlineUsers(channelRef.current, userId));
        }
      })
      .catch(() => undefined);
  }, [
    gender,
    lookingFor,
    normalizedState,
    options?.inConversation,
    userId,
    presenceStatus,
  ]);

  return { onlineUsers, presenceStatus };
}
