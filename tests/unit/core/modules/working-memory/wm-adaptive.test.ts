import { describe, it, expect } from 'vitest';
import { nextNLevel, scoreBlock } from '~/core/modules/working-memory/wm-adaptive';
import type { NBackTrial } from '~/core/modules/working-memory/dual-nback';
import type { SdtCounts } from '~/core/adaptive/dprime';

function mkTrial(partial: Partial<NBackTrial>): NBackTrial {
  return { index: 0, position: 0, letter: 'C', isPositionTarget: false,
    isAudioTarget: false, isLure: false, ...partial };
}

// Jaeggi's accuracy rule uses (hits + correctRejects) / total. Build a stream
// stat where accuracy hits a target value by adjusting CR count.
function mkStream(accuracy: number, total = 22): any {
  const correct = Math.round(accuracy * total);
  const counts: SdtCounts = {
    hits: Math.floor(correct * 0.3),
    misses: Math.floor((total - correct) * 0.5),
    falseAlarms: (total - correct) - Math.floor((total - correct) * 0.5),
    correctRejects: correct - Math.floor(correct * 0.3)
  };
  return { dPrime: 0, hitRate: 0, faRate: 0, bias: 0, ...counts, counts };
}

describe('wm adaptive', () => {
  it('scoreBlock computes per-stream d-prime', () => {
    const trials: NBackTrial[] = [
      mkTrial({ index: 2, isPositionTarget: true }),
      mkTrial({ index: 3, isAudioTarget: true }),
      mkTrial({ index: 4 })
    ];
    const responses = {
      2: { position: true, audio: false },
      3: { position: false, audio: true },
      4: { position: false, audio: false }
    };
    const stats = scoreBlock(trials, responses);
    expect(stats.position.hits).toBe(1);
    expect(stats.audio.hits).toBe(1);
  });

  it('promotes N when both streams ≥ 90% accuracy (Jaeggi 2008 rule)', () => {
    expect(nextNLevel({ currentN: 2, blockHistory: [
      { position: mkStream(0.92), audio: mkStream(0.91), overallAccuracy: 0.9 }
    ]})).toBe(3);
  });

  it('does not promote at 85% (below Jaeggi threshold)', () => {
    expect(nextNLevel({ currentN: 2, blockHistory: [
      { position: mkStream(0.85), audio: mkStream(0.85), overallAccuracy: 0.85 }
    ]})).toBe(2);
  });

  it('demotes N after two consecutive blocks below 75% accuracy', () => {
    expect(nextNLevel({ currentN: 3, blockHistory: [
      { position: mkStream(0.6), audio: mkStream(0.55), overallAccuracy: 0.5 },
      { position: mkStream(0.58), audio: mkStream(0.5), overallAccuracy: 0.45 }
    ]})).toBe(2);
  });

  it('holds N between promotion (90%) and demotion (75%) thresholds', () => {
    expect(nextNLevel({ currentN: 3, blockHistory: [
      { position: mkStream(0.82), audio: mkStream(0.8), overallAccuracy: 0.78 }
    ]})).toBe(3);
  });

  it('never demotes below N=1', () => {
    expect(nextNLevel({ currentN: 1, blockHistory: [
      { position: mkStream(0.4), audio: mkStream(0.4), overallAccuracy: 0.35 },
      { position: mkStream(0.4), audio: mkStream(0.4), overallAccuracy: 0.35 }
    ]})).toBe(1);
  });
});
