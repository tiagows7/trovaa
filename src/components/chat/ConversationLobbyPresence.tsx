"use client";

import { useEffect, useMemo, useState } from "react";
import { useConversationTabs } from "@/contexts/ConversationTabsContext";
import { useStatePresenceContext } from "@/contexts/StatePresenceContext";
import { usePlatformPresence } from "@/contexts/PlatformPresenceContext";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { ProfileGender } from "@/types/database";

type ActiveConversationRef = {
  conversationId: string;
  stateCode: string;
};

export function ConversationLobbyPresence() {
  const { tabs } = useConversationTabs();
  const { updatePresence } = useStatePresenceContext();
  const { reportLobbyState } = usePlatformPresence();
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState("");
  const [gender, setGender] = useState<ProfileGender | null>(null);
  const [activeConversations, setActiveConversations] = useState<
    ActiveConversationRef[]
  >([]);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !active) {
        setUserId("");
        setGender(null);
        setActiveConversations([]);
        return;
      }

      const [{ data: profile }, { data: conversations }] = await Promise.all([
        supabase.from("profiles").select("gender").eq("id", user.id).maybeSingle(),
        supabase
          .from("conversations")
          .select("id, state_code")
          .is("ended_at", null)
          .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`),
      ]);

      if (!active) return;

      setUserId(user.id);
      setGender((profile?.gender as ProfileGender | null) ?? null);
      setActiveConversations(
        (conversations ?? []).map(
          (conversation: { id: string; state_code: string }) => ({
            conversationId: conversation.id,
            stateCode: conversation.state_code.toUpperCase(),
          })
        )
      );
    }

    void loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
      if (!session?.user) {
        setUserId("");
        setGender(null);
        setActiveConversations([]);
        return;
      }

      void loadProfile();
    });

    const refreshInterval = window.setInterval(() => {
      void loadProfile();
    }, 30000);

    return () => {
      active = false;
      subscription.unsubscribe();
      window.clearInterval(refreshInterval);
    };
  }, [supabase]);

  useEffect(() => {
    if (!userId || !gender) return;

    const tracked = new Map<string, string>();

    for (const tab of tabs) {
      tracked.set(tab.conversationId, tab.stateCode.toUpperCase());
    }

    for (const conversation of activeConversations) {
      if (!tracked.has(conversation.conversationId)) {
        tracked.set(conversation.conversationId, conversation.stateCode);
      }
    }

    const ownerKeys: string[] = [];

    for (const [conversationId, stateCode] of tracked.entries()) {
      const normalizedState = stateCode.toUpperCase();
      if (!normalizedState) continue;

      const ownerKey = `conversa:${conversationId}`;
      ownerKeys.push(ownerKey);

      updatePresence(ownerKey, normalizedState, {
        userId,
        gender,
        lookingFor: null,
        inConversation: true,
        openToMatch: true,
      });
      reportLobbyState(ownerKey, normalizedState);
    }

    return () => {
      for (const ownerKey of ownerKeys) {
        const conversationId = ownerKey.replace("conversa:", "");
        const stateCode =
          tracked.get(conversationId) ??
          activeConversations.find((c) => c.conversationId === conversationId)
            ?.stateCode ??
          tabs.find((t) => t.conversationId === conversationId)?.stateCode;

        updatePresence(
          ownerKey,
          stateCode?.toUpperCase() ?? "",
          null
        );
        reportLobbyState(ownerKey, null);
      }
    };
  }, [
    activeConversations,
    gender,
    reportLobbyState,
    tabs,
    updatePresence,
    userId,
  ]);

  return null;
}
