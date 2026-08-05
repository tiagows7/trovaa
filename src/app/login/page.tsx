import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-fuchsia-50 via-white to-cyan-50 px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 top-10 h-64 w-64 rounded-full bg-violet-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 bottom-10 h-56 w-56 rounded-full bg-cyan-200/40 blur-3xl"
      />

      <div className="relative w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center text-center">
          <Logo className="h-28 w-auto sm:h-32" glow priority />
          <h1 className="mt-6 text-2xl font-bold text-slate-900">Entrar</h1>
          <p className="mt-1 text-sm text-slate-500">
            Acesse sua conta para entrar no chat
          </p>
        </div>

        <div className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl shadow-violet-100/60 backdrop-blur">
          <AuthForm mode="login" />
        </div>

        <p className="text-center text-sm text-slate-500">
          <Link href="/" className="font-medium text-violet-600 hover:underline">
            Voltar para o início
          </Link>
        </p>
      </div>
    </div>
  );
}
