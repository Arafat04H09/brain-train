import type { StimulusDescriptor } from '~/types/stimulus';

export interface UfovSubtest {
  id: 'focused' | 'divided' | 'selective-8' | 'selective-24';
  displayName: string;
  hasPeripheral: boolean;
  distractorCount: number;
}

export const UFOV_SUBTESTS: UfovSubtest[] = [
  { id: 'focused',      displayName: 'Focused attention',             hasPeripheral: false, distractorCount: 0 },
  { id: 'divided',      displayName: 'Divided attention',             hasPeripheral: true,  distractorCount: 0 },
  { id: 'selective-8',  displayName: 'Selective attention (8 dist.)', hasPeripheral: true,  distractorCount: 8 },
  { id: 'selective-24', displayName: 'Selective attention (24 dist.)',hasPeripheral: true,  distractorCount: 24 }
];

export interface UfovTrialPayload {
  subtestId: UfovSubtest['id'];
  centralTarget: 'car' | 'truck';
  peripheralLocation: number;   // 0..7 (8 radial slots); -1 if no peripheral
  distractorCount: number;
  displayMs: number;
  maskMs: number;
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

export function generateUfovTrial(opts: {
  subtestId: UfovSubtest['id']; displayMs: number; seed: number; maskMs?: number;
}): StimulusDescriptor {
  const rand = prng(opts.seed);
  const subtest = UFOV_SUBTESTS.find(s => s.id === opts.subtestId)!;
  const payload: UfovTrialPayload = {
    subtestId: opts.subtestId,
    centralTarget: rand() < 0.5 ? 'car' : 'truck',
    peripheralLocation: subtest.hasPeripheral ? Math.floor(rand() * 8) : -1,
    distractorCount: subtest.distractorCount,
    displayMs: opts.displayMs,
    maskMs: opts.maskMs ?? 200
  };
  return { kind: 'ufov-peripheral', payload };
}
