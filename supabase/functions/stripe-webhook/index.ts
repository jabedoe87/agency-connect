import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { PRICE_TO_PLAN, getStripeMode, getStripeSecretKey, getWebhookSecret } from "../_shared/stripe-mode.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const PAID_STATUSES = ["active", "trialing"];

async function fireEmail(
  supabase: any,
  templateName: "welcome" | "trial-ending" | "payment-failed",
  recipientEmail: string,
  userId: string | null,
  templateData: Record<string, any> = {}
) {
  try {
    await supabase.functions.invoke("send-transactional-email", {
      body: { templateName, recipientEmail, userId, templateData },
    });
  } catch (e) {
    console.error("[WEBHOOK] email trigger failed:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  console.log("[WEBHOOK] received raw request");

  const mode = getStripeMode();
  const stripeKey = getStripeSecretKey(mode);
  const webhookSecret = getWebhookSecret(mode);

  if (!stripeKey) {
    console.error(`[WEBHOOK] ERROR no stripe key for mode=${mode}`);
    return new Response("Server misconfigured", { status: 500 });
  }
  if (!webhookSecret) {
    console.error(`[WEBHOOK] ERROR no webhook secret for mode=${mode}`);
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("missing stripe-signature header");
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[WEBHOOK] ERROR signature verification failed: ${msg}`);
    return new Response(`Webhook signature verification failed: ${msg}`, { status: 400 });
  }

  console.log("[WEBHOOK] verified signature");
  console.log(`[WEBHOOK] mode=${mode} event=${event.type} id=${event.id}`);

  // Idempotency: skip if event was already received
  try {
    const { data: existing } = await supabase
      .from("stripe_webhook_events")
      .select("id")
      .eq("id", event.id)
      .maybeSingle();
    if (existing) {
      console.log(`[WEBHOOK] duplicate event=${event.type} id=${event.id}`);
      return new Response("OK (duplicate)", { status: 200 });
    }
    await supabase
      .from("stripe_webhook_events")
      .insert({ id: event.id, type: event.type, processed: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[WEBHOOK] ERROR event log write failed: ${msg}`);
    // Non-fatal — continue processing
  }

  async function resolveUserIdFromCustomer(customerId: string | null | undefined, email?: string | null): Promise<{ userId: string | null; email: string | null }> {
    let userId: string | null = null;
    let resolvedEmail: string | null = email ?? null;

    if (customerId) {
      const { data } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (data?.user_id) userId = data.user_id;

      if (!userId) {
        try {
          const customer = await stripe.customers.retrieve(customerId);
          if (!("deleted" in customer) || !customer.deleted) {
            const c = customer as Stripe.Customer;
            const metaUserId = c.metadata?.user_id;
            if (metaUserId) userId = metaUserId;
            if (!resolvedEmail && c.email) resolvedEmail = c.email;
          }
        } catch (_) {}
      }
    }

    if (!userId && resolvedEmail) {
      try {
        // @ts-ignore
        const { data: list } = await supabase.auth.admin.listUsers();
        const match = list?.users?.find((u: any) => u.email?.toLowerCase() === resolvedEmail!.toLowerCase());
        if (match?.id) {
          userId = match.id;
          if (!resolvedEmail) resolvedEmail = match.email ?? null;
        }
      } catch (_) {}
    }

    if (userId && !resolvedEmail) {
      try {
        // @ts-ignore
        const { data: u } = await supabase.auth.admin.getUserById(userId);
        if (u?.user?.email) resolvedEmail = u.user.email;
      } catch (_) {}
    }

    return { userId, email: resolvedEmail };
  }

  async function upsertProfile(userId: string, fields: Record<string, any>) {
    const { data: updated, error: updateErr } = await supabase
      .from("profiles")
      .update({ ...fields })
      .eq("user_id", userId)
      .select("id");
    if (updateErr) return { ok: false, error: updateErr };
    if (!updated || updated.length === 0) {
      const { error: insertErr } = await supabase
        .from("profiles")
        .insert({ user_id: userId, ...fields });
      if (insertErr) return { ok: false, error: insertErr };
    }
    return { ok: true };
  }

  async function getProfileNameAndPlan(userId: string): Promise<{ name: string; previousPlan: string | null }> {
    const { data } = await supabase.from("profiles").select("full_name, plan").eq("user_id", userId).maybeSingle();
    return { name: data?.full_name || "", previousPlan: data?.plan ?? null };
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = (session.customer as string) || null;
      const subscriptionId = (session.subscription as string) || null;

      let userId: string | null =
        session.metadata?.supabase_user_id ?? session.metadata?.user_id ?? null;
      let email: string | null = session.customer_details?.email ?? null;
      if (!userId) {
        const r = await resolveUserIdFromCustomer(customerId, email);
        userId = r.userId; email = r.email;
      } else if (!email) {
        const r = await resolveUserIdFromCustomer(customerId, null);
        email = r.email;
      }

      console.log(`[WEBHOOK] event=${event.type} user_id=${userId} sub_id=${subscriptionId}`);

      if (!userId) {
        console.log("[WEBHOOK] OK 200");
        return new Response("OK", { status: 200 });
      }

      let priceId: string | null = null;
      let stripeStatus = "unknown";
      let trialEnd: number | null = null;
      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        priceId = sub.items.data[0]?.price?.id ?? null;
        stripeStatus = sub.status;
        trialEnd = sub.trial_end ?? null;
      }

      const resolvedPlan = priceId ? PRICE_TO_PLAN[priceId] : null;
      if (!resolvedPlan) {
        if (priceId) console.log(`[WEBHOOK] unknown price_id ${priceId}`);
        console.log("[WEBHOOK] OK 200");
        return new Response("OK", { status: 200 });
      }

      const { name, previousPlan } = await getProfileNameAndPlan(userId);

      const updateFields: Record<string, any> = {
        plan: resolvedPlan,
        plan_id: priceId,
        subscription_status: stripeStatus === "trialing" ? "trialing" : "active",
        grace_period_ends_at: null,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
      };
      if (stripeStatus === "active") updateFields.trial_ends_at = new Date().toISOString();
      else if (stripeStatus === "trialing" && trialEnd) updateFields.trial_ends_at = new Date(trialEnd * 1000).toISOString();

      const { ok } = await upsertProfile(userId, updateFields);
      if (!ok) {
        console.error("[WEBHOOK] ERROR DB update failed");
        return new Response("DB update failed", { status: 500 });
      }

      const wasFree = !previousPlan || previousPlan === "trial" || previousPlan === "past_due";
      if (wasFree && email) {
        await fireEmail(supabase, "welcome", email, userId, { name });
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const priceId = subscription.items.data[0]?.price?.id ?? null;
      const stripeStatus = subscription.status || "unknown";

      const { userId } = await resolveUserIdFromCustomer(customerId);
      console.log(`[WEBHOOK] event=${event.type} user_id=${userId} sub_id=${subscription.id}`);
      if (!userId) {
        console.log("[WEBHOOK] OK 200");
        return new Response("OK", { status: 200 });
      }

      const resolvedPlan: string | null = priceId ? PRICE_TO_PLAN[priceId] ?? null : null;

      const updateFields: Record<string, any> = {
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
      };

      if (event.type === "customer.subscription.deleted" || stripeStatus === "canceled") {
        updateFields.plan = "trial";
        updateFields.subscription_status = "canceled";
        updateFields.stripe_subscription_id = null;
        updateFields.grace_period_ends_at = null;
      } else if (stripeStatus === "past_due" || stripeStatus === "unpaid") {
        updateFields.plan = "past_due";
        updateFields.subscription_status = "grace_period";
        updateFields.grace_period_ends_at = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      } else if (resolvedPlan && PAID_STATUSES.includes(stripeStatus)) {
        updateFields.plan = resolvedPlan;
        updateFields.subscription_status = stripeStatus === "trialing" ? "trialing" : "active";
        updateFields.grace_period_ends_at = null;
        if (stripeStatus === "active") updateFields.trial_ends_at = new Date().toISOString();
        else if (stripeStatus === "trialing" && subscription.trial_end) {
          updateFields.trial_ends_at = new Date(subscription.trial_end * 1000).toISOString();
        }
      }

      await upsertProfile(userId, updateFields);
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const subscriptionId = (invoice as any).subscription as string | null;
      console.log(`[WEBHOOK] event=${event.type} customer=${customerId} sub_id=${subscriptionId}`);
      if (!subscriptionId) {
        console.log("[WEBHOOK] OK 200");
        return new Response("OK", { status: 200 });
      }

      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = sub.items.data[0]?.price?.id ?? null;
      const { userId } = await resolveUserIdFromCustomer(customerId, invoice.customer_email);
      if (!userId || !priceId) {
        console.log("[WEBHOOK] OK 200");
        return new Response("OK", { status: 200 });
      }

      const resolvedPlan = PRICE_TO_PLAN[priceId];
      if (!resolvedPlan) {
        console.log("[WEBHOOK] OK 200");
        return new Response("OK", { status: 200 });
      }

      await upsertProfile(userId, {
        plan: resolvedPlan,
        subscription_status: "active",
        grace_period_ends_at: null,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        trial_ends_at: new Date().toISOString(),
      });
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const { userId, email } = await resolveUserIdFromCustomer(customerId, invoice.customer_email);
      console.log(`[WEBHOOK] event=${event.type} user_id=${userId} customer=${customerId}`);
      if (userId) {
        await upsertProfile(userId, {
          plan: "past_due",
          subscription_status: "grace_period",
          grace_period_ends_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        });
        if (email) {
          const { name } = await getProfileNameAndPlan(userId);
          await fireEmail(supabase, "payment-failed", email, userId, { name });
        }
      }
    }

    if (event.type === "customer.subscription.trial_will_end") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const { userId, email } = await resolveUserIdFromCustomer(customerId);
      console.log(`[WEBHOOK] event=${event.type} user_id=${userId} sub_id=${subscription.id}`);
      if (userId && email) {
        const { name } = await getProfileNameAndPlan(userId);
        await fireEmail(supabase, "trial-ending", email, userId, { name });
      }
    }

    console.log("[WEBHOOK] OK 200");
    return new Response("OK", { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[WEBHOOK] ERROR ${msg}`);
    return new Response("Webhook handler error", { status: 500 });
  }
});
