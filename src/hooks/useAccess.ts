import { useAuth } from '@/contexts/AuthContext';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'canceled'
  | 'inactive';

export interface AccessState {
  /** Binary access flag — true if user can use any paid feature. */
  hasAccess: boolean;
  /** Raw subscription_status from profile. */
  status: SubscriptionStatus | null;
  /** Days remaining in trial (rounded down, min 0). null if not trialing. */
  trialDaysRemaining: number | null;
  /** True when subscription_status === 'trialing' AND still within trial. */
  isTrialing: boolean;
  /** True when in 48h grace period after failed payment. */
  isGracePeriod: boolean;
  /** True when payment failed / past_due / grace_period (banner trigger). */
  isPaymentFailed: boolean;
  /** True when trial expired or subscription canceled (hard gate trigger). */
  isExpired: boolean;
}

/**
 * Canonical HAS_ACCESS hook. Mirrors the SQL has_access() function:
 *   active OR (trialing AND trial_ends_at > now) OR (grace_period AND grace_period_ends_at > now)
 */
export function useAccess(): AccessState {
  const { profile } = useAuth();

  const status = (profile?.subscription_status ?? null) as SubscriptionStatus | null;
  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const graceEndsAt = profile?.grace_period_ends_at
    ? new Date(profile.grace_period_ends_at)
    : null;
  const now = new Date();

  const isTrialing = status === 'trialing' && !!trialEndsAt && trialEndsAt > now;
  const isGracePeriod = status === 'grace_period' && !!graceEndsAt && graceEndsAt > now;
  const isActive = status === 'active';

  const hasAccess = isActive || isTrialing || isGracePeriod;

  const trialDaysRemaining =
    isTrialing && trialEndsAt
      ? Math.max(0, Math.floor((trialEndsAt.getTime() - now.getTime()) / 86_400_000))
      : null;

  const isPaymentFailed = status === 'past_due' || status === 'grace_period';
  const isExpired = !hasAccess;

  return {
    hasAccess,
    status,
    trialDaysRemaining,
    isTrialing,
    isGracePeriod,
    isPaymentFailed,
    isExpired,
  };
}
