import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { useAnalytics } from '@/hooks/useAnalytics';
import { AlertTriangle, Clock, ShieldAlert } from 'lucide-react';

/**
 * Global trial / status banner.
 * - trialing: neutral "X days left" (warning style)
 * - grace_period: red "Payment failed — fix to keep access"
 * - past_due: red (PaymentFailedBanner handles deeper CTA)
 * - expired (no access, not trialing): red "Trial expired"
 * - active / paid: hidden
 */
export default function TrialBanner() {
  const { profile } = useAuth();
  const { hasAccess, isTrialing, isGracePeriod, isExpired, status, trialDaysRemaining } =
    useAccess();
  const { track } = useAnalytics();

  if (!profile) return null;
  // Hide entirely for active paid users.
  if (status === 'active') return null;
  // Hide if user has access AND is not on trial AND not in grace (nothing to nag about).
  if (hasAccess && !isTrialing && !isGracePeriod) return null;

  let style: 'neutral' | 'danger' = 'neutral';
  let Icon = Clock;
  let message = '';
  let cta = 'Upgrade';

  if (isGracePeriod) {
    style = 'danger';
    Icon = ShieldAlert;
    message = 'Payment failed — update your card within 48h to keep access.';
    cta = 'Update card';
  } else if (isTrialing) {
    style = 'neutral';
    Icon = Clock;
    const d = trialDaysRemaining ?? 0;
    message = `Your trial ends in ${d} day${d !== 1 ? 's' : ''} — upgrade to keep access`;
    cta = 'Upgrade';
  } else if (isExpired) {
    style = 'danger';
    Icon = AlertTriangle;
    message =
      status === 'canceled'
        ? 'Subscription canceled — reactivate to continue'
        : 'Trial expired — upgrade to continue';
    cta = 'Choose a plan';
  } else {
    return null;
  }

  const handleClick = () => {
    track('trial_banner_clicked', { status, days_remaining: trialDaysRemaining });
    track('upgrade_clicked', { source: 'trial_banner', status });
  };

  return (
    <div
      className={`w-full border-b text-sm flex items-center justify-between gap-3 px-4 py-2.5 ${
        style === 'danger'
          ? 'bg-destructive/15 border-destructive/40 text-destructive'
          : 'bg-warning/10 border-warning/30 text-warning'
      }`}
      role="status"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{message}</span>
      </div>
      <Link
        to={isGracePeriod ? '/settings?action=update_card' : '/pricing'}
        onClick={handleClick}
        className={`shrink-0 px-3 py-1 rounded-md text-xs font-medium ${
          style === 'danger'
            ? 'bg-destructive text-destructive-foreground hover:opacity-90'
            : 'bg-warning text-warning-foreground hover:opacity-90'
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
