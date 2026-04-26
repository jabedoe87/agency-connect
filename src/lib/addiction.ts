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
  // V7 — autopilot + learning
  autopilotEnabled: boolean;
  lastActionUsed: string;
  bestPerformingAction: string;
  bestPerformingNiche: string;
  actionClientCounts: Record<string, number>;
  nicheRevenueMap: Record<string, number>;
  dailyPlanDismissed: boolean;
  // V8 — outbound pipeline
  pipeline: PipelineEntry[];
  crmExpanded: boolean;
  totalClientsClosed: number;
}

/* V8 — Outbound pipeline entry */
export type PipelineStatus = 'sent' | 'replied' | 'lead' | 'client';

export interface PipelineEntry {
  id: string;
  status: PipelineStatus;
  messagePreview: string;
  actionType: string;
  niche: string;
  /** YYYY-MM-DD of when first sent */
  date: string;
  /** ms epoch — last status change, used for sort + follow-up detection */
  updatedAt: number;
}

const PIPELINE_MAX = 50;

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
  autopilotEnabled: false,
  lastActionUsed: '',
  bestPerformingAction: '',
  bestPerformingNiche: '',
  actionClientCounts: {},
  nicheRevenueMap: {},
  dailyPlanDismissed: false,
  pipeline: [],
  crmExpanded: false,
  totalClientsClosed: 0,
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
    // V7 — sanitize maps to plain {string: number} records
    const rawACC = parsed.actionClientCounts;
    const actionClientCounts: Record<string, number> = {};
    if (rawACC && typeof rawACC === 'object') {
      for (const k of Object.keys(rawACC)) {
        const v = num((rawACC as any)[k]);
        if (v > 0 && typeof k === 'string') actionClientCounts[k] = v;
      }
    }
    const rawNRM = parsed.nicheRevenueMap;
    const nicheRevenueMap: Record<string, number> = {};
    if (rawNRM && typeof rawNRM === 'object') {
      for (const k of Object.keys(rawNRM)) {
        const v = num((rawNRM as any)[k]);
        if (v > 0 && typeof k === 'string') nicheRevenueMap[k] = v;
      }
    }
    // V8 — sanitize pipeline array
    const rawPipe = parsed.pipeline;
    const pipeline: PipelineEntry[] = [];
    if (Array.isArray(rawPipe)) {
      for (const e of rawPipe) {
        if (!e || typeof e !== 'object') continue;
        const status = e.status;
        if (status !== 'sent' && status !== 'replied' && status !== 'lead' && status !== 'client') continue;
        const id = typeof e.id === 'string' && e.id ? e.id : '';
        if (!id) continue;
        pipeline.push({
          id,
          status,
          messagePreview: typeof e.messagePreview === 'string' ? e.messagePreview.slice(0, 200) : '',
          actionType: typeof e.actionType === 'string' ? e.actionType : '',
          niche: typeof e.niche === 'string' ? e.niche : '',
          date: typeof e.date === 'string' ? e.date : '',
          updatedAt: num(e.updatedAt),
        });
        if (pipeline.length >= PIPELINE_MAX) break;
      }
    }
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
      autopilotEnabled: !!parsed.autopilotEnabled,
      lastActionUsed: typeof parsed.lastActionUsed === 'string' ? parsed.lastActionUsed : '',
      bestPerformingAction: typeof parsed.bestPerformingAction === 'string' ? parsed.bestPerformingAction : '',
      bestPerformingNiche: typeof parsed.bestPerformingNiche === 'string' ? parsed.bestPerformingNiche : '',
      actionClientCounts,
      nicheRevenueMap,
      dailyPlanDismissed: !!parsed.dailyPlanDismissed,
      pipeline,
      crmExpanded: !!parsed.crmExpanded,
      totalClientsClosed: num(parsed.totalClientsClosed),
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
    // V7 — reset daily plan dismissal so the prompt returns each morning
    dailyPlanDismissed: false,
  };
}

