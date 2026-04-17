/**
 * Compound Executive Function Training Module
 * Rotates three canonical EF tasks across sessions (Karbach & Kray 2009 variable training):
 * - Session 0, 3, 6, ... → Flanker (Eriksen & Eriksen 1974)
 * - Session 1, 4, 7, ... → Stop-Signal (Verbruggen & Logan 2008)
 * - Session 2, 5, 8, ... → Task Switching (Meiran 1996 / Rogers & Monsell 1995)
 *
 * Each session runs one task (1 block of 48 trials) to train underlying EF capacity
 * via variable surface tasks. Metrics accumulate per-task across sessions.
 */

import type { TrainingModule, Session, Trial, Response, TrialResult, BlockStats, SessionResult, Block } from '~/types/module';
import type { DomainState } from '~/types/domain';
import { generateFlankerBlock, type FlankerTrial } from './flanker-generator';
import { generateStopSignalBlock, type StopSignalTrial } from './stop-signal-generator';
import { generateTaskSwitchBlock, type TaskSwitchTrial } from './task-switch-generator';
import { SsdStaircase } from '~/core/adaptive/ssd-staircase';
import { ssrtIntegration } from './ssrt';

const TRIALS_PER_BLOCK = 48;

// Response mapping for all three tasks: ArrowLeft / ArrowRight
const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight']);

type TaskType = 'flanker' | 'stop-signal' | 'task-switch';

interface EfLevel {
  flankerEffectMs?: number;
  ssrtMs?: number;
  switchCostMs?: number;
  ssdStartMs?: number;  // for staircase initialization
}

