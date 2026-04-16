import { NBACK_LETTERS } from './dual-nback';

export interface OSpanTrial {
  index: number;
  kind: 'memorandum' | 'processing' | 'recall';
  payload: unknown;
}

export interface OSpanBlock {
  setSize: number;
  trials: OSpanTrial[];
  memoranda: string[];
  mathKeys: { question: string; correct: number; presented: number; userTrueIfCorrect: boolean }[];
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

export function generateOSpanBlock(spec: { setSize: number; seed: number }): OSpanBlock {
  const rand = prng(spec.seed);
  const memoranda: string[] = [];
  const math: OSpanBlock['mathKeys'] = [];
  const trials: OSpanTrial[] = [];
  for (let i = 0; i < spec.setSize; i++) {
    const a = 1 + Math.floor(rand() * 9);
    const b = 1 + Math.floor(rand() * 9);
    const op = rand() < 0.5 ? '+' : '-';
    const correct = op === '+' ? a + b : a - b;
    const flip = rand() < 0.5;
    const presented = flip ? correct : correct + (rand() < 0.5 ? 1 : -1);
    const mathTrial = {
      question: `${a} ${op} ${b} = ${presented}`,
      correct, presented, userTrueIfCorrect: !flip ? true : false
    };
    math.push(mathTrial);
    trials.push({ index: trials.length, kind: 'processing', payload: mathTrial });
    const letter = NBACK_LETTERS[Math.floor(rand() * NBACK_LETTERS.length)]!;
    memoranda.push(letter);
    trials.push({ index: trials.length, kind: 'memorandum', payload: { letter } });
  }
  trials.push({ index: trials.length, kind: 'recall', payload: { setSize: spec.setSize } });
  return { setSize: spec.setSize, trials, memoranda, mathKeys: math };
}

export interface OSpanScore {
  perfect: boolean;
  partialCredit: number;      // 0-1 per-position recall
  mathAccuracy: number;
}

export function scoreOSpanSet(
  memoranda: string[],
  recalled: string[],
  mathResponses: boolean[] = [],
  mathTruths: boolean[] = []
): OSpanScore {
  let correct = 0;
  for (let i = 0; i < memoranda.length; i++) {
    if (recalled[i] === memoranda[i]) correct++;
  }
  const mathCorrect = mathResponses.filter((r, i) => r === mathTruths[i]).length;
  return {
    perfect: correct === memoranda.length,
    partialCredit: correct / Math.max(memoranda.length, 1),
    mathAccuracy: mathResponses.length ? mathCorrect / mathResponses.length : 1
  };
}
