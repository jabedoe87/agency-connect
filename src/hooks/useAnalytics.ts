import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AnalyticsEventName =
  | 'upgrade_clicked'
  | 'gate_shown'
  | 'trial_banner_clicked'
  | 'payment_failed_banner_clicked'
  | 'generate_blocked'
  | 'send_blocked'
  | 'copy_blocked'
  | 'export_blocked'
  | 'generate_success'
  | 'copy_success'
  | 'export_success';

/**
 * Lightweight event tracker. Fires-and-forgets to analytics_events.
 * Never throws and never blocks the UI.
 */
export function useAnalytics() {
  const { user } = useAuth();

  const track = useCallback(
    (name: AnalyticsEventName, properties: Record<string, unknown> = {}) => {
      // fire & forget
      supabase
        .from('analytics_events')
        .insert({
          user_id: user?.id ?? null,
          event_name: name,
          properties: properties as any,
          url: typeof window !== 'undefined' ? window.location.pathname : null,
        })
        .then(() => {})
        .then(undefined, () => {});
    },
    [user?.id]
  );

  return { track };
}
