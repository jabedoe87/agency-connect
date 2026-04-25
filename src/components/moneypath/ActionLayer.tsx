import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ActionLayerProps {
  adText: string;
  ctaText: string;
  platform: string;
  onPosted: () => void;
  alreadyPosted: boolean;
}

export default function ActionLayer({ adText, ctaText, platform, onPosted, alreadyPosted }: ActionLayerProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: 'Copied to clipboard' });
  };

  const handleMarkPosted = () => {
    if (marking || alreadyPosted) return;
    setMarking(true);
    onPosted();
  };

  const platformLabel = platform || 'your chosen platform';
  const postType = /instagram|tiktok|facebook|linkedin|x|twitter/i.test(platform) ? 'post' : 'ad';

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-5 space-y-4">
      <div>
        <p className="label-uppercase text-primary text-[10px] font-semibold mb-1">▸ Run this today</p>
        <p className="text-xs text-muted-foreground">Three steps. Then mark it as posted to track results.</p>
      </div>

      <ol className="space-y-2 text-sm text-foreground">
        <li className="flex gap-2"><span className="text-primary font-semibold">1.</span> Copy this ad</li>
        <li className="flex gap-2"><span className="text-primary font-semibold">2.</span> Post it on <span className="font-medium">{platformLabel}</span> as a {postType}</li>
        <li className="flex gap-2"><span className="text-primary font-semibold">3.</span> Use the CTA below in your bio / link / reply</li>
      </ol>

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <Button variant="outline" size="sm" className="gap-1.5 border-white/10 flex-1" onClick={() => copy(adText, 'ad')}>
          {copied === 'ad' ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          Copy Ad
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 border-white/10 flex-1" onClick={() => copy(ctaText, 'cta')}>
          {copied === 'cta' ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          Copy CTA
        </Button>
        <Button
          size="sm"
          className="gap-1.5 cta-primary flex-1"
          onClick={handleMarkPosted}
          disabled={alreadyPosted || marking}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {alreadyPosted ? 'Posted ✓' : 'Mark as Posted'}
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground italic pt-1">Post this today — first 24h matters.</p>
    </div>
  );
}
