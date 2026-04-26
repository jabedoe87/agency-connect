import { useEffect, useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { useAddiction } from '@/hooks/useAddiction';
import { formatEUR, todayStr } from '@/lib/addiction';

const DISMISS_KEY = 'agencyos_yesterday_dismissed';

/**
 * V5.1 — System 5: Yesterday Summary.
 * Shows once per day until dismissed. Hidden when yesterday had no activity.
 */
export default function YesterdaySummary() {
  const { state } = useAddiction();
  const { yesterdaySnapshot } = state;
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let dismissedToday = '';
    try {
      dismissedToday = localStorage.getItem(DISMISS_KEY) ?? '';
    } catch {
      /* ignore */
    }
    setDismissed(dismissedToday === todayStr());
  }, []);

  const had = yesterdaySnapshot.messagesSent > 0 || yesterdaySnapshot.replies > 0 || yesterdaySnapshot.revenue > 0;
  if (dismissed || !had) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, todayStr());
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const tail =
    yesterdaySnapshot.revenue > 0
      ? 'This is working. Do it again today.'
      : 'You did the work. Now increase volume.';

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="label-uppercase text-[10px] font-semibold text-muted-foreground mb-1">
          ▸ Yesterday
        </p>
        <p className="text-sm text-foreground flex flex-wrap items-center gap-x-1.5">
          <span className="tabular-nums font-medium">{yesterdaySnapshot.messagesSent}</span>
          <span className="text-muted-foreground">message{yesterdaySnapshot.messagesSent === 1 ? '' : 's'}</span>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
          <span className="tabular-nums font-medium">{yesterdaySnapshot.replies}</span>
          <span className="text-muted-foreground">repl{yesterdaySnapshot.replies === 1 ? 'y' : 'ies'}</span>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
          <span className="font-semibold text-success">{formatEUR(yesterdaySnapshot.revenue)}</span>
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">{tail}</p>
      </div>
      <button
        onClick={dismiss}
        className="text-muted-foreground hover:text-foreground transition-colors p-1 -mt-1 -mr-1 shrink-0"
        aria-label="Dismiss yesterday summary"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
