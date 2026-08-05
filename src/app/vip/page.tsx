import Link from "next/link";

import { redirect } from "next/navigation";

import { Logo } from "@/components/Logo";

import { VipBadge } from "@/components/VipBadge";

import { VipUpgradeButton } from "@/components/VipUpgradeButton";

import { createClient } from "@/lib/supabase/server";

import { VIP_BENEFITS, VIP_BILLING_LABEL, VIP_PRICE_LABEL } from "@/lib/vip-plan";

import { loadUserProfileRoles, loadUserVipDetails } from "@/lib/admin";



type VipPageProps = {

  searchParams: Promise<{ status?: string }>;

};



export default async function VipPage({ searchParams }: VipPageProps) {

  const { status } = await searchParams;

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
    .maybeSingle();

  const { isVip, vipUntil } = await loadUserVipDetails(supabase, user.id);



  return (

    <div className="min-h-dvh bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">

      <header className="border-b border-white/80 bg-white/80 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">

        <div className="mx-auto flex max-w-3xl items-center justify-between">

          <Logo className="h-11 w-auto sm:h-12" href="/salas" />

          <Link

            href="/salas"

            className="text-sm font-medium text-violet-600 hover:underline dark:text-violet-300"

          >

            Voltar às salas

          </Link>

        </div>

      </header>



      <main className="mx-auto max-w-3xl px-6 py-12">

        {status === "success" && (

          <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">

            Pagamento recebido! Seu VIP será ativado em instantes.

          </div>

        )}



        {status === "cancel" && (

          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">

            Pagamento cancelado. Você pode tentar novamente quando quiser.

          </div>

        )}



        <div className="text-center">

          <VipBadge className="px-3 py-1 text-xs" />

          <h1 className="mt-4 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">

            Trovaa VIP

          </h1>

          <p className="mx-auto mt-4 max-w-xl text-slate-600 dark:text-slate-300">

            Desbloqueie conversas salvas, veja quem está online de verdade e converse

            com mais controle. Pagamento seguro via Stripe.

          </p>

        </div>



        <div className="mt-10 rounded-3xl border border-amber-200/80 bg-white/90 p-8 shadow-xl dark:border-amber-900/40 dark:bg-slate-900/90">

          {isVip ? (

            <div className="text-center">

              <p className="text-lg font-semibold text-slate-900 dark:text-white">

                Você já é VIP, {profile?.username ?? "usuário"}!

              </p>

              {vipUntil && (

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">

                  Válido até{" "}

                  {new Intl.DateTimeFormat("pt-BR", {

                    dateStyle: "long",

                  }).format(new Date(vipUntil))}

                </p>

              )}

              <ul className="mx-auto mt-8 max-w-md space-y-3 text-left">

                {VIP_BENEFITS.map((benefit) => (

                  <li

                    key={benefit.title}

                    className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300"

                  >

                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">

                      ✓

                    </span>

                    <span>

                      <strong className="text-slate-900 dark:text-white">

                        {benefit.title}

                      </strong>

                      {" — "}

                      {benefit.description}

                    </span>

                  </li>

                ))}

              </ul>

              <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">

                Gerencie ou cancele sua assinatura no portal do Stripe (e-mail de

                confirmação após a compra).

              </p>

            </div>

          ) : (

            <>

              <ul className="space-y-5">

                {VIP_BENEFITS.map((benefit) => (

                  <li key={benefit.title} className="flex items-start gap-4">

                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">

                      ✓

                    </span>

                    <div>

                      <p className="font-semibold text-slate-900 dark:text-white">

                        {benefit.title}

                      </p>

                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">

                        {benefit.description}

                      </p>

                    </div>

                  </li>

                ))}

              </ul>



              <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50/80 p-8 text-center dark:border-amber-900/50 dark:bg-amber-950/20">
                <p className="text-sm font-medium uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Assinatura mensal
                </p>
                <p className="mt-2 text-4xl font-bold text-slate-900 dark:text-white">
                  {VIP_PRICE_LABEL}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {VIP_BILLING_LABEL} · renova automaticamente
                </p>
                <div className="mt-6">
                  <VipUpgradeButton
                    label={`Assinar ${VIP_PRICE_LABEL}/mês`}
                    className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:brightness-110 disabled:opacity-60"
                  />
                </div>
              </div>

            </>

          )}

        </div>

      </main>

    </div>

  );

}

