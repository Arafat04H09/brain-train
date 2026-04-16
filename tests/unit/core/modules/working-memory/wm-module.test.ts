import { describe, it, expect } from 'vitest';
import { wmModule } from '~/core/modules/working-memory/wm-module';
import type { DomainState } from '~/types/domain';

const baseState: DomainState = {
  moduleId: 'working-memory', level: { n: 2 }, ewmaPerformance: 0.6,
  lastSessionTs: null, sessionsTotal: 0, plateauFlag: false, updatedTs: Date.now()
};

describe('WM module session', () => {
  it('creates a session with at least 1 block of N+20 trials', () => {
    const s = wmModule.createSession(baseState);
    expect(s.blocks.length).toBeGreaterThan(0);
    const total = s.blocks.reduce((sum, b) => sum + b.targetTrialCount, 0);
    expect(total).toBeGreaterThanOrEqual(22);
  });

  it('scores and completes, returning next N in domain state', async () => {
    const s = wmModule.createSession(baseState);
    let t = s.nextTrial();
    while (t) {
      // always "no match" answer (Escape) for determinism
      await s.submit({
        trialId: t.id,
        event: { kind: 'keydown', value: 'Escape', rtMs: 400 },
        timing: { requestedDurationMs: 500, achievedDurationMs: 500, framesRendered: 30, timingFlag: 'ok' }
      });
      t = s.nextTrial();
    }
    const result = s.complete();
    expect(typeof (result.nextDomainState.level as any).n).toBe('number');
  });
});
