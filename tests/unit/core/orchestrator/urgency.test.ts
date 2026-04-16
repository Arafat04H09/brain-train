import { describe, it, expect } from 'vitest';
import { urgencyScore } from '~/core/orchestrator/urgency';

describe('urgency score', () => {
  it('never-trained domain has max urgency', () => {
    expect(urgencyScore({ daysSinceLast: Infinity, plateauFlag: false, decayFlag: false }))
      .toBeGreaterThan(1.5);
  });
  it('recently-trained has low urgency', () => {
    expect(urgencyScore({ daysSinceLast: 0, plateauFlag: false, decayFlag: false }))
      .toBeLessThan(0.5);
  });
  it('plateau reduces urgency', () => {
    const plateaued = urgencyScore({ daysSinceLast: 3, plateauFlag: true, decayFlag: false });
    const normal = urgencyScore({ daysSinceLast: 3, plateauFlag: false, decayFlag: false });
    expect(plateaued).toBeLessThan(normal);
  });
  it('decay boosts urgency (maintenance)', () => {
    const decaying = urgencyScore({ daysSinceLast: 7, plateauFlag: false, decayFlag: true });
    const normal = urgencyScore({ daysSinceLast: 7, plateauFlag: false, decayFlag: false });
    expect(decaying).toBeGreaterThan(normal);
  });
});
