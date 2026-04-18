import { describe, it, expect } from 'vitest';
import { assessmentModule } from '~/core/modules/assessment/assessment-module';
import type { DomainState } from '~/types/domain';

describe('assessmentModule', () => {
  const initialState: DomainState = {
    moduleId: 'transfer-battery',
    level: {},
    ewmaPerformance: 0,
    lastSessionTs: null,
    sessionsTotal: 0,
    plateauFlag: false,
    updatedTs: Date.now()
  };

  it('creates a session with 3 blocks', () => {
    const session = assessmentModule.createSession(initialState);
    expect(session.blocks).toHaveLength(3);
    expect(session.blocks[0]!.kind).toBe('assessment-matrix');
    expect(session.blocks[1]!.kind).toBe('simple-rt');
    expect(session.blocks[2]!.kind).toBe('flanker-assessment');
  });

  it('matrix block has 5 trials with matrix-3x3 stimulus', () => {
    const session = assessmentModule.createSession(initialState);
    const trials: any[] = [];
    let trial = session.nextTrial();
    while (trial && trial.blockIndex === 0) {
      trials.push(trial);
      trial = session.nextTrial();
    }
    expect(trials).toHaveLength(5);
    expect(trials[0]!.stimulus.kind).toBe('matrix-3x3');
  });

  it('RT block has 20 trials with simple-rt stimulus', () => {
    const session = assessmentModule.createSession(initialState);
    // Skip matrix trials
    for (let i = 0; i < 5; i++) session.nextTrial();

    const trials: any[] = [];
    let trial = session.nextTrial();
    while (trial && trial.blockIndex === 1) {
      trials.push(trial);
      trial = session.nextTrial();
    }
    expect(trials).toHaveLength(20);
    expect(trials[0]!.stimulus.kind).toBe('simple-rt');
  });

  it('matrix items are identical across sessions (deterministic seeds)', () => {
    const session1 = assessmentModule.createSession(initialState);
    const session2 = assessmentModule.createSession(initialState);

    const trials1: any[] = [];
    const trials2: any[] = [];

    let t1 = session1.nextTrial();
    let t2 = session2.nextTrial();
    while (t1 && t1.blockIndex === 0) {
      trials1.push(t1);
      t1 = session1.nextTrial();
    }
    while (t2 && t2.blockIndex === 0) {
      trials2.push(t2);
      t2 = session2.nextTrial();
    }

    // Same number of trials
    expect(trials1).toHaveLength(trials2.length);

    // Grid should be identical
    for (let i = 0; i < trials1.length; i++) {
      const grid1 = (trials1[i]!.stimulus.payload as any).grid;
      const grid2 = (trials2[i]!.stimulus.payload as any).grid;
      expect(grid1).toEqual(grid2);
    }
  });

  it('computes matrix accuracy from correct responses', async () => {
    const session = assessmentModule.createSession(initialState);

    // Collect matrix trials
    const trials: any[] = [];
    let trial = session.nextTrial();
    while (trial && trial.blockIndex === 0) {
      trials.push(trial);
      trial = session.nextTrial();
    }

    // Submit responses: first 3 correct, last 2 wrong
    for (let i = 0; i < trials.length; i++) {
      const correctIdx = trials[i]!.metadata.correctIdx;
      const responseValue = i < 3 ? String(correctIdx + 1) : '1'; // wrong choice

      await session.submit({
        trialId: trials[i]!.id,
        event: { kind: 'keydown', value: responseValue, rtMs: 500 },
        timing: {
          requestedDurationMs: 60000,
          achievedDurationMs: 500,
          framesRendered: 30,
          timingFlag: 'ok'
        }
      });
    }

    const result = session.complete();
    const matrixBlock = result.blocks[0]!;
    expect(matrixBlock.accuracy).toBe(0.6); // 3/5
  });

  it('throws out RTs outside 100-1500ms range', async () => {
    const session = assessmentModule.createSession(initialState);

    // Skip matrix trials
    for (let i = 0; i < 5; i++) session.nextTrial();

    // Collect RT trials
    const trials: any[] = [];
    let trial = session.nextTrial();
    while (trial && trial.blockIndex === 1) {
      trials.push(trial);
      trial = session.nextTrial();
    }

    // Submit responses with mixed valid/invalid RTs
    const rtValues = [50, 150, 500, 1600, 200, 300, ...Array(14).fill(400)];
    for (let i = 0; i < trials.length; i++) {
      const rtMs = rtValues[i]!;
      await session.submit({
        trialId: trials[i]!.id,
        event: { kind: 'keydown', value: 'Space', rtMs },
        timing: {
          requestedDurationMs: 0,
          achievedDurationMs: rtMs,
          framesRendered: 10,
          timingFlag: 'ok'
        }
      });
    }

    const result = session.complete();
    const rtBlock = result.blocks[1]!;

    // Valid RTs: 150, 500, 200, 300, 400x14 = 18 trials
    // Mean should exclude 50 and 1600
    const validRTs = [150, 500, 200, 300, ...Array(14).fill(400)];
    const expectedMean = validRTs.reduce((a, b) => a + b, 0) / validRTs.length;

    expect(rtBlock.custom.meanRT).toBeCloseTo(expectedMean, 1);
  });

  it('returns SessionResult with updated state', async () => {
    const session = assessmentModule.createSession(initialState);

    // Quickly collect all trials without submitting (they'll timeout)
    while (session.nextTrial()) { /* noop */ }

    const result = session.complete();

    expect(result.blocks).toHaveLength(3);
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
    expect(result.nextDomainState).toBeDefined();
    expect(result.nextDomainState.sessionsTotal).toBe(1);
  });

  it('has correct module metadata', () => {
    expect(assessmentModule.id).toBe('transfer-battery');
    expect(assessmentModule.displayName).toBe('Transfer Assessment');
    expect(assessmentModule.estimatedMinutes).toBe(12);
  });
});
