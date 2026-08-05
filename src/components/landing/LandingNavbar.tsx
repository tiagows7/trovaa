import Link from "next/link";
import { Logo } from "@/components/Logo";
import { OnlineCounter } from "@/components/landing/OnlineCounter";
import { ThemeToggle } from "@/components/ThemeToggle";

export function LandingNavbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/40 bg-white/70 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Logo className="h-11 w-auto shrink-0 sm:h-12" priority />
        <nav className="flex items-center gap-2 sm:gap-3">
          <OnlineCounter compact />
          <ThemeToggle />
          <Link
            href="/login"
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-violet-600 dark:text-slate-300 dark:hover:text-violet-300"
          >
            Entrar
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition hover:brightness-110"
          >
            Criar conta
          </Link>
        </nav>
      </div>
    </header>
  );
}
