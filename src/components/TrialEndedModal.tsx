import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

export default function TrialEndedModal() {
  const { profile, subscription } = useAuth();
  const navigate = useNavigate();

  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const hasPaidPlan =
    subscription?.subscribed === true ||
    profile?.plan === 'starter' ||
    profile?.plan === 'pro' ||
    profile?.plan === 'business';
  const subscriptionChecked = subscription !== null;
  const trialExpired =
    subscriptionChecked &&
    !hasPaidPlan &&
    profile?.plan === 'trial' &&
    trialEndsAt &&
    trialEndsAt < new Date();

  if (!trialExpired) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-w-md w-full glass-card p-8 text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
          <Lock className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-display text-foreground">Your free trial has ended</h1>
        <p className="text-sm text-muted-foreground">
          Upgrade now to keep using AgencyOS and continue closing clients.
        </p>
        <Button size="lg" className="w-full cta-primary" onClick={() => navigate('/pricing')}>
          See Plans
        </Button>
      </div>
    </div>
  );
}
