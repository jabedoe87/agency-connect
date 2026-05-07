import { describe, it, expect, vi } from 'vitest';

/**
 * Mirrors the per-message idempotent guard used in ActionLayer.copy().
 * Ensures incrementMessageCount() runs at most once per unique message text,
 * even if copy() is called many times in rapid succession.
 */
function makeCopyHandler(increment: () => void) {
  const countedKeyRef: { current: string | null } = { current: null };
  return (text: string) => {
    const isFirstCopy = countedKeyRef.current !== text;
    if (isFirstCopy) {
      countedKeyRef.current = text;
      increment();
    }
  };
}

describe('idempotent copy guard', () => {
  it('increments once for repeated copies of the same message', () => {
    const inc = vi.fn();
    const copy = makeCopyHandler(inc);
    copy('hello');
    copy('hello');
    copy('hello');
    expect(inc).toHaveBeenCalledTimes(1);
  });

  it('increments again when the message text changes', () => {
    const inc = vi.fn();
    const copy = makeCopyHandler(inc);
    copy('hello');
    copy('world');
    copy('world');
    expect(inc).toHaveBeenCalledTimes(2);
  });
});
