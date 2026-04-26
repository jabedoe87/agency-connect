import { Button } from '@/components/ui/button';
import { Bot, Sparkles, Zap, ArrowRight } from 'lucide-react';
import { useAddiction } from '@/hooks/useAddiction';
import { resolvePrefill } from '@/lib/addiction';

interface AutopilotPanelProps {
  /** Generates a single message immediately (System 5 — Continue where you left off). */
  onGenerateOne: () => void;
  /** Triggers a new V6 batch (System 7 — Continue batch). */
  onContinueBatch: () => void;
  /** Optional loading flag from the parent generator. */
  loading?: boolean;
}

/**
 * V7 — Autopilot Panel.
 * Combines Systems 1 (Toggle), 2 (Smart Prefill banner), 4 (Auto Next Move),
 * 5 (Zero-Input Mode), 7 (Auto Batch Push), 8 (Decision Removal).
 *
 * Pure presentation + thin wiring — all decision logic lives in addiction.ts.
 */
export default function AutopilotPanel({
  onGenerateOne,
  onContinueBatch,
  loading = false,
}: AutopilotPanelProps) {
  const { state, setAutopilotEnabled } = useAddiction();
  const enabled = state.autopilotEnabled;
  const prefill = resolvePrefill(state);
  const hasAnyHistory = !!(
    state.lastWinningInput ||
    state.bestPerformingAction ||
    state.bestPerformingNiche ||
    state.lastActionUsed
  );

  // System 7 — Auto Batch Push: nudge after 5 sends in the active session.
  const showBatchPush = enabled && state.sessionActive && state.messagesThisSession >= 5;

  // System 5 — Zero Input Mode: only meaningful once they've sent before.
  const showContinue = enabled && state.totalMessagesSent > 0;

  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 space-y-3 ${
        enabled
          ? 'border-primary/40 bg-primary/[0.06]'
          : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      {/* Header / Toggle (System 1) */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className={`w-4 h-4 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />
          <p className="label-uppercase text-[11px] font-bold tracking-wider text-foreground">
            ▸ Autopilot
          </p>
          <span
            className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${
              enabled
                ? 'bg-primary/20 text-primary'
                : 'bg-white/5 text-muted-foreground'
            }`}
          >
            {enabled ? 'ON' : 'OFF'}
          </span>
        </div>
        <Button
          size="sm"
          variant={enabled ? 'outline' : 'default'}
          className={enabled ? 'border-white/10 h-8' : 'cta-primary h-8'}
          onClick={() => setAutopilotEnabled(!enabled)}
        >
          {enabled ? 'Turn off' : 'Turn on'}
        </Button>
      </div>

      {!enabled && (
        <p className="text-[11px] text-muted-foreground">
          Let Autopilot pick your inputs from what already worked.
        </p>
      )}

      {enabled && (
        <>
          {/* System 2 — Smart Prefill banner */}
          <div className="rounded-lg border border-primary/25 bg-primary/[0.05] px-3 py-2.5 space-y-1">
            {hasAnyHistory ? (
              <>
                <p className="text-[11px] text-foreground font-semibold">
                  Auto-filled based on what already made money.
                </p>
                {/* System 8 — Decision Removal: show what's being used */}
                {(prefill.niche || prefill.actionType) && (
                  <p className="text-[11px] text-muted-foreground">
                    Using:{' '}
                    <span className="text-foreground font-medium">
                      {prefill.niche || '—'}
                    </span>
                    {prefill.actionType && (
                      <>
                        {' '}via{' '}
                        <span className="text-foreground font-medium">
                          {prefill.actionType}
                        </span>
                      </>
                    )}
                  </p>
                )}
                <button
                  onClick={() => setAutopilotEnabled(false)}
                  className="text-[11px] text-primary hover:underline"
                >
                  Turn off Autopilot to change
                </button>
              </>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Add your niche and send type to get started.
              </p>
            )}
          </div>

          {/* System 4 — Auto Next Move */}
          {hasAnyHistory && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground">Do more of this next.</p>
              <Button
                size="sm"
                className="cta-primary gap-1.5 w-full"
                onClick={onGenerateOne}
                disabled={loading}
              >
                <Sparkles className="w-3.5 h-3.5" /> Generate next best message
              </Button>
            </div>
          )}

          {/* System 5 — Zero Input Mode */}
          {showContinue && (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 space-y-1.5">
              <p className="text-[11px] text-foreground">Continue where you left off.</p>
              <Button
                size="sm"
                variant="outline"
                className="border-white/10 gap-1.5 w-full"
                onClick={onGenerateOne}
                disabled={loading}
              >
                <ArrowRight className="w-3.5 h-3.5" /> Generate next message
              </Button>
            </div>
          )}

          {/* System 7 — Auto Batch Push (only after 5 sends in current session) */}
          {showBatchPush && (
            <div className="rounded-lg border border-success/40 bg-success/[0.08] px-3 py-2.5 space-y-1.5">
              <p className="text-[12px] text-success font-semibold">
                You're in motion — generate 5 more.
              </p>
              <Button
                size="sm"
                className="cta-primary gap-1.5 w-full"
                onClick={onContinueBatch}
                disabled={loading}
              >
                <Zap className="w-3.5 h-3.5" /> Continue batch
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
