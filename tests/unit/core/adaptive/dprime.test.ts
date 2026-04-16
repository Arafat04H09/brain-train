import { describe, it, expect } from 'vitest';
import { computeDPrime, logLinearCorrection } from '~/core/adaptive/dprime';

describe('d-prime (SDT)', () => {
  it('zero hit rate, zero FA gives d-prime near 0 with log-linear correction', () => {
    const { dPrime } = computeDPrime({ hits: 0, misses: 10, falseAlarms: 0, correctRejects: 10 });
    expect(dPrime).toBeGreaterThanOrEqual(-0.5);
    expect(dPrime).toBeLessThanOrEqual(0.5);
  });

  it('perfect discrimination with log-linear correction is finite', () => {
    const { dPrime } = computeDPrime({ hits: 10, misses: 0, falseAlarms: 0, correctRejects: 10 });
    expect(Number.isFinite(dPrime)).toBe(true);
    expect(dPrime).toBeGreaterThan(2);
  });

  it('moderate performance matches expected value', () => {
    // hits=8/10, FA=2/10, after log-linear: hits=8.5/11, FA=2.5/11
    const { dPrime, hitRate, faRate } = computeDPrime({
      hits: 8, misses: 2, falseAlarms: 2, correctRejects: 8
    });
    expect(hitRate).toBeCloseTo(0.7727, 1);
    expect(faRate).toBeCloseTo(0.2273, 1);
    expect(dPrime).toBeCloseTo(1.496, 1);
  });

  it('logLinearCorrection adds 0.5 to hits and FAs, and 1 to trial counts', () => {
    const c = logLinearCorrection({ hits: 10, misses: 0, falseAlarms: 0, correctRejects: 10 });
    expect(c.hits).toBe(10.5);
    expect(c.falseAlarms).toBe(0.5);
    expect(c.misses).toBe(0.5);
    expect(c.correctRejects).toBe(10.5);
  });
});
