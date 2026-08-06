"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePlatformPresence } from "@/contexts/PlatformPresenceContext";
import { useStatePresenceContext } from "@/contexts/StatePresenceContext";
import { createClient } from "@/lib/supabase/client";
import type { ProfileGender } from "@/types/database";

type ConversationRoutePresenceProps = {
  conversationId: string;
  stateCode: string;
};

export function ConversationRoutePresence({
  conversationId,
  stateCode,
}: ConversationRoutePresenceProps) {
  const { updatePresence } = useStatePresenceContext();
  const { reportLobbyState } = usePlatformPresence();
  const supabase = useMemo(() => createClient(), []);
  const trackedRef = useRef(false);

  useEffect(() => {
    let active = true;
    const ownerKey = `route:${conversationId}`;
    const normalizedState = stateCode.toUpperCase();

    reportLobbyState(ownerKey, normalizedState);

    async function track() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !active) return;

      const [{ data: conversation }, { data: profile }] = await Promise.all([
        supabase
          .from("conversations")
          .select("ended_at")
          .eq("id", conversationId)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("gender")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      if (!active || !conversation || conversation.ended_at || !profile?.gender) {
        return;
      }

      trackedRef.current = true;

      updatePresence(ownerKey, normalizedState, {
        userId: user.id,
        gender: profile.gender as ProfileGender,
        lookingFor: null,
        inConversation: true,
        openToMatch: true,
      });
      reportLobbyState(ownerKey, normalizedState);
    }

    void track();

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
    reportLobbyState,
    stateCode,
    supabase,
    updatePresence,
  ]);

  return null;
}
