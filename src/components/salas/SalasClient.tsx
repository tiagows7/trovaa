"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { createClient } from "@/lib/supabase/client";
import { fetchSavedUsers } from "@/lib/saved-users";
import { VIP_PRICE_LABEL } from "@/lib/vip-plan";
import { loadUserProfileRoles } from "@/lib/admin";
import { endAllActiveConversations } from "@/lib/conversations";
import { CONVERSA_SESSION_KEY } from "@/components/chat/ConversationSessionCleanup";
import type { SavedUserEntry } from "@/lib/saved-users";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error("timeout")), ms);
    }),
  ]);
}

export function SalasClient() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [isVip, setIsVip] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [savedUsers, setSavedUsers] = useState<SavedUserEntry[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession(), 12000);

        if (!active) return;

        if (!session) {
          router.replace("/login");
          return;
        }

        setUserId(session.user.id);

        if (!sessionStorage.getItem(CONVERSA_SESSION_KEY)) {
          await endAllActiveConversations(supabase);
        }

        const roles = await loadUserProfileRoles(supabase, session.user.id);
        const users = roles.isVip ? await fetchSavedUsers(supabase, session.user.id) : [];

        if (!active) return;

        setIsVip(roles.isVip);
        setIsAdmin(roles.isAdmin);
        setSavedUsers(users);
        setReady(true);
      } catch {
        if (!active) return;
        setLoadError(
          "Não foi possível carregar sua sessão. Verifique a conexão e tente novamente."
        );
        setReady(true);
      }
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-fuchsia-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          <p className="text-sm text-slate-600 dark:text-slate-300">Carregando salas...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gradient-to-br from-fuchsia-50 via-white to-cyan-50 px-6 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <p className="max-w-sm text-center text-sm text-red-600">{loadError}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Tentar de novo
          </button>
          <Link
            href="/login"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Ir para login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-gradient-to-br from-fuchsia-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <ChatSidebar
        userId={userId}
        initialSavedUsers={savedUsers}
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
            {isVip && savedUsers.length > 0 && (
              <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
                Você tem {savedUsers.length} usuário
                {savedUsers.length === 1 ? "" : "s"} salvo
                {savedUsers.length === 1 ? "" : "s"} no menu.
              </p>
            )}
            {!isVip && (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                VIP ({VIP_PRICE_LABEL}/mês): lista automática de quem você conversou,
                nomes reais e várias conversas em abas.
              </p>
            )}
            <p className="mt-6 text-xs text-slate-400 lg:hidden">
              Toque em ☰ para abrir o menu de estados.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
