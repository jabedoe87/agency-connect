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

const STYLE_PRESETS = [
  { id: 'high-converting', label: 'High-Converting', desc: 'Proven direct-response style' },
  { id: 'luxury', label: 'Luxury', desc: 'Sophisticated & exclusive' },
  { id: 'aggressive', label: 'Aggressive', desc: 'Bold & urgent' },
  { id: 'tiktok', label: 'TikTok', desc: 'Casual & scroll-stopping' },
  { id: 'minimal', label: 'Minimal', desc: 'Clean & clear' },
];

const DEMO_NICHE = 'Personal trainer helping busy professionals get fit';

export default function Generator() {
  const { user, profile } = useAuth();
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
  const isFreePlan = !profile?.plan || profile.plan === 'trial';

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

      // Store in database
      await supabase.from('generated_content').insert({
        user_id: user.id,
        content: generated as any,
        niche: nicheValue,
        preset,
      });

      // Log activity
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

    // Determine loading text
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

      // Handle variations response
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
      className="absolute top-2 right-2 p-1.5 rounded-md bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
    >
      {copiedField === field ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );

  return (
    <AppLayout>
      <div className="p-4 md:p-8 fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl md:text-3xl text-foreground">Content Generator</h1>
            <p className="text-sm text-muted-foreground mt-1">Generate high-converting content for your business.</p>
          </div>
          {!content && (
            <Button variant="outline" size="sm" className="mt-2 md:mt-0 gap-2" onClick={() => handleGenerate(true)}>
              <Sparkles className="w-3.5 h-3.5" /> Try Demo
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input panel */}
          <div className="space-y-5">
            <div className="glass-card p-5 space-y-4">
              <div>
                <Label className="text-sm font-medium">Your Niche / Business *</Label>
                <Textarea
                  ref={nicheRef}
                  placeholder="e.g. Personal trainer helping busy professionals get fit"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="mt-1.5"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Target Audience</Label>
                <Input
                  placeholder="e.g. Busy professionals aged 30-50"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Your Offer</Label>
                <Input
                  placeholder="e.g. 12-week body transformation program"
                  value={offer}
                  onChange={(e) => setOffer(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* Style presets */}
            <div className="glass-card p-5">
              <Label className="text-sm font-medium mb-3 block">Style Preset</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {STYLE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPreset(p.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      preset === p.id
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-card/50 text-muted-foreground hover:border-muted-foreground/30'
                    }`}
                  >
                    <p className="text-sm font-medium">{p.label}</p>
                    <p className="text-[11px] mt-0.5 opacity-70">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>


            <Button
              size="lg"
              className="w-full gap-2 font-semibold"
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

          {/* Output panel */}
          <div ref={outputRef} className="space-y-4">
            {loading && (
              <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                <p className="text-sm text-muted-foreground">Creating your content...</p>
                <p className="text-xs text-muted-foreground mt-1">Used by businesses to attract clients</p>
              </div>
            )}

            {!content && !loading && (
              <div className="glass-card p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
                <Sparkles className="w-10 h-10 text-primary/40 mb-4" />
                <h3 className="text-base font-semibold text-foreground mb-1">Ready to generate</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Fill in your business details and hit generate. Your content will appear here — ready to use, no editing needed.
                </p>
              </div>
            )}

            {content && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Your Content</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={copyAll}>
                      <Copy className="w-3.5 h-3.5" /> Copy All
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleGenerate(false)}>
                      <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                    </Button>
                  </div>
                </div>

                {/* Hook */}
                <div className="glass-card p-5 relative">
                  <CopyButton text={content.hook} field="hook" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-2">Hook</p>
                  <p className="text-foreground font-medium leading-relaxed pr-8">{content.hook}</p>
                </div>

                {/* Emotional Benefit */}
                <div className="glass-card p-5 relative">
                  <CopyButton text={content.emotional_benefit} field="benefit" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-2">Emotional Benefit</p>
                  <p className="text-foreground leading-relaxed pr-8">{content.emotional_benefit}</p>
                </div>

                {/* Bullets */}
                <div className="glass-card p-5 relative">
                  <CopyButton text={content.bullets.map(b => `• ${b}`).join('\n')} field="bullets" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-2">Key Benefits</p>
                  <ul className="space-y-2 pr-8">
                    {content.bullets.map((b, i) => (
                      <li key={i} className="text-foreground text-sm flex gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Objection Handler */}
                <div className="glass-card p-5 relative">
                  <CopyButton text={content.objection_handler} field="objection" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-2">Objection Handler</p>
                  <p className="text-foreground leading-relaxed pr-8">{content.objection_handler}</p>
                </div>

                {/* CTA */}
                <div className="glass-card p-5 relative border-primary/20 bg-primary/5">
                  <CopyButton text={content.cta} field="cta" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-2">Call to Action</p>
                  <p className="text-foreground font-semibold leading-relaxed pr-8">{content.cta}</p>
                </div>

                {/* Post-generation action buttons */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="gap-1.5 flex-1"
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
                    className="gap-1.5 flex-1"
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
                    <Button className="gap-1.5 flex-1" onClick={() => navigate('/pricing')}>
                      <Lock className="w-3.5 h-3.5" /> Unlock Unlimited
                    </Button>
                  ) : (
                    <Button variant="outline" className="gap-1.5 flex-1" disabled>
                      Export Content
                    </Button>
                  )}
                </div>

                {/* Variations view */}
                {variations && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Variations</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
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
                      <div key={i} className="glass-card p-4 space-y-2">
                        <p className="text-xs font-semibold text-primary">Variation {i + 1}</p>
                        <p className="text-sm font-medium text-foreground">{v.hook}</p>
                        <p className="text-sm text-muted-foreground">{v.emotional_benefit}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-1"
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

                {/* AI Assist block */}
                <AIAssistBlock
                  loading={assistLoading}
                  loadingText={assistLoadingText}
                  onAction={runAssistAction}
                  currentPreset={preset}
                />

                {/* Post-generation upgrade message */}
                {isFreePlan && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 text-center space-y-3">
                    <p className="text-foreground font-semibold">Keep generating client-winning content without limits.</p>
                    <p className="text-sm text-muted-foreground">You've seen what one output can do. Don't stop now.</p>
                    <Button className="gap-1.5" onClick={() => navigate('/pricing')}>
                      <Lock className="w-3.5 h-3.5" /> Unlock Unlimited
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
