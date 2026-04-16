import type { TrainingModule, Session, Trial, Response, TrialResult, BlockStats, SessionResult, Block } from '~/types/module';
import type { DomainState } from '~/types/domain';
import { generateEfBlock, type EfTrial } from './ef-generator';
import { SsdStaircase } from '~/core/adaptive/ssd-staircase';
import { ssrtIntegration } from './ssrt';

const N_BLOCKS = 4;
const TRIALS_PER_BLOCK = 48;

// Response mapping: key → classifies by rule
// A=red/circle/small, S=blue/square/small, K=green/triangle/large, L=yellow/diamond/large
const RESPONSE_MAP: Record<string, { color: string; shape: string; size: string }> = {
  a: { color: 'red',    shape: 'circle',   size: 'small' },
  s: { color: 'blue',   shape: 'square',   size: 'small' },
  k: { color: 'green',  shape: 'triangle', size: 'large' },
  l: { color: 'yellow', shape: 'diamond',  size: 'large' }
};

export const efModule: TrainingModule = {
  id: 'compound-ef',
  displayName: 'Compound Executive Function',
  estimatedMinutes: 15,
  createSession(state: DomainState): Session {
    const level = (state.level as any) ?? {};
    const rules = level.rules ?? ['color', 'shape'];
    const switchFreq = level.switchFreq ?? 0.5;
    const congruencyIncongruent = level.congruencyIncongruent ?? 0.5;

    const ssd = new SsdStaircase({ startMs: level.ssdStartMs ?? 250 });
    const blockPlans = Array.from({ length: N_BLOCKS }, (_, i) =>
      generateEfBlock({
        nTrials: TRIALS_PER_BLOCK, seed: (state.updatedTs + i) >>> 0,
        rules, switchFreq, congruencyIncongruent, stopSignalProb: 0.25,
        initialSsdMs: ssd.current()
      })
    );

    const blocks: Block[] = blockPlans.map((_, i) => ({
      index: i, kind: `ef-block-${i}`, targetTrialCount: TRIALS_PER_BLOCK
    }));

    let blockIdx = 0, trialIdx = 0;
    const results: { trial: EfTrial; correct: boolean; rt: number; inhibitSuccess: boolean | null }[] = [];
    const goRts: number[] = [];
    const startTs = Date.now();

    return {
      moduleId: 'compound-ef',
      blocks,
      nextTrial(): Trial | null {
        if (blockIdx >= N_BLOCKS) return null;
        if (trialIdx >= TRIALS_PER_BLOCK) {
          blockIdx++; trialIdx = 0;
          return this.nextTrial();
        }
        const ef = blockPlans[blockIdx]!.trials[trialIdx]!;
        const t: Trial = {
          id: `ef-${blockIdx}-${trialIdx}`,
          blockIndex: blockIdx,
          trialIndex: trialIdx,
          stimulus: { kind: 'flanker-compound', payload: { ...ef, ssdMs: ssd.current() } },
          inputSpec: { accept: ['keyboard'], keys: Object.keys(RESPONSE_MAP) },
          timingSpec: { preMs: 500, stimulusMs: 1250, isiMs: 750 }
        };
        trialIdx++;
        return t;
      },
      setMetacogPrediction() {},
      async submit(resp: Response): Promise<TrialResult> {
        const parts = resp.trialId.split('-');
        const bIdx = parseInt(parts[1]!);
        const tIdx = parseInt(parts[2]!);
        const ef = blockPlans[bIdx]!.trials[tIdx]!;
        const key = typeof resp.event.value === 'string' ? resp.event.value : '';
        const mapping = RESPONSE_MAP[key];
        let correct = false;
        let inhibitSuccess: boolean | null = null;
        if (ef.hasStopSignal) {
          inhibitSuccess = resp.event.kind === 'timeout';
          ssd.update(inhibitSuccess);
          correct = inhibitSuccess;
        } else if (mapping) {
          const answer = mapping[ef.rule as keyof typeof mapping];
          correct = answer === ef[ef.rule as keyof typeof ef];
          if (resp.event.rtMs > 0) goRts.push(resp.event.rtMs);
        }
        results.push({ trial: ef, correct, rt: resp.event.rtMs || 0, inhibitSuccess });
        return { trialId: resp.trialId, correct, rtMs: resp.event.rtMs || null,
          scored: { correct: correct ? 1 : 0, switch: ef.isSwitch ? 1 : 0, stop: ef.hasStopSignal ? 1 : 0 } };
      },
      currentBlockStats(): BlockStats {
        const recent = results.slice(-trialIdx);
        const acc = recent.length ? recent.filter(r => r.correct).length / recent.length : 0;
        return { blockIndex: blockIdx, trialsCompleted: trialIdx, accuracy: acc, custom: {} };
      },
      complete(): SessionResult {
        const stopResults = results.filter(r => r.trial.hasStopSignal);
        const pFail = stopResults.length ? stopResults.filter(r => r.inhibitSuccess === false).length / stopResults.length : 0;
        const ssrt = ssrtIntegration({ goRts, pFailedInhibit: pFail, meanSsdMs: ssd.current() });
        const avgAcc = results.length ? results.filter(r => r.correct).length / results.length : 0;
        const switchResults = results.filter(r => r.trial.isSwitch && !r.trial.hasStopSignal);
        const nonSwitchResults = results.filter(r => !r.trial.isSwitch && !r.trial.hasStopSignal);
        const switchRt = switchResults.length ? switchResults.reduce((s,r) => s + r.rt, 0) / switchResults.length : 0;
        const nonSwitchRt = nonSwitchResults.length ? nonSwitchResults.reduce((s,r) => s + r.rt, 0) / nonSwitchResults.length : 0;
        return {
          blocks: blocks.map(b => ({ blockIndex: b.index, trialsCompleted: TRIALS_PER_BLOCK, accuracy: avgAcc,
            custom: { ssrtMs: ssrt, switchCostMs: switchRt - nonSwitchRt } })),
          totalDurationMs: Date.now() - startTs,
          nextDomainState: {
            ...state,
            level: { rules, switchFreq, congruencyIncongruent, ssdStartMs: ssd.current() },
            ewmaPerformance: 0.7 * state.ewmaPerformance + 0.3 * avgAcc,
            lastSessionTs: Date.now(), sessionsTotal: state.sessionsTotal + 1, updatedTs: Date.now()
          }
        };
      }
    };
  }
};
