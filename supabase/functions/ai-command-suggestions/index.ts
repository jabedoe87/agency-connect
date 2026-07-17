import { generateText, Output } from "npm:ai";
import { z } from "npm:zod";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLovableAiGatewayProvider } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const auth = req.headers.get("Authorization");
    if (!auth) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const today = new Date().toISOString().split("T")[0];
    const [leadsRes, apptsRes, clientsRes] = await Promise.all([
      supabase.from("leads").select("id,name,status,last_contact,created_at"),
      supabase.from("appointments").select("id,date,time,client_or_lead_name,appointment_type").gte("date", today),
      supabase.from("clients").select("id,name,status,last_contact"),
    ]);

    const gateway = createLovableAiGatewayProvider(apiKey);
    try {
      const { output } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        prompt: `You are an automation strategist for a real-estate CRM. Based on this user's live data, propose 4 concrete automations they should turn on today. Each must be specific to their actual leads/clients/appointments — reference names or statuses where relevant. Keep titles under 60 chars and descriptions under 140 chars.

DATA:
Leads: ${JSON.stringify(leadsRes.data ?? [])}
Appointments: ${JSON.stringify(apptsRes.data ?? [])}
Clients: ${JSON.stringify(clientsRes.data ?? [])}`,
        output: Output.object({
          schema: z.object({
            suggestions: z.array(z.object({
              title: z.string(),
              description: z.string(),
              impact: z.enum(["high", "medium", "low"]),
              category: z.string(),
            })),
          }),
        }),
      });
      return Response.json(output, { headers: corsHeaders });
    } catch (e) {
      console.error("suggestion generation failed", e);
      return Response.json({ suggestions: [] }, { headers: corsHeaders });
    }
  } catch (err) {
    console.error("ai-command-suggestions error", err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
