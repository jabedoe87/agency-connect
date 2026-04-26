import { Flame } from 'lucide-react';
import { useAddiction } from '@/hooks/useAddiction';
import { streakBadge } from '@/lib/addiction';

/**
 * System 1 — Streak Engine.
 * Always-visible top-of-screen badge. Tone shifts with milestones.
 */
export default function StreakBanner() {
  const { state, justSent } = useAddiction();
  const badge = streakBadge(state, justSent);

  const toneClass =
    badge.tone === 'warn'
      ? 'border-destructive/40 bg-destructive/[0.08] text-destructive'
      : badge.tone === 'idle'
      ? 'border-white/10 bg-white/[0.04] text-muted-foreground'
      : badge.tone === 'elite'
      ? 'border-success/40 bg-success/[0.10] text-success'
      : badge.tone === 'hot'
      ? 'border-primary/40 bg-primary/[0.10] text-primary'
      : 'border-primary/30 bg-primary/[0.08] text-primary'; // fire

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs sm:text-sm font-medium transition-colors duration-200 ${toneClass}`}
      aria-live="polite"
    >
      <Flame className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{badge.label}</span>
    </div>
  );
}
