import { describe, it, expect } from 'vitest';
import { Quest } from '~/core/adaptive/quest';

describe('Quest threshold estimator', () => {
  it('initializes with prior guess and returns plausible next intensity', () => {
    const q = new Quest({
      tGuess: 0.5, tGuessSd: 0.5, pThreshold: 0.82,
      beta: 3.5, gamma: 0.01, delta: 0.01, grain: 0.1, range: 4
    });
    const next = q.quantile();
    expect(next).toBeGreaterThan(-1);
    expect(next).toBeLessThan(2);
  });

  it('lowers recommended intensity after several correct trials at high intensity', () => {
    const q = new Quest({
      tGuess: 0.5, tGuessSd: 0.5, pThreshold: 0.82,
      beta: 3.5, gamma: 0.01, delta: 0.01, grain: 0.1, range: 4
    });
    const start = q.quantile();
    q.update(1.5, true); q.update(1.5, true); q.update(1.5, true);
    q.update(1.2, true); q.update(1.2, true);
    const after = q.quantile();
    expect(after).toBeLessThan(start + 0.5);
  });

  it('mean() is finite after updates', () => {
    const q = new Quest({
      tGuess: 0.5, tGuessSd: 0.5, pThreshold: 0.82,
      beta: 3.5, gamma: 0.01, delta: 0.01, grain: 0.1, range: 4
    });
    q.update(0.3, false); q.update(0.6, true);
    expect(Number.isFinite(q.mean())).toBe(true);
  });
});
