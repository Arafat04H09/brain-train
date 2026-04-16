import { describe, it, expect } from 'vitest';
import { dPrimeRule, accuracyRule } from '~/core/adaptive/block-promotion';

describe('BlockPromotion', () => {
  it('d-prime rule promotes when both streams ≥ 1.5', () => {
    const r = dPrimeRule({ promoteAt: 1.5, demoteAt: 0.5 });
    expect(r([{ visual: 1.6, audio: 1.7 }])).toBe('promote');
  });

  it('d-prime rule holds when only one stream above threshold', () => {
    const r = dPrimeRule({ promoteAt: 1.5, demoteAt: 0.5 });
    expect(r([{ visual: 1.6, audio: 1.0 }])).toBe('hold');
  });

  it('d-prime rule demotes on two consecutive low blocks', () => {
    const r = dPrimeRule({ promoteAt: 1.5, demoteAt: 0.5 });
    expect(r([
      { visual: 0.3, audio: 0.4 },
      { visual: 0.2, audio: 0.3 }
    ])).toBe('demote');
  });

  it('accuracy rule promotes at high accuracy, demotes at low', () => {
    const r = accuracyRule({ promoteAt: 0.85, demoteAt: 0.55 });
    expect(r([{ accuracy: 0.9 }])).toBe('promote');
    expect(r([{ accuracy: 0.5 }, { accuracy: 0.5 }])).toBe('demote');
    expect(r([{ accuracy: 0.7 }])).toBe('hold');
  });
});
