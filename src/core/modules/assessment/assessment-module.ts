import type { TrainingModule, Session, Trial, Response, TrialResult, BlockStats, SessionResult, Block } from '~/types/module';
import type { DomainState } from '~/types/domain';
import { generateMatrix, type Panel } from '../relational/matrix-generator';
import { saveTransferAssessment } from '~/core/storage/repos';
import { generateFlankerTrials, scoreFlanker, type FlankerTrial } from './flanker-task';
import { generateDigitSequence, generateFoil } from './digit-span-task';

const MATRIX_TRIALS = 5;
const RT_TRIALS = 20;
const FLANKER_TRIALS = 24;
const DIGIT_SPAN_SETS = 14;

// Fixed seeds for reproducible matrix items
const MATRIX_SEEDS = [1, 2, 3, 5, 7];

export const assessmentModule: TrainingModule = {
  id: 'transfer-battery',
  displayName: 'Transfer Assessment',
  estimatedMinutes: 12,
  createSession(state: DomainState): Session {
    const blocks: Block[] = [
      { index: 0, kind: 'assessment-matrix', targetTrialCount: MATRIX_TRIALS },
      { index: 1, kind: 'simple-rt', targetTrialCount: RT_TRIALS },
      { index: 2, kind: 'flanker-assessment', targetTrialCount: FLANKER_TRIALS },
      { index: 3, kind: 'digit-span', targetTrialCount: DIGIT_SPAN_SETS }
    ];

    let blockIdx = 0;
    let trialIdx = 0;
    const puzzles: Record<string, { answerIdx: number }> = {};
    const blockCorrectCounts: Record<number, number> = {};
    const blockRTs: Record<number, number[]> = {};
    const flankerTrials: FlankerTrial[] = generateFlankerTrials();
    const flankerRTs: Array<{ congruent: boolean; rt: number }> = [];
    let dsSpan = 4;
    let dsSetIdx = 0;
    let dsPhase: 'present' | 'probe' = 'present';
    let dsDigitIdx = 0;
    let dsCurrentSeq: number[] = [];
    let dsFoil: number[] = [];
    let dsCorrectOption: 1 | 2 = 1;
    let dsMaxSpan = 0;
    let dsConsecutiveWrong = 0;
    const startTs = Date.now();

    const session: Session = {
      moduleId: 'transfer-battery',
      blocks,
      nextTrial(): Trial | null {
        if (blockIdx >= blocks.length) return null;
        if (blockIdx === 0 && trialIdx >= MATRIX_TRIALS) {
          blockIdx++;
          trialIdx = 0;
          return this.nextTrial();
        }
        if (blockIdx === 1 && trialIdx >= RT_TRIALS) {
          blockIdx++;
          trialIdx = 0;
          return this.nextTrial();
        }

        if (blockIdx === 0) {
          // Matrix block: fixed seeds, 60s per item
          const seed = MATRIX_SEEDS[trialIdx] || 0;
          const puzzle = generateMatrix(seed, 2);

          // Shuffle answer choices
          const allChoices = [puzzle.answer, ...puzzle.distractors];
          const shuffled = shuffleArray(allChoices, seed);
          const answerIdx = shuffled.findIndex((p) => panelEquals(p, puzzle.answer));

          const stimulusPayload = {
            grid: puzzle.panels,
            choices: shuffled,
            ruleCount: 2
          };

          const id = `assessment-matrix-${trialIdx}`;
          const t: Trial = {
            id,
            blockIndex: blockIdx,
            trialIndex: trialIdx,
            stimulus: {
              kind: 'matrix-3x3',
              payload: stimulusPayload
            },
            metadata: { correctIdx: answerIdx },
            inputSpec: { accept: ['keyboard'], keys: ['1', '2', '3', '4', '5', '6', '7', '8'], timeoutMs: 60000 },
            timingSpec: { stimulusMs: 'until-response' }
          };

          puzzles[id] = { answerIdx };
          trialIdx++;
          return t;
        } else if (blockIdx === 1) {
          // RT block: simple reaction time with random ISI
          const preWaitMs = 1000 + Math.random() * 2000;

          const id = `assessment-rt-${trialIdx}`;
          const t: Trial = {
            id,
            blockIndex: blockIdx,
            trialIndex: trialIdx,
            stimulus: {
              kind: 'simple-rt',
              payload: { preWaitMs }
            },
            metadata: { throwOut: false },
            inputSpec: { accept: ['keyboard'], keys: ['Space'] },
            timingSpec: { preMs: Math.round(preWaitMs), stimulusMs: 'until-response' }
          };

          trialIdx++;
          return t;
        } else if (blockIdx === 2) {
          if (trialIdx >= FLANKER_TRIALS) {
            blockIdx++;
            trialIdx = 0;
            return this.nextTrial();
          }
          const ft = flankerTrials[trialIdx]!;
          const id = `assessment-flanker-${trialIdx}`;
          const t: Trial = {
            id,
            blockIndex: blockIdx,
            trialIndex: trialIdx,
            stimulus: { kind: 'flanker-assessment', payload: { direction: ft.direction, congruent: ft.congruent } },
            metadata: { correctKey: ft.direction === 'left' ? 'ArrowLeft' : 'ArrowRight' },
            inputSpec: { accept: ['keyboard'], keys: ['ArrowLeft', 'ArrowRight'], timeoutMs: 2000 },
            timingSpec: { preMs: 500, stimulusMs: 'until-response' }
          };
          trialIdx++;
          return t;
        } else if (blockIdx === 3) {
          if (dsSetIdx >= DIGIT_SPAN_SETS) return null;
          if (dsPhase === 'present') {
            if (dsDigitIdx === 0) {
              dsCurrentSeq = generateDigitSequence(dsSpan);
              dsFoil = generateFoil(dsCurrentSeq);
              dsCorrectOption = Math.random() < 0.5 ? 1 : 2;
            }
            const t: Trial = {
              id: `assessment-ds-present-${dsSetIdx}-${dsDigitIdx}`,
              blockIndex: blockIdx,
              trialIndex: trialIdx,
              stimulus: { kind: 'digit-span-present', payload: { digit: dsCurrentSeq[dsDigitIdx]!, position: dsDigitIdx, total: dsSpan } },
              metadata: {},
              inputSpec: { accept: ['keyboard'], keys: [] },
              timingSpec: { stimulusMs: 800, isiMs: 200 }
            };
            dsDigitIdx++;
            if (dsDigitIdx >= dsSpan) {
              dsPhase = 'probe';
              dsDigitIdx = 0;
            }
            trialIdx++;
            return t;
          } else {
            const opt1 = dsCorrectOption === 1 ? dsCurrentSeq : dsFoil;
            const opt2 = dsCorrectOption === 2 ? dsCurrentSeq : dsFoil;
            const t: Trial = {
              id: `assessment-ds-probe-${dsSetIdx}`,
              blockIndex: blockIdx,
              trialIndex: trialIdx,
              stimulus: { kind: 'digit-span-probe', payload: { option1: opt1, option2: opt2, correctOption: dsCorrectOption } },
              metadata: { correctKey: String(dsCorrectOption) },
              inputSpec: { accept: ['keyboard'], keys: ['1', '2'], timeoutMs: 10000 },
              timingSpec: { preMs: 500, stimulusMs: 'until-response' }
            };
            dsPhase = 'present';
            dsSetIdx++;
            trialIdx++;
            return t;
          }
        }
        return null;
      },
      setMetacogPrediction() { /* noop */ },
      async submit(resp: Response): Promise<TrialResult> {
        // Determine which block this trial belongs to based on its ID
        const isMatrixTrial = resp.trialId.startsWith('assessment-matrix-');
        const isRTTrial = resp.trialId.startsWith('assessment-rt-');

        if (isMatrixTrial) {
          // Matrix scoring
          const rec = puzzles[resp.trialId];
          if (!rec) return { trialId: resp.trialId, correct: null, rtMs: null, scored: {} };

          const key = String(resp.event.value);
          const choiceIdx = parseInt(key) - 1;
          const correct = choiceIdx === rec.answerIdx;

          blockCorrectCounts[0] = (blockCorrectCounts[0] ?? 0) + (correct ? 1 : 0);

          return {
            trialId: resp.trialId,
            correct,
            rtMs: resp.event.rtMs || null,
            scored: { correct: correct ? 1 : 0 }
          };
        } else if (isRTTrial) {
          // RT scoring: collect valid RTs (100-1500ms)
          const rtMs = resp.event.rtMs || 0;
          const isValid = rtMs >= 100 && rtMs <= 1500;

          if (!blockRTs[1]) blockRTs[1] = [];
          if (isValid) {
            blockRTs[1]!.push(rtMs);
          }

          return {
            trialId: resp.trialId,
            correct: null,
            rtMs: isValid ? rtMs : null,
            scored: isValid ? { validRT: 1 } : { validRT: 0 }
          };
        } else if (resp.trialId.startsWith('assessment-ds-present-')) {
          return { trialId: resp.trialId, correct: null, rtMs: null, scored: {} };
        } else if (resp.trialId.startsWith('assessment-ds-probe-')) {
          const correct = String(resp.event.value) === String(dsCorrectOption);
          if (correct) {
            dsMaxSpan = Math.max(dsMaxSpan, dsSpan);
            dsSpan++;
            dsConsecutiveWrong = 0;
          } else {
            dsConsecutiveWrong++;
            if (dsConsecutiveWrong >= 2 && dsSpan > 3) dsSpan--;
            if (dsConsecutiveWrong < 2) dsConsecutiveWrong = 0;
          }
          return { trialId: resp.trialId, correct, rtMs: resp.event.rtMs || null, scored: { correct: correct ? 1 : 0 } };
        } else if (resp.trialId.startsWith('assessment-flanker-')) {
          const idx = parseInt(resp.trialId.split('-').pop()!);
          const ft = flankerTrials[idx]!;
          const correctKey = ft.direction === 'left' ? 'ArrowLeft' : 'ArrowRight';
          const correct = resp.event.value === correctKey;
          const rtMs = resp.event.rtMs || 0;
          if (correct && rtMs >= 100 && rtMs <= 1500) {
            flankerRTs.push({ congruent: ft.congruent, rt: rtMs });
          }
          return { trialId: resp.trialId, correct, rtMs: rtMs || null, scored: { correct: correct ? 1 : 0 } };
        }
        return { trialId: resp.trialId, correct: null, rtMs: null, scored: {} };
      },
      currentBlockStats(): BlockStats {
        if (blockIdx === 0) {
          const correct = blockCorrectCounts[blockIdx] ?? 0;
          return {
            blockIndex: blockIdx,
            trialsCompleted: trialIdx,
            accuracy: trialIdx > 0 ? correct / trialIdx : 0,
            custom: {}
          };
        } else if (blockIdx === 2) {
          const correct = flankerRTs.length;
          return {
            blockIndex: blockIdx,
            trialsCompleted: trialIdx,
            accuracy: trialIdx > 0 ? correct / trialIdx : 0,
            custom: {}
          };
        } else if (blockIdx === 3) {
          return {
            blockIndex: blockIdx,
            trialsCompleted: dsSetIdx,
            accuracy: 0,
            custom: { maxSpan: dsMaxSpan, currentSpan: dsSpan }
          };
        } else {
          const rts = blockRTs[blockIdx] ?? [];
          const meanRT = rts.length > 0 ? rts.reduce((a, b) => a + b, 0) / rts.length : 0;
          return {
            blockIndex: blockIdx,
            trialsCompleted: trialIdx,
            accuracy: 0,
            custom: { meanRT }
          };
        }
      },
      complete(): SessionResult {
        // Matrix score: accuracy (items correct / 5)
        const matrixCorrect = blockCorrectCounts[0] ?? 0;
        const matrixAccuracy = MATRIX_TRIALS > 0 ? matrixCorrect / MATRIX_TRIALS : 0;

        // RT score: mean of valid RTs
        const validRTs = blockRTs[1] ?? [];
        const rtScore = validRTs.length > 0
          ? validRTs.reduce((a, b) => a + b, 0) / validRTs.length
          : 0;

        // Flanker score
        const flankerResult = scoreFlanker(flankerRTs);

        // Save to transfer_assessments table
        const now = Date.now();
        Promise.all([
          saveTransferAssessment({
            ts: now,
            taskId: 'matrix-reasoning',
            score: matrixAccuracy,
            raw: { correctItems: matrixCorrect, totalItems: MATRIX_TRIALS }
          }),
          saveTransferAssessment({
            ts: now,
            taskId: 'simple-rt',
            score: rtScore,
            raw: { validRTs: validRTs.length, totalRTs: RT_TRIALS, meanRT: rtScore }
          }),
          saveTransferAssessment({
            ts: now,
            taskId: 'flanker-inhibition',
            score: flankerResult.conflictCost,
            raw: { ...flankerResult, validTrials: flankerRTs.length, totalTrials: FLANKER_TRIALS }
          }),
          saveTransferAssessment({
            ts: now,
            taskId: 'digit-span',
            score: dsMaxSpan,
            raw: { maxSpan: dsMaxSpan, totalSets: DIGIT_SPAN_SETS }
          })
        ]).catch(e => console.error('Failed to save transfer assessment:', e));

        return {
          blocks: [
            {
              blockIndex: 0,
              trialsCompleted: MATRIX_TRIALS,
              accuracy: matrixAccuracy,
              custom: {}
            },
            {
              blockIndex: 1,
              trialsCompleted: RT_TRIALS,
              accuracy: 0,
              custom: { meanRT: rtScore }
            },
            {
              blockIndex: 2,
              trialsCompleted: FLANKER_TRIALS,
              accuracy: flankerResult.accuracy,
              custom: { conflictCost: flankerResult.conflictCost }
            },
            {
              blockIndex: 3,
              trialsCompleted: DIGIT_SPAN_SETS,
              accuracy: 0,
              custom: { maxSpan: dsMaxSpan }
            }
          ],
          totalDurationMs: Date.now() - startTs,
          nextDomainState: {
            ...state,
            level: {},
            ewmaPerformance: matrixAccuracy,
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
