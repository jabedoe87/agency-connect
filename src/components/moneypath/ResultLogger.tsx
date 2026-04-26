import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, MessageSquare, UserPlus, DollarSign, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAddiction } from '@/hooks/useAddiction';
import { formatEUR } from '@/lib/addiction';

/**
 * V5.1 — System 2: Result Logging.
 * Three quick-log buttons (+ Reply, + Lead, + Client).
 * Client opens an inline € input — validated as a non-negative finite number.
 */
interface ResultLoggerProps {
  /** V7 (additive) — feeds best-performer learning maps when a client is logged. */
  niche?: string;
  actionType?: string;
}

export default function ResultLogger({ niche, actionType }: ResultLoggerProps = {}) {
  const { toast } = useToast();
  const { state, reply, lead, client } = useAddiction();
  const [showAmount, setShowAmount] = useState(false);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleReply = () => {
    reply();
    toast({ title: '✓ Reply logged' });
  };

  const handleLead = () => {
    lead();
    toast({ title: '✓ Lead logged' });
  };

  const openAmount = () => {
    setShowAmount(true);
    setError(null);
    setAmount('');
  };

  const closeAmount = () => {
    setShowAmount(false);
    setError(null);
    setAmount('');
  };

  const handleSaveClient = () => {
    const trimmed = amount.trim().replace(',', '.');
    if (trimmed === '') {
      setError('Enter the amount in €');
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n)) {
      setError('Enter a valid number');
      return;
    }
    if (n < 0) {
      setError('Amount must be 0 or more');
      return;
    }
    if (n > 1_000_000) {
      setError('Amount looks too high');
      return;
    }
    client(n, { niche, actionType });
    toast({
      title: '✓ Client logged',
      description: n > 0 ? `${formatEUR(n)} added to today's revenue.` : 'Saved without revenue.',
    });
    closeAmount();
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="label-uppercase text-[10px] font-semibold text-foreground">▸ Got a result?</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Tap to log every outcome. This builds your money map.
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground tabular-nums hidden sm:block">
          {state.repliesToday}R · {state.leadsToday}L · {state.clientsToday}C
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 gap-1.5 h-10"
          onClick={handleReply}
        >
          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs">+ Reply</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-primary/30 text-primary gap-1.5 h-10 hover:bg-primary/10"
          onClick={handleLead}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span className="text-xs">+ Lead</span>
        </Button>
        <Button
          size="sm"
          className="cta-primary gap-1.5 h-10"
          onClick={openAmount}
          disabled={showAmount}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span className="text-xs">+ Client</span>
        </Button>
      </div>

      {showAmount && (
        <div className="rounded-lg border border-success/30 bg-success/[0.05] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-success">How much did this client pay?</p>
            <button
              onClick={closeAmount}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="0"
                autoFocus
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveClient();
                  }
                }}
                className="pl-7 h-9"
                aria-invalid={!!error}
                aria-describedby={error ? 'client-amount-error' : undefined}
              />
            </div>
            <Button size="sm" className="cta-primary gap-1.5 h-9" onClick={handleSaveClient}>
              <Check className="w-3.5 h-3.5" /> Save
            </Button>
          </div>
          {error && (
            <p id="client-amount-error" className="text-[11px] text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
