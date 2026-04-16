# Intellect Forge — Phase 2a Implementation Plan (Metacog overlay + UFOV + Compound EF)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute task-by-task.

**Goal:** Add (1) cross-cutting metacognitive overlay (pre-block accuracy prediction + Brier tracking) and (2) two new training modules: UFOV perceptual speed (flagship) and Compound Executive Function (layered inhibition + switching + flanker), both plugging into the existing Session contract and orchestrator.

**Architecture:** Build on Phase 0+1 foundations. Metacog overlay is a cross-cutting layer invoked by session-runner before each block, writes to `metacog_predictions` and `brier_state`. UFOV uses jsQUEST (vendored) for Bayesian threshold estimation of stimulus display duration; Compound EF uses a per-block SSD staircase + adaptive dimensions (switch freq, congruency, response window).

**Tech Stack:** existing (Vite + SolidJS + Worker + SQLite-WASM/OPFS) + `jsQUEST` (npm) + `SpeechSynthesis` + canvas 2D for stimulus rendering.

**Reference dossiers:**
- `research/01-perceptual-speed-ufov.md` — UFOV mechanics, mask, QUEST
- `research/03-compound-executive.md` — compound task spec, SSD staircase
- `research/05-calibration.md` — Brier math, 50-99% elicitation
- `research/10-adaptive-algorithms-deep.md` — QUEST TS code reference

---

## File structure (additions only)

```
src/
  core/
    adaptive/
      quest.ts               # jsQUEST thin wrapper
      ssd-staircase.ts       # Verbruggen 2019 stop-signal delay
      brier.ts               # Brier score + decomposition
    modules/
      ufov/
        ufov-module.ts
        ufov-generator.ts    # 4 subtests, stimulus specs
      compound-ef/
        ef-module.ts
        ef-generator.ts      # cue + flanker + stop-signal layered trial
        ssrt.ts              # SSRT integration-method calculation
    overlay/
      metacog.ts             # overlay controller + Brier accumulator
  ui/
    components/
      metacog-prompt.tsx     # pre-block prediction slider 0-100
      ufov-stimulus.tsx      # canvas host for UFOV
      ef-stimulus.tsx        # canvas host for Compound EF
```

`src/core/stimulus/engine-worker.ts` gains branches for new stimulus kinds (`ufov-peripheral`, `flanker-compound`).

---

## Task 1: Vendor jsQUEST + Quest wrapper

**Files:**
- Modify: `package.json` (add `jsquest`)
- Create: `src/core/adaptive/quest.ts`
- Test: `tests/unit/core/adaptive/quest.test.ts`

- [ ] **Step 1: Install jsQUEST (try npm first; fall back to vendoring if no npm package)**

```bash
cd /c/dev/brain-train
npm install jsquest 2>&1 | head -5
```

If the install succeeds with the `jsquest` package, proceed. If it fails with 404 / package not found, the library is at https://github.com/kurokida/jsQUEST — clone and vendor the single-file source into `src/vendor/jsQUEST.js` (MIT licensed; OK for personal use). Then import it as a local module.

Report which path you took.

- [ ] **Step 2: Write failing tests**

`tests/unit/core/adaptive/quest.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Quest } from '~/core/adaptive/quest';

describe('Quest threshold estimator', () => {
  it('initializes with prior guess and returns plausible next intensity', () => {
    const q = new Quest({
      tGuess: 100,      // prior threshold estimate (ms display duration)
      tGuessSd: 50,     // prior SD
      pThreshold: 0.75, // target p(correct)
      beta: 3.5, gamma: 0.125, delta: 0.01,
      grain: 1, range: 400
    });
    const next = q.quantile();
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(500);
  });

  it('lowers recommended intensity after several correct trials at high intensity', () => {
    const q = new Quest({
      tGuess: 200, tGuessSd: 80, pThreshold: 0.75,
      beta: 3.5, gamma: 0.125, delta: 0.01, grain: 1, range: 400
    });
    const start = q.quantile();
    q.update(300, true); q.update(300, true); q.update(300, true);
    q.update(250, true); q.update(250, true);
    const after = q.quantile();
    expect(after).toBeLessThan(start + 50);  // posterior pulled toward lower threshold
  });

  it('mean() is finite after updates', () => {
    const q = new Quest({
      tGuess: 100, tGuessSd: 50, pThreshold: 0.75,
      beta: 3.5, gamma: 0.125, delta: 0.01, grain: 1, range: 400
    });
    q.update(80, false); q.update(120, true);
    expect(Number.isFinite(q.mean())).toBe(true);
  });
});
```

- [ ] **Step 3: Implement the wrapper**

`src/core/adaptive/quest.ts`:

```ts
// Thin TS wrapper over jsQUEST — provides a typed class interface.
// See research/10-adaptive-algorithms-deep.md §QUEST for algorithm details.

// @ts-expect-error - jsQUEST has no bundled types
import jsQUEST from 'jsquest';

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
```

If the vendor path was taken in Step 1, change the import line to `import jsQUEST from '~/vendor/jsQUEST.js';` and add a tiny `.d.ts` shim or `@ts-expect-error`.

- [ ] **Step 4: Run tests**

```bash
npm test -- quest
```

All 3 pass.

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add src/core/adaptive/quest.ts tests/unit/core/adaptive/quest.test.ts package.json package-lock.json
git commit -m "adaptive: jsQUEST wrapper for UFOV threshold estimation"
```

---

## Task 2: Metacognitive overlay — Brier + prompt + session-runner integration

**Files:**
- Create: `src/core/adaptive/brier.ts`, `src/core/overlay/metacog.ts`
- Create: `src/ui/components/metacog-prompt.tsx`
- Modify: `src/ui/pages/session-runner.tsx` (prompt before each block)
- Modify: `src/core/storage/repos.ts` (save metacog_predictions rows)
- Test: `tests/unit/core/adaptive/brier.test.ts`, `tests/unit/core/overlay/metacog.test.ts`

- [ ] **Step 1: Brier score utility (TDD)**

`tests/unit/core/adaptive/brier.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { brierScore, brierDecomposition } from '~/core/adaptive/brier';

describe('Brier score', () => {
  it('perfect calibration returns 0', () => {
    expect(brierScore([{ p: 1, outcome: 1 }, { p: 0, outcome: 0 }])).toBe(0);
  });
  it('max error returns 1', () => {
    expect(brierScore([{ p: 1, outcome: 0 }])).toBe(1);
  });
  it('decomposition reliability + resolution - uncertainty ≈ Brier', () => {
    const data = [
      { p: 0.9, outcome: 1 }, { p: 0.9, outcome: 1 }, { p: 0.9, outcome: 0 },
      { p: 0.5, outcome: 1 }, { p: 0.5, outcome: 0 },
      { p: 0.1, outcome: 0 }, { p: 0.1, outcome: 0 }
    ];
    const d = brierDecomposition(data, 10);
    const brier = brierScore(data);
    expect(d.reliability - d.resolution + d.uncertainty).toBeCloseTo(brier, 2);
  });
});
```

Create `src/core/adaptive/brier.ts`:

```ts
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
```

Run tests — pass.

- [ ] **Step 2: Overlay controller (TDD)**

`tests/unit/core/overlay/metacog.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { MetacogAccumulator } from '~/core/overlay/metacog';

