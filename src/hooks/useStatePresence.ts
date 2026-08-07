"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { usePlatformPresence } from "@/contexts/PlatformPresenceContext";
import { createClient, prepareSupabaseRealtimeAuth } from "@/lib/supabase/client";
import {
  applyStateChannelTrack,
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

  const publishTrack = useCallback(async () => {
    const channel = channelRef.current;
    if (!channel || !subscribedRef.current) return false;

    try {
      await applyStateChannelTrack(channel, trackRef.current);
      return true;
    } catch {
      return false;
    }
  }, []);

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
      if (!active) return;

      setPresenceStatus("connecting");
      subscribedRef.current = false;

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

      if (channelRef.current) {
        try {
          await channelRef.current.untrack();
        } catch {
          // ignore
        }
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase.channel(`state:${normalizedState}`, {
        config: { presence: { key: userId } },
      });

      channel.on("presence", { event: "sync" }, () => {
        refreshOnlineUsers();
      });
      channel.on("presence", { event: "join" }, () => {
        window.setTimeout(() => refreshOnlineUsers(), 150);
      });
      channel.on("presence", { event: "leave" }, () => {
        refreshOnlineUsers();
      });

      channel.subscribe(async (status: string) => {
        if (!active) return;

        if (status === "SUBSCRIBED") {
          subscribedRef.current = true;
          const tracked = await publishTrack();
          if (!active) return;

          if (tracked) {
            refreshOnlineUsers();
            setPresenceStatus("connected");
            for (const delay of [250, 750, 1500, 3000, 6000]) {
              window.setTimeout(() => {
                if (active) {
                  void publishTrack().then(() => refreshOnlineUsers());
                }
              }, delay);
            }
          } else {
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

      channelRef.current = channel;
    }

    void connect();

    const interval = window.setInterval(() => {
      void publishTrack().then(() => refreshOnlineUsers());
    }, 3000);

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

      setOnlineUsers([]);
      setPresenceStatus("idle");
    };
  }, [
    authReady,
    gender,
    normalizedState,
    publishTrack,
    refreshOnlineUsers,
    stateCode,
    supabase,
    userId,
  ]);

  useEffect(() => {
    if (presenceStatus !== "connected" || !userId || !gender) return;

    void publishTrack().then((tracked) => {
      if (tracked) {
        refreshOnlineUsers();
      }
    });
  }, [
    gender,
    inConversation,
    isVip,
    lookingFor,
    presenceStatus,
    publishTrack,
    refreshOnlineUsers,
    userId,
  ]);

  return { onlineUsers, presenceStatus };
}
