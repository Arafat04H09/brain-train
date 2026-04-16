import type { NBackTrial } from './dual-nback';
import { computeDPrime, type DPrimeResult, type SdtCounts } from '~/core/adaptive/dprime';

export interface NBackResponse {
  position: boolean;  // user said "position match"
  audio: boolean;     // user said "audio match"
}

export interface BlockStreamStats {
  position: DPrimeResult & SdtCounts & { counts: SdtCounts };
  audio: DPrimeResult & SdtCounts & { counts: SdtCounts };
  overallAccuracy: number;
}

export function scoreBlock(
  trials: NBackTrial[],
  responses: Record<number, NBackResponse>
): BlockStreamStats {
  const posCounts: SdtCounts = { hits: 0, misses: 0, falseAlarms: 0, correctRejects: 0 };
  const audCounts: SdtCounts = { hits: 0, misses: 0, falseAlarms: 0, correctRejects: 0 };
  let correctTrials = 0;

  for (const t of trials) {
    const r = responses[t.index] ?? { position: false, audio: false };
    // Position stream
    if (t.isPositionTarget && r.position) posCounts.hits++;
    else if (t.isPositionTarget && !r.position) posCounts.misses++;
    else if (!t.isPositionTarget && r.position) posCounts.falseAlarms++;
    else posCounts.correctRejects++;
    // Audio stream
    if (t.isAudioTarget && r.audio) audCounts.hits++;
    else if (t.isAudioTarget && !r.audio) audCounts.misses++;
    else if (!t.isAudioTarget && r.audio) audCounts.falseAlarms++;
    else audCounts.correctRejects++;
    // Overall accuracy (both streams correct)
    const posOk = (t.isPositionTarget === r.position);
    const audOk = (t.isAudioTarget === r.audio);
    if (posOk && audOk) correctTrials++;
  }

  return {
    position: { ...computeDPrime(posCounts), ...posCounts, counts: posCounts },
    audio: { ...computeDPrime(audCounts), ...audCounts, counts: audCounts },
    overallAccuracy: correctTrials / Math.max(trials.length, 1)
  };
}

export interface NLevelInput {
  currentN: number;
  blockHistory: BlockStreamStats[];
  minN?: number;
  maxN?: number;
  promoteDPrime?: number;
  demoteDPrime?: number;
  demoteConsec?: number;
}

export function nextNLevel(i: NLevelInput): number {
  const minN = i.minN ?? 1;
  const maxN = i.maxN ?? 10;
  const promote = i.promoteDPrime ?? 1.5;
  const demote = i.demoteDPrime ?? 0.5;
  const consec = i.demoteConsec ?? 2;
  const latest = i.blockHistory[i.blockHistory.length - 1];
  if (!latest) return i.currentN;

  if (latest.position.dPrime >= promote && latest.audio.dPrime >= promote) {
    return Math.min(i.currentN + 1, maxN);
  }
  const recent = i.blockHistory.slice(-consec);
  if (recent.length >= consec &&
      recent.every(b => b.position.dPrime <= demote || b.audio.dPrime <= demote)) {
    return Math.max(i.currentN - 1, minN);
  }
  return i.currentN;
}
