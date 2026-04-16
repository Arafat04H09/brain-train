import { describe, it, expect } from 'vitest';
import { ufovModule } from '~/core/modules/ufov/ufov-module';

describe('UFOV module', () => {
  it('creates a session with one block per subtest', () => {
    const s = ufovModule.createSession({
      moduleId: 'ufov', level: { thresholds: {} }, ewmaPerformance: 0,
      lastSessionTs: null, sessionsTotal: 0, plateauFlag: false, updatedTs: Date.now()
    });
    expect(s.blocks.length).toBe(4);
  });

  it('nextTrial produces a ufov-peripheral stimulus', () => {
    const s = ufovModule.createSession({
      moduleId: 'ufov', level: {}, ewmaPerformance: 0,
      lastSessionTs: null, sessionsTotal: 0, plateauFlag: false, updatedTs: Date.now()
    });
    const t = s.nextTrial()!;
    expect(t.stimulus.kind).toBe('ufov-peripheral');
  });

  it('complete() returns updated thresholds per subtest in domain state', async () => {
    const s = ufovModule.createSession({
      moduleId: 'ufov', level: {}, ewmaPerformance: 0,
      lastSessionTs: null, sessionsTotal: 0, plateauFlag: false, updatedTs: Date.now()
    });
    let t = s.nextTrial();
    while (t) {
      await s.submit({
        trialId: t.id,
        event: { kind: 'keydown', value: 'c', rtMs: 400 },
        timing: { requestedDurationMs: 100, achievedDurationMs: 100, framesRendered: 6, timingFlag: 'ok' }
      });
      t = s.nextTrial();
    }
    const r = s.complete();
    const thresholds = (r.nextDomainState.level as any).thresholds;
    expect(thresholds).toBeDefined();
    expect(typeof thresholds.focused).toBe('number');
  });
});
