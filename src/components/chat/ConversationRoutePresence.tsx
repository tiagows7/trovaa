"use client";

import { useEffect, useMemo } from "react";
import { usePlatformPresence } from "@/contexts/PlatformPresenceContext";
import { useStateChannelTracker } from "@/hooks/useStateChannelTracker";
import type { ProfileGender } from "@/types/database";

type ConversationRoutePresenceProps = {
  conversationId: string;
  stateCode: string;
  userId: string;
  gender: ProfileGender;
};

export function ConversationRoutePresence({
  conversationId,
  stateCode,
  userId,
  gender,
}: ConversationRoutePresenceProps) {
  const { reportLobbyState } = usePlatformPresence();
  const ownerKey = useMemo(
    () => `route:${conversationId}`,
    [conversationId]
  );
  const normalizedState = stateCode.toUpperCase();

  useStateChannelTracker({
    stateCode: normalizedState,
    userId,
    gender,
    lookingFor: null,
    inConversation: true,
  });

  useEffect(() => {
    reportLobbyState(ownerKey, normalizedState);
    return () => {
      reportLobbyState(ownerKey, null);
    };
  }, [normalizedState, ownerKey, reportLobbyState]);

  return null;
}
