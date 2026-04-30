import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import AIAssistBlock from '@/components/AIAssistBlock';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Copy, Check, Loader2, RefreshCw, Lock, Save, ArrowLeft, Wand2 } from 'lucide-react';
import ActionLayer from '@/components/moneypath/ActionLayer';
import ConversionLayer from '@/components/moneypath/ConversionLayer';
import ResultTracker from '@/components/moneypath/ResultTracker';
import FeedbackBanner from '@/components/moneypath/FeedbackBanner';
import ScaleBanner from '@/components/moneypath/ScaleBanner';
import StreakBanner from '@/components/moneypath/StreakBanner';
import DailyTracker from '@/components/moneypath/DailyTracker';
import MoneyDashboard from '@/components/moneypath/MoneyDashboard';
import ResultLogger from '@/components/moneypath/ResultLogger';
import YesterdaySummary from '@/components/moneypath/YesterdaySummary';
import BatchSession from '@/components/moneypath/BatchSession';
import SprintMode from '@/components/moneypath/SprintMode';
import MomentumScore from '@/components/moneypath/MomentumScore';
import WeeklyView from '@/components/moneypath/WeeklyView';
import WinningAngle from '@/components/moneypath/WinningAngle';
import AutopilotPanel from '@/components/moneypath/AutopilotPanel';
import DailyPlan from '@/components/moneypath/DailyPlan';
import OutboundPipeline from '@/components/moneypath/OutboundPipeline';
import LeadFinder, { type LeadSelection } from '@/components/moneypath/LeadFinder';
import { useAddiction } from '@/hooks/useAddiction';
import {
  computeInsights,
  genAdId,
  readResults,
  updateOutcome,
  upsertResult,
  type MoneyResult,
  type Outcome,
} from '@/lib/moneyPath';

interface GeneratedContent {
  hook: string;
  emotional_benefit: string;
  bullets: string[];
  objection_handler: string;
  cta: string;
}

interface CopyVersion {
  hook: string;
  pain: string;
  shift: string;
  offer: string;
  cta: string;
  improved_from?: string;
}

interface CopywriterOutput {
  version_a: CopyVersion;
  version_b: CopyVersion;
  version_c: CopyVersion;
  scores: Record<'a' | 'b' | 'c', { emotional: number; clarity: number; conversion: number; works: string; limits: string }>;
  winner: 'a' | 'b' | 'c';
  winner_reason: string;
  final: CopyVersion;
}

interface AdsOutput {
  version_a: CopyVersion;
  version_b: CopyVersion;
  version_c: CopyVersion;
  scores: Record<'a' | 'b' | 'c', { stop: number; click: number }>;
  winner: 'a' | 'b' | 'c';
  final: CopyVersion;
}

interface NicheVersion extends CopyVersion {
  truth: string;
}

interface NicheOutput {
  version_a: NicheVersion;
  version_b: NicheVersion;
  scores: Record<'a' | 'b', { niche: number; clarity: number; conversion: number }>;
  winner: 'a' | 'b';
  final: NicheVersion;
}

const STYLE_PRESETS = [
  { id: 'high-converting', label: 'High-Converting', desc: 'Proven direct-response style' },
  { id: 'copywriter', label: 'Copywriter Pro', desc: '3 versions, scored, with final' },
  { id: 'ads', label: 'Ads Engine', desc: 'Scroll → click ads, scored' },
  { id: 'niche', label: 'Niche Engine', desc: 'Deep-conversion for ONE person' },
  { id: 'luxury', label: 'Luxury', desc: 'Sophisticated & exclusive' },
  { id: 'aggressive', label: 'Aggressive', desc: 'Bold & urgent' },
  { id: 'tiktok', label: 'TikTok', desc: 'Casual & scroll-stopping' },
  { id: 'minimal', label: 'Minimal', desc: 'Clean & clear' },
];

const ACTION_OPTIONS = [
  'Send Instagram DM',
  'Post on Instagram',
  'Run an Ad',
  'Send Email',
] as const;
type ActionType = typeof ACTION_OPTIONS[number];

const DEMO_NICHE = 'Personal trainer helping busy professionals get fit';

