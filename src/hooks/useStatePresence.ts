"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlatformPresence } from "@/contexts/PlatformPresenceContext";
import { createClient } from "@/lib/supabase/client";
import {
  acquireStatePresenceChannel,
  readManagedStateUsers,
  trackManagedStatePresence,
} from "@/lib/state-presence-channel";
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
    if (!userId || !normalizedState) return;

    const next = readManagedStateUsers(normalizedState, userId);
    setOnlineUsers((current) => {
      if (next.length === 0 && current.length > 0) {
        return current;
      }
      return next;
    });
  }, [normalizedState, userId]);

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
    let retryTimer: number | null = null;
    let releaseChannel: (() => void) | null = null;

    async function syncTrack() {
      if (!active) return false;

      const tracked = await trackManagedStatePresence(
        normalizedState,
        userId,
        trackRef.current
      );

      if (tracked) {
        refreshOnlineUsers();
      }

      return tracked;
    }

    async function connect() {
      if (!active) return;

      setPresenceStatus("connecting");

      try {
        if (!releaseChannel) {
          releaseChannel = await acquireStatePresenceChannel(
            supabase,
            normalizedState,
            userId,
            refreshOnlineUsers
          );
        }

        if (!active) return;

        const tracked = await syncTrack();
        if (!tracked) {
          throw new Error("Presence track failed");
        }

        setPresenceStatus("connected");

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
        setPresenceStatus("error");

        retryTimer = window.setTimeout(() => {
          if (active) {
            void connect();
          }
        }, 2000);
      }
    }

    void connect();

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

    void trackManagedStatePresence(normalizedState, userId, trackRef.current).then(
      (tracked) => {
        if (tracked) {
          refreshOnlineUsers();
        }
      }
    );
  }, [
    gender,
    inConversation,
    isVip,
    lookingFor,
    normalizedState,
    presenceStatus,
    refreshOnlineUsers,
    userId,
  ]);

  return { onlineUsers, presenceStatus };
}
