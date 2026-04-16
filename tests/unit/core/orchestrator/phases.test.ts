import { describe, it, expect } from 'vitest';
import { computePhase } from '~/core/orchestrator/phases';

describe('orchestrator phases', () => {
  it('week 1 is ramp', () => {
    expect(computePhase({ sessionsTotal: 3, weeksActive: 1 })).toBe('ramp');
  });
  it('week 5 is intensive', () => {
    expect(computePhase({ sessionsTotal: 25, weeksActive: 5 })).toBe('intensive');
  });
  it('week 10 is consolidation', () => {
    expect(computePhase({ sessionsTotal: 55, weeksActive: 10 })).toBe('consolidation');
  });
  it('week 13 is maintenance', () => {
    expect(computePhase({ sessionsTotal: 80, weeksActive: 13 })).toBe('maintenance');
  });
});
