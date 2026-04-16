export type PromotionDecision = 'promote' | 'demote' | 'hold';

export interface DPrimeRuleOptions {
  promoteAt: number;   // both streams ≥ this → promote
  demoteAt: number;    // either stream ≤ this for N blocks → demote
  demoteConsec?: number;  // default 2
}

export interface DPrimeBlock {
  visual: number;
  audio: number;
}

export function dPrimeRule(opts: DPrimeRuleOptions) {
  const consec = opts.demoteConsec ?? 2;
  return (blocks: DPrimeBlock[]): PromotionDecision => {
    const latest = blocks[blocks.length - 1];
    if (!latest) return 'hold';
    if (latest.visual >= opts.promoteAt && latest.audio >= opts.promoteAt) {
      return 'promote';
    }
    const recent = blocks.slice(-consec);
    if (recent.length >= consec &&
        recent.every(b => b.visual <= opts.demoteAt || b.audio <= opts.demoteAt)) {
      return 'demote';
    }
    return 'hold';
  };
}

export interface AccuracyRuleOptions {
  promoteAt: number;
  demoteAt: number;
  demoteConsec?: number;
}

export function accuracyRule(opts: AccuracyRuleOptions) {
  const consec = opts.demoteConsec ?? 2;
  return (blocks: { accuracy: number }[]): PromotionDecision => {
    const latest = blocks[blocks.length - 1];
    if (!latest) return 'hold';
    if (latest.accuracy >= opts.promoteAt) return 'promote';
    const recent = blocks.slice(-consec);
    if (recent.length >= consec && recent.every(b => b.accuracy <= opts.demoteAt)) {
      return 'demote';
    }
    return 'hold';
  };
}
