// Single source of truth for Stripe mode + price ID mapping.
// Toggle modes by setting the STRIPE_MODE secret to "test" or "live" (default: "live").

export type StripeMode = "test" | "live";

export const PRICE_IDS = {
  live: {
    starter: "price_1TSY0hAu1BgRc5ulYJxYnjPR",
    pro: "price_1TSY0kAu1BgRc5ulHX8zVb6a",
    business: "price_1TSY0kAu1BgRc5ulAzVRdMMd",
  },
  test: {
    starter: "price_1TGgrbAu1BgRc5ulqTuDzcer",
    pro: "price_1TGgrdAu1BgRc5ulzP7eBSW9",
    business: "price_1TGgreAu1BgRc5ulrOh3mr4u",
  },
} as const;

export function getStripeMode(): StripeMode {
  const v = (Deno.env.get("STRIPE_MODE") || "live").toLowerCase();
  return v === "test" ? "test" : "live";
}

// Reverse map: priceId -> internal plan name (for both modes — webhook may receive either)
export const PRICE_TO_PLAN: Record<string, "starter" | "pro" | "business"> = {
  ...Object.fromEntries(
    Object.entries(PRICE_IDS.live).map(([plan, id]) => [id, plan as any])
  ),
  ...Object.fromEntries(
    Object.entries(PRICE_IDS.test).map(([plan, id]) => [id, plan as any])
  ),
};

// Resolve which webhook secret to use based on mode.
// Falls back to STRIPE_WEBHOOK_SECRET if mode-specific secret is not set.
export function getWebhookSecret(mode: StripeMode): string | null {
  const specific = mode === "live"
    ? Deno.env.get("STRIPE_WEBHOOK_SECRET_LIVE")
    : Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST");
  return specific || Deno.env.get("STRIPE_WEBHOOK_SECRET") || null;
}

// Resolve which Stripe secret key to use based on mode.
export function getStripeSecretKey(mode: StripeMode): string | null {
  const specific = mode === "live"
    ? Deno.env.get("STRIPE_SECRET_KEY_LIVE")
    : Deno.env.get("STRIPE_SECRET_KEY_TEST");
  return specific || Deno.env.get("STRIPE_SECRET_KEY") || null;
}
