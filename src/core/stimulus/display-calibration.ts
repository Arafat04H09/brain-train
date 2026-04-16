export function estimateRefresh(timestamps: number[]): number {
  if (timestamps.length < 2) return 60;
  const diffs: number[] = [];
  for (let i = 1; i < timestamps.length; i++) diffs.push(timestamps[i]! - timestamps[i - 1]!);
  diffs.sort((a, b) => a - b);
  // median for robustness
  const med = diffs[Math.floor(diffs.length / 2)]!;
  return 1000 / med;
}

export function msToFrames(ms: number, hz: number): number {
  return Math.max(1, Math.round((ms / 1000) * hz));
}

export function framesToMs(frames: number, hz: number): number {
  return (frames / hz) * 1000;
}

// Run inside a worker or main thread — captures N rAF timestamps
export function captureFrameTimestamps(nFrames: number): Promise<number[]> {
  return new Promise((resolve) => {
    const ts: number[] = [];
    const tick = (t: number) => {
      ts.push(t);
      if (ts.length >= nFrames) resolve(ts);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

export interface CalibrationReport {
  refreshHz: number;
  frameMs: number;
  droppedFrames: number;
  samples: number;
}

export async function calibrateDisplay(nFrames = 120): Promise<CalibrationReport> {
  const ts = await captureFrameTimestamps(nFrames);
  const hz = estimateRefresh(ts);
  const expected = 1000 / hz;
  let dropped = 0;
  for (let i = 1; i < ts.length; i++) {
    const gap = ts[i]! - ts[i - 1]!;
    if (gap > expected * 1.5) dropped++;
  }
  return { refreshHz: hz, frameMs: expected, droppedFrames: dropped, samples: ts.length };
}
