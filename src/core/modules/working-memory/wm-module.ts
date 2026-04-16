import type { TrainingModule, Session, Trial, Response, TrialResult, BlockStats, SessionResult, Block } from '~/types/module';
import type { DomainState } from '~/types/domain';
import { generateNBackBlock } from './dual-nback';
import { scoreBlock, nextNLevel, type NBackResponse, type BlockStreamStats } from './wm-adaptive';

// Key mapping:
//   'a' / ArrowLeft  → position match
//   'l' / ArrowRight → audio match
// Both keys within a trial = dual match
// No key / Escape by end of trial = no match
const POS_KEYS = new Set(['a', 'ArrowLeft']);
const AUD_KEYS = new Set(['l', 'ArrowRight']);

export const wmModule: TrainingModule = {
  id: 'working-memory',
  displayName: 'Working Memory',
  estimatedMinutes: 15,
  createSession(state: DomainState): Session {
    const n = typeof (state.level as any)?.n === 'number' ? (state.level as any).n : 2;
    const blocksCount = 3;   // ~15 min
    const blockPlans = Array.from({ length: blocksCount }, (_, i) =>
      generateNBackBlock({
        n, nTargets: 6, nDualTargets: 2, nLures: 4,
        seed: (state.updatedTs + i) >>> 0
      })
    );
    const blocks: Block[] = blockPlans.map((bp, i) => ({
      index: i, kind: `dual-nback-n${bp.n}`, targetTrialCount: bp.trials.length
    }));

    let blockIdx = 0;
    let trialIdx = 0;
    const responses: Record<number, Record<number, NBackResponse>> = {};
    const blockStats: BlockStreamStats[] = [];
    const startTs = Date.now();

    const session: Session = {
      moduleId: 'working-memory',
      blocks,
      nextTrial(): Trial | null {
        if (blockIdx >= blockPlans.length) return null;
        const bp = blockPlans[blockIdx]!;
        if (trialIdx >= bp.trials.length) {
          // score completed block
          const blockResp = responses[blockIdx] ?? {};
          blockStats.push(scoreBlock(bp.trials, blockResp));
          blockIdx++; trialIdx = 0;
          return this.nextTrial();
        }
        const src = bp.trials[trialIdx]!;
        const t: Trial = {
          id: `wm-${blockIdx}-${trialIdx}`,
          blockIndex: blockIdx,
          trialIndex: trialIdx,
          stimulus: {
            kind: 'nback-grid',
            payload: { position: src.position, letter: src.letter, n: bp.n }
          },
          inputSpec: { accept: ['keyboard'], keys: ['a','l','ArrowLeft','ArrowRight'] },
          timingSpec: { stimulusMs: 500, isiMs: 2500 },
          metadata: {
            isPositionTarget: src.isPositionTarget,
            isAudioTarget: src.isAudioTarget,
            isLure: src.isLure
          }
        };
        trialIdx++;
        return t;
      },
      setMetacogPrediction() { /* noop for now */ },
      async submit(resp: Response): Promise<TrialResult> {
        const parts = resp.trialId.split('-');
        const bIdx = parseInt(parts[1]!);
        const tIdx = parseInt(parts[2]!);
        const key = typeof resp.event.value === 'string' ? resp.event.value : '';
        const isPos = POS_KEYS.has(key);
        const isAud = AUD_KEYS.has(key);
        responses[bIdx] ??= {};
        responses[bIdx][tIdx] = { position: isPos, audio: isAud };
        const src = blockPlans[bIdx]!.trials[tIdx]!;
        const posOk = src.isPositionTarget === isPos;
        const audOk = src.isAudioTarget === isAud;
        const correct = posOk && audOk;
        return {
          trialId: resp.trialId, correct,
          rtMs: resp.event.rtMs || null,
          scored: {
            posHit: isPos && src.isPositionTarget ? 1 : 0,
            audHit: isAud && src.isAudioTarget ? 1 : 0
          }
        };
      },
      currentBlockStats(): BlockStats {
        const bIdx = Math.min(blockIdx, blockPlans.length - 1);
        const stats = blockStats[bIdx];
        return {
          blockIndex: bIdx,
          trialsCompleted: trialIdx,
          accuracy: stats?.overallAccuracy ?? 0,
          custom: stats ? {
            dpVisual: stats.position.dPrime,
            dpAudio: stats.audio.dPrime,
            posHits: stats.position.counts.hits,
            audHits: stats.audio.counts.hits
          } : {}
        };
      },
      complete(): SessionResult {
        // Ensure last block scored
        if (blockStats.length < blockPlans.length && responses[blockIdx]) {
          blockStats.push(scoreBlock(blockPlans[blockIdx]!.trials, responses[blockIdx] ?? {}));
        }
        const newN = nextNLevel({ currentN: n, blockHistory: blockStats });
        const overallAcc = blockStats.reduce((s, b) => s + b.overallAccuracy, 0) /
          Math.max(blockStats.length, 1);
        return {
          blocks: blockStats.map((bs, i) => ({
            blockIndex: i, trialsCompleted: blockPlans[i]!.trials.length,
            accuracy: bs.overallAccuracy,
            custom: { dpVisual: bs.position.dPrime, dpAudio: bs.audio.dPrime }
          })),
          totalDurationMs: Date.now() - startTs,
          nextDomainState: {
            ...state,
            level: { n: newN },
            ewmaPerformance: 0.7 * state.ewmaPerformance + 0.3 * overallAcc,
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
