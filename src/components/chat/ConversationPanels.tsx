"use client";

import { useConversationTabs } from "@/contexts/ConversationTabsContext";
import { ConversationPanel } from "@/components/chat/ConversationPanel";

export function ConversationPanels() {
  const { tabs, activeTabId } = useConversationTabs();

  if (tabs.length === 0 || !activeTabId) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Carregando conversa...
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {tabs.map((tab) => (
        <ConversationPanel
          key={tab.conversationId}
          conversationId={tab.conversationId}
          isActive={tab.conversationId === activeTabId}
        />
      ))}
    </div>
  );
}
