import { describe, it, expect } from 'vitest';
import { wmModule } from '~/core/modules/working-memory/wm-module';
import type { DomainState } from '~/types/domain';

const baseState: DomainState = {
  moduleId: 'working-memory', level: { n: 2, ospanSetSize: 3 }, ewmaPerformance: 0.6,
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

  it('creates alternating n-back and complex-span blocks', () => {
    const s = wmModule.createSession(baseState);
    expect(s.blocks.length).toBeGreaterThanOrEqual(3);

    // Check for at least one complex-span block
    const hasComplexSpan = s.blocks.some(b => b.kind === 'complex-span');
    expect(hasComplexSpan).toBe(true);

    // Check for at least one n-back block
    const hasNBack = s.blocks.some(b => b.kind.startsWith('dual-nback'));
    expect(hasNBack).toBe(true);
  });

  it('increases ospanSetSize after all-correct OSpan block', async () => {
    const s = wmModule.createSession(baseState);
    let t = s.nextTrial();

    while (t) {
      let response;
      if (t.stimulus.kind === 'complex-span') {
        // Simulate perfect OSpan performance: all math correct, all letters recalled
        const payload = t.stimulus.payload as any;
        const numLetters = payload.letters.length;
        const mathResponses = new Array(numLetters).fill(true);
        const recalled = payload.letters;

        response = {
          trialId: t.id,
          event: {
            kind: 'text' as const,
            value: JSON.stringify({ mathResponses, recalled }),
            rtMs: 400
          },
          timing: { requestedDurationMs: 500, achievedDurationMs: 500, framesRendered: 30, timingFlag: 'ok' as const }
        };
      } else {
        // N-back: no match response
        response = {
          trialId: t.id,
          event: { kind: 'keydown' as const, value: 'Escape', rtMs: 400 },
          timing: { requestedDurationMs: 500, achievedDurationMs: 500, framesRendered: 30, timingFlag: 'ok' as const }
        };
      }

      await s.submit(response);
      t = s.nextTrial();
    }

    const result = s.complete();
    const newOSpanSetSize = (result.nextDomainState.level as any).ospanSetSize;
    expect(typeof newOSpanSetSize).toBe('number');
    expect(newOSpanSetSize).toBeGreaterThanOrEqual(baseState.level.ospanSetSize as any);
  });

  it('respects ospanSetSize min floor of 2', async () => {
    const minState: DomainState = {
      moduleId: 'working-memory',
      level: { n: 2, ospanSetSize: 2 },
      ewmaPerformance: 0.6,
      lastSessionTs: null,
      sessionsTotal: 0,
      plateauFlag: false,
      updatedTs: Date.now()
    };

    const s = wmModule.createSession(minState);
    let t = s.nextTrial();

    while (t) {
      let response;
      if (t.stimulus.kind === 'complex-span') {
        // Simulate all wrong for complex-span
        response = {
          trialId: t.id,
          event: {
            kind: 'text' as const,
            value: JSON.stringify({ mathResponses: [false], recalled: [] }),
            rtMs: 400
          },
          timing: { requestedDurationMs: 500, achievedDurationMs: 500, framesRendered: 30, timingFlag: 'ok' as const }
        };
      } else {
        response = {
          trialId: t.id,
          event: { kind: 'keydown' as const, value: 'Escape', rtMs: 400 },
          timing: { requestedDurationMs: 500, achievedDurationMs: 500, framesRendered: 30, timingFlag: 'ok' as const }
        };
      }

      await s.submit(response);
      t = s.nextTrial();
    }

    const result = s.complete();
    const newOSpanSetSize = (result.nextDomainState.level as any).ospanSetSize;
    expect(newOSpanSetSize).toBeGreaterThanOrEqual(2);
  });
});