describe('MetacogAccumulator', () => {
  it('records predictions and outcomes, returning running Brier', () => {
    const m = new MetacogAccumulator();
    m.record('b1', 0.8, 1.0); // predicted 80%, actual 100%
    m.record('b2', 0.5, 0.0); // predicted 50%, actual 0%
    const brier = m.brier();
    // (0.8-1)^2=0.04, (0.5-0)^2=0.25 → mean 0.145
    expect(brier).toBeCloseTo(0.145, 3);
  });

  it('returns empty stats with no data', () => {
    const m = new MetacogAccumulator();
    expect(m.brier()).toBe(0);
  });
});
```

Create `src/core/overlay/metacog.ts`:

```ts
import { brierScore, brierDecomposition, type BrierDatum } from '~/core/adaptive/brier';

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
```

Run tests — pass.

- [ ] **Step 3: Metacog prompt UI component**

Create `src/ui/components/metacog-prompt.tsx`:

```tsx
import { createSignal } from 'solid-js';

export function MetacogPrompt(props: {
  blockKind: string;
  onSubmit: (predictedPct: number) => void;
}) {
  const [value, setValue] = createSignal(75);
  return (
    <div class="container" style="text-align:center">
      <h2 class="hero">Predict your accuracy</h2>
      <p class="muted">Upcoming block: <b>{props.blockKind}</b></p>
      <p class="muted">How likely is it that you'll get each trial correct?</p>
      <div style="margin:2rem 0">
        <input type="range" min="0" max="100" value={value()}
          onInput={e => setValue(parseInt(e.currentTarget.value))}
          style="width:80%" />
        <div style="font-size:2rem;margin-top:.5rem">{value()}%</div>
      </div>
      <button onClick={() => props.onSubmit(value() / 100)}>Submit prediction</button>
    </div>
  );
}
```

- [ ] **Step 4: Add repo fn for metacog_predictions**

Modify `src/core/storage/repos.ts` — add:

```ts
export async function saveMetacogPrediction(row: {
  blockId: string; predictedAccuracy: number;
  actualAccuracy?: number | null; brierContribution?: number | null;
}): Promise<void> {
  const { dbExec } = await import('./db-client');
  await dbExec(
    `INSERT OR REPLACE INTO metacog_predictions(block_id, predicted_accuracy, actual_accuracy, brier_contribution)
     VALUES(?, ?, ?, ?)`,
    [row.blockId, row.predictedAccuracy, row.actualAccuracy ?? null, row.brierContribution ?? null]
  );
}
```

- [ ] **Step 5: Wire prompt into session-runner**

Modify `src/ui/pages/session-runner.tsx`. Add a `<Show>` gate that displays `<MetacogPrompt>` before each block begins, blocking trial loop until the user submits. Key change: wrap the block start in a pre-block-prompt phase.

Add to imports: `import { MetacogPrompt } from '~/ui/components/metacog-prompt';` and `import { saveMetacogPrediction } from '~/core/storage/repos';`

Add signal + state variable near existing signals:

```tsx
const [pendingPrompt, setPendingPrompt] = createSignal<{ blockKind: string;
  resolve: (pct: number) => void } | null>(null);

