import { TrendingUp } from 'lucide-react';
import type { FeedbackInsight } from '@/lib/moneyPath';

interface FeedbackBannerProps {
  insight: FeedbackInsight | null;
}

export default function FeedbackBanner({ insight }: FeedbackBannerProps) {
  if (!insight) return null;
  const lines: string[] = [];
  if (insight.best_hook) lines.push(`Hook ${insight.best_hook} gets the most responses`);
  if (insight.best_platform) lines.push(`${insight.best_platform} drives the most engagement`);
  if (insight.best_niche) lines.push(`"${insight.best_niche}" converts highest`);
  if (lines.length === 0) return null;

  return (
    <div className="rounded-xl border border-success/30 bg-success/[0.06] p-4 flex gap-3 items-start">
      <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center shrink-0">
        <TrendingUp className="w-4 h-4 text-success" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="label-uppercase text-success text-[10px] font-semibold mb-1">▸ This is working for you</p>
        <ul className="text-sm text-foreground space-y-0.5">
          {lines.map((l, i) => <li key={i}>→ {l}</li>)}
        </ul>
        <p className="text-sm text-success font-semibold mt-2">👉 Do 3 more messages TODAY.</p>
      </div>
    </div>
  );
}
