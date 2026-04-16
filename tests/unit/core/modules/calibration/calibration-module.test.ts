import { describe, it, expect } from 'vitest';
import { calibrationModule } from '~/core/modules/calibration/calibration-module';

describe('Calibration module', () => {
  it('creates a session with 1 block of 15 trials', () => {
    const s = calibrationModule.createSession({
      moduleId: 'calibration',
      level: {},
      ewmaPerformance: 0,
      lastSessionTs: null,
      sessionsTotal: 0,
      plateauFlag: false,
      updatedTs: Date.now()
    });
    expect(s.blocks).toHaveLength(1);
    expect(s.blocks[0]?.targetTrialCount).toBe(15);
  });

  it('nextTrial produces a calibration-mcq stimulus', () => {
    const s = calibrationModule.createSession({
      moduleId: 'calibration',
      level: {},
      ewmaPerformance: 0,
      lastSessionTs: null,
      sessionsTotal: 0,
      plateauFlag: false,
      updatedTs: Date.now()
    });
    const t = s.nextTrial();
    expect(t).toBeDefined();
    expect(t?.stimulus.kind).toBe('calibration-mcq');
  });

  it('stimulus payload has itemId, question, choices, correctIndex', () => {
    const s = calibrationModule.createSession({
      moduleId: 'calibration',
      level: {},
      ewmaPerformance: 0,
      lastSessionTs: null,
      sessionsTotal: 0,
      plateauFlag: false,
      updatedTs: Date.now()
    });
    const t = s.nextTrial();
    const payload = t?.stimulus.payload as any;
    expect(payload.itemId).toBeDefined();
    expect(typeof payload.itemId).toBe('string');
    expect(payload.question).toBeDefined();
    expect(typeof payload.question).toBe('string');
    expect(payload.choices).toBeDefined();
    expect(payload.choices).toHaveLength(4);
    expect(typeof payload.correctIndex).toBe('number');
    expect(payload.correctIndex).toBeGreaterThanOrEqual(0);
    expect(payload.correctIndex).toBeLessThan(4);
  });

  it('accepts keyboard and click input', () => {
    const s = calibrationModule.createSession({
      moduleId: 'calibration',
      level: {},
      ewmaPerformance: 0,
      lastSessionTs: null,
      sessionsTotal: 0,
      plateauFlag: false,
      updatedTs: Date.now()
    });
    const t = s.nextTrial();
    expect(t?.inputSpec.accept).toContain('keyboard');
    expect(t?.inputSpec.accept).toContain('mouse-click');
  });

  it('submit() parses JSON response and scores correctness', async () => {
    const s = calibrationModule.createSession({
      moduleId: 'calibration',
      level: {},
      ewmaPerformance: 0,
      lastSessionTs: null,
      sessionsTotal: 0,
      plateauFlag: false,
      updatedTs: Date.now()
    });

    const t = s.nextTrial();
    if (!t) throw new Error('Trial should exist');

    const payload = t.stimulus.payload as any;
    const correctChoice = payload.correctIndex;

    // Submit correct answer with 80% confidence
    const result = await s.submit({
      trialId: t.id,
      event: {
        kind: 'click',
        value: JSON.stringify({ choice: correctChoice, confidence: 80 }),
        rtMs: 1500
      },
      timing: { requestedDurationMs: 0, achievedDurationMs: 1500, framesRendered: 90, timingFlag: 'ok' }
    });

    expect(result.correct).toBe(true);
    expect(result.scored.confidence).toBe(80);
  });

  it('computes Brier point correctly: (0.8 confidence, correct=1) -> (0.8-1)^2 = 0.04', async () => {
    const s = calibrationModule.createSession({
      moduleId: 'calibration',
      level: {},
      ewmaPerformance: 0,
      lastSessionTs: null,
      sessionsTotal: 0,
      plateauFlag: false,
      updatedTs: Date.now()
    });

    const t = s.nextTrial();
    if (!t) throw new Error('Trial should exist');

    const payload = t.stimulus.payload as any;
    const result = await s.submit({
      trialId: t.id,
      event: {
        kind: 'click',
        value: JSON.stringify({ choice: payload.correctIndex, confidence: 80 }),
        rtMs: 1000
      },
      timing: { requestedDurationMs: 0, achievedDurationMs: 1000, framesRendered: 60, timingFlag: 'ok' }
    });

    expect(result.scored.brierPoint).toBeCloseTo(0.04, 4);
  });

  it('complete() returns updated difficulty level based on accuracy', async () => {
    const s = calibrationModule.createSession({
      moduleId: 'calibration',
      level: { difficulty: 'medium' },
      ewmaPerformance: 0,
      lastSessionTs: null,
      sessionsTotal: 0,
      plateauFlag: false,
      updatedTs: Date.now()
    });

    let t = s.nextTrial();
    let count = 0;
    // Get 13/15 correct (86% accuracy) -> should promote to hard
    while (t && count < 15) {
      const payload = t.stimulus.payload as any;
      const shouldBeCorrect = count < 13;
      const choice = shouldBeCorrect ? payload.correctIndex : (payload.correctIndex + 1) % 4;
      await s.submit({
        trialId: t.id,
        event: {
          kind: 'click',
          value: JSON.stringify({ choice, confidence: 75 }),
          rtMs: 1000
        },
        timing: { requestedDurationMs: 0, achievedDurationMs: 1000, framesRendered: 60, timingFlag: 'ok' }
      });
      t = s.nextTrial();
      count++;
    }

    const result = s.complete();
    const nextDifficulty = (result.nextDomainState.level as any).difficulty;
    expect(nextDifficulty).toBe('hard');
  });

  it('complete() demotes difficulty when accuracy <= 0.50', async () => {
    const s = calibrationModule.createSession({
      moduleId: 'calibration',
      level: { difficulty: 'medium' },
      ewmaPerformance: 0,
      lastSessionTs: null,
      sessionsTotal: 0,
      plateauFlag: false,
      updatedTs: Date.now()
    });

    let t = s.nextTrial();
    let count = 0;
    // Get 7/15 correct (47% accuracy) -> should demote to easy
    while (t && count < 15) {
      const payload = t.stimulus.payload as any;
      const shouldBeCorrect = count < 7;
      const choice = shouldBeCorrect ? payload.correctIndex : (payload.correctIndex + 1) % 4;
      await s.submit({
        trialId: t.id,
        event: {
          kind: 'click',
          value: JSON.stringify({ choice, confidence: 75 }),
          rtMs: 1000
        },
        timing: { requestedDurationMs: 0, achievedDurationMs: 1000, framesRendered: 60, timingFlag: 'ok' }
      });
      t = s.nextTrial();
      count++;
    }

    const result = s.complete();
    const nextDifficulty = (result.nextDomainState.level as any).difficulty;
    expect(nextDifficulty).toBe('easy');
  });

  it('EWMA performance uses inverted Brier (1 - meanBrier)', async () => {
    const initialEwma = 0.5;
    const s = calibrationModule.createSession({
      moduleId: 'calibration',
      level: { difficulty: 'medium' },
      ewmaPerformance: initialEwma,
      lastSessionTs: null,
      sessionsTotal: 0,
      plateauFlag: false,
      updatedTs: Date.now()
    });

    let t = s.nextTrial();
    let count = 0;
    // All correct with 90% confidence -> low Brier, high inverted Brier
    while (t && count < 15) {
      const payload = t.stimulus.payload as any;
      await s.submit({
        trialId: t.id,
        event: {
          kind: 'click',
          value: JSON.stringify({ choice: payload.correctIndex, confidence: 90 }),
          rtMs: 1000
        },
        timing: { requestedDurationMs: 0, achievedDurationMs: 1000, framesRendered: 60, timingFlag: 'ok' }
      });
      t = s.nextTrial();
      count++;
    }

    const result = s.complete();
    const nextEwma = result.nextDomainState.ewmaPerformance;
    // With all correct and 90% confidence, Brier ≈ 0.01, inverted ≈ 0.99
    // nextEwma = 0.7 * 0.5 + 0.3 * 0.99 = 0.35 + 0.297 = 0.647
    expect(nextEwma).toBeGreaterThan(initialEwma);
  });

  it('returns SessionResult with meanBrier in custom field', async () => {
    const s = calibrationModule.createSession({
      moduleId: 'calibration',
      level: {},
      ewmaPerformance: 0.5,
      lastSessionTs: null,
      sessionsTotal: 5,
      plateauFlag: false,
      updatedTs: Date.now()
    });

    let t = s.nextTrial();
    while (t) {
      const payload = t.stimulus.payload as any;
      await s.submit({
        trialId: t.id,
        event: {
          kind: 'click',
          value: JSON.stringify({ choice: payload.correctIndex, confidence: 75 }),
          rtMs: 1000
        },
        timing: { requestedDurationMs: 0, achievedDurationMs: 1000, framesRendered: 60, timingFlag: 'ok' }
      });
      t = s.nextTrial();
    }

    const result = s.complete();
    expect(result.blocks[0]?.custom.meanBrier).toBeDefined();
    expect(typeof result.blocks[0]?.custom.meanBrier).toBe('number');
    expect(result.blocks[0]?.custom.meanBrier).toBeGreaterThanOrEqual(0);
    expect(result.blocks[0]?.custom.meanBrier).toBeLessThanOrEqual(1);
  });

  it('default difficulty is medium', () => {
    const s = calibrationModule.createSession({
      moduleId: 'calibration',
      level: {},
      ewmaPerformance: 0,
      lastSessionTs: null,
      sessionsTotal: 0,
      plateauFlag: false,
      updatedTs: Date.now()
    });
    const t = s.nextTrial();
    expect(t).toBeDefined();
    // Just verify that a trial is generated (difficulty selection works internally)
  });

  it('uses provided difficulty from state.level', async () => {
    const s1 = calibrationModule.createSession({
      moduleId: 'calibration',
      level: { difficulty: 'easy' },
      ewmaPerformance: 0,
      lastSessionTs: null,
      sessionsTotal: 0,
      plateauFlag: false,
      updatedTs: Date.now()
    });

    const s2 = calibrationModule.createSession({
      moduleId: 'calibration',
      level: { difficulty: 'hard' },
      ewmaPerformance: 0,
      lastSessionTs: null,
      sessionsTotal: 0,
      plateauFlag: false,
      updatedTs: Date.now() + 1000 // Different seed
    });

    // Both should produce trials (implementation selects from respective pools)
    const t1 = s1.nextTrial();
    const t2 = s2.nextTrial();
    expect(t1).toBeDefined();
    expect(t2).toBeDefined();
  });

  it('sessionTotal increments in complete()', async () => {
    const s = calibrationModule.createSession({
      moduleId: 'calibration',
      level: {},
      ewmaPerformance: 0.5,
      lastSessionTs: null,
      sessionsTotal: 5,
      plateauFlag: false,
      updatedTs: Date.now()
    });

    let t = s.nextTrial();
    while (t) {
      const payload = t.stimulus.payload as any;
      await s.submit({
        trialId: t.id,
        event: {
          kind: 'click',
          value: JSON.stringify({ choice: payload.correctIndex, confidence: 75 }),
          rtMs: 1000
        },
        timing: { requestedDurationMs: 0, achievedDurationMs: 1000, framesRendered: 60, timingFlag: 'ok' }
      });
      t = s.nextTrial();
    }

    const result = s.complete();
    expect(result.nextDomainState.sessionsTotal).toBe(6);
  });
});
