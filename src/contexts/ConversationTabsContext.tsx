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
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { endConversation } from "@/lib/conversations";
import { loadConversationTabMeta, loadActiveConversationTabs } from "@/lib/conversation-panel-data";
import { loadUserProfileRoles } from "@/lib/admin";

export type ConversationTab = {
  conversationId: string;
  partnerId: string;
  partnerName: string;
  stateCode: string;
  stateName: string;
};

type ConversationTabsContextValue = {
  tabs: ConversationTab[];
  activeTabId: string | null;
  isVip: boolean;
  openTab: (tab: ConversationTab, options?: { replace?: boolean }) => void;
  closeTab: (conversationId: string) => void;
  setActiveTab: (conversationId: string) => void;
  activateConversation: (conversationId: string) => void;
  openAndActivate: (tab: ConversationTab, options?: { replace?: boolean }) => void;
  openConversationById: (conversationId: string) => Promise<boolean>;
  setIsVip: (value: boolean) => void;
  clearAllTabs: () => void;
};

const ConversationTabsContext = createContext<ConversationTabsContextValue | null>(
  null
);

export function ConversationTabsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [tabs, setTabs] = useState<ConversationTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isVip, setIsVip] = useState(false);
  const [userId, setUserId] = useState("");
  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);
  const isVipRef = useRef(isVip);

  tabsRef.current = tabs;
  activeTabIdRef.current = activeTabId;
  isVipRef.current = isVip;

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
    if (!userId) return;

    let active = true;

    void (async () => {
      const roles = await loadUserProfileRoles(supabase, userId);
      if (!active) return;

      setIsVip(roles.isVip);

      const hydratedTabs = await loadActiveConversationTabs(supabase, userId);
      if (!active || hydratedTabs.length === 0) return;

      setTabs((current) => {
        const merged = [...current];
        for (const tab of hydratedTabs) {
          if (
            !merged.some((entry) => entry.conversationId === tab.conversationId)
          ) {
            merged.push(tab);
          }
        }
        return merged;
      });
    })();

    return () => {
      active = false;
    };
  }, [supabase, userId]);

  const clearAllTabs = useCallback(() => {
    setTabs([]);
    setActiveTabId(null);
  }, []);

  const openTab = useCallback(
    (tab: ConversationTab, options?: { replace?: boolean }) => {
      setTabs((current) => {
        const existing = current.find(
          (entry) => entry.conversationId === tab.conversationId
        );
        if (existing) return current;

        if (options?.replace) {
          return [tab];
        }

        return [...current, tab];
      });
      setActiveTabId(tab.conversationId);
    },
    []
  );

  const closeTab = useCallback(
    (conversationId: string) => {
      void endConversation(supabase, conversationId);

      const next = tabsRef.current.filter(
        (entry) => entry.conversationId !== conversationId
      );
      const wasActive = activeTabIdRef.current === conversationId;
      const fallback = wasActive
        ? (next[0]?.conversationId ?? null)
        : activeTabIdRef.current;

      setTabs(next);
      setActiveTabId(fallback);

      if (wasActive) {
        const route = fallback ? `/conversa/${fallback}` : "/salas";
        queueMicrotask(() => router.replace(route));
      }
    },
    [router, supabase]
  );

  const setActiveTab = useCallback((conversationId: string) => {
    setActiveTabId(conversationId);
  }, []);

  const activateConversation = useCallback(
    (conversationId: string) => {
      const exists = tabsRef.current.some(
        (entry) => entry.conversationId === conversationId
      );
      if (!exists) return;

      setActiveTabId(conversationId);
      router.replace(`/conversa/${conversationId}`);
    },
    [router]
  );

  const openAndActivate = useCallback(
    (tab: ConversationTab, options?: { replace?: boolean }) => {
      setTabs((current) => {
        const existing = current.find(
          (entry) => entry.conversationId === tab.conversationId
        );
        if (existing) return current;

        if (options?.replace) {
          return [tab];
        }

        return [...current, tab];
      });
      setActiveTabId(tab.conversationId);
      router.replace(`/conversa/${tab.conversationId}`);
    },
    [router]
  );

  const openConversationById = useCallback(
    async (conversationId: string) => {
      if (!userId) return false;

      const roles = await loadUserProfileRoles(supabase, userId);

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const tab = await loadConversationTabMeta(
          supabase,
          conversationId,
          userId,
          roles.isVip
        );

        if (tab) {
          openAndActivate(tab, { replace: false });
          return true;
        }

        if (attempt < 4) {
          await new Promise((resolve) => {
            window.setTimeout(resolve, 250 * (attempt + 1));
          });
        }
      }

      return false;
    },
    [openAndActivate, supabase, userId]
  );

  const value = useMemo(
    () => ({
      tabs,
      activeTabId,
      isVip,
      openTab,
      closeTab,
      setActiveTab,
      activateConversation,
      openAndActivate,
      openConversationById,
      setIsVip,
      clearAllTabs,
    }),
    [
      tabs,
      activeTabId,
      isVip,
      openTab,
      closeTab,
      setActiveTab,
      activateConversation,
      openAndActivate,
      openConversationById,
      clearAllTabs,
    ]
  );

  return (
    <ConversationTabsContext.Provider value={value}>
      {children}
    </ConversationTabsContext.Provider>
  );
}

export function useConversationTabs() {
  const context = useContext(ConversationTabsContext);
  if (!context) {
    throw new Error("useConversationTabs deve ser usado dentro de ConversationTabsProvider");
  }
  return context;
}

export function useOptionalConversationTabs() {
  return useContext(ConversationTabsContext);
}
