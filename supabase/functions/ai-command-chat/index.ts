import { convertToModelMessages, streamText, type UIMessage } from "npm:ai";
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
    const user = userData.user;
    if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const { messages, threadId }: { messages: UIMessage[]; threadId: string } = await req.json();

    // Verify thread ownership
    const { data: thread } = await supabase.from("ai_threads").select("id").eq("id", threadId).maybeSingle();
    if (!thread) return new Response("Thread not found", { status: 404, headers: corsHeaders });

    // Fetch context about the user's data
    const today = new Date().toISOString().split("T")[0];
    const [leadsRes, clientsRes, apptsRes, recentLeadsRes] = await Promise.all([
      supabase.from("leads").select("id,status", { count: "exact" }),
      supabase.from("clients").select("id,monthly_value,status", { count: "exact" }),
      supabase.from("appointments").select("id,client_or_lead_name,date,time,appointment_type").gte("date", today).order("date").limit(5),
      supabase.from("leads").select("name,status,created_at,last_contact").order("created_at", { ascending: false }).limit(10),
    ]);

    const leadsByStatus: Record<string, number> = {};
    (leadsRes.data ?? []).forEach((l: any) => { leadsByStatus[l.status] = (leadsByStatus[l.status] ?? 0) + 1; });
    const monthlyRevenue = (clientsRes.data ?? []).filter((c: any) => c.status === "Active").reduce((s: number, c: any) => s + (Number(c.monthly_value) || 0), 0);

    const context = `
CURRENT USER DATA (as of ${today}):
- Total leads: ${leadsRes.count ?? 0} (by status: ${JSON.stringify(leadsByStatus)})
- Total clients: ${clientsRes.count ?? 0}
- Monthly recurring revenue: €${monthlyRevenue}
- Upcoming appointments: ${JSON.stringify(apptsRes.data ?? [])}
- Recent leads: ${JSON.stringify(recentLeadsRes.data ?? [])}
`;

    const gateway = createLovableAiGatewayProvider(apiKey);
    const result = streamText({
      model: gateway("google/gemini-2.5-flash"),
      system: `You are the AI Command Center assistant for AgencyOS, a real-estate CRM.
You help solo agents and small teams close more deals by giving concise, actionable advice.
Always use the live user data below to ground your answers. If asked for a briefing or priorities, use the data.
Be concise, use short bullet lists, and suggest specific next actions with names when possible.

${context}`,
      messages: convertToModelMessages(messages),
    });

    // Persist user message + capture assistant on finish
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      await supabase.from("ai_messages").insert({
        thread_id: threadId,
        user_id: user.id,
        role: "user",
        parts: lastUser.parts as any,
      });
    }

    return result.toUIMessageStreamResponse({
      headers: corsHeaders,
      onFinish: async ({ messages: finished }) => {
        const assistant = finished.filter((m) => m.role === "assistant").pop();
        if (assistant) {
          await supabase.from("ai_messages").insert({
            thread_id: threadId,
            user_id: user.id,
            role: "assistant",
            parts: assistant.parts as any,
          });
        }
        // Touch thread updated_at + auto-title if still default
        await supabase.from("ai_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
        if (lastUser) {
          const firstText = (lastUser.parts as any[]).find((p) => p.type === "text")?.text ?? "";
          const { data: t } = await supabase.from("ai_threads").select("title").eq("id", threadId).maybeSingle();
          if (t && t.title === "New conversation" && firstText) {
            await supabase.from("ai_threads").update({ title: firstText.slice(0, 60) }).eq("id", threadId);
          }
        }
      },
    });
  } catch (err) {
    console.error("ai-command-chat error", err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
