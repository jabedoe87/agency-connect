import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const PLAN_MAP: Record<string, string> = {};

  async function resolvePlan(priceId: string): Promise<string> {
    if (PLAN_MAP[priceId]) return PLAN_MAP[priceId];
    try {
      const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
      const product = price.product as Stripe.Product;
      const name = product.name?.toLowerCase() || "";
      if (name.includes("business")) return "business";
      if (name.includes("pro")) return "pro";
      return "starter";
    } catch {
      return "pro";
    }
  }

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      const userId = session.metadata?.user_id;

      if (!userId) {
        return new Response("OK", { status: 200 });
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price?.id;
      const plan = priceId ? await resolvePlan(priceId) : "pro";
      const status = subscription.status;

      const updateData: Record<string, any> = {
        plan,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
      };

      if (status === "active") {
        updateData.trial_ends_at = new Date().toISOString();
      }

      await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", userId);
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile) {
        if (subscription.status === "canceled" || event.type === "customer.subscription.deleted") {
          await supabase.from("profiles").update({ plan: "trial" }).eq("user_id", profile.user_id);
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Webhook error", { status: 400 });
  }
});
