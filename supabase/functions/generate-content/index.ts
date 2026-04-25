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
Language: few words, high impact. Sensory, deliberate. Quiet confidence. No slang. No exaggeration. No exclamation marks. No urgency. No discounts. No pressure.
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
Language: sharp hooks. One idea per line. Max 6 words per sentence. Pattern interrupts. Contrast-driven. Informal is fine.
Feels like: a scroll-stopping TikTok caption or spoken video opener.
Rule: attention over perfection. The first line must make someone stop scrolling — that matters more than every other rule combined. Use line breaks for spoken rhythm, not paragraph structure.`,

  minimal: `Style: MINIMAL / AUTHORITY.
Tone: calm, confident, understated, expert.
Voice: a consultant who trusts the product to speak for itself.
Language: lead with insight. Use numbers. Extreme clarity. Short sentences. No fluff. No hesitation words. No hype. No stacked adjectives. Precise wording. Data-driven where relevant.
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

INTENT RULE (MANDATORY):
Before writing, identify the user's primary goal from the niche + business context:
- more bookings
- higher perceived value
- increased trust
- urgency / conversions
Then bias the entire output toward that goal. Every section must serve it.

PATTERN INTERRUPT RULE (MANDATORY — applies to hook):
Do NOT start with generic benefits, obvious statements, or safe marketing language.
Start with one of: a surprising statement, a contradiction, a bold claim, or a relatable frustration.
BAD: "Improve your business with better marketing"
GOOD: "Most businesses don't have a marketing problem. They have a clarity problem."

SPECIFICITY RULE (MANDATORY):
The output must include at least ONE concrete number, measurable outcome, or real scenario.
BAD: "Grow your customer base"
GOOD: "Get 5 extra bookings this week — without lowering your prices"

EMOTIONAL TRIGGER RULE (MANDATORY):
Include at least one of: frustration, fear of loss, status desire, relief, confidence.
BAD: "Our service improves results"
GOOD: "Finally feel confident sending clients your pricing"

TONE RULE (MANDATORY):
Write like one human to one person. Use "you". Conversational. No corporate language. No vague "we".

NATURAL IMPERFECTION RULE:
Avoid sounding overly polished or robotic. Slightly imperfect, human phrasing is allowed and preferred over over-optimized lines.

MICRO-STORY RULE (preferred where it fits):
A short real-world moment lands harder than abstract claims. E.g. "Yesterday, a client almost lowered her prices again..."

CONTRAST RULE (MANDATORY):
Include at least one contrast somewhere in the output: before vs after, what most do vs what works, or problem vs outcome.

CTA RULE (MANDATORY):
The CTA must do at least ONE of: create urgency, reduce hesitation, or feel effortless. A weak/generic CTA is a fail.

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
- must follow the PATTERN INTERRUPT RULE
- NEVER start with: "Are you", "Do you want", "Looking for", "Imagine if"

emotional_benefit (max ${LIMITS.emotional_benefit} words, max 3 sentences)
- before → after transformation (use the CONTRAST RULE here)
- concrete, not abstract

bullets (exactly 4, each max ${LIMITS.bullet} words)
- benefit-driven, not feature-driven
- start with strong action verbs
- specific outcomes with numbers or scenarios where possible

objection_handler (max ${LIMITS.objection_handler} words)
- address the strongest real objection for this exact business type
- reframe it, do not just dismiss it

cta (max ${LIMITS.cta} words, 1 sentence)
- one clear action
- must satisfy the CTA RULE above
- urgency must feel earned, not forced (unless style is aggressive)

QUALITY BAR — before returning, self-check the output:
- feels human (not robotic / corporate)
- has specificity (at least one number, outcome, or scenario)
- has emotion
- avoids every generic phrase
- opens with a strong pattern-interrupt hook
If any check fails, rewrite before returning.

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

