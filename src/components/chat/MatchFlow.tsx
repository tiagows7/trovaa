"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ConnectedUsersList } from "@/components/chat/ConnectedUsersList";
import { useStatePresence } from "@/hooks/useStatePresence";
import { useUserProfileRoles } from "@/hooks/useUserProfileRoles";
import { createClient } from "@/lib/supabase/client";
import { PARTNER_GENDER_OPTIONS } from "@/lib/matching";
import { filterConnectableUsers, countUsersByGender, countUsersInConversationByGender } from "@/lib/presence-matching";
import { requestConnection } from "@/lib/connection-requests";
import { useConnectionRequests } from "@/contexts/ConnectionRequestsContext";
import { useConversationTabs } from "@/contexts/ConversationTabsContext";
import { VIP_PRICE_LABEL } from "@/lib/vip-plan";
import {
  canStartConversationWith,
  formatConversationError,
  isNonVipConversationLimitError,
  NON_VIP_SINGLE_CHAT_MESSAGE,
} from "@/lib/conversations";
import type { ProfileGender } from "@/types/database";
import type { SavedUserEntry } from "@/lib/saved-users";

type MatchFlowProps = {
  userId: string;
  stateCode: string;
  stateName: string;
  userGender: ProfileGender | null;
  isVip: boolean;
  isAdmin: boolean;
  initialSavedUsers: SavedUserEntry[];
};

type MatchStep = "choose" | "browse";

export function MatchFlow({
  userId,
  stateCode,
  stateName,
  userGender,
  isVip,
  isAdmin,
  initialSavedUsers,
}: MatchFlowProps) {
  const supabase = useMemo(() => createClient(), []);
  const { isVip: viewerIsVip, isAdmin: viewerIsAdmin } = useUserProfileRoles({
    isVip,
    isAdmin,
  });
  const [step, setStep] = useState<MatchStep>("choose");
  const [selectedGender, setSelectedGender] = useState<ProfileGender | null>(null);
  const [loadingTargetId, setLoadingTargetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const lookingFor = step === "browse" ? selectedGender : null;
  const { onlineUsers, presenceStatus } = useStatePresence(
    stateCode,
    userId,
    userGender,
    lookingFor
  );
  const { outgoingRequest, refreshRequests } = useConnectionRequests();
  const { openConversationById } = useConversationTabs();

  async function startConversation(partnerId: string) {
    setLoadingTargetId(partnerId);
    setError(null);

    const access = await canStartConversationWith(supabase, userId, partnerId, viewerIsVip);

    if (!access.allowed) {
      setError(NON_VIP_SINGLE_CHAT_MESSAGE);
      setLoadingTargetId(null);
      return;
    }

    if (access.existingConversationId) {
      await openConversationById(access.existingConversationId);
      setLoadingTargetId(null);
      return;
    }

    const result = await requestConnection(supabase, partnerId, stateCode).catch(
      (requestError: unknown) => {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Não foi possível enviar o pedido de conexão.";
        setError(message);
        return null;
      }
    );

    if (!result) {
      setLoadingTargetId(null);
      return;
    }

    if (result.status === "existing") {
      await openConversationById(result.conversationId);
      setLoadingTargetId(null);
      return;
    }

    await refreshRequests();
    setLoadingTargetId(null);
  }

  function openBrowse(gender: ProfileGender) {
    setSelectedGender(gender);
    setStep("browse");
    setError(null);
  }

  if (!userGender) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-50 px-6 dark:bg-slate-950">
        <div className="max-w-md rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-lg dark:border-amber-900 dark:bg-slate-900">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Perfil incompleto
          </h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Para iniciar conversas privadas, seu perfil precisa ter sexo informado no cadastro.
          </p>
          <Link
            href="/salas"
            className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white"
          >
            Voltar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-gradient-to-br from-fuchsia-50 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <ChatSidebar
        userId={userId}
        activeStateCode={stateCode}
        initialSavedUsers={initialSavedUsers}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isVip={viewerIsVip}
        isAdmin={viewerIsAdmin}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-violet-100 bg-white/90 px-4 py-2 lg:hidden dark:border-slate-800 dark:bg-slate-900/90">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label="Abrir menu de estados"
          >
            ☰ Salas
          </button>
          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
            {stateName} ({stateCode})
          </p>
        </div>

        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
          {step === "choose" ? (
            <div className="mx-auto w-full max-w-lg">
              <p className="text-sm font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300">
                {stateName} · {stateCode}
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                Com quem você quer conversar?
              </h1>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                Escolha o perfil para ver quem está conectado neste estado agora.
                {onlineUsers.length > 0 && (
                  <span className="mt-1 block text-emerald-600 dark:text-emerald-400">
                    {onlineUsers.length} pessoa(s) online nesta sala agora
                    {presenceStatus === "connecting" ? " (atualizando…)" : ""}.
                  </span>
                )}
                {presenceStatus === "connecting" && onlineUsers.length === 0 && (
                  <span className="mt-1 block text-slate-500 dark:text-slate-400">
                    Carregando quem está online…
                  </span>
                )}
              </p>

              <div className="mt-8 space-y-3">
                {PARTNER_GENDER_OPTIONS.map((option) => {
                  const genderOnline = countUsersByGender(onlineUsers, option.value);
                  const inConversationCount = countUsersInConversationByGender(
                    onlineUsers,
                    option.value
                  );
                  const matchCount = userGender
                    ? filterConnectableUsers(onlineUsers, userGender, option.value).length
                    : 0;

                  return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={Boolean(loadingTargetId)}
                    onClick={() => openBrowse(option.value)}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left transition hover:border-violet-300 hover:bg-violet-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-violet-700 dark:hover:bg-violet-950/30"
                  >
                    <span>
                      <span className="block font-semibold text-slate-900 dark:text-white">
                        {option.label}
                      </span>
                      <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">
                        {option.description}
                        {genderOnline > 0 && (
                          <span className="mt-1 block font-medium text-slate-600 dark:text-slate-300">
                            {genderOnline} pessoa(s) deste perfil na sala agora
                            {inConversationCount > 0 && (
                              <span className="text-violet-600 dark:text-violet-300">
                                {" "}
                                ({inConversationCount} em conversa)
                              </span>
                            )}
                          </span>
                        )}
                        {matchCount > 0 && (
                          <span className="mt-1 block font-medium text-emerald-600 dark:text-emerald-400">
                            {matchCount} disponível(is) para conversar
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="text-violet-500">→</span>
                  </button>
                );
                })}
              </div>

              {error && (
                <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                  {isNonVipConversationLimitError(error) && (
                    <Link href="/vip" className="mt-2 block font-semibold text-violet-600 hover:underline">
                      Ver plano VIP — {VIP_PRICE_LABEL}/mês
                    </Link>
                  )}
                </p>
              )}
            </div>
          ) : selectedGender ? (
            <ConnectedUsersList
              users={onlineUsers}
              viewerGender={userGender}
              preferredGender={selectedGender}
              viewerIsVip={viewerIsVip}
              pendingPartnerId={outgoingRequest?.targetId ?? null}
              blockOtherConnections={false}
              loadingTargetId={loadingTargetId}
              onSelect={startConversation}
              onBack={() => {
                setStep("choose");
                setSelectedGender(null);
                setError(null);
              }}
            />
          ) : null}

          {step === "browse" && error && (
            <p className="mx-auto mt-4 max-w-lg rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
              {isNonVipConversationLimitError(error) && (
                <Link href="/vip" className="mt-2 block font-semibold text-violet-600 hover:underline">
                  Ver plano VIP — {VIP_PRICE_LABEL}/mês
                </Link>
              )}
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
