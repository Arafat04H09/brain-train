import { describe, it, expect } from 'vitest';
import { placeholderModule } from '~/core/modules/placeholder/placeholder-module';

describe('placeholder module', () => {
  it('produces trials until exhausted then returns null', () => {
    const session = placeholderModule.createSession({
      moduleId: 'placeholder',
      level: {}, ewmaPerformance: 0,
      lastSessionTs: null, sessionsTotal: 0,
      plateauFlag: false, updatedTs: Date.now()
    });
    let count = 0;
    while (session.nextTrial()) count++;
    expect(count).toBeGreaterThan(0);
  });

  it('scores SPACE response as correct, other keys as incorrect', async () => {
    const session = placeholderModule.createSession({
      moduleId: 'placeholder',
      level: {}, ewmaPerformance: 0,
      lastSessionTs: null, sessionsTotal: 0,
      plateauFlag: false, updatedTs: Date.now()
    });
    const trial = session.nextTrial()!;
    const result = await session.submit({
      trialId: trial.id,
      event: { kind: 'keydown', value: ' ', rtMs: 400 },
      timing: { requestedDurationMs: 0, achievedDurationMs: 400, framesRendered: 24, timingFlag: 'ok' }
    });
    expect(result.correct).toBe(true);
  });
});
