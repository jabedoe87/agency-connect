import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getStripeMode, getStripeSecretKey } from "../_shared/stripe-mode.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const mode = getStripeMode();
    const stripeKey = getStripeSecretKey(mode);
    if (!stripeKey) throw new Error(`Stripe secret key for mode=${mode} is not set`);
    console.log('[EDGE] STRIPE_MODE:', mode);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = userData.user.id;
    const email = userData.user.email;

    const { priceId, checkoutMode } = await req.json();
    console.log('[EDGE] priceId:', priceId);
    console.log('[EDGE] checkoutMode:', checkoutMode);

    if (!priceId || !["trial", "direct"].includes(checkoutMode)) {
      return new Response(JSON.stringify({ error: "Invalid parameters" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find or create Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();

    let customerId: string | null = profile?.stripe_customer_id ?? null;

    // Validate cached customer exists in current Stripe mode (test/live).
    // If it was created in the other mode, Stripe returns resource_missing — recreate it.
    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId);
        if ((existing as any).deleted) customerId = null;
      } catch (err: any) {
        if (err?.code === "resource_missing") {
          console.log('[EDGE] cached customer not found in current mode, recreating');
          customerId = null;
        } else {
          throw err;
        }
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { user_id: userId } });
      customerId = customer.id;
      await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("user_id", userId);
    }

    const origin = req.headers.get("origin") || "https://id-preview--c5b11c23-da1d-4a43-92b7-e84dabb9336f.lovable.app";

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/upgrade`,
      metadata: { user_id: userId, supabase_user_id: userId, price_id: priceId },
      subscription_data: {
        metadata: { user_id: userId, supabase_user_id: userId },
      },
    };

    if (checkoutMode === "trial") {
      sessionConfig.subscription_data = {
        trial_period_days: 7,
        metadata: { user_id: userId, supabase_user_id: userId },
      };
    }

    let session;

    try {
      session = await stripe.checkout.sessions.create(sessionConfig);
      console.log('[EDGE] session created:', !!session);
      console.log('[EDGE] session.url:', session?.url);
    } catch (err: any) {
      const reqId = crypto.randomUUID();
      console.error('[EDGE] STRIPE ERROR', { reqId, message: err?.message, type: err?.type, code: err?.code, stack: err?.stack });
      return new Response(
        JSON.stringify({ error: 'Unable to start checkout. Please try again.', requestId: reqId }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!session?.url) {
      return new Response(JSON.stringify({ error: "Stripe checkout session URL missing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const reqId = crypto.randomUUID();
    console.error("Checkout error:", { reqId, message: msg, stack: error instanceof Error ? error.stack : undefined });
    return new Response(JSON.stringify({ error: "An unexpected error occurred", requestId: reqId }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
