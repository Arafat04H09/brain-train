import { describe, it, expect } from 'vitest';
import { MetacogAccumulator } from '~/core/overlay/metacog';

describe('MetacogAccumulator', () => {
  it('records predictions and outcomes, returning running Brier', () => {
    const m = new MetacogAccumulator();
    m.record('b1', 0.8, 1.0);
    m.record('b2', 0.5, 0.0);
    const brier = m.brier();
    // (0.8-1)^2=0.04, (0.5-0)^2=0.25 → mean 0.145
    expect(brier).toBeCloseTo(0.145, 3);
  });

  it('returns empty stats with no data', () => {
    const m = new MetacogAccumulator();
    expect(m.brier()).toBe(0);
  });
});
