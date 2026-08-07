"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useConversationTabs } from "@/contexts/ConversationTabsContext";
import { usePlatformPresence } from "@/contexts/PlatformPresenceContext";
import { useStateChannelTracker } from "@/hooks/useStateChannelTracker";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isProfileVip } from "@/lib/vip";
import type { ProfileGender } from "@/types/database";

type ActiveConversationRef = {
  conversationId: string;
  stateCode: string;
};

export function ConversationLobbyPresence() {
  const pathname = usePathname();
  const { tabs } = useConversationTabs();
  const { reportLobbyState } = usePlatformPresence();
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState("");
  const [gender, setGender] = useState<ProfileGender | null>(null);
  const [isVip, setIsVip] = useState(false);
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
        setIsVip(false);
        setActiveConversations([]);
        return;
      }

      const [{ data: profile }, { data: conversations }] = await Promise.all([
        supabase
          .from("profiles")
          .select("gender, is_vip, vip_until")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("conversations")
          .select("id, state_code")
          .is("ended_at", null)
          .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`),
      ]);

      if (!active) return;

      setUserId(user.id);
      setGender((profile?.gender as ProfileGender | null) ?? null);
      setIsVip(isProfileVip(profile ?? undefined));
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
          setIsVip(false);
          setActiveConversations([]);
          return;
        }

        void loadProfile();
      }
    );

    const refreshInterval = window.setInterval(() => {
      void loadProfile();
    }, 30000);

    return () => {
      active = false;
      subscription.unsubscribe();
      window.clearInterval(refreshInterval);
    };
  }, [supabase]);

  const backgroundConversation = useMemo(() => {
    if (!userId || !gender) return null;

    const tracked = new Map<string, string>();

    for (const tab of tabs) {
      tracked.set(tab.conversationId, tab.stateCode.toUpperCase());
    }

    for (const conversation of activeConversations) {
      if (!tracked.has(conversation.conversationId)) {
        tracked.set(conversation.conversationId, conversation.stateCode);
      }
    }

    const conversaRouteMatch = pathname.match(/^\/conversa\/([^/]+)/);
    const activeConversaId = conversaRouteMatch?.[1] ?? null;

    for (const [conversationId, stateCode] of tracked.entries()) {
      if (conversationId === activeConversaId) {
        continue;
      }

      return {
        conversationId,
        stateCode,
        ownerKey: `conversa:${conversationId}`,
      };
    }

    return null;
  }, [activeConversations, gender, pathname, tabs, userId]);

  useStateChannelTracker(
    backgroundConversation && gender
      ? {
          stateCode: backgroundConversation.stateCode,
          userId,
          gender,
          lookingFor: null,
          inConversation: true,
          isVip,
        }
      : null
  );

  useEffect(() => {
    if (!backgroundConversation) return;

    reportLobbyState(
      backgroundConversation.ownerKey,
      backgroundConversation.stateCode
    );

    return () => {
      reportLobbyState(backgroundConversation.ownerKey, null);
    };
  }, [backgroundConversation, reportLobbyState]);

  return null;
}
