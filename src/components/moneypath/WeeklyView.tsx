import { useAddiction } from '@/hooks/useAddiction';
import { formatEUR } from '@/lib/addiction';
import { CalendarDays } from 'lucide-react';

/**
 * V6 — System 9: Weekly View.
 * Read-only summary of the current week (Mon-start).
 * Hidden when no activity yet this week.
 */
export default function WeeklyView() {
  const { state } = useAddiction();
  const { weeklyMessages, weeklyClients, weeklyRevenue } = state;

  // Hide until there's anything to show — keeps the dashboard quiet on day 1.
  if (weeklyMessages === 0 && weeklyClients === 0 && weeklyRevenue === 0) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 space-y-3">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-muted-foreground" />
        <p className="label-uppercase text-foreground text-[10px] font-semibold">▸ This week</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Cell label="Messages" value={String(weeklyMessages)} />
        <Cell label="Clients" value={String(weeklyClients)} />
        <Cell label="Earned" value={formatEUR(weeklyRevenue)} tone="success" />
      </div>

      {weeklyRevenue > 0 && (
        <p className="text-[11px] text-success font-semibold">
          This week made you money. Keep going.
        </p>
      )}
    </div>
  );
}

function Cell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'success';
}) {
  const cls = tone === 'success' ? 'text-success' : 'text-foreground';
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold tabular-nums mt-0.5 ${cls}`}>{value}</p>
    </div>
  );
}
