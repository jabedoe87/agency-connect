import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BANNED_WORDS = [
  "improve", "enhance", "boost", "optimize", "elevate", "empower", "leverage",
  "streamline", "utilize", "facilitate", "journey", "holistic", "tailored",
  "cutting-edge", "innovative", "game-changing", "transform your life"
];

const STYLE_PRESETS: Record<string, string> = {
  luxury: `Tone: sophisticated, exclusive, aspirational. Use elevated language that signals premium quality. Speak to high-end clients who value exclusivity and results. Avoid casualness.`,
  aggressive: `Tone: bold, direct, urgent. Use strong action language and high-pressure urgency. Challenge the reader. Be provocative but not offensive. Push hard for action.`,
  tiktok: `Tone: casual, punchy, scroll-stopping. Write like viral social media copy. Short sentences. Use "you" constantly. Pattern interrupts. Raw and authentic, not corporate.`,
  minimal: `Tone: clean, clear, no fluff. Every word must earn its place. Short sentences. No adjectives unless necessary. Let the offer speak for itself.`,
  "high-converting": `Tone: proven direct-response style. Lead with pain, agitate, solve. Use specifics and numbers where possible. Write like a seasoned copywriter who has tested thousands of ads.`,
};

const SYSTEM_PROMPT = `You are an expert direct-response copywriter who writes content that converts readers into paying clients.

You write for local service businesses.

STRICT RULES:

BANNED WORDS (never use these):
${BANNED_WORDS.join(", ")}

FORMAT:
Return ONLY valid JSON with this exact structure:
{
  "hook": "",
  "emotional_benefit": "",
  "bullets": ["", "", "", ""],
  "objection_handler": "",
  "cta": ""
}

RULES:

hook:
- pain-driven
- specific
- max 2 sentences
- NEVER start with: "Are you", "Do you want", "Looking for"

emotional_benefit:
- before → after transformation
- max 3 sentences

bullets:
- exactly 4
- benefit-driven
- start with action verbs

objection_handler:
- address a real objection for this business type
- reframe it

cta:
- strong action
- urgency`;

function containsBannedWords(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED_WORDS.filter(w => lower.includes(w));
}

function validateOutput(content: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!content.hook) errors.push("Missing hook");
  if (!content.emotional_benefit) errors.push("Missing emotional_benefit");
  if (!content.bullets || !Array.isArray(content.bullets) || content.bullets.length < 4)
    errors.push("bullets must have at least 4 items");
  if (!content.objection_handler) errors.push("Missing objection_handler");
  if (!content.cta) errors.push("Missing cta");

  // Check banned words across all text
  const allText = [
    content.hook, content.emotional_benefit, content.objection_handler, content.cta,
    ...(content.bullets || [])
  ].filter(Boolean).join(" ");
  const found = containsBannedWords(allText);
  if (found.length > 0) errors.push(`Contains banned words: ${found.join(", ")}`);

  // Check generic hook starts
  const hookLower = (content.hook || "").toLowerCase().trim();
  if (hookLower.startsWith("are you") || hookLower.startsWith("do you want") || hookLower.startsWith("looking for"))
    errors.push("Hook starts with a banned phrase");

  return { valid: errors.length === 0, errors };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { niche, preset = "high-converting", businessContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const styleInstruction = STYLE_PRESETS[preset] || STYLE_PRESETS["high-converting"];

    const userPrompt = `Write client-getting content for this business:

Niche: ${niche}

Style: ${styleInstruction}

${businessContext ? `Business context:
- Business type: ${businessContext.business_type || "Service business"}
- Target audience: ${businessContext.target_audience || "Local customers"}
- Offer: ${businessContext.offer || niche}

Write specifically for this business. Avoid generic phrasing. If output feels generic, rewrite it to be more specific.` : ""}

Return ONLY valid JSON. No markdown, no code blocks, no explanation.`;

    const generateContent = async (retryPrompt?: string) => {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: retryPrompt || userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return { error: "Rate limit exceeded. Please try again in a moment.", status: 429 };
        }
        if (response.status === 402) {
          return { error: "AI credits exhausted. Please add funds.", status: 402 };
        }
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        return { error: "AI generation failed", status: 500 };
      }

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content || "";
      
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = raw;
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1];
      jsonStr = jsonStr.trim();

      try {
        return { content: JSON.parse(jsonStr) };
      } catch {
        console.error("Failed to parse JSON:", jsonStr.substring(0, 200));
        return { error: "Failed to parse AI response", status: 500 };
      }
    };

    // First attempt
    let result = await generateContent();
    if ("error" in result) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let validation = validateOutput(result.content);
    
    // Retry once if validation fails
    if (!validation.valid) {
      console.log("Validation failed, retrying:", validation.errors);
      const retryPrompt = `${userPrompt}

IMPORTANT: Your previous output had these issues: ${validation.errors.join("; ")}. Fix them. Return ONLY valid JSON.`;
      
      result = await generateContent(retryPrompt);
      if ("error" in result) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: result.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      validation = validateOutput(result.content);
    }

    return new Response(JSON.stringify({
      content: result.content,
      preset,
      validation: { valid: validation.valid, errors: validation.errors },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
