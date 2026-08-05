import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import {
  fetchAdminStats,
  fetchAllSuggestions,
  fetchChatAccessLogStats,
  fetchRecentChatAccessLogs,
  fetchVisitStats,
  resolveIsAdmin,
} from "@/lib/admin";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function truncateText(value: string | null, maxLength: number) {
  if (!value) return "—";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}…`;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const isAdmin = await resolveIsAdmin(supabase, user.id);

  if (!isAdmin) {
    redirect("/salas");
  }

  let stats = { totalUsers: 0, vipUsers: 0, nonVipUsers: 0 };
  let visitStats = { totalVisits: 0, visitsToday: 0, uniqueVisitors: 0 };
  let chatAccessStats = { totalLogs: 0, logsToday: 0, uniqueUsers: 0 };
  let chatAccessLogs: Awaited<ReturnType<typeof fetchRecentChatAccessLogs>> = [];
  let suggestions: Awaited<ReturnType<typeof fetchAllSuggestions>> = [];
  let loadError: string | null = null;

  try {
    [stats, visitStats, chatAccessStats, chatAccessLogs, suggestions] = await Promise.all([
      fetchAdminStats(supabase),
      fetchVisitStats(supabase),
      fetchChatAccessLogStats(supabase),
      fetchRecentChatAccessLogs(supabase),
      fetchAllSuggestions(supabase),
    ]);
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Não foi possível carregar os dados do painel.";
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-100 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header className="border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo className="h-11 w-auto sm:h-12" href="/salas" />
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white dark:bg-violet-600">
              Admin
            </span>
          </div>
          <Link
            href="/salas"
            className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-300"
          >
            Voltar às salas
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Painel administrativo
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Olá, {profile?.username ?? "administrador"}. Visão geral do Trovaa.
          </p>
        </div>

        {loadError && (
          <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </p>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
              Usuários cadastrados
            </p>
            <p className="mt-3 text-4xl font-bold text-slate-900 dark:text-white">
              {stats.totalUsers}
            </p>
          </article>

          <article className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
            <p className="text-sm font-medium uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Usuários VIP
            </p>
            <p className="mt-3 text-4xl font-bold text-amber-800 dark:text-amber-200">
              {stats.vipUsers}
            </p>
          </article>

          <article className="rounded-3xl border border-violet-200 bg-violet-50/80 p-6 shadow-sm dark:border-violet-900/40 dark:bg-violet-950/20">
            <p className="text-sm font-medium uppercase tracking-wider text-violet-700 dark:text-violet-300">
              Não VIP
            </p>
            <p className="mt-3 text-4xl font-bold text-violet-800 dark:text-violet-200">
              {stats.nonVipUsers}
            </p>
          </article>
        </section>

        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">
            Visitas ao site
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <article className="rounded-3xl border border-cyan-200 bg-cyan-50/80 p-6 shadow-sm dark:border-cyan-900/40 dark:bg-cyan-950/20">
              <p className="text-sm font-medium uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                Total de visitas
              </p>
              <p className="mt-3 text-4xl font-bold text-cyan-800 dark:text-cyan-200">
                {visitStats.totalVisits}
              </p>
              <p className="mt-2 text-xs text-cyan-600/80 dark:text-cyan-400/80">
                Uma visita por sessão do navegador
              </p>
            </article>

            <article className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <p className="text-sm font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Visitas hoje
              </p>
              <p className="mt-3 text-4xl font-bold text-emerald-800 dark:text-emerald-200">
                {visitStats.visitsToday}
              </p>
            </article>

            <article className="rounded-3xl border border-sky-200 bg-sky-50/80 p-6 shadow-sm dark:border-sky-900/40 dark:bg-sky-950/20">
              <p className="text-sm font-medium uppercase tracking-wider text-sky-700 dark:text-sky-300">
                Visitantes únicos
              </p>
              <p className="mt-3 text-4xl font-bold text-sky-800 dark:text-sky-200">
                {visitStats.uniqueVisitors}
              </p>
              <p className="mt-2 text-xs text-sky-600/80 dark:text-sky-400/80">
                Por dispositivo/navegador
              </p>
            </article>
          </div>

          {visitStats.totalVisits === 0 && (
            <p className="mt-4 rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/50 px-4 py-3 text-sm text-cyan-800 dark:border-cyan-900/40 dark:bg-cyan-950/20 dark:text-cyan-200">
              Ainda sem visitas registradas. Abra o site em outra aba ou janela
              anônima e atualize esta página. Se continuar zerado, rode{" "}
              <code className="rounded bg-white/80 px-1 dark:bg-slate-900">
                supabase/add-site-visits.sql
              </code>{" "}
              no Supabase.
            </p>
          )}
        </section>

        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">
            Registros de acesso ao chat
          </h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            IP, horário e dados do dispositivo. Retenção de 6 meses (Marco Civil da
            Internet).
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <article className="rounded-3xl border border-indigo-200 bg-indigo-50/80 p-6 shadow-sm dark:border-indigo-900/40 dark:bg-indigo-950/20">
              <p className="text-sm font-medium uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                Total de registros
              </p>
              <p className="mt-3 text-4xl font-bold text-indigo-800 dark:text-indigo-200">
                {chatAccessStats.totalLogs}
              </p>
            </article>

            <article className="rounded-3xl border border-fuchsia-200 bg-fuchsia-50/80 p-6 shadow-sm dark:border-fuchsia-900/40 dark:bg-fuchsia-950/20">
              <p className="text-sm font-medium uppercase tracking-wider text-fuchsia-700 dark:text-fuchsia-300">
                Acessos hoje
              </p>
              <p className="mt-3 text-4xl font-bold text-fuchsia-800 dark:text-fuchsia-200">
                {chatAccessStats.logsToday}
              </p>
            </article>

            <article className="rounded-3xl border border-purple-200 bg-purple-50/80 p-6 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/20">
              <p className="text-sm font-medium uppercase tracking-wider text-purple-700 dark:text-purple-300">
                Usuários únicos
              </p>
              <p className="mt-3 text-4xl font-bold text-purple-800 dark:text-purple-200">
                {chatAccessStats.uniqueUsers}
              </p>
            </article>
          </div>

          {chatAccessStats.totalLogs === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 px-4 py-3 text-sm text-indigo-800 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-200">
              Ainda sem registros de acesso ao chat. Entre em uma sala logado e
              atualize esta página. Se continuar zerado, rode{" "}
              <code className="rounded bg-white/80 px-1 dark:bg-slate-900">
                supabase/add-chat-access-logs.sql
              </code>{" "}
              no Supabase.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Horário</th>
                    <th className="px-4 py-3 font-semibold">Usuário</th>
                    <th className="px-4 py-3 font-semibold">IP</th>
                    <th className="px-4 py-3 font-semibold">Rota</th>
                    <th className="px-4 py-3 font-semibold">Dispositivo</th>
                    <th className="px-4 py-3 font-semibold">Timezone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {chatAccessLogs.map((log) => (
                    <tr key={log.id} className="text-slate-700 dark:text-slate-200">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {log.username}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                        {log.ip_address ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs">{log.path}</span>
                        {log.state_code ? (
                          <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                            {log.state_code}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs">{log.screen_resolution ?? "—"}</p>
                        <p
                          className="mt-1 max-w-xs text-[11px] text-slate-400"
                          title={log.user_agent ?? undefined}
                        >
                          {truncateText(log.user_agent, 48)}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        {log.timezone ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Sugestões dos usuários
            </h2>
            <span className="text-sm text-slate-500">{suggestions.length} registrada(s)</span>
          </div>

          {suggestions.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Nenhuma sugestão recebida ainda.
            </p>
          ) : (
            <ul className="space-y-3">
              {suggestions.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {item.username}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(item.created_at)}</p>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                    {item.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
