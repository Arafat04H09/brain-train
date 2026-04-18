import { describe, it, expect } from 'vitest';
import { generateFlankerTrials, scoreFlanker } from '~/core/modules/assessment/flanker-task';

describe('Flanker assessment', () => {
  it('generates 24 trials with balanced congruency', () => {
    const trials = generateFlankerTrials();
    expect(trials).toHaveLength(24);
    const congruent = trials.filter(t => t.congruent);
    const incongruent = trials.filter(t => !t.congruent);
    expect(congruent).toHaveLength(12);
    expect(incongruent).toHaveLength(12);
  });

  it('each trial has direction left or right', () => {
    const trials = generateFlankerTrials();
    for (const t of trials) {
      expect(['left', 'right']).toContain(t.direction);
    }
  });

  it('scores conflict cost as incongruent minus congruent mean RT', () => {
    const rts = [
      { congruent: true, rt: 300 },
      { congruent: true, rt: 320 },
      { congruent: false, rt: 400 },
      { congruent: false, rt: 420 },
    ];
    const result = scoreFlanker(rts);
    expect(result.congruentMeanRT).toBe(310);
    expect(result.incongruentMeanRT).toBe(410);
    expect(result.conflictCost).toBe(100);
  });

  it('returns 0 conflict cost when no valid RTs', () => {
    const result = scoreFlanker([]);
    expect(result.conflictCost).toBe(0);
  });
});
