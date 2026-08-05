"use client";

import { useEffect, useMemo, useState } from "react";
import { useConversationTabs } from "@/contexts/ConversationTabsContext";
import { useStatePresenceContext } from "@/contexts/StatePresenceContext";
import { usePlatformPresence } from "@/contexts/PlatformPresenceContext";
import { loadUserProfileRoles } from "@/lib/admin";
import { createClient } from "@/lib/supabase/client";
import type { ProfileGender } from "@/types/database";

export function ConversationLobbyPresence() {
  const { tabs } = useConversationTabs();
  const { updatePresence } = useStatePresenceContext();
  const { reportLobbyState } = usePlatformPresence();
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState("");
  const [gender, setGender] = useState<ProfileGender | null>(null);
  const [isVip, setIsVip] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !active) {
        setUserId("");
        setGender(null);
        setIsVip(false);
        return;
      }

      const [{ data: profile }, roles] = await Promise.all([
        supabase
          .from("profiles")
          .select("gender")
          .eq("id", user.id)
          .maybeSingle(),
        loadUserProfileRoles(supabase, user.id),
      ]);

      if (!active) return;

      setUserId(user.id);
      setGender((profile?.gender as ProfileGender | null) ?? null);
      setIsVip(roles.isVip);
    }

    void loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUserId("");
        setGender(null);
        setIsVip(false);
        return;
      }

      void loadProfile();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!userId || !gender || tabs.length === 0) return;

    for (const tab of tabs) {
      updatePresence(`conversa:${tab.conversationId}`, tab.stateCode, {
        userId,
        gender,
        lookingFor: null,
        inConversation: !isVip,
        openToMatch: isVip,
      });
      reportLobbyState(`conversa:${tab.conversationId}`, tab.stateCode);
    }

    return () => {
      for (const tab of tabs) {
        updatePresence(`conversa:${tab.conversationId}`, tab.stateCode, null);
        reportLobbyState(`conversa:${tab.conversationId}`, null);
      }
    };
  }, [gender, isVip, reportLobbyState, tabs, updatePresence, userId]);

  return null;
}
