import { Button } from '@/components/ui/button';
import { Calendar, X } from 'lucide-react';
import { useAddiction } from '@/hooks/useAddiction';
import { DAILY_TARGET } from '@/lib/addiction';

interface DailyPlanProps {
  /** Triggers the V6 batch + session flow. */
  onStart: () => void;
}

/**
 * V7 — System 9: Daily Plan.
 * Hidden once dismissed for the day, when target hit, or when user has already started.
 * Daily reset of `dailyPlanDismissed` is handled by rollIfNewDay in addiction.ts.
 */
export default function DailyPlan({ onStart }: DailyPlanProps) {
  const { state, dismissPlan } = useAddiction();

  if (state.dailyPlanDismissed) return null;
  if (state.messagesSentToday >= DAILY_TARGET) return null;
  if (state.messagesSentToday > 0) return null; // already in motion

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/[0.08] p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <p className="label-uppercase text-primary text-[11px] font-bold tracking-wider">
            ▸ Today's Plan
          </p>
        </div>
        <button
          onClick={dismissPlan}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss plan"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-sm text-foreground font-semibold">
        Send {DAILY_TARGET} messages to get replies.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button size="sm" className="cta-primary gap-1.5 flex-1" onClick={onStart}>
          Start now
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-white/10 flex-1"
          onClick={dismissPlan}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
