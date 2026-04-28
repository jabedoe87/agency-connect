import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, CheckCircle2, Bell, Sparkles, ExternalLink, Mail, Instagram, Megaphone, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAddiction } from '@/hooks/useAddiction';
import { formatEUR } from '@/lib/addiction';

interface ActionLayerProps {
  adText: string;
  ctaText: string;
  actionType: string;
  onPosted: () => void;
  alreadyPosted: boolean;
  onGenerateAnother?: () => void;
}

const REMINDER_KEY = 'agencyos_reminder';
const FIRST_SEND_KEY = 'agencyos_first_send_done';

// V10.1 — categorize action
type ActionKind = 'email' | 'dm' | 'post' | 'ad' | 'comment' | 'fallback';
function actionKindOf(actionType: string): ActionKind {
  if (/email/i.test(actionType)) return 'email';
  if (/dm|message/i.test(actionType)) return 'dm';
  if (/post|story/i.test(actionType)) return 'post';
  if (/ad/i.test(actionType)) return 'ad';
  if (/comment/i.test(actionType)) return 'comment';
  return 'fallback';
}

export default function ActionLayer({
  adText,
  ctaText,
  actionType,
  onPosted,
  alreadyPosted,
  onGenerateAnother,
}: ActionLayerProps) {
  const { toast } = useToast();
  const { state: addiction } = useAddiction();

  // V10.5 — state per spec
  const [copied, setCopied] = useState<string | null>(null);
  const [copyClicked, setCopyClicked] = useState(false);
  const [sendStarted, setSendStarted] = useState(false);
  const [sendPathVisible, setSendPathVisible] = useState(false);
  const [sendConfirmed, setSendConfirmed] = useState(false);
  const [marking, setMarking] = useState(false);
  const [reminderChoice, setReminderChoice] = useState<'24h' | '48h' | null>(null);
  const [postSendChoice, setPostSendChoice] = useState<null | 'continue' | 'done'>(null);
  const [firstSendBurst, setFirstSendBurst] = useState(false);

  // V10.5 — System 4: lazy microstep text (after copy)
  const [lazyMsg, setLazyMsg] = useState<string | null>(null);

  const [igUsername, setIgUsername] = useState('');
  const sendPathRef = useRef<HTMLDivElement | null>(null);

  const kind = actionKindOf(actionType);

  // Reset per-message state on new message
  useEffect(() => {
    setCopied(null);
    setCopyClicked(false);
    setSendStarted(false);
    setSendPathVisible(false);
    setSendConfirmed(false);
    setLazyMsg(null);
  }, [adText]);

  // System 4 — Lazy microstep: 5s → "Only one tap left.", 10s → "Open. Paste. Done."
  useEffect(() => {
    if (!copyClicked || sendConfirmed || alreadyPosted) return;
    const t1 = setTimeout(() => setLazyMsg('Only one tap left.'), 5000);
    const t2 = setTimeout(() => setLazyMsg('Open. Paste. Done.'), 10000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [copyClicked, sendConfirmed, alreadyPosted]);

  const dismissNudges = () => {
    setLazyMsg(null);
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch { /* ignore */ }
    setCopied(key);
    if (key === 'msg') {
      setCopyClicked(true);
      setSendStarted(true);
      setSendPathVisible(true);
      setLazyMsg(null);
      // Smooth scroll to send path
      setTimeout(() => {
        try { sendPathRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { /* ignore */ }
      }, 80);
    }
    setTimeout(() => setCopied(null), 2000);
    toast({
      title: key === 'cta' ? '✓ CTA copied' : '✓ Copied — send started',
    });
  };

  const handleFinalConfirm = () => {
    if (marking || alreadyPosted || !copyClicked) return;
    setMarking(true);
    setSendConfirmed(true);
    dismissNudges();
    onPosted();

    // First send reward (3s)
    let alreadyDone = false;
    try { alreadyDone = localStorage.getItem(FIRST_SEND_KEY) === '1'; } catch { /* ignore */ }
    if (!alreadyDone) {
      setFirstSendBurst(true);
      setTimeout(() => {
        setFirstSendBurst(false);
        try { localStorage.setItem(FIRST_SEND_KEY, '1'); } catch { /* ignore */ }
      }, 3000);
      toast({
        title: '🔥 First send done.',
        description: "Now you're in motion.",
      });
    } else {
      toast({ title: '✓ Sent', description: 'Check back in 24–48h.' });
    }
  };

  const setReminder = (choice: '24h' | '48h') => {
    const hours = choice === '24h' ? 24 : 48;
    const dueAt = Date.now() + hours * 60 * 60 * 1000;
    try {
      localStorage.setItem(REMINDER_KEY, JSON.stringify({ dueAt, choice, createdAt: Date.now() }));
    } catch { /* ignore */ }
    setReminderChoice(choice);
    toast({ title: 'Reminder set', description: `Check back in ${choice}.` });
  };

  // ─── Completion state ──────────────────────────────────────────────────
  if (alreadyPosted) {
    return (
      <div className="rounded-xl border border-success/40 bg-success/[0.08] p-5 space-y-4">
        {firstSendBurst && (
          <div className="rounded-lg border border-primary/40 bg-primary/[0.08] px-3 py-2.5">
            <p className="text-[12px] font-semibold text-foreground">
              🔥 First send done. Now you're in motion.
            </p>
          </div>
        )}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-foreground font-semibold">✓ Sent</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Check replies later — or send another now.
            </p>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Each message increases your chances of a client.
              {addiction.revenueToday > 0 && (
                <>
                  {' '}
                  <span className="text-success font-semibold">
                    This already made you {formatEUR(addiction.revenueToday)} today.
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Reminder option */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-primary" />
            <p className="label-uppercase text-foreground text-[10px] font-semibold">
              Set a reminder to check results?
            </p>
          </div>
          {reminderChoice ? (
            <p className="text-xs text-success">Reminder set. Check back in {reminderChoice}.</p>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs h-8 border-white/10 flex-1" onClick={() => setReminder('24h')}>
                24h
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-8 border-white/10 flex-1" onClick={() => setReminder('48h')}>
                48h
              </Button>
            </div>
          )}
        </div>

        {/* V10.1 — System 6: Post-send next step (no auto-generate) */}
        <div className="pt-3 border-t border-white/10 space-y-3">
          {postSendChoice === 'done' ? (
            <p className="text-xs text-success">Got it. Come back when you're ready to send another.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Send one more?</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  size="sm"
                  className="cta-primary gap-1.5 flex-1"
                  autoFocus
                  onClick={() => {
                    setPostSendChoice('continue');
                    onGenerateAnother?.();
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate next message
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-white/10"
                  onClick={() => setPostSendChoice('done')}
                >
                  Done for now
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Active Action Layer ───────────────────────────────────────────────
  const sendLabel = (() => {
    if (kind === 'email') return 'Send this by email';
    if (kind === 'dm') return 'Send this as a DM';
    if (kind === 'post') return 'Post this now';
    if (kind === 'ad') return 'Launch or save this ad';
    if (kind === 'comment') return 'Comment this now';
    return 'Send this now';
  })();

  const finalCtaLabel = (() => {
    if (kind === 'post') return 'I posted it';
    if (kind === 'ad') return 'I saved/launched it';
    if (kind === 'comment') return 'I commented';
    return "I've sent it";
  })();

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/[0.08] p-5 space-y-4">
      {/* V10.5 — System 5: Doubter risk reduction copy */}
      <div className="space-y-1">
        <p className="text-[13px] text-foreground font-semibold">Send it to one person first.</p>
        <p className="text-[11px] text-muted-foreground">Improve only after you get replies.</p>
      </div>

      {/* PRIMARY — Copy Message */}
      <div className="space-y-2 pt-1">
        <Button
          size="lg"
          className={`w-full gap-2 cta-primary min-h-[52px] text-base ${copyClicked ? 'opacity-60' : 'pulse-once'}`}
          onClick={() => copy(adText, 'msg')}
          onMouseEnter={dismissNudges}
        >
          {copied === 'msg' || copyClicked ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copyClicked ? 'Copied — send started' : 'Copy Message'}
        </Button>

        {/* Copy CTA — secondary, only before copy */}
        {!copyClicked && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 border-white/10"
            onClick={() => copy(ctaText, 'cta')}
          >
            {copied === 'cta' ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            Copy CTA
          </Button>
        )}

        {/* V10.5 — System 1: Step 2 ready cue */}
        {copyClicked && !sendConfirmed && (
          <p className="text-[12px] text-foreground font-semibold px-1">Step 2 is ready.</p>
        )}

        {/* V10.5 — System 2: Send path card */}
        {sendPathVisible && !sendConfirmed && (
          <div
            ref={sendPathRef}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 mt-1 space-y-2"
            onMouseEnter={dismissNudges}
          >
            <p className="text-[12px] text-foreground font-semibold">Send this now</p>
            <p className="text-[11px] text-muted-foreground">Use the button below. Confirm after you send.</p>

            {kind === 'email' && (
              <>
                <Button
                  size="sm"
                  className="cta-primary gap-1.5 w-full"
                  onClick={() => {
                    dismissNudges();
                    const body = encodeURIComponent(adText);
                    const subject = encodeURIComponent('Quick question');
                    try { window.open(`mailto:?subject=${subject}&body=${body}`, '_blank'); } catch { /* ignore */ }
                  }}
                >
                  <Mail className="w-3.5 h-3.5" /> Open email app
                </Button>
                <p className="text-[11px] text-muted-foreground">Send it there, then tap confirm.</p>
              </>
            )}

            {kind === 'dm' && (
              <>
                <input
                  type="text"
                  value={igUsername}
                  onChange={(e) => setIgUsername(e.target.value)}
                  placeholder="@username (optional)"
                  className="w-full text-xs bg-white/[0.04] border border-white/10 rounded-md px-2.5 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
                />
                <Button
                  size="sm"
                  className="cta-primary gap-1.5 w-full"
                  onClick={() => {
                    dismissNudges();
                    const u = igUsername.trim().replace(/^@/, '');
                    const url = u ? `https://www.instagram.com/${encodeURIComponent(u)}` : 'https://www.instagram.com/';
                    try { window.open(url, '_blank'); } catch { /* ignore */ }
                  }}
                >
                  <Instagram className="w-3.5 h-3.5" /> Open Instagram
                </Button>
                <p className="text-[11px] text-muted-foreground">Paste it there, then tap confirm.</p>
              </>
            )}

            {kind === 'post' && (
              <>
                <Button
                  size="sm"
                  className="cta-primary gap-1.5 w-full"
                  onClick={() => {
                    dismissNudges();
                    try { window.open('https://www.instagram.com/', '_blank'); } catch { /* ignore */ }
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Instagram
                </Button>
                <p className="text-[11px] text-muted-foreground">Post it there, then tap confirm.</p>
              </>
            )}

            {kind === 'ad' && (
              <>
                <Button
                  size="sm"
                  className="cta-primary gap-1.5 w-full"
                  onClick={() => {
                    dismissNudges();
                    try { window.open('https://adsmanager.facebook.com', '_blank'); } catch { /* ignore */ }
                  }}
                >
                  <Megaphone className="w-3.5 h-3.5" /> Open Ads Manager
                </Button>
                <p className="text-[11px] text-muted-foreground">Paste the copy there, then tap confirm.</p>
              </>
            )}

            {kind === 'comment' && (
              <p className="text-[11px] text-muted-foreground">Comment it, then tap confirm.</p>
            )}

            {kind === 'fallback' && (
              <p className="text-[11px] text-muted-foreground">Send it anywhere, then tap confirm.</p>
            )}
          </div>
        )}

        {/* V10.5 — System 4: Lazy microstep */}
        {copyClicked && !sendConfirmed && lazyMsg && (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="text-[12px] text-muted-foreground">{lazyMsg}</p>
          </div>
        )}

        {/* V10.5 — System 6: FINAL CONFIRMATION — only counted send */}
        {copyClicked && !sendConfirmed && (
          <Button
            size="lg"
            className="w-full gap-2 cta-primary min-h-[48px] text-base mt-1"
            onClick={() => { dismissNudges(); handleFinalConfirm(); }}
            disabled={!copyClicked || marking}
          >
            {kind === 'comment' ? <MessageSquare className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {finalCtaLabel}
          </Button>
        )}
      </div>

      {/* Money Path visual */}
      <div className="pt-3 border-t border-white/10 space-y-2">
        <p className="label-uppercase text-foreground text-[10px] font-semibold">▸ How this makes you money</p>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="px-2 py-1 rounded-md bg-white/[0.04] border border-white/10 text-foreground">Send message</span>
          <span className="text-primary">→</span>
          <span className="px-2 py-1 rounded-md bg-white/[0.04] border border-white/10 text-foreground">Get replies</span>
          <span className="text-primary">→</span>
          <span className="px-2 py-1 rounded-md bg-white/[0.04] border border-white/10 text-foreground">Book call</span>
          <span className="text-primary">→</span>
          <span className="px-2 py-1 rounded-md bg-success/15 border border-success/30 text-success font-semibold">Close client</span>
        </div>
      </div>
    </div>
  );
}
