"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePlatformPresence } from "@/contexts/PlatformPresenceContext";
import { useStatePresenceContext } from "@/contexts/StatePresenceContext";
import { createClient } from "@/lib/supabase/client";
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
  const { updatePresence } = useStatePresenceContext();
  const { reportLobbyState } = usePlatformPresence();
  const supabase = useMemo(() => createClient(), []);
  const trackedRef = useRef(false);
  const normalizedState = stateCode.toUpperCase();
  const ownerKey = `route:${conversationId}`;

  useEffect(() => {
    trackedRef.current = true;

    reportLobbyState(ownerKey, normalizedState);
    updatePresence(ownerKey, normalizedState, {
      userId,
      gender,
      lookingFor: null,
      inConversation: true,
      openToMatch: true,
    });

    let active = true;

    async function validatePresence() {
      const { data: conversation, error } = await supabase
        .from("conversations")
        .select("ended_at")
        .eq("id", conversationId)
        .maybeSingle();

      if (!active) return;

      if (error || !conversation) {
        return;
      }

      if (conversation.ended_at) {
        reportLobbyState(ownerKey, null);
        updatePresence(ownerKey, normalizedState, null);
        trackedRef.current = false;
      }
    }

    void validatePresence();

    return () => {
      active = false;
      reportLobbyState(ownerKey, null);
      if (trackedRef.current) {
        updatePresence(ownerKey, normalizedState, null);
        trackedRef.current = false;
      }
    };
  }, [
    conversationId,
    gender,
    normalizedState,
    ownerKey,
    reportLobbyState,
    supabase,
    updatePresence,
    userId,
  ]);

  return null;
}
