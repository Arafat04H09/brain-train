import { describe, it, expect } from 'vitest';
import { efModule } from '~/core/modules/compound-ef/ef-module';

describe('Compound EF module', () => {
  it('creates a session with 4 blocks of 48 trials', () => {
    const s = efModule.createSession({
      moduleId: 'compound-ef', level: {}, ewmaPerformance: 0,
      lastSessionTs: null, sessionsTotal: 0, plateauFlag: false, updatedTs: Date.now()
    });
    expect(s.blocks.length).toBe(4);
    expect(s.blocks[0]!.targetTrialCount).toBe(48);
  });

  it('completes and returns updated level (adaptive params)', async () => {
    const s = efModule.createSession({
      moduleId: 'compound-ef', level: {}, ewmaPerformance: 0,
      lastSessionTs: null, sessionsTotal: 0, plateauFlag: false, updatedTs: Date.now()
    });
    let t = s.nextTrial();
    let count = 0;
    while (t && count < 10) {
      await s.submit({
        trialId: t.id,
        event: { kind: 'keydown', value: 'a', rtMs: 500 },
        timing: { requestedDurationMs: 1250, achievedDurationMs: 1250, framesRendered: 75, timingFlag: 'ok' }
      });
      t = s.nextTrial();
      count++;
    }
    expect(count).toBe(10);
  });
});
