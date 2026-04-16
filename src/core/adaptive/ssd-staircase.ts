export class SsdStaircase {
  private ssdMs: number;
  private readonly stepMs: number;
  private readonly minMs: number;
  private readonly maxMs: number;

  constructor(opts: { startMs?: number; stepMs?: number; minMs?: number; maxMs?: number }) {
    this.ssdMs = opts.startMs ?? 250;
    this.stepMs = opts.stepMs ?? 50;
    this.minMs = opts.minMs ?? 0;
    this.maxMs = opts.maxMs ?? 900;
  }

  current(): number { return this.ssdMs; }

  update(inhibitSuccess: boolean): number {
    if (inhibitSuccess) this.ssdMs = Math.min(this.maxMs, this.ssdMs + this.stepMs);
    else this.ssdMs = Math.max(this.minMs, this.ssdMs - this.stepMs);
    return this.ssdMs;
  }
}
