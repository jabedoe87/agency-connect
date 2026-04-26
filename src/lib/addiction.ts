/**
 * Addiction System V4.1 + Money System V5.1 — local-only retention engine.
 *
 * Pure frontend. Uses localStorage. No backend, no schema, no AI calls.
 * Safe across SSR / disabled-storage environments — every accessor degrades
 * to a sensible default if reads/writes throw.
 */

const KEY = 'agencyos_addiction';

export interface YesterdaySnapshot {
  messagesSent: number;
  replies: number;
  revenue: number;
}

export interface WinningInput {
  niche: string;
  actionType: string;
  savedAt: number;
}

export interface AddictionState {
  // V4 — habit
  streak: number;
  lastSentDate: string;        // YYYY-MM-DD or '' if never
  messagesSentToday: number;
  totalMessagesSent: number;
  // V5 — money
  repliesToday: number;
  leadsToday: number;
  clientsToday: number;
  revenueToday: number;
  totalRevenue: number;
  yesterdaySnapshot: YesterdaySnapshot;
  // V6 — scaling / session
  sessionActive: boolean;
  messagesThisSession: number;
  // V6 — winning angle reuse
  lastWinningInput: WinningInput | null;
  // V6 — weekly tracking (rolling Mon-start week)
  weekStartDate: string; // YYYY-MM-DD of Monday
  weeklyMessages: number;
  weeklyClients: number;
  weeklyRevenue: number;
}

const defaultSnapshot: YesterdaySnapshot = { messagesSent: 0, replies: 0, revenue: 0 };

const defaultState: AddictionState = {
  streak: 0,
  lastSentDate: '',
  messagesSentToday: 0,
  totalMessagesSent: 0,
  repliesToday: 0,
  leadsToday: 0,
  clientsToday: 0,
  revenueToday: 0,
  totalRevenue: 0,
  yesterdaySnapshot: { ...defaultSnapshot },
  sessionActive: false,
  messagesThisSession: 0,
  lastWinningInput: null,
  weekStartDate: '',
  weeklyMessages: 0,
  weeklyClients: 0,
  weeklyRevenue: 0,
};

/* ───────────────────── date helpers ───────────────────── */

export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function yesterdayStr(d: Date = new Date()): string {
  const y = new Date(d);
  y.setDate(y.getDate() - 1);
  return todayStr(y);
}

/* ───────────────────── storage ───────────────────── */

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function readRaw(): AddictionState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultState, yesterdaySnapshot: { ...defaultSnapshot } };
    const parsed = JSON.parse(raw) ?? {};
    const snap = parsed.yesterdaySnapshot ?? {};
    const win = parsed.lastWinningInput;
    const lastWinningInput: WinningInput | null =
      win && typeof win === 'object' && typeof win.niche === 'string'
        ? {
            niche: win.niche,
            actionType: typeof win.actionType === 'string' ? win.actionType : '',
            savedAt: num(win.savedAt),
          }
        : null;
    return {
      streak: num(parsed.streak),
      lastSentDate: typeof parsed.lastSentDate === 'string' ? parsed.lastSentDate : '',
      messagesSentToday: num(parsed.messagesSentToday),
      totalMessagesSent: num(parsed.totalMessagesSent),
      repliesToday: num(parsed.repliesToday),
      leadsToday: num(parsed.leadsToday),
      clientsToday: num(parsed.clientsToday),
      revenueToday: num(parsed.revenueToday),
      totalRevenue: num(parsed.totalRevenue),
      yesterdaySnapshot: {
        messagesSent: num(snap.messagesSent),
        replies: num(snap.replies),
        revenue: num(snap.revenue),
      },
      sessionActive: !!parsed.sessionActive,
      messagesThisSession: num(parsed.messagesThisSession),
      lastWinningInput,
      weekStartDate: typeof parsed.weekStartDate === 'string' ? parsed.weekStartDate : '',
      weeklyMessages: num(parsed.weeklyMessages),
      weeklyClients: num(parsed.weeklyClients),
      weeklyRevenue: num(parsed.weeklyRevenue),
    };
  } catch {
    return { ...defaultState, yesterdaySnapshot: { ...defaultSnapshot } };
  }
}

function write(state: AddictionState): AddictionState {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore quota / disabled storage
  }
  return state;
}

/**
 * Apply a daily rollover when stored lastSentDate is not today.
 * Snapshots yesterday's totals into `yesterdaySnapshot` (only when there
 * was prior activity to remember) and resets all "*Today" counters.
 *
 * IMPORTANT: never resets `totalRevenue` or `totalMessagesSent`.
 */
function rollIfNewDay(s: AddictionState): AddictionState {
  const today = todayStr();
  if (s.lastSentDate === today) return s;
  if (s.lastSentDate === '') return s; // never sent — nothing to roll

  const hadActivity =
    s.messagesSentToday > 0 || s.repliesToday > 0 || s.revenueToday > 0;

  return {
    ...s,
    yesterdaySnapshot: hadActivity
      ? {
          messagesSent: s.messagesSentToday,
          replies: s.repliesToday,
          revenue: s.revenueToday,
        }
      : s.yesterdaySnapshot,
    messagesSentToday: 0,
    repliesToday: 0,
    leadsToday: 0,
    clientsToday: 0,
    revenueToday: 0,
  };
}

