import Link from "next/link";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login/esqueci-senha?error=link-invalido");
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-fuchsia-50 via-white to-cyan-50 px-6 py-12 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="relative w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center text-center">
          <Logo className="h-28 w-auto sm:h-32" glow priority />
          <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
            Nova senha
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Defina uma senha nova para continuar
          </p>
        </div>

        <div className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl shadow-violet-100/60 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <ResetPasswordForm />
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          <Link href="/login" className="font-medium text-violet-600 hover:underline dark:text-violet-300">
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}
