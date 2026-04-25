// Money Path tracking — localStorage only. No backend, no schema changes.
export type Outcome = null | 'no_response' | 'replies' | 'clicks' | 'leads' | 'client';
export type HookType = 'A' | 'B' | 'C';

export interface MoneyResult {
  ad_id: string;
  hook_type: HookType;
  niche: string;
  platform: string;
  posted: boolean;
  outcome: Outcome;
  created_at: number;
}

const KEY = 'agencyos_results';

export function genAdId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2);
}

export function readResults(): MoneyResult[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeResults(results: MoneyResult[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(results));
  } catch {
    // ignore quota errors
  }
}

export function upsertResult(result: MoneyResult): MoneyResult[] {
  const all = readResults();
  const idx = all.findIndex((r) => r.ad_id === result.ad_id);
  if (idx >= 0) {
    all[idx] = result;
  } else {
    all.push(result);
  }
  writeResults(all);
  return all;
}

export function updateOutcome(ad_id: string, outcome: Outcome): MoneyResult[] {
  const all = readResults();
  const idx = all.findIndex((r) => r.ad_id === ad_id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], outcome };
    writeResults(all);
  }
  return all;
}

export interface FeedbackInsight {
  best_hook: HookType | null;
  best_platform: string | null;
  best_niche: string | null;
  total: number;
}

// Returns insights only when meaningful: ≥3 results AND ≥2 data points per variable AND ≥1 positive outcome.
export function computeInsights(results: MoneyResult[]): FeedbackInsight | null {
  if (results.length < 3) return null;
  const positive = results.some((r) => r.outcome === 'leads' || r.outcome === 'client' || r.outcome === 'replies' || r.outcome === 'clicks');
  if (!positive) return null;

  const score = (o: Outcome): number => {
    if (o === 'client') return 5;
    if (o === 'leads') return 4;
    if (o === 'replies') return 2;
    if (o === 'clicks') return 1;
    return 0;
  };

  const tally = <K extends string>(getKey: (r: MoneyResult) => K): { key: K; count: number; score: number }[] => {
    const map = new Map<K, { count: number; score: number }>();
    results.forEach((r) => {
      const k = getKey(r);
      const cur = map.get(k) || { count: 0, score: 0 };
      cur.count += 1;
      cur.score += score(r.outcome);
      map.set(k, cur);
    });
    return Array.from(map.entries()).map(([key, v]) => ({ key, ...v }));
  };

  const pickBest = <K extends string>(rows: { key: K; count: number; score: number }[]): K | null => {
    const eligible = rows.filter((r) => r.count >= 2);
    if (eligible.length === 0) return null;
    eligible.sort((a, b) => b.score - a.score || b.count - a.count);
    return eligible[0].score > 0 ? eligible[0].key : null;
  };

  return {
    best_hook: pickBest(tally((r) => r.hook_type)),
    best_platform: pickBest(tally((r) => r.platform || 'unspecified')),
    best_niche: pickBest(tally((r) => r.niche || 'unspecified')),
    total: results.length,
  };
}
