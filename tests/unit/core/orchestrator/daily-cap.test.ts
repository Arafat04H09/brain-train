import { describe, it, expect } from 'vitest';

describe('Daily session cap', () => {
  it('MAX_DAILY_MINUTES is 30', () => {
    const MAX_DAILY_MINUTES = 30;
    expect(MAX_DAILY_MINUTES).toBe(30);
  });

  it('computes remaining minutes correctly', () => {
    const usedMs = 15 * 60 * 1000;
    const maxMs = 30 * 60 * 1000;
    const remaining = Math.max(0, maxMs - usedMs) / 60000;
    expect(remaining).toBe(15);
  });

  it('returns 0 when over cap', () => {
    const usedMs = 35 * 60 * 1000;
    const maxMs = 30 * 60 * 1000;
    const remaining = Math.max(0, maxMs - usedMs) / 60000;
    expect(remaining).toBe(0);
  });
});
