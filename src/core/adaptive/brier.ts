export interface BrierDatum { p: number; outcome: 0 | 1 | boolean; }

function outcome01(o: BrierDatum['outcome']): number {
  return typeof o === 'boolean' ? (o ? 1 : 0) : o;
}

export function brierScore(data: BrierDatum[]): number {
  if (data.length === 0) return 0;
  const sum = data.reduce((s, d) => s + Math.pow(d.p - outcome01(d.outcome), 2), 0);
  return sum / data.length;
}

export interface BrierDecomposition {
  reliability: number;
  resolution: number;
  uncertainty: number;
  brier: number;
}

// Murphy 1973 decomposition: Brier = reliability - resolution + uncertainty
export function brierDecomposition(data: BrierDatum[], bins = 10): BrierDecomposition {
  if (data.length === 0) return { reliability: 0, resolution: 0, uncertainty: 0, brier: 0 };
  const buckets: { ps: number[]; outcomes: number[] }[] =
    Array.from({ length: bins }, () => ({ ps: [], outcomes: [] }));
  for (const d of data) {
    const idx = Math.min(bins - 1, Math.floor(d.p * bins));
    buckets[idx]!.ps.push(d.p);
    buckets[idx]!.outcomes.push(outcome01(d.outcome));
  }
  const N = data.length;
  const baseRate = data.reduce((s, d) => s + outcome01(d.outcome), 0) / N;
  let reliability = 0, resolution = 0;
  for (const b of buckets) {
    const n = b.ps.length;
    if (n === 0) continue;
    const avgP = b.ps.reduce((s, x) => s + x, 0) / n;
    const avgOutcome = b.outcomes.reduce((s, x) => s + x, 0) / n;
    reliability += (n / N) * Math.pow(avgP - avgOutcome, 2);
    resolution += (n / N) * Math.pow(avgOutcome - baseRate, 2);
  }
  const uncertainty = baseRate * (1 - baseRate);
  return { reliability, resolution, uncertainty, brier: brierScore(data) };
}