// ============================================================
// COPYWRITER MODE — 3 versions + scoring + final improvement
// ============================================================
const COPYWRITER_SYSTEM_PROMPT = `You are a world-class direct response copywriter AND conversion analyst.

Your job is NOT to write generic content.
Your job is to create high-converting copy AND evaluate it with precision.

TONE RULES — APPLY TO ALL VERSIONS:
- Write to ONE person
- Short sentences (max 12 words in hook & CTA)
- No fluff, no clichés, no generic claims
- No passive voice
- Specific > hype
- If a sentence fits ANY business → rewrite it
- Intensity allowed, manipulation not

COPY STRUCTURE — APPLY TO ALL VERSIONS:
1. HOOK — 1 sentence, pattern interrupt
2. PAIN — 2–3 sentences in their words, visceral
3. SHIFT — 2–3 sentences, change belief BEFORE introducing product
4. OFFER — 2–3 sentences with 1 proof point + 1 differentiator
5. CTA — 1 sentence, verb-first, instant benefit

THREE VERSIONS:
- Version A — RATIONAL URGENCY (logical cost of inaction; clear, confident)
- Version B — AGGRESSIVE CONTRAST (before vs after gap; bold, sharp)
- Version C — EMOTIONAL MIRROR (deep desire + fear; empathetic but intense)

SCORING:
Score each version 1–10 on emotional, clarity, conversion. Pick a winner.

FINAL IMPROVEMENT — WINNER ONLY:
Tighten 15–20%, sharpen hook, intensify shift, strengthen CTA.

OUTPUT FORMAT — return ONLY valid JSON, no markdown, no fences:
{
  "version_a": { "hook": "", "pain": "", "shift": "", "offer": "", "cta": "" },
  "version_b": { "hook": "", "pain": "", "shift": "", "offer": "", "cta": "" },
  "version_c": { "hook": "", "pain": "", "shift": "", "offer": "", "cta": "" },
  "scores": {
    "a": { "emotional": 0, "clarity": 0, "conversion": 0, "works": "", "limits": "" },
    "b": { "emotional": 0, "clarity": 0, "conversion": 0, "works": "", "limits": "" },
    "c": { "emotional": 0, "clarity": 0, "conversion": 0, "works": "", "limits": "" }
  },
  "winner": "a",
  "winner_reason": "",
  "final": { "hook": "", "pain": "", "shift": "", "offer": "", "cta": "", "improved_from": "a" }
}

You are not writing to sound good. You are writing to stop attention and trigger action.`;

function validateCopywriter(content: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!content || typeof content !== "object") return { valid: false, errors: ["not an object"] };
  for (const key of ["version_a", "version_b", "version_c", "final"]) {
    const v = content[key];
    if (!v || typeof v !== "object") { errors.push(`Missing ${key}`); continue; }
    for (const f of ["hook", "pain", "shift", "offer", "cta"]) {
      if (!v[f] || typeof v[f] !== "string") errors.push(`${key}.${f} missing`);
    }
  }
  if (!content.scores || !content.winner || !content.final) errors.push("missing scores/winner/final");
  return { valid: errors.length === 0, errors };
}

