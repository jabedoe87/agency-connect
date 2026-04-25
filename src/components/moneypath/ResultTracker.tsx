import { Button } from '@/components/ui/button';
import type { Outcome } from '@/lib/moneyPath';

interface ResultTrackerProps {
  currentOutcome: Outcome;
  onSelect: (outcome: Exclude<Outcome, null>) => void;
}

const OPTIONS: { value: Exclude<Outcome, null>; label: string; tone: 'neutral' | 'positive' | 'win' }[] = [
  { value: 'no_response', label: 'No response', tone: 'neutral' },
  { value: 'replies', label: 'Got replies', tone: 'positive' },
  { value: 'clicks', label: 'Got clicks', tone: 'positive' },
  { value: 'leads', label: 'Got leads', tone: 'win' },
  { value: 'client', label: 'Got a client', tone: 'win' },
];

export default function ResultTracker({ currentOutcome, onSelect }: ResultTrackerProps) {
  const guidance = currentOutcome === 'leads'
    ? 'Follow up within the hour.'
    : currentOutcome === 'client'
    ? 'Scale this before momentum drops.'
    : currentOutcome
    ? 'Keep iterating — track the next post too.'
    : 'Check results in 48h.';

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 space-y-3">
      <div>
        <p className="label-uppercase text-foreground text-[10px] font-semibold mb-1">▸ Did this get results?</p>
        <p className="text-xs text-muted-foreground">You can update this anytime.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => {
          const isActive = currentOutcome === opt.value;
          const toneClass = isActive
            ? opt.tone === 'win'
              ? 'border-success/50 bg-success/15 text-success'
              : opt.tone === 'positive'
              ? 'border-primary/50 bg-primary/15 text-primary'
              : 'border-white/20 bg-white/10 text-foreground'
            : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]';
          return (
            <Button
              key={opt.value}
              size="sm"
              variant="outline"
              className={`text-xs h-8 ${toneClass}`}
              onClick={() => onSelect(opt.value)}
            >
              {opt.label}
            </Button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground italic">{guidance}</p>
    </div>
  );
}
