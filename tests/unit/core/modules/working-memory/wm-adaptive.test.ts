import { describe, it, expect } from 'vitest';
import { nextNLevel, scoreBlock } from '~/core/modules/working-memory/wm-adaptive';
import type { NBackTrial } from '~/core/modules/working-memory/dual-nback';

function mkTrial(partial: Partial<NBackTrial>): NBackTrial {
  return { index: 0, position: 0, letter: 'C', isPositionTarget: false,
    isAudioTarget: false, isLure: false, ...partial };
}

describe('wm adaptive', () => {
  it('scoreBlock computes per-stream d-prime', () => {
    const trials: NBackTrial[] = [
      mkTrial({ index: 2, isPositionTarget: true }),
      mkTrial({ index: 3, isAudioTarget: true }),
      mkTrial({ index: 4 })
    ];
    const responses = {
      2: { position: true, audio: false },   // hit position
      3: { position: false, audio: true },   // hit audio
      4: { position: false, audio: false }   // CR both
    };
    const stats = scoreBlock(trials, responses);
    expect(stats.position.hits).toBe(1);
    expect(stats.audio.hits).toBe(1);
  });

  it('promotes N when both streams ≥ 1.5 d-prime', () => {
    expect(nextNLevel({ currentN: 2, blockHistory: [
      { position: { dPrime: 1.6 } as any, audio: { dPrime: 1.7 } as any, overallAccuracy: 0.8 }
    ]})).toBe(3);
  });

  it('demotes N after two consecutive low-d-prime blocks', () => {
    expect(nextNLevel({ currentN: 3, blockHistory: [
      { position: { dPrime: 0.3 } as any, audio: { dPrime: 0.4 } as any, overallAccuracy: 0.5 },
      { position: { dPrime: 0.2 } as any, audio: { dPrime: 0.3 } as any, overallAccuracy: 0.45 }
    ]})).toBe(2);
  });

  it('holds N below promotion and above demotion', () => {
    expect(nextNLevel({ currentN: 3, blockHistory: [
      { position: { dPrime: 1.0 } as any, audio: { dPrime: 1.0 } as any, overallAccuracy: 0.7 }
    ]})).toBe(3);
  });

  it('never demotes below N=1', () => {
    expect(nextNLevel({ currentN: 1, blockHistory: [
      { position: { dPrime: 0.1 } as any, audio: { dPrime: 0.1 } as any, overallAccuracy: 0.3 },
      { position: { dPrime: 0.1 } as any, audio: { dPrime: 0.1 } as any, overallAccuracy: 0.25 }
    ]})).toBe(1);
  });
});
