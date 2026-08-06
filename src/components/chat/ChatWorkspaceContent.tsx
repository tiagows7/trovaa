"use client";

import { usePathname } from "next/navigation";
import { ConversationPanels } from "@/components/chat/ConversationPanels";

export function ChatWorkspaceContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isConversationRoute = pathname.startsWith("/conversa/");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={
          isConversationRoute
            ? "hidden"
            : "flex min-h-0 flex-1 flex-col"
        }
        aria-hidden={isConversationRoute}
      >
        {children}
      </div>
      {isConversationRoute ? <ConversationPanels /> : null}
    </div>
  );
}
