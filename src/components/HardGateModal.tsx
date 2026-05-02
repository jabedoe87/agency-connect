import { create } from 'zustand';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { useAccess } from '@/hooks/useAccess';

interface HardGateState {
  open: boolean;
  reason: 'trial_expired' | 'payment_failed' | 'inactive';
  show: (reason?: HardGateState['reason']) => void;
  hide: () => void;
}

/**
 * Global store so any feature button can trigger the hard gate.
 * Modal is intentionally NOT closeable via outside-click or ESC when triggered by an action.
 */
export const useHardGate = create<HardGateState>((set) => ({
  open: false,
  reason: 'trial_expired',
  show: (reason = 'trial_expired') => set({ open: true, reason }),
  hide: () => set({ open: false }),
}));

const COPY: Record<HardGateState['reason'], { title: string; body: string; cta: string }> = {
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

export function HardGateModal() {
  const { open, reason, hide } = useHardGate();
  const navigate = useNavigate();
  const { isPaymentFailed } = useAccess();

  const copy = COPY[reason];

  const handleCta = () => {
    hide();
    if (reason === 'payment_failed' || isPaymentFailed) {
      // Trigger customer portal via the same path as PaymentFailedBanner
      window.location.href = '/settings?action=update_card';
    } else {
      navigate('/pricing');
    }
  };

  return (
    <Dialog
      open={open}
      // Block dismissal — modal is mandatory until user upgrades
      onOpenChange={() => {}}
    >
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        // Hide the X close button visually
        hideClose
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
  );
}
