import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const FREE_DAILY_LIMIT = 10;

/**
 * Generous-free-tier message gating.
 * - Daily and lifetime counters live on the `profiles` table
 * - Increments only via server RPC `increment_message_count` (never client-side)
 * - Grace period: first 3 days after profile creation
 * - Upgrade UI only shown when: not paid, past grace, lifetime >= 5, daily limit reached
 */
export default function useMessageLimit() {
  const { user, profile, subscription } = useAuth();
  const [dailyCount, setDailyCount] = useState(0);
  const [totalSent, setTotalSent] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCounts = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('total_messages_sent, daily_messages_count, daily_reset_date')
      .eq('user_id', user.id)
      .single();
    if (error || !data) {
      setLoading(false);
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const resetDate = (data as any).daily_reset_date as string | null;
    if (resetDate && resetDate < today) {
      setDailyCount(0);
    } else {
      setDailyCount((data as any).daily_messages_count ?? 0);
    }
    setTotalSent((data as any).total_messages_sent ?? 0);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  /** Server-side increment. Returns new total or null on failure. */
  const increment = useCallback(async (): Promise<number | null> => {
    if (!user?.id) return null;
    const { data, error } = await supabase.rpc('increment_message_count' as any, {
      _user_id: user.id,
    });
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : data;
    const newTotal = (row as any)?.total_messages_sent ?? totalSent + 1;
    const newDaily = (row as any)?.daily_messages_count ?? dailyCount + 1;
    setTotalSent(newTotal);
    setDailyCount(newDaily);
    return newTotal;
  }, [user?.id, totalSent, dailyCount]);

  const isInGracePeriod = useMemo(() => {
    const createdAt = profile?.created_at ?? (user as any)?.created_at;
    if (!createdAt) return true;
    const days = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return days <= 3;
  }, [profile?.created_at, user]);

  const isPaidUser = useMemo(() => {
    if (subscription?.subscribed) return true;
    const status = profile?.subscription_status;
    return status === 'active' || status === 'trialing' || status === 'grace_period';
  }, [subscription?.subscribed, profile?.subscription_status]);

  const isDailyLimitReached = useMemo(() => {
    if (isPaidUser) return false;
    return dailyCount >= FREE_DAILY_LIMIT;
  }, [dailyCount, isPaidUser]);

  const shouldShowUpgrade = useMemo(() => {
    if (isPaidUser) return false;
    return !isInGracePeriod && totalSent >= 5 && dailyCount >= FREE_DAILY_LIMIT;
  }, [isPaidUser, isInGracePeriod, totalSent, dailyCount]);

  return {
    dailyCount,
    totalSent,
    isInGracePeriod,
    isPaidUser,
    isDailyLimitReached,
    shouldShowUpgrade,
    loading,
    increment,
    refresh: fetchCounts,
    FREE_DAILY_LIMIT,
  };
}
