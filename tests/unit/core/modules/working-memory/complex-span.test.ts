import { describe, it, expect } from 'vitest';
import { generateOSpanBlock, scoreOSpanSet } from '~/core/modules/working-memory/complex-span';

describe('complex span (OSpan)', () => {
  it('generates a set with N memoranda interleaved with N processing items', () => {
    const block = generateOSpanBlock({ setSize: 4, seed: 1 });
    const memoranda = block.trials.filter(t => t.kind === 'memorandum');
    const processing = block.trials.filter(t => t.kind === 'processing');
    expect(memoranda.length).toBe(4);
    expect(processing.length).toBe(4);
  });

  it('scoreOSpanSet returns partial credit proportional to correct recall positions', () => {
    const block = generateOSpanBlock({ setSize: 4, seed: 1 });
    const memoranda = block.trials.filter(t => t.kind === 'memorandum').map(t => (t.payload as any).letter);
    // user recalled only first two correctly
    const recalled = [memoranda[0], memoranda[1], 'X', 'Y'];
    const score = scoreOSpanSet(memoranda, recalled);
    expect(score.partialCredit).toBeCloseTo(0.5, 2);
    expect(score.perfect).toBe(false);
  });
});
