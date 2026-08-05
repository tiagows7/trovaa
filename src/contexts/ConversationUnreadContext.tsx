"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useConversationTabs } from "@/contexts/ConversationTabsContext";
import { playNotificationBeep } from "@/lib/notification-sound";
import { createClient } from "@/lib/supabase/client";
import type { ConversationMessage } from "@/types/database";

type ConversationUnreadContextValue = {
  unreadByConversation: Map<string, number>;
  getUnreadCount: (conversationId: string) => number;
  markConversationRead: (conversationId: string) => void;
};

const ConversationUnreadContext =
  createContext<ConversationUnreadContextValue | null>(null);

export function ConversationUnreadProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const { tabs, activeTabId } = useConversationTabs();
  const [userId, setUserId] = useState("");
  const [unreadByConversation, setUnreadByConversation] = useState<
    Map<string, number>
  >(new Map());

  const highlightedTabIdRef = useRef<string | null>(null);
  const userIdRef = useRef("");

  const markConversationRead = useCallback((conversationId: string) => {
    setUnreadByConversation((current) => {
      if (!current.has(conversationId)) return current;
      const next = new Map(current);
      next.delete(conversationId);
      return next;
    });
  }, []);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    let active = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUserId(data.user?.id ?? "");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? "");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const match = pathname.match(/^\/conversa\/([^/]+)/);
    const highlightedId = match?.[1] ?? activeTabId;
    highlightedTabIdRef.current = highlightedId;

    if (highlightedId) {
      markConversationRead(highlightedId);
    }
  }, [activeTabId, markConversationRead, pathname]);

  useEffect(() => {
    if (!userId || tabs.length === 0) return;

    const channel = supabase.channel(`conversation-unread:${userId}`);

    for (const tab of tabs) {
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${tab.conversationId}`,
        },
        (payload) => {
          const message = payload.new as ConversationMessage;
          if (!message?.id || message.user_id === userIdRef.current) return;

          const isActiveConversation =
            message.conversation_id === highlightedTabIdRef.current;

          if (isActiveConversation) return;

          playNotificationBeep("message");
          setUnreadByConversation((current) => {
            const next = new Map(current);
            next.set(
              message.conversation_id,
              (next.get(message.conversation_id) ?? 0) + 1
            );
            return next;
          });
        }
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, tabs, userId]);

  const getUnreadCount = useCallback(
    (conversationId: string) => unreadByConversation.get(conversationId) ?? 0,
    [unreadByConversation]
  );

  const value = useMemo(
    () => ({
      unreadByConversation,
      getUnreadCount,
      markConversationRead,
    }),
    [unreadByConversation, getUnreadCount, markConversationRead]
  );

  return (
    <ConversationUnreadContext.Provider value={value}>
      {children}
    </ConversationUnreadContext.Provider>
  );
}

export function useConversationUnread() {
  const context = useContext(ConversationUnreadContext);
  if (!context) {
    throw new Error(
      "useConversationUnread deve ser usado dentro de ConversationUnreadProvider"
    );
  }
  return context;
}
