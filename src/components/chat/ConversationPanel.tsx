"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PrivateChatRoom } from "@/components/chat/PrivateChatRoom";
import {
  loadConversationPanelData,
  type ConversationPanelData,
} from "@/lib/conversation-panel-data";

type ConversationPanelProps = {
  conversationId: string;
  isActive: boolean;
};

export function ConversationPanel({ conversationId, isActive }: ConversationPanelProps) {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<ConversationPanelData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setError(null);
      const loaded = await loadConversationPanelData(supabase, conversationId);
      if (!active) return;

      if (!loaded) {
        setError("Não foi possível carregar esta conversa.");
        setData(null);
        return;
      }

      setData(loaded);
    }

    void load();

    return () => {
      active = false;
    };
  }, [conversationId, supabase]);

  if (error) {
    return (
      <div
        className={`flex flex-1 items-center justify-center px-6 text-sm text-red-600 ${isActive ? "" : "hidden"}`}
      >
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className={`flex flex-1 items-center justify-center ${isActive ? "" : "hidden"}`}
      >
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className={isActive ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
      <PrivateChatRoom
      embedded
      userId={data.userId}
      username={data.username}
      isVip={data.isVip}
      conversationId={data.tab.conversationId}
      stateCode={data.tab.stateCode}
      stateName={data.tab.stateName}
      partnerId={data.tab.partnerId}
      partnerName={data.tab.partnerName}
      partnerIsVip={data.partnerIsVip}
      partnerSaved={data.partnerSaved}
      initialMessages={data.initialMessages}
      initialSavedUsers={data.initialSavedUsers}
      isAdmin={data.isAdmin}
    />
    </div>
  );
}
