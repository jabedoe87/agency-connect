import { useState, useRef } from 'react';
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
import { Sparkles, Copy, Check, Loader2, RefreshCw, Lock, Save, ArrowLeft } from 'lucide-react';

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

const STYLE_PRESETS = [
  { id: 'high-converting', label: 'High-Converting', desc: 'Proven direct-response style' },
  { id: 'copywriter', label: 'Copywriter Pro', desc: '3 versions, scored, with final' },
  { id: 'luxury', label: 'Luxury', desc: 'Sophisticated & exclusive' },
  { id: 'aggressive', label: 'Aggressive', desc: 'Bold & urgent' },
  { id: 'tiktok', label: 'TikTok', desc: 'Casual & scroll-stopping' },
  { id: 'minimal', label: 'Minimal', desc: 'Clean & clear' },
];

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
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [assistLoading, setAssistLoading] = useState(false);
  const [assistLoadingText, setAssistLoadingText] = useState('');
  const [variations, setVariations] = useState<GeneratedContent[] | null>(null);
  const [previousOutput, setPreviousOutput] = useState<GeneratedContent | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
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

    setLoading(true);
    setContent(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          niche: nicheValue,
          preset,
          businessContext: {
            business_type: profile?.business_type || 'Service business',
            target_audience: targetAudience || 'Local customers',
            offer: offer || nicheValue,
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const generated = data.content as GeneratedContent;
      setContent(generated);

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
            <div className="glass-card p-6 space-y-5">
              <div>
                <Label className="label-uppercase text-foreground">Your Niche / Business *</Label>
                <Textarea
                  ref={nicheRef}
                  placeholder="e.g. Personal trainer helping busy professionals get fit"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="mt-2 transition-colors duration-150 focus:ring-2 focus:ring-primary/30"
                  rows={2}
                />
              </div>
              <div>
                <Label className="label-uppercase text-foreground">Target Audience</Label>
                <Input
                  placeholder="e.g. Busy professionals aged 30-50"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="mt-2 transition-colors duration-150 focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <Label className="label-uppercase text-foreground">Your Offer</Label>
                <Input
                  placeholder="e.g. 12-week body transformation program"
                  value={offer}
                  onChange={(e) => setOffer(e.target.value)}
                  className="mt-2 transition-colors duration-150 focus:ring-2 focus:ring-primary/30"
                />
              </div>
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
            {loading && (
              <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                <p className="text-sm text-muted-foreground">Creating your content...</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Used by businesses to attract clients</p>
              </div>
            )}

            {!content && !loading && (
              <div className="glass-card p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
                <Sparkles className="w-10 h-10 text-primary/30 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-1">Ready to generate</h3>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                  Fill in your business details and hit generate. Your content will appear here — ready to use, no editing needed.
                </p>
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
