"use client";

import { useConversationTabs } from "@/contexts/ConversationTabsContext";
import { ConversationPanel } from "@/components/chat/ConversationPanel";

export function ConversationPanels() {
  const { tabs, activeTabId } = useConversationTabs();

  if (tabs.length === 0 || !activeTabId) {
    return null;
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
