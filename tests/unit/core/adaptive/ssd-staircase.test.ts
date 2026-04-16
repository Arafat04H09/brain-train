import { describe, it, expect } from 'vitest';
import { SsdStaircase } from '~/core/adaptive/ssd-staircase';

describe('SSD staircase', () => {
  it('increases SSD after successful inhibition', () => {
    const s = new SsdStaircase({ startMs: 250 });
    expect(s.update(true)).toBe(300);
  });
  it('decreases SSD after failed inhibition', () => {
    const s = new SsdStaircase({ startMs: 250 });
    expect(s.update(false)).toBe(200);
  });
  it('clamps to bounds', () => {
    const s = new SsdStaircase({ startMs: 0, minMs: 0 });
    s.update(false); s.update(false);
    expect(s.current()).toBe(0);
  });
});
