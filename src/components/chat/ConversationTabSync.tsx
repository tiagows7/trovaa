"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useConversationTabs } from "@/contexts/ConversationTabsContext";
import { loadConversationTabMeta } from "@/lib/conversation-panel-data";
import { loadUserProfileRoles } from "@/lib/admin";
import { markConversationSessionActive } from "@/components/chat/ConversationSessionCleanup";

type ConversationTabSyncProps = {
  conversationId: string;
};

export function ConversationTabSync({ conversationId }: ConversationTabSyncProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { openAndActivate, setActiveTab, setIsVip } = useConversationTabs();

  useEffect(() => {
    let active = true;

    async function sync() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !active) return;

      const roles = await loadUserProfileRoles(supabase, user.id);
      if (!active) return;

      setIsVip(roles.isVip);

      const tab = await loadConversationTabMeta(
        supabase,
        conversationId,
        user.id,
        roles.isVip
      );

      if (!active) return;

      if (!tab) {
        router.replace("/salas");
        return;
      }

      markConversationSessionActive();
      openAndActivate(tab, { replace: !roles.isVip });
      setActiveTab(conversationId);
    }

    void sync();

    return () => {
      active = false;
    };
  }, [conversationId, openAndActivate, router, setActiveTab, setIsVip, supabase]);

  return null;
}
