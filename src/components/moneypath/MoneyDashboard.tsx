import { useEffect, useState } from 'react';
import { Euro, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAddiction } from '@/hooks/useAddiction';
import { formatEUR, moneyPerMessage } from '@/lib/addiction';

interface MoneyDashboardProps {
  /** Triggered by the System 7 "Generate 3 more messages" CTA. */
  onScale?: () => void;
}

/**
 * V5.1 — Money Dashboard.
 * Combines:
 *   System 1 — Today's Results (Revenue / Clients / Leads / Replies)
 *   System 4 — Money per message
 *   System 7 — Scale signal (clientsToday ≥ 1)
 *   System 8 — Total revenue
 *   First-win triggers (first reply, first client) — flashes briefly
 */
export default function MoneyDashboard({ onScale }: MoneyDashboardProps) {
  const { state } = useAddiction();
  const {
    repliesToday,
    leadsToday,
    clientsToday,
    revenueToday,
    totalRevenue,
  } = state;

  const allZero =
    revenueToday === 0 && clientsToday === 0 && leadsToday === 0 && repliesToday === 0;

  const perMsg = moneyPerMessage(state);

  // Detect first-win transitions in this session and flash the trigger copy
  const [firstWin, setFirstWin] = useState<'reply' | 'client' | null>(null);
  const [seenReply, setSeenReply] = useState(repliesToday > 0);
  const [seenClient, setSeenClient] = useState(clientsToday > 0);

  useEffect(() => {
    if (!seenReply && repliesToday >= 1) {
      setSeenReply(true);
      setFirstWin('reply');
    }
  }, [repliesToday, seenReply]);

  useEffect(() => {
    if (!seenClient && clientsToday >= 1) {
      setSeenClient(true);
      setFirstWin('client');
    }
  }, [clientsToday, seenClient]);

  useEffect(() => {
    if (!firstWin) return;
    const t = setTimeout(() => setFirstWin(null), 6000);
    return () => clearTimeout(t);
  }, [firstWin]);

  return (
    <div className="rounded-xl border border-success/25 bg-success/[0.04] p-4 sm:p-5 space-y-4">
      <div>
        <p className="label-uppercase text-[10px] font-semibold text-success">▸ Today's Results</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          This is what your messages are producing.
        </p>
      </div>

      {/* Primary metric — Revenue */}
      <div>
        <p className="label-uppercase text-[10px] font-semibold text-muted-foreground">Revenue</p>
        <p className="font-display text-3xl sm:text-4xl text-foreground leading-none mt-1">
          {allZero ? '—' : formatEUR(revenueToday)}
        </p>
      </div>

      {/* Secondary grid */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Clients" value={allZero ? '—' : String(clientsToday)} tone="success" />
        <Stat label="Leads" value={allZero ? '—' : String(leadsToday)} tone="primary" />
        <Stat label="Replies" value={allZero ? '—' : String(repliesToday)} tone="muted" />
      </div>

      {/* System 4 — Money per message */}
      <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
        {perMsg !== null ? (
          <p className="text-xs text-foreground">
            <span className="text-muted-foreground">Every message is worth</span>{' '}
            <span className="font-semibold text-success">{formatEUR(perMsg)}</span>{' '}
            <span className="text-muted-foreground">today.</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Your first client changes this number.
          </p>
        )}
      </div>

      {/* First-win triggers (System 3) */}
      {firstWin === 'reply' && (
        <div className="rounded-lg border border-primary/30 bg-primary/[0.08] px-3 py-2">
          <p className="text-xs font-semibold text-primary">🔥 First reply — this works.</p>
        </div>
      )}
      {firstWin === 'client' && (
        <div className="rounded-lg border border-success/40 bg-success/[0.10] px-3 py-2 space-y-0.5">
          <p className="text-xs font-semibold text-success">💰 You just made money from this.</p>
          <p className="text-[11px] text-success/80">This came from sending messages.</p>
        </div>
      )}

      {/* System 7 — Scale signal */}
      {clientsToday >= 1 && onScale && (
        <div className="rounded-lg border border-success/40 bg-success/[0.08] p-3 space-y-2">
          <p className="text-xs font-semibold text-success">
            💰 This just made money — double down.
          </p>
          <Button
            size="sm"
            className="cta-primary w-full gap-1.5"
            onClick={onScale}
          >
            <Sparkles className="w-3.5 h-3.5" /> Generate 3 more messages
          </Button>
        </div>
      )}

      {/* System 8 — Total revenue */}
      <div className="border-t border-white/5 pt-3 flex items-start gap-2">
        <Euro className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-foreground">
            Total earned:{' '}
            <span className="font-semibold text-foreground">{formatEUR(totalRevenue)}</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {totalRevenue > 0
              ? `You've made ${formatEUR(totalRevenue)} using this.`
              : 'This will change once you land your first client.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'success' | 'primary' | 'muted';
}) {
  const toneClass =
    tone === 'success'
      ? 'text-success'
      : tone === 'primary'
      ? 'text-primary'
      : 'text-foreground';
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold tabular-nums mt-0.5 ${toneClass}`}>{value}</p>
    </div>
  );
}
