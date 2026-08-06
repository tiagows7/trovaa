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
} from "@/lib/presence-matching";
import { VIP_PRICE_LABEL } from "@/lib/vip-plan";
import type { ProfileGender } from "@/types/database";
import type { PresenceUser } from "@/hooks/useStatePresence";

type ConnectedUsersListProps = {
  users: PresenceUser[];
  viewerGender: ProfileGender;
  preferredGender: ProfileGender;
  viewerLookingFor?: ProfileGender | null;
  viewerIsVip: boolean;
  pendingPartnerId?: string | null;
  blockOtherConnections?: boolean;
  loadingTargetId: string | null;
  onSelect: (userId: string) => void;
  onBack: () => void;
};

function getAvailabilityLabel(
  availability: ReturnType<typeof getUserAvailability>,
  hint?: string
) {
  switch (availability) {
    case "also_in_conversation":
      return "Online · outra conversa ativa";
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
  pendingPartnerId = null,
  blockOtherConnections = false,
  loadingTargetId,
  onSelect,
  onBack,
}: ConnectedUsersListProps) {
  const supabase = useMemo(() => createClient(), []);
  const [usernames, setUsernames] = useState<Record<string, string>>({});

  const visibleUsers = useMemo(
    () => filterVisibleUsersByGender(users, preferredGender),
    [users, preferredGender]
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

  return (
    <div className="mx-auto w-full max-w-lg">
      <button
        type="button"
        onClick={onBack}
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

      {!viewerIsVip && (
        <p className="mt-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-200">
          Quem já está em outra conversa aparece como disponível para um novo chat.{" "}
          <a href="/vip" className="font-semibold underline">
            Seja VIP por {VIP_PRICE_LABEL}/mês
          </a>{" "}
          para ver nomes reais e abrir várias abas no app.
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

      <div className="mt-6 space-y-2">
        {visibleUsers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ninguém deste perfil conectado agora neste estado.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {users.length === 0
                ? "Nenhuma outra pessoa online nesta sala. Todos precisam estar em /chat no mesmo estado (ex.: SP)."
                : `Há ${users.length} pessoa(s) online neste estado, mas nenhuma com o perfil selecionado.`}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Aguarde alguns segundos ou volte e escolha outro filtro.
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
                  !isConnectable ||
                  Boolean(loadingTargetId) ||
                  (blockOtherConnections && !isPending)
                }
                onClick={() => onSelect(user.userId)}
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
                            : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      <span
                        className={`inline-flex h-2 w-2 rounded-full ${
                          availability === "connectable"
                            ? "bg-emerald-500"
                            : availability === "also_in_conversation"
                              ? "bg-violet-500"
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
