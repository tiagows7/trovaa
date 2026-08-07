"use client";

import { useEffect, useMemo, useState } from "react";
import { usePlatformPresence } from "@/contexts/PlatformPresenceContext";
import {
  fetchMatchLobbyUsers,
  leaveMatchLobbyPresence,
  publishMatchLobbyPresence,
} from "@/lib/match-lobby-presence";
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
  const shouldSync =
    Boolean(stateCode && userId && gender) &&
    (lookingFor !== null || inConversation);

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
    if (!shouldSync || !gender) {
      setOnlineUsers([]);
      setPresenceStatus("idle");
      return;
    }

    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function sync() {
      if (!active || !gender) return;

      setPresenceStatus((current) =>
        current === "connected" ? current : "connecting"
      );

      try {
        await publishMatchLobbyPresence({
          stateCode: normalizedState,
          gender,
          lookingFor,
          inConversation,
          isVip,
        });

        const users = await fetchMatchLobbyUsers(normalizedState);

        if (!active) return;

        setOnlineUsers(users);
        setPresenceStatus("connected");
      } catch {
        if (!active) return;

        setPresenceStatus("error");
        retryTimer = setTimeout(() => {
          void sync();
        }, 2000);
      }
    }

    void sync();

    const interval = window.setInterval(() => {
      void sync();
    }, 3000);

    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
      clearInterval(interval);
      void leaveMatchLobbyPresence();
      setOnlineUsers([]);
      setPresenceStatus("idle");
    };
  }, [
    gender,
    inConversation,
    isVip,
    lookingFor,
    normalizedState,
    shouldSync,
  ]);

  return { onlineUsers, presenceStatus };
}
