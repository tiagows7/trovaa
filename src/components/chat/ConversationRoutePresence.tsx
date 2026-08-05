"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePlatformPresence } from "@/contexts/PlatformPresenceContext";
import { useStatePresenceContext } from "@/contexts/StatePresenceContext";
import { loadUserProfileRoles } from "@/lib/admin";
import { createClient } from "@/lib/supabase/client";
import type { ProfileGender } from "@/types/database";

type ConversationRoutePresenceProps = {
  conversationId: string;
};

export function ConversationRoutePresence({
  conversationId,
}: ConversationRoutePresenceProps) {
  const { updatePresence } = useStatePresenceContext();
  const { reportLobbyState } = usePlatformPresence();
  const supabase = useMemo(() => createClient(), []);
  const stateCodeRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const ownerKey = `route:${conversationId}`;

    async function track() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !active) return;

      const [{ data: conversation }, { data: profile }, roles] =
        await Promise.all([
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
          loadUserProfileRoles(supabase, user.id),
        ]);

      if (
        !active ||
        !conversation ||
        conversation.ended_at ||
        !profile?.gender
      ) {
        return;
      }

      const stateCode = conversation.state_code.toUpperCase();
      stateCodeRef.current = stateCode;

      updatePresence(ownerKey, stateCode, {
        userId: user.id,
        gender: profile.gender as ProfileGender,
        lookingFor: null,
        inConversation: !roles.isVip,
        openToMatch: roles.isVip,
      });
      reportLobbyState(ownerKey, stateCode);
    }

    void track();

    return () => {
      active = false;
      const stateCode = stateCodeRef.current;
      if (stateCode) {
        updatePresence(ownerKey, stateCode, null);
        reportLobbyState(ownerKey, null);
      }
      stateCodeRef.current = null;
    };
  }, [conversationId, reportLobbyState, supabase, updatePresence]);

  return null;
}