// ============================================================
// ADS ENGINE V3 — scroll-stopping ads, scored, with final
// ============================================================
const ADS_SYSTEM_PROMPT = `You write ads that stop the scroll and get clicks. You are sharp, specific, and ruthless about cutting fluff.

ROLE:
Write ads that stop the scroll and get clicks.

RULES:
- One person only
- Hook max 8 words
- No generic phrases
- No filler words
- Each version MUST include ONE specific detail (number, timeframe, or real scenario)

HOOK MUST:
- Trigger curiosity OR discomfort in 3 seconds
- Feel personal, not broad
- If it could fit everyone → it fails

PROOF RULE (MANDATORY):
Each version must include at least one of: number, timeframe, or real scenario.

THREE VARIATIONS:
- A — Curiosity gap
- B — Bold contrast
- C — Pain mirror

STRUCTURE PER VERSION:
- hook (1 line, max 8 words)
- pain (1–2 lines)
- shift (1–2 lines)
- offer (1–2 lines)
- cta (1 line: action + result)

SELF-CHECK BEFORE RETURNING:
- Would this stop a scroll?
- Could this be generic? → rewrite

SCORING:
For each version score 1–10 on:
- stop (would it stop the scroll)
- click (would it get the click)

WINNER: pick A, B, or C.

FINAL — rewrite the winner:
- shorter (−20%)
- stronger hook
- clearer CTA

OUTPUT FORMAT — return ONLY valid JSON, no markdown, no fences:
{
  "version_a": { "hook": "", "pain": "", "shift": "", "offer": "", "cta": "" },
  "version_b": { "hook": "", "pain": "", "shift": "", "offer": "", "cta": "" },
  "version_c": { "hook": "", "pain": "", "shift": "", "offer": "", "cta": "" },
  "scores": {
    "a": { "stop": 0, "click": 0 },
    "b": { "stop": 0, "click": 0 },
    "c": { "stop": 0, "click": 0 }
  },
  "winner": "a",
  "final": { "hook": "", "pain": "", "shift": "", "offer": "", "cta": "", "improved_from": "a" }
}`;

function validateAds(content: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!content || typeof content !== "object") return { valid: false, errors: ["not an object"] };
  for (const key of ["version_a", "version_b", "version_c", "final"]) {
    const v = content[key];
    if (!v || typeof v !== "object") { errors.push(`Missing ${key}`); continue; }
    for (const f of ["hook", "pain", "shift", "offer", "cta"]) {
      if (!v[f] || typeof v[f] !== "string") errors.push(`${key}.${f} missing`);
    }
    if (v?.hook && wordCount(v.hook) > 8) errors.push(`${key}.hook exceeds 8 words`);
  }
  if (!content.scores || !content.winner || !content.final) errors.push("missing scores/winner/final");
  return { valid: errors.length === 0, errors };
}

// ============================================================
// NICHE ENGINE V5 — deep-conversion copy for ONE exact person
// ============================================================
const NICHE_SYSTEM_PROMPT = `You write copy that feels written for ONE exact person in a specific niche. Your job is precision, not breadth.

ROLE:
Write copy that feels written for ONE exact person.

RULES:
- If a line could fit another niche → rewrite it
- Use real situations, not abstract language
- Include ONE uncomfortable truth per version

REALITY ANCHOR (MANDATORY):
At least one line per version must describe a real moment from their week — something visual and specific (e.g. "after your last client of the day", "the third unanswered DM this week").

NICHE SIGNALS — use at least one per version:
- a real moment ("after your last client", "before your Monday meeting")
- a specific number or situation
- the natural language of that niche

STRUCTURE PER VERSION:
- hook (1 line — a specific moment)
- pain (2–3 lines — emotional + real)
- shift (2 lines — new belief)
- offer (2 lines — proof + difference)
- cta (1 line — action + outcome)
- truth (1 line — the uncomfortable truth, placed per version rules below)

TWO VERSIONS:
- Version A — Cost of staying stuck → the uncomfortable truth lands at the END of PAIN. Append it as the "truth" field, but it should feel like the closing line of the pain section.
- Version B — Identity contrast → the uncomfortable truth lands at the START of SHIFT. Append it as the "truth" field, but it should feel like the opening line of the shift section.

SELF-CHECK BEFORE RETURNING:
- Could this be generic? → rewrite
- Can you picture it? → if not, rewrite

SCORING:
Score each version 1–10 on:
- niche (does it feel built for THIS niche only)
- clarity (is it instantly understood)
- conversion (would it move a reader to act)

WINNER: pick A or B.

FINAL — rewrite the winner:
- shorter
- more specific
- sharper truth
- stronger CTA

OUTPUT FORMAT — return ONLY valid JSON, no markdown, no fences:
{
  "version_a": { "hook": "", "pain": "", "shift": "", "offer": "", "cta": "", "truth": "" },
  "version_b": { "hook": "", "pain": "", "shift": "", "offer": "", "cta": "", "truth": "" },
  "scores": {
    "a": { "niche": 0, "clarity": 0, "conversion": 0 },
    "b": { "niche": 0, "clarity": 0, "conversion": 0 }
  },
  "winner": "a",
  "final": { "hook": "", "pain": "", "shift": "", "offer": "", "cta": "", "truth": "", "improved_from": "a" }
}`;

