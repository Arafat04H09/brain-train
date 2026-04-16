import { describe, it, expect } from 'vitest';
import { composeSession } from '~/core/orchestrator/session-composer';
import type { DomainState } from '~/types/domain';
import type { ModuleId } from '~/types/module';

const mk = (moduleId: ModuleId, daysAgo: number): DomainState => ({
  moduleId, level: {}, ewmaPerformance: 0.7,
  lastSessionTs: Date.now() - daysAgo * 86400000,
  sessionsTotal: 5, plateauFlag: false, updatedTs: Date.now()
});

describe('session composer', () => {
  it('ramp phase picks exactly one domain', () => {
    const states = [mk('working-memory', 2), mk('ufov', 1), mk('relational', 5)];
    const plan = composeSession({ phase: 'ramp', states, targetMinutes: 25 });
    expect(plan.modules.length).toBe(1);
  });
  it('intensive phase picks two domains for AB interleaving', () => {
    const states = [mk('working-memory', 3), mk('ufov', 2), mk('relational', 4)];
    const plan = composeSession({ phase: 'intensive', states, targetMinutes: 25 });
    expect(plan.modules.length).toBe(2);
    expect(plan.interleave).toBe(true);
  });
  it('respects target minutes and hard cap', () => {
    const states = [mk('working-memory', 3)];
    const plan = composeSession({ phase: 'ramp', states, targetMinutes: 25 });
    const total = plan.modules.reduce((s, m) => s + m.targetMinutes, 0);
    expect(total).toBeLessThanOrEqual(30);
  });
});
