/**
 * Eriksen Flanker Task (Eriksen & Eriksen 1974)
 * Central arrow flanked by 4 arrows (2 left, 2 right).
 * Congruent: all arrows point same direction
 * Incongruent: center arrow points opposite to flankers
 * User presses arrow key matching CENTER arrow direction.
 * Measures flanker congruency effect (RT incongruent - RT congruent).
 */

export interface FlankerTrial {
  index: number;
  centerDirection: 'left' | 'right';  // → (right) or ← (left)
  flankerDirection: 'left' | 'right';
  isCongruent: boolean;  // centerDirection === flankerDirection
}

export interface FlankerBlockSpec {
  nTrials: number;
  seed: number;
}

export interface FlankerBlock {
  trials: FlankerTrial[];
}

function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateFlankerBlock(spec: FlankerBlockSpec): FlankerBlock {
  const rand = prng(spec.seed);
  const trials: FlankerTrial[] = [];

  for (let i = 0; i < spec.nTrials; i++) {
    // 50/50 center direction
    const centerDirection = rand() < 0.5 ? 'left' : 'right';
    // 50/50 congruent
    const isCongruent = rand() < 0.5;
    const flankerDirection = isCongruent ? centerDirection : (centerDirection === 'left' ? 'right' : 'left');

    trials.push({
      index: i,
      centerDirection,
      flankerDirection,
      isCongruent
    });
  }

  return { trials };
}
