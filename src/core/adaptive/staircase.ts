export interface StaircaseOptions {
  start: number;
  step: number;
  nDown: number;
  nUp: number;
  min?: number;
  max?: number;
  minStep?: number;
  shrinkAt?: number[];   // reversal counts at which step halves
  logScale?: boolean;
}

export class Staircase {
  current: number;
  step: number;
  reversals: number[] = [];
  history: { value: number; correct: boolean }[] = [];
  private consecCorrect = 0;
  private consecWrong = 0;
  private lastDir: 'up' | 'down' | null = null;
  private readonly opts: StaircaseOptions;

  constructor(options: StaircaseOptions) {
    this.opts = { shrinkAt: [1], ...options };
    this.current = options.start;
    this.step = options.step;
  }

  update(correct: boolean): void {
    this.history.push({ value: this.current, correct });
    if (correct) {
      this.consecCorrect++;
      this.consecWrong = 0;
      if (this.consecCorrect >= this.opts.nDown) {
        this.move('down');
        this.consecCorrect = 0;
      }
    } else {
      this.consecWrong++;
      this.consecCorrect = 0;
      if (this.consecWrong >= this.opts.nUp) {
        this.move('up');
        this.consecWrong = 0;
      }
    }
  }

  private move(dir: 'up' | 'down') {
    if (this.lastDir && this.lastDir !== dir) {
      this.reversals.push(this.current);
      if (this.opts.shrinkAt?.includes(this.reversals.length)) {
        const next = this.step / 2;
        this.step = this.opts.minStep ? Math.max(next, this.opts.minStep) : next;
      }
    }
    const delta = dir === 'down' ? -this.step : this.step;
    const next = this.opts.logScale ? this.current * Math.pow(2, delta / 12) : this.current + delta;
    this.current = this.clamp(next);
    this.lastDir = dir;
  }

  private clamp(x: number): number {
    if (this.opts.min !== undefined) x = Math.max(x, this.opts.min);
    if (this.opts.max !== undefined) x = Math.min(x, this.opts.max);
    return x;
  }

  thresholdEstimate(lastK = 6): number {
    const tail = this.reversals.slice(-lastK);
    if (tail.length === 0) return this.current;
    return tail.reduce((a, b) => a + b, 0) / tail.length;
  }
}
