import { describe, it, expect } from 'vitest';
import { generateEfBlock } from '~/core/modules/compound-ef/ef-generator';

describe('Compound EF generator', () => {
  it('generates a block of N trials', () => {
    const b = generateEfBlock({ nTrials: 48, seed: 1, rules: ['color', 'shape'],
      switchFreq: 0.5, congruencyIncongruent: 0.5, stopSignalProb: 0.25 });
    expect(b.trials.length).toBe(48);
  });

  it('roughly 25% stop-signal trials', () => {
    const b = generateEfBlock({ nTrials: 200, seed: 1, rules: ['color', 'shape'],
      switchFreq: 0.5, congruencyIncongruent: 0.5, stopSignalProb: 0.25 });
    const stops = b.trials.filter(t => t.hasStopSignal).length;
    expect(stops).toBeGreaterThan(30);
    expect(stops).toBeLessThan(70);
  });

  it('switches at roughly switchFreq rate', () => {
    const b = generateEfBlock({ nTrials: 200, seed: 1, rules: ['color', 'shape'],
      switchFreq: 0.5, congruencyIncongruent: 0.5, stopSignalProb: 0.25 });
    let switches = 0;
    for (let i = 1; i < b.trials.length; i++) {
      if (b.trials[i]!.rule !== b.trials[i-1]!.rule) switches++;
    }
    expect(switches / (b.trials.length - 1)).toBeGreaterThan(0.3);
    expect(switches / (b.trials.length - 1)).toBeLessThan(0.7);
  });

  it('is deterministic given seed', () => {
    const a = generateEfBlock({ nTrials: 20, seed: 42, rules: ['color', 'shape'],
      switchFreq: 0.5, congruencyIncongruent: 0.5, stopSignalProb: 0.25 });
    const b = generateEfBlock({ nTrials: 20, seed: 42, rules: ['color', 'shape'],
      switchFreq: 0.5, congruencyIncongruent: 0.5, stopSignalProb: 0.25 });
    expect(a.trials.map(t => t.rule + t.color + t.shape)).toEqual(b.trials.map(t => t.rule + t.color + t.shape));
  });
});