export const efModule: TrainingModule = {
  id: 'compound-ef',
  displayName: 'Compound Executive Function',
  estimatedMinutes: 15,

  createSession(state: DomainState): Session {
    const level = (state.level as EfLevel) ?? {};

    // Determine which task to run this session
    const taskIdx = state.sessionsTotal % 3;
    const currentTask: TaskType = taskIdx === 0 ? 'flanker' : taskIdx === 1 ? 'stop-signal' : 'task-switch';

    // Initialize SSD staircase for stop-signal
    const ssd = new SsdStaircase({ startMs: level.ssdStartMs ?? 250 });

    // Generate block based on task
    const blockPlan =
      currentTask === 'flanker' ? generateFlankerBlock({ nTrials: TRIALS_PER_BLOCK, seed: (state.updatedTs + 0) >>> 0 })
      : currentTask === 'stop-signal' ? generateStopSignalBlock({ nTrials: TRIALS_PER_BLOCK, seed: (state.updatedTs + 0) >>> 0 })
      : generateTaskSwitchBlock({ nTrials: TRIALS_PER_BLOCK, seed: (state.updatedTs + 0) >>> 0 });

    const blocks: Block[] = [
      { index: 0, kind: `ef-${currentTask}`, targetTrialCount: TRIALS_PER_BLOCK }
    ];

    let trialIdx = 0;
    const startTs = Date.now();

    // Per-task result tracking
    let flankerTrials: Array<{ trial: FlankerTrial; correct: boolean; rt: number }> = [];
    let stopTrials: Array<{ trial: StopSignalTrial; correct: boolean; rt: number; inhibitSuccess: boolean | null }> = [];
    let switchTrials: Array<{ trial: TaskSwitchTrial; correct: boolean; rt: number }> = [];
    const goRts: number[] = [];  // go-trial RTs for SSRT calculation

    return {
      moduleId: 'compound-ef',
      blocks,

      nextTrial(): Trial | null {
        if (trialIdx >= TRIALS_PER_BLOCK) return null;

        if (currentTask === 'flanker') {
          const ft = (blockPlan as ReturnType<typeof generateFlankerBlock>).trials[trialIdx]!;
          const t: Trial = {
            id: `ef-flanker-${trialIdx}`,
            blockIndex: 0,
            trialIndex: trialIdx,
            stimulus: { kind: 'ef-flanker-arrows', payload: ft },
            inputSpec: { accept: ['keyboard'], keys: Array.from(ARROW_KEYS) },
            timingSpec: { preMs: 500, stimulusMs: 200, isiMs: 1000 }
          };
          trialIdx++;
          return t;
        } else if (currentTask === 'stop-signal') {
          const st = (blockPlan as ReturnType<typeof generateStopSignalBlock>).trials[trialIdx]!;
          const t: Trial = {
            id: `ef-stop-signal-${trialIdx}`,
            blockIndex: 0,
            trialIndex: trialIdx,
            stimulus: { kind: 'ef-stop-signal-arrow', payload: { ...st, ssdMs: ssd.current() } },
            inputSpec: { accept: ['keyboard'], keys: Array.from(ARROW_KEYS) },
            timingSpec: { preMs: 500, stimulusMs: 1500, isiMs: 500 }
          };
          trialIdx++;
          return t;
        } else {
          const swt = (blockPlan as ReturnType<typeof generateTaskSwitchBlock>).trials[trialIdx]!;
          const t: Trial = {
            id: `ef-task-switch-${trialIdx}`,
            blockIndex: 0,
            trialIndex: trialIdx,
            stimulus: { kind: 'ef-task-switch', payload: { cue: swt.cue, color: swt.color, shape: swt.shape } },
            inputSpec: { accept: ['keyboard'], keys: Array.from(ARROW_KEYS) },
            timingSpec: { preMs: 500, stimulusMs: 'until-response', isiMs: 1000 }
          };
          trialIdx++;
          return t;
        }
      },

      setMetacogPrediction() {},

      async submit(resp: Response): Promise<TrialResult> {
        const key = typeof resp.event.value === 'string' ? resp.event.value : '';
        const isArrowLeft = key === 'ArrowLeft';
        const isArrowRight = key === 'ArrowRight';

        if (currentTask === 'flanker') {
          const parts = resp.trialId.split('-');
          const tIdx = parseInt(parts[2]!);
          const ft = (blockPlan as ReturnType<typeof generateFlankerBlock>).trials[tIdx]!;

          // Correct if key matches center direction
          const correct = (ft.centerDirection === 'left' && isArrowLeft) ||
                          (ft.centerDirection === 'right' && isArrowRight);

          if (resp.event.kind === 'keydown') flankerTrials.push({ trial: ft, correct, rt: resp.event.rtMs });

          return {
            trialId: resp.trialId,
            correct,
            rtMs: resp.event.rtMs || null,
            scored: { correct: correct ? 1 : 0 }
          };
        } else if (currentTask === 'stop-signal') {
          const parts = resp.trialId.split('-');
          const tIdx = parseInt(parts[2]!);
          const st = (blockPlan as ReturnType<typeof generateStopSignalBlock>).trials[tIdx]!;

          let correct = false;
          let inhibitSuccess: boolean | null = null;

          if (st.isStopTrial) {
            // Stop trial: success if no response (timeout)
            inhibitSuccess = resp.event.kind === 'timeout';
            correct = inhibitSuccess;
            ssd.update(inhibitSuccess);
          } else {
            // Go trial: success if response matches direction
            correct = (st.direction === 'left' && isArrowLeft) ||
                      (st.direction === 'right' && isArrowRight);
            if (resp.event.kind === 'keydown' && correct) goRts.push(resp.event.rtMs);
          }

          stopTrials.push({ trial: st, correct, rt: resp.event.rtMs || 0, inhibitSuccess });

          return {
            trialId: resp.trialId,
            correct,
            rtMs: resp.event.rtMs || null,
            scored: { correct: correct ? 1 : 0 }
          };
        } else {
          const parts = resp.trialId.split('-');
          const tIdx = parseInt(parts[2]!);
          const swt = (blockPlan as ReturnType<typeof generateTaskSwitchBlock>).trials[tIdx]!;

          // For task switching, we need the stimulus as well
          // Correct if key matches cued attribute
          let correct = false;
          if (swt.cue === 'COLOR') {
            correct = (swt.color === 'red' && isArrowLeft) ||
                      (swt.color === 'blue' && isArrowRight);
          } else {
            correct = (swt.shape === 'square' && isArrowLeft) ||
                      (swt.shape === 'circle' && isArrowRight);
          }

          switchTrials.push({ trial: swt, correct, rt: resp.event.rtMs || 0 });

          return {
            trialId: resp.trialId,
            correct,
            rtMs: resp.event.rtMs || null,
            scored: { correct: correct ? 1 : 0 }
          };
        }
      },

      currentBlockStats(): BlockStats {
        let acc = 0;
        if (currentTask === 'flanker' && flankerTrials.length > 0) {
          acc = flankerTrials.filter(r => r.correct).length / flankerTrials.length;
        } else if (currentTask === 'stop-signal' && stopTrials.length > 0) {
          acc = stopTrials.filter(r => r.correct).length / stopTrials.length;
        } else if (currentTask === 'task-switch' && switchTrials.length > 0) {
          acc = switchTrials.filter(r => r.correct).length / switchTrials.length;
        }

        return { blockIndex: 0, trialsCompleted: trialIdx, accuracy: acc, custom: {} };
      },

      complete(): SessionResult {
        let flankerEffectMs = level.flankerEffectMs ?? 0;
        let ssrtMs = level.ssrtMs ?? 0;
        let switchCostMs = level.switchCostMs ?? 0;
        let avgAcc = 0;

        if (currentTask === 'flanker') {
          const congruent = flankerTrials.filter(r => r.trial.isCongruent);
          const incongruent = flankerTrials.filter(r => !r.trial.isCongruent);
          const congRt = congruent.length ? congruent.reduce((s, r) => s + r.rt, 0) / congruent.length : 0;
          const incongRt = incongruent.length ? incongruent.reduce((s, r) => s + r.rt, 0) / incongruent.length : 0;
          flankerEffectMs = incongRt - congRt;
          avgAcc = flankerTrials.filter(r => r.correct).length / Math.max(flankerTrials.length, 1);
        } else if (currentTask === 'stop-signal') {
          const pFail = stopTrials.filter(r => r.trial.isStopTrial && r.inhibitSuccess === false).length /
                        Math.max(stopTrials.filter(r => r.trial.isStopTrial).length, 1);
          ssrtMs = ssrtIntegration({ goRts, pFailedInhibit: pFail, meanSsdMs: ssd.current() });
          avgAcc = stopTrials.filter(r => r.correct).length / Math.max(stopTrials.length, 1);
        } else {
          const switchRts = switchTrials.filter(r => r.trial.isSwitch);
          const repeatRts = switchTrials.filter(r => !r.trial.isSwitch);
          const switchRt = switchRts.length ? switchRts.reduce((s, r) => s + r.rt, 0) / switchRts.length : 0;
          const repeatRt = repeatRts.length ? repeatRts.reduce((s, r) => s + r.rt, 0) / repeatRts.length : 0;
          switchCostMs = switchRt - repeatRt;
          avgAcc = switchTrials.filter(r => r.correct).length / Math.max(switchTrials.length, 1);
        }

        const nextLevel: EfLevel = {
          flankerEffectMs,
          ssrtMs,
          switchCostMs,
          ssdStartMs: ssd.current()
        };

        return {
          blocks: [{ blockIndex: 0, trialsCompleted: TRIALS_PER_BLOCK, accuracy: avgAcc,
            custom: { [`${currentTask}Ms`]: currentTask === 'flanker' ? flankerEffectMs : currentTask === 'stop-signal' ? ssrtMs : switchCostMs } }],
          totalDurationMs: Date.now() - startTs,
          nextDomainState: {
            ...state,
            level: nextLevel as Record<string, unknown>,
            ewmaPerformance: 0.7 * state.ewmaPerformance + 0.3 * avgAcc,
            lastSessionTs: Date.now(),
            sessionsTotal: state.sessionsTotal + 1,
            updatedTs: Date.now()
          }
        };
      }
    };
  }
};
