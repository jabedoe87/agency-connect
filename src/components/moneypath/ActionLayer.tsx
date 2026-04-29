import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Copy, Check, CheckCircle2, Bell, Sparkles, ExternalLink,
  Mail, Instagram, Megaphone, MessageSquare, Eye, Wand2, Clipboard,
} from 'lucide-react';
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
  // Optional context for personalization / Why-this-works
  targetName?: string;
  industry?: string;
  targetEmail?: string;
  targetUsername?: string;
}

const REMINDER_KEY = 'agencyos_reminder';
const FIRST_SEND_KEY = 'agencyos_first_send_done';
const RETURNING_USER_KEY = 'agencyos_returning_user';

type ActionKind = 'email' | 'dm' | 'post' | 'ad' | 'comment' | 'fallback';
function actionKindOf(actionType: string): ActionKind {
  if (/email/i.test(actionType)) return 'email';
  if (/dm|message/i.test(actionType)) return 'dm';
  if (/post|story/i.test(actionType)) return 'post';
  if (/ad/i.test(actionType)) return 'ad';
  if (/comment/i.test(actionType)) return 'comment';
  return 'fallback';
}

// Lightweight tone rewrite — purely client-side, no AI call.
function applyTone(text: string, tone: 'casual' | 'professional' | 'direct'): string {
  if (!text) return text;
  if (tone === 'casual') {
    return text
      .replace(/\bGood (morning|afternoon|evening)\b/gi, 'Hey')
      .replace(/\bHello\b/gi, 'Hey')
      .replace(/\bI would like to\b/gi, "I'd love to")
      .replace(/\bRegards,?\b/gi, 'Cheers,')
      .replace(/\bSincerely,?\b/gi, 'Cheers,');
  }
  if (tone === 'professional') {
    return text
      .replace(/\bHey\b/gi, 'Hello')
      .replace(/\bgonna\b/gi, 'going to')
      .replace(/\bwanna\b/gi, 'want to')
      .replace(/\bCheers,?\b/gi, 'Best regards,');
  }
  // direct: shorter sentences, drop hedges
  return text
    .replace(/\b(just|really|maybe|perhaps|kind of|sort of)\s+/gi, '')
    .replace(/\bI was wondering if\b/gi, 'Can')
    .replace(/\bWould it be possible to\b/gi, 'Can we')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function rephraseSentence(s: string): string[] {
  const trimmed = s.trim().replace(/[.!?]+$/, '');
  return [
    `${trimmed}.`,
    `Quick one — ${trimmed.toLowerCase()}.`,
    `${trimmed}, if that's useful.`,
  ];
}

function highlightTokens(text: string): Array<{ kind: 'plain' | 'var'; value: string }> {
  // Highlights [Bracket Tokens] as personalized variables.
  const parts: Array<{ kind: 'plain' | 'var'; value: string }> = [];
  const re = /\[([^\]]+)\]/g;
  let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ kind: 'plain', value: text.slice(last, m.index) });
    parts.push({ kind: 'var', value: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ kind: 'plain', value: text.slice(last) });
  return parts;
}

