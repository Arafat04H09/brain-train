/**
 * Stop-Signal Task (Verbruggen & Logan 2008)
 * Primary go task: arrow left/right, press matching key fast.
 * On ~25% of trials, a visual "STOP" signal appears after SSD milliseconds.
 * User must withhold response on stop trials.
 * SSD staircases via external staircase controller.
 * Measures: SSRT via integration method (from ssrt.ts)
 */

export interface StopSignalTrial {
  index: number;
  direction: 'left' | 'right';  // → (right) or ← (left)
  isStopTrial: boolean;
  // ssdMs is NOT set here; it comes from staircase on each trial
}

export interface StopSignalBlockSpec {
  nTrials: number;
  seed: number;
  stopTrialProbability?: number;  // default 0.25
}

export interface StopSignalBlock {
  trials: StopSignalTrial[];
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

export function generateStopSignalBlock(spec: StopSignalBlockSpec): StopSignalBlock {
  const rand = prng(spec.seed);
  const stopProb = spec.stopTrialProbability ?? 0.25;
  const trials: StopSignalTrial[] = [];

  for (let i = 0; i < spec.nTrials; i++) {
    const direction = rand() < 0.5 ? 'left' : 'right';
    const isStopTrial = rand() < stopProb;

    trials.push({
      index: i,
      direction,
      isStopTrial
    });
  }

  return { trials };
}
