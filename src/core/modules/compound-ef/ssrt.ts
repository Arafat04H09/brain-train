export interface SsrtInput {
  goRts: number[];         // RTs on no-stop-signal go trials
  pFailedInhibit: number;  // proportion of stop trials where response was NOT inhibited
  meanSsdMs: number;       // mean of presented SSDs
}

export function ssrtIntegration(i: SsrtInput): number {
  if (i.goRts.length === 0) return NaN;
  const sorted = [...i.goRts].sort((a, b) => a - b);
  // nth percentile where n = p(failed-inhibit)
  const idx = Math.min(sorted.length - 1, Math.floor(i.pFailedInhibit * sorted.length));
  const nthRt = sorted[idx]!;
  return nthRt - i.meanSsdMs;
}
