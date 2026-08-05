import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY não configurada.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

export function getRecurringVipPriceId() {
  return (
    process.env.STRIPE_VIP_RECURRING_PRICE_ID?.trim() ||
    process.env.STRIPE_VIP_PRICE_ID?.trim() ||
    null
  );
}

export function getStripeConfigError() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return "Pagamentos não configurados. Adicione STRIPE_SECRET_KEY ao .env.local.";
  }

  if (!getRecurringVipPriceId() && !process.env.STRIPE_VIP_LOOKUP_KEY) {
    return "Planos VIP não configurados. Adicione os Price IDs do Stripe ao .env.local.";
  }

  return null;
}

export async function resolveVipPriceId(stripe: Stripe) {
  const priceId = getRecurringVipPriceId();
  if (priceId) {
    return priceId;
  }

  const lookupKey = process.env.STRIPE_VIP_LOOKUP_KEY?.trim();
  if (!lookupKey) {
    throw new Error("STRIPE_VIP_RECURRING_PRICE_ID ou STRIPE_VIP_LOOKUP_KEY é obrigatório.");
  }

  const prices = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });

  const resolved = prices.data[0]?.id;
  if (!resolved) {
    throw new Error(
      `Nenhum preço ativo encontrado no Stripe para lookup_key "${lookupKey}".`
    );
  }

  return resolved;
}
