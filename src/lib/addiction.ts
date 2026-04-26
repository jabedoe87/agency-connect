/**
 * Addiction System V4.1 — local-only retention engine.
 *
 * Pure frontend. Uses localStorage. No backend, no schema, no AI calls.
 * Safe across SSR / disabled-storage environments — every accessor degrades
 * to a sensible default if reads/writes throw.
 */

const KEY = 'agencyos_addiction';

export interface AddictionState {
  streak: number;
  lastSentDate: string;        // YYYY-MM-DD or '' if never
  messagesSentToday: number;
  totalMessagesSent: number;
}

const defaultState: AddictionState = {
  streak: 0,
  lastSentDate: '',
  messagesSentToday: 0,
  totalMessagesSent: 0,
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

function readRaw(): AddictionState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw);
    return {
      streak: Number.isFinite(parsed.streak) ? parsed.streak : 0,
      lastSentDate: typeof parsed.lastSentDate === 'string' ? parsed.lastSentDate : '',
      messagesSentToday: Number.isFinite(parsed.messagesSentToday) ? parsed.messagesSentToday : 0,
      totalMessagesSent: Number.isFinite(parsed.totalMessagesSent) ? parsed.totalMessagesSent : 0,
    };
  } catch {
    return { ...defaultState };
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
 * Returns the current state, applying the daily reset if the stored
 * lastSentDate is not today. The reset is persisted so all readers agree.
 */
export function readAddiction(): AddictionState {
  const s = readRaw();
  const today = todayStr();
  if (s.lastSentDate !== today && s.messagesSentToday !== 0) {
    return write({ ...s, messagesSentToday: 0 });
  }
  return s;
}

/**
 * Record a "send" event. Updates streak, today counter, and total.
 * - streak += 1 if last send was yesterday
 * - streak = 1 if last send was earlier (or never)
 * - streak unchanged if already sent today (still increments today + total)
 */
export function recordSend(): AddictionState {
  const s = readRaw();
  const today = todayStr();
  const yest = yesterdayStr();

  let nextStreak = s.streak;
  let nextToday = s.messagesSentToday;

  if (s.lastSentDate === today) {
    // Same day — streak stays, today counter increments
    nextToday = nextToday + 1;
  } else {
    // New day — reset today counter, then count this send as the first
    nextToday = 1;
    if (s.lastSentDate === yest) {
      nextStreak = s.streak + 1;
    } else {
      nextStreak = 1;
    }
  }

  return write({
    streak: nextStreak,
    lastSentDate: today,
    messagesSentToday: nextToday,
    totalMessagesSent: s.totalMessagesSent + 1,
  });
}

/* ───────────────────── derived UI helpers ───────────────────── */

export interface StreakBadge {
  label: string;
  tone: 'idle' | 'warn' | 'fire' | 'hot' | 'elite';
}

/**
 * Top-of-screen streak banner copy (System 1).
 * `justSent` flips the post-send confirmation copy for one render cycle.
 */
export function streakBadge(state: AddictionState, justSent = false): StreakBadge {
  const { streak, messagesSentToday } = state;

  if (justSent && streak >= 1) {
    return { label: `🔥 Streak extended — Day ${streak}`, tone: 'fire' };
  }

  // Streak about to break: had a streak, none sent today
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

/* Social proof percentile (System 6) */
export function socialProofPct(messagesSentToday: number): number | null {
  if (messagesSentToday <= 0) return null;
  if (messagesSentToday >= 10) return 90;
  if (messagesSentToday >= 5) return 75;
  if (messagesSentToday >= 3) return 60;
  return 40; // 1–2
}

/* Daily target (System 5) */
export const DAILY_TARGET = 10;
export function targetProgress(messagesSentToday: number) {
  const pct = Math.min(100, Math.round((messagesSentToday / DAILY_TARGET) * 100));
  const remaining = Math.max(0, DAILY_TARGET - messagesSentToday);
  return { pct, remaining, hit: messagesSentToday >= DAILY_TARGET };
}

/* Micro-reward copy (System 3) */
export function microReward(messagesSentToday: number): string {
  if (messagesSentToday >= 5) return "You're doing more than most";
  if (messagesSentToday === 2) return 'Momentum building';
  if (messagesSentToday === 1) return '🔥 You took action';
  return '';
}

/* Loss-aversion / end-of-day windows */
export function isAfternoonAndIdle(state: AddictionState, now: Date = new Date()): boolean {
  return state.messagesSentToday === 0 && now.getHours() >= 12;
}
export function isEndOfDayAndIdle(state: AddictionState, now: Date = new Date()): boolean {
  const h = now.getHours();
  return state.messagesSentToday === 0 && h >= 18 && h <= 23;
}
