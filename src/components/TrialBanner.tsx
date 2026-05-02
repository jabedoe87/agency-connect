import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, Clock } from 'lucide-react';

/**
 * Global trial banner — shown on every authenticated page.
 * - Neutral state: "Your trial ends in X days" (always visible while on trial)
 * - Red state: "Trial expired" (when trial_ends_at < now and no paid plan)
 * - Hidden entirely for paid users (starter / pro / business) and unauthenticated views.
 */
export default function TrialBanner() {
  const { profile, subscription } = useAuth();
  if (!profile) return null;

  const hasPaidPlan =
    subscription?.subscribed === true ||
    profile.plan === 'starter' ||
    profile.plan === 'pro' ||
    profile.plan === 'business';
  if (hasPaidPlan) return null;

  const trialEndsAt = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const now = new Date();
  const expired = !!trialEndsAt && trialEndsAt < now;
  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86400000))
    : 0;

  return (
    <div
      className={`w-full border-b text-sm flex items-center justify-between gap-3 px-4 py-2.5 ${
        expired
          ? 'bg-destructive/15 border-destructive/40 text-destructive'
          : 'bg-warning/10 border-warning/30 text-warning'
      }`}
      role="status"
    >
      <div className="flex items-center gap-2 min-w-0">
        {expired ? (
          <AlertTriangle className="w-4 h-4 shrink-0" />
        ) : (
          <Clock className="w-4 h-4 shrink-0" />
        )}
        <span className="truncate">
          {expired
            ? 'Trial expired — upgrade to continue'
            : `Your trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — upgrade to keep access`}
        </span>
      </div>
      <Link
        to="/pricing"
        className={`shrink-0 px-3 py-1 rounded-md text-xs font-medium ${
          expired
            ? 'bg-destructive text-destructive-foreground hover:opacity-90'
            : 'bg-warning text-warning-foreground hover:opacity-90'
        }`}
      >
        {expired ? 'Choose a plan' : 'Upgrade'}
      </Link>
    </div>
  );
}
