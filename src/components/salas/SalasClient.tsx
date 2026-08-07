"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { CONVERSA_SESSION_KEY } from "@/components/chat/ConversationSessionCleanup";
import { VIP_PRICE_LABEL } from "@/lib/vip-plan";

type SalasClientProps = {
  userId: string;
  isVip: boolean;
  isAdmin: boolean;
};

export function SalasClient({ userId, isVip, isAdmin }: SalasClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(CONVERSA_SESSION_KEY)) {
      return;
    }

    void fetch("/api/conversations/end-all", { method: "POST" }).catch(() => undefined);
  }, []);

  return (
    <div className="flex h-full min-h-0 bg-gradient-to-br from-fuchsia-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <ChatSidebar
        userId={userId}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isVip={isVip}
        isAdmin={isAdmin}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-white/80 bg-white/80 px-4 py-2 lg:hidden dark:border-slate-800 dark:bg-slate-950/80">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label="Abrir menu de estados"
          >
            ☰ Salas
          </button>
          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
            Escolha um estado
          </p>
        </div>

        <main className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
          <div className="max-w-md">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Escolha um estado
            </h1>
            <p className="mt-3 text-slate-600 dark:text-slate-300">
              Use o menu lateral para selecionar o estado onde quer conversar.
              Depois escolha com quem falar e veja quem está online.
            </p>
            {!isVip && (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                VIP ({VIP_PRICE_LABEL}/mês): nomes reais e várias conversas em abas.
              </p>
            )}
            <p className="mt-6 text-xs text-slate-400 lg:hidden">
              Toque em ☰ para abrir o menu de estados.
            </p>
            <p className="mt-4">
              <Link
                href="/conta"
                className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-300"
              >
                Minha conta
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
