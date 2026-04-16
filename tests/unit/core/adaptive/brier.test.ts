import { describe, it, expect } from 'vitest';
import { brierScore, brierDecomposition } from '~/core/adaptive/brier';

describe('Brier score', () => {
  it('perfect calibration returns 0', () => {
    expect(brierScore([{ p: 1, outcome: 1 }, { p: 0, outcome: 0 }])).toBe(0);
  });
  it('max error returns 1', () => {
    expect(brierScore([{ p: 1, outcome: 0 }])).toBe(1);
  });
  it('decomposition reliability + resolution - uncertainty ≈ Brier', () => {
    const data = [
      { p: 0.9, outcome: 1 as const }, { p: 0.9, outcome: 1 as const }, { p: 0.9, outcome: 0 as const },
      { p: 0.5, outcome: 1 as const }, { p: 0.5, outcome: 0 as const },
      { p: 0.1, outcome: 0 as const }, { p: 0.1, outcome: 0 as const }
    ];
    const d = brierDecomposition(data, 10);
    const brier = brierScore(data);
    expect(d.reliability - d.resolution + d.uncertainty).toBeCloseTo(brier, 2);
  });
});
