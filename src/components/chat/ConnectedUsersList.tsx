"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDisplayName } from "@/lib/anonymous-names";
import { getConnectedListTitle } from "@/lib/matching";
import {
  filterVisibleUsersByGender,
  getUnavailableMatchHint,
  getUserAvailability,
  isUserConnectable,
  type UserAvailability,
} from "@/lib/presence-matching";
import { NON_VIP_TARGET_BUSY_MESSAGE } from "@/lib/conversations";
import { VIP_PRICE_LABEL } from "@/lib/vip-plan";
import type { ProfileGender } from "@/types/database";
import type { PresenceUser } from "@/hooks/useStatePresence";

type ConnectedUsersListProps = {
  users: PresenceUser[];
  viewerGender: ProfileGender;
  preferredGender: ProfileGender;
  viewerLookingFor?: ProfileGender | null;
  viewerIsVip: boolean;
  presenceStatus?: "idle" | "connecting" | "connected" | "error";
  pendingPartnerId?: string | null;
  blockOtherConnections?: boolean;
  loadingTargetId: string | null;
  onSelect: (userId: string) => void;
  onUnavailableSelect?: (message: string) => void;
  onBack: () => void;
};

function getAvailabilityLabel(
  availability: ReturnType<typeof getUserAvailability>,
  hint?: string
) {
  switch (availability) {
    case "also_in_conversation":
      return "Online · outra conversa ativa";
    case "busy_in_conversation":
      return "Em conversa · indisponível";
    case "waiting_profile":
      return hint ?? "Aguardando outro perfil";
    default:
      return "Online agora";
  }
}

