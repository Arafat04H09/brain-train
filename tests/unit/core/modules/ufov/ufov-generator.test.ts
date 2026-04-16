import { describe, it, expect } from 'vitest';
import { generateUfovTrial, UFOV_SUBTESTS } from '~/core/modules/ufov/ufov-generator';

describe('UFOV trial generator', () => {
  it('declares 4 subtests', () => {
    expect(UFOV_SUBTESTS.length).toBe(4);
    expect(UFOV_SUBTESTS[0]!.id).toBe('focused');
    expect(UFOV_SUBTESTS[1]!.id).toBe('divided');
    expect(UFOV_SUBTESTS[2]!.id).toBe('selective-8');
    expect(UFOV_SUBTESTS[3]!.id).toBe('selective-24');
  });

  it('generates a trial with central target + mask spec', () => {
    const t = generateUfovTrial({ subtestId: 'focused', displayMs: 100, seed: 1 });
    expect(t.kind).toBe('ufov-peripheral');
    const p = t.payload as any;
    expect(['car', 'truck']).toContain(p.centralTarget);
    expect(p.maskMs).toBeGreaterThan(0);
    expect(p.displayMs).toBe(100);
  });

  it('divided subtest includes peripheral target', () => {
    const t = generateUfovTrial({ subtestId: 'divided', displayMs: 100, seed: 5 });
    const p = t.payload as any;
    expect(p.peripheralLocation).toBeGreaterThanOrEqual(0);
    expect(p.peripheralLocation).toBeLessThanOrEqual(7);
  });

  it('selective-24 has 24+ distractors', () => {
    const t = generateUfovTrial({ subtestId: 'selective-24', displayMs: 100, seed: 7 });
    const p = t.payload as any;
    expect(p.distractorCount).toBeGreaterThanOrEqual(24);
  });

  it('is deterministic given seed', () => {
    const a = generateUfovTrial({ subtestId: 'focused', displayMs: 100, seed: 42 });
    const b = generateUfovTrial({ subtestId: 'focused', displayMs: 100, seed: 42 });
    expect(a.payload).toEqual(b.payload);
  });
});
