import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function setVipStatus({
  userId,
  isVip,
  vipUntil,
  stripeCustomerId,
  stripeSubscriptionId,
}: {
  userId: string;
  isVip: boolean;
  vipUntil: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({
      is_vip: isVip,
      vip_until: vipUntil,
      stripe_customer_id: stripeCustomerId ?? undefined,
      stripe_subscription_id: stripeSubscriptionId ?? undefined,
    })
    .eq("id", userId);

  if (error) {
    throw error;
  }
}

async function activateVipFromSubscription(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.user_id;
  if (!userId) return;

  const periodEnd = subscription.items.data[0]?.current_period_end;
  const vipUntil = periodEnd
    ? new Date(periodEnd * 1000).toISOString()
    : null;

  await setVipStatus({
    userId,
    isVip: subscription.status === "active" || subscription.status === "trialing",
    vipUntil,
    stripeCustomerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id,
    stripeSubscriptionId: subscription.id,
  });
}

async function activateVipOneMonth(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  if (!userId || session.payment_status !== "paid") return;

  const vipUntil = new Date();
  vipUntil.setMonth(vipUntil.getMonth() + 1);

  await setVipStatus({
    userId,
    isVip: true,
    vipUntil: vipUntil.toISOString(),
    stripeCustomerId:
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id,
    stripeSubscriptionId: null,
  });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 });
  }

  const stripe = getStripe();
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const subscriptionId = session.subscription;

        if (userId && typeof subscriptionId === "string") {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await activateVipFromSubscription(subscription);
        } else if (userId && session.mode === "payment") {
          await activateVipOneMonth(session);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await activateVipFromSubscription(subscription);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json({ error: "Falha ao processar webhook." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
