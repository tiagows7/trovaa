"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getStatesByRegion } from "@/lib/brazil-states";
import {
  fetchPrimaryActiveConversationId,
  navigateToConversation,
} from "@/lib/conversations";
import { VIP_PRICE_LABEL } from "@/lib/vip-plan";
import {
  getStateLobbyDisplayCount,
  usePlatformPresence,
} from "@/contexts/PlatformPresenceContext";
import { useOptionalConversationTabs } from "@/contexts/ConversationTabsContext";
import { SignOutButton } from "@/components/SignOutButton";

type ChatSidebarProps = {
  userId: string;
  activeStateCode?: string;
  activeStateOnlineCount?: number;
  isOpen: boolean;
  onClose: () => void;
  isVip?: boolean;
  isAdmin?: boolean;
};

export function ChatSidebar({
  userId,
  activeStateCode = "",
  activeStateOnlineCount,
  isOpen,
  onClose,
  isVip = false,
  isAdmin = false,
}: ChatSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null
  );

  const statesByRegion = useMemo(() => getStatesByRegion(), []);
  const { countsByState } = usePlatformPresence();
  const conversationTabs = useOptionalConversationTabs();

  async function goToConversation(conversationId: string) {
    if (conversationTabs?.openConversationById) {
      const opened = await conversationTabs.openConversationById(conversationId);
      if (opened) {
        onClose();
        return;
      }
    }

    onClose();
    navigateToConversation(conversationId, router);
  }

  useEffect(() => {
    if (isVip || !userId) {
      setActiveConversationId(null);
      return;
    }

    let active = true;

    void fetchPrimaryActiveConversationId(supabase, userId).then((conversationId) => {
      if (active) {
        setActiveConversationId(conversationId);
      }
    });

    return () => {
      active = false;
    };
  }, [isVip, userId, supabase]);

  function renderStateCountBadge(stateCode: string, isActive: boolean) {
    const connectedCount = getStateLobbyDisplayCount({
      stateCode,
      countsByState,
      isActive,
      othersInActiveState:
        isActive && activeStateOnlineCount != null
          ? activeStateOnlineCount
          : undefined,
    });

    if (connectedCount <= 0) return null;

    return (
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
          isActive
            ? "bg-white/20 text-white"
            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
        }`}
        title={`${connectedCount} pessoa(s) conectada(s) nesta sala`}
      >
        {connectedCount}
      </span>
    );
  }

  function renderStateLink(stateCode: string, stateName: string) {
    const href = `/chat/${stateCode}`;
    const isActive = pathname === href || activeStateCode === stateCode;
    const className = `flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
      isActive
        ? "bg-violet-600 text-white shadow-sm"
        : "text-slate-700 hover:bg-violet-50 dark:text-slate-200 dark:hover:bg-slate-800"
    }`;

    return (
      <Link
        key={stateCode}
        href={href}
        onClick={onClose}
        className={className}
      >
        <span className="w-7 shrink-0 font-bold">{stateCode}</span>
        <span className="min-w-0 flex-1 truncate">{stateName}</span>
        {renderStateCountBadge(stateCode, isActive)}
      </Link>
    );
  }

  const sidebarContent = (
    <>
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300">
          Trovaa
        </p>
        <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
          Conversas por estado
        </p>

        {!isVip && activeConversationId && (
          <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 px-3 py-3 dark:border-violet-900/50 dark:bg-violet-950/30">
            <p className="text-xs font-semibold text-violet-800 dark:text-violet-200">
              Conversas abertas
            </p>
            <p className="mt-1 text-xs text-violet-700 dark:text-violet-300">
              Você pode manter várias conversas ao mesmo tempo pelas abas no topo.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                void goToConversation(activeConversationId);
              }}
              className="mt-3 w-full rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700"
            >
              Voltar à conversa
            </button>
            <Link
              href="/vip"
              onClick={onClose}
              className="mt-2 block text-center text-xs font-semibold text-violet-600 hover:underline dark:text-violet-300"
            >
              Seja VIP — {VIP_PRICE_LABEL}/mês
            </Link>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-5">
          {Object.entries(statesByRegion).map(([region, states]) => (
            <div key={region}>
              <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {region}
              </p>
              <div className="space-y-1">
                {states.map((state) => renderStateLink(state.code, state.name))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        {isAdmin && (
          <Link
            href="/admin"
            onClick={onClose}
            className="mb-2 flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-violet-700 dark:hover:bg-violet-600"
          >
            Ver sugestões dos usuários
          </Link>
        )}
        <Link
          href="/conta"
          onClick={onClose}
          className="mb-2 flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Meus dados
        </Link>
        <Link
          href="/sugestoes"
          onClick={onClose}
          className="mb-2 flex items-center justify-center rounded-xl border border-violet-200 px-3 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/40"
        >
          Enviar sugestão
        </Link>
        <Link
          href="/"
          onClick={onClose}
          className="mb-2 flex items-center justify-center rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Página inicial
        </Link>
        <SignOutButton
          onBeforeSignOut={onClose}
          className="flex w-full items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
        />
      </div>
    </>
  );

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-950 lg:static lg:z-auto lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
