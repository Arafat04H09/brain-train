import { brierScore, brierDecomposition } from '~/core/adaptive/brier';

export interface MetacogEntry {
  blockId: string;
  predicted: number;   // 0-1
  actual: number;      // 0-1
}

export class MetacogAccumulator {
  private entries: MetacogEntry[] = [];

  record(blockId: string, predicted: number, actual: number): void {
    this.entries.push({ blockId, predicted, actual });
  }

  brier(): number {
    return brierScore(this.entries.map(e => ({ p: e.predicted, outcome: e.actual >= 0.5 ? 1 : 0 })));
  }

  decomposition(bins = 10) {
    return brierDecomposition(this.entries.map(e => ({ p: e.predicted, outcome: e.actual >= 0.5 ? 1 : 0 })), bins);
  }

  all(): readonly MetacogEntry[] { return this.entries; }
}
