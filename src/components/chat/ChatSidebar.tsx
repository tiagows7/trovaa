"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getStatesByRegion } from "@/lib/brazil-states";
import {
  canStartConversationWith,
  fetchPrimaryActiveConversationId,
  formatConversationError,
  NON_VIP_SINGLE_CHAT_MESSAGE,
  navigateToConversation,
} from "@/lib/conversations";
import { VIP_PRICE_LABEL } from "@/lib/vip-plan";
import type { SavedUserEntry } from "@/lib/saved-users";
import { fetchSavedUsers } from "@/lib/saved-users";
import {
  getSavedContactOnlineState,
  getStateLobbyCount,
  isSavedContactOnline,
  usePlatformPresence,
} from "@/contexts/PlatformPresenceContext";
import { useOptionalConversationTabs } from "@/contexts/ConversationTabsContext";

type ChatSidebarProps = {
  userId: string;
  activeStateCode?: string;
  initialSavedUsers: SavedUserEntry[];
  isOpen: boolean;
  onClose: () => void;
  isVip?: boolean;
  isAdmin?: boolean;
};

type SidebarView = "saved" | "all";

export function ChatSidebar({
  userId,
  activeStateCode = "",
  initialSavedUsers,
  isOpen,
  onClose,
  isVip = false,
  isAdmin = false,
}: ChatSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [view, setView] = useState<SidebarView>(
    isVip && initialSavedUsers.length > 0 ? "saved" : "all"
  );
  const [savedUsers, setSavedUsers] = useState<SavedUserEntry[]>(
    isVip ? initialSavedUsers : []
  );
  const [startingChatId, setStartingChatId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null
  );

  const statesByRegion = useMemo(() => getStatesByRegion(), []);
  const { onlineUsers, countsByState } = usePlatformPresence();
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
    if (!isVip || !userId) {
      setSavedUsers([]);
      return;
    }

    let active = true;

    void fetchSavedUsers(supabase, userId).then((users) => {
      if (active) {
        setSavedUsers(users);
      }
    });

    return () => {
      active = false;
    };
  }, [isOpen, isVip, userId, supabase]);

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

  async function startChatWithSaved(entry: SavedUserEntry) {
    const stateCode = entry.lastStateCode ?? activeStateCode;
    if (!stateCode) return;

    setStartingChatId(entry.savedUserId);

    const access = await canStartConversationWith(
      supabase,
      userId,
      entry.savedUserId,
      isVip
    );

    if (!access.allowed) {
      alert(NON_VIP_SINGLE_CHAT_MESSAGE);
      setStartingChatId(null);
      return;
    }

    if (access.existingConversationId) {
      await goToConversation(access.existingConversationId);
      setStartingChatId(null);
      return;
    }

    const { data: conversationId, error } = await supabase.rpc("start_conversation_with", {
      p_partner_id: entry.savedUserId,
      p_state_code: stateCode,
    });

    if (error) {
      alert(formatConversationError(error.message));
      setStartingChatId(null);
      return;
    }

    onClose();
    await goToConversation(conversationId);
    setStartingChatId(null);
  }

  async function removeSavedUser(savedUserId: string) {
    const { error } = await supabase
      .from("saved_users")
      .delete()
      .eq("user_id", userId)
      .eq("saved_user_id", savedUserId);

    if (!error) {
      setSavedUsers((current) =>
        current.filter((entry) => entry.savedUserId !== savedUserId)
      );
    }
  }

  function renderStateCountBadge(stateCode: string, isActive: boolean) {
    const connectedCount = getStateLobbyCount(countsByState, stateCode);
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

  function renderSavedUser(entry: SavedUserEntry) {
    const isLoading = startingChatId === entry.savedUserId;
    const isOnline = isSavedContactOnline(onlineUsers, entry.savedUserId);
    const onlineStateCode = getSavedContactOnlineState(onlineUsers, entry.savedUserId);

    return (
      <div
        key={entry.savedUserId}
        className="group flex items-center gap-1 rounded-xl transition hover:bg-amber-50 dark:hover:bg-amber-950/30"
      >
        <button
          type="button"
          disabled={Boolean(startingChatId)}
          onClick={() => startChatWithSaved(entry)}
          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm disabled:opacity-60"
        >
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            {entry.username.charAt(0).toUpperCase()}
            {isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-950" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-slate-900 dark:text-white">
              {entry.username}
            </span>
            {isOnline ? (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Online agora
                {onlineStateCode ? ` · ${onlineStateCode}` : ""}
              </span>
            ) : entry.lastStateCode ? (
              <span className="text-xs text-slate-400">
                Última sala: {entry.lastStateCode}
              </span>
            ) : (
              <span className="text-xs text-slate-400">Offline</span>
            )}
          </span>
          <span className="shrink-0 text-xs text-violet-500">
            {isLoading ? "..." : "→"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => removeSavedUser(entry.savedUserId)}
          aria-label={`Excluir ${entry.username} da lista`}
          className="mr-2 shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:hover:border-red-900 dark:hover:bg-red-950/30 dark:hover:text-red-300"
        >
          Excluir
        </button>
      </div>
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
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              1 conversa ativa
            </p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Você pode continuar vendo quem está online e pedir conexão com
              outras pessoas. Para manter várias conversas abertas ao mesmo
              tempo, assine o VIP.
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

        {isVip ? (
          <div className="mt-4 flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setView("saved")}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                view === "saved"
                  ? "bg-white text-violet-700 shadow-sm dark:bg-slate-900 dark:text-violet-300"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Salvos ({savedUsers.length})
            </button>
            <button
              type="button"
              onClick={() => setView("all")}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                view === "all"
                  ? "bg-white text-violet-700 shadow-sm dark:bg-slate-900 dark:text-violet-300"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Estados
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {view === "saved" && isVip ? (
          savedUsers.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhum contato salvo ainda. Ao conversar com alguém, a pessoa aparece
              automaticamente aqui para você falar de novo.
            </p>
          ) : (
            <div className="space-y-1">{savedUsers.map(renderSavedUser)}</div>
          )
        ) : (
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
        )}
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
          className="flex items-center justify-center rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Página inicial
        </Link>
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
