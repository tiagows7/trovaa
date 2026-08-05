"use client";

import { useState } from "react";
import { useConnectionRequests } from "@/contexts/ConnectionRequestsContext";
import { useConversationTabs } from "@/contexts/ConversationTabsContext";
import { formatConversationError } from "@/lib/conversations";

export function ConnectionRequestLayer() {
  const [incomingError, setIncomingError] = useState<string | null>(null);
  const { tabs, isVip } = useConversationTabs();
  const {
    ready,
    userId,
    incomingRequest,
    outgoingRequest,
    requesterName,
    targetName,
    incomingStateName,
    actingOnRequestId,
    acceptIncoming,
    declineIncoming,
    cancelOutgoing,
  } = useConnectionRequests();

  if (!ready || !userId) {
    return null;
  }

  return (
    <>
      {incomingRequest && (
        <div className="pointer-events-none fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
          <div className="pointer-events-auto w-full max-w-md rounded-3xl border border-violet-200 bg-white p-6 shadow-2xl dark:border-violet-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300">
              Pedido de conversa
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
              {requesterName} quer conversar com você
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {incomingStateName
                ? `Sala: ${incomingStateName} (${incomingRequest.stateCode})`
                : `Sala: ${incomingRequest.stateCode}`}
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {isVip && tabs.length > 0
                ? "A conversa será aberta em uma nova aba no topo da página."
                : "Deseja entrar nesta conversa privada?"}
            </p>
            {incomingError && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                {incomingError}
              </p>
            )}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setIncomingError(null);
                  void declineIncoming();
                }}
                disabled={actingOnRequestId === incomingRequest.id}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Recusar
              </button>
              <button
                type="button"
                onClick={() => {
                  setIncomingError(null);
                  void acceptIncoming().catch((error: unknown) => {
                    setIncomingError(
                      formatConversationError(
                        error instanceof Error
                          ? error.message
                          : "Não foi possível entrar na conversa."
                      )
                    );
                  });
                }}
                disabled={actingOnRequestId === incomingRequest.id}
                className="flex-1 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {actingOnRequestId === incomingRequest.id
                  ? "Entrando..."
                  : isVip && tabs.length > 0
                    ? "Abrir em nova aba"
                    : "Entrar na conversa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {outgoingRequest && !incomingRequest && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[55] flex justify-center px-4">
          <div className="pointer-events-auto flex w-full max-w-lg items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-violet-800 dark:bg-slate-900/95">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Aguardando resposta de {targetName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                O pedido foi enviado. A conversa abre quando a pessoa aceitar.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void cancelOutgoing()}
              disabled={actingOnRequestId === outgoingRequest.id}
              className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
