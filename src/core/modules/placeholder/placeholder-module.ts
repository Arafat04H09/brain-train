import type { TrainingModule, Session, Trial, Response, TrialResult, BlockStats, SessionResult, Block } from '~/types/module';
import type { DomainState } from '~/types/domain';

export const placeholderModule: TrainingModule = {
  id: 'placeholder',
  displayName: 'Placeholder (smoke test)',
  estimatedMinutes: 1,
  createSession(state: DomainState): Session {
    const blocks: Block[] = [
      { index: 0, kind: 'placeholder-block', targetTrialCount: 5 }
    ];
    let trialIdx = 0;
    const trials: Trial[] = Array.from({ length: 5 }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      blockIndex: 0,
      trialIndex: i,
      stimulus: { kind: 'text-question', payload: { text: 'Press SPACE' } },
      inputSpec: { accept: ['keyboard'], keys: [' ', 'Escape'] },
      timingSpec: { stimulusMs: 3000 }
    }));
    const results: TrialResult[] = [];

    return {
      moduleId: 'placeholder',
      blocks,
      nextTrial() { return trialIdx < trials.length ? trials[trialIdx++]! : null; },
      setMetacogPrediction(_idx, _p) { /* no-op for placeholder */ },
      async submit(resp: Response): Promise<TrialResult> {
        const correct = resp.event.kind === 'keydown' && resp.event.value === ' ';
        const result: TrialResult = {
          trialId: resp.trialId,
          correct,
          rtMs: resp.event.rtMs || null,
          scored: { correct: correct ? 1 : 0 }
        };
        results.push(result);
        return result;
      },
      currentBlockStats(): BlockStats {
        const done = results.length;
        const acc = done ? results.filter(r => r.correct).length / done : 0;
        return { blockIndex: 0, trialsCompleted: done, accuracy: acc, custom: {} };
      },
      complete(): SessionResult {
        const acc = results.filter(r => r.correct).length / Math.max(results.length, 1);
        const nextState: DomainState = {
          ...state,
          sessionsTotal: state.sessionsTotal + 1,
          ewmaPerformance: 0.7 * state.ewmaPerformance + 0.3 * acc,
          lastSessionTs: Date.now(),
          updatedTs: Date.now()
        };
        return {
          blocks: [this.currentBlockStats()],
          totalDurationMs: 0,
          nextDomainState: nextState
        };
      }
    };
  }
};
