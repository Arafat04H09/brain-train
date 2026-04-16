import { describe, it, expect } from 'vitest';
import { estimateRefresh, msToFrames } from '~/core/stimulus/display-calibration';

describe('display calibration', () => {
  it('estimates refresh rate from frame timestamps', () => {
    // 60 Hz: frames 16.67ms apart
    const ts = Array.from({ length: 61 }, (_, i) => i * 16.666);
    const hz = estimateRefresh(ts);
    expect(hz).toBeGreaterThan(55);
    expect(hz).toBeLessThan(65);
  });

  it('msToFrames rounds to integer frames at given Hz', () => {
    expect(msToFrames(33.33, 60)).toBe(2);
    expect(msToFrames(16.67, 60)).toBe(1);
    expect(msToFrames(500, 60)).toBe(30);
  });
});
