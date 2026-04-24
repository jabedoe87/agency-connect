import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BANNED_WORDS = [
  "improve", "enhance", "boost", "optimize", "elevate", "empower", "leverage",
  "streamline", "utilize", "facilitate", "journey", "holistic", "tailored",
  "cutting-edge", "innovative", "game-changing", "transform your life",
  "results-driven", "passionate about", "one-stop shop"
];

const GENERIC_PHRASES = [
  "we are committed to",
  "customer satisfaction is our priority",
  "we strive to",
  "thank you for your feedback",
  "as a valued customer",
  "we apologize for any inconvenience",
  "improve your business",
  "high-quality service",
  "best solution",
  "innovative approach",
  "take your business to the next level",
  "tailored solutions",
];

// Length limits (words)
const LIMITS = {
  hook: 40,
  emotional_benefit: 60,
  bullet: 18,
  objection_handler: 50,
  cta: 20,
};

const STYLE_PRESETS: Record<string, string> = {
  "high-converting": `Style: HIGH-CONVERTING DIRECT RESPONSE.
Tone: urgent, specific, outcome-driven.
Voice: a top-performing direct-response copywriter who has tested thousands of ads.
Language: tight sentences, concrete numbers when possible, zero filler, zero adjectives that don't earn their place.
Feels like: a proven Facebook ad that already converted at scale.
Rule: every line must move the reader one step closer to action. Lead with pain, follow with concrete benefit, close with earned urgency. Outcomes over features. No fluff.`,

  luxury: `Style: LUXURY.
Tone: premium, minimal, emotionally prestigious — never loud.
Voice: calm confidence of a high-end brand speaking to a high-value client.
Language: refined, sensory, deliberate. No slang. No exaggeration. No exclamation marks. No urgency. No discounts. No pressure.
Feels like: Apple, Rolex, Aman Resorts, Hermès.
Rule: elegance over persuasion. Use words like bespoke, curated, private, crafted, considered, refined. The reader should feel chosen, not sold to. The CTA is a quiet invitation, never a command.`,

  aggressive: `Style: AGGRESSIVE SALES.
Tone: hard, direct, zero patience for excuses.
Voice: a closer who will not let the reader off the hook.
Language: short sentences. Hard stops. Direct commands only. No hedging. No "consider", no "maybe", no "could". One ALL-CAPS phrase allowed for the single most important point.
Feels like: a high-pressure Facebook ad designed to force action right now.
Rule: name the consequence of NOT acting. Make waiting feel like a mistake the reader will regret.`,

  tiktok: `Style: VIRAL / TIKTOK.
Tone: punchy, fast, curiosity-driven, slightly provocative.
Voice: a creator speaking directly to one person scrolling at 11pm.
Language: one idea per line. Max 6 words per sentence. Pattern interrupts. Hooks. Informal is fine.
Feels like: a scroll-stopping TikTok caption or spoken video opener.
Rule: attention over perfection. The first line must make someone stop scrolling — that matters more than every other rule combined. Use line breaks for spoken rhythm, not paragraph structure.`,

  minimal: `Style: MINIMAL / AUTHORITY.
Tone: calm, confident, understated, expert.
Voice: a consultant who trusts the product to speak for itself.
Language: extreme clarity. Short sentences. No hype. No stacked adjectives. No exaggeration. Precise wording. Data-driven where relevant.
Feels like: a clean Apple product page or a McKinsey one-pager.
Rule: trust over hype. Every word must earn its place — cut anything decorative. The reader should grasp the full message in under 10 seconds.`,
};

// Golden example for this exact JSON structure
const GOLDEN_EXAMPLE = `{
  "hook": "Still hiding your body under baggy clothes because nothing seems to work?",
  "emotional_benefit": "Imagine finally feeling confident when you look in the mirror instead of frustrated every morning.",
  "bullets": [
    "Lose visible fat in the first weeks without extreme diets",
    "Train efficiently even with a busy schedule",
    "Feel stronger, fitter, and more energized daily",
    "Stop starting over every Monday and finally stay consistent"
  ],
  "objection_handler": "Tried everything before and nothing worked? This approach is built for busy professionals who need something realistic and sustainable.",
  "cta": "Book your first session before this week fills up"
}`;