/* ───────────────────── V6 — weekly rollover ───────────────────── */

/** Returns the Monday of the given date as YYYY-MM-DD. */
export function weekStartStr(d: Date = new Date()): string {
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  x.setDate(x.getDate() + diff);
  return todayStr(x);
}

function rollIfNewWeek(s: AddictionState): AddictionState {
  const wk = weekStartStr();
  if (s.weekStartDate === wk) return s;
  // Either first-ever or a new week — reset weekly counters.
  return {
    ...s,
    weekStartDate: wk,
    weeklyMessages: 0,
    weeklyClients: 0,
    weeklyRevenue: 0,
  };
}

/**
 * Returns the current state, applying daily + weekly rollover if needed.
 * The rollover is persisted so all readers agree on a single source of truth.
 */
export function readAddiction(): AddictionState {
  const s = readRaw();
  const rolled = rollIfNewWeek(rollIfNewDay(s));
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
export function recordSend(actionType?: string): AddictionState {
  const s = rollIfNewWeek(rollIfNewDay(readRaw()));
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

  const action = (actionType ?? '').trim();

  return write({
    ...s,
    streak: nextStreak,
    lastSentDate: today,
    messagesSentToday: nextToday,
    totalMessagesSent: s.totalMessagesSent + 1,
    // V6 — weekly + session counters
    weeklyMessages: s.weeklyMessages + 1,
    messagesThisSession: s.sessionActive ? s.messagesThisSession + 1 : s.messagesThisSession,
    // V7 — Action Memory (System 6)
    lastActionUsed: action || s.lastActionUsed,
  });
}

/* ───────────────────── V5 — money result loggers ───────────────────── */

export function logReply(): AddictionState {
  const s = rollIfNewWeek(rollIfNewDay(readRaw()));
  const pipeline = promoteLatestToStatus(s.pipeline, 'replied');
  return write({ ...s, repliesToday: s.repliesToday + 1, pipeline });
}

export function logLead(): AddictionState {
  const s = rollIfNewWeek(rollIfNewDay(readRaw()));
  const pipeline = promoteLatestToStatus(s.pipeline, 'lead');
  return write({ ...s, leadsToday: s.leadsToday + 1, pipeline });
}

/**
 * Log a paying client. `amountEUR` must be a finite number ≥ 0.
 * Optional `niche` and `actionType` feed V7 best-performer learning maps.
 * Returns the unchanged state if validation fails.
 */
export function logClient(
  amountEUR: number,
  opts: { niche?: string; actionType?: string } = {},
): AddictionState {
  const s = rollIfNewWeek(rollIfNewDay(readRaw()));
  if (!Number.isFinite(amountEUR) || amountEUR < 0) return s;
  const amount = Math.round(amountEUR * 100) / 100; // 2dp guard
  const action = (opts.actionType ?? '').trim();
  const niche = (opts.niche ?? '').trim();

  // V7 — best-performer maps (silent, System 3)
  const actionClientCounts = { ...s.actionClientCounts };
  if (action) actionClientCounts[action] = (actionClientCounts[action] || 0) + 1;

  const nicheRevenueMap = { ...s.nicheRevenueMap };
  if (niche) {
    nicheRevenueMap[niche] = Math.round(((nicheRevenueMap[niche] || 0) + amount) * 100) / 100;
  }

  const bestPerformingAction = argmax(actionClientCounts) || s.bestPerformingAction;
  const bestPerformingNiche = argmax(nicheRevenueMap) || s.bestPerformingNiche;

  // V8 — pipeline: promote latest 'lead' (or fallback to latest 'replied'/'sent') to 'client'
  const pipeline = promoteLatestToStatus(s.pipeline, 'client', { actionType: action, niche });

  return write({
    ...s,
    clientsToday: s.clientsToday + 1,
    revenueToday: Math.round((s.revenueToday + amount) * 100) / 100,
    totalRevenue: Math.round((s.totalRevenue + amount) * 100) / 100,
    // V6 — weekly money tracking
    weeklyClients: s.weeklyClients + 1,
    weeklyRevenue: Math.round((s.weeklyRevenue + amount) * 100) / 100,
    // V7 — learning
    actionClientCounts,
    nicheRevenueMap,
    bestPerformingAction,
    bestPerformingNiche,
    // V8 — outbound
    pipeline,
    totalClientsClosed: s.totalClientsClosed + 1,
  });
}

/* Returns the key with the largest numeric value, '' if empty. */
function argmax(map: Record<string, number>): string {
  let best = '';
  let bestVal = -Infinity;
  for (const k of Object.keys(map)) {
    const v = map[k];
    if (v > bestVal) {
      bestVal = v;
      best = k;
    }
  }
  return best;
}

/* ───────────────────── V7 — autopilot + daily plan ───────────────────── */

export function setAutopilot(enabled: boolean): AddictionState {
  const s = readRaw();
  return write({ ...s, autopilotEnabled: !!enabled });
}

export function dismissDailyPlan(): AddictionState {
  const s = rollIfNewWeek(rollIfNewDay(readRaw()));
  return write({ ...s, dailyPlanDismissed: true });
}

/**
 * Resolves the prefill priority for autopilot:
 *   1. lastWinningInput
 *   2. bestPerformingAction + bestPerformingNiche
 *   3. lastActionUsed
 *   4. null
 */
export interface PrefillSuggestion {
  niche: string;
  actionType: string;
  source: 'winning' | 'best' | 'last' | 'none';
}
export function resolvePrefill(state: AddictionState): PrefillSuggestion {
  if (state.lastWinningInput && state.lastWinningInput.niche) {
    return {
      niche: state.lastWinningInput.niche,
      actionType: state.lastWinningInput.actionType || state.lastActionUsed || '',
      source: 'winning',
    };
  }
  if (state.bestPerformingAction || state.bestPerformingNiche) {
    return {
      niche: state.bestPerformingNiche,
      actionType: state.bestPerformingAction,
      source: 'best',
    };
  }
  if (state.lastActionUsed) {
    return { niche: '', actionType: state.lastActionUsed, source: 'last' };
  }
  return { niche: '', actionType: '', source: 'none' };
}

/* ───────────────────── V6 — session + winning angle ───────────────────── */

export function startSession(): AddictionState {
  const s = rollIfNewWeek(rollIfNewDay(readRaw()));
  return write({ ...s, sessionActive: true, messagesThisSession: 0 });
}

export function endSession(): AddictionState {
  const s = readRaw();
  return write({ ...s, sessionActive: false, messagesThisSession: 0 });
}

export function setWinningInput(niche: string, actionType: string): AddictionState {
  const s = readRaw();
  if (!niche || !niche.trim()) return s;
  return write({
    ...s,
    lastWinningInput: {
      niche: niche.trim(),
      actionType: actionType || '',
      savedAt: Date.now(),
    },
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

/* ───────────────────── V6 — scaling helpers ───────────────────── */

/**
 * Performance score = messages sent today + clients * 10.
 * Used by MomentumScore widget (System 6).
 */
export function performanceScore(state: AddictionState): number {
  return state.messagesSentToday + state.clientsToday * 10;
}

/** Momentum copy (System 7) keyed off messagesSentToday. */
export function momentumLabel(messagesSentToday: number): string {
  if (messagesSentToday >= 20) return "🔥 Full momentum — you're compounding";
  if (messagesSentToday >= 10) return "Momentum is strong — don't stop";
  if (messagesSentToday >= 5) return 'Momentum is building';
  if (messagesSentToday >= 1) return "You're in motion";
  return 'Start sending — momentum builds fast';
}

/** Volume boost copy (System 3). Returns '' when below 10. */
export function volumeBoostLabel(messagesSentToday: number): string {
  if (messagesSentToday >= 20) return 'High output — this is where results compound';
  if (messagesSentToday >= 10) return "You're just getting started — go to 20";
  return '';
}
