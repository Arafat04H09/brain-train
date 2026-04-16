// Thin TS wrapper over jsQUEST — provides a typed class interface.
// See research/10-adaptive-algorithms-deep.md §QUEST for algorithm details.

// @ts-expect-error - jsQUEST has no bundled types
import * as jsQUEST from '~/vendor/jsQUEST.js';

export interface QuestOptions {
  tGuess: number;
  tGuessSd: number;
  pThreshold: number;
  beta: number;
  delta: number;
  gamma: number;
  grain: number;
  range: number;
}

export class Quest {
  private q: any;

  constructor(opts: QuestOptions) {
    this.q = jsQUEST.QuestCreate(
      opts.tGuess, opts.tGuessSd, opts.pThreshold,
      opts.beta, opts.delta, opts.gamma, opts.grain, opts.range
    );
  }

  /** Next intensity to present (Bayesian quantile of posterior). */
  quantile(): number { return jsQUEST.QuestQuantile(this.q); }
  /** Posterior mean (threshold estimate). */
  mean(): number { return jsQUEST.QuestMean(this.q); }
  /** Posterior mode. */
  mode(): number { return jsQUEST.QuestMode(this.q); }
  /** Posterior SD (uncertainty). */
  sd(): number { return jsQUEST.QuestSd(this.q); }

  /** Update with trial result. `intensity` is what was actually presented. */
  update(intensity: number, correct: boolean): void {
    this.q = jsQUEST.QuestUpdate(this.q, intensity, correct ? 1 : 0);
  }
}
