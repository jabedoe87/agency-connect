import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Timer, X } from 'lucide-react';
import { useAddiction } from '@/hooks/useAddiction';

const SPRINT_MS = 10 * 60 * 1000; // 10 minutes

interface SprintModeProps {
  /** Tracks how many sends happened during the sprint window. */
}

/**
 * V6 — System 5: Sprint Mode.
 * 10-minute focused send window. Shows only timer + reminder.
 * Tracks sends made during the sprint (delta of messagesSentToday from start).
 */
export default function SprintMode(_: SprintModeProps) {
  const { state } = useAddiction();
  const [active, setActive] = useState(false);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const startCount = useRef<number>(0);
  const finalCount = useRef<number>(0);
  const [doneCount, setDoneCount] = useState<number | null>(null);

  // Tick every second while active
  useEffect(() => {
    if (!active || !endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active, endsAt]);

  // Auto-stop when timer expires
  useEffect(() => {
    if (!active || !endsAt) return;
    if (now >= endsAt) {
      finalCount.current = Math.max(0, state.messagesSentToday - startCount.current);
      setDoneCount(finalCount.current);
      setActive(false);
      setEndsAt(null);
    }
  }, [now, active, endsAt, state.messagesSentToday]);

  const start = () => {
    startCount.current = state.messagesSentToday;
    setEndsAt(Date.now() + SPRINT_MS);
    setNow(Date.now());
    setActive(true);
    setDoneCount(null);
  };

  const stopEarly = () => {
    finalCount.current = Math.max(0, state.messagesSentToday - startCount.current);
    setDoneCount(finalCount.current);
    setActive(false);
    setEndsAt(null);
  };

  if (active && endsAt) {
    const remainingMs = Math.max(0, endsAt - now);
    const m = Math.floor(remainingMs / 60000);
    const s = Math.floor((remainingMs % 60000) / 1000);
    const sentSoFar = Math.max(0, state.messagesSentToday - startCount.current);
    return (
      <div className="rounded-xl border-2 border-primary/40 bg-primary/[0.08] p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-primary" />
            <p className="label-uppercase text-primary text-[11px] font-bold tracking-wider">
              ▸ Sprint Active
            </p>
          </div>
          <button
            onClick={stopEarly}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="End sprint"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="font-display text-4xl sm:text-5xl text-foreground tabular-nums leading-none">
          {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
        </p>
        <p className="text-xs text-foreground font-semibold">
          Send fast. Don't think. Volume wins.
        </p>
        <p className="text-[11px] text-muted-foreground">
          {sentSoFar} sent in this sprint
        </p>
      </div>
    );
  }

  if (doneCount !== null) {
    return (
      <div className="rounded-xl border border-success/40 bg-success/[0.08] p-4 sm:p-5 space-y-2">
        <p className="text-sm font-semibold text-success">
          Sprint done — you sent {doneCount} message{doneCount === 1 ? '' : 's'}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="border-white/10 gap-1.5"
          onClick={start}
        >
          <Timer className="w-3.5 h-3.5" /> Start another sprint
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 space-y-2">
      <div className="flex items-center gap-2">
        <Timer className="w-4 h-4 text-primary" />
        <p className="label-uppercase text-foreground text-[10px] font-semibold">
          ▸ Sprint Mode
        </p>
      </div>
      <p className="text-[11px] text-muted-foreground">
        10 focused minutes. Send as many as you can. Volume wins.
      </p>
      <Button size="sm" className="cta-primary gap-1.5 w-full" onClick={start}>
        <Timer className="w-3.5 h-3.5" /> Start 10-minute sprint
      </Button>
    </div>
  );
}
