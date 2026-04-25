import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConversionLayerProps {
  hook: string;
  pain: string;
  shift: string;
  offer: string;
  cta: string;
  niche: string;
  actionType: string;
}

type VariantKey = 'landing' | 'dm' | 'email' | 'post';

export default function ConversionLayer({ hook, pain, shift, offer, cta, actionType }: ConversionLayerProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const variants = useMemo(() => {
    const benefits = [
      shift?.split('.').filter(Boolean)[0]?.trim() || shift,
      offer?.split('.').filter(Boolean)[0]?.trim() || offer,
      pain ? `No more ${pain.toLowerCase().replace(/\.$/, '')}` : 'Built for results that show up fast',
    ].filter(Boolean);

    const landing = [
      hook,
      '',
      'WHY THIS WORKS:',
      ...benefits.slice(0, 3).map((b) => `• ${b}`),
      '',
      cta,
    ].join('\n');

    const dm = [
      `Hey — quick one. ${pain?.toLowerCase().replace(/\.$/, '') || 'noticed something'}?`,
      '',
      `${shift} ${offer}`,
      '',
      cta,
    ].join('\n');

    const subject = hook.length <= 60 ? hook : hook.slice(0, 57) + '…';
    const email = [
      `Subject: ${subject}`,
      '',
      `${pain}`,
      '',
      `${shift} ${offer}`,
      '',
      cta,
    ].join('\n');

    const post = [
      hook,
      '',
      pain,
      '',
      `${shift} ${offer}`,
      '',
      cta,
    ].join('\n');

    return { landing, dm, email, post };
  }, [hook, pain, shift, offer, cta]);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: 'Copied to clipboard' });
  };

  // Pick ONE variant based on actionType (Section 7)
  const active: { key: VariantKey; label: string; sublabel: string; body: string; copyLabel: string } = (() => {
    if (/email/i.test(actionType)) {
      return { key: 'email', label: 'Reply Email', sublabel: 'Subject + 2 paragraphs + CTA', body: variants.email, copyLabel: 'Copy Email Reply' };
    }
    if (/^run an ad|paid ad|^ad/i.test(actionType)) {
      return { key: 'landing', label: 'Landing Page Copy', sublabel: 'Headline + 3 benefits + CTA', body: variants.landing, copyLabel: 'Copy Landing Page' };
    }
    if (/post on instagram|^post|caption/i.test(actionType)) {
      return { key: 'post', label: 'Reply Caption / Comment', sublabel: 'Hook + pain + pitch + CTA', body: variants.post, copyLabel: 'Copy Post Reply' };
    }
    // Default: DM
    return { key: 'dm', label: 'DM Reply Script', sublabel: 'Pain + pitch + soft CTA', body: variants.dm, copyLabel: 'Copy DM Reply' };
  })();

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-5 space-y-4">
      <div>
        <p className="label-uppercase text-primary text-[10px] font-semibold mb-1">▸ When someone replies — send this immediately</p>
        <p className="text-xs text-muted-foreground">One ready-to-send response, matched to your action.</p>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
          <p className="text-sm font-medium text-foreground">{active.label}</p>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{active.sublabel}</span>
        </div>
        <pre className="px-4 py-3 text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">{active.body}</pre>
      </div>

      <Button variant="outline" size="sm" className="gap-1.5 border-white/10 w-full" onClick={() => copy(active.body, active.key)}>
        {copied === active.key ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
        {active.copyLabel}
      </Button>

      <p className="text-[11px] text-muted-foreground italic pt-1">Speed wins replies — send within minutes.</p>
    </div>
  );
}
