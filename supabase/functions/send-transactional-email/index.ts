import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM = "AgencyOS <onboarding@resend.dev>";

type TemplateName = "welcome" | "trial-ending" | "payment-failed";

interface Body {
  templateName: TemplateName;
  recipientEmail: string;
  userId?: string;
  templateData?: Record<string, unknown>;
}

function render(t: TemplateName, data: Record<string, any> = {}): { subject: string; html: string } {
  const name = (data.name as string) || "there";
  const portalUrl = (data.portalUrl as string) || "https://id-preview--c5b11c23-da1d-4a43-92b7-e84dabb9336f.lovable.app/settings";
  const dashboardUrl = (data.dashboardUrl as string) || "https://id-preview--c5b11c23-da1d-4a43-92b7-e84dabb9336f.lovable.app/dashboard";

  const wrap = (heading: string, body: string, cta?: { label: string; url: string }) => `
    <div style="background:#0f0f0f;padding:32px 0;font-family:Inter,Arial,sans-serif;">
      <div style="max-width:560px;margin:0 auto;background:#1f2937;border-radius:12px;padding:32px;color:#e5e7eb;">
        <h1 style="color:#6366f1;margin:0 0 16px;font-size:22px;">${heading}</h1>
        <div style="font-size:14px;line-height:1.6;color:#cbd5e1;">${body}</div>
        ${cta ? `<a href="${cta.url}" style="display:inline-block;margin-top:24px;background:#6366f1;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">${cta.label}</a>` : ""}
        <p style="margin-top:32px;font-size:12px;color:#64748b;">— The AgencyOS team</p>
      </div>
    </div>`;

  switch (t) {
    case "welcome":
      return {
        subject: "Welcome to AgencyOS 🎉",
        html: wrap(
          `Welcome, ${name}!`,
          `<p>Your AgencyOS subscription is active. Jump into your dashboard and start landing clients.</p>`,
          { label: "Open dashboard", url: dashboardUrl }
        ),
      };
    case "trial-ending":
      return {
        subject: "Your AgencyOS trial ends soon",
        html: wrap(
          `Heads up, ${name}`,
          `<p>Your free trial ends in a few days. Keep your momentum going — your card will be charged automatically when the trial ends. Manage your billing anytime.</p>`,
          { label: "Manage billing", url: portalUrl }
        ),
      };
    case "payment-failed":
      return {
        subject: "Action needed: payment failed",
        html: wrap(
          `Payment failed`,
          `<p>We couldn't process your latest AgencyOS payment, ${name}. Update your card to keep full access — it only takes 30 seconds.</p>`,
          { label: "Update payment method", url: portalUrl }
        ),
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    // Auth: only allow service-role (internal callers like stripe-webhook) or
    // authenticated users sending to their own email address.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const isServiceRole = !!SERVICE_ROLE_KEY && token === SERVICE_ROLE_KEY;

    let authedUserEmail: string | null = null;
    if (!isServiceRole) {
      if (!token) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const authClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
      const { data: u, error: uErr } = await authClient.auth.getUser(token);
      if (uErr || !u?.user?.email) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      authedUserEmail = u.user.email.toLowerCase();
    }

    const body = (await req.json()) as Body;
    if (!body.templateName || !body.recipientEmail) {
      return new Response(JSON.stringify({ error: "templateName and recipientEmail required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For non-service-role callers, only allow sending to the authed user's own email
    if (!isServiceRole && authedUserEmail !== body.recipientEmail.toLowerCase()) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // 1. Log as queued
    const { data: logRow, error: logErr } = await supabase
      .from("email_send_log")
      .insert({
        user_id: body.userId ?? null,
        recipient_email: body.recipientEmail,
        template_name: body.templateName,
        status: "queued",
        metadata: body.templateData ?? {},
      })
      .select("id")
      .single();

    if (logErr) console.error("[email] log insert failed:", logErr);
    const logId = logRow?.id;

    // 2. Activity log entry (best-effort)
    if (body.userId) {
      await supabase.from("activity_log").insert({
        user_id: body.userId,
        action: "email_queued",
        description: `Email queued: ${body.templateName} → ${body.recipientEmail}`,
      }).then(() => {}, () => {});
    }

    // 3. Render + send via Resend gateway
    const { subject, html } = render(body.templateName, body.templateData);

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: FROM,
        to: [body.recipientEmail],
        subject,
        html,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg = `Resend [${res.status}]: ${JSON.stringify(data)}`;
      console.error("[email] send failed:", errMsg);
      if (logId) {
        await supabase.from("email_send_log").update({
          status: "failed",
          error_message: errMsg.slice(0, 1000),
        }).eq("id", logId);
      }
      if (body.userId) {
        await supabase.from("activity_log").insert({
          user_id: body.userId,
          action: "email_failed",
          description: `Email failed: ${body.templateName}`,
        }).then(() => {}, () => {});
      }
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Mark sent
    const messageId = (data as any)?.id ?? null;
    if (logId) {
      await supabase.from("email_send_log").update({
        status: "sent",
        provider_message_id: messageId,
      }).eq("id", logId);
    }
    if (body.userId) {
      await supabase.from("activity_log").insert({
        user_id: body.userId,
        action: "email_sent",
        description: `Email sent: ${body.templateName}`,
      }).then(() => {}, () => {});
    }

    return new Response(JSON.stringify({ ok: true, id: messageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email] handler error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
