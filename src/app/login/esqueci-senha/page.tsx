import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";

type ForgotPasswordPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-fuchsia-50 via-white to-cyan-50 px-6 py-12 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="relative w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center text-center">
          <Logo className="h-28 w-auto sm:h-32" glow priority />
          <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
            Recuperar senha
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Enviaremos um link para o seu e-mail
          </p>
        </div>

        <div className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl shadow-violet-100/60 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          {user && (
            <p className="mb-4 rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
              Você está conectado como{" "}
              <span className="font-medium">{user.email}</span>. Informe o e-mail
              abaixo para receber o link de redefinição, ou{" "}
              <Link
                href="/salas"
                className="font-medium text-violet-600 hover:underline dark:text-violet-300"
              >
                volte às salas
              </Link>
              .
            </p>
          )}
          {params.error === "link-invalido" && (
            <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              O link de recuperação expirou ou é inválido. Solicite um novo abaixo.
            </p>
          )}
          <ForgotPasswordForm />
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          <Link href="/" className="font-medium text-violet-600 hover:underline dark:text-violet-300">
            Voltar para o início
          </Link>
        </p>
      </div>
    </div>
  );
}