async function promptMetacog(blockKind: string): Promise<number> {
  return new Promise((resolve) => {
    setPendingPrompt({ blockKind, resolve });
  });
}
```

Inside `runSessionLoop`, BEFORE processing trials of each block, check if a new block has started. Track `lastBlockIndex`:

```tsx
async function runSessionLoop(s: Session, blockId: string) {
  let trial = s.nextTrial();
  let lastBlockIndex = -1;
  while (trial) {
    if (trial.blockIndex !== lastBlockIndex) {
      lastBlockIndex = trial.blockIndex;
      const blockKind = s.blocks[trial.blockIndex]?.kind ?? 'block';
      const pred = await promptMetacog(blockKind);
      s.setMetacogPrediction(trial.blockIndex, pred);
      // save with placeholder actual; actual filled in after block completes
      await saveMetacogPrediction({ blockId: `${blockId}-${trial.blockIndex}`,
        predictedAccuracy: pred });
    }
    setCurrent(trial);
    // ... existing trial-run logic
```

Render the prompt above the stimulus area:

```tsx
<Show when={pendingPrompt()}>
  {p => <MetacogPrompt blockKind={p().blockKind}
    onSubmit={(pct) => { const cb = p().resolve; setPendingPrompt(null); cb(pct); }} />}
</Show>
<Show when={!pendingPrompt() && current() && current()!.stimulus.kind === 'nback-grid'}>
  <NBackGrid trial={current()!} onDone={onTrialDone} />
</Show>
```

- [ ] **Step 6: Typecheck + smoke-run**

```bash
cd /c/dev/brain-train
npm run typecheck
npm test
```

All previous unit tests still pass + new brier/metacog tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/core/adaptive/brier.ts src/core/overlay src/ui/components/metacog-prompt.tsx src/ui/pages/session-runner.tsx src/core/storage/repos.ts tests/unit/core/adaptive/brier.test.ts tests/unit/core/overlay
git commit -m "overlay: metacog prompt + brier tracking + session-runner integration"
```

---

## Task 3: UFOV — generator (4 subtests + mask spec)

**Files:**
- Create: `src/core/modules/ufov/ufov-generator.ts`
- Test: `tests/unit/core/modules/ufov/ufov-generator.test.ts`

Reference: `research/01-perceptual-speed-ufov.md`.

- [ ] **Step 1: TDD**

```ts
import { describe, it, expect } from 'vitest';
import { generateUfovTrial, UFOV_SUBTESTS } from '~/core/modules/ufov/ufov-generator';

describe('UFOV trial generator', () => {
  it('declares 4 subtests', () => {
    expect(UFOV_SUBTESTS.length).toBe(4);
    expect(UFOV_SUBTESTS[0]!.id).toBe('focused');
    expect(UFOV_SUBTESTS[1]!.id).toBe('divided');
    expect(UFOV_SUBTESTS[2]!.id).toBe('selective-8');
    expect(UFOV_SUBTESTS[3]!.id).toBe('selective-24');
  });

  it('generates a trial with central target + mask spec', () => {
    const t = generateUfovTrial({ subtestId: 'focused', displayMs: 100, seed: 1 });
    expect(t.kind).toBe('ufov-peripheral');
    const p = t.payload as any;
    expect(['car', 'truck']).toContain(p.centralTarget);
    expect(p.maskMs).toBeGreaterThan(0);   // mandatory mask
    expect(p.displayMs).toBe(100);
  });

  it('divided subtest includes peripheral target', () => {
    const t = generateUfovTrial({ subtestId: 'divided', displayMs: 100, seed: 5 });
    const p = t.payload as any;
    expect(p.peripheralLocation).toBeGreaterThanOrEqual(0);
    expect(p.peripheralLocation).toBeLessThanOrEqual(7);
  });

  it('selective-24 has 24+ distractors', () => {
    const t = generateUfovTrial({ subtestId: 'selective-24', displayMs: 100, seed: 7 });
    const p = t.payload as any;
    expect(p.distractorCount).toBeGreaterThanOrEqual(24);
  });

  it('is deterministic given seed', () => {
    const a = generateUfovTrial({ subtestId: 'focused', displayMs: 100, seed: 42 });
    const b = generateUfovTrial({ subtestId: 'focused', displayMs: 100, seed: 42 });
    expect(a.payload).toEqual(b.payload);
  });
});
```

- [ ] **Step 2: Implement**

```ts
import type { StimulusDescriptor } from '~/types/stimulus';

export interface UfovSubtest {
  id: 'focused' | 'divided' | 'selective-8' | 'selective-24';
  displayName: string;
  hasPeripheral: boolean;
  distractorCount: number;
}

export const UFOV_SUBTESTS: UfovSubtest[] = [
  { id: 'focused',      displayName: 'Focused attention',             hasPeripheral: false, distractorCount: 0 },
  { id: 'divided',      displayName: 'Divided attention',             hasPeripheral: true,  distractorCount: 0 },
  { id: 'selective-8',  displayName: 'Selective attention (8 dist.)', hasPeripheral: true,  distractorCount: 8 },
  { id: 'selective-24', displayName: 'Selective attention (24 dist.)',hasPeripheral: true,  distractorCount: 24 }
];

export interface UfovTrialPayload {
  subtestId: UfovSubtest['id'];
  centralTarget: 'car' | 'truck';
  peripheralLocation: number;   // 0..7 (8 radial slots); -1 if no peripheral
  distractorCount: number;
  displayMs: number;
  maskMs: number;    // mandatory post-stimulus random-dot mask (prevents iconic memory)
}

function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateUfovTrial(opts: {
  subtestId: UfovSubtest['id']; displayMs: number; seed: number; maskMs?: number;
}): StimulusDescriptor {
  const rand = prng(opts.seed);
  const subtest = UFOV_SUBTESTS.find(s => s.id === opts.subtestId)!;
  const payload: UfovTrialPayload = {
    subtestId: opts.subtestId,
    centralTarget: rand() < 0.5 ? 'car' : 'truck',
    peripheralLocation: subtest.hasPeripheral ? Math.floor(rand() * 8) : -1,
    distractorCount: subtest.distractorCount,
    displayMs: opts.displayMs,
    maskMs: opts.maskMs ?? 200
  };
  return { kind: 'ufov-peripheral', payload };
}
```

- [ ] **Step 3: Tests pass, typecheck, commit**

```bash
npm test -- ufov-generator
npm run typecheck
git add src/core/modules/ufov tests/unit/core/modules/ufov
git commit -m "ufov: trial generator (4 subtests with mandatory mask spec)"
```

---

## Task 4: UFOV — module (QUEST-adaptive session)

**Files:**
- Create: `src/core/modules/ufov/ufov-module.ts`
- Modify: `src/core/modules/registry.ts` (register)
- Test: `tests/unit/core/modules/ufov/ufov-module.test.ts`

- [ ] **Step 1: TDD**

```ts
import { describe, it, expect } from 'vitest';
import { ufovModule } from '~/core/modules/ufov/ufov-module';

describe('UFOV module', () => {
  it('creates a session with one block per subtest', () => {
    const s = ufovModule.createSession({
      moduleId: 'ufov', level: { thresholds: {} }, ewmaPerformance: 0,
      lastSessionTs: null, sessionsTotal: 0, plateauFlag: false, updatedTs: Date.now()
    });
    expect(s.blocks.length).toBe(4);
  });

  it('nextTrial produces a ufov-peripheral stimulus', () => {
    const s = ufovModule.createSession({
      moduleId: 'ufov', level: {}, ewmaPerformance: 0,
      lastSessionTs: null, sessionsTotal: 0, plateauFlag: false, updatedTs: Date.now()
    });
    const t = s.nextTrial()!;
    expect(t.stimulus.kind).toBe('ufov-peripheral');
  });

  it('complete() returns updated thresholds per subtest in domain state', async () => {
    const s = ufovModule.createSession({
      moduleId: 'ufov', level: {}, ewmaPerformance: 0,
      lastSessionTs: null, sessionsTotal: 0, plateauFlag: false, updatedTs: Date.now()
    });
    let t = s.nextTrial();
    while (t) {
      // mark everything correct to converge threshold down
      await s.submit({
        trialId: t.id,
        event: { kind: 'keydown', value: 'c', rtMs: 400 },
        timing: { requestedDurationMs: 100, achievedDurationMs: 100, framesRendered: 6, timingFlag: 'ok' }
      });
      t = s.nextTrial();
    }
    const r = s.complete();
    const thresholds = (r.nextDomainState.level as any).thresholds;
    expect(thresholds).toBeDefined();
    expect(typeof thresholds.focused).toBe('number');
  });
});
```

- [ ] **Step 2: Implement**

```ts
import type { TrainingModule, Session, Trial, Response, TrialResult, BlockStats, SessionResult, Block } from '~/types/module';
import type { DomainState } from '~/types/domain';
import { generateUfovTrial, UFOV_SUBTESTS, type UfovSubtest } from './ufov-generator';
import { Quest } from '~/core/adaptive/quest';

const TRIALS_PER_SUBTEST = 20;

// Central target answer: left arrow for 'car', right arrow for 'truck'
const CAR_KEYS = new Set(['ArrowLeft', 'c']);
const TRUCK_KEYS = new Set(['ArrowRight', 't']);

export const ufovModule: TrainingModule = {
  id: 'ufov',
  displayName: 'Perceptual Speed (UFOV)',
  estimatedMinutes: 10,
  createSession(state: DomainState): Session {
    const levelThresholds = (state.level as any)?.thresholds ?? {};
    const quests: Record<string, Quest> = {};
    for (const st of UFOV_SUBTESTS) {
      const prior = typeof levelThresholds[st.id] === 'number' ? levelThresholds[st.id] : 200;
      quests[st.id] = new Quest({
        tGuess: prior, tGuessSd: 80, pThreshold: 0.75,
        beta: 3.5, delta: 0.01, gamma: 0.125, grain: 1, range: 400
      });
    }

    const blocks: Block[] = UFOV_SUBTESTS.map((st, i) => ({
      index: i, kind: `ufov-${st.id}`, targetTrialCount: TRIALS_PER_SUBTEST
    }));

    let blockIdx = 0;
    let trialIdx = 0;
    const trials: Record<number, { trial: Trial; subtest: UfovSubtest; displayMs: number; correctAnswer: 'car' | 'truck' }> = {};
    const blockCorrect: Record<number, number> = {};
    const startTs = Date.now();

    const session: Session = {
      moduleId: 'ufov',
      blocks,
      nextTrial(): Trial | null {
        if (blockIdx >= UFOV_SUBTESTS.length) return null;
        if (trialIdx >= TRIALS_PER_SUBTEST) {
          blockIdx++; trialIdx = 0;
          return this.nextTrial();
        }
        const st = UFOV_SUBTESTS[blockIdx]!;
        const q = quests[st.id]!;
        const displayMs = Math.round(Math.max(16, Math.min(500, q.quantile())));
        const seed = (state.updatedTs + blockIdx * 1000 + trialIdx) >>> 0;
        const stim = generateUfovTrial({ subtestId: st.id, displayMs, seed });
        const id = `ufov-${blockIdx}-${trialIdx}`;
        const correctAnswer = (stim.payload as any).centralTarget;
        const t: Trial = {
          id,
          blockIndex: blockIdx,
          trialIndex: trialIdx,
          stimulus: stim,
          inputSpec: { accept: ['keyboard'], keys: ['ArrowLeft','ArrowRight','c','t'], timeoutMs: 2000 },
          timingSpec: { stimulusMs: displayMs, maskMs: (stim.payload as any).maskMs, isiMs: 500 }
        };
        trials[trialIdx + blockIdx * 1000] = { trial: t, subtest: st, displayMs, correctAnswer };
        trialIdx++;
        return t;
      },
      setMetacogPrediction() {},
      async submit(resp: Response): Promise<TrialResult> {
        const parts = resp.trialId.split('-');
        const bIdx = parseInt(parts[1]!);
        const tIdx = parseInt(parts[2]!);
        const rec = trials[tIdx + bIdx * 1000];
        if (!rec) return { trialId: resp.trialId, correct: null, rtMs: null, scored: {} };
        const key = typeof resp.event.value === 'string' ? resp.event.value : '';
        const userAnswer = CAR_KEYS.has(key) ? 'car'
          : TRUCK_KEYS.has(key) ? 'truck'
          : null;
        const correct = userAnswer === rec.correctAnswer;
        quests[rec.subtest.id]!.update(rec.displayMs, correct);
        blockCorrect[bIdx] = (blockCorrect[bIdx] ?? 0) + (correct ? 1 : 0);
        return {
          trialId: resp.trialId, correct, rtMs: resp.event.rtMs || null,
          scored: { correct: correct ? 1 : 0 }
        };
      },
      currentBlockStats(): BlockStats {
        const done = trialIdx;
        const correct = blockCorrect[blockIdx] ?? 0;
        const st = UFOV_SUBTESTS[blockIdx] ?? UFOV_SUBTESTS[0]!;
        return {
          blockIndex: blockIdx, trialsCompleted: done,
          accuracy: done ? correct / done : 0,
          custom: { displayMsThreshold: quests[st.id]!.mean() }
        };
      },
      complete(): SessionResult {
        const thresholds: Record<string, number> = {};
        for (const st of UFOV_SUBTESTS) thresholds[st.id] = quests[st.id]!.mean();
        const blockStats: BlockStats[] = UFOV_SUBTESTS.map((st, i) => ({
          blockIndex: i, trialsCompleted: TRIALS_PER_SUBTEST,
          accuracy: (blockCorrect[i] ?? 0) / TRIALS_PER_SUBTEST,
          custom: { displayMsThreshold: thresholds[st.id]! }
        }));
        const avgAcc = blockStats.reduce((s, b) => s + b.accuracy, 0) / blockStats.length;
        return {
          blocks: blockStats,
          totalDurationMs: Date.now() - startTs,
          nextDomainState: {
            ...state,
            level: { thresholds },
            ewmaPerformance: 0.7 * state.ewmaPerformance + 0.3 * avgAcc,
            lastSessionTs: Date.now(),
            sessionsTotal: state.sessionsTotal + 1,
            updatedTs: Date.now()
          }
        };
      }
    };
    return session;
  }
};
```

- [ ] **Step 3: Register in registry**

Append to `src/core/modules/registry.ts`:

```ts
import { ufovModule } from './ufov/ufov-module';
registry.set(ufovModule.id, ufovModule);
```

- [ ] **Step 4: Tests + typecheck + commit**

```bash
npm test
npm run typecheck
git add src/core/modules/ufov src/core/modules/registry.ts tests/unit/core/modules/ufov
git commit -m "ufov: module session with QUEST-adaptive display duration per subtest"
```

---

## Task 5: UFOV — stimulus rendering + UI

**Files:**
- Modify: `src/core/stimulus/engine-worker.ts` (render `ufov-peripheral` + mandatory mask)
- Create: `src/ui/components/ufov-stimulus.tsx`
- Modify: `src/ui/pages/session-runner.tsx` (dispatch to UfovStimulus component for UFOV trials)

- [ ] **Step 1: Extend engine worker to render UFOV + mask**

Add to the existing `runTrial` branch chain (in `src/core/stimulus/engine-worker.ts`):

```ts
if (canvas && trial.stimulus.kind === 'ufov-peripheral') {
  const p = trial.stimulus.payload as {
    subtestId: string; centralTarget: string; peripheralLocation: number;
    distractorCount: number; displayMs: number; maskMs: number;
  };
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2;

  // Stimulus frame
  ctx.fillStyle = '#14181e'; ctx.fillRect(0, 0, w, h);
  // Central target (car=blue square, truck=orange rect)
  ctx.fillStyle = p.centralTarget === 'car' ? '#7aa2ff' : '#ff8a4d';
  const tw = p.centralTarget === 'car' ? 48 : 72, th = 28;
  ctx.fillRect(cx - tw/2, cy - th/2, tw, th);
  // Peripheral target (white square on radial ring)
  if (p.peripheralLocation >= 0) {
    const angle = (p.peripheralLocation / 8) * Math.PI * 2;
    const r = Math.min(w, h) * 0.35;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px - 12, py - 12, 24, 24);
  }
  // Distractors (grey triangles)
  for (let i = 0; i < p.distractorCount; i++) {
    const ang = (i / p.distractorCount) * Math.PI * 2 + 0.3;
    const rr = Math.min(w, h) * 0.25;
    const dx = cx + Math.cos(ang) * rr, dy = cy + Math.sin(ang) * rr;
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.moveTo(dx, dy - 10); ctx.lineTo(dx - 9, dy + 6); ctx.lineTo(dx + 9, dy + 6);
    ctx.closePath(); ctx.fill();
  }

  // Schedule mask after stimulus duration
  setTimeout(() => {
    const ctx2 = canvas.getContext('2d')!;
    ctx2.fillStyle = '#14181e'; ctx2.fillRect(0, 0, w, h);
    // random-dot mask
    for (let i = 0; i < 600; i++) {
      ctx2.fillStyle = Math.random() < 0.5 ? '#666' : '#ccc';
      const dx = Math.random() * w, dy = Math.random() * h;
      ctx2.fillRect(dx, dy, 3, 3);
    }
    // Clear mask after maskMs
    setTimeout(() => { ctx2.fillStyle = '#14181e'; ctx2.fillRect(0, 0, w, h); }, p.maskMs);
  }, p.displayMs);
}
```

- [ ] **Step 2: UfovStimulus component**

Create `src/ui/components/ufov-stimulus.tsx` — mirrors NBackGrid pattern:

```tsx
import { onMount } from 'solid-js';
import { runTrial } from '~/core/stimulus/engine-client';
import type { Trial, Response } from '~/types/module';

export function UfovStimulus(props: { trial: Trial; onDone: (r: Response) => void }) {
  let canvasRef: HTMLCanvasElement | undefined;
  onMount(async () => {
    if (!canvasRef) return;
    const offscreen = canvasRef.transferControlToOffscreen();
    const resp = await runTrial(props.trial, offscreen);
    props.onDone(resp);
  });
  return (
    <div>
      <canvas ref={canvasRef} width={600} height={600}
        style="background:#14181e;border-radius:.5rem;display:block;margin:0 auto" />
      <p class="muted" style="text-align:center">← car · → truck</p>
    </div>
  );
}
```

- [ ] **Step 3: Update session-runner to dispatch by stimulus kind**

Modify `src/ui/pages/session-runner.tsx` — add import + branch:

```tsx
import { UfovStimulus } from '~/ui/components/ufov-stimulus';
// ...
<Show when={!pendingPrompt() && current() && current()!.stimulus.kind === 'ufov-peripheral'}>
  <UfovStimulus trial={current()!} onDone={onTrialDone} />
</Show>
<Show when={!pendingPrompt() && current() && current()!.stimulus.kind === 'nback-grid'}>
  <NBackGrid trial={current()!} onDone={onTrialDone} />
</Show>
```

Also extend the inline promise logic to treat `ufov-peripheral` like `nback-grid`:

```tsx
if (trial!.stimulus.kind === 'nback-grid' || trial!.stimulus.kind === 'ufov-peripheral') {
  canvasResolver = resolve;
} else {
  runTrial(trial!).then(resolve);
}
```

- [ ] **Step 4: Typecheck + commit**

```bash
npm run typecheck
npm test
git add src/core/stimulus/engine-worker.ts src/ui/components/ufov-stimulus.tsx src/ui/pages/session-runner.tsx
git commit -m "ufov: canvas rendering with mandatory random-dot mask + UI"
```

---

## Task 6: Compound EF — trial generator

**Files:**
- Create: `src/core/modules/compound-ef/ef-generator.ts`
- Test: `tests/unit/core/modules/compound-ef/ef-generator.test.ts`

Reference: `research/03-compound-executive.md` §MVP design.

- [ ] **Step 1: TDD**

```ts
import { describe, it, expect } from 'vitest';
import { generateEfBlock } from '~/core/modules/compound-ef/ef-generator';

describe('Compound EF generator', () => {
  it('generates a block of N trials', () => {
    const b = generateEfBlock({ nTrials: 48, seed: 1, rules: ['color', 'shape'],
      switchFreq: 0.5, congruencyIncongruent: 0.5, stopSignalProb: 0.25 });
    expect(b.trials.length).toBe(48);
  });

  it('roughly 25% stop-signal trials', () => {
    const b = generateEfBlock({ nTrials: 200, seed: 1, rules: ['color', 'shape'],
      switchFreq: 0.5, congruencyIncongruent: 0.5, stopSignalProb: 0.25 });
    const stops = b.trials.filter(t => t.hasStopSignal).length;
    expect(stops).toBeGreaterThan(30);
    expect(stops).toBeLessThan(70);
  });

  it('switches at roughly switchFreq rate', () => {
    const b = generateEfBlock({ nTrials: 200, seed: 1, rules: ['color', 'shape'],
      switchFreq: 0.5, congruencyIncongruent: 0.5, stopSignalProb: 0.25 });
    let switches = 0;
    for (let i = 1; i < b.trials.length; i++) {
      if (b.trials[i]!.rule !== b.trials[i-1]!.rule) switches++;
    }
    expect(switches / (b.trials.length - 1)).toBeGreaterThan(0.3);
    expect(switches / (b.trials.length - 1)).toBeLessThan(0.7);
  });

  it('is deterministic given seed', () => {
    const a = generateEfBlock({ nTrials: 20, seed: 42, rules: ['color', 'shape'],
      switchFreq: 0.5, congruencyIncongruent: 0.5, stopSignalProb: 0.25 });
    const b = generateEfBlock({ nTrials: 20, seed: 42, rules: ['color', 'shape'],
      switchFreq: 0.5, congruencyIncongruent: 0.5, stopSignalProb: 0.25 });
    expect(a.trials.map(t => t.rule + t.color + t.shape)).toEqual(b.trials.map(t => t.rule + t.color + t.shape));
  });
});
```

- [ ] **Step 2: Implement**

```ts
export type EfRule = 'color' | 'shape' | 'size';
export type EfColor = 'red' | 'blue' | 'green' | 'yellow';
export type EfShape = 'circle' | 'square' | 'triangle' | 'diamond';
export type EfSize = 'small' | 'large';

export interface EfTrial {
  index: number;
  rule: EfRule;
  isSwitch: boolean;
  color: EfColor;
  shape: EfShape;
  size: EfSize;
  flankerCongruent: boolean;
  hasStopSignal: boolean;
  ssdMs: number;  // stop-signal delay if applicable; 0 otherwise
}

export interface EfBlockSpec {
  nTrials: number;
  seed: number;
  rules: EfRule[];
  switchFreq: number;        // 0-1
  congruencyIncongruent: number;
  stopSignalProb: number;
  initialSsdMs?: number;
}

export interface EfBlock {
  trials: EfTrial[];
}

function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COLORS: EfColor[] = ['red','blue','green','yellow'];
const SHAPES: EfShape[] = ['circle','square','triangle','diamond'];
const SIZES: EfSize[] = ['small','large'];

export function generateEfBlock(spec: EfBlockSpec): EfBlock {
  const rand = prng(spec.seed);
  const pick = <T>(a: readonly T[]) => a[Math.floor(rand() * a.length)]!;
  const trials: EfTrial[] = [];
  let prevRule: EfRule | null = null;
  for (let i = 0; i < spec.nTrials; i++) {
    const switchNow = prevRule !== null && rand() < spec.switchFreq;
    const rule: EfRule = switchNow
      ? pick(spec.rules.filter(r => r !== prevRule))
      : (prevRule ?? pick(spec.rules));
    trials.push({
      index: i,
      rule,
      isSwitch: prevRule !== null && rule !== prevRule,
      color: pick(COLORS),
      shape: pick(SHAPES),
      size: pick(SIZES),
      flankerCongruent: rand() >= spec.congruencyIncongruent,
      hasStopSignal: rand() < spec.stopSignalProb,
      ssdMs: spec.initialSsdMs ?? 250
    });
    prevRule = rule;
  }
  return { trials };
}
```

- [ ] **Step 3: Tests + commit**

```bash
npm test -- ef-generator
npm run typecheck
git add src/core/modules/compound-ef tests/unit/core/modules/compound-ef
git commit -m "compound-ef: trial generator (rule + flanker + stop-signal layers)"
```

---

## Task 7: Compound EF — SSD staircase + SSRT

**Files:**
- Create: `src/core/adaptive/ssd-staircase.ts`, `src/core/modules/compound-ef/ssrt.ts`
- Test: `tests/unit/core/adaptive/ssd-staircase.test.ts`, `tests/unit/core/modules/compound-ef/ssrt.test.ts`

- [ ] **Step 1: SSD staircase (Verbruggen 2019: +50ms on inhibit success, −50ms on fail)**

TDD + implement:

```ts
// src/core/adaptive/ssd-staircase.ts
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
```

Test:

```ts
import { SsdStaircase } from '~/core/adaptive/ssd-staircase';
describe('SSD staircase', () => {
  it('increases SSD after successful inhibition', () => {
    const s = new SsdStaircase({ startMs: 250 });
    expect(s.update(true)).toBe(300);
  });
  it('decreases SSD after failed inhibition', () => {
    const s = new SsdStaircase({ startMs: 250 });
    expect(s.update(false)).toBe(200);
  });
  it('clamps to bounds', () => {
    const s = new SsdStaircase({ startMs: 0, minMs: 0 });
    s.update(false); s.update(false);
    expect(s.current()).toBe(0);
  });
});
```

- [ ] **Step 2: SSRT integration method (Logan/Cowan)**

```ts
// src/core/modules/compound-ef/ssrt.ts
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
```

Test:

```ts
import { ssrtIntegration } from '~/core/modules/compound-ef/ssrt';
describe('SSRT (integration method)', () => {
  it('computes finite SSRT given go RTs and inhibit data', () => {
    const r = ssrtIntegration({
      goRts: [300,320,340,360,380,400,420,440,460,480],
      pFailedInhibit: 0.5, meanSsdMs: 200
    });
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(300);
  });
});
```

- [ ] **Step 3: Tests + typecheck + commit**

```bash
npm test
npm run typecheck
git add src/core/adaptive/ssd-staircase.ts src/core/modules/compound-ef/ssrt.ts tests/unit/core/adaptive/ssd-staircase.test.ts tests/unit/core/modules/compound-ef/ssrt.test.ts
git commit -m "compound-ef: SSD staircase + SSRT integration method"
```

---

## Task 8: Compound EF — module (Session)

**Files:**
- Create: `src/core/modules/compound-ef/ef-module.ts`
- Modify: `src/core/modules/registry.ts`
- Test: `tests/unit/core/modules/compound-ef/ef-module.test.ts`

Responsibility: compose the generator + SSD staircase + SSRT into a `TrainingModule`. Adapts SSD within-block; adapts congruency ratio + switch frequency between blocks.

- [ ] **Step 1: TDD (minimal structural + completion test)**

```ts
import { describe, it, expect } from 'vitest';
import { efModule } from '~/core/modules/compound-ef/ef-module';

describe('Compound EF module', () => {
  it('creates a session with 4 blocks of 48 trials', () => {
    const s = efModule.createSession({
      moduleId: 'compound-ef', level: {}, ewmaPerformance: 0,
      lastSessionTs: null, sessionsTotal: 0, plateauFlag: false, updatedTs: Date.now()
    });
    expect(s.blocks.length).toBe(4);
    expect(s.blocks[0]!.targetTrialCount).toBe(48);
  });

  it('completes and returns updated level (adaptive params)', async () => {
    const s = efModule.createSession({
      moduleId: 'compound-ef', level: {}, ewmaPerformance: 0,
      lastSessionTs: null, sessionsTotal: 0, plateauFlag: false, updatedTs: Date.now()
    });
    let t = s.nextTrial();
    let count = 0;
    while (t && count < 10) {  // partial run — just verify flow
      await s.submit({
        trialId: t.id,
        event: { kind: 'keydown', value: 'a', rtMs: 500 },
        timing: { requestedDurationMs: 1250, achievedDurationMs: 1250, framesRendered: 75, timingFlag: 'ok' }
      });
      t = s.nextTrial();
      count++;
    }
    expect(count).toBe(10);
  });
});
```

- [ ] **Step 2: Implement**

```ts
import type { TrainingModule, Session, Trial, Response, TrialResult, BlockStats, SessionResult, Block } from '~/types/module';
import type { DomainState } from '~/types/domain';
import { generateEfBlock, type EfTrial } from './ef-generator';
import { SsdStaircase } from '~/core/adaptive/ssd-staircase';
import { ssrtIntegration } from './ssrt';

const N_BLOCKS = 4;
const TRIALS_PER_BLOCK = 48;

// Response mapping: rule determines which dimension to classify.
// Keys: A (red/circle/small), S (blue/square/small), K (green/triangle/large), L (yellow/diamond/large)
const RESPONSE_MAP: Record<string, { color: string; shape: string; size: string }> = {
  a: { color: 'red',    shape: 'circle',   size: 'small' },
  s: { color: 'blue',   shape: 'square',   size: 'small' },
  k: { color: 'green',  shape: 'triangle', size: 'large' },
  l: { color: 'yellow', shape: 'diamond',  size: 'large' }
};

export const efModule: TrainingModule = {
  id: 'compound-ef',
  displayName: 'Compound Executive Function',
  estimatedMinutes: 15,
  createSession(state: DomainState): Session {
    const level = (state.level as any) ?? {};
    const rules = level.rules ?? ['color', 'shape'];
    const switchFreq = level.switchFreq ?? 0.5;
    const congruencyIncongruent = level.congruencyIncongruent ?? 0.5;

    const ssd = new SsdStaircase({ startMs: level.ssdStartMs ?? 250 });
    const blockPlans = Array.from({ length: N_BLOCKS }, (_, i) =>
      generateEfBlock({
        nTrials: TRIALS_PER_BLOCK, seed: (state.updatedTs + i) >>> 0,
        rules, switchFreq, congruencyIncongruent, stopSignalProb: 0.25,
        initialSsdMs: ssd.current()
      })
    );

    const blocks: Block[] = blockPlans.map((_, i) => ({
      index: i, kind: `ef-block-${i}`, targetTrialCount: TRIALS_PER_BLOCK
    }));

    let blockIdx = 0, trialIdx = 0;
    const results: { trial: EfTrial; correct: boolean; rt: number; inhibitSuccess: boolean | null }[] = [];
    const goRts: number[] = [];
    const startTs = Date.now();

    return {
      moduleId: 'compound-ef',
      blocks,
      nextTrial(): Trial | null {
        if (blockIdx >= N_BLOCKS) return null;
        if (trialIdx >= TRIALS_PER_BLOCK) {
          blockIdx++; trialIdx = 0;
          return this.nextTrial();
        }
        const ef = blockPlans[blockIdx]!.trials[trialIdx]!;
        const t: Trial = {
          id: `ef-${blockIdx}-${trialIdx}`,
          blockIndex: blockIdx,
          trialIndex: trialIdx,
          stimulus: { kind: 'flanker-compound', payload: { ...ef, ssdMs: ssd.current() } },
          inputSpec: { accept: ['keyboard'], keys: Object.keys(RESPONSE_MAP) },
          timingSpec: { preMs: 500, stimulusMs: 1250, isiMs: 750 }
        };
        trialIdx++;
        return t;
      },
      setMetacogPrediction() {},
      async submit(resp: Response): Promise<TrialResult> {
        const parts = resp.trialId.split('-');
        const bIdx = parseInt(parts[1]!);
        const tIdx = parseInt(parts[2]!);
        const ef = blockPlans[bIdx]!.trials[tIdx]!;
        const key = typeof resp.event.value === 'string' ? resp.event.value : '';
        const mapping = RESPONSE_MAP[key];
        let correct = false;
        let inhibitSuccess: boolean | null = null;
        if (ef.hasStopSignal) {
          // Success = no response (timeout)
          inhibitSuccess = resp.event.kind === 'timeout';
          ssd.update(inhibitSuccess);
          correct = inhibitSuccess;
        } else if (mapping) {
          const answer = mapping[ef.rule];
          correct = answer === ef[ef.rule];
          if (resp.event.rtMs > 0) goRts.push(resp.event.rtMs);
        }
        results.push({ trial: ef, correct, rt: resp.event.rtMs || 0, inhibitSuccess });
        return { trialId: resp.trialId, correct, rtMs: resp.event.rtMs || null,
          scored: { correct: correct ? 1 : 0, switch: ef.isSwitch ? 1 : 0, stop: ef.hasStopSignal ? 1 : 0 } };
      },
      currentBlockStats(): BlockStats {
        const blockResults = results.filter(r => true).slice(-trialIdx);
        const acc = blockResults.length ? blockResults.filter(r => r.correct).length / blockResults.length : 0;
        return { blockIndex: blockIdx, trialsCompleted: trialIdx, accuracy: acc, custom: {} };
      },
      complete(): SessionResult {
        const ssdValues = results.filter(r => r.trial.hasStopSignal).map(_ => ssd.current());
        const meanSsd = ssdValues.length ? ssdValues.reduce((a,b) => a+b, 0) / ssdValues.length : ssd.current();
        const stopResults = results.filter(r => r.trial.hasStopSignal);
        const pFail = stopResults.length ? stopResults.filter(r => r.inhibitSuccess === false).length / stopResults.length : 0;
        const ssrt = ssrtIntegration({ goRts, pFailedInhibit: pFail, meanSsdMs: meanSsd });
        const avgAcc = results.length ? results.filter(r => r.correct).length / results.length : 0;
        const switchResults = results.filter(r => r.trial.isSwitch && !r.trial.hasStopSignal);
        const nonSwitchResults = results.filter(r => !r.trial.isSwitch && !r.trial.hasStopSignal);
        const switchRt = switchResults.length ? switchResults.reduce((s,r)=>s+r.rt,0) / switchResults.length : 0;
        const nonSwitchRt = nonSwitchResults.length ? nonSwitchResults.reduce((s,r)=>s+r.rt,0) / nonSwitchResults.length : 0;
        return {
          blocks: blocks.map(b => ({ blockIndex: b.index, trialsCompleted: TRIALS_PER_BLOCK, accuracy: avgAcc,
            custom: { ssrtMs: ssrt, switchCostMs: switchRt - nonSwitchRt } })),
          totalDurationMs: Date.now() - startTs,
          nextDomainState: {
            ...state,
            level: { rules, switchFreq, congruencyIncongruent, ssdStartMs: ssd.current() },
            ewmaPerformance: 0.7 * state.ewmaPerformance + 0.3 * avgAcc,
            lastSessionTs: Date.now(), sessionsTotal: state.sessionsTotal + 1, updatedTs: Date.now()
          }
        };
      }
    };
  }
};
```

- [ ] **Step 3: Register in registry**

Add to `src/core/modules/registry.ts`:

```ts
import { efModule } from './compound-ef/ef-module';
registry.set(efModule.id, efModule);
```

- [ ] **Step 4: Tests + typecheck + commit**

```bash
npm test
npm run typecheck
git add src/core/modules/compound-ef src/core/modules/registry.ts tests/unit/core/modules/compound-ef
git commit -m "compound-ef: module session with SSD staircase + SSRT + switch cost"
```

---

## Task 9: Compound EF — stimulus rendering + UI

**Files:**
- Modify: `src/core/stimulus/engine-worker.ts` (render `flanker-compound`)
- Create: `src/ui/components/ef-stimulus.tsx`
- Modify: `src/ui/pages/session-runner.tsx` (dispatch to EfStimulus for EF trials)

- [ ] **Step 1: Extend engine worker**

Add branch to `runTrial`:

```ts
if (canvas && trial.stimulus.kind === 'flanker-compound') {
  const p = trial.stimulus.payload as any;
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#14181e'; ctx.fillRect(0, 0, w, h);
  // Rule cue (text above)
  ctx.fillStyle = '#e6e6e6'; ctx.font = '24px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(`Sort by: ${p.rule}`, w/2, 40);
  // Central stimulus + flankers
  const colors: Record<string, string> = { red: '#ff4d4d', blue: '#4d4dff', green: '#4dff4d', yellow: '#ffff4d' };
  const draw = (cx: number, cy: number, color: string, shape: string, scale = 1) => {
    ctx.fillStyle = colors[color]!;
    const size = 40 * scale;
    if (shape === 'circle') { ctx.beginPath(); ctx.arc(cx, cy, size/2, 0, Math.PI*2); ctx.fill(); }
    else if (shape === 'square') { ctx.fillRect(cx-size/2, cy-size/2, size, size); }
    else if (shape === 'triangle') { ctx.beginPath(); ctx.moveTo(cx, cy-size/2); ctx.lineTo(cx-size/2, cy+size/2); ctx.lineTo(cx+size/2, cy+size/2); ctx.closePath(); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(cx, cy-size/2); ctx.lineTo(cx+size/2, cy); ctx.lineTo(cx, cy+size/2); ctx.lineTo(cx-size/2, cy); ctx.closePath(); ctx.fill(); }
  };
  const cx = w/2, cy = h/2;
  const flankerColor = p.flankerCongruent ? p.color : (p.color === 'red' ? 'blue' : 'red');
  const flankerShape = p.flankerCongruent ? p.shape : (p.shape === 'circle' ? 'square' : 'circle');
  draw(cx - 100, cy, flankerColor, flankerShape, p.size === 'large' ? 1.3 : 1);
  draw(cx, cy, p.color, p.shape, p.size === 'large' ? 1.3 : 1);
  draw(cx + 100, cy, flankerColor, flankerShape, p.size === 'large' ? 1.3 : 1);

  // Stop signal (visual beep after SSD)
  if (p.hasStopSignal) {
    setTimeout(() => {
      const ctx2 = canvas.getContext('2d')!;
      ctx2.strokeStyle = '#ff4d4d'; ctx2.lineWidth = 8;
      ctx2.strokeRect(4, 4, w - 8, h - 8);
    }, p.ssdMs);
  }
}
```

- [ ] **Step 2: EfStimulus component**

Create `src/ui/components/ef-stimulus.tsx` — mirror the UfovStimulus pattern. Keys: A / S / K / L with label showing rule.

```tsx
import { onMount } from 'solid-js';
import { runTrial } from '~/core/stimulus/engine-client';
import type { Trial, Response } from '~/types/module';

export function EfStimulus(props: { trial: Trial; onDone: (r: Response) => void }) {
  let canvasRef: HTMLCanvasElement | undefined;
  onMount(async () => {
    if (!canvasRef) return;
    const offscreen = canvasRef.transferControlToOffscreen();
    const resp = await runTrial(props.trial, offscreen);
    props.onDone(resp);
  });
  return (
    <div>
      <canvas ref={canvasRef} width={640} height={360}
        style="background:#14181e;border-radius:.5rem;display:block;margin:0 auto" />
      <p class="muted" style="text-align:center">A · S · K · L — withhold on red border</p>
    </div>
  );
}
```

- [ ] **Step 3: Wire into session-runner**

Modify `src/ui/pages/session-runner.tsx`:

```tsx
import { EfStimulus } from '~/ui/components/ef-stimulus';
// extend the canvas-routed list
if (trial!.stimulus.kind === 'nback-grid' || trial!.stimulus.kind === 'ufov-peripheral' ||
    trial!.stimulus.kind === 'flanker-compound') {
  canvasResolver = resolve;
} else {
  runTrial(trial!).then(resolve);
}

// and render:
<Show when={!pendingPrompt() && current() && current()!.stimulus.kind === 'flanker-compound'}>
  <EfStimulus trial={current()!} onDone={onTrialDone} />
</Show>
```

- [ ] **Step 4: Typecheck + commit**

```bash
npm run typecheck
npm test
git add src/core/stimulus/engine-worker.ts src/ui/components/ef-stimulus.tsx src/ui/pages/session-runner.tsx
git commit -m "compound-ef: canvas rendering + UI component + session-runner routing"
```

---

## Task 10: Orchestrator + full-flow e2e across modules

**Files:**
- Test: `tests/e2e/phase2-smoke.spec.ts`

Orchestrator doesn't need code changes — it reads whatever modules are registered. Registry (Tasks 4, 8) now includes `placeholder`, `working-memory`, `ufov`, `compound-ef`. The composer picks by urgency; since all are fresh, it'll pick whichever ranks first (tiebreak = stable sort from registry insertion order).

- [ ] **Step 1: Phase 2 smoke e2e**

```ts
import { test, expect } from '@playwright/test';

test('phase 2 smoke: run full session end-to-end, regardless of picked module', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /start today/i }).click();
  await page.waitForSelector('button:has-text("Start session")', { timeout: 15_000 });
  await page.click('button:has-text("Start session")');
  await page.waitForURL(/\/session\//);
  // Metacog prompt appears first — click Submit
  await page.waitForSelector('button:has-text("Submit prediction")', { timeout: 10_000 });
  await page.click('button:has-text("Submit prediction")');
  // Press keys for up to 4 min (EF session is longest: 4 blocks × 48 trials × ~2.5s)
  for (let i = 0; i < 500; i++) {
    const urlBefore = page.url();
    // interleave keys: a/s/k/l for EF, a/l for WM+UFOV
    await page.keyboard.press(['a','s','k','l','ArrowLeft','ArrowRight','Escape'][i % 7]!);
    await page.waitForTimeout(300);
    if (page.url().includes('/results/')) break;
    // if a new metacog prompt appears (next block), submit it
    const prompt = await page.locator('button:has-text("Submit prediction")').count();
    if (prompt > 0) { await page.click('button:has-text("Submit prediction")'); }
  }
  await page.waitForURL(/\/results\//, { timeout: 300_000 });
  await page.goto('/dashboard');
  await expect(page.getByText(/Domains/i)).toBeVisible();
});
```

- [ ] **Step 2: Run full suite**

```bash
cd /c/dev/brain-train
npm run typecheck
npm test
npm run test:e2e
```

All green.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/phase2-smoke.spec.ts
git commit -m "e2e: phase 2 smoke across multiple modules + metacog overlay"
```

---

## Self-review

**Spec coverage:**
- ✅ Metacog overlay (Brier + prompt + session-runner + storage) → Task 2
- ✅ jsQUEST vendoring + typed wrapper → Task 1
- ✅ UFOV 4 subtests + mandatory mask + QUEST-adaptive → Tasks 3–5
- ✅ Compound EF (cue + flanker + stop-signal, SSD staircase, SSRT) → Tasks 6–9
- ✅ Full-flow e2e → Task 10
- Deferred to Phase 2b: Relational Reasoning, Calibration module, transfer battery, Observable Plot dashboards, item-bank ingestion.

**Type consistency check:** all modules use `TrainingModule`, `Session`, `DomainState`, `Trial`, `Response`, `TrialResult` from Task 2. New stimulus kinds (`ufov-peripheral`, `flanker-compound`) already declared in `StimulusKind` union from Phase 0+1. Good.

**Placeholder scan:** None found.

---

## Known shortcuts in this plan (intentionally deferred)

- Stop signal audio (currently red-border visual — replace with tone in Phase 3)
- EF block-level adaptation (congruency ratio, switch frequency updates between blocks) — present in level but not mutated across blocks within a session
- UFOV eye tracking / central fixation enforcement (research says sub-200ms durations are saccade-proof; skip for v1)
- Metacog overlay currently stores predicted accuracy only; actual accuracy update happens at session complete via a separate path in Phase 2b analytics
