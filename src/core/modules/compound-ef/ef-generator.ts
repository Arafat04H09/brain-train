export type EfRule = 'color' | 'shape' | 'size';
export type EfColor = 'red' | 'blue' | 'green' | 'yellow';
export type EfShape = 'circle' | 'square' | 'triangle' | 'diamond';
export type EfSize = 'small' | 'large';

export interface EfTrial {
  index: number;
  rule: EfRule;
  isSwitch: boolean;
  color: EfColor;
  shape: EfShape;
  size: EfSize;
  flankerCongruent: boolean;
  hasStopSignal: boolean;
  ssdMs: number;  // stop-signal delay if applicable; 0 otherwise
}

export interface EfBlockSpec {
  nTrials: number;
  seed: number;
  rules: EfRule[];
  switchFreq: number;        // 0-1
  congruencyIncongruent: number;
  stopSignalProb: number;
  initialSsdMs?: number;
}

export interface EfBlock {
  trials: EfTrial[];
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

const COLORS: EfColor[] = ['red','blue','green','yellow'];
const SHAPES: EfShape[] = ['circle','square','triangle','diamond'];
const SIZES: EfSize[] = ['small','large'];

export function generateEfBlock(spec: EfBlockSpec): EfBlock {
  const rand = prng(spec.seed);
  const pick = <T>(a: readonly T[]) => a[Math.floor(rand() * a.length)]!;
  const trials: EfTrial[] = [];
  let prevRule: EfRule | null = null;
  for (let i = 0; i < spec.nTrials; i++) {
    const shouldSwitch: boolean = prevRule !== null && rand() < spec.switchFreq;
    const rule: EfRule = shouldSwitch
      ? pick(spec.rules.filter(r => r !== prevRule))
      : (prevRule ?? pick(spec.rules));
    trials.push({
      index: i,
      rule,
      isSwitch: prevRule !== null && rule !== prevRule,
      color: pick(COLORS),
      shape: pick(SHAPES),
      size: pick(SIZES),
      flankerCongruent: rand() >= spec.congruencyIncongruent,
      hasStopSignal: rand() < spec.stopSignalProb,
      ssdMs: spec.initialSsdMs ?? 250
    });
    prevRule = rule;
  }
  return { trials };
}
