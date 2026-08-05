import Link from "next/link";
import { Logo } from "@/components/Logo";

type LegalDocumentProps = {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
};

export function LegalDocument({ title, updatedAt, children }: LegalDocumentProps) {
  return (
    <div className="min-h-dvh bg-[#faf8ff] dark:bg-slate-950">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Logo className="h-10 w-auto sm:h-11" />
          <Link
            href="/"
            className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-300"
          >
            Voltar ao início
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Última atualização: {updatedAt}
        </p>

        <div className="mt-10 space-y-6 text-slate-600 dark:text-slate-300 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed [&_ul]:space-y-2">
          {children}
        </div>

        <div className="mt-12 flex flex-wrap gap-4 border-t border-slate-200 pt-8 text-sm dark:border-slate-800">
          <Link href="/termos-de-uso" className="text-violet-600 hover:underline dark:text-violet-300">
            Termos de Uso
          </Link>
          <Link
            href="/politica-de-privacidade"
            className="text-violet-600 hover:underline dark:text-violet-300"
          >
            Política de Privacidade
          </Link>
        </div>
      </main>
    </div>
  );
}