/**
 * Returns the current state, applying the daily rollover if needed.
 * The rollover is persisted so all readers agree on a single source of truth.
 */
export function readAddiction(): AddictionState {
  const s = readRaw();
  const rolled = rollIfNewDay(s);
  if (rolled !== s) return write(rolled);
  return s;
}

/**
 * Record a "send" event. Updates streak, today counter, and total.
 * - streak += 1 if last send was yesterday
 * - streak = 1 if last send was earlier (or never)
 * - streak unchanged if already sent today (still increments today + total)
 *
 * Also performs the daily rollover snapshot before counting.
 */
export function recordSend(): AddictionState {
  const s = rollIfNewDay(readRaw());
  const today = todayStr();
  const yest = yesterdayStr();

  let nextStreak = s.streak;
  let nextToday = s.messagesSentToday;

  if (s.lastSentDate === today) {
    nextToday = nextToday + 1;
  } else {
    nextToday = 1;
    nextStreak = s.lastSentDate === yest ? s.streak + 1 : 1;
  }

  return write({
    ...s,
    streak: nextStreak,
    lastSentDate: today,
    messagesSentToday: nextToday,
    totalMessagesSent: s.totalMessagesSent + 1,
  });
}

/* ───────────────────── V5 — money result loggers ───────────────────── */

export function logReply(): AddictionState {
  const s = rollIfNewDay(readRaw());
  return write({ ...s, repliesToday: s.repliesToday + 1 });
}

export function logLead(): AddictionState {
  const s = rollIfNewDay(readRaw());
  return write({ ...s, leadsToday: s.leadsToday + 1 });
}

/**
 * Log a paying client. `amountEUR` must be a finite number ≥ 0.
 * Returns the unchanged state if validation fails.
 */
export function logClient(amountEUR: number): AddictionState {
  const s = rollIfNewDay(readRaw());
  if (!Number.isFinite(amountEUR) || amountEUR < 0) return s;
  const amount = Math.round(amountEUR * 100) / 100; // 2dp guard
  return write({
    ...s,
    clientsToday: s.clientsToday + 1,
    revenueToday: Math.round((s.revenueToday + amount) * 100) / 100,
    totalRevenue: Math.round((s.totalRevenue + amount) * 100) / 100,
  });
}

/* ───────────────────── derived UI helpers ───────────────────── */

export interface StreakBadge {
  label: string;
  tone: 'idle' | 'warn' | 'fire' | 'hot' | 'elite';
}

export function streakBadge(state: AddictionState, justSent = false): StreakBadge {
  const { streak, messagesSentToday } = state;

  if (justSent && streak >= 1) {
    return { label: `🔥 Streak extended — Day ${streak}`, tone: 'fire' };
  }
  if (streak > 0 && messagesSentToday === 0) {
    return { label: `You're about to lose your ${streak}-day streak`, tone: 'warn' };
  }
  if (streak === 0) {
    return { label: "You haven't sent today yet", tone: 'idle' };
  }
  if (streak >= 10) return { label: `🔥 Day ${streak} — You're ahead of most users`, tone: 'elite' };
  if (streak >= 5) return { label: `🔥 Day ${streak} — You're building momentum`, tone: 'hot' };
  return { label: `🔥 Day ${streak} — Don't break the chain`, tone: 'fire' };
}

export function socialProofPct(messagesSentToday: number): number | null {
  if (messagesSentToday <= 0) return null;
  if (messagesSentToday >= 10) return 90;
  if (messagesSentToday >= 5) return 75;
  if (messagesSentToday >= 3) return 60;
  return 40;
}

export const DAILY_TARGET = 10;
export function targetProgress(messagesSentToday: number) {
  const pct = Math.min(100, Math.round((messagesSentToday / DAILY_TARGET) * 100));
  const remaining = Math.max(0, DAILY_TARGET - messagesSentToday);
  return { pct, remaining, hit: messagesSentToday >= DAILY_TARGET };
}

export function microReward(messagesSentToday: number): string {
  if (messagesSentToday >= 5) return "You're doing more than most";
  if (messagesSentToday === 2) return 'Momentum building';
  if (messagesSentToday === 1) return '🔥 You took action';
  return '';
}

export function isAfternoonAndIdle(state: AddictionState, now: Date = new Date()): boolean {
  return state.messagesSentToday === 0 && now.getHours() >= 12;
}
export function isEndOfDayAndIdle(state: AddictionState, now: Date = new Date()): boolean {
  const h = now.getHours();
  return state.messagesSentToday === 0 && h >= 18 && h <= 23;
}

/* ───────────────────── V5 — money helpers ───────────────────── */

/** Money earned per message sent today. Returns null if no revenue yet. */
export function moneyPerMessage(state: AddictionState): number | null {
  if (state.revenueToday <= 0 || state.messagesSentToday <= 0) return null;
  return Math.round((state.revenueToday / state.messagesSentToday) * 100) / 100;
}

/** Format euro values consistently across the UI. */
export function formatEUR(n: number): string {
  if (!Number.isFinite(n)) return '€0';
  // Whole numbers: no decimals; otherwise 2dp. Keeps the dashboard clean.
  if (Math.round(n) === n) return `€${n.toLocaleString('en-IE')}`;
  return `€${n.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
