import type { TrainingModule, Session, Trial, Response, TrialResult, BlockStats, SessionResult, Block } from '~/types/module';
import type { DomainState } from '~/types/domain';
import { generateNBackBlock } from './dual-nback';
import { generateOSpanBlock, scoreOSpanSet, type OSpanBlock, type OSpanScore } from './complex-span';
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
    const level = state.level as any;
    const n = typeof level?.n === 'number' ? level.n : 2;
    const ospanSetSize = typeof level?.ospanSetSize === 'number' ? level.ospanSetSize : 3;

    // Create 4 blocks alternating n-back and ospan
    const nbackBlocks: ReturnType<typeof generateNBackBlock>[] = [];
    const ospanBlocks: OSpanBlock[] = [];

    // Block 0: n-back
    nbackBlocks.push(generateNBackBlock({
      n, nTargets: 6, nDualTargets: 2, nLures: 4,
      seed: (state.updatedTs + 0) >>> 0
    }));

    // Block 1: ospan
    ospanBlocks.push(generateOSpanBlock({
      setSize: ospanSetSize,
      seed: (state.updatedTs + 1) >>> 0
    }));

    // Block 2: n-back
    nbackBlocks.push(generateNBackBlock({
      n, nTargets: 6, nDualTargets: 2, nLures: 4,
      seed: (state.updatedTs + 2) >>> 0
    }));

    // Block 3: ospan (optional, only add if reasonable time)
    ospanBlocks.push(generateOSpanBlock({
      setSize: ospanSetSize,
      seed: (state.updatedTs + 3) >>> 0
    }));

    // Interleave blocks: 0=nback, 1=ospan, 2=nback, 3=ospan
    const blockPlans: Array<{ type: 'nback' | 'ospan'; data: ReturnType<typeof generateNBackBlock> | OSpanBlock }> = [
      { type: 'nback', data: nbackBlocks[0]! },
      { type: 'ospan', data: ospanBlocks[0]! },
      { type: 'nback', data: nbackBlocks[1]! },
      { type: 'ospan', data: ospanBlocks[1]! }
    ];

    const blocks: Block[] = blockPlans.map((bp, i) => {
      if (bp.type === 'nback') {
        const nb = bp.data as ReturnType<typeof generateNBackBlock>;
        return { index: i, kind: `dual-nback-n${nb.n}`, targetTrialCount: nb.trials.length };
      } else {
        // OSpan block: entire set is one comprehensive trial
        return { index: i, kind: 'complex-span', targetTrialCount: 1 };
      }
    });

    let blockIdx = 0;
    let trialIdx = 0;
    const nbackResponses: Record<number, Record<number, NBackResponse>> = {};
    const ospanResponses: Record<number, { mathResponses: boolean[]; recalled: string[] }> = {};
    const blockStats: (BlockStreamStats | OSpanScore)[] = [];
    const startTs = Date.now();

    const session: Session = {
      moduleId: 'working-memory',
      blocks,
      nextTrial(): Trial | null {
        if (blockIdx >= blockPlans.length) return null;
        const bp = blockPlans[blockIdx]!;

        if (bp.type === 'nback') {
          const nbPlan = bp.data as ReturnType<typeof generateNBackBlock>;
          if (trialIdx >= nbPlan.trials.length) {
            // score completed n-back block
            const blockResp = nbackResponses[blockIdx] ?? {};
            blockStats.push(scoreBlock(nbPlan.trials, blockResp));
            blockIdx++; trialIdx = 0;
            return this.nextTrial();
          }
          const src = nbPlan.trials[trialIdx]!;
          const t: Trial = {
            id: `wm-${blockIdx}-${trialIdx}`,
            blockIndex: blockIdx,
            trialIndex: trialIdx,
            stimulus: {
              kind: 'nback-grid',
              payload: { position: src.position, letter: src.letter, n: nbPlan.n }
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
        } else {
          // ospan block - single comprehensive trial presenting the whole set
          const ospanPlan = bp.data as OSpanBlock;
          if (trialIdx >= 1) {
            // ospan block completed (we only have 1 "trial" per ospan block)
            const blockResp = ospanResponses[blockIdx] ?? { mathResponses: [], recalled: [] };
            const mathTruths = ospanPlan.mathKeys.map(m => !m.userTrueIfCorrect);
            const score = scoreOSpanSet(ospanPlan.memoranda, blockResp.recalled, blockResp.mathResponses, mathTruths);
            blockStats.push(score);
            blockIdx++; trialIdx = 0;
            return this.nextTrial();
          }
          // First (and only) trial in ospan block: present entire set with math + letters + recall
          const t: Trial = {
            id: `wm-${blockIdx}-0`,
            blockIndex: blockIdx,
            trialIndex: 0,
            stimulus: {
              kind: 'complex-span',
              payload: {
                mathProblems: ospanPlan.mathKeys,
                letters: ospanPlan.memoranda
              }
            },
            inputSpec: { accept: ['text'] },
            timingSpec: { stimulusMs: 'until-response' }
          };
          trialIdx++;
          return t;
        }
      },
      setMetacogPrediction() { /* noop for now */ },
      async submit(resp: Response): Promise<TrialResult> {
        const parts = resp.trialId.split('-');
        const bIdx = parseInt(parts[1]!);
        const tIdx = parseInt(parts[2]!);
        const bp = blockPlans[bIdx]!;

        if (bp.type === 'nback') {
          // N-back block response
          const keys = resp.allKeys && resp.allKeys.length > 0
            ? resp.allKeys
            : (typeof resp.event.value === 'string' ? [resp.event.value] : []);
          const isPos = keys.some(k => POS_KEYS.has(k));
          const isAud = keys.some(k => AUD_KEYS.has(k));
          nbackResponses[bIdx] ??= {};
          nbackResponses[bIdx][tIdx] = { position: isPos, audio: isAud };
          const nbPlan = bp.data as ReturnType<typeof generateNBackBlock>;
          const src = nbPlan.trials[tIdx]!;
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
        } else {
          // Complex span block response - parse the response from the UI component
          ospanResponses[bIdx] ??= { mathResponses: [], recalled: [] };
          try {
            if (typeof resp.event.value === 'string') {
              const parsed = JSON.parse(resp.event.value);
              ospanResponses[bIdx]!.mathResponses = parsed.mathResponses || [];
              ospanResponses[bIdx]!.recalled = parsed.recalled || [];
            }
          } catch (e) {
            // If parsing fails, leave as empty arrays
          }
          return {
            trialId: resp.trialId, correct: true,
            rtMs: resp.event.rtMs || null,
            scored: {}
          };
        }
      },
      currentBlockStats(): BlockStats {
        const bIdx = Math.min(blockIdx, blockPlans.length - 1);
        const stats = blockStats[bIdx];
        const bp = blockPlans[bIdx];

        if (bp?.type === 'ospan' && stats && 'partialCredit' in stats) {
          return {
            blockIndex: bIdx,
            trialsCompleted: trialIdx,
            accuracy: stats.partialCredit,
            custom: {
              partialCredit: stats.partialCredit,
              mathAccuracy: stats.mathAccuracy,
              perfect: stats.perfect ? 1 : 0
            }
          };
        } else if (stats && 'position' in stats) {
          // n-back block
          return {
            blockIndex: bIdx,
            trialsCompleted: trialIdx,
            accuracy: stats.overallAccuracy ?? 0,
            custom: {
              dpVisual: stats.position.dPrime,
              dpAudio: stats.audio.dPrime,
              posHits: stats.position.counts.hits,
              audHits: stats.audio.counts.hits
            }
          };
        }
        return {
          blockIndex: bIdx,
          trialsCompleted: trialIdx,
          accuracy: 0,
          custom: {}
        };
      },
      complete(): SessionResult {
        // Ensure last block scored if it's still pending
        if (blockStats.length < blockPlans.length) {
          const bp = blockPlans[blockIdx];
          if (bp?.type === 'nback') {
            const nbPlan = bp.data as ReturnType<typeof generateNBackBlock>;
            if (nbackResponses[blockIdx]) {
              blockStats.push(scoreBlock(nbPlan.trials, nbackResponses[blockIdx]!));
            }
          } else if (bp?.type === 'ospan') {
            const ospanPlan = bp.data as OSpanBlock;
            const blockResp = ospanResponses[blockIdx] ?? { mathResponses: [], recalled: [] };
            const mathTruths = ospanPlan.mathKeys.map(m => !m.userTrueIfCorrect);
            const score = scoreOSpanSet(ospanPlan.memoranda, blockResp.recalled, blockResp.mathResponses, mathTruths);
            blockStats.push(score);
          }
        }

        // Extract n-back stats for adaptive n calculation
        const nbackStats: BlockStreamStats[] = [];
        for (let i = 0; i < blockStats.length; i++) {
          const bs = blockStats[i];
          if (bs && 'position' in bs) {
            nbackStats.push(bs);
          }
        }

        // Find last ospan score for set size adaptation
        let lastOSpanScore: OSpanScore | null = null;
        for (let i = blockStats.length - 1; i >= 0; i--) {
          const bs = blockStats[i];
          if (bs && 'partialCredit' in bs) {
            lastOSpanScore = bs;
            break;
          }
        }

        // Adaptive rules
        const newN = nextNLevel({ currentN: n, blockHistory: nbackStats });
        let newOSpanSetSize = ospanSetSize;
        if (lastOSpanScore) {
          if (lastOSpanScore.partialCredit >= 0.9) {
            newOSpanSetSize = Math.min(ospanSetSize + 1, 7);
          } else if (lastOSpanScore.partialCredit <= 0.5) {
            newOSpanSetSize = Math.max(ospanSetSize - 1, 2);
          }
        }

        const overallAcc = blockStats.reduce((s, b) => {
          if ('overallAccuracy' in b) return s + b.overallAccuracy;
          if ('partialCredit' in b) return s + b.partialCredit;
          return s;
        }, 0) / Math.max(blockStats.length, 1);

        return {
          blocks: blockStats.map((bs, i): BlockStats => {
            const bp = blockPlans[i];
            if (bp?.type === 'ospan' && 'partialCredit' in bs) {
              const custom: Record<string, number> = {
                partialCredit: bs.partialCredit,
                mathAccuracy: bs.mathAccuracy,
                perfect: bs.perfect ? 1 : 0
              };
              return {
                blockIndex: i,
                trialsCompleted: (bp.data as OSpanBlock).trials.length,
                accuracy: bs.partialCredit,
                custom
              };
            } else if ('position' in bs) {
              const nbPlan = bp?.data as ReturnType<typeof generateNBackBlock>;
              const custom: Record<string, number> = {
                dpVisual: bs.position.dPrime,
                dpAudio: bs.audio.dPrime,
                posHits: bs.position.counts.hits,
                audHits: bs.audio.counts.hits
              };
              return {
                blockIndex: i,
                trialsCompleted: nbPlan?.trials.length ?? 0,
                accuracy: bs.overallAccuracy,
                custom
              };
            }
            return {
              blockIndex: i,
              trialsCompleted: 0,
              accuracy: 0,
              custom: {}
            };
          }),
          totalDurationMs: Date.now() - startTs,
          nextDomainState: {
            ...state,
            level: { n: newN, ospanSetSize: newOSpanSetSize },
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
