import type { TrainingModule, Session, Trial, Response, TrialResult, BlockStats, SessionResult, Block } from '~/types/module';
import type { DomainState } from '~/types/domain';
import { generateMatrix, type Panel } from './matrix-generator';

const TRIALS_PER_BLOCK = 12;

export const relationalModule: TrainingModule = {
  id: 'relational',
  displayName: 'Relational Reasoning',
  estimatedMinutes: 10,
  createSession(state: DomainState): Session {
    const ruleCount = (typeof (state.level as any)?.ruleCount === 'number'
      ? (state.level as any).ruleCount
      : 1) as 1 | 2 | 3;

    const blocks: Block[] = [
      { index: 0, kind: `relational-rules${ruleCount}`, targetTrialCount: TRIALS_PER_BLOCK }
    ];

    let blockIdx = 0;
    let trialIdx = 0;
    const puzzles: Record<string, { puzzle: ReturnType<typeof generateMatrix>; answerIdx: number }> = {};
    const blockCorrectCounts: Record<number, number> = {};
    const startTs = Date.now();

    const session: Session = {
      moduleId: 'relational',
      blocks,
      nextTrial(): Trial | null {
        if (blockIdx >= blocks.length) return null;
        if (trialIdx >= TRIALS_PER_BLOCK) {
          blockIdx++;
          trialIdx = 0;
          return this.nextTrial();
        }

        // Generate puzzle
        const seed = (state.updatedTs + blockIdx * 10000 + trialIdx) >>> 0;
        const puzzle = generateMatrix(seed, ruleCount);

        // Shuffle answer choices: 1 correct + 7 distractors
        const allChoices = [puzzle.answer, ...puzzle.distractors];
        const shuffled = shuffleArray(allChoices, seed);
        const answerIdx = shuffled.findIndex((p) => panelEquals(p, puzzle.answer));

        // Stimulus payload (no correctIdx — the UI should NEVER see the answer).
        const stimulusPayload = {
          grid: puzzle.panels,
          choices: shuffled,
          ruleCount
        };

        const id = `relational-${blockIdx}-${trialIdx}`;
        const t: Trial = {
          id,
          blockIndex: blockIdx,
          trialIndex: trialIdx,
          stimulus: {
            kind: 'matrix-3x3',
            payload: stimulusPayload
          },
          // correctIdx is module-internal; kept off `stimulus.payload` so the
          // renderer (and DevTools snooping) can't see it.
          metadata: { correctIdx: answerIdx },
          inputSpec: { accept: ['keyboard'], keys: ['1', '2', '3', '4', '5', '6', '7', '8'] },
          timingSpec: { stimulusMs: 'until-response' }
        };

        puzzles[id] = { puzzle, answerIdx };
        trialIdx++;
        return t;
      },
      setMetacogPrediction() { /* noop */ },
      async submit(resp: Response): Promise<TrialResult> {
        const rec = puzzles[resp.trialId];
        if (!rec) return { trialId: resp.trialId, correct: null, rtMs: null, scored: {} };

        // Map key press to choice index (1-indexed user input -> 0-indexed array)
        const key = String(resp.event.value);
        const choiceIdx = parseInt(key) - 1;
        const correct = choiceIdx === rec.answerIdx;

        blockCorrectCounts[blockIdx] = (blockCorrectCounts[blockIdx] ?? 0) + (correct ? 1 : 0);

        return {
          trialId: resp.trialId,
          correct,
          rtMs: resp.event.rtMs || null,
          scored: { correct: correct ? 1 : 0 }
        };
      },
      currentBlockStats(): BlockStats {
        const correct = blockCorrectCounts[blockIdx] ?? 0;
        return {
          blockIndex: blockIdx,
          trialsCompleted: trialIdx,
          accuracy: trialIdx > 0 ? correct / trialIdx : 0,
          custom: {}
        };
      },
      complete(): SessionResult {
        const correct = blockCorrectCounts[0] ?? 0;
        const accuracy = TRIALS_PER_BLOCK > 0 ? correct / TRIALS_PER_BLOCK : 0;

        // Adaptive difficulty
        let nextRuleCount = ruleCount;
        if (accuracy >= 0.75 && ruleCount < 3) {
          nextRuleCount = (ruleCount + 1) as 1 | 2 | 3;
        } else if (accuracy < 0.4 && ruleCount > 1) {
          nextRuleCount = (ruleCount - 1) as 1 | 2 | 3;
        }

        return {
          blocks: [
            {
              blockIndex: 0,
              trialsCompleted: TRIALS_PER_BLOCK,
              accuracy,
              custom: {}
            }
          ],
          totalDurationMs: Date.now() - startTs,
          nextDomainState: {
            ...state,
            level: { ruleCount: nextRuleCount },
            ewmaPerformance: 0.7 * state.ewmaPerformance + 0.3 * accuracy,
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

function panelEquals(a: Panel, b: Panel): boolean {
  return a.shape === b.shape && a.color === b.color && a.size === b.size && a.count === b.count;
}

function shuffleArray<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = copy[i];
    if (tmp !== undefined && copy[j] !== undefined) {
      copy[i] = copy[j];
      copy[j] = tmp;
    }
  }
  return copy;
}
