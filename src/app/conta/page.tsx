import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNavLink } from "@/components/admin/AdminNavLink";
import { ProfileSettingsForm } from "@/components/account/ProfileSettingsForm";
import { Logo } from "@/components/Logo";
import { resolveIsAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import type { ProfileGender } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const isAdmin = await resolveIsAdmin(supabase, user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, birth_date, gender")
    .eq("id", user.id)
    .maybeSingle();

  const metadata = user.user_metadata as {
    username?: string;
    birth_date?: string;
    gender?: ProfileGender;
  };

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
          Meus dados
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Atualize seu nome no chat, data de nascimento, sexo, e-mail ou senha.
        </p>

        <div className="mt-8 rounded-3xl border border-white/80 bg-white/90 p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900/90 sm:p-8">
          <ProfileSettingsForm
            email={user.email ?? ""}
            username={profile?.username ?? metadata.username ?? ""}
            birthDate={profile?.birth_date ?? metadata.birth_date ?? ""}
            gender={(profile?.gender ?? metadata.gender ?? "") as ProfileGender | ""}
          />
        </div>
      </main>
    </div>
  );
}
