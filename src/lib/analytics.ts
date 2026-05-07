import { supabase } from '@/integrations/supabase/client';

/**
 * Fire-and-forget analytics tracker. Writes to Supabase analytics_events.
 * Never throws — analytics failures must never break the app.
 */
export const trackEvent = async (
  eventName: string,
  properties?: Record<string, unknown>
) => {
  try {
    await supabase.from('analytics_events').insert({
      event_name: eventName,
      properties: (properties ?? {}) as any,
      url: typeof window !== 'undefined' ? window.location.pathname : null,
    });
  } catch {
    // swallow
  }
};
