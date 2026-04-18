import { describe, it, expect } from 'vitest';
import { generateDigitSequence, generateFoil } from '~/core/modules/assessment/digit-span-task';

describe('Digit span', () => {
  it('generates sequence of requested length', () => {
    const seq = generateDigitSequence(5);
    expect(seq).toHaveLength(5);
    for (const d of seq) {
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(9);
    }
  });

  it('foil has exactly one transposition', () => {
    const seq = [3, 7, 2, 9, 1];
    const foil = generateFoil(seq);
    expect(foil).toHaveLength(seq.length);
    let diffs = 0;
    for (let i = 0; i < seq.length; i++) {
      if (seq[i] !== foil[i]) diffs++;
    }
    expect(diffs).toBe(2);
  });

  it('no consecutive duplicate digits in sequence', () => {
    for (let trial = 0; trial < 50; trial++) {
      const seq = generateDigitSequence(6);
      for (let i = 1; i < seq.length; i++) {
        expect(seq[i]).not.toBe(seq[i - 1]);
      }
    }
  });
});
