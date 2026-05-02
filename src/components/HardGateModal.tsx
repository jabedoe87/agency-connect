import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { useAccess } from '@/hooks/useAccess';
import { useAnalytics } from '@/hooks/useAnalytics';

type Reason = 'trial_expired' | 'payment_failed' | 'inactive';

interface HardGateContextValue {
  show: (reason?: Reason) => void;
  hide: () => void;
}

const HardGateContext = createContext<HardGateContextValue | null>(null);

const COPY: Record<Reason, { title: string; body: string; cta: string }> = {
  trial_expired: {
    title: 'Trial Expired',
    body: 'Your 7-day trial has ended. Upgrade now to keep using AgencyOS and continue closing clients.',
    cta: 'Unlock Full Access',
  },
  payment_failed: {
    title: 'Payment Failed',
    body: 'We could not process your last payment. Update your card now to keep your account active.',
    cta: 'Update Card',
  },
  inactive: {
    title: 'Subscription Inactive',
    body: 'Your subscription is no longer active. Reactivate to regain access to AgencyOS.',
    cta: 'Reactivate Subscription',
  },
};

export function HardGateProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>('trial_expired');
  const navigate = useNavigate();
  const { isPaymentFailed } = useAccess();
  const { track } = useAnalytics();

  const show = useCallback((r: Reason = 'trial_expired') => {
    setReason(r);
    setOpen(true);
    track('gate_shown', { reason: r });
  }, [track]);
  const hide = useCallback(() => setOpen(false), []);

  const copy = COPY[reason];

  const handleCta = () => {
    track('upgrade_clicked', { source: 'hard_gate', reason });
    hide();
    if (reason === 'payment_failed' || isPaymentFailed) {
      navigate('/settings?action=update_card');
    } else {
      navigate('/pricing');
    }
  };

  return (
    <HardGateContext.Provider value={{ show, hide }}>
      {children}
      <Dialog open={open} onOpenChange={() => { /* mandatory — block dismissal */ }}>
        <DialogContent
          className="sm:max-w-md [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl">{copy.title}</DialogTitle>
            <DialogDescription className="text-center pt-2">{copy.body}</DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-2">
            <Button onClick={handleCta} size="lg" className="w-full">
              {copy.cta}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </HardGateContext.Provider>
  );
}

export function useHardGate(): HardGateContextValue {
  const ctx = useContext(HardGateContext);
  if (!ctx) throw new Error('useHardGate must be used within HardGateProvider');
  return ctx;
}

/**
 * Wrap any handler so it triggers the hard gate when access is missing.
 * Usage:
 *   const onClick = useGatedAction(() => doExpensiveAction());
 */
export function useGatedAction<T extends (...args: any[]) => any>(fn: T): T {
  const { show } = useHardGate();
  const { hasAccess, isPaymentFailed, status } = useAccess();
  return ((...args: Parameters<T>) => {
    if (!hasAccess) {
      const reason: Reason = isPaymentFailed
        ? 'payment_failed'
        : status === 'inactive' || status === 'canceled'
        ? 'inactive'
        : 'trial_expired';
      show(reason);
      return;
    }
    return fn(...args);
  }) as T;
}
