import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

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
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/pricing`,
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
      console.log('[EDGE] ❌ STRIPE ERROR:', err);

      return new Response(
        JSON.stringify({
          error: err?.message,
          type: err?.type,
          code: err?.code,
        }),
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
    console.error("Checkout error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
