import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Target, Users } from 'lucide-react';
import { useAddiction } from '@/hooks/useAddiction';
import {
  DAILY_TARGET,
  isAfternoonAndIdle,
  isEndOfDayAndIdle,
  microReward,
  socialProofPct,
  targetProgress,
} from '@/lib/addiction';

interface DailyTrackerProps {
  /** Scrolls input into view / focuses generation when "Send one now" is clicked. */
  onJumpToCompose?: () => void;
}

/**
 * Combined widget:
 *   System 2 — Output metric
 *   System 3 — Micro reward
 *   System 4 — Loss aversion (after 12:00, 0 sent)
 *   System 5 — Daily target progress
 *   System 6 — Social proof percentile
 *   System 8 — End-of-day trigger (18:00–23:59, 0 sent)
 */
export default function DailyTracker({ onJumpToCompose }: DailyTrackerProps) {
  const { state, justSent } = useAddiction();
  const { messagesSentToday, totalMessagesSent } = state;
  const { pct, remaining, hit } = targetProgress(messagesSentToday);
  const proof = socialProofPct(messagesSentToday);
  const reward = microReward(messagesSentToday);

  // Re-evaluate time-based triggers on mount + every 60s while open
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(i);
  }, []);
  const showLossAversion = isAfternoonAndIdle(state) && !isEndOfDayAndIdle(state);
  const showEndOfDay = isEndOfDayAndIdle(state);
  void tick; // silence unused-warning while still re-rendering

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 space-y-4">
      {/* System 2 — Output metric */}
      <div>
        <p className="label-uppercase text-[10px] font-semibold text-muted-foreground">▸ Today's Output</p>
        <p className="font-display text-3xl sm:text-4xl text-foreground mt-1 leading-none">
          {messagesSentToday}{' '}
          <span className="text-base sm:text-lg text-muted-foreground font-sans font-normal">
            message{messagesSentToday === 1 ? '' : 's'} sent today
          </span>
        </p>
        <p className="text-xs text-muted-foreground mt-1.5">
          {justSent
            ? '1 more message = more chances to win'
            : 'Every message = a chance at a client'}
        </p>
      </div>

      {/* System 5 — Daily target progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-primary" />
            <p className="label-uppercase text-[10px] font-semibold text-foreground">Daily target</p>
          </div>
          <p className="text-xs font-medium text-foreground tabular-nums">
            {Math.min(messagesSentToday, DAILY_TARGET)} / {DAILY_TARGET}
          </p>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${hit ? 'bg-success' : 'bg-primary'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {hit
            ? 'Target hit. Everything after this is extra wins.'
            : `You're ${remaining} message${remaining === 1 ? '' : 's'} away from your daily target.`}
        </p>
      </div>

      {/* System 3 — Micro reward (auto-hide when 0) */}
      {reward && (
        <div className="rounded-lg border border-primary/25 bg-primary/[0.06] px-3 py-2">
          <p className="text-xs font-semibold text-primary">{reward}</p>
        </div>
      )}

      {/* System 6 — Social proof */}
      {proof !== null && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="w-3.5 h-3.5 text-success" />
          <span>
            You're doing more than{' '}
            <span className="text-success font-semibold">{proof}%</span> of users today.
          </span>
        </div>
      )}

      {/* Total counter — quiet line */}
      {totalMessagesSent > 0 && (
        <p className="text-[11px] text-muted-foreground/70 border-t border-white/5 pt-2">
          {totalMessagesSent} total message{totalMessagesSent === 1 ? '' : 's'} sent all-time
        </p>
      )}

      {/* System 4 — Loss aversion (afternoon, 0 sent) */}
      {showLossAversion && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/[0.06] p-3 space-y-2">
          <p className="text-xs font-semibold text-destructive">
            You haven't sent anything today.
          </p>
          <p className="text-[11px] text-destructive/80">
            No messages = no replies = no clients.
          </p>
          <Button
            size="sm"
            className="cta-primary w-full gap-1.5 mt-1"
            onClick={onJumpToCompose}
          >
            <Send className="w-3.5 h-3.5" /> Send one now
          </Button>
        </div>
      )}

      {/* System 8 — End-of-day trigger (overrides loss aversion after 18:00) */}
      {showEndOfDay && (
        <div className="rounded-lg border border-warning/30 bg-warning/[0.08] p-3 space-y-2">
          <p className="text-xs font-semibold text-warning">
            1 message now keeps your streak alive.
          </p>
          <Button
            size="sm"
            className="cta-primary w-full gap-1.5"
            onClick={onJumpToCompose}
          >
            <Send className="w-3.5 h-3.5" /> Send now
          </Button>
        </div>
      )}
    </div>
  );
}