function validateNiche(content: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!content || typeof content !== "object") return { valid: false, errors: ["not an object"] };
  for (const key of ["version_a", "version_b", "final"]) {
    const v = content[key];
    if (!v || typeof v !== "object") { errors.push(`Missing ${key}`); continue; }
    for (const f of ["hook", "pain", "shift", "offer", "cta", "truth"]) {
      if (!v[f] || typeof v[f] !== "string") errors.push(`${key}.${f} missing`);
    }
  }
  if (!content.scores || !content.winner || !content.final) errors.push("missing scores/winner/final");
  return { valid: errors.length === 0, errors };
}

// ============================================================
// AUTO INPUT ENGINE V3.1 — turn a raw idea into structured fields
// ============================================================
const AUTO_INPUT_SYSTEM_PROMPT = `You are an elite direct-response strategist.
You take ONE raw idea (a niche, business, or rough concept) and produce the structured inputs needed to write a high-converting ad.

MODE: FAST.

RULES:
- No generic output. Every field must feel real and specific.
- One rewrite max per field — if it sounds like it could fit any business, sharpen it once.
- PAIN: 1 strong sentence = a specific moment + a clear consequence.
- DESIRE: outcome only. No process. No fluff.
- OFFER: the product/service + ONE realistic proof point (a number, timeframe, or concrete result).
- PLATFORM: pick the single best fit (Instagram, TikTok, Facebook, LinkedIn, Landing Page, Email, YouTube). One choice only.
- NICHE + AUDIENCE: be specific about WHO (role/identity/situation), not just the industry.

OUTPUT FORMAT — return ONLY valid JSON, no markdown, no fences:
{
  "niche_audience": "",
  "pain": "",
  "desire": "",
  "offer": "",
  "platform": ""
}`;