export function ConnectedUsersList({
  users,
  viewerGender,
  preferredGender,
  viewerLookingFor = null,
  viewerIsVip,
  presenceStatus = "idle",
  pendingPartnerId = null,
  blockOtherConnections = false,
  loadingTargetId,
  onSelect,
  onUnavailableSelect,
  onBack,
}: ConnectedUsersListProps) {
  const supabase = useMemo(() => createClient(), []);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  const visibleUsers = useMemo(
    () => filterVisibleUsersByGender(users, preferredGender),
    [preferredGender, users]
  );

  const visibleUserIds = useMemo(
    () => visibleUsers.map((user) => user.userId).sort().join(","),
    [visibleUsers]
  );

  useEffect(() => {
    if (!viewerIsVip || !visibleUserIds) {
      setUsernames({});
      return;
    }

    let active = true;
    const ids = visibleUserIds.split(",").filter(Boolean);

    async function loadUsernames() {
      const { data } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", ids);

      if (!active) return;

      const map: Record<string, string> = {};
      for (const profile of data ?? []) {
        map[profile.id] = profile.username;
      }
      setUsernames(map);
    }

    loadUsernames();

    return () => {
      active = false;
    };
  }, [supabase, viewerIsVip, visibleUserIds]);

  function handleUserClick(
    userId: string,
    availability: UserAvailability,
    isConnectable: boolean
  ) {
    if (loadingTargetId) return;

    if (!isConnectable) {
      const message =
        availability === "busy_in_conversation"
          ? NON_VIP_TARGET_BUSY_MESSAGE
          : availability === "waiting_profile"
            ? "Esta pessoa ainda não escolheu um perfil compatível na sala."
            : "Esta pessoa não está disponível para conversar agora.";

      setFeedback(message);
      onUnavailableSelect?.(message);
      return;
    }

    setFeedback(null);
    onSelect(userId);
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <button
        type="button"
        onClick={() => {
          setFeedback(null);
          onBack();
        }}
        className="mb-6 text-sm font-medium text-violet-600 hover:underline dark:text-violet-300"
      >
        ← Voltar
      </button>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        {getConnectedListTitle(preferredGender)}
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        {viewerIsVip
          ? "Como VIP, você vê os nomes reais e pode abrir cada conversa em uma aba no topo da página."
          : "Nomes fictícios por privacidade. Você pode conversar com várias pessoas — VIP mostra os nomes reais."}
      </p>

      {presenceStatus === "connecting" && (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Conectando à sala…
        </p>
      )}
      {presenceStatus === "error" && (
        <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
          Reconectando… a lista atualiza automaticamente.
        </p>
      )}
      {presenceStatus === "connected" && visibleUsers.length > 0 && (
        <p className="mt-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          {visibleUsers.length}{" "}
          {visibleUsers.length === 1 ? "pessoa conectada" : "pessoas conectadas"}{" "}
          · novos usuários aparecem aqui automaticamente
        </p>
      )}

      {!viewerIsVip && (
        <p className="mt-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-200">
          Quem já está em conversa sem VIP não pode receber novos convites. VIPs
          podem conversar com várias pessoas ao mesmo tempo.{" "}
          <a href="/vip" className="font-semibold underline">
            Seja VIP por {VIP_PRICE_LABEL}/mês
          </a>
          .
        </p>
      )}

      {!viewerIsVip && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          Nomes ocultos —{" "}
          <a href="/vip" className="font-semibold underline">
            Seja VIP por {VIP_PRICE_LABEL}/mês
          </a>{" "}
          para ver quem está online de verdade.
        </p>
      )}

      {feedback && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          {feedback}
        </p>
      )}

      <div className="mt-6 space-y-2">
        {visibleUsers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {presenceStatus === "connecting"
                ? "Conectando à sala…"
                : "Ninguém deste perfil conectado ainda."}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {presenceStatus === "connected"
                ? users.length > 0
                  ? `Há ${users.length} pessoa(s) online nesta sala, mas nenhuma com o perfil selecionado.`
                  : "Aguarde — quando alguém compatível entrar na sala, aparecerá aqui automaticamente."
                : "Assim que a conexão for estabelecida, a lista começa a atualizar."}
            </p>
          </div>
        ) : (
          visibleUsers.map((user) => {
            const availability = getUserAvailability(
              viewerGender,
              preferredGender,
              user,
              viewerLookingFor
            );
            const unavailableHint = getUnavailableMatchHint(
              viewerGender,
              preferredGender,
              user
            );
            const displayName = getDisplayName(
              user.userId,
              usernames[user.userId],
              viewerIsVip
            );
            const isLoading = loadingTargetId === user.userId;
            const isPending = pendingPartnerId === user.userId;
            const isConnectable = isUserConnectable(availability);
            const statusLabel = getAvailabilityLabel(availability, unavailableHint);

            return (
              <button
                key={user.userId}
                type="button"
                disabled={
                  loadingTargetId === user.userId ||
                  (blockOtherConnections && isConnectable && !isPending)
                }
                onClick={() =>
                  handleUserClick(user.userId, availability, isConnectable)
                }
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-default disabled:opacity-80 disabled:hover:border-slate-200 disabled:hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:disabled:hover:border-slate-700 dark:disabled:hover:bg-slate-900 dark:hover:border-violet-700 dark:hover:bg-violet-950/30"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-600 dark:bg-violet-950 dark:text-violet-300">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                  <span>
                    <span className="block font-semibold text-slate-900 dark:text-white">
                      {displayName}
                    </span>
                    <span
                      className={`mt-0.5 flex items-center gap-1.5 text-xs ${
                        availability === "connectable"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : availability === "also_in_conversation"
                            ? "text-violet-600 dark:text-violet-300"
                            : availability === "busy_in_conversation"
                              ? "text-slate-500 dark:text-slate-400"
                            : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      <span
                        className={`inline-flex h-2 w-2 rounded-full ${
                          availability === "connectable"
                            ? "bg-emerald-500"
                            : availability === "also_in_conversation"
                              ? "bg-violet-500"
                              : availability === "busy_in_conversation"
                                ? "bg-slate-400"
                              : "bg-amber-500"
                        }`}
                      />
                      {statusLabel}
                    </span>
                  </span>
                </span>
                <span className="text-sm font-medium text-violet-500">
                  {isLoading
                    ? "Enviando..."
                    : isPending
                      ? "Aguardando..."
                      : isConnectable
                        ? "Conversar →"
                        : "Indisponível"}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