const SYSTEM_PROMPT = `You are an elite direct-response copywriter for local service businesses. Your copy converts strangers into paying clients.

You are generating client-getting content following an EXACT structure with 5 sections: hook, emotional_benefit, bullets (exactly 4), objection_handler, cta.

BANNED WORDS (never use these — instant fail):
${BANNED_WORDS.join(", ")}

BANNED GENERIC PHRASES (never use these — instant fail):
${GENERIC_PHRASES.join(" / ")}

OUTPUT FORMAT — return ONLY valid JSON, no markdown, no code fences, no explanation:
{
  "hook": "",
  "emotional_benefit": "",
  "bullets": ["", "", "", ""],
  "objection_handler": "",
  "cta": ""
}

SECTION RULES:

hook (max ${LIMITS.hook} words, max 2 sentences)
- pain-driven, specific to the reader's actual situation
- NEVER start with: "Are you", "Do you want", "Looking for", "Imagine if"

emotional_benefit (max ${LIMITS.emotional_benefit} words, max 3 sentences)
- before → after transformation
- concrete, not abstract

bullets (exactly 4, each max ${LIMITS.bullet} words)
- benefit-driven, not feature-driven
- start with strong action verbs
- specific outcomes, not vague promises

objection_handler (max ${LIMITS.objection_handler} words)
- address the strongest real objection for this exact business type
- reframe it, do not just dismiss it

cta (max ${LIMITS.cta} words, 1 sentence)
- one clear action
- urgency must feel earned, not forced (unless style is aggressive)

GOLDEN EXAMPLE OF A PERFECT RESULT (fitness coach niche, high-converting style):

${GOLDEN_EXAMPLE}

Now generate a result of equal or greater quality, matching the requested niche, business context, and style EXACTLY. Use the same structure, same depth, same specificity.`;

function wordCount(s: string): number {
  return (s || "").trim().split(/\s+/).filter(Boolean).length;
}

function containsBannedWords(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED_WORDS.filter(w => lower.includes(w));
}

function containsGenericPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  return GENERIC_PHRASES.filter(p => lower.includes(p));
}

function validateOutput(content: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!content || typeof content !== "object") {
    return { valid: false, errors: ["Output is not an object"] };
  }
  if (!content.hook) errors.push("Missing hook");
  if (!content.emotional_benefit) errors.push("Missing emotional_benefit");
  if (!content.bullets || !Array.isArray(content.bullets) || content.bullets.length < 4)
    errors.push("bullets must have at least 4 items");
  if (!content.objection_handler) errors.push("Missing objection_handler");
  if (!content.cta) errors.push("Missing cta");

  // Length discipline
  if (content.hook && wordCount(content.hook) > LIMITS.hook)
    errors.push(`hook exceeds ${LIMITS.hook} words`);
  if (content.emotional_benefit && wordCount(content.emotional_benefit) > LIMITS.emotional_benefit)
    errors.push(`emotional_benefit exceeds ${LIMITS.emotional_benefit} words`);
  if (Array.isArray(content.bullets)) {
    content.bullets.forEach((b: string, i: number) => {
      if (wordCount(b) > LIMITS.bullet) errors.push(`bullet ${i + 1} exceeds ${LIMITS.bullet} words`);
    });
  }
  if (content.objection_handler && wordCount(content.objection_handler) > LIMITS.objection_handler)
    errors.push(`objection_handler exceeds ${LIMITS.objection_handler} words`);
  if (content.cta && wordCount(content.cta) > LIMITS.cta)
    errors.push(`cta exceeds ${LIMITS.cta} words`);

  const allText = [
    content.hook, content.emotional_benefit, content.objection_handler, content.cta,
    ...(content.bullets || [])
  ].filter(Boolean).join(" ");

  const banned = containsBannedWords(allText);
  if (banned.length > 0) errors.push(`Contains banned words: ${banned.join(", ")}`);

  const generic = containsGenericPhrases(allText);
  if (generic.length >= 2) errors.push(`Contains generic phrases: ${generic.join(", ")}`);

  const hookLower = (content.hook || "").toLowerCase().trim();
  if (hookLower.startsWith("are you") || hookLower.startsWith("do you want") ||
      hookLower.startsWith("looking for") || hookLower.startsWith("imagine if"))
    errors.push("Hook starts with a banned phrase");

  return { valid: errors.length === 0, errors };
}

