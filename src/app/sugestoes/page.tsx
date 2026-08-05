import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNavLink } from "@/components/admin/AdminNavLink";
import { Logo } from "@/components/Logo";
import { SuggestionForm } from "@/components/suggestions/SuggestionForm";
import { resolveIsAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import type { Suggestion } from "@/types/database";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function SuggestionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const isAdmin = await resolveIsAdmin(supabase, user.id);

  const { data: mySuggestions } = await supabase
    .from("suggestions")
    .select("id, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="min-h-dvh bg-gradient-to-br from-fuchsia-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header className="border-b border-white/80 bg-white/80 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Logo className="h-11 w-auto sm:h-12" href="/salas" />
          <div className="flex items-center gap-2">
            {isAdmin && <AdminNavLink />}
            <Link
              href="/salas"
              className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-300"
            >
              Voltar às salas
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Sugestões de melhoria
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Conte o que podemos melhorar no Trovaa. Sua opinião ajuda a evoluir o site.
        </p>

        {isAdmin && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/80">
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Você é administrador. Para ver <strong>todas</strong> as sugestões enviadas
              pelos usuários, acesse o painel:
            </p>
            <div className="mt-3">
              <AdminNavLink />
            </div>
          </div>
        )}

        <div className="mt-8 rounded-3xl border border-white/80 bg-white/90 p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900/90 sm:p-8">
          <SuggestionForm />
        </div>

        {(mySuggestions?.length ?? 0) > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Suas sugestões enviadas
            </h2>
            <ul className="mt-4 space-y-3">
              {(mySuggestions as Pick<Suggestion, "id" | "content" | "created_at">[]).map(
                (item) => (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/80"
                  >
                    <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                      {item.content}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      Enviada em {formatDate(item.created_at)}
                    </p>
                  </li>
                )
              )}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
