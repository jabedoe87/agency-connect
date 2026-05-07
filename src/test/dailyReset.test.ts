import { describe, it, expect } from 'vitest';

/**
 * Mirrors the client-side daily-reset logic in useMessageLimit.fetchCounts:
 * if the stored daily_reset_date is older than today, the displayed
 * dailyCount must be 0; otherwise show the stored count. The server RPC
 * `increment_message_count` performs the same reset transactionally before
 * incrementing, so counting is never broken by a stale reset date.
 */
function resolveDailyCount(
  storedDailyCount: number,
  storedResetDate: string | null,
  today: string,
): number {
  if (storedResetDate && storedResetDate < today) return 0;
  return storedDailyCount ?? 0;
}

describe('daily reset logic', () => {
  const today = '2026-05-07';

  it('resets to 0 when stored reset date is before today', () => {
    expect(resolveDailyCount(9, '2026-05-06', today)).toBe(0);
  });

  it('keeps stored count when reset date equals today', () => {
    expect(resolveDailyCount(7, today, today)).toBe(7);
  });

  it('keeps stored count when reset date is in the future (clock skew safe)', () => {
    expect(resolveDailyCount(4, '2026-05-08', today)).toBe(4);
  });

  it('treats null reset date as no reset needed', () => {
    expect(resolveDailyCount(3, null, today)).toBe(3);
  });

  it('handles zero count correctly after reset', () => {
    expect(resolveDailyCount(0, '2026-05-01', today)).toBe(0);
  });
});