function validateStyle(content: any, preset: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const allText = [
    content.hook, content.emotional_benefit, content.objection_handler, content.cta,
    ...(content.bullets || [])
  ].filter(Boolean).join(" ");

  if (preset === "luxury") {
    if (allText.includes("!")) errors.push("Luxury style must not contain exclamation marks");
    const pushy = /\b(now|hurry|limited time|don't wait|act fast)\b/i;
    if (pushy.test(allText)) errors.push("Luxury style must not use urgency/pressure language");
  }

  if (preset === "tiktok") {
    // Viral: short punchy sentences. Hook should be short.
    if (content.hook && wordCount(content.hook) > 14)
      errors.push("Viral hook should be short and punchy (≤14 words)");
  }

  if (preset === "aggressive") {
    const soft = /\b(maybe|perhaps|consider|might|could)\b/i;
    if (soft.test(allText)) errors.push("Aggressive style must not use soft/hedging language");
  }

  return { valid: errors.length === 0, errors };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { niche, preset = "high-converting", businessContext, assistInstruction } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const styleInstruction = STYLE_PRESETS[preset] || STYLE_PRESETS["high-converting"];

    const userPrompt = `Write client-getting content for this business.

Niche: ${niche}

${businessContext ? `Business context:
- Business type: ${businessContext.business_type || "Service business"}
- Target audience: ${businessContext.target_audience || "Local customers"}
- Offer: ${businessContext.offer || niche}

Write specifically for THIS business and audience. Generic phrasing = automatic fail. If a sentence could apply to any business, rewrite it until it could only apply to this one.

` : ""}${styleInstruction}

Match the style EXACTLY. The output must feel unmistakably like the requested style — a luxury result must not sound like an aggressive result, and vice versa.

Return ONLY valid JSON. No markdown, no code blocks, no explanation.${assistInstruction ? `\n\n${assistInstruction}` : ''}`;

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
        if (response.status === 429) return { error: "Rate limit exceeded. Please try again in a moment.", status: 429 };
        if (response.status === 402) return { error: "AI credits exhausted. Please add funds.", status: 402 };
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        return { error: "AI generation failed", status: 500 };
      }

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content || "";

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

    const isVariationsRequest = assistInstruction && assistInstruction.toLowerCase().includes('variations');

    let validation = { valid: true, errors: [] as string[] };
    let styleValidation = { valid: true, errors: [] as string[] };
    let qualityWarning = false;

    if (!isVariationsRequest) {
      validation = validateOutput(result.content);
      styleValidation = validateStyle(result.content, preset);

      // Retry up to 2 times total if validation fails
      let attempts = 0;
      while ((!validation.valid || !styleValidation.valid) && attempts < 2) {
        attempts++;
        const allErrors = [...validation.errors, ...styleValidation.errors];
        console.log(`Validation failed (attempt ${attempts}), retrying:`, allErrors);
        const retryPrompt = `${userPrompt}

CRITICAL: Your previous output had these issues — fix ALL of them: ${allErrors.join("; ")}.
Return ONLY valid JSON matching the exact structure and length limits.`;

        const retry = await generateContent(retryPrompt);
        if ("error" in retry) break; // keep last good-ish result
        result = retry;
        validation = validateOutput(result.content);
        styleValidation = validateStyle(result.content, preset);
      }

      if (!validation.valid || !styleValidation.valid) {
        qualityWarning = true;
      }
    }

    return new Response(JSON.stringify({
      content: result.content,
      preset,
      validation: {
        valid: validation.valid && styleValidation.valid,
        errors: [...validation.errors, ...styleValidation.errors],
      },
      quality_warning: qualityWarning,
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
