"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePlatformPresence } from "@/contexts/PlatformPresenceContext";
import { useStatePresenceContext } from "@/contexts/StatePresenceContext";
import type { ProfileGender } from "@/types/database";

export function ConversationLayoutPresence() {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const { updatePresence } = useStatePresenceContext();
  const { reportLobbyState } = usePlatformPresence();
  const stateCodeRef = useRef<string | null>(null);

  const conversationId = useMemo(() => {
    const match = pathname.match(/^\/conversa\/([^/]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  useEffect(() => {
    if (!conversationId) return;

    let active = true;
    const ownerKey = `layout:${conversationId}`;

    async function track() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !active) return;

      const [{ data: conversation }, { data: profile }] = await Promise.all([
        supabase
          .from("conversations")
          .select("state_code, ended_at")
          .eq("id", conversationId)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("gender")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      if (
        !active ||
        !conversation ||
        conversation.ended_at ||
        !profile?.gender
      ) {
        if (active && conversation?.ended_at) {
          const endedState = conversation.state_code?.toUpperCase();
          if (endedState) {
            reportLobbyState(ownerKey, null);
            updatePresence(ownerKey, endedState, null);
          }
          stateCodeRef.current = null;
        }
        return;
      }

      const normalizedState = conversation.state_code.toUpperCase();
      stateCodeRef.current = normalizedState;

      reportLobbyState(ownerKey, normalizedState);
      updatePresence(ownerKey, normalizedState, {
        userId: user.id,
        gender: profile.gender as ProfileGender,
        lookingFor: null,
        inConversation: true,
        openToMatch: true,
      });
    }

    void track();

    return () => {
      active = false;
      const stateCode = stateCodeRef.current;
      reportLobbyState(ownerKey, null);
      if (stateCode) {
        updatePresence(ownerKey, stateCode, null);
        stateCodeRef.current = null;
      }
    };
  }, [conversationId, reportLobbyState, supabase, updatePresence]);

  return null;
}
