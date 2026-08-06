import { ConversationTabsProvider } from "@/contexts/ConversationTabsContext";
import { ConversationUnreadProvider } from "@/contexts/ConversationUnreadContext";
import { ConnectionRequestsProvider } from "@/contexts/ConnectionRequestsContext";
import { ConnectionRequestLayer } from "@/components/chat/ConnectionRequestLayer";
import { ConversationLobbyPresence } from "@/components/chat/ConversationLobbyPresence";
import { ConversationLayoutPresence } from "@/components/chat/ConversationLayoutPresence";
import { ConversationWorkspaceHeader } from "@/components/chat/ConversationWorkspaceHeader";
import { ChatWorkspaceContent } from "@/components/chat/ChatWorkspaceContent";

export default function ChatLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConversationTabsProvider>
      <ConversationUnreadProvider>
        <ConnectionRequestsProvider>
          <ConversationLayoutPresence />
          <ConversationLobbyPresence />
          <div className="flex h-dvh flex-col">
            <ConversationWorkspaceHeader />
            <ChatWorkspaceContent>{children}</ChatWorkspaceContent>
            <ConnectionRequestLayer />
          </div>
        </ConnectionRequestsProvider>
      </ConversationUnreadProvider>
    </ConversationTabsProvider>
  );
}
