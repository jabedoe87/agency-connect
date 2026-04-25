import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Maps Stripe price IDs → internal plan names. Keep in sync with PricingCards.tsx
const PRICE_TO_PLAN: Record<string, string> = {
  "price_1TGgrbAu1BgRc5ulqTuDzcer": "starter",  // TEST €49/mo
  "price_1TGgrdAu1BgRc5ulzP7eBSW9": "pro",      // TEST €99/mo
  "price_1TGgreAu1BgRc5ulrOh3mr4u": "business", // TEST €149/mo
};

const PAID_STATUSES = ["active", "trialing"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    console.error("[WEBHOOK] STRIPE_SECRET_KEY missing");
    return new Response("Server misconfigured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  // ─── Verify webhook signature ──────────────────────────────────
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET missing — configure in environment.");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("missing stripe-signature header");
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[WEBHOOK] signature verification failed:", msg);
    return new Response(`Webhook signature verification failed: ${msg}`, { status: 400 });
  }

  console.log("[WEBHOOK] event type:", event.type);

  // ─── Helpers ───────────────────────────────────────────────────
  async function resolveUserIdFromCustomer(customerId: string | null | undefined, email?: string | null): Promise<string | null> {
    if (customerId) {
      const { data } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (data?.user_id) return data.user_id;

      // Fallback: read metadata.user_id from the Stripe customer
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (!("deleted" in customer) || !customer.deleted) {
          const metaUserId = (customer as Stripe.Customer).metadata?.user_id;
          if (metaUserId) return metaUserId;
        }
      } catch (_) { /* ignore */ }
    }
    if (email) {
      // No direct email index on profiles — best-effort via auth admin
      try {
        // @ts-ignore admin API available with service role
        const { data: list } = await supabase.auth.admin.listUsers();
        const match = list?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
        if (match?.id) return match.id;
      } catch (_) { /* ignore */ }
    }
    return null;
  }

  async function upsertProfile(userId: string, fields: Record<string, any>): Promise<{ ok: boolean; error?: any }> {
    // Update first (profile row is created by handle_new_user trigger).
    const { data: updated, error: updateErr } = await supabase
      .from("profiles")
      .update({ ...fields })
      .eq("user_id", userId)
      .select("id");
    if (updateErr) return { ok: false, error: updateErr };

    // Fallback: if no row matched, insert.
    if (!updated || updated.length === 0) {
      const { error: insertErr } = await supabase
        .from("profiles")
        .insert({ user_id: userId, ...fields });
      if (insertErr) return { ok: false, error: insertErr };
    }
    return { ok: true };
  }

  try {
    // ─── checkout.session.completed ──────────────────────────────
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = (session.customer as string) || null;
      const subscriptionId = (session.subscription as string) || null;

      console.log("metadata:", session.metadata);

      // Resolve user (priority: metadata → customer → email)
      let resolvedUserId: string | null =
        session.metadata?.supabase_user_id ?? session.metadata?.user_id ?? null;
      if (!resolvedUserId) {
        resolvedUserId = await resolveUserIdFromCustomer(customerId, session.customer_details?.email);
      }
      console.log("[WEBHOOK] user resolved:", resolvedUserId ? "YES" : "NO");
      if (!resolvedUserId) return new Response("OK", { status: 200 });

      // Resolve priceId — fetch subscription if not on session
      let priceId: string | null = null;
      let stripeStatus = "unknown";
      let trialEnd: number | null = null;

      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        priceId = sub.items.data[0]?.price?.id ?? null;
        stripeStatus = sub.status;
        trialEnd = sub.trial_end ?? null;
      }
      console.log("[WEBHOOK] priceId:", priceId);

      const resolvedPlan = priceId ? PRICE_TO_PLAN[priceId] : null;
      console.log("[WEBHOOK] plan resolved:", resolvedPlan ?? "NO");
      console.log("[WEBHOOK] subscription status:", stripeStatus);

      if (!resolvedPlan) return new Response("OK", { status: 200 });

      const updateFields: Record<string, any> = {
        plan: resolvedPlan,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
      };
      if (stripeStatus === "active") {
        updateFields.trial_ends_at = new Date().toISOString();
      } else if (stripeStatus === "trialing" && trialEnd) {
        updateFields.trial_ends_at = new Date(trialEnd * 1000).toISOString();
      }

      const { ok, error: updateError } = await upsertProfile(resolvedUserId, updateFields);
      console.log("[WEBHOOK] database update success:", ok ? "YES" : "NO");
      if (!ok) {
        console.error("[WEBHOOK] DB ERROR — forcing retry", updateError);
        return new Response("DB update failed", { status: 500 });
      }
    }

    // ─── customer.subscription.{created,updated,deleted} ─────────
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const priceId = subscription.items.data[0]?.price?.id ?? null;
      const stripeStatus = subscription.status || "unknown";

      const resolvedUserId = await resolveUserIdFromCustomer(customerId);
      console.log("[WEBHOOK] user resolved:", resolvedUserId ? "YES" : "NO");
      console.log("[WEBHOOK] priceId:", priceId);
      console.log("[WEBHOOK] subscription status:", stripeStatus);
      if (!resolvedUserId) return new Response("OK", { status: 200 });

      let resolvedPlan: string | null = priceId ? PRICE_TO_PLAN[priceId] ?? null : null;
      console.log("[WEBHOOK] plan resolved:", resolvedPlan ?? "NO");

      const updateFields: Record<string, any> = {
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
      };

      if (event.type === "customer.subscription.deleted" || stripeStatus === "canceled") {
        // FORCE downgrade
        updateFields.plan = "trial"; // schema default; "free" is not in this app's plan set
        updateFields.stripe_subscription_id = null;
      } else if (resolvedPlan && PAID_STATUSES.includes(stripeStatus)) {
        updateFields.plan = resolvedPlan;
        if (stripeStatus === "active") {
          updateFields.trial_ends_at = new Date().toISOString();
        } else if (stripeStatus === "trialing" && subscription.trial_end) {
          updateFields.trial_ends_at = new Date(subscription.trial_end * 1000).toISOString();
        }
      }

      const { ok, error: updateError } = await upsertProfile(resolvedUserId, updateFields);
      console.log("[WEBHOOK] database update success:", ok ? "YES" : "NO");
      if (!ok) {
        console.error("[WEBHOOK] DB ERROR — forcing retry", updateError);
        return new Response("DB update failed", { status: 500 });
      }
    }

    // ─── invoice.payment_succeeded ───────────────────────────────
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const subscriptionId = (invoice as any).subscription as string | null;
      if (!subscriptionId) return new Response("OK", { status: 200 });

      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = sub.items.data[0]?.price?.id ?? null;
      const stripeStatus = sub.status || "unknown";
      const resolvedUserId = await resolveUserIdFromCustomer(customerId, invoice.customer_email);

      console.log("[WEBHOOK] user resolved:", resolvedUserId ? "YES" : "NO");
      console.log("[WEBHOOK] priceId:", priceId);
      console.log("[WEBHOOK] subscription status:", stripeStatus);
      if (!resolvedUserId || !priceId) return new Response("OK", { status: 200 });

      const resolvedPlan = PRICE_TO_PLAN[priceId];
      console.log("[WEBHOOK] plan resolved:", resolvedPlan ?? "NO");
      if (!resolvedPlan) return new Response("OK", { status: 200 });

      const { ok, error: updateError } = await upsertProfile(resolvedUserId, {
        plan: resolvedPlan,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        trial_ends_at: new Date().toISOString(),
      });
      console.log("[WEBHOOK] database update success:", ok ? "YES" : "NO");
      if (!ok) {
        console.error("[WEBHOOK] DB ERROR — forcing retry", updateError);
        return new Response("DB update failed", { status: 500 });
      }
    }

    // ─── invoice.payment_failed ──────────────────────────────────
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const resolvedUserId = await resolveUserIdFromCustomer(customerId, invoice.customer_email);
      console.log("[WEBHOOK] user resolved:", resolvedUserId ? "YES" : "NO");
      console.log("[WEBHOOK] subscription status:", "past_due");
      // Do not downgrade immediately — Stripe retries. Just log.
      // (Subscription updated/deleted events will adjust plan if it ultimately fails.)
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[WEBHOOK] handler error:", msg);
    return new Response("Webhook handler error", { status: 500 });
  }
});
