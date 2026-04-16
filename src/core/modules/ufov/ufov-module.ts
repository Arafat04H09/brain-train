import type { TrainingModule, Session, Trial, Response, TrialResult, BlockStats, SessionResult, Block } from '~/types/module';
import type { DomainState } from '~/types/domain';
import { generateUfovTrial, UFOV_SUBTESTS, type UfovSubtest } from './ufov-generator';
import { Quest } from '~/core/adaptive/quest';

const TRIALS_PER_SUBTEST = 20;

// Central target answer: left arrow / c for 'car', right arrow / t for 'truck'
const CAR_KEYS = new Set(['ArrowLeft', 'c']);
const TRUCK_KEYS = new Set(['ArrowRight', 't']);

export const ufovModule: TrainingModule = {
  id: 'ufov',
  displayName: 'Perceptual Speed (UFOV)',
  estimatedMinutes: 10,
  createSession(state: DomainState): Session {
    const levelThresholds = (state.level as any)?.thresholds ?? {};
    const quests: Record<string, Quest> = {};
    for (const st of UFOV_SUBTESTS) {
      const prior = typeof levelThresholds[st.id] === 'number' ? levelThresholds[st.id] : 2.5;
      quests[st.id] = new Quest({
        tGuess: prior, tGuessSd: 1.0, pThreshold: 0.82,
        beta: 3.5, delta: 0.01, gamma: 0.125, grain: 0.1, range: 4
      });
    }

    const blocks: Block[] = UFOV_SUBTESTS.map((st, i) => ({
      index: i, kind: `ufov-${st.id}`, targetTrialCount: TRIALS_PER_SUBTEST
    }));

    let blockIdx = 0;
    let trialIdx = 0;
    const trials: Record<string, { subtest: UfovSubtest; displayMs: number; correctAnswer: 'car' | 'truck' }> = {};
    const blockCorrect: Record<number, number> = {};
    const startTs = Date.now();

    const session: Session = {
      moduleId: 'ufov',
      blocks,
      nextTrial(): Trial | null {
        if (blockIdx >= UFOV_SUBTESTS.length) return null;
        if (trialIdx >= TRIALS_PER_SUBTEST) {
          blockIdx++; trialIdx = 0;
          return this.nextTrial();
        }
        const st = UFOV_SUBTESTS[blockIdx]!;
        const q = quests[st.id]!;
        const normalized = q.quantile();
        const displayMs = Math.round(Math.max(16, Math.min(500, 50 + normalized * 100)));
        const seed = (state.updatedTs + blockIdx * 1000 + trialIdx) >>> 0;
        const stim = generateUfovTrial({ subtestId: st.id, displayMs, seed });
        const id = `ufov-${blockIdx}-${trialIdx}`;
        const correctAnswer = (stim.payload as any).centralTarget;
        const t: Trial = {
          id,
          blockIndex: blockIdx,
          trialIndex: trialIdx,
          stimulus: stim,
          inputSpec: { accept: ['keyboard'], keys: ['ArrowLeft','ArrowRight','c','t'], timeoutMs: 2000 },
          timingSpec: { stimulusMs: displayMs, maskMs: (stim.payload as any).maskMs, isiMs: 500 }
        };
        trials[id] = { subtest: st, displayMs, correctAnswer };
        trialIdx++;
        return t;
      },
      setMetacogPrediction() { /* noop */ },
      async submit(resp: Response): Promise<TrialResult> {
        const rec = trials[resp.trialId];
        if (!rec) return { trialId: resp.trialId, correct: null, rtMs: null, scored: {} };
        const key = typeof resp.event.value === 'string' ? resp.event.value : '';
        const userAnswer = CAR_KEYS.has(key) ? 'car'
          : TRUCK_KEYS.has(key) ? 'truck'
          : null;
        const correct = userAnswer === rec.correctAnswer;
        const normalized = (rec.displayMs - 50) / 100;
        quests[rec.subtest.id]!.update(normalized, correct);
        const parts = resp.trialId.split('-');
        const bIdx = parseInt(parts[1]!);
        blockCorrect[bIdx] = (blockCorrect[bIdx] ?? 0) + (correct ? 1 : 0);
        return {
          trialId: resp.trialId, correct, rtMs: resp.event.rtMs || null,
          scored: { correct: correct ? 1 : 0 }
        };
      },
      currentBlockStats(): BlockStats {
        const done = trialIdx;
        const correct = blockCorrect[blockIdx] ?? 0;
        const st = UFOV_SUBTESTS[blockIdx] ?? UFOV_SUBTESTS[0]!;
        const normalized = quests[st.id]!.mean();
        return {
          blockIndex: blockIdx, trialsCompleted: done,
          accuracy: done ? correct / done : 0,
          custom: { displayMsThreshold: 50 + normalized * 100 }
        };
      },
      complete(): SessionResult {
        const thresholds: Record<string, number> = {};
        for (const st of UFOV_SUBTESTS) {
          const normalized = quests[st.id]!.mean();
          thresholds[st.id] = 50 + normalized * 100;
        }
        const blockStats: BlockStats[] = UFOV_SUBTESTS.map((st, i) => ({
          blockIndex: i, trialsCompleted: TRIALS_PER_SUBTEST,
          accuracy: (blockCorrect[i] ?? 0) / TRIALS_PER_SUBTEST,
          custom: { displayMsThreshold: thresholds[st.id]! }
        }));
        const avgAcc = blockStats.reduce((s, b) => s + b.accuracy, 0) / blockStats.length;
        return {
          blocks: blockStats,
          totalDurationMs: Date.now() - startTs,
          nextDomainState: {
            ...state,
            level: { thresholds },
            ewmaPerformance: 0.7 * state.ewmaPerformance + 0.3 * avgAcc,
            lastSessionTs: Date.now(),
            sessionsTotal: state.sessionsTotal + 1,
            updatedTs: Date.now()
          }
        };
      }
    };
    return session;
  }
};
