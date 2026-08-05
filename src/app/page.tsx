import Link from "next/link";
import { Logo } from "@/components/Logo";
import { VipBadge } from "@/components/VipBadge";
import { BrazilMap } from "@/components/landing/BrazilMap";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { RevealOnScroll } from "@/components/landing/RevealOnScroll";
import { VIP_BENEFITS, VIP_BILLING_LABEL, VIP_PRICE_LABEL } from "@/lib/vip-plan";

const highlights = [
  {
    title: "27 salas por estado",
    description: "Entre na conversa da sua região e fale com quem está perto de você.",
    gradient: "from-fuchsia-500 to-violet-600",
  },
  {
    title: "Mensagens em tempo real",
    description: "Sem atualizar a página. O chat responde na hora, como deve ser.",
    gradient: "from-violet-500 to-indigo-600",
  },
  {
    title: "Leve e direto",
    description: "Crie conta, escolha o estado e comece a conversar em poucos cliques.",
    gradient: "from-cyan-500 to-blue-600",
  },
];

const steps = [
  "Crie sua conta gratuita",
  "Escolha o estado da sua sala",
  "Converse ao vivo com outras pessoas",
];

export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#faf8ff] dark:bg-slate-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_bottom,rgba(139,92,246,0.10),transparent_35%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.08),transparent_30%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.08),transparent_28%)]"
      />

      <LandingNavbar />

      <main className="relative mx-auto max-w-6xl px-6 pb-20 pt-24">
        <section className="flex flex-col gap-12 lg:gap-14">
          <RevealOnScroll className="flex flex-col gap-8">
            <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-start lg:gap-10 xl:gap-12">
              <Logo
                className="-mt-2 h-48 w-auto shrink-0 sm:h-56 md:h-64 lg:-mt-8 lg:h-80 xl:-mt-10"
                priority
                glow
                href={null}
              />

              <div className="min-w-0 flex-1 text-center lg:text-left">
                <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-5xl xl:text-6xl">
                  Converse com o{" "}
                  <span className="bg-gradient-to-r from-fuchsia-600 via-violet-600 to-cyan-500 bg-clip-text text-transparent">
                    Brasil inteiro
                  </span>{" "}
                  em tempo real
                </h1>

                <p className="mt-6 text-lg leading-relaxed text-slate-600 dark:text-slate-300 sm:text-xl lg:max-w-xl">
                  O Trovaa conecta pessoas em salas por estado. Escolha onde quer
                  falar, entre na conversa e troque mensagens ao vivo — simples,
                  rápido e moderno.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="rounded-2xl bg-gradient-to-r from-fuchsia-600 via-violet-600 to-indigo-600 px-8 py-4 text-center font-semibold text-white shadow-xl shadow-violet-500/25 transition hover:scale-[1.02] hover:brightness-110"
              >
                Começar agora — é grátis
              </Link>
              <Link
                href="/login"
                className="rounded-2xl border border-slate-200 bg-white/80 px-8 py-4 text-center font-semibold text-slate-700 backdrop-blur transition hover:border-violet-200 hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-violet-700"
              >
                Já tenho conta
              </Link>
            </div>
          </RevealOnScroll>
        </section>

        <RevealOnScroll className="mt-24">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-600 dark:text-violet-300">
              Mapa interativo
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
              Escolha seu estado no mapa
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
              Clique em qualquer estado para ir direto à sala correspondente.
            </p>
          </div>
          <BrazilMap />
        </RevealOnScroll>

        <section className="mt-24 grid gap-5 md:grid-cols-3">
          {highlights.map((item, index) => (
            <RevealOnScroll key={item.title} delay={index * 100}>
              <article className="group h-full rounded-3xl border border-white/70 bg-white/75 p-6 shadow-lg shadow-violet-100/40 backdrop-blur transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900/70 dark:shadow-none">
                <div
                  className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.gradient} text-lg text-white shadow-lg`}
                >
                  ✦
                </div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  {item.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {item.description}
                </p>
              </article>
            </RevealOnScroll>
          ))}
        </section>

        <RevealOnScroll className="mt-24">
          <section className="overflow-hidden rounded-[2rem] border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-8 shadow-xl shadow-amber-100/40 dark:border-amber-900/40 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-950 dark:shadow-none sm:p-12">
            <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-md text-center lg:text-left">
                <VipBadge className="px-3 py-1 text-xs" />
                <h2 className="mt-4 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
                  Vantagens de ser VIP
                </h2>
                <p className="mt-4 text-slate-600 dark:text-slate-300">
                  Mais controle sobre com quem você conversa e acesso rápido às salas
                  que mais usa.
                </p>
                <div className="mt-6 inline-flex flex-col items-center rounded-2xl border border-amber-200 bg-white/80 px-6 py-4 dark:border-amber-900/50 dark:bg-slate-900/80 lg:items-start">
                  <p className="text-sm font-medium uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Plano mensal
                  </p>
                  <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
                    {VIP_PRICE_LABEL}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {VIP_BILLING_LABEL}
                  </p>
                </div>
                <Link
                  href="/vip"
                  className="mt-6 inline-flex rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-4 font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:brightness-110"
                >
                  Assinar VIP — {VIP_PRICE_LABEL}/mês
                </Link>
              </div>

              <ul className="grid flex-1 gap-4 sm:grid-cols-2 lg:max-w-2xl">
                {VIP_BENEFITS.map((benefit) => (
                  <li
                    key={benefit.title}
                    className="rounded-2xl border border-amber-100 bg-white/80 p-5 dark:border-amber-900/30 dark:bg-slate-900/60"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        ✓
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {benefit.title}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </RevealOnScroll>

        <RevealOnScroll className="mt-24">
          <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-r from-slate-900 via-violet-950 to-indigo-950 px-8 py-10 text-white shadow-2xl sm:px-12 sm:py-12">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-300">
                  Como funciona
                </p>
                <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                  Três passos para entrar na conversa
                </h2>
                <p className="mt-4 text-slate-300">
                  Sem complicação. Você escolhe o estado, entra na sala e já pode
                  falar com outras pessoas online.
                </p>
              </div>

              <ol className="space-y-4">
                {steps.map((step, index) => (
                  <li
                    key={step}
                    className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-500 text-sm font-bold">
                      {index + 1}
                    </span>
                    <span className="text-base font-medium text-slate-100">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </RevealOnScroll>

        <RevealOnScroll className="mt-24 text-center">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
            Pronto para conversar de verdade?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-slate-300">
            Junte-se ao Trovaa, escolha sua sala por estado e participe de um
            bate-papo ao vivo com visual moderno e experiência fluida.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-8 py-4 font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110"
          >
            Criar minha conta
          </Link>
        </RevealOnScroll>

        <footer className="mt-20 border-t border-slate-200/80 pt-8 text-center text-sm text-slate-400 dark:border-slate-800">
          <p>Trovaa · sua conversa, seu lugar · {new Date().getFullYear()}</p>
          <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link href="/termos-de-uso" className="hover:text-violet-600 dark:hover:text-violet-300">
              Termos de Uso
            </Link>
            <Link
              href="/politica-de-privacidade"
              className="hover:text-violet-600 dark:hover:text-violet-300"
            >
              Política de Privacidade
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
