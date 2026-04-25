import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, CheckCircle2, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ActionLayerProps {
  adText: string;
  ctaText: string;
  actionType: string;
  onPosted: () => void;
  alreadyPosted: boolean;
}

const REMINDER_KEY = 'agencyos_reminder';

export default function ActionLayer({ adText, ctaText, actionType, onPosted, alreadyPosted }: ActionLayerProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [reminderChoice, setReminderChoice] = useState<'24h' | '48h' | null>(null);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: 'Copied to clipboard' });
  };

  const handleMarkSent = () => {
    if (marking || alreadyPosted) return;
    setMarking(true);
    onPosted();
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

  // Action-type aware copy
  const verb = /dm|message|email/i.test(actionType) ? 'Send it to 5–10 people' : 'Post it now';
  const channelNoun = /email/i.test(actionType)
    ? 'inbox'
    : /ad/i.test(actionType)
    ? 'ad account'
    : 'feed';

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/[0.08] p-5 space-y-4">
      <div>
        <p className="label-uppercase text-primary text-[11px] font-bold mb-1 tracking-wider">▸ POST THIS NOW — DO NOT OVERTHINK IT</p>
        <p className="text-xs text-muted-foreground">Three steps. Then mark it sent. That's it.</p>
      </div>

      <ol className="space-y-2 text-sm text-foreground">
        <li className="flex gap-2"><span className="text-primary font-semibold">1.</span> Copy this message</li>
        <li className="flex gap-2"><span className="text-primary font-semibold">2.</span> {verb} from your {channelNoun}</li>
        <li className="flex gap-2"><span className="text-primary font-semibold">3.</span> Use the CTA exactly as written</li>
      </ol>

      <p className="text-[12px] text-foreground font-semibold bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2">
        Do not edit it. Just send.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <Button variant="outline" size="sm" className="gap-1.5 border-white/10 flex-1" onClick={() => copy(adText, 'msg')}>
          {copied === 'msg' ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          Copy Message
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 border-white/10 flex-1" onClick={() => copy(ctaText, 'cta')}>
          {copied === 'cta' ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          Copy CTA
        </Button>
        <Button
          size="sm"
          className="gap-1.5 cta-primary flex-1"
          onClick={handleMarkSent}
          disabled={alreadyPosted || marking}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {alreadyPosted ? 'Sent ✓' : 'Mark as Sent'}
        </Button>
      </div>

      {/* Money Path visual (Section 6) */}
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

      {/* Reminder (Section 8) — appears after marking sent */}
      {alreadyPosted && (
        <div className="pt-3 border-t border-white/10 space-y-2">
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-primary" />
            <p className="label-uppercase text-foreground text-[10px] font-semibold">Set a reminder to check results?</p>
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
      )}
    </div>
  );
}
