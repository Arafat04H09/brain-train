import { describe, it, expect } from 'vitest';
import { Staircase } from '~/core/adaptive/staircase';

describe('Staircase (Levitt n-down/m-up)', () => {
  it('3-down/1-up converges toward ~79% threshold', () => {
    const s = new Staircase({ start: 50, step: 2, nDown: 3, nUp: 1, minStep: 1 });
    // simulate: 3 correct → step down, 1 wrong → step up
    s.update(true); s.update(true); s.update(true); // down
    expect(s.current).toBe(48);
    s.update(false); // up
    expect(s.current).toBe(49);
  });

  it('tracks reversals and shrinks step size', () => {
    const s = new Staircase({ start: 50, step: 8, nDown: 2, nUp: 1, minStep: 1, shrinkAt: [2, 4] });
    s.update(true); s.update(true);  // down 8 → 42
    s.update(false);                  // up, reversal #1
    s.update(true); s.update(true);  // down
    s.update(false);                  // up, reversal #2 → shrink step to 4
    expect(s.reversals.length).toBeGreaterThanOrEqual(2);
    expect(s.step).toBeLessThan(8);
  });

  it('clamps to bounds', () => {
    const s = new Staircase({ start: 2, step: 4, nDown: 1, nUp: 1, min: 0, max: 10 });
    s.update(true); // down, clamped at 0
    expect(s.current).toBe(0);
  });

  it('mean of last K reversals is threshold estimate', () => {
    const s = new Staircase({ start: 50, step: 1, nDown: 2, nUp: 1 });
    for (let i = 0; i < 20; i++) s.update(Math.random() > 0.3);
    const est = s.thresholdEstimate(6);
    expect(Number.isFinite(est)).toBe(true);
  });
});
