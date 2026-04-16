import { describe, it, expect } from 'vitest';
import { relationalModule } from '~/core/modules/relational/relational-module';

describe('Relational module', () => {
  it('creates a session with 1 block of 12 trials', () => {
    const s = relationalModule.createSession({
      moduleId: 'relational',
      level: {},
      ewmaPerformance: 0,
      lastSessionTs: null,
      sessionsTotal: 0,
      plateauFlag: false,
      updatedTs: Date.now()
    });
    expect(s.blocks).toHaveLength(1);
    expect(s.blocks[0]?.targetTrialCount).toBe(12);
  });

  it('nextTrial produces a matrix-3x3 stimulus', () => {
    const s = relationalModule.createSession({
      moduleId: 'relational',
      level: {},
      ewmaPerformance: 0,
      lastSessionTs: null,
      sessionsTotal: 0,
      plateauFlag: false,
      updatedTs: Date.now()
    });
    const t = s.nextTrial();
    expect(t).toBeDefined();
    expect(t?.stimulus.kind).toBe('matrix-3x3');
  });

  it('stimulus payload has grid + choices, and correctIdx lives in metadata (not leaked to UI)', () => {
    const s = relationalModule.createSession({
      moduleId: 'relational',
      level: {},
      ewmaPerformance: 0,
      lastSessionTs: null,
      sessionsTotal: 0,
      plateauFlag: false,
      updatedTs: Date.now()
    });
    const t = s.nextTrial();
    const payload = t?.stimulus.payload as any;
    expect(payload.grid).toBeDefined();
    expect(payload.grid).toHaveLength(9);
    expect(payload.choices).toBeDefined();
    expect(payload.choices).toHaveLength(8);
    expect(payload.correctIdx).toBeUndefined();
    expect(typeof (t?.metadata as any)?.correctIdx).toBe('number');
  });

  it('accepts keyboard input 1-8', () => {
    const s = relationalModule.createSession({
      moduleId: 'relational',
      level: {},
      ewmaPerformance: 0,
      lastSessionTs: null,
      sessionsTotal: 0,
      plateauFlag: false,
      updatedTs: Date.now()
    });
    const t = s.nextTrial();
    expect(t?.inputSpec.keys).toContain('1');
    expect(t?.inputSpec.keys).toContain('8');
  });

  it('initial default ruleCount is 1', () => {
    const s = relationalModule.createSession({
      moduleId: 'relational',
      level: {},
      ewmaPerformance: 0,
      lastSessionTs: null,
      sessionsTotal: 0,
      plateauFlag: false,
      updatedTs: Date.now()
    });
    const t = s.nextTrial();
    const payload = t?.stimulus.payload as any;
    expect(payload.ruleCount).toBe(1);
  });

  it('completes after 12 trials with all correct -> ruleCount bumps to 2', async () => {
    const s = relationalModule.createSession({
      moduleId: 'relational',
      level: {},
      ewmaPerformance: 0,
      lastSessionTs: null,
      sessionsTotal: 0,
      plateauFlag: false,
      updatedTs: Date.now()
    });

    let t = s.nextTrial();
    let count = 0;
    while (t && count < 12) {
      const correctIdx = (t.metadata as any).correctIdx as number;
      await s.submit({
        trialId: t.id,
        event: { kind: 'keydown', value: String(correctIdx + 1), rtMs: 800 },
        timing: { requestedDurationMs: 0, achievedDurationMs: 800, framesRendered: 48, timingFlag: 'ok' }
      });
      t = s.nextTrial();
      count++;
    }

    const result = s.complete();
    const nextRuleCount = (result.nextDomainState.level as any).ruleCount;
    expect(nextRuleCount).toBe(2);
  });

  it('completes with all wrong -> ruleCount stays at 1 (floor)', async () => {
    const s = relationalModule.createSession({
      moduleId: 'relational',
      level: { ruleCount: 1 },
      ewmaPerformance: 0,
      lastSessionTs: null,
      sessionsTotal: 0,
      plateauFlag: false,
      updatedTs: Date.now()
    });

    let t = s.nextTrial();
    let count = 0;
    while (t && count < 12) {
      // Always pick wrong answer (correctIdx + 1 wraps, or pick 1 if correct is 8)
      const correctIdx = (t.metadata as any).correctIdx as number;
      const wrongIdx = (correctIdx + 1) % 8;
      await s.submit({
        trialId: t.id,
        event: { kind: 'keydown', value: String(wrongIdx + 1), rtMs: 800 },
        timing: { requestedDurationMs: 0, achievedDurationMs: 800, framesRendered: 48, timingFlag: 'ok' }
      });
      t = s.nextTrial();
      count++;
    }

    const result = s.complete();
    const nextRuleCount = (result.nextDomainState.level as any).ruleCount;
    expect(nextRuleCount).toBe(1);
  });

  it('completes with ~50% accuracy -> ruleCount stays same', async () => {
    const s = relationalModule.createSession({
      moduleId: 'relational',
      level: { ruleCount: 2 },
      ewmaPerformance: 0.5,
      lastSessionTs: null,
      sessionsTotal: 0,
      plateauFlag: false,
      updatedTs: Date.now()
    });

    let t = s.nextTrial();
    let count = 0;
    while (t && count < 12) {
      const correctIdx = (t.metadata as any).correctIdx as number;
      // Alternate correct/wrong
      const isCorrect = count % 2 === 0;
      const idx = isCorrect ? correctIdx : (correctIdx + 1) % 8;
      await s.submit({
        trialId: t.id,
        event: { kind: 'keydown', value: String(idx + 1), rtMs: 800 },
        timing: { requestedDurationMs: 0, achievedDurationMs: 800, framesRendered: 48, timingFlag: 'ok' }
      });
      t = s.nextTrial();
      count++;
    }

    const result = s.complete();
    const nextRuleCount = (result.nextDomainState.level as any).ruleCount;
    expect(nextRuleCount).toBe(2);
  });

  it('uses provided ruleCount from state.level', () => {
    const s = relationalModule.createSession({
      moduleId: 'relational',
      level: { ruleCount: 3 },
      ewmaPerformance: 0.7,
      lastSessionTs: null,
      sessionsTotal: 0,
      plateauFlag: false,
      updatedTs: Date.now()
    });
    const t = s.nextTrial();
    const payload = t?.stimulus.payload as any;
    expect(payload.ruleCount).toBe(3);
  });

  it('returns SessionResult with updated ewmaPerformance', async () => {
    const s = relationalModule.createSession({
      moduleId: 'relational',
      level: {},
      ewmaPerformance: 0.5,
      lastSessionTs: null,
      sessionsTotal: 5,
      plateauFlag: false,
      updatedTs: Date.now()
    });

    let t = s.nextTrial();
    while (t) {
      const correctIdx = (t.metadata as any).correctIdx as number;
      await s.submit({
        trialId: t.id,
        event: { kind: 'keydown', value: String(correctIdx + 1), rtMs: 800 },
        timing: { requestedDurationMs: 0, achievedDurationMs: 800, framesRendered: 48, timingFlag: 'ok' }
      });
      t = s.nextTrial();
    }

    const result = s.complete();
    expect(result.nextDomainState.ewmaPerformance).toBeGreaterThan(0.5);
    expect(result.nextDomainState.sessionsTotal).toBe(6);
  });
});
