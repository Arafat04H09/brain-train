import { describe, it, expect } from 'vitest';
import { generateNBackBlock, NBACK_LETTERS, NBACK_POSITIONS } from '~/core/modules/working-memory/dual-nback';

describe('dual n-back generator', () => {
  it('has 8 consonants and 8 positions', () => {
    expect(NBACK_LETTERS.length).toBe(8);
    expect(NBACK_POSITIONS.length).toBe(8);
  });

  it('generates N+20 trials for N=2', () => {
    const block = generateNBackBlock({ n: 2, nTargets: 6, nDualTargets: 2, nLures: 4, seed: 42 });
    expect(block.trials.length).toBeGreaterThanOrEqual(22);
  });

  it('guarantees ≥6 position targets and ≥6 audio targets and ≥2 duals', () => {
    const block = generateNBackBlock({ n: 2, nTargets: 6, nDualTargets: 2, nLures: 4, seed: 42 });
    const posTargets = block.trials.filter(t => t.isPositionTarget).length;
    const audTargets = block.trials.filter(t => t.isAudioTarget).length;
    const duals = block.trials.filter(t => t.isPositionTarget && t.isAudioTarget).length;
    expect(posTargets).toBeGreaterThanOrEqual(6);
    expect(audTargets).toBeGreaterThanOrEqual(6);
    expect(duals).toBeGreaterThanOrEqual(2);
  });

  it('is deterministic given a seed', () => {
    const a = generateNBackBlock({ n: 2, nTargets: 6, nDualTargets: 2, nLures: 4, seed: 123 });
    const b = generateNBackBlock({ n: 2, nTargets: 6, nDualTargets: 2, nLures: 4, seed: 123 });
    expect(a.trials.map(t => t.position + t.letter)).toEqual(b.trials.map(t => t.position + t.letter));
  });
});
