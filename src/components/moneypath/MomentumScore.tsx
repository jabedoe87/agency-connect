import { useEffect, useRef, useState } from 'react';
import { useAddiction } from '@/hooks/useAddiction';
import { momentumLabel, performanceScore, volumeBoostLabel } from '@/lib/addiction';
import { TrendingUp, ArrowUp } from 'lucide-react';

/**
 * V6 — System 6 (performance score) + System 7 (momentum indicator)
 *      + System 3 (volume boost copy at 10 / 20).
 *
 * Pure read-only widget. Reacts to state changes via the shared event bus.
 */
export default function MomentumScore() {
  const { state } = useAddiction();
  const score = performanceScore(state);
  const momentum = momentumLabel(state.messagesSentToday);
  const volume = volumeBoostLabel(state.messagesSentToday);

  // Flash "↑ keep going" when the score increases
  const prev = useRef(score);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (score > prev.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 2500);
      prev.current = score;
      return () => clearTimeout(t);
    }
    prev.current = score;
  }, [score]);

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <p className="label-uppercase text-primary text-[10px] font-semibold">
            ▸ Today's Score
          </p>
        </div>
        {flash && (
          <span className="text-[11px] text-success font-semibold flex items-center gap-0.5">
            <ArrowUp className="w-3 h-3" /> keep going
          </span>
        )}
      </div>

      <p className="font-display text-3xl sm:text-4xl text-foreground tabular-nums leading-none">
        {score}
      </p>

      <p className="text-xs text-foreground font-medium">{momentum}</p>

      {volume && (
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
          <p className="text-[11px] text-foreground">{volume}</p>
        </div>
      )}
    </div>
  );
}
