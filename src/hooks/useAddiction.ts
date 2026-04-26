import { useEffect, useState, useCallback } from 'react';
import {
  readAddiction,
  recordSend,
  type AddictionState,
} from '@/lib/addiction';

const EVENT = 'agencyos:addiction-changed';

/**
 * Single source of truth for the V4.1 addiction state across the app.
 * Subscribes to a global window event so every mounted consumer
 * (top banner, output panel, sidebar widget) re-reads in lockstep
 * after a `recordSend()` call.
 */
export function useAddiction() {
  const [state, setState] = useState<AddictionState>(() => readAddiction());
  const [justSent, setJustSent] = useState(false);

  const refresh = useCallback(() => {
    setState(readAddiction());
  }, []);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener(EVENT, handler);
    window.addEventListener('storage', handler); // cross-tab sync
    // Re-read at midnight crossover risk: refresh on focus
    window.addEventListener('focus', handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener('storage', handler);
      window.removeEventListener('focus', handler);
    };
  }, [refresh]);

  // Auto-clear the "just sent" flash after 4s
  useEffect(() => {
    if (!justSent) return;
    const t = setTimeout(() => setJustSent(false), 4000);
    return () => clearTimeout(t);
  }, [justSent]);

  const send = useCallback(() => {
    const next = recordSend();
    setState(next);
    setJustSent(true);
    try {
      window.dispatchEvent(new Event(EVENT));
    } catch {
      // ignore (e.g. SSR)
    }
    return next;
  }, []);

  return { state, justSent, send, refresh };
}
