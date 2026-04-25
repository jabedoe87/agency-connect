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
}

export default function ConversionLayer({ hook, pain, shift, offer, cta, niche }: ConversionLayerProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const variants = useMemo(() => {
    // Build 3 variants from existing output — NO AI call.
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
      `Hey — ${pain?.toLowerCase().replace(/\.$/, '') || 'noticed something'}?`,
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

    return { landing, dm, email };
  }, [hook, pain, shift, offer, cta]);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: 'Copied to clipboard' });
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-5 space-y-4">
      <div>
        <p className="label-uppercase text-primary text-[10px] font-semibold mb-1">▸ Turn this into clients</p>
        <p className="text-xs text-muted-foreground">Use this when someone shows interest.</p>
      </div>

      <div className="space-y-3">
        <details className="rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden">
          <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-foreground flex items-center justify-between">
            A — Landing Page
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Headline + 3 benefits + CTA</span>
          </summary>
          <pre className="px-4 pb-3 text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">{variants.landing}</pre>
        </details>

        <details className="rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden">
          <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-foreground flex items-center justify-between">
            B — DM Script
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Pain + pitch + soft CTA</span>
          </summary>
          <pre className="px-4 pb-3 text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">{variants.dm}</pre>
        </details>

        <details className="rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden">
          <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-foreground flex items-center justify-between">
            C — Email
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Subject + 2 paragraphs + CTA</span>
          </summary>
          <pre className="px-4 pb-3 text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">{variants.email}</pre>
        </details>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <Button variant="outline" size="sm" className="gap-1.5 border-white/10 flex-1" onClick={() => copy(variants.landing, 'landing')}>
          {copied === 'landing' ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          Copy Landing Page
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 border-white/10 flex-1" onClick={() => copy(variants.dm, 'dm')}>
          {copied === 'dm' ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          Copy DM Script
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 border-white/10 flex-1" onClick={() => copy(variants.email, 'email')}>
          {copied === 'email' ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          Copy Email
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground italic pt-1">Use this as a DM reply or landing page.</p>
    </div>
  );
}
