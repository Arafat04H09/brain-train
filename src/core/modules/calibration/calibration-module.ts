import type { TrainingModule, Session, Trial, Response, TrialResult, BlockStats, SessionResult, Block } from '~/types/module';
import type { DomainState } from '~/types/domain';
import { CALIBRATION_ITEMS, type CalibItem } from './question-bank';

const TRIALS_PER_BLOCK = 15;

export const calibrationModule: TrainingModule = {
  id: 'calibration',
  displayName: 'Calibration',
  estimatedMinutes: 12,
  createSession(state: DomainState): Session {
    // Get current difficulty from state
    const difficulty = (typeof (state.level as any)?.difficulty === 'string'
      ? (state.level as any).difficulty
      : 'medium') as 'easy' | 'medium' | 'hard';

    const blocks: Block[] = [
      { index: 0, kind: 'calibration-questions', targetTrialCount: TRIALS_PER_BLOCK }
    ];

    let blockIdx = 0;
    let trialIdx = 0;
    const itemResponses: Record<string, { itemId: string; confidence: number; correct: boolean; brierPoint: number }> = {};
    const blockCorrectCounts: Record<number, number> = {};
    const startTs = Date.now();

    // Deterministically select items for this session
    const selectedItems = selectItems(state.updatedTs, difficulty, TRIALS_PER_BLOCK);
    const trialIdToItem: Record<string, CalibItem> = {};

    const session: Session = {
      moduleId: 'calibration',
      blocks,
      nextTrial(): Trial | null {
        if (blockIdx >= blocks.length) return null;
        if (trialIdx >= TRIALS_PER_BLOCK) {
          blockIdx++;
          trialIdx = 0;
          return this.nextTrial();
        }

        const item = selectedItems[trialIdx];
        if (!item) return null;

        const id = `calibration-${blockIdx}-${trialIdx}`;
        trialIdToItem[id] = item;

        const t: Trial = {
          id,
          blockIndex: blockIdx,
          trialIndex: trialIdx,
          stimulus: {
            kind: 'calibration-mcq',
            payload: {
              itemId: item.id,
              question: item.question,
              choices: item.choices,
              correctIndex: item.correctIndex
            }
          },
          inputSpec: { accept: ['keyboard', 'mouse-click', 'slider'] },
          timingSpec: { stimulusMs: 'until-response' }
        };

        trialIdx++;
        return t;
      },
      setMetacogPrediction() { /* noop */ },
      async submit(resp: Response): Promise<TrialResult> {
        // Parse response: event.value should be JSON { choice: 0-3, confidence: 50-100 }
        let choice = -1;
        let confidence = 75;
        try {
          const parsed = JSON.parse(String(resp.event.value));
          choice = parsed.choice;
          confidence = parsed.confidence;
        } catch {
          return { trialId: resp.trialId, correct: null, rtMs: null, scored: {} };
        }

        // Find the item using the mapping
        const item = trialIdToItem[resp.trialId];
        if (!item) {
          return { trialId: resp.trialId, correct: null, rtMs: null, scored: {} };
        }

        const correct = choice === item.correctIndex;
        blockCorrectCounts[blockIdx] = (blockCorrectCounts[blockIdx] ?? 0) + (correct ? 1 : 0);

        // Compute Brier point: (confidence/100 - (correct ? 1 : 0))^2
        const confNorm = confidence / 100;
        const outcome = correct ? 1 : 0;
        const brierPoint = Math.pow(confNorm - outcome, 2);

        itemResponses[resp.trialId] = { itemId: item.id, confidence, correct, brierPoint };

        return {
          trialId: resp.trialId,
          correct,
          rtMs: resp.event.rtMs || null,
          scored: { correct: correct ? 1 : 0, confidence, brierPoint }
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

        // Compute mean Brier score
        const brierPoints = Object.values(itemResponses).map(r => r.brierPoint);
        const meanBrier = brierPoints.length > 0
          ? brierPoints.reduce((a, b) => a + b, 0) / brierPoints.length
          : 0;

        // Adaptive difficulty based on accuracy
        let nextDifficulty = difficulty;
        if (accuracy >= 0.80) {
          nextDifficulty = 'hard';
        } else if (accuracy <= 0.50) {
          nextDifficulty = 'easy';
        }

        return {
          blocks: [
            {
              blockIndex: 0,
              trialsCompleted: TRIALS_PER_BLOCK,
              accuracy,
              custom: { meanBrier }
            }
          ],
          totalDurationMs: Date.now() - startTs,
          nextDomainState: {
            ...state,
            level: { difficulty: nextDifficulty },
            // Invert Brier so that lower Brier = higher performance
            ewmaPerformance: 0.7 * state.ewmaPerformance + 0.3 * (1 - meanBrier),
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

// Deterministically select items for the session using Mulberry32 PRNG
function selectItems(seed: number, difficulty: 'easy' | 'medium' | 'hard', count: number): CalibItem[] {
  // Bias selection toward the target difficulty
  const diffByLevel: Record<typeof difficulty, string[]> = {
    easy: ['easy', 'medium'],
    medium: ['easy', 'medium', 'hard'],
    hard: ['medium', 'hard']
  };

  const candidates = CALIBRATION_ITEMS.filter(it => diffByLevel[difficulty].includes(it.difficulty));

  // Shuffle candidates using Mulberry32
  const shuffled = shuffleArray(candidates, seed);
  return shuffled.slice(0, count);
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