function validateAutoInput(content: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!content || typeof content !== "object") return { valid: false, errors: ["not an object"] };
  for (const f of ["niche_audience", "pain", "desire", "offer", "platform"]) {
    if (!content[f] || typeof content[f] !== "string") errors.push(`${f} missing`);
  }
  return { valid: errors.length === 0, errors };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { niche, preset = "high-converting", businessContext, assistInstruction, action, rawInput, targetEngine } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ---------------- AUTO INPUT ACTION ----------------
    if (action === "auto_input") {
      if (!rawInput || typeof rawInput !== "string" || rawInput.trim().length < 3) {
        return new Response(JSON.stringify({ error: "rawInput is required (min 3 chars)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const engine = targetEngine || "ads";
      const autoUserPrompt = `RAW INPUT:
${rawInput.trim()}

TARGET ENGINE: ${engine === "ads" ? "Ads Engine" : engine === "niche" ? "Niche Engine" : engine === "copywriter" ? "Copywriter Pro" : "High-Converting"}

Generate the structured inputs. Follow the exact JSON schema. Return ONLY valid JSON.`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: AUTO_INPUT_SYSTEM_PROMPT },
            { role: "user", content: autoUserPrompt },
          ],
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "AI generation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const aiData = await aiResp.json();
      const raw = aiData.choices?.[0]?.message?.content || "";
      let jsonStr = raw;
      const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (m) jsonStr = m[1];
      jsonStr = jsonStr.trim();

      let parsed: any;
      try { parsed = JSON.parse(jsonStr); }
      catch {
        return new Response(JSON.stringify({ error: "Failed to parse AI response" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const v = validateAutoInput(parsed);
      return new Response(JSON.stringify({
        content: parsed,
        validation: v,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // ---------------- END AUTO INPUT ACTION ----------------

    const isCopywriter = preset === "copywriter";
    const isAds = preset === "ads";
    const isNiche = preset === "niche";
    const styleInstruction = STYLE_PRESETS[preset] || STYLE_PRESETS["high-converting"];

    const userPrompt = isNiche ? `Write 2 deep-conversion copy versions for this exact niche, score them, pick a winner, and rewrite the winner as the final.

NICHE + AUDIENCE: ${niche}${businessContext?.target_audience ? ` — ${businessContext.target_audience}` : ''}
PAIN: derive from the niche — make it real and visual
DESIRE: derive from the niche — make it concrete
OFFER: ${businessContext?.offer || niche}

Every version MUST feel built for this niche only. Include at least one real moment from their week. Include ONE uncomfortable truth (placed per the version rules in the system prompt).

Follow the exact JSON schema. Return ONLY valid JSON. No markdown, no fences.${assistInstruction ? `\n\n${assistInstruction}` : ''}` : isAds ? `Write 3 scroll-stopping ads for this business, score each, pick a winner, and rewrite the winner as the final.

AUDIENCE: ${businessContext?.target_audience || "Local customers"}
PAIN: derive from the niche/offer below — make it visceral and specific
DESIRE: derive from the niche/offer below — make it concrete
OFFER: ${businessContext?.offer || niche}
PLATFORM: ${businessContext?.business_type || "social ads"}
NICHE: ${niche}

Each version MUST include ONE concrete number, timeframe, or real scenario. Hook max 8 words. If a line could fit any business, rewrite it.

Follow the exact JSON schema. Return ONLY valid JSON. No markdown, no fences.${assistInstruction ? `\n\n${assistInstruction}` : ''}` : isCopywriter ? `Generate three high-converting copy versions for this business, score them, and produce a final improved version.

AUDIENCE / NICHE: ${niche}
${businessContext ? `- Business type: ${businessContext.business_type || "Service business"}
- Target audience: ${businessContext.target_audience || "Local customers"}
- Offer / strongest proof: ${businessContext.offer || niche}` : ""}

Write specifically for THIS audience. Generic phrasing = automatic fail.

Follow the exact JSON schema. Return ONLY valid JSON. No markdown, no fences.${assistInstruction ? `\n\n${assistInstruction}` : ''}` : `Write client-getting content for this business.

Niche: ${niche}

${businessContext ? `Business context:
- Business type: ${businessContext.business_type || "Service business"}
- Target audience: ${businessContext.target_audience || "Local customers"}
- Offer: ${businessContext.offer || niche}

Write specifically for THIS business and audience. Generic phrasing = automatic fail. If a sentence could apply to any business, rewrite it until it could only apply to this one.

` : ""}${styleInstruction}

Match the style EXACTLY. The output must feel unmistakably like the requested style — a luxury result must not sound like an aggressive result, and vice versa.

Return ONLY valid JSON. No markdown, no code blocks, no explanation.${assistInstruction ? `\n\n${assistInstruction}` : ''}`;

    const activeSystemPrompt = isNiche ? NICHE_SYSTEM_PROMPT : isAds ? ADS_SYSTEM_PROMPT : isCopywriter ? COPYWRITER_SYSTEM_PROMPT : SYSTEM_PROMPT;

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
            { role: "system", content: activeSystemPrompt },
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
      if (isCopywriter || isAds || isNiche) {
        const validator = isNiche ? validateNiche : isAds ? validateAds : validateCopywriter;
        validation = validator(result.content);
        let attempts = 0;
        while (!validation.valid && attempts < 1) {
          attempts++;
          const retry = await generateContent(`${userPrompt}\n\nCRITICAL: previous output had: ${validation.errors.join("; ")}. Return ONLY valid JSON matching the exact schema.`);
          if ("error" in retry) break;
          result = retry;
          validation = validator(result.content);
        }
        if (!validation.valid) qualityWarning = true;
      } else {
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