export default function Generator() {
  const { user, profile, subscription } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const nicheRef = useRef<HTMLTextAreaElement>(null);
  const [niche, setNiche] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [offer, setOffer] = useState('');
  const [preset, setPreset] = useState('high-converting');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [copywriterOutput, setCopywriterOutput] = useState<CopywriterOutput | null>(null);
  const [adsOutput, setAdsOutput] = useState<AdsOutput | null>(null);
  const [nicheOutput, setNicheOutput] = useState<NicheOutput | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [assistLoading, setAssistLoading] = useState(false);
  const [assistLoadingText, setAssistLoadingText] = useState('');
  const [variations, setVariations] = useState<GeneratedContent[] | null>(null);
  const [previousOutput, setPreviousOutput] = useState<GeneratedContent | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const [rawIdea, setRawIdea] = useState('');
  const [actionType, setActionType] = useState<ActionType>('Send Instagram DM');
  const [autoFilling, setAutoFilling] = useState(false);

  // Lead Finder integration
  const [lead, setLead] = useState<LeadSelection | null>(null);
  const [showLeadFinder, setShowLeadFinder] = useState(false);
  const pendingDemoRef = useRef(false);

  // ── Money Path state ────────────────────────────────────────────────
  // Tracks the current ads-winner result row (per generation) and all stored results.
  const [results, setResults] = useState<MoneyResult[]>(() => readResults());
  const [currentAdId, setCurrentAdId] = useState<string | null>(null);
  const insights = useMemo(() => computeInsights(results), [results]);

  // ── Addiction System V4.1 + V6 ──────────────────────────────────────
  const { send: recordAddictionSend, state: addictionState, saveWinningInput, pipelineSent } = useAddiction();
  // V7 — bumping this triggers BatchSession to start a new batch externally
  const [batchTrigger, setBatchTrigger] = useState(0);

  // Reset the per-generation tracking row whenever a new ads output arrives.
  useEffect(() => {
    if (adsOutput) {
      setCurrentAdId(genAdId());
    } else {
      setCurrentAdId(null);
    }
  }, [adsOutput]);

  const currentResult = currentAdId ? results.find((r) => r.ad_id === currentAdId) ?? null : null;

  const handleMarkPosted = () => {
    if (!adsOutput || !currentAdId) return;
    const winnerKey = (adsOutput.winner?.toUpperCase?.() || 'A') as 'A' | 'B' | 'C';
    const row: MoneyResult = currentResult ?? {
      ad_id: currentAdId,
      hook_type: winnerKey,
      niche: niche || '',
      platform: targetAudience || '',
      posted: false,
      outcome: null,
      created_at: Date.now(),
    };
    const updated: MoneyResult = { ...row, posted: true };
    setResults(upsertResult(updated));
    // V4.1 — count this as a "send" for streak/target/today counters.
    // Only fires once per generation row because ActionLayer's "I've sent it"
    // is locked after click and the row's `posted` flips to true.
    recordAddictionSend(actionType);
    // V8 — log to outbound pipeline so it shows up in counts + CRM
    const wKey = (adsOutput.winner || 'a') as 'a' | 'b' | 'c';
    const wv = adsOutput[`version_${wKey}` as 'version_a'];
    const preview = wv ? `${wv.hook} — ${wv.cta}` : '';
    pipelineSent({ messagePreview: preview, actionType, niche });
  };

  const handleSelectOutcome = (outcome: Exclude<Outcome, null>) => {
    if (!currentAdId) return;
    setResults(updateOutcome(currentAdId, outcome));
  };

  const handleScaleVariations = async () => {
    if (!adsOutput) return;
    const winnerKey = (adsOutput.winner || 'a') as 'a' | 'b' | 'c';
    const winnerVersion = adsOutput[`version_${winnerKey}` as 'version_a'];
    // Reuse runAssistAction-equivalent path via direct invoke — keeps inputs locked.
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          niche: niche || DEMO_NICHE,
          preset: 'ads',
          businessContext: {
            business_type: profile?.business_type || 'Service business',
            target_audience: targetAudience || 'Local customers',
            offer: offer || niche || DEMO_NICHE,
          },
          assistInstruction: `Winning ad (Hook ${winnerKey.toUpperCase()}):\n${JSON.stringify(winnerVersion, null, 2)}\n\nCreate 3 variations of this ad. Keep the hook structure and tone identical. Vary the opening line and the CTA only.`,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAdsOutput(data.content as AdsOutput);
      outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast({ title: '3 variations generated', description: 'Same winning hook, fresh openings + CTAs.' });
    } catch (err: any) {
      toast({ title: 'Variation failed', description: err.message || 'Try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  // ────────────────────────────────────────────────────────────────────

  // ── V6: Winning Angle capture (System 4) ─────────────────────────────
  // When clientsToday transitions 0 → ≥1 with a real niche on screen,
  // persist that niche/actionType combo as the winning input.
  const prevClientsRef = useRef(addictionState.clientsToday);
  useEffect(() => {
    const prev = prevClientsRef.current;
    if (prev === 0 && addictionState.clientsToday >= 1 && niche.trim()) {
      saveWinningInput(niche, actionType);
    }
    prevClientsRef.current = addictionState.clientsToday;
  }, [addictionState.clientsToday, niche, actionType, saveWinningInput]);

  // ── V6: Batch Generation (System 1) ─────────────────────────────────
  // Generates `count` ads sequentially, returning the winner text from each.
  // Fails gracefully — partial batches still surface to the user.
  const handleGenerateBatch = async (count: number): Promise<string[]> => {
    const nicheValue = niche.trim() || DEMO_NICHE;
    const out: string[] = [];
    for (let i = 0; i < count; i += 1) {
      try {
        const { data, error } = await supabase.functions.invoke('generate-content', {
          body: {
            niche: nicheValue,
            preset: 'ads',
            businessContext: {
              business_type: profile?.business_type || 'Service business',
              target_audience: targetAudience || 'Local customers',
              offer: offer || nicheValue,
            },
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const ads = data.content as AdsOutput;
        const winnerKey = (ads.winner || 'a') as 'a' | 'b' | 'c';
        const w = ads[`version_${winnerKey}` as 'version_a'] || ads.final;
        if (w) {
          const text = `${w.hook}\n\n${w.pain}\n\n${w.shift}\n\n${w.offer}\n\n${w.cta}`;
          out.push(text);
        }
      } catch (err) {
        console.error('[batch] message', i + 1, 'failed:', err);
        // continue — user still gets the rest
      }
    }
    return out;
  };

  // ── V6: Winning Angle reuse (System 4) ──────────────────────────────
  const handleReuseWinning = (savedNiche: string, savedAction: string) => {
    setNiche(savedNiche);
    if (savedAction) setActionType(savedAction as ActionType);
    setPreset('ads');
    setTimeout(() => handleGenerate(false), 50);
  };

  const handleAutoFill = async () => {
    if (!rawIdea.trim()) {
      toast({ title: 'Type a quick idea or niche first', variant: 'destructive' });
      return;
    }
    setAutoFilling(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          action: 'auto_input',
          rawInput: rawIdea.trim(),
          targetEngine: preset === 'ads' || preset === 'niche' || preset === 'copywriter' ? preset : 'ads',
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const c = data.content || {};
      if (c.niche_audience) setNiche(c.niche_audience);
      if (c.offer) setOffer(c.offer);

      toast({
        title: 'Inputs ready',
        description: c.platform ? `Suggested platform: ${c.platform}` : 'Fields auto-filled — review and generate.',
      });
    } catch (err: any) {
      toast({ title: 'Auto-fill failed', description: err.message || 'Try again.', variant: 'destructive' });
    } finally {
      setAutoFilling(false);
    }
  };
  // Access gate — paid plan from profiles OR live Stripe subscription unlocks everything.
  const hasPaidPlan =
    profile?.plan === 'starter' ||
    profile?.plan === 'pro' ||
    profile?.plan === 'business';
  const isPaidUser = hasPaidPlan || subscription?.subscribed === true;
  const isFreePlan = !isPaidUser;
  console.log('[access] plan:', profile?.plan, 'subscribed:', subscription?.subscribed, 'isPaidUser:', isPaidUser);

  const handleGenerate = async (demoMode = false) => {
    if (!user) return;
    const nicheValue = demoMode ? DEMO_NICHE : niche.trim();
    if (!nicheValue) {
      toast({ title: 'Enter your niche or business description', variant: 'destructive' });
      return;
    }

    // Lead Finder gate — show selector before first generation per cycle
    if (!lead) {
      pendingDemoRef.current = demoMode;
      setShowLeadFinder(true);
      // smooth scroll to top of output column
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      return;
    }

    setLoading(true);
    setContent(null);
    setCopywriterOutput(null);
    setAdsOutput(null);
    setNicheOutput(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          niche: nicheValue,
          preset,
          businessContext: {
            business_type: profile?.business_type || 'Service business',
            target_audience: targetAudience || 'Local customers',
            offer: offer || nicheValue,
            recipient_name: lead.recipient_name,
            recipient_contact: lead.recipient_contact,
            profile_note: lead.profile_note,
            template_mode: lead.template_mode,
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const generated = data.content;
      if (preset === 'copywriter') {
        setCopywriterOutput(generated as CopywriterOutput);
      } else if (preset === 'ads') {
        setAdsOutput(generated as AdsOutput);
      } else if (preset === 'niche') {
        setNicheOutput(generated as NicheOutput);
      } else {
        setContent(generated as GeneratedContent);
      }

      await supabase.from('generated_content').insert({
        user_id: user.id,
        content: generated as any,
        niche: nicheValue,
        preset,
      });

      await supabase.from('activity_log').insert({
        user_id: user.id,
        action: 'Content Generated',
        description: `Generated ${preset} content for "${nicheValue}"`,
      });

      toast({ title: 'Content generated successfully!' });

      if (!data.validation?.valid) {
        toast({
          title: 'Note',
          description: 'Some validation checks didn\'t pass. Review the output carefully.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const runAssistAction = async (actionInstruction: string, newPreset?: string) => {
    if (!user || !content) return;
    const activePreset = newPreset || preset;
    if (newPreset) setPreset(newPreset);

    let loadingMsg = 'Processing...';
    if (actionInstruction.includes('Rewrite this content with different wording')) loadingMsg = 'Rewriting your content...';
    else if (actionInstruction.includes('more persuasive')) loadingMsg = 'Making your content stronger...';
    else if (actionInstruction.includes('selected style')) loadingMsg = 'Applying new style...';
    else if (actionInstruction.includes('variations')) loadingMsg = 'Creating more variations...';

    setAssistLoading(true);
    setAssistLoadingText(loadingMsg);

    try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          niche: niche || DEMO_NICHE,
          preset: activePreset,
          businessContext: {
            business_type: profile?.business_type || 'Service business',
            target_audience: targetAudience || 'Local customers',
            offer: offer || niche || DEMO_NICHE,
          },
          assistInstruction: `Current content:\n${JSON.stringify(content, null, 2)}\n\n${actionInstruction}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (actionInstruction.includes('variations') && data.content?.variations) {
        setPreviousOutput(content);
        setVariations(data.content.variations);
      } else {
        setVariations(null);
        setContent(data.content as GeneratedContent);
      }

      outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err: any) {
      toast({ title: 'AI Assist failed', description: err.message || 'Something went wrong. Try again.', variant: 'destructive' });
    } finally {
      setAssistLoading(false);
      setAssistLoadingText('');
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: 'Copied to clipboard' });
  };

  const copyAll = async () => {
    if (!content) return;
    const full = `${content.hook}\n\n${content.emotional_benefit}\n\n${content.bullets.map(b => `• ${b}`).join('\n')}\n\n${content.objection_handler}\n\n${content.cta}`;
    await copyToClipboard(full, 'all');
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <button
      onClick={() => copyToClipboard(text, field)}
      className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all duration-150"
    >
      {copiedField === field ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );

  const ContentBlock = ({ label, children, copyText, copyField, className = '' }: {
    label: string; children: React.ReactNode; copyText: string; copyField: string; className?: string;
  }) => (
    <div className={`glass-card p-5 relative ${className}`}>
      <CopyButton text={copyText} field={copyField} />
      <p className="label-uppercase mb-2 text-primary text-[10px] font-semibold">{label}</p>
      {children}
    </div>
  );

  return (
    <AppLayout>
      <div className="px-4 md:px-6 py-6 md:py-8 fade-in">
        {/* V4.1 — Streak banner: always visible, top of screen */}
        <div className="mb-3">
          <StreakBanner />
        </div>

        {/* V5.1 — Yesterday summary (dismissable, daily) */}
        <div className="mb-5">
          <YesterdaySummary />
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl md:text-3xl text-foreground">Content Generator</h1>
            <p className="text-sm text-muted-foreground mt-1">Generate high-converting content for your business.</p>
          </div>
          {!content && (
            <Button variant="outline" size="sm" className="mt-2 md:mt-0 gap-2 border-white/10 opacity-80 hover:opacity-100 transition-opacity duration-150" onClick={() => handleGenerate(true)}>
              <Sparkles className="w-3.5 h-3.5" /> Try Demo
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input column */}
          <div className="space-y-6">
            {/* Auto Input Engine — quick start from a raw idea */}
            <div className="glass-card p-5 space-y-3 border border-primary/20 bg-primary/[0.04]">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-primary" />
                <p className="label-uppercase text-primary text-[10px] font-semibold">Quick Start — Auto Input</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Drop a niche or rough idea. We'll auto-fill audience, offer, and pain points so you can generate faster.
              </p>
              <Textarea
                placeholder="e.g. coach for solo female founders who burn out before $10k/mo"
                value={rawIdea}
                onChange={(e) => setRawIdea(e.target.value)}
                rows={2}
                className="transition-colors duration-150 focus:ring-2 focus:ring-primary/30"
              />
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
                onClick={handleAutoFill}
                disabled={autoFilling}
              >
                {autoFilling ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Auto-filling...</>
                ) : (
                  <><Wand2 className="w-3.5 h-3.5" /> Auto-fill inputs</>
                )}
              </Button>
            </div>

            <div className="glass-card p-6 space-y-5">
              <div>
                <Label className="label-uppercase text-foreground">Describe what you sell in 1 sentence *</Label>
                <Textarea
                  ref={nicheRef}
                  placeholder="Example: I help gym owners get more members"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="mt-2 transition-colors duration-150 focus:ring-2 focus:ring-primary/30"
                  rows={2}
                />
                <p className="text-[11px] text-muted-foreground mt-1.5 italic">This does not need to be perfect.</p>
              </div>

              {/* Action selector — replaces Niche/Audience/Offer cognitive load */}
              <div>
                <Label className="label-uppercase text-foreground">What do you want to do?</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {ACTION_OPTIONS.map((opt) => {
                    const isActive = actionType === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setActionType(opt)}
                        className={`p-3 rounded-xl border text-left text-sm transition-all duration-150 ${
                          isActive
                            ? 'border-primary/40 bg-primary/10 text-foreground shadow-sm font-medium'
                            : 'border-white/10 bg-white/[0.04] text-muted-foreground hover:bg-white/[0.07] hover:text-foreground'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* targetAudience + offer state preserved internally — no UI needed */}
            </div>

            <div className="glass-card p-6">
              <Label className="label-uppercase text-foreground mb-3 block">Style Preset</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {STYLE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPreset(p.id)}
                    className={`p-3 rounded-xl border text-left transition-all duration-150 ${
                      preset === p.id
                        ? 'border-primary/40 bg-primary/10 text-foreground shadow-sm'
                        : 'border-white/10 bg-white/[0.04] text-muted-foreground hover:bg-white/[0.07] hover:text-foreground'
                    }`}
                  >
                    <p className="text-sm font-medium">{p.label}</p>
                    <p className="text-[11px] mt-0.5 opacity-60">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* PRIMARY CTA — Generate */}
            <Button
              size="lg"
              className="w-full gap-2 cta-primary min-h-[48px] text-base"
              onClick={() => handleGenerate(false)}
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate Client-Getting Content</>
              )}
            </Button>
          </div>

          {/* Output column */}
          <div ref={outputRef} className="space-y-6">
            {/* V4.1 — Daily output, target, social proof, loss aversion, end-of-day */}
            <DailyTracker onJumpToCompose={() => nicheRef.current?.focus()} />
            {/* V5.1 — Money dashboard: revenue, clients, leads, replies, scale signal */}
            <MoneyDashboard onScale={handleScaleVariations} />
            {/* V5.1 — Quick result logging */}
            <ResultLogger niche={niche} actionType={actionType} />
            {/* Money Path: feedback banner — only when ≥3 results + ≥1 positive outcome */}
            <FeedbackBanner insight={insights} />

            {/* V7 — Autopilot + Daily Plan */}
            <DailyPlan onStart={() => setBatchTrigger((k) => k + 1)} />
            <AutopilotPanel
              onGenerateOne={() => handleGenerate(false)}
              onContinueBatch={() => setBatchTrigger((k) => k + 1)}
              loading={loading}
            />

            {/* V6 — Scaling engine */}
            <BatchSession
              onGenerateBatch={handleGenerateBatch}
              size={5}
              triggerKey={batchTrigger}
              onAfterSend={(text) =>
                pipelineSent({
                  messagePreview: text.split('\n').filter(Boolean).slice(0, 2).join(' — '),
                  actionType,
                  niche,
                })
              }
            />
            {/* V8 — Outbound pipeline (V8.3 — Fix 5: gated until 3 sends today) */}
            {addictionState.messagesSentToday >= 3 ? (
              <OutboundPipeline
                onGenerateFollowUp={() => {
                  setPreset('ads');
                  handleGenerate(false);
                  toast({ title: 'Follow-up generated', description: 'Use it to re-engage.' });
                }}
                onGenerateReply={() => {
                  setPreset('ads');
                  handleGenerate(false);
                  toast({ title: 'Reply generated', description: 'Keep the conversation moving.' });
                }}
                onGenerateClosing={() => {
                  setPreset('ads');
                  handleGenerate(false);
                  toast({ title: 'Closing message generated', description: 'Push your leads.' });
                }}
                onRepeatFlow={() => setBatchTrigger((k) => k + 1)}
              />
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <p className="text-[12px] text-muted-foreground">
                  Send <span className="text-foreground font-semibold">{3 - addictionState.messagesSentToday}</span> more {3 - addictionState.messagesSentToday === 1 ? 'message' : 'messages'} to unlock your pipeline.
                </p>
              </div>
            )}
            <MomentumScore />
            <SprintMode />
            <WinningAngle onReuse={handleReuseWinning} />
            <WeeklyView />

            {showLeadFinder && (
              <div className="glass-card-raised p-5 fade-in">
                <LeadFinder
                  businessType={profile?.business_type || ''}
                  targetAudience={targetAudience || niche}
                  onConfirm={(sel) => {
                    setLead(sel);
                    setShowLeadFinder(false);
                    if (sel.recipient_name) {
                      toast({
                        title: `Great. We'll write a message specifically for ${sel.recipient_name}.`,
                      });
                    }
                    // continue the deferred generation
                    const wasDemo = pendingDemoRef.current;
                    pendingDemoRef.current = false;
                    setTimeout(() => handleGenerate(wasDemo), 50);
                  }}
                />
              </div>
            )}

            {lead && !showLeadFinder && (
              <div className="rounded-lg border border-primary/20 bg-primary/[0.05] px-4 py-2.5 flex items-center justify-between gap-3">
                <p className="text-xs text-foreground truncate">
                  <span className="text-muted-foreground">Sending to:</span>{' '}
                  <span className="font-semibold text-primary">
                    {lead.template_mode ? 'Template (no recipient yet)' : lead.recipient_name}
                  </span>
                  {!lead.template_mode && lead.recipient_contact && (
                    <span className="text-muted-foreground"> · {lead.recipient_contact}</span>
                  )}
                </p>
                <button
                  onClick={() => {
                    setLead(null);
                    setShowLeadFinder(true);
                  }}
                  className="text-[11px] text-primary hover:underline shrink-0"
                >
                  Change
                </button>
              </div>
            )}

            {loading && (
              <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                <p className="text-sm text-muted-foreground">Creating your content...</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Used by businesses to attract clients</p>
              </div>
            )}


            {!content && !copywriterOutput && !adsOutput && !nicheOutput && !loading && !showLeadFinder && (
              <div className="glass-card p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
                <Sparkles className="w-10 h-10 text-primary/30 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-1">Ready to generate</h3>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                  Fill in your business details and hit generate. Your content will appear here — ready to use, no editing needed.
                </p>
              </div>
            )}

            {copywriterOutput && !loading && (
              <div className="glass-card-raised p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <p className="label-uppercase font-semibold">Copywriter Pro — 3 Versions + Final</p>
                  <Button variant="ghost" size="sm" className="gap-1.5 opacity-70 hover:opacity-100" onClick={() => handleGenerate(false)}>
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                  </Button>
                </div>

                {(['a', 'b', 'c'] as const).map((key) => {
                  const v = copywriterOutput[`version_${key}` as 'version_a'];
                  const s = copywriterOutput.scores?.[key];
                  const isWinner = copywriterOutput.winner === key;
                  const labels = { a: 'Version A — Rational Urgency', b: 'Version B — Aggressive Contrast', c: 'Version C — Emotional Mirror' };
                  const fullText = `${v.hook}\n\n${v.pain}\n\n${v.shift}\n\n${v.offer}\n\n${v.cta}`;
                  return (
                    <div key={key} className={`glass-card p-5 space-y-3 relative ${isWinner ? 'ring-1 ring-primary/40' : ''}`}>
                      <CopyButton text={fullText} field={`v_${key}`} />
                      <div className="flex items-center justify-between pr-8">
                        <p className="label-uppercase text-primary text-[10px] font-semibold">{labels[key]}</p>
                        {isWinner && <span className="text-[10px] uppercase tracking-wide text-primary font-semibold">Winner</span>}
                      </div>
                      <p className="text-foreground font-medium leading-relaxed">{v.hook}</p>
                      <p className="text-muted-foreground text-sm leading-relaxed">{v.pain}</p>
                      <p className="text-muted-foreground text-sm leading-relaxed">{v.shift}</p>
                      <p className="text-muted-foreground text-sm leading-relaxed">{v.offer}</p>
                      <p className="text-foreground font-semibold leading-relaxed">{v.cta}</p>
                      {s && (
                        <div className="pt-2 border-t border-white/5 space-y-1">
                          <p className="text-xs text-muted-foreground">
                            <span className="text-foreground font-medium">{s.emotional}/10</span> emotional · <span className="text-foreground font-medium">{s.clarity}/10</span> clarity · <span className="text-foreground font-medium">{s.conversion}/10</span> conversion
                          </p>
                          {s.works && <p className="text-xs text-muted-foreground"><span className="text-success">+</span> {s.works}</p>}
                          {s.limits && <p className="text-xs text-muted-foreground"><span className="text-destructive">−</span> {s.limits}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}

                {copywriterOutput.winner_reason && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <p className="text-xs label-uppercase text-primary mb-1">Winner: Version {copywriterOutput.winner?.toUpperCase()}</p>
                    <p className="text-sm text-foreground">{copywriterOutput.winner_reason}</p>
                  </div>
                )}

                {copywriterOutput.final && (
                  <div className="glass-card-raised p-5 space-y-3 relative border border-primary/30">
                    <CopyButton
                      text={`${copywriterOutput.final.hook}\n\n${copywriterOutput.final.pain}\n\n${copywriterOutput.final.shift}\n\n${copywriterOutput.final.offer}\n\n${copywriterOutput.final.cta}`}
                      field="final"
                    />
                    <p className="label-uppercase text-primary text-[10px] font-semibold pr-8">
                      ✦ Final Version{copywriterOutput.final.improved_from ? ` (improved from Version ${copywriterOutput.final.improved_from.toUpperCase()})` : ''}
                    </p>
                    <p className="text-foreground font-medium leading-relaxed">{copywriterOutput.final.hook}</p>
                    <p className="text-foreground/90 text-sm leading-relaxed">{copywriterOutput.final.pain}</p>
                    <p className="text-foreground/90 text-sm leading-relaxed">{copywriterOutput.final.shift}</p>
                    <p className="text-foreground/90 text-sm leading-relaxed">{copywriterOutput.final.offer}</p>
                    <p className="text-foreground font-semibold leading-relaxed">{copywriterOutput.final.cta}</p>
                  </div>
                )}
              </div>
            )}

            {adsOutput && !loading && (
              <div className="glass-card-raised p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <p className="label-uppercase font-semibold">Ads Engine — Scroll → Click</p>
                  <Button variant="ghost" size="sm" className="gap-1.5 opacity-70 hover:opacity-100" onClick={() => handleGenerate(false)}>
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                  </Button>
                </div>

                {/* Output context (Section 4) */}
                {(() => {
                  const ctxLabel =
                    /email/i.test(actionType) ? 'Email outreach' :
                    /^post/i.test(actionType) ? 'Instagram post' :
                    /ad/i.test(actionType) ? 'Paid ad' :
                    'Instagram DM outreach';
                  return (
                    <div className="rounded-lg border border-primary/20 bg-primary/[0.05] px-4 py-2.5">
                      <p className="text-xs text-foreground">
                        <span className="text-muted-foreground">This is for:</span>{' '}
                        <span className="font-semibold text-primary">{ctxLabel}</span>
                      </p>
                    </div>
                  );
                })()}

                {/* Auto-selected winner — shown prominently FIRST (Section 3) */}
                {(() => {
                  const winnerKey = (adsOutput.winner || 'a') as 'a' | 'b' | 'c';
                  const otherKeys = (['a', 'b', 'c'] as const).filter((k) => k !== winnerKey);
                  const labels = { a: 'A — Curiosity Gap', b: 'B — Bold Contrast', c: 'C — Pain Mirror' };
                  const wv = adsOutput[`version_${winnerKey}` as 'version_a'];
                  const ws = adsOutput.scores?.[winnerKey];
                  const wText = `${wv.hook}\n\n${wv.pain}\n\n${wv.shift}\n\n${wv.offer}\n\n${wv.cta}`;
                  return (
                    <>
                      <div className="rounded-xl border-2 border-primary/40 bg-primary/[0.06] p-5 space-y-3 relative">
                        <CopyButton text={wText} field={`ad_${winnerKey}`} />
                        <div className="flex items-center justify-between pr-8">
                          <p className="label-uppercase text-primary text-[11px] font-bold">🔥 Best performing version (recommended)</p>
                          <span className="text-[10px] uppercase tracking-wide text-primary font-semibold">{labels[winnerKey]}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground -mt-1">This version was selected because it is most likely to get a response.</p>
                        <p className="text-foreground font-medium leading-relaxed">{wv.hook}</p>
                        <p className="text-foreground/90 text-sm leading-relaxed">{wv.pain}</p>
                        <p className="text-foreground/90 text-sm leading-relaxed">{wv.shift}</p>
                        <p className="text-foreground/90 text-sm leading-relaxed">{wv.offer}</p>
                        <p className="text-foreground font-semibold leading-relaxed">{wv.cta}</p>
                        {ws && (
                          <div className="pt-2 border-t border-white/5">
                            <p className="text-xs text-muted-foreground">
                              <span className="text-foreground font-medium">{ws.stop}/10</span> stop · <span className="text-foreground font-medium">{ws.click}/10</span> click
                            </p>
                          </div>
                        )}
                        {/* V8.3 — Fix 1: Trust injection (always when message exists) */}
                        <p className="text-[12px] text-foreground pt-1 leading-relaxed">
                          This message is based on real outreach that gets replies.
                          Do not change it. Send it as-is.
                        </p>
                        {/* V8.3 — Fix 2: Editing suppression (muted, no bold) */}
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Editing this reduces your chances of getting a reply.
                        </p>
                      </div>

                      {/* Other versions — de-emphasized */}
                      <details className="rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden">
                        <summary className="px-4 py-2.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
                          Show other 2 versions ({otherKeys.map((k) => k.toUpperCase()).join(', ')})
                        </summary>
                        <div className="px-4 pb-4 space-y-3 opacity-60">
                          {otherKeys.map((key) => {
                            const v = adsOutput[`version_${key}` as 'version_a'];
                            const s = adsOutput.scores?.[key];
                            const fullText = `${v.hook}\n\n${v.pain}\n\n${v.shift}\n\n${v.offer}\n\n${v.cta}`;
                            return (
                              <div key={key} className="glass-card p-4 space-y-2 relative">
                                <CopyButton text={fullText} field={`ad_${key}`} />
                                <p className="label-uppercase text-muted-foreground text-[10px] font-semibold pr-8">{labels[key]}</p>
                                <p className="text-foreground/80 text-sm font-medium leading-relaxed">{v.hook}</p>
                                <p className="text-muted-foreground text-xs leading-relaxed">{v.pain}</p>
                                <p className="text-muted-foreground text-xs leading-relaxed">{v.shift}</p>
                                <p className="text-muted-foreground text-xs leading-relaxed">{v.offer}</p>
                                <p className="text-foreground/80 text-xs font-semibold leading-relaxed">{v.cta}</p>
                                {s && (
                                  <p className="text-[11px] text-muted-foreground pt-1 border-t border-white/5">
                                    {s.stop}/10 stop · {s.click}/10 click
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    </>
                  );
                })()}

                {/* ── Money Path: Action Layer (Section 5) ── */}
                {adsOutput.final && (
                  <ActionLayer
                    adText={`${adsOutput.final.hook}\n\n${adsOutput.final.pain}\n\n${adsOutput.final.shift}\n\n${adsOutput.final.offer}\n\n${adsOutput.final.cta}`}
                    ctaText={adsOutput.final.cta}
                    actionType={actionType}
                    alreadyPosted={!!currentResult?.posted}
                    onPosted={handleMarkPosted}
                    onGenerateAnother={() => handleGenerate(false)}
                  />
                )}

                {/* ── Money Path: Result Tracking (Section 3) — only after posted ── */}
                {currentResult?.posted && (
                  <ResultTracker
                    currentOutcome={currentResult.outcome}
                    onSelect={handleSelectOutcome}
                  />
                )}

                {/* ── Money Path: Scale System (Section 5) — only on leads/client ── */}
                {currentResult?.posted && (currentResult.outcome === 'leads' || currentResult.outcome === 'client') && (
                  <ScaleBanner
                    platform={actionType}
                    hookType={currentResult.hook_type}
                    outcome={currentResult.outcome}
                    onConfirm={handleScaleVariations}
                  />
                )}
              </div>
            )}

            {nicheOutput && !loading && (
              <div className="glass-card-raised p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <p className="label-uppercase font-semibold">Niche Engine — Deep Conversion</p>
                  <Button variant="ghost" size="sm" className="gap-1.5 opacity-70 hover:opacity-100" onClick={() => handleGenerate(false)}>
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                  </Button>
                </div>

                {/* Output context (Section 4) */}
                {(() => {
                  const ctxLabel =
                    /email/i.test(actionType) ? 'Email outreach' :
                    /^post/i.test(actionType) ? 'Instagram post' :
                    /ad/i.test(actionType) ? 'Paid ad' :
                    'Instagram DM outreach';
                  return (
                    <div className="rounded-lg border border-primary/20 bg-primary/[0.05] px-4 py-2.5">
                      <p className="text-xs text-foreground">
                        <span className="text-muted-foreground">This is for:</span>{' '}
                        <span className="font-semibold text-primary">{ctxLabel}</span>
                      </p>
                    </div>
                  );
                })()}

                {(['a', 'b'] as const).map((key) => {
                  const v = nicheOutput[`version_${key}` as 'version_a'];
                  const s = nicheOutput.scores?.[key];
                  const isWinner = nicheOutput.winner === key;
                  const labels = { a: 'A — Cost of Staying Stuck', b: 'B — Identity Contrast' };
                  const truthPosition = key === 'a' ? 'end-of-pain' : 'start-of-shift';
                  const fullText = `${v.hook}\n\n${v.pain}${truthPosition === 'end-of-pain' ? `\n${v.truth}` : ''}\n\n${truthPosition === 'start-of-shift' ? `${v.truth}\n` : ''}${v.shift}\n\n${v.offer}\n\n${v.cta}`;
                  return (
                    <div key={key} className={`glass-card p-5 space-y-3 relative ${isWinner ? 'ring-1 ring-primary/40' : ''}`}>
                      <CopyButton text={fullText} field={`niche_${key}`} />
                      <div className="flex items-center justify-between pr-8">
                        <p className="label-uppercase text-primary text-[10px] font-semibold">{labels[key]}</p>
                        {isWinner && <span className="text-[10px] uppercase tracking-wide text-primary font-semibold">Winner</span>}
                      </div>
                      <p className="text-foreground font-medium leading-relaxed">{v.hook}</p>
                      <p className="text-muted-foreground text-sm leading-relaxed">{v.pain}</p>
                      {truthPosition === 'end-of-pain' && v.truth && (
                        <p className="text-foreground/90 text-sm italic leading-relaxed border-l-2 border-primary/40 pl-3">{v.truth}</p>
                      )}
                      {truthPosition === 'start-of-shift' && v.truth && (
                        <p className="text-foreground/90 text-sm italic leading-relaxed border-l-2 border-primary/40 pl-3">{v.truth}</p>
                      )}
                      <p className="text-muted-foreground text-sm leading-relaxed">{v.shift}</p>
                      <p className="text-muted-foreground text-sm leading-relaxed">{v.offer}</p>
                      <p className="text-foreground font-semibold leading-relaxed">{v.cta}</p>
                      {s && (
                        <div className="pt-2 border-t border-white/5">
                          <p className="text-xs text-muted-foreground">
                            <span className="text-foreground font-medium">{s.niche}/10</span> niche · <span className="text-foreground font-medium">{s.clarity}/10</span> clarity · <span className="text-foreground font-medium">{s.conversion}/10</span> conversion
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {nicheOutput.final && (
                  <div className="glass-card-raised p-5 space-y-3 relative border border-primary/30">
                    <CopyButton
                      text={`${nicheOutput.final.hook}\n\n${nicheOutput.final.pain}\n${nicheOutput.final.truth}\n\n${nicheOutput.final.shift}\n\n${nicheOutput.final.offer}\n\n${nicheOutput.final.cta}`}
                      field="niche_final"
                    />
                    <p className="label-uppercase text-primary text-[10px] font-semibold pr-8">
                      ✦ Final Version{nicheOutput.final.improved_from ? ` (improved from ${nicheOutput.final.improved_from.toUpperCase()})` : ''}
                    </p>
                    <p className="text-foreground font-medium leading-relaxed">{nicheOutput.final.hook}</p>
                    <p className="text-foreground/90 text-sm leading-relaxed">{nicheOutput.final.pain}</p>
                    {nicheOutput.final.truth && (
                      <p className="text-foreground text-sm italic leading-relaxed border-l-2 border-primary/60 pl-3">{nicheOutput.final.truth}</p>
                    )}
                    <p className="text-foreground/90 text-sm leading-relaxed">{nicheOutput.final.shift}</p>
                    <p className="text-foreground/90 text-sm leading-relaxed">{nicheOutput.final.offer}</p>
                    <p className="text-foreground font-semibold leading-relaxed">{nicheOutput.final.cta}</p>
                  </div>
                )}

                {nicheOutput.final && (
                  <div className="-mt-2 space-y-1">
                    {/* V8.3 — Fix 1: Trust injection */}
                    <p className="text-[12px] text-foreground leading-relaxed">
                      This message is based on real outreach that gets replies.
                      Do not change it. Send it as-is.
                    </p>
                    {/* V8.3 — Fix 2: Editing suppression */}
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Editing this reduces your chances of getting a reply.
                    </p>
                  </div>
                )}

                {/* ── Money Path: Conversion Layer (Section 2) ── */}
                {nicheOutput.final && (
                  <ConversionLayer
                    hook={nicheOutput.final.hook}
                    pain={nicheOutput.final.pain}
                    shift={nicheOutput.final.shift}
                    offer={nicheOutput.final.offer}
                    cta={nicheOutput.final.cta}
                    niche={niche}
                    actionType={actionType}
                  />
                )}
              </div>
            )}

            {content && (
              <div className="glass-card-raised p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <p className="label-uppercase font-semibold">Generated Content</p>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="gap-1.5 opacity-70 hover:opacity-100 transition-opacity duration-150" onClick={copyAll}>
                      <Copy className="w-3.5 h-3.5" /> Copy All
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1.5 opacity-70 hover:opacity-100 transition-opacity duration-150" onClick={() => handleGenerate(false)}>
                      <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                    </Button>
                  </div>
                </div>

                <ContentBlock label="Hook" copyText={content.hook} copyField="hook">
                  <p className="text-foreground font-medium leading-relaxed pr-8">{content.hook}</p>
                </ContentBlock>

                <ContentBlock label="Emotional Benefit" copyText={content.emotional_benefit} copyField="benefit">
                  <p className="text-foreground leading-relaxed pr-8">{content.emotional_benefit}</p>
                </ContentBlock>

                <ContentBlock label="Key Benefits" copyText={content.bullets.map(b => `• ${b}`).join('\n')} copyField="bullets">
                  <ul className="space-y-2 pr-8">
                    {content.bullets.map((b, i) => (
                      <li key={i} className="text-foreground text-sm flex gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </ContentBlock>

                <ContentBlock label="Objection Handler" copyText={content.objection_handler} copyField="objection">
                  <p className="text-foreground leading-relaxed pr-8">{content.objection_handler}</p>
                </ContentBlock>

                <ContentBlock label="Call to Action" copyText={content.cta} copyField="cta" className="bg-primary/5">
                  <p className="text-foreground font-semibold leading-relaxed pr-8">{content.cta}</p>
                </ContentBlock>

                {/* Action buttons — secondary tier */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="gap-1.5 flex-1 border-white/10 min-h-[44px] opacity-90 hover:opacity-100 transition-all duration-150 hover:scale-[1.01] active:scale-95"
                    onClick={() => {
                      setContent(null);
                      setSaveState('idle');
                      setTimeout(() => nicheRef.current?.focus(), 100);
                    }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Generate Again
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-1.5 flex-1 border-white/10 min-h-[44px] opacity-90 hover:opacity-100 transition-all duration-150 hover:scale-[1.01] active:scale-95"
                    disabled={saveState === 'saving' || saveState === 'saved'}
                    onClick={async () => {
                      setSaveState('saving');
                      try {
                        const { error } = await supabase.from('generated_content').insert({
                          user_id: user!.id,
                          content: content as any,
                          niche: niche || 'Demo',
                          preset,
                        });
                        if (error) throw error;
                        setSaveState('saved');
                        setTimeout(() => setSaveState('idle'), 2000);
                      } catch {
                        setSaveState('error');
                        setTimeout(() => setSaveState('idle'), 3000);
                      }
                    }}
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved ✓' : saveState === 'error' ? 'Save failed — try again' : 'Save'}
                  </Button>
                  {isFreePlan ? (
                    <Button className="gap-1.5 flex-1 cta-primary min-h-[44px]" onClick={() => navigate('/pricing')}>
                      <Lock className="w-3.5 h-3.5" /> Unlock Unlimited
                    </Button>
                  ) : (
                    <Button variant="outline" className="gap-1.5 flex-1 border-white/10 min-h-[44px] opacity-70" disabled>
                      Export Content
                    </Button>
                  )}
                </div>

                {/* Variations */}
                {variations && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="label-uppercase font-semibold">Variations</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 opacity-70 hover:opacity-100 transition-opacity duration-150"
                        onClick={() => {
                          if (previousOutput) setContent(previousOutput);
                          setVariations(null);
                          setPreviousOutput(null);
                        }}
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to single view
                      </Button>
                    </div>
                    {variations.map((v, i) => (
                      <div key={i} className="glass-card p-5 space-y-2 card-interactive">
                        <p className="text-xs font-semibold text-primary">Variation {i + 1}</p>
                        <p className="text-sm font-medium text-foreground">{v.hook}</p>
                        <p className="text-sm text-muted-foreground">{v.emotional_benefit}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-1 border-white/10 opacity-80 hover:opacity-100 transition-all duration-150"
                          onClick={() => {
                            setContent(v);
                            setVariations(null);
                            setPreviousOutput(null);
                          }}
                        >
                          Use this version
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <AIAssistBlock
                  loading={assistLoading}
                  loadingText={assistLoadingText}
                  onAction={runAssistAction}
                  currentPreset={preset}
                />

                {/* Upgrade nudge — below AI Assist, secondary presence */}
                {isFreePlan && (
                  <div className="rounded-xl border border-white/10 bg-primary/5 p-6 text-center space-y-3">
                    <p className="text-foreground font-medium">Keep generating client-winning content without limits.</p>
                    <p className="text-sm text-muted-foreground">You've seen what one output can do. Don't stop now.</p>
                    <Button variant="outline" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10 transition-all duration-150" onClick={() => navigate('/pricing')}>
                      <Lock className="w-3.5 h-3.5" /> Unlock Unlimited
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
