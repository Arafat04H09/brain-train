export const NBACK_LETTERS = ['C','H','K','L','Q','R','S','T'] as const;
export const NBACK_POSITIONS = [0,1,2,3,4,5,6,7] as const;  // 8 positions (skip center of 3x3)

export type Letter = typeof NBACK_LETTERS[number];
export type Position = typeof NBACK_POSITIONS[number];

export interface NBackTrial {
  index: number;
  position: Position;
  letter: Letter;
  isPositionTarget: boolean;
  isAudioTarget: boolean;
  isLure: boolean;
}

export interface NBackBlockSpec {
  n: number;
  nTargets: number;       // per-stream target count (typically 6)
  nDualTargets: number;   // coincident (typically 2)
  nLures: number;         // N±1 lures (typically 4)
  seed: number;
}

export interface NBackBlock {
  n: number;
  trials: NBackTrial[];
}

// Mulberry32 seeded PRNG
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

export function generateNBackBlock(spec: NBackBlockSpec): NBackBlock {
  const totalTrials = spec.n + 20;
  const rand = prng(spec.seed);
  const pick = <T>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]!;

  // Build base random sequence
  const trials: NBackTrial[] = Array.from({ length: totalTrials }, (_, i) => ({
    index: i,
    position: pick(NBACK_POSITIONS),
    letter: pick(NBACK_LETTERS),
    isPositionTarget: false,
    isAudioTarget: false,
    isLure: false
  }));

  // Choose target indices ≥ N
  const available = Array.from({ length: totalTrials - spec.n }, (_, i) => i + spec.n);
  const shuffle = (arr: number[]) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
  };
  shuffle(available);

  const posTargetIdx = available.slice(0, spec.nTargets);
  const audTargetIdx = available.slice(spec.nTargets, spec.nTargets * 2);
  const dualIdx = available.slice(spec.nTargets * 2, spec.nTargets * 2 + spec.nDualTargets);
  const lureIdx = available.slice(
    spec.nTargets * 2 + spec.nDualTargets,
    spec.nTargets * 2 + spec.nDualTargets + spec.nLures
  );

  for (const i of posTargetIdx) {
    trials[i]!.position = trials[i - spec.n]!.position;
    trials[i]!.isPositionTarget = true;
  }
  for (const i of audTargetIdx) {
    trials[i]!.letter = trials[i - spec.n]!.letter;
    trials[i]!.isAudioTarget = true;
  }
  for (const i of dualIdx) {
    trials[i]!.position = trials[i - spec.n]!.position;
    trials[i]!.letter = trials[i - spec.n]!.letter;
    trials[i]!.isPositionTarget = true;
    trials[i]!.isAudioTarget = true;
  }
  for (const i of lureIdx) {
    // N-1 or N+1 proximity lure
    const offset = rand() < 0.5 ? spec.n - 1 : spec.n + 1;
    const src = i - offset;
    if (src >= 0) {
      if (rand() < 0.5) trials[i]!.position = trials[src]!.position;
      else trials[i]!.letter = trials[src]!.letter;
      trials[i]!.isLure = true;
    }
  }

  return { n: spec.n, trials };
}
