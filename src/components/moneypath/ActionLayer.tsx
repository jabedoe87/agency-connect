import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, CheckCircle2, Bell, Send, Sparkles, ExternalLink, Mail, Instagram, Megaphone, MessageSquare } from 'lucide-react';
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
const IDLE_FLAG_KEY = 'agencyos_idle_pressure_shown';
const FIRST_SEND_KEY = 'agencyos_first_send_done'; // V8.3 — Fix 7

// V8.4 — categorize action for low-friction validation
type ActionKind = 'email' | 'dm' | 'post' | 'ad' | 'comment' | 'fallback';
function actionKindOf(actionType: string): ActionKind {
  if (/email/i.test(actionType)) return 'email';
  if (/dm|message/i.test(actionType)) return 'dm';
  if (/post|story/i.test(actionType)) return 'post';
  if (/ad/i.test(actionType)) return 'ad';
  if (/comment/i.test(actionType)) return 'comment';
  return 'fallback';
}

// CTA Command System (Section 8) — direct commands, no choices
function commandFor(actionType: string): string {
  if (/dm|message/i.test(actionType)) return 'Send this as a DM right now';
  if (/email/i.test(actionType)) return 'Send this as an email right now';
  if (/post/i.test(actionType)) return 'Post this right now';
  if (/story/i.test(actionType)) return 'Share this in your story right now';
  if (/ad/i.test(actionType)) return 'Run this as an ad right now';
  return 'Send this right now';
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
  const [copied, setCopied] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false); // Section 5 — copy must happen first
  const [validationComplete, setValidationComplete] = useState(false); // V8.4 — action launched/confirmed
  const [marking, setMarking] = useState(false);
  const [reminderChoice, setReminderChoice] = useState<'24h' | '48h' | null>(null);
  const [idlePressure, setIdlePressure] = useState(false);
  const [postSendChoice, setPostSendChoice] = useState<null | 'continue' | 'done'>(null);
  const [firstSendBurst, setFirstSendBurst] = useState(false); // V8.3 — Fix 7

  const kind = actionKindOf(actionType);
  const [emailRecipient, setEmailRecipient] = useState(''); // V8.4 — optional

  // Section 7 — idle pressure after 7s, once per session, vanishes on interaction
  useEffect(() => {
    if (alreadyPosted) return;
    let shownThisSession = false;
    try { shownThisSession = sessionStorage.getItem(IDLE_FLAG_KEY) === '1'; } catch { /* ignore */ }
    if (shownThisSession) return;

    const t = setTimeout(() => {
      if (!hasCopied && !alreadyPosted) {
        setIdlePressure(true);
        try { sessionStorage.setItem(IDLE_FLAG_KEY, '1'); } catch { /* ignore */ }
      }
    }, 7000);
    return () => clearTimeout(t);
  }, [hasCopied, alreadyPosted]);

  const dismissIdle = () => setIdlePressure(false);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setHasCopied(true);
    dismissIdle();
    setTimeout(() => setCopied(null), 2000);
    toast({
      title: key === 'cta' ? '✓ CTA copied — ready to send' : '✓ Message copied — ready to send',
    });
  };

  const handleMarkSent = () => {
    if (marking || alreadyPosted || !hasCopied || !validationComplete) return;
    setMarking(true);
    dismissIdle();
    onPosted();

    // V8.3 — Fix 7 / V8.4: first-send reward (once, 4s, persisted)
    let alreadyDone = false;
    try { alreadyDone = localStorage.getItem(FIRST_SEND_KEY) === '1'; } catch { /* ignore */ }
    if (!alreadyDone) {
      try { localStorage.setItem(FIRST_SEND_KEY, '1'); } catch { /* ignore */ }
      setFirstSendBurst(true);
      setTimeout(() => setFirstSendBurst(false), 4000);
      toast({
        title: '🔥 You just did what most users never do',
        description: 'This is how clients start.',
      });
    } else {
      toast({ title: '✓ You took action', description: 'Now check back in 24–48h.' });
    }
  };

  const setReminder = (choice: '24h' | '48h') => {
    const hours = choice === '24h' ? 24 : 48;
    const dueAt = Date.now() + hours * 60 * 60 * 1000;
    try {
      localStorage.setItem(
        REMINDER_KEY,
        JSON.stringify({ dueAt, choice, createdAt: Date.now() })
      );
    } catch {
      // ignore quota errors
    }
    setReminderChoice(choice);
    toast({ title: 'Reminder set', description: `Check back in ${choice}.` });
  };

  const command = commandFor(actionType);

  // ─── Section 9 — Completion state replaces the entire Action Layer ─────
  if (alreadyPosted) {
    return (
      <div className="rounded-xl border border-success/40 bg-success/[0.08] p-5 space-y-4">
        {/* V8.3 — Fix 7: First-send reward (auto-hides 3s, shown once) */}
        {firstSendBurst && (
          <div className="rounded-lg border border-primary/40 bg-primary/[0.08] px-3 py-2.5">
            <p className="text-[12px] font-semibold text-foreground">
              🔥 You just did what most users never do — this is how clients start
            </p>
          </div>
        )}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-foreground font-semibold">✓ Message sent</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Check replies later — or send another now.
            </p>
            {/* V5.1 — System 6: Action → Money link */}
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

        {/* Reminder option (Section 8) — kept as light tracking */}
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

        {/* Section 6 — feedback loop after "I've sent it" */}
        <div className="pt-3 border-t border-white/10 space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">🔥 You took action — you're ahead of most users.</p>
            <p className="text-xs text-muted-foreground mt-1">You are now in the game. Replies start here.</p>
          </div>

          {postSendChoice === 'done' ? (
            <p className="text-xs text-success">Got it. Come back when you're ready to send another.</p>
          ) : (
            <div className="space-y-2">
              <p className="label-uppercase text-foreground text-[10px] font-semibold">Next message?</p>
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
                  Generate another
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
  return (
    <div className="rounded-xl border border-primary/40 bg-primary/[0.08] p-5 space-y-4">
      {/* Section 2 — title + action pressure */}
      <div className="space-y-1.5">
        <p className="label-uppercase text-primary text-[11px] font-bold tracking-wider">▸ POST THIS NOW</p>
        <p className="text-xs text-muted-foreground">Three steps. Then mark it sent. That's it.</p>
      </div>

      <ol className="space-y-2 text-sm text-foreground">
        <li className="flex gap-2"><span className="text-primary font-semibold">1.</span> Copy this message</li>
        <li className="flex gap-2"><span className="text-primary font-semibold">2.</span> {command}</li>
        <li className="flex gap-2"><span className="text-primary font-semibold">3.</span> Use the CTA exactly as written</li>
      </ol>

      {/* Section 2 — pressure block */}
      <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 space-y-1">
        <p className="text-[12px] text-foreground font-semibold">Most people won't send this. That's why they don't get clients.</p>
        <p className="text-[11px] text-muted-foreground">If you wait, this does nothing.</p>
      </div>

      {/* Section 1 — suppress editing */}
      <div className="text-[11px] text-muted-foreground italic leading-relaxed">
        Do not edit this. It's optimized for replies.<br />
        Messages like this are sent daily by people getting clients.
      </div>

      {/* Section 3 — Button hierarchy */}
      <div className="space-y-2 pt-1">
        {/* PRIMARY — Copy Message (largest, primary color, one-time pulse) */}
        <Button
          size="lg"
          className={`w-full gap-2 cta-primary min-h-[52px] text-base ${!hasCopied ? 'pulse-once' : ''}`}
          onClick={() => copy(adText, 'msg')}
          onMouseEnter={dismissIdle}
        >
          {copied === 'msg' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied === 'msg' ? 'Copied ✓' : 'Copy Message'}
        </Button>

        {/* V8.3 — Fix 3: Copy dominance reinforcement */}
        {!hasCopied && (
          <p className="text-[11px] text-muted-foreground leading-snug px-1">
            Most users stop here.<br />
            The ones who send get clients.
          </p>
        )}

        {/* SECONDARY — Copy CTA */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 border-white/10"
          onClick={() => copy(ctaText, 'cta')}
        >
          {copied === 'cta' ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          Copy CTA
        </Button>

        {/* Section 4 — Post-copy commitment prompt (V8.3 — Fix 4: exact "5 people") */}
        {hasCopied && (
          <div className="rounded-lg border border-primary/30 bg-primary/[0.06] px-3 py-2.5 mt-1">
            <p className="text-[12px] text-foreground font-semibold flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-primary" />
              Now send this to 5 people.
            </p>
          </div>
        )}

        {/* V8.4 — Action Validator (low-friction, action-type aware) */}
        {hasCopied && !validationComplete && (
          <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 mt-1 space-y-2">
            <p className="text-[11px] text-muted-foreground">
              One quick step — then mark it sent.
            </p>

            {kind === 'email' && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="Add recipient (optional)"
                  className="w-full text-xs bg-white/[0.04] border border-white/10 rounded-md px-2.5 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
                />
                <Button
                  size="sm"
                  className="cta-primary gap-1.5 w-full"
                  onClick={() => {
                    const to = emailRecipient.trim();
                    const body = encodeURIComponent(adText);
                    const subject = encodeURIComponent(ctaText.slice(0, 60) || 'Quick note');
                    const href = `mailto:${to}?subject=${subject}&body=${body}`;
                    try { window.open(href, '_blank'); } catch { /* ignore */ }
                    setValidationComplete(true);
                  }}
                >
                  <Mail className="w-3.5 h-3.5" /> Open Email App
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Send it from your email app, then confirm.
                </p>
              </div>
            )}

            {kind === 'dm' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  size="sm"
                  className="cta-primary gap-1.5"
                  onClick={() => {
                    try { window.open('https://www.instagram.com/direct/inbox/', '_blank'); } catch { /* ignore */ }
                    setValidationComplete(true);
                  }}
                >
                  <Instagram className="w-3.5 h-3.5" /> Open Instagram DM
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 gap-1.5"
                  onClick={() => setValidationComplete(true)}
                >
                  I'll send it manually
                </Button>
              </div>
            )}

            {kind === 'post' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 gap-1.5"
                  onClick={() => copy(adText, 'msg')}
                >
                  <Copy className="w-3.5 h-3.5" /> Copy caption
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 gap-1.5"
                  onClick={() => {
                    try { window.open('https://www.instagram.com/', '_blank'); } catch { /* ignore */ }
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Instagram
                </Button>
                <Button
                  size="sm"
                  className="cta-primary gap-1.5"
                  onClick={() => setValidationComplete(true)}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> I posted it
                </Button>
              </div>
            )}

            {kind === 'ad' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 gap-1.5"
                  onClick={() => {
                    try { window.open('https://www.facebook.com/adsmanager/', '_blank'); } catch { /* ignore */ }
                  }}
                >
                  <Megaphone className="w-3.5 h-3.5" /> Open Ads Manager
                </Button>
                <Button
                  size="sm"
                  className="cta-primary gap-1.5"
                  onClick={() => setValidationComplete(true)}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> I launched it
                </Button>
              </div>
            )}

            {kind === 'comment' && (
              <Button
                size="sm"
                className="cta-primary gap-1.5 w-full"
                onClick={() => setValidationComplete(true)}
              >
                <MessageSquare className="w-3.5 h-3.5" /> I commented
              </Button>
            )}

            {kind === 'fallback' && (
              <Button
                size="sm"
                className="cta-primary gap-1.5 w-full"
                onClick={() => setValidationComplete(true)}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> I sent it somewhere
              </Button>
            )}
          </div>
        )}

        {/* V8.4 — confirmation hint once validated */}
        {hasCopied && validationComplete && (
          <p className="text-[11px] text-success font-medium px-1">
            ✓ Action confirmed — now mark it sent.
          </p>
        )}

        {/* FINAL — I've sent it (locked until Copy + Validation complete) */}
        <Button
          size="lg"
          className="w-full gap-2 cta-primary min-h-[48px] text-base mt-1"
          onClick={handleMarkSent}
          disabled={!hasCopied || !validationComplete || marking}
        >
          <CheckCircle2 className="w-4 h-4" />
          I've sent it
        </Button>
      </div>

      {/* Money Path visual (Section 6 of V2 — kept) */}
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

      {/* Section 7 — idle pressure (inline, dismissable, once per session) */}
      {idlePressure && !hasCopied && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2.5">
          <p className="text-[12px] text-destructive font-semibold">No message sent = zero chance of a client.</p>
        </div>
      )}
    </div>
  );
}
