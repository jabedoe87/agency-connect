import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useAddiction } from '@/hooks/useAddiction';

interface WinningAngleProps {
  /** Called to reuse the saved winning input — typically re-runs generation. */
  onReuse: (niche: string, actionType: string) => void;
}

/**
 * V6 — System 4: Winning Angle Reuse.
 * Renders only when a winning input has been captured (set on first client).
 * One-tap to regenerate using the same angle.
 */
export default function WinningAngle({ onReuse }: WinningAngleProps) {
  const { state } = useAddiction();
  const w = state.lastWinningInput;
  if (!w) return null;

  return (
    <div className="rounded-xl border border-success/40 bg-success/[0.08] p-4 sm:p-5 space-y-2">
      <p className="label-uppercase text-success text-[11px] font-bold tracking-wider">
        ✓ This message worked — reuse this angle
      </p>
      <p className="text-[11px] text-muted-foreground line-clamp-2">
        "{w.niche}"{w.actionType ? ` · ${w.actionType}` : ''}
      </p>
      <Button
        size="sm"
        className="cta-primary gap-1.5 w-full"
        onClick={() => onReuse(w.niche, w.actionType)}
      >
        <Sparkles className="w-3.5 h-3.5" /> Generate more like this
      </Button>
    </div>
  );
}
