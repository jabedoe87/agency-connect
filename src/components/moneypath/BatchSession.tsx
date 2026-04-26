import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Send, Sparkles, Target, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAddiction } from '@/hooks/useAddiction';

interface BatchSessionProps {
  /** Returns N messages (strings). The caller wires this to the actual AI engine. */
  onGenerateBatch: (count: number) => Promise<string[]>;
  /** Default batch size. */
  size?: number;
  /**
   * V7 (additive) — increment to imperatively start a new batch from outside
   * (e.g. AutopilotPanel "Continue batch" or DailyPlan "Start now").
   * Initial mount value is ignored; only later changes trigger a new batch.
   */
  triggerKey?: number;
  /**
   * V8 (additive) — fired after each send so the parent can log the message
   * to the outbound pipeline. Receives the raw message text that was sent.
   */
  onAfterSend?: (text: string) => void;
}

/**
 * V6 — System 1 (Batch Generation) + System 2 (Send Session Mode)
 *      + System 8 (Auto Next Step).
 *
 * Flow:
 *   1. User clicks "Generate 5 messages" → onGenerateBatch(5)
 *   2. Each card shows: message + [ Send this ] + [ Skip ]
 *   3. Send copies to clipboard, records a send (streak/today/session),
 *      auto-advances to the next card and scrolls it into view.
 *   4. When all are processed → completion summary + "Generate 5 more".
 *
 * Session is started/ended via the shared addiction state so the
 * "Send Mode" bar reflects per-session output.
 */
export default function BatchSession({ onGenerateBatch, size = 5, triggerKey }: BatchSessionProps) {
  const { toast } = useToast();
  const { state, send, beginSession, stopSession } = useAddiction();
  const [messages, setMessages] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<number | null>(null); // sent count when batch ends
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const total = messages.length;
  const active = total > 0 && index < total;
  const sentThisBatch = useRef(0);

  // System 8 — auto-scroll the active card into view as index advances
  useEffect(() => {
    if (!active) return;
    const el = cardRefs.current[index];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [index, active]);

  // V7 (additive) — external trigger: increment triggerKey to start a fresh batch.
  // Initial-mount value is captured in a ref so we don't auto-fire on first render.
  const lastTriggerRef = useRef<number | undefined>(triggerKey);
  useEffect(() => {
    if (triggerKey === undefined) return;
    if (triggerKey === lastTriggerRef.current) return;
    lastTriggerRef.current = triggerKey;
    if (loading) return;
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerKey]);

  const generate = async () => {
    setLoading(true);
    try {
      const out = await onGenerateBatch(size);
      const cleaned = (out || []).map((s) => (s ?? '').toString().trim()).filter(Boolean);
      if (cleaned.length === 0) {
        toast({ title: 'No messages generated', description: 'Try again.', variant: 'destructive' });
        return;
      }
      setMessages(cleaned);
      setIndex(0);
      setDone(null);
      sentThisBatch.current = 0;
      cardRefs.current = [];
      beginSession();
    } catch (err: any) {
      toast({
        title: 'Batch generation failed',
        description: err?.message || 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const advance = () => {
    setIndex((i) => {
      const next = i + 1;
      if (next >= total) {
        // batch complete
        const count = sentThisBatch.current;
        setDone(count);
        stopSession();
      }
      return next;
    });
  };

  const handleSend = async (text: string, i: number) => {
    if (i !== index) return; // only the active card can send
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(i);
      setTimeout(() => setCopiedIdx((c) => (c === i ? null : c)), 1800);
    } catch {
      /* clipboard may be denied — still count the send */
    }
    send();
    sentThisBatch.current += 1;
    toast({ title: '✓ Copied & sent', description: 'Paste it now. Don\'t overthink.' });
    advance();
  };

  const handleSkip = (i: number) => {
    if (i !== index) return;
    advance();
  };

  const cancel = () => {
    setMessages([]);
    setIndex(0);
    setDone(null);
    sentThisBatch.current = 0;
    stopSession();
  };

  // ─── Pre-generate state ──────────────────────────────────────────────
  if (!active && done === null) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <p className="label-uppercase text-primary text-[11px] font-bold tracking-wider">
            ▸ Batch Mode
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Generate {size} messages at once. Send them one by one. Volume wins.
        </p>
        <Button
          size="lg"
          className="cta-primary gap-2 w-full min-h-[48px] text-base"
          onClick={generate}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Generating {size}...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Generate {size} messages
            </>
          )}
        </Button>
      </div>
    );
  }

  // ─── Completion state ────────────────────────────────────────────────
  if (done !== null) {
    return (
      <div className="rounded-xl border border-success/40 bg-success/[0.08] p-4 sm:p-5 space-y-3">
        <p className="text-sm font-semibold text-success">
          Session complete — you sent {done} message{done === 1 ? '' : 's'}
        </p>
        <p className="text-[11px] text-muted-foreground">
          You just increased your chances today.
        </p>
        <Button
          size="sm"
          className="cta-primary gap-1.5 w-full"
          onClick={generate}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" /> Generate {size} more
            </>
          )}
        </Button>
      </div>
    );
  }

  // ─── Active batch ────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* System 2 — Send Mode bar (sticky-ish top of the batch block) */}
      <div className="rounded-xl border-2 border-primary/40 bg-primary/[0.10] p-3 sm:p-4 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">
            🎯 Send Mode Active — {state.messagesThisSession} sent this session
          </p>
          <button
            onClick={cancel}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="End session"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Stay in this flow — this is where results come from.
        </p>
        <p className="text-[11px] text-foreground/80 italic">
          Start from the first one. Don't overthink.
        </p>
      </div>

      {messages.map((msg, i) => {
        const isActive = i === index;
        const isPast = i < index;
        return (
          <div
            key={i}
            ref={(el) => (cardRefs.current[i] = el)}
            className={`rounded-xl border p-4 transition-all duration-200 ${
              isActive
                ? 'border-primary/50 bg-primary/[0.06] shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]'
                : isPast
                ? 'border-white/5 bg-white/[0.02] opacity-50'
                : 'border-white/10 bg-white/[0.03] opacity-70'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Message {i + 1} / {total}
              </p>
              {isPast && (
                <span className="text-[10px] uppercase tracking-wide text-success font-semibold">
                  Done
                </span>
              )}
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {msg}
            </p>
            {isActive && (
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  className="cta-primary gap-1.5 flex-1"
                  onClick={() => handleSend(msg, i)}
                >
                  {copiedIdx === i ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copied — send it
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Send this
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10"
                  onClick={() => handleSkip(i)}
                >
                  Skip
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="opacity-70 hover:opacity-100"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(msg);
                      setCopiedIdx(i);
                      setTimeout(() => setCopiedIdx(null), 1500);
                      toast({ title: 'Copied' });
                    } catch {
                      /* ignore */
                    }
                  }}
                  aria-label="Copy only"
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
