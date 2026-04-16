export interface UrgencyInput {
  daysSinceLast: number;
  plateauFlag: boolean;
  decayFlag: boolean;   // set true in maintenance phase if CUSUM triggers
}

export function urgencyScore(i: UrgencyInput): number {
  const base = Math.min(i.daysSinceLast / 2, 2);  // cap at 2
  const decayBoost = i.decayFlag ? 0.5 : 0;
  const plateauPenalty = i.plateauFlag ? -0.4 : 0;
  return base + decayBoost + plateauPenalty;
}
