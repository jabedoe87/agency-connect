import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any, level: "info" | "warn" | "error" = "info") => {
  const payload = {
    fn: "check-subscription",
    step,
    level,
    ts: new Date().toISOString(),
    ...(details ? { details } : {}),
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const requestId = crypto.randomUUID();

  // Lightweight health route — no Stripe / no auth, just confirms the function is up
  // and required env vars are present. Frontend can call this before the full check.
  if (url.pathname.endsWith("/health")) {
    const hasStripe = !!Deno.env.get("STRIPE_SECRET_KEY");
    const hasSupaUrl = !!Deno.env.get("SUPABASE_URL");
    const hasServiceKey = !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ready = hasStripe && hasSupaUrl && hasServiceKey;
    // Log full diagnostics server-side only; never expose env presence to callers.
    logStep("health", { ready, hasStripe, hasSupaUrl, hasServiceKey, requestId });
    return new Response(
      JSON.stringify({ ok: ready, ts: new Date().toISOString() }),
      {
        status: ready ? 200 : 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("missing_env", { key: "STRIPE_SECRET_KEY", requestId }, "error");
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    logStep("stripe_key_verified", { requestId });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logStep("unauthorized_missing_header", { requestId }, "warn");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user) {
      logStep("unauthorized_invalid_token", { requestId, error: userError?.message }, "warn");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = userData.user;
    logStep("user_authenticated", { userId: user.id, email: user.email, requestId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let customers;
    try {
      customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logStep("stripe_customers_list_failed", { requestId, error: msg }, "error");
      throw new Error(`Stripe customers.list failed: ${msg}`);
    }

    if (customers.data.length === 0) {
      logStep("no_stripe_customer", { requestId });
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;
    logStep("found_customer", { customerId, requestId });

    let subscriptions, trialingSubs;
    try {
      [subscriptions, trialingSubs] = await Promise.all([
        stripe.subscriptions.list({ customer: customerId, status: "active", limit: 10 }),
        stripe.subscriptions.list({ customer: customerId, status: "trialing", limit: 10 }),
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logStep("stripe_subscriptions_list_failed", { requestId, customerId, error: msg }, "error");
      throw new Error(`Stripe subscriptions.list failed: ${msg}`);
    }

    const allActive = [...subscriptions.data, ...trialingSubs.data];
    const hasActiveSub = allActive.length > 0;

    let subscriptionEnd: string | null = null;
    let priceId: string | null = null;
    let productId: string | null = null;
    let status: string | null = null;

    if (hasActiveSub) {
      const sub = allActive[0] as any;
      const periodEnd =
        sub.items?.data?.[0]?.current_period_end ??
        sub.current_period_end ??
        sub.trial_end ??
        null;
      subscriptionEnd =
        typeof periodEnd === "number" && !isNaN(periodEnd)
          ? new Date(periodEnd * 1000).toISOString()
          : null;
      priceId = sub.items?.data?.[0]?.price?.id ?? null;
      productId = (sub.items?.data?.[0]?.price?.product as string) ?? null;
      status = sub.status;
      logStep("active_subscription_found", {
        requestId,
        subscriptionId: sub.id,
        priceId,
        productId,
        status,
        end: subscriptionEnd,
      });
    } else {
      logStep("no_active_subscription", { requestId });
    }

    return new Response(
      JSON.stringify({
        subscribed: hasActiveSub,
        price_id: priceId,
        product_id: productId,
        subscription_end: subscriptionEnd,
        status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    logStep("unhandled_error", { requestId, message: msg, stack }, "error");
    // Return 200 with fallback flag so frontend doesn't blank-screen on transient errors.
    // Do NOT leak internal error details (env var names, Stripe internals) to clients.
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred", fallback: true, requestId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
