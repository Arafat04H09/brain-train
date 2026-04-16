/**
 * Cued Task Switching (Meiran 1996 / Rogers & Monsell 1995)
 * Cue word appears before stimulus: "COLOR" or "SHAPE"
 * Stimulus is a colored shape (red/blue × square/circle)
 * If cue is COLOR: press left for red, right for blue
 * If cue is SHAPE: press left for square, right for circle
 * Randomize cue per trial so ~50% are switches (different from previous cue)
 * Measures: switch cost (RT switch - RT repeat)
 */

export type CueType = 'COLOR' | 'SHAPE';
export type Color = 'red' | 'blue';
export type Shape = 'square' | 'circle';

export interface TaskSwitchTrial {
  index: number;
  cue: CueType;
  color: Color;
  shape: Shape;
  isSwitch: boolean;  // cue different from previous trial
}

export interface TaskSwitchBlockSpec {
  nTrials: number;
  seed: number;
}

export interface TaskSwitchBlock {
  trials: TaskSwitchTrial[];
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

const CUES: CueType[] = ['COLOR', 'SHAPE'];
const COLORS: Color[] = ['red', 'blue'];
const SHAPES: Shape[] = ['square', 'circle'];

export function generateTaskSwitchBlock(spec: TaskSwitchBlockSpec): TaskSwitchBlock {
  const rand = prng(spec.seed);
  const pick = <T>(a: readonly T[]) => a[Math.floor(rand() * a.length)]!;
  const trials: TaskSwitchTrial[] = [];

  let prevCue: CueType | null = null;

  for (let i = 0; i < spec.nTrials; i++) {
    // Randomly pick cue (roughly 50/50 but not forced alternation)
    const cue = pick(CUES);
    const isSwitch = prevCue !== null && cue !== prevCue;

    trials.push({
      index: i,
      cue,
      color: pick(COLORS),
      shape: pick(SHAPES),
      isSwitch
    });

    prevCue = cue;
  }

  return { trials };
}
