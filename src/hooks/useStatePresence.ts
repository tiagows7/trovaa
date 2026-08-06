"use client";

import { useEffect, useMemo, useState } from "react";
import { usePlatformPresence } from "@/contexts/PlatformPresenceContext";
import { useStatePresenceContext } from "@/contexts/StatePresenceContext";
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
  const { getOnlineUsers, updatePresence, presenceStatus, subscribePresenceSync, isStateLobbyReady } =
    useStatePresenceContext();
  const { reportLobbyState } = usePlatformPresence();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  const ownerKey = useMemo(
    () => `match:${stateCode.toUpperCase()}`,
    [stateCode]
  );

  useEffect(() => {
    if (!stateCode || !userId || !gender) return;

    updatePresence(ownerKey, stateCode, {
      userId,
      gender,
      lookingFor,
      inConversation: options?.inConversation ?? false,
    });
    reportLobbyState(ownerKey, stateCode);
  }, [
    gender,
    lookingFor,
    options?.inConversation,
    ownerKey,
    reportLobbyState,
    stateCode,
    updatePresence,
    userId,
    presenceStatus,
  ]);

  useEffect(() => {
    if (!stateCode || !userId) return;

    return () => {
      updatePresence(ownerKey, stateCode, null);
      reportLobbyState(ownerKey, null);
    };
  }, [ownerKey, reportLobbyState, stateCode, updatePresence, userId]);

  useEffect(() => {
    if (!stateCode || !userId) {
      setOnlineUsers([]);
      return;
    }

    const refresh = () => {
      setOnlineUsers(getOnlineUsers(stateCode, userId));
    };

    refresh();
    const unsubscribe = subscribePresenceSync(refresh);
    const interval = window.setInterval(refresh, 2000);

    return () => {
      unsubscribe();
      window.clearInterval(interval);
    };
  }, [getOnlineUsers, isStateLobbyReady, presenceStatus, stateCode, subscribePresenceSync, userId]);

  const effectiveStatus =
    !stateCode || !userId || !gender
      ? ("idle" as const)
      : isStateLobbyReady(stateCode)
        ? ("connected" as const)
        : presenceStatus === "error"
          ? ("error" as const)
          : ("connecting" as const);

  return { onlineUsers, presenceStatus: effectiveStatus };
}
