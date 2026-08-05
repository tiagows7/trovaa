import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getStripe,
  getStripeConfigError,
  resolveVipPriceId,
} from "@/lib/stripe";

export async function POST() {
  const configError = getStripeConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Faça login para assinar o VIP." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, stripe_customer_id")
    .eq("id", user.id)
    .single();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const stripe = getStripe();

  let priceId: string;
  try {
    priceId = await resolveVipPriceId(stripe);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Plano VIP não configurado.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: profile?.stripe_customer_id ?? undefined,
    customer_email: profile?.stripe_customer_id ? undefined : user.email ?? undefined,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/vip?status=success`,
    cancel_url: `${appUrl}/vip?status=cancel`,
    metadata: {
      user_id: user.id,
      plan: "recurring",
    },
    subscription_data: {
      metadata: {
        user_id: user.id,
        plan: "recurring",
      },
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento." }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
