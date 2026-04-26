import { useEffect, useState, useCallback } from 'react';
import {
  endSession,
  logClient,
  logLead,
  logReply,
  readAddiction,
  recordSend,
  setWinningInput,
  startSession,
  type AddictionState,
} from '@/lib/addiction';

const EVENT = 'agencyos:addiction-changed';

function dispatch() {
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

/**
 * Single source of truth for the V4/V5/V6 addiction + money + session state.
 * Subscribes to a global window event so every mounted consumer
 * (top banner, output panel, money dashboard, batch session, sprint)
 * re-reads in lockstep after a state-mutating call.
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
    window.addEventListener('focus', handler);   // catch midnight crossover
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
    dispatch();
    return next;
  }, []);

  const reply = useCallback(() => {
    const next = logReply();
    setState(next);
    dispatch();
    return next;
  }, []);

  const lead = useCallback(() => {
    const next = logLead();
    setState(next);
    dispatch();
    return next;
  }, []);

  const client = useCallback((amountEUR: number) => {
    const next = logClient(amountEUR);
    setState(next);
    dispatch();
    return next;
  }, []);

  // V6 — session control
  const beginSession = useCallback(() => {
    const next = startSession();
    setState(next);
    dispatch();
    return next;
  }, []);

  const stopSession = useCallback(() => {
    const next = endSession();
    setState(next);
    dispatch();
    return next;
  }, []);

  // V6 — winning angle reuse
  const saveWinningInput = useCallback((niche: string, actionType: string) => {
    const next = setWinningInput(niche, actionType);
    setState(next);
    dispatch();
    return next;
  }, []);

  return {
    state,
    justSent,
    send,
    reply,
    lead,
    client,
    refresh,
    beginSession,
    stopSession,
    saveWinningInput,
  };
}
