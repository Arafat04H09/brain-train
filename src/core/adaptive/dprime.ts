export interface SdtCounts {
  hits: number;
  misses: number;
  falseAlarms: number;
  correctRejects: number;
}

export interface DPrimeResult {
  dPrime: number;
  hitRate: number;
  faRate: number;
  bias: number;   // criterion c
}

// Hautus (1995) log-linear correction: add 0.5 to each count, 1 to trial totals
export function logLinearCorrection(c: SdtCounts): SdtCounts {
  return {
    hits: c.hits + 0.5,
    misses: c.misses + 0.5,
    falseAlarms: c.falseAlarms + 0.5,
    correctRejects: c.correctRejects + 0.5
  };
}

// Inverse standard normal (probit) via rational approximation (Acklam 2003)
function probit(p: number): number {
  if (p <= 0 || p >= 1) throw new Error(`probit: p must be in (0,1), got ${p}`);
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const plow = 0.02425, phigh = 1 - plow;
  if (p < plow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
           ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  if (p <= phigh) {
    const q = p - 0.5; const r = q * q;
    return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q /
           (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
          ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
}

export function computeDPrime(raw: SdtCounts): DPrimeResult {
  const corrected = logLinearCorrection(raw);
  const hitRate = corrected.hits / (corrected.hits + corrected.misses);
  const faRate = corrected.falseAlarms / (corrected.falseAlarms + corrected.correctRejects);
  const zH = probit(hitRate);
  const zF = probit(faRate);
  return {
    dPrime: zH - zF,
    hitRate,
    faRate,
    bias: -0.5 * (zH + zF)
  };
}