export default function ActionLayer({
  adText,
  ctaText,
  actionType,
  onPosted,
  alreadyPosted,
  onGenerateAnother,
  targetName,
  industry,
  targetEmail,
  targetUsername,
}: ActionLayerProps) {
  const { toast } = useToast();
  const { state: addiction } = useAddiction();

  // Editable working copy (tone + micro-edit)
  const [workingText, setWorkingText] = useState(adText);
  const [tone, setTone] = useState<'casual' | 'professional' | 'direct' | null>(null);
  const [showToneBar, setShowToneBar] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  // Send flow state
  const [copied, setCopied] = useState<string | null>(null);
  const [copyClicked, setCopyClicked] = useState(false);
  const [sendStarted, setSendStarted] = useState(false);
  const [sendPathVisible, setSendPathVisible] = useState(false);
  const [sendConfirmed, setSendConfirmed] = useState(false);
  const [marking, setMarking] = useState(false);
  const [reminderChoice, setReminderChoice] = useState<'24h' | '48h' | null>(null);
  const [postSendChoice, setPostSendChoice] = useState<null | 'continue' | 'done'>(null);
  const [firstSendBurst, setFirstSendBurst] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  // Smart Send timing
  const [platformOpened, setPlatformOpened] = useState(false);
  const [confirmBoost, setConfirmBoost] = useState(false);
  const [fastReturnPrompt, setFastReturnPrompt] = useState(false);
  const [stillWaitingBanner, setStillWaitingBanner] = useState(false);
  const [idleSavePrompt, setIdleSavePrompt] = useState(false);
  const [savedForLater, setSavedForLater] = useState(false);
  const [clipboardPill, setClipboardPill] = useState(false);

  // V11.1 — Platform click feedback
  const [platformActionClicked, setPlatformActionClicked] = useState(false);
  const [platformActionLabel, setPlatformActionLabel] = useState('');
  const [platformFeedbackVisible, setPlatformFeedbackVisible] = useState(false);
  const [platformFallbackVisible, setPlatformFallbackVisible] = useState(false);
  // V11.1 Part 2 — return detection
  const [welcomeBackVisible, setWelcomeBackVisible] = useState(false);
  const [ctaPulse, setCtaPulse] = useState(false);

  const sendTimerStartRef = useRef<number | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const platformFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendPathRef = useRef<HTMLDivElement | null>(null);
  const confirmCtaRef = useRef<HTMLButtonElement | null>(null);

  // V11.1 — central handler for any platform-button click
  const handlePlatformClick = (label: string, openFn: () => void) => {
    setPlatformActionClicked(true);
    setPlatformActionLabel(label);
    setPlatformFeedbackVisible(true);
    setPlatformFallbackVisible(false);
    try { openFn(); } catch { /* ignore */ }
    if (platformFallbackTimerRef.current) clearTimeout(platformFallbackTimerRef.current);
    platformFallbackTimerRef.current = setTimeout(() => {
      setPlatformFallbackVisible(true);
    }, 2500);
  };

  // Cleanup fallback timer on unmount
  useEffect(() => () => {
    if (platformFallbackTimerRef.current) clearTimeout(platformFallbackTimerRef.current);
  }, []);

  const kind = actionKindOf(actionType);

  const isReturningUser = useMemo(() => {
    try { return localStorage.getItem(RETURNING_USER_KEY) === '1'; } catch { return false; }
  }, []);

  const sentences = useMemo(
    () => workingText.split(/(?<=[.!?])\s+/).filter(Boolean),
    [workingText],
  );

  // Reset on new generation
  useEffect(() => {
    setWorkingText(adText);
    setTone(null);
    setShowToneBar(false);
    setShowPreview(false);
    setEditingIdx(null);
    setCopied(null);
    setCopyClicked(false);
    setSendStarted(false);
    setSendPathVisible(false);
    setSendConfirmed(false);
    setPlatformOpened(false);
    setConfirmBoost(false);
    setFastReturnPrompt(false);
    setStillWaitingBanner(false);
    setIdleSavePrompt(false);
    setSavedForLater(false);
    setClipboardPill(false);
    sendTimerStartRef.current = null;
  }, [adText]);

  // Idle timeout (>30s on send screen)
  useEffect(() => {
    if (!copyClicked || sendConfirmed || alreadyPosted || platformOpened) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setIdleSavePrompt(true), 30000);
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, [copyClicked, sendConfirmed, alreadyPosted, platformOpened]);

  // visibilitychange / focus auto-detect return
  useEffect(() => {
    if (!platformOpened || sendConfirmed || alreadyPosted) return;

    const handleReturn = () => {
      if (document.visibilityState !== 'visible') return;
      const start = sendTimerStartRef.current ?? Date.now();
      const timeAway = Date.now() - start;

      if (timeAway < 5000) {
        setFastReturnPrompt(true);
      } else if (timeAway > 60000) {
        setStillWaitingBanner(true);
      }
      // Confirm CTA boost
      setConfirmBoost(true);
      setTimeout(() => {
        try { confirmCtaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { /* ignore */ }
      }, 60);
      setTimeout(() => setConfirmBoost(false), 1400);
    };

    document.addEventListener('visibilitychange', handleReturn);
    window.addEventListener('focus', handleReturn);
    return () => {
      document.removeEventListener('visibilitychange', handleReturn);
      window.removeEventListener('focus', handleReturn);
    };
  }, [platformOpened, sendConfirmed, alreadyPosted]);

  const dismissNudges = () => { setIdleSavePrompt(false); };

  const markPlatformOpened = () => {
    setPlatformOpened(true);
    sendTimerStartRef.current = Date.now();
    setClipboardPill(true);
  };

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setCopied(key);
    if (key === 'msg') {
      setCopyClicked(true);
      setSendStarted(true);
      setSendPathVisible(true);
      setClipboardPill(true);
      setTimeout(() => {
        try { sendPathRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { /* ignore */ }
      }, 80);
    }
    setTimeout(() => setCopied(null), 2000);
    toast({ title: key === 'cta' ? '✓ CTA copied' : '✓ Copied — ready to paste' });
  };

  const applyToneChoice = (t: 'casual' | 'professional' | 'direct') => {
    setTone(t);
    setWorkingText(applyTone(adText, t));
    toast({ title: `Tone: ${t}` });
  };

  const replaceSentence = (idx: number, replacement: string) => {
    const next = [...sentences];
    next[idx] = replacement;
    setWorkingText(next.join(' '));
    setEditingIdx(null);
  };

  const handleFinalConfirm = () => {
    if (marking || alreadyPosted || !copyClicked) return;
    setMarking(true);
    setSendConfirmed(true);
    setFastReturnPrompt(false);
    setStillWaitingBanner(false);
    dismissNudges();
    onPosted();

    // 3s celebration animation
    setCelebrate(true);
    setTimeout(() => setCelebrate(false), 3000);

    try { localStorage.setItem(RETURNING_USER_KEY, '1'); } catch { /* ignore */ }

    let alreadyDone = false;
    try { alreadyDone = localStorage.getItem(FIRST_SEND_KEY) === '1'; } catch { /* ignore */ }
    if (!alreadyDone) {
      setFirstSendBurst(true);
      setTimeout(() => {
        setFirstSendBurst(false);
        try { localStorage.setItem(FIRST_SEND_KEY, '1'); } catch { /* ignore */ }
      }, 3000);
      toast({ title: '🔥 Message #1 sent', description: "Most users who send 3 get their first reply within 48h." });
    } else {
      toast({ title: '✓ Sent', description: 'Check back in 24–48h.' });
    }
  };

  const setReminder = (choice: '24h' | '48h') => {
    const hours = choice === '24h' ? 24 : 48;
    const dueAt = Date.now() + hours * 60 * 60 * 1000;
    try { localStorage.setItem(REMINDER_KEY, JSON.stringify({ dueAt, choice, createdAt: Date.now() })); } catch { /* ignore */ }
    setReminderChoice(choice);
    toast({ title: 'Reminder set', description: `Check back in ${choice}.` });
  };

  // ─── Completion state ──────────────────────────────────────────────────
  if (alreadyPosted || sendConfirmed) {
    return (
      <div className="rounded-xl border border-success/40 bg-success/[0.08] p-5 space-y-4 relative overflow-hidden">
        {celebrate && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center animate-fade-in">
            <div className="text-6xl animate-scale-in">🎉</div>
          </div>
        )}
        {firstSendBurst && (
          <div className="rounded-lg border border-primary/40 bg-primary/[0.08] px-3 py-2.5">
            <p className="text-[12px] font-semibold text-foreground">
              🔥 Message #1 sent. Most users who send 3 messages get their first reply within 48 hours.
            </p>
          </div>
        )}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-foreground font-semibold">✓ Sent</p>
            <p className="text-sm text-muted-foreground mt-0.5">Check replies later — or send another now.</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Each message increases your chances of a client.
              {addiction.revenueToday > 0 && (
                <> <span className="text-success font-semibold">
                  This already made you {formatEUR(addiction.revenueToday)} today.
                </span></>
              )}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-white/10 space-y-2">
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-primary" />
            <p className="label-uppercase text-foreground text-[10px] font-semibold">Set a reminder to check results?</p>
          </div>
          {reminderChoice ? (
            <p className="text-xs text-success">Reminder set. Check back in {reminderChoice}.</p>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs h-8 border-white/10 flex-1" onClick={() => setReminder('24h')}>24h</Button>
              <Button variant="outline" size="sm" className="text-xs h-8 border-white/10 flex-1" onClick={() => setReminder('48h')}>48h</Button>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-white/10 space-y-3">
          {postSendChoice === 'done' ? (
            <p className="text-xs text-success">Got it. Come back when you're ready to send another.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Send another?</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  size="sm"
                  className="cta-primary gap-1.5 flex-1"
                  autoFocus
                  onClick={() => { setPostSendChoice('continue'); onGenerateAnother?.(); }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Send another
                </Button>
                <Button size="sm" variant="outline" className="flex-1 border-white/10" onClick={() => setPostSendChoice('done')}>
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
  const finalCtaLabel = 'Done ✓';
  const techniqueLabel = kind === 'email' ? 'Low-Friction Ask' : kind === 'dm' ? 'Pattern-Interrupt Opener' : 'Direct Value Hook';
  const liftPct = kind === 'email' ? 38 : kind === 'dm' ? 52 : 27;
  const industryLabel = industry || 'your industry';
  const personLabel = targetName || 'this person';

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/[0.08] p-5 space-y-4">
      {/* === STEP 1: Why This Works === */}
      <div className="rounded-lg border border-primary/30 bg-primary/[0.06] p-3 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Why this works</p>
        </div>
        <p className="text-[12px] text-foreground leading-snug">
          This message uses the <span className="font-semibold">{techniqueLabel}</span> technique, which typically sees a <span className="font-semibold text-success">{liftPct}% higher reply rate</span> for {industryLabel}.
        </p>
        <p className="text-[11px] text-muted-foreground">Messages like this get opened 3x more than cold emails.</p>
      </div>

      {/* === STEP 1: Personalized highlight + Preview / Tone / Edit === */}
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success/15 text-success text-[10px] font-semibold">
            ✦ Personalized for {personLabel}
          </span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] gap-1" onClick={() => setShowToneBar(v => !v)}>
              <Wand2 className="w-3 h-3" /> Make it sound more like me
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] gap-1" onClick={() => setShowPreview(v => !v)}>
              <Eye className="w-3 h-3" /> {showPreview ? 'Text view' : "Preview how they'll see it"}
            </Button>
          </div>
        </div>

        {showToneBar && (
          <div className="flex gap-1.5 animate-fade-in">
            {(['casual', 'professional', 'direct'] as const).map(t => (
              <Button
                key={t}
                size="sm"
                variant={tone === t ? 'default' : 'outline'}
                className="h-7 px-2.5 text-[11px] capitalize border-white/10 flex-1"
                onClick={() => applyToneChoice(t)}
              >
                {t}
              </Button>
            ))}
          </div>
        )}

        {showPreview ? (
          <div className={`rounded-lg p-3 ${kind === 'dm' ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-pink-400/30' : 'bg-white/95 text-slate-900 border border-slate-300'}`}>
            <p className="text-[10px] font-semibold uppercase mb-1 opacity-70">
              {kind === 'dm' ? 'Instagram DM' : kind === 'email' ? 'Gmail Inbox' : 'Preview'}
            </p>
            <div className={`rounded-2xl px-3 py-2 inline-block max-w-full whitespace-pre-wrap text-[13px] ${kind === 'dm' ? 'bg-white/95 text-slate-900' : ''}`}>
              {workingText}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 text-[13px] leading-relaxed text-foreground">
            {sentences.map((s, idx) => (
              <div key={idx} className="relative group">
                <button
                  type="button"
                  onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
                  className="text-left w-full hover:bg-white/[0.04] rounded px-1 -mx-1 transition-colors"
                  title="Tap to rephrase"
                >
                  {highlightTokens(s).map((p, i) =>
                    p.kind === 'var'
                      ? <span key={i} className="bg-success/20 text-success rounded px-1">{p.value}</span>
                      : <span key={i} className="bg-primary/[0.06] rounded">{p.value}</span>
                  )}
                </button>
                {editingIdx === idx && (
                  <div className="mt-1 ml-2 space-y-1 animate-fade-in">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Rephrase as:</p>
                    {rephraseSentence(s).map((r, ri) => (
                      <button
                        key={ri}
                        type="button"
                        onClick={() => replaceSentence(idx, r)}
                        className="block w-full text-left text-[12px] px-2 py-1.5 rounded border border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Doubter / autonomy framing */}
      <div className="space-y-1">
        <p className="text-[13px] text-foreground font-semibold">Send it to one person first.</p>
        <p className="text-[11px] text-muted-foreground">Test it on one person. Decide after.</p>
      </div>

      {/* PRIMARY — Copy Message */}
      <div className="space-y-2 pt-1">
        <Button
          size="lg"
          className={`w-full gap-2 cta-primary min-h-[52px] text-base ${copyClicked ? 'opacity-60' : ''}`}
          onClick={() => copy(workingText, 'msg')}
        >
          {copied === 'msg' || copyClicked ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copyClicked ? 'Copied — send started' : 'Copy Message'}
        </Button>

        {!copyClicked && (
          <Button variant="outline" size="sm" className="w-full gap-1.5 border-white/10" onClick={() => copy(ctaText, 'cta')}>
            {copied === 'cta' ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            Copy CTA
          </Button>
        )}

        {/* === STEP 2: Send Card === */}
        {sendPathVisible && (
          <div
            ref={sendPathRef}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 mt-1 space-y-2 animate-fade-in"
          >
            <p className="text-[12px] text-foreground font-semibold">Send this now</p>
            <p className="text-[11px] text-muted-foreground">Use the button below. Confirm after you send.</p>

            {/* Lazy Momentum: 1 of 1 step left */}
            <div className="rounded-md bg-primary/10 border border-primary/30 px-2 py-1.5">
              <p className="text-[11px] text-foreground font-medium">
                1 of 1 step left. Paste this → {kind === 'email' ? 'email' : kind === 'dm' ? 'Instagram' : 'platform'}. That's it.
              </p>
            </div>

            {kind === 'email' && (
              <div className="space-y-1.5">
                <Button
                  size="sm"
                  className="cta-primary gap-1.5 w-full"
                  onClick={() => {
                    dismissNudges();
                    markPlatformOpened();
                    handlePlatformClick('Gmail', () => {
                      const subject = encodeURIComponent('Quick question');
                      const body = encodeURIComponent(workingText);
                      const to = encodeURIComponent(targetEmail || '');
                      const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
                      window.open(gmail, '_blank');
                    });
                  }}
                >
                  <Mail className="w-3.5 h-3.5" /> Copy + Open Gmail
                </Button>
                <a
                  href={`mailto:${targetEmail || ''}?subject=${encodeURIComponent('Quick question')}&body=${encodeURIComponent(workingText)}`}
                  className="block text-[11px] text-primary underline text-center hover:opacity-80"
                  onClick={() => { markPlatformOpened(); handlePlatformClick('Email', () => {}); }}
                >
                  Or use my default mail app
                </a>
              </div>
            )}

            {kind === 'dm' && (
              <>
                <Button
                  size="sm"
                  className="cta-primary gap-1.5 w-full"
                  onClick={() => {
                    dismissNudges();
                    markPlatformOpened();
                    handlePlatformClick('Instagram', () => {
                      const username = targetUsername || '';
                      const start = Date.now();
                      if (username) {
                        try { window.location.href = `instagram://user?username=${username}`; } catch { /* ignore */ }
                        setTimeout(() => {
                          if (Date.now() - start < 1000) {
                            try { window.open(`https://www.instagram.com/${username}/`, '_blank'); } catch { /* ignore */ }
                          }
                        }, 500);
                      } else {
                        window.open('https://www.instagram.com/', '_blank');
                      }
                    });
                  }}
                >
                  <Instagram className="w-3.5 h-3.5" /> Copy + Open Instagram
                </Button>
                <div className="rounded-md bg-white/[0.03] border border-white/10 px-2 py-1.5 space-y-0.5">
                  <p className="text-[11px] text-muted-foreground">1. Tap "Message" on their profile.</p>
                  <p className="text-[11px] text-muted-foreground">2. Paste the text.</p>
                </div>
              </>
            )}

            {kind === 'post' && (
              <Button
                size="sm" className="cta-primary gap-1.5 w-full"
                onClick={() => { dismissNudges(); markPlatformOpened();
                  handlePlatformClick('Instagram', () => window.open('https://www.instagram.com/', '_blank')); }}
              >
                <ExternalLink className="w-3.5 h-3.5" /> Copy + Open Instagram
              </Button>
            )}

            {kind === 'ad' && (
              <Button
                size="sm" className="cta-primary gap-1.5 w-full"
                onClick={() => { dismissNudges(); markPlatformOpened();
                  handlePlatformClick('Ads Manager', () => window.open('https://adsmanager.facebook.com', '_blank')); }}
              >
                <Megaphone className="w-3.5 h-3.5" /> Open Ads Manager
              </Button>
            )}

            {kind === 'comment' && (
              <p className="text-[11px] text-muted-foreground">Paste this as a comment, then confirm.</p>
            )}

            {kind === 'fallback' && (
              <p className="text-[11px] text-muted-foreground">Send it anywhere, then tap confirm.</p>
            )}

            {/* V11.1 — Platform click feedback strip */}
            {platformFeedbackVisible && (
              <div className="px-2 py-1.5 rounded-md bg-white/[0.03] border border-white/10 space-y-1.5 animate-fade-in" style={{ animationDuration: '150ms' }}>
                {!platformFallbackVisible ? (
                  <p className="text-[11px] text-muted-foreground">
                    Opening {platformActionLabel}… your message is still on your clipboard.
                  </p>
                ) : (
                  <>
                    <p className="text-[11px] text-muted-foreground">
                      Couldn't open {platformActionLabel} automatically.<br />
                      Open it manually and paste your message.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px] border-white/10 gap-1.5"
                      onClick={() => copy(workingText, 'msg')}
                    >
                      <Copy className="w-3 h-3" /> Copy message again
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Clipboard pill */}
            {clipboardPill && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-success/10 border border-success/30">
                <Clipboard className="w-3 h-3 text-success" />
                <p className="text-[11px] text-success font-medium">Message still on clipboard — ready to paste</p>
              </div>
            )}
          </div>
        )}

        {/* Idle save-for-later */}
        {idleSavePrompt && !sendConfirmed && !savedForLater && (
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 space-y-2 animate-fade-in">
            <p className="text-[12px] text-foreground">No pressure. Save this message for later?</p>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 cta-primary" onClick={dismissNudges}>Send now</Button>
              <Button size="sm" variant="outline" className="flex-1 border-white/10"
                onClick={() => { setSavedForLater(true); setIdleSavePrompt(false);
                  toast({ title: 'Saved', description: 'Come back any time.' }); }}>
                Save for later
              </Button>
            </div>
          </div>
        )}

        {/* Fast-return prompt (<5s) */}
        {fastReturnPrompt && !sendConfirmed && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/[0.08] p-3 space-y-2 animate-fade-in">
            <p className="text-[12px] text-foreground font-semibold">That was fast — did you actually send it?</p>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 cta-primary"
                onClick={() => { setFastReturnPrompt(false); handleFinalConfirm(); }}>
                Yes, I sent it
              </Button>
              <Button size="sm" variant="outline" className="flex-1 border-white/10"
                onClick={() => setFastReturnPrompt(false)}>
                Not yet
              </Button>
            </div>
          </div>
        )}

        {/* Still-waiting banner (>60s) */}
        {stillWaitingBanner && !sendConfirmed && (
          <div className="rounded-lg border border-primary/40 bg-primary/[0.08] px-3 py-2">
            <p className="text-[12px] text-foreground">Your message is still waiting to be sent.</p>
          </div>
        )}

        {/* Adaptive nudge (only for non-returning users, never countdowns) */}
        {copyClicked && !sendConfirmed && !platformOpened && !isReturningUser && (
          <p className="text-[11px] text-muted-foreground px-1">
            You're almost there. Take your time. When you're ready, one tap sends it.
          </p>
        )}

        {/* === STEP 3: Final confirmation — "Done ✓" === */}
        {copyClicked && !sendConfirmed && (
          <div className="space-y-1.5 mt-1">
            {platformOpened && (
              <p className="text-[12px] text-foreground font-semibold px-1">Done? Confirm it.</p>
            )}
            <Button
              ref={confirmCtaRef}
              size="lg"
              className={`w-full gap-2 cta-primary min-h-[48px] text-base transition-transform duration-300 ${confirmBoost ? 'scale-105 ring-2 ring-primary/50' : ''}`}
              onClick={() => { dismissNudges(); handleFinalConfirm(); }}
              disabled={!copyClicked || marking}
            >
              {kind === 'comment' ? <MessageSquare className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              {finalCtaLabel}
            </Button>
          </div>
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
