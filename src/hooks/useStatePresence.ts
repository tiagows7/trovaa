"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { usePlatformPresence } from "@/contexts/PlatformPresenceContext";
import { createClient, prepareSupabaseRealtimeAuth } from "@/lib/supabase/client";
import {
  applyStateChannelTrack,
  attachRawPresenceListeners,
  createStatePresenceChannel,
  readStateChannelUsers,
} from "@/lib/state-presence-utils";
import { useSupabaseRealtimeAuth } from "@/hooks/useSupabaseRealtimeAuth";
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
  const authReady = useSupabaseRealtimeAuth(supabase);
  const { reportLobbyState } = usePlatformPresence();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [presenceStatus, setPresenceStatus] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");

  const ownerKey = useMemo(
    () => `match:${stateCode.toUpperCase()}`,
    [stateCode]
  );

  const normalizedState = stateCode.toUpperCase();
  const inConversation = options?.inConversation ?? false;
  const isVip = options?.isVip ?? false;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);
  const connectingRef = useRef(false);

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

  const refreshOnlineUsers = useCallback(() => {
    const channel = channelRef.current;
    if (!channel || !userId || !subscribedRef.current) return;

    setOnlineUsers(readStateChannelUsers(channel, userId));
  }, [userId]);

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
    if (!authReady || !stateCode || !userId || !gender) {
      if (!stateCode || !userId || !gender) {
        setOnlineUsers([]);
        setPresenceStatus("idle");
      }
      return;
    }

    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function connect(attempt = 0) {
      if (!active || connectingRef.current) return;

      connectingRef.current = true;
      setPresenceStatus("connecting");
      subscribedRef.current = false;

      try {
        const authed = await prepareSupabaseRealtimeAuth(supabase);
        if (!active) return;

        if (!authed) {
          setPresenceStatus("error");
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
          normalizedState,
          userId
        );
        channelRef.current = channel;

        attachRawPresenceListeners(channel, userId, (users) => {
          if (active) {
            setOnlineUsers(users);
          }
        });

        channel.subscribe(async (status: string) => {
          if (!active) return;

          if (status === "SUBSCRIBED") {
            subscribedRef.current = true;

            try {
              await applyStateChannelTrack(channel, trackRef.current);
              if (!active) return;

              setOnlineUsers(readStateChannelUsers(channel, userId));
              setPresenceStatus("connected");

              for (const delay of [250, 750, 1500, 3000, 6000]) {
                window.setTimeout(async () => {
                  if (!active || !subscribedRef.current) return;
                  try {
                    await applyStateChannelTrack(channel, trackRef.current);
                    setOnlineUsers(readStateChannelUsers(channel, userId));
                  } catch {
                    // ignore transient track errors
                  }
                }, delay);
              }
            } catch {
              setPresenceStatus("error");
            }
            return;
          }

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            subscribedRef.current = false;
            setPresenceStatus("error");
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
      refreshOnlineUsers();
    }, 3000);

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

      setOnlineUsers([]);
      setPresenceStatus("idle");
    };
  }, [
    authReady,
    gender,
    normalizedState,
    refreshOnlineUsers,
    stateCode,
    supabase,
    userId,
  ]);

  useEffect(() => {
    if (presenceStatus !== "connected" || !userId || !gender) return;

    const channel = channelRef.current;
    if (!channel || !subscribedRef.current) return;

    void applyStateChannelTrack(channel, trackRef.current).then(() => {
      refreshOnlineUsers();
    });
  }, [
    gender,
    inConversation,
    isVip,
    lookingFor,
    presenceStatus,
    refreshOnlineUsers,
    userId,
  ]);

  return { onlineUsers, presenceStatus };
}
