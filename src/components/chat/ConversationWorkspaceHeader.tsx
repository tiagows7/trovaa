"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AdminNavLink } from "@/components/admin/AdminNavLink";
import { ConversationTabIcon } from "@/components/chat/ConversationTabIcon";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { useConversationTabs } from "@/contexts/ConversationTabsContext";
import { useConversationUnread } from "@/contexts/ConversationUnreadContext";
import { loadUserProfileRoles } from "@/lib/admin";
import { createClient } from "@/lib/supabase/client";
import { VIP_PRICE_LABEL } from "@/lib/vip-plan";

export function ConversationWorkspaceHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const {
    tabs,
    activeTabId,
    closeTab,
    activateConversation,
    isVip,
    setIsVip,
  } = useConversationTabs();
  const { getUnreadCount, markConversationRead } = useConversationUnread();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !active) return;

      const roles = await loadUserProfileRoles(supabase, user.id);

      if (!active) return;

      setIsAdmin(roles.isAdmin);
      setIsVip(roles.isVip);
    }

    void loadProfile();
  }, [supabase, setIsVip]);

  const isLobbyRoute =
    pathname.startsWith("/salas") || pathname.startsWith("/chat/");

  return (
    <header className="border-b border-violet-100 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="flex items-center justify-between gap-3 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          <Logo className="h-9 w-auto sm:h-10" href="/salas" />
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-1">
          {tabs.length === 0 ? (
            <p className="truncate px-1 text-xs text-slate-400 sm:text-sm">
              {isLobbyRoute
                ? "Escolha alguém para conversar"
                : "Nenhuma conversa aberta"}
            </p>
          ) : (
            tabs.map((tab) => {
              const isActive = tab.conversationId === activeTabId;
              const unreadCount = getUnreadCount(tab.conversationId);
              const hasUnread = unreadCount > 0;

              return (
                <div
                  key={tab.conversationId}
                  className={`flex shrink-0 items-center gap-1 rounded-xl border px-2 py-1.5 text-sm transition ${
                    hasUnread
                      ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
                      : isActive
                        ? "border-violet-300 bg-violet-100 text-violet-800 dark:border-violet-700 dark:bg-violet-950/50 dark:text-violet-200"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      markConversationRead(tab.conversationId);
                      activateConversation(tab.conversationId);
                    }}
                    className="flex max-w-[160px] items-center gap-2 truncate px-1 font-medium sm:max-w-[200px]"
                    title={
                      hasUnread
                        ? `${tab.partnerName} · ${tab.stateCode} · ${unreadCount} nova(s) mensagem(ns)`
                        : `${tab.partnerName} · ${tab.stateCode}`
                    }
                  >
                    <ConversationTabIcon
                      unreadCount={unreadCount}
                      isActive={isActive}
                    />
                    <span className="truncate">
                      {tab.partnerName}
                      <span className="ml-1 text-[11px] font-normal opacity-70">
                        {tab.stateCode}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => closeTab(tab.conversationId)}
                    className="rounded-md px-1.5 text-xs text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    aria-label={`Fechar conversa com ${tab.partnerName}`}
                  >
                    ×
                  </button>
                </div>
              );
            })
          )}

          {tabs.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const lastState = tabs[tabs.length - 1]?.stateCode;
                router.replace(lastState ? `/chat/${lastState}` : "/salas");
              }}
              className="shrink-0 rounded-xl border border-dashed border-violet-300 px-3 py-1.5 text-xs font-semibold text-violet-600 transition hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-950/40"
              title="Abrir outra conversa"
            >
              + Nova
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isAdmin && (
            <AdminNavLink className="hidden rounded-lg border border-slate-300 bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-800 sm:inline-flex dark:border-slate-600 dark:bg-violet-700 dark:hover:bg-violet-600" />
          )}
          {!isVip && (
            <Link
              href="/vip"
              className="hidden rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 sm:inline-flex"
            >
              VIP — {VIP_PRICE_LABEL}/mês
            </Link>
          )}
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
