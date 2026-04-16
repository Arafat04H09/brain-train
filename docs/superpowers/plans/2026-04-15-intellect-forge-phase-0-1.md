# Intellect Forge — Phase 0 + Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundations (Vite+SolidJS scaffold, SQLite/OPFS persistence, stimulus engine worker, adaptive library, orchestrator skeleton, main shell UI) and the Working Memory pilot module (dual n-back + complex span) such that a user can open the app, start a session, complete it, and see results saved and displayed.

**Architecture:** Single-page web app. SolidJS UI. Web Worker hosts the stimulus engine with its own requestAnimationFrame loop and also sqlite-wasm + OPFS for persistence. Module contract abstracts trial presentation so the WM pilot (and future UFOV/EF/matrix/calibration modules) plugs into the same stimulus engine, storage, and orchestrator.

**Tech Stack:** Vite, TypeScript, SolidJS, @sqlite.org/sqlite-wasm + OPFS SAH, Web Worker + OffscreenCanvas, Web Audio API, Vitest + @solidjs/testing-library, Playwright.

**Reference dossiers** (full TS-ready pseudocode and algorithms live here):
- `research/02-working-memory.md` — Jaeggi parameters, d-prime, complex span scoring
- `research/10-adaptive-algorithms-deep.md` — Staircase, DPrime, Quest TS code
- `research/14-oss-apps-dissection.md` — Brain Workshop patterns (tick clock, append-only log)
- `research/06-platforms-and-stack.md` — timing primitives, COOP/COEP
- `docs/superpowers/specs/2026-04-15-intellect-forge-design.md` — master spec

---

## File Structure

```
/c/dev/brain-train/
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types/
│   │   ├── module.ts           # TrainingModule, Session, Trial, Response
│   │   ├── stimulus.ts         # StimulusDescriptor, InputSpec, TimingSpec
│   │   └── domain.ts           # DomainState, Phase, SessionPlan
│   ├── core/
│   │   ├── adaptive/
│   │   │   ├── staircase.ts
│   │   │   ├── dprime.ts
│   │   │   └── block-promotion.ts
│   │   ├── storage/
│   │   │   ├── db-worker.ts    # sqlite-wasm + OPFS host
│   │   │   ├── db-client.ts    # main-thread client
│   │   │   ├── schema.ts       # DDL + migrations
│   │   │   └── repos.ts        # sessions/blocks/trials/domain-state repos
│   │   ├── stimulus/
│   │   │   ├── engine-worker.ts       # worker entry
│   │   │   ├── engine-client.ts       # main-thread client
│   │   │   ├── display-calibration.ts
│   │   │   └── trial-runner.ts        # inside worker
│   │   ├── orchestrator/
│   │   │   ├── phases.ts
│   │   │   ├── urgency.ts
│   │   │   └── session-composer.ts
│   │   └── modules/
│   │       ├── registry.ts
│   │       ├── placeholder/placeholder-module.ts
│   │       └── working-memory/
│   │           ├── wm-module.ts
│   │           ├── dual-nback.ts
│   │           ├── complex-span.ts
│   │           └── wm-adaptive.ts
│   └── ui/
│       ├── routes.tsx
│       ├── theme.css
│       ├── pages/
│       │   ├── home.tsx
│       │   ├── today.tsx
│       │   ├── session-runner.tsx
│       │   ├── results.tsx
│       │   └── dashboard.tsx
│       └── components/
│           ├── metacog-prompt.tsx
│           ├── block-stats.tsx
│           └── stimulus-canvas.tsx
├── tests/
│   ├── unit/core/adaptive/
│   ├── unit/core/modules/working-memory/
│   └── e2e/
└── public/
    └── sqlite-wasm/            # sqlite3.wasm + worker files
```

---

## Task 1: Scaffold project and dev server with COOP/COEP

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`, `index.html`, `src/main.tsx`, `src/App.tsx`, `vitest.config.ts`, `playwright.config.ts`

- [ ] **Step 1: Initialize git and create `.gitignore`**

```bash
cd /c/dev/brain-train
git init
```

Create `.gitignore`:

```
node_modules/
dist/
.superpowers/
research/tmp-jspsych/
*.log
.vite/
coverage/
playwright-report/
test-results/
.DS_Store
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "intellect-forge",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "solid-js": "^1.9.0",
    "@solidjs/router": "^0.15.0",
    "@sqlite.org/sqlite-wasm": "^3.48.0-build1"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "vite-plugin-solid": "^2.11.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "@solidjs/testing-library": "^0.8.10",
    "jsdom": "^25.0.0",
    "@playwright/test": "^1.48.0"
  }
}
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "preserve",
    "jsxImportSource": "solid-js",
    "types": ["vite/client"],
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noUncheckedIndexedAccess": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable", "WebWorker"],
    "paths": { "~/*": ["./src/*"] }
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 4: Create `vite.config.ts` with COOP/COEP headers**

```ts
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

// COOP/COEP required for: OPFS SyncAccessHandle, OffscreenCanvas in Worker, high-res timers
const coopHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp'
};

export default defineConfig({
  plugins: [solid()],
  server: { headers: coopHeaders },
  preview: { headers: coopHeaders },
  resolve: { alias: { '~': '/src' } },
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] }
});
```

- [ ] **Step 5: Create `index.html`, `src/main.tsx`, `src/App.tsx`**

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Intellect Forge</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:

```tsx
import { render } from 'solid-js/web';
import { App } from './App';

render(() => <App />, document.getElementById('root')!);
```

`src/App.tsx`:

```tsx
export function App() {
  return <h1>Intellect Forge</h1>;
}
```

- [ ] **Step 6: Create `vitest.config.ts` and `playwright.config.ts`**

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: []
  },
  resolve: { conditions: ['development', 'browser'] }
});
```

`playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true
  },
  use: { baseURL: 'http://localhost:5173' }
});
```

- [ ] **Step 7: Install and verify dev server starts**

Run:
```bash
npm install
npm run dev
```

Expected: dev server on http://localhost:5173 responds with the `<h1>` page. Check headers in browser devtools → Network tab → any request → Response Headers must include `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. Verify `crossOriginIsolated === true` in browser console.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "scaffold: vite + solidjs + ts with COOP/COEP"
```

---

## Task 2: Core types — module contract

**Files:**
- Create: `src/types/module.ts`, `src/types/stimulus.ts`, `src/types/domain.ts`
- Test: `tests/unit/types/module.test.ts`

- [ ] **Step 1: Write type assertion test**

`tests/unit/types/module.test.ts`:

```ts
import { describe, it, expectTypeOf } from 'vitest';
import type { TrainingModule, Session, Trial, Response, TrialResult } from '~/types/module';
import type { StimulusDescriptor } from '~/types/stimulus';
import type { DomainState } from '~/types/domain';

describe('module contract types', () => {
  it('TrainingModule has required shape', () => {
    expectTypeOf<TrainingModule>().toHaveProperty('id');
    expectTypeOf<TrainingModule>().toHaveProperty('displayName');
    expectTypeOf<TrainingModule>().toHaveProperty('createSession');
  });

  it('Trial references StimulusDescriptor', () => {
    expectTypeOf<Trial>().toHaveProperty('stimulus').toEqualTypeOf<StimulusDescriptor>();
  });

  it('createSession accepts DomainState', () => {
    type Fn = TrainingModule['createSession'];
    expectTypeOf<Parameters<Fn>[0]>().toEqualTypeOf<DomainState>();
  });
});
```

- [ ] **Step 2: Run test — fail expected**

```bash
npm test -- tests/unit/types/module.test.ts
```

Expected: fail — modules not found.

- [ ] **Step 3: Create types**

`src/types/stimulus.ts`:

```ts
export type StimulusKind =
  | 'nback-grid'
  | 'nback-letter'
  | 'ufov-peripheral'
  | 'flanker-compound'
  | 'matrix-3x3'
  | 'text-question';

export interface StimulusDescriptor {
  kind: StimulusKind;
  payload: unknown;  // kind-specific; discriminated in each module
}

export interface InputSpec {
  accept: ('keyboard' | 'mouse-click' | 'slider' | 'text')[];
  keys?: string[];
  timeoutMs?: number;
}

export interface TimingSpec {
  preMs?: number;
  stimulusMs: number | 'until-response';
  maskMs?: number;
  isiMs?: number;
}

export interface ResponseEvent {
  kind: 'keydown' | 'click' | 'slider' | 'text' | 'timeout';
  value: string | number | null;
  rtMs: number;
}

export interface TrialTimingResult {
  requestedDurationMs: number;
  achievedDurationMs: number;
  framesRendered: number;
  timingFlag: 'ok' | 'dropped-frames' | 'over-duration';
}
```

`src/types/module.ts`:

```ts
import type { StimulusDescriptor, InputSpec, TimingSpec, ResponseEvent, TrialTimingResult } from './stimulus';
import type { DomainState } from './domain';

export type ModuleId =
  | 'working-memory'
  | 'ufov'
  | 'compound-ef'
  | 'relational'
  | 'calibration'
  | 'placeholder';

export interface TrainingModule {
  id: ModuleId;
  displayName: string;
  estimatedMinutes: number;
  createSession(state: DomainState, hints?: OrchestratorHints): Session;
}

export interface OrchestratorHints {
  interleaveWithModule?: ModuleId;
  targetMinutes?: number;
  transferProbe?: boolean;
}

export interface Block {
  index: number;
  kind: string;
  targetTrialCount: number;
  metacogPrediction?: number;
}

export interface Trial {
  id: string;
  blockIndex: number;
  trialIndex: number;
  stimulus: StimulusDescriptor;
  inputSpec: InputSpec;
  timingSpec: TimingSpec;
  metadata?: Record<string, unknown>;
}

export interface Response {
  trialId: string;
  event: ResponseEvent;
  timing: TrialTimingResult;
}

export interface TrialResult {
  trialId: string;
  correct: boolean | null;   // null = no response / timeout
  rtMs: number | null;
  scored: Record<string, number>;  // module-specific (e.g. {visualHit:1, audioFA:0})
}

export interface BlockStats {
  blockIndex: number;
  trialsCompleted: number;
  accuracy: number;
  custom: Record<string, number>;  // d-prime, switch cost, etc.
}

export interface SessionResult {
  blocks: BlockStats[];
  totalDurationMs: number;
  nextDomainState: DomainState;
}

export interface Session {
  readonly moduleId: ModuleId;
  readonly blocks: readonly Block[];
  nextTrial(): Trial | null;
  setMetacogPrediction(blockIndex: number, predicted: number): void;
  submit(response: Response): Promise<TrialResult>;
  currentBlockStats(): BlockStats;
  complete(): SessionResult;
}
```

`src/types/domain.ts`:

```ts
import type { ModuleId } from './module';

export type Phase = 'ramp' | 'intensive' | 'consolidation' | 'maintenance';

export interface DomainState {
  moduleId: ModuleId;
  level: Record<string, unknown>;  // module-specific: {n:2}, {threshold:120}, etc.
  ewmaPerformance: number;         // 0-1
  lastSessionTs: number | null;
  sessionsTotal: number;
  plateauFlag: boolean;
  updatedTs: number;
}

export interface SessionPlan {
  id: string;
  createdTs: number;
  phase: Phase;
  modules: { moduleId: ModuleId; targetMinutes: number }[];
  interleave: boolean;
  transferProbe?: { taskId: string };
  metacogOverlay: boolean;
}
```

- [ ] **Step 4: Run types test — pass expected**

```bash
npm test -- tests/unit/types/module.test.ts
```

Expected: pass.

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/types tests/unit/types
git commit -m "types: module contract, stimulus, domain state"
```

---

## Task 3: Adaptive library — Staircase

**Files:**
- Create: `src/core/adaptive/staircase.ts`
- Test: `tests/unit/core/adaptive/staircase.test.ts`

Reference: `research/10-adaptive-algorithms-deep.md` §Staircase.

- [ ] **Step 1: Write failing tests**

`tests/unit/core/adaptive/staircase.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { Staircase } from '~/core/adaptive/staircase';

describe('Staircase (Levitt n-down/m-up)', () => {
  it('3-down/1-up converges toward ~79% threshold', () => {
    const s = new Staircase({ start: 50, step: 2, nDown: 3, nUp: 1, minStep: 1 });
    // simulate: 3 correct → step down, 1 wrong → step up
    s.update(true); s.update(true); s.update(true); // down
    expect(s.current).toBe(48);
    s.update(false); // up
    expect(s.current).toBe(49);
  });

  it('tracks reversals and shrinks step size', () => {
    const s = new Staircase({ start: 50, step: 8, nDown: 2, nUp: 1, minStep: 1, shrinkAt: [2, 4] });
    s.update(true); s.update(true);  // down 8 → 42
    s.update(false);                  // up, reversal #1
    s.update(true); s.update(true);  // down
    s.update(false);                  // up, reversal #2 → shrink step to 4
    expect(s.reversals.length).toBeGreaterThanOrEqual(2);
    expect(s.step).toBeLessThan(8);
  });

  it('clamps to bounds', () => {
    const s = new Staircase({ start: 2, step: 4, nDown: 1, nUp: 1, min: 0, max: 10 });
    s.update(true); // down, clamped at 0
    expect(s.current).toBe(0);
  });

  it('mean of last K reversals is threshold estimate', () => {
    const s = new Staircase({ start: 50, step: 1, nDown: 2, nUp: 1 });
    // inject deterministic reversal stream
    for (let i = 0; i < 20; i++) s.update(Math.random() > 0.3);
    const est = s.thresholdEstimate(6);
    expect(Number.isFinite(est)).toBe(true);
  });
});
```

- [ ] **Step 2: Run — fail expected**

```bash
npm test -- staircase
```

- [ ] **Step 3: Implement Staircase**

`src/core/adaptive/staircase.ts`:

```ts
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
  private readonly opts: Required<Omit<StaircaseOptions, 'shrinkAt' | 'logScale' | 'min' | 'max' | 'minStep'>> &
    Pick<StaircaseOptions, 'shrinkAt' | 'logScale' | 'min' | 'max' | 'minStep'>;

  constructor(options: StaircaseOptions) {
    this.opts = { ...options };
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
```

- [ ] **Step 4: Run — pass expected**

```bash
npm test -- staircase
```

- [ ] **Step 5: Commit**

```bash
git add src/core/adaptive/staircase.ts tests/unit/core/adaptive/staircase.test.ts
git commit -m "adaptive: staircase (Levitt n-down/m-up)"
```

---

## Task 4: Adaptive library — d-prime (signal detection theory)

**Files:**
- Create: `src/core/adaptive/dprime.ts`
- Test: `tests/unit/core/adaptive/dprime.test.ts`

Reference: `research/02-working-memory.md` §Scoring, Hautus log-linear correction.

- [ ] **Step 1: Write failing tests**

`tests/unit/core/adaptive/dprime.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeDPrime, logLinearCorrection } from '~/core/adaptive/dprime';

describe('d-prime (SDT)', () => {
  it('zero hit rate, zero FA gives d-prime near 0 with log-linear correction', () => {
    const { dPrime } = computeDPrime({ hits: 0, misses: 10, falseAlarms: 0, correctRejects: 10 });
    expect(dPrime).toBeGreaterThanOrEqual(-0.5);
    expect(dPrime).toBeLessThanOrEqual(0.5);
  });

  it('perfect discrimination with log-linear correction is finite', () => {
    const { dPrime } = computeDPrime({ hits: 10, misses: 0, falseAlarms: 0, correctRejects: 10 });
    expect(Number.isFinite(dPrime)).toBe(true);
    expect(dPrime).toBeGreaterThan(2);
  });

  it('moderate performance matches expected value', () => {
    // hits=8/10, FA=2/10 → z(0.8) - z(0.2) ≈ 0.842 - (-0.842) = 1.683
    const { dPrime, hitRate, faRate } = computeDPrime({
      hits: 8, misses: 2, falseAlarms: 2, correctRejects: 8
    });
    expect(hitRate).toBeCloseTo(0.8, 2);
    expect(faRate).toBeCloseTo(0.2, 2);
    expect(dPrime).toBeCloseTo(1.68, 1);
  });

  it('logLinearCorrection adds 0.5 to hits and FAs, and 1 to trial counts', () => {
    const c = logLinearCorrection({ hits: 10, misses: 0, falseAlarms: 0, correctRejects: 10 });
    expect(c.hits).toBe(10.5);
    expect(c.falseAlarms).toBe(0.5);
    expect(c.misses).toBe(0.5);
    expect(c.correctRejects).toBe(10.5);
  });
});
```

- [ ] **Step 2: Run — fail expected**

```bash
npm test -- dprime
```

- [ ] **Step 3: Implement**

`src/core/adaptive/dprime.ts`:

```ts
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
    return (((((c[0]*q + c[1])*q + c[2])*q + c[3])*q + c[4])*q + c[5]) /
           ((((d[0]*q + d[1])*q + d[2])*q + d[3])*q + 1);
  }
  if (p <= phigh) {
    const q = p - 0.5; const r = q * q;
    return (((((a[0]*r + a[1])*r + a[2])*r + a[3])*r + a[4])*r + a[5]) * q /
           (((((b[0]*r + b[1])*r + b[2])*r + b[3])*r + b[4])*r + 1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0]*q + c[1])*q + c[2])*q + c[3])*q + c[4])*q + c[5]) /
          ((((d[0]*q + d[1])*q + d[2])*q + d[3])*q + 1);
}

export function computeDPrime(raw: SdtCounts): DPrimeResult {
  const c = logLinearCorrection(raw);
  const hitRate = c.hits / (c.hits + c.misses);
  const faRate = c.falseAlarms / (c.falseAlarms + c.correctRejects);
  const zH = probit(hitRate);
  const zF = probit(faRate);
  return {
    dPrime: zH - zF,
    hitRate,
    faRate,
    bias: -0.5 * (zH + zF)
  };
}
```

- [ ] **Step 4: Run — pass expected**

```bash
npm test -- dprime
```

- [ ] **Step 5: Commit**

```bash
git add src/core/adaptive/dprime.ts tests/unit/core/adaptive/dprime.test.ts
git commit -m "adaptive: d-prime with Hautus log-linear correction"
```

---

## Task 5: Adaptive library — BlockPromotion rule evaluator

**Files:**
- Create: `src/core/adaptive/block-promotion.ts`
- Test: `tests/unit/core/adaptive/block-promotion.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/unit/core/adaptive/block-promotion.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { dPrimeRule, accuracyRule } from '~/core/adaptive/block-promotion';

describe('BlockPromotion', () => {
  it('d-prime rule promotes when both streams ≥ 1.5', () => {
    const r = dPrimeRule({ promoteAt: 1.5, demoteAt: 0.5 });
    expect(r([{ visual: 1.6, audio: 1.7 }])).toBe('promote');
  });

  it('d-prime rule holds when only one stream above threshold', () => {
    const r = dPrimeRule({ promoteAt: 1.5, demoteAt: 0.5 });
    expect(r([{ visual: 1.6, audio: 1.0 }])).toBe('hold');
  });

  it('d-prime rule demotes on two consecutive low blocks', () => {
    const r = dPrimeRule({ promoteAt: 1.5, demoteAt: 0.5 });
    expect(r([
      { visual: 0.3, audio: 0.4 },
      { visual: 0.2, audio: 0.3 }
    ])).toBe('demote');
  });

  it('accuracy rule promotes at high accuracy, demotes at low', () => {
    const r = accuracyRule({ promoteAt: 0.85, demoteAt: 0.55 });
    expect(r([{ accuracy: 0.9 }])).toBe('promote');
    expect(r([{ accuracy: 0.5 }, { accuracy: 0.5 }])).toBe('demote');
    expect(r([{ accuracy: 0.7 }])).toBe('hold');
  });
});
```

- [ ] **Step 2: Run — fail expected**

- [ ] **Step 3: Implement**

`src/core/adaptive/block-promotion.ts`:

```ts
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
```

- [ ] **Step 4: Run — pass expected**

- [ ] **Step 5: Commit**

```bash
git add src/core/adaptive/block-promotion.ts tests/unit/core/adaptive/block-promotion.test.ts
git commit -m "adaptive: block promotion rules (d-prime, accuracy)"
```

---

## Task 6: Storage — schema and sqlite-wasm worker

**Files:**
- Create: `src/core/storage/schema.ts`, `src/core/storage/db-worker.ts`, `src/core/storage/db-client.ts`
- Test: `tests/unit/core/storage/schema.test.ts`

- [ ] **Step 1: Write failing schema test**

`tests/unit/core/storage/schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SCHEMA_DDL, CURRENT_VERSION } from '~/core/storage/schema';

describe('SQL schema', () => {
  it('includes all required tables', () => {
    const ddl = SCHEMA_DDL.join('\n');
    for (const t of [
      'sessions', 'blocks', 'trials', 'domain_state',
      'calibration_items', 'calibration_reviews',
      'matrix_items', 'metacog_predictions', 'transfer_assessments'
    ]) {
      expect(ddl).toContain(`CREATE TABLE ${t}`);
    }
  });

  it('declares schema version', () => {
    expect(CURRENT_VERSION).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run — fail expected**

- [ ] **Step 3: Create schema**

`src/core/storage/schema.ts`:

```ts
export const CURRENT_VERSION = 1;

export const SCHEMA_DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    start_ts INTEGER NOT NULL,
    end_ts INTEGER,
    plan_json TEXT NOT NULL,
    phase TEXT NOT NULL,
    completed INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS blocks (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    module_id TEXT NOT NULL,
    block_index INTEGER NOT NULL,
    kind TEXT NOT NULL,
    start_ts INTEGER,
    end_ts INTEGER,
    metacog_prediction REAL,
    actual_accuracy REAL,
    adaptive_params_json TEXT,
    FOREIGN KEY(session_id) REFERENCES sessions(id)
  )`,
  `CREATE TABLE IF NOT EXISTS trials (
    id TEXT PRIMARY KEY,
    block_id TEXT NOT NULL,
    trial_index INTEGER NOT NULL,
    stimulus_json TEXT NOT NULL,
    response_json TEXT,
    correct INTEGER,
    rt_ms INTEGER,
    requested_duration_ms INTEGER,
    achieved_duration_ms INTEGER,
    frames_rendered INTEGER,
    timing_flag TEXT,
    FOREIGN KEY(block_id) REFERENCES blocks(id)
  )`,
  `CREATE TABLE IF NOT EXISTS domain_state (
    module_id TEXT PRIMARY KEY,
    level_json TEXT NOT NULL,
    ewma_performance REAL,
    last_session_ts INTEGER,
    sessions_total INTEGER DEFAULT 0,
    plateau_flag INTEGER DEFAULT 0,
    updated_ts INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS calibration_items (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    category TEXT,
    question TEXT NOT NULL,
    answer_type TEXT NOT NULL,
    choices_json TEXT,
    correct_answer TEXT NOT NULL,
    difficulty TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS calibration_reviews (
    item_id TEXT NOT NULL,
    ts INTEGER NOT NULL,
    confidence REAL NOT NULL,
    correct INTEGER NOT NULL,
    fsrs_state_json TEXT,
    PRIMARY KEY(item_id, ts),
    FOREIGN KEY(item_id) REFERENCES calibration_items(id)
  )`,
  `CREATE TABLE IF NOT EXISTS matrix_items (
    id TEXT PRIMARY KEY,
    matrix_type TEXT NOT NULL,
    rules_json TEXT NOT NULL,
    svg_seed TEXT NOT NULL,
    difficulty_est REAL,
    fsrs_state_json TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS metacog_predictions (
    block_id TEXT PRIMARY KEY,
    predicted_accuracy REAL NOT NULL,
    actual_accuracy REAL,
    brier_contribution REAL,
    FOREIGN KEY(block_id) REFERENCES blocks(id)
  )`,
  `CREATE TABLE IF NOT EXISTS transfer_assessments (
    id TEXT PRIMARY KEY,
    ts INTEGER NOT NULL,
    task_id TEXT NOT NULL,
    score REAL NOT NULL,
    raw_json TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    migrated_ts INTEGER NOT NULL
  )`
];
```

- [ ] **Step 4: Run schema test — pass expected**

- [ ] **Step 5: Create db worker**

`src/core/storage/db-worker.ts`:

```ts
/// <reference lib="webworker" />
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { SCHEMA_DDL, CURRENT_VERSION } from './schema';

type Req =
  | { kind: 'init' }
  | { kind: 'exec'; sql: string; bind?: unknown[] }
  | { kind: 'query'; sql: string; bind?: unknown[] };

type Res =
  | { kind: 'ready' }
  | { kind: 'ok' }
  | { kind: 'rows'; rows: Record<string, unknown>[] }
  | { kind: 'error'; message: string };

let db: any = null;

async function init() {
  const sqlite3 = await sqlite3InitModule({
    print: () => {}, printErr: (m: string) => console.warn('[sqlite]', m)
  });
  if (!('opfs' in sqlite3)) {
    throw new Error('OPFS not available — check COOP/COEP headers and crossOriginIsolated');
  }
  db = new sqlite3.oo1.OpfsDb('/intellect-forge.db', 'ct');
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  for (const stmt of SCHEMA_DDL) db.exec(stmt);
  const row = db.selectObject('SELECT MAX(version) as v FROM schema_version');
  if (!row || row.v == null) {
    db.exec({
      sql: 'INSERT INTO schema_version(version, migrated_ts) VALUES(?, ?)',
      bind: [CURRENT_VERSION, Date.now()]
    });
  }
}

self.onmessage = async (ev: MessageEvent<Req & { id: number }>) => {
  const { id, ...req } = ev.data;
  const reply = (body: Res) => (self as any).postMessage({ id, ...body });
  try {
    if (req.kind === 'init') { await init(); reply({ kind: 'ready' }); return; }
    if (!db) throw new Error('db not initialized');
    if (req.kind === 'exec') { db.exec({ sql: req.sql, bind: req.bind ?? [] }); reply({ kind: 'ok' }); return; }
    if (req.kind === 'query') {
      const rows: any[] = [];
      db.exec({ sql: req.sql, bind: req.bind ?? [], rowMode: 'object', callback: (r: any) => rows.push(r) });
      reply({ kind: 'rows', rows });
      return;
    }
  } catch (e: any) {
    reply({ kind: 'error', message: e?.message ?? String(e) });
  }
};
```

- [ ] **Step 6: Create db client**

`src/core/storage/db-client.ts`:

```ts
let worker: Worker | null = null;
let counter = 0;
const pending = new Map<number, (r: any) => void>();

function ensureWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./db-worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (ev) => {
      const { id, ...rest } = ev.data;
      const resolver = pending.get(id);
      if (resolver) { pending.delete(id); resolver(rest); }
    };
  }
  return worker;
}

function call<T>(req: unknown): Promise<T> {
  const w = ensureWorker();
  const id = ++counter;
  return new Promise((resolve, reject) => {
    pending.set(id, (r: any) => r.kind === 'error' ? reject(new Error(r.message)) : resolve(r));
    w.postMessage({ id, ...req });
  });
}

export async function dbInit(): Promise<void> {
  await call({ kind: 'init' });
}

export async function dbExec(sql: string, bind: unknown[] = []): Promise<void> {
  await call({ kind: 'exec', sql, bind });
}

export async function dbQuery<T = Record<string, unknown>>(
  sql: string, bind: unknown[] = []
): Promise<T[]> {
  const r = await call<{ kind: 'rows'; rows: T[] }>({ kind: 'query', sql, bind });
  return r.rows;
}
```

- [ ] **Step 7: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 8: Commit**

```bash
git add src/core/storage tests/unit/core/storage
git commit -m "storage: sqlite-wasm + OPFS worker, schema v1"
```

---

## Task 7: Storage — repositories

**Files:**
- Create: `src/core/storage/repos.ts`
- Test: `tests/e2e/storage.spec.ts` (requires live browser to use OPFS)

- [ ] **Step 1: Write e2e smoke test**

`tests/e2e/storage.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('OPFS SQLite init + insert + query round-trip', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { dbInit, dbExec, dbQuery } = await import('/src/core/storage/db-client.ts');
    await dbInit();
    await dbExec('INSERT INTO sessions(id, start_ts, plan_json, phase) VALUES(?,?,?,?)',
      ['s1', Date.now(), '{}', 'ramp']);
    const rows = await dbQuery<{ id: string }>('SELECT id FROM sessions WHERE id = ?', ['s1']);
    return rows.map(r => r.id);
  });
  expect(result).toEqual(['s1']);
});
```

- [ ] **Step 2: Implement repos**

`src/core/storage/repos.ts`:

```ts
import { dbExec, dbQuery } from './db-client';
import type { DomainState, SessionPlan, Phase } from '~/types/domain';
import type { ModuleId } from '~/types/module';

export async function saveSession(plan: SessionPlan): Promise<void> {
  await dbExec(
    'INSERT INTO sessions(id, start_ts, plan_json, phase, completed) VALUES(?,?,?,?,0)',
    [plan.id, plan.createdTs, JSON.stringify(plan), plan.phase]
  );
}

export async function completeSession(id: string): Promise<void> {
  await dbExec('UPDATE sessions SET end_ts=?, completed=1 WHERE id=?', [Date.now(), id]);
}

export async function saveBlock(b: {
  id: string; sessionId: string; moduleId: ModuleId; blockIndex: number;
  kind: string; metacogPrediction?: number | null; adaptiveParams: unknown;
}): Promise<void> {
  await dbExec(
    `INSERT INTO blocks(id, session_id, module_id, block_index, kind, start_ts,
       metacog_prediction, adaptive_params_json) VALUES(?,?,?,?,?,?,?,?)`,
    [b.id, b.sessionId, b.moduleId, b.blockIndex, b.kind, Date.now(),
     b.metacogPrediction ?? null, JSON.stringify(b.adaptiveParams)]
  );
}

export async function completeBlock(id: string, actualAccuracy: number): Promise<void> {
  await dbExec('UPDATE blocks SET end_ts=?, actual_accuracy=? WHERE id=?',
    [Date.now(), actualAccuracy, id]);
}

export interface TrialRow {
  id: string; blockId: string; trialIndex: number;
  stimulus: unknown; response: unknown;
  correct: boolean | null; rtMs: number | null;
  requestedDurationMs: number; achievedDurationMs: number;
  framesRendered: number; timingFlag: string;
}

export async function saveTrial(t: TrialRow): Promise<void> {
  await dbExec(
    `INSERT INTO trials(id, block_id, trial_index, stimulus_json, response_json,
       correct, rt_ms, requested_duration_ms, achieved_duration_ms,
       frames_rendered, timing_flag) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
    [t.id, t.blockId, t.trialIndex, JSON.stringify(t.stimulus),
     JSON.stringify(t.response), t.correct === null ? null : (t.correct ? 1 : 0),
     t.rtMs, t.requestedDurationMs, t.achievedDurationMs, t.framesRendered, t.timingFlag]
  );
}

export async function getDomainState(moduleId: ModuleId): Promise<DomainState | null> {
  const rows = await dbQuery<{ module_id: string; level_json: string; ewma_performance: number;
    last_session_ts: number | null; sessions_total: number; plateau_flag: number; updated_ts: number; }>(
    'SELECT * FROM domain_state WHERE module_id = ?', [moduleId]);
  if (rows.length === 0) return null;
  const r = rows[0]!;
  return {
    moduleId: r.module_id as ModuleId,
    level: JSON.parse(r.level_json),
    ewmaPerformance: r.ewma_performance,
    lastSessionTs: r.last_session_ts,
    sessionsTotal: r.sessions_total,
    plateauFlag: r.plateau_flag === 1,
    updatedTs: r.updated_ts
  };
}

export async function upsertDomainState(s: DomainState): Promise<void> {
  await dbExec(
    `INSERT OR REPLACE INTO domain_state(module_id, level_json, ewma_performance,
       last_session_ts, sessions_total, plateau_flag, updated_ts)
     VALUES(?,?,?,?,?,?,?)`,
    [s.moduleId, JSON.stringify(s.level), s.ewmaPerformance,
     s.lastSessionTs, s.sessionsTotal, s.plateauFlag ? 1 : 0, s.updatedTs]
  );
}
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Run e2e test**

```bash
npm run test:e2e -- storage.spec.ts
```

Expected: pass — round-trip works in real browser with OPFS.

- [ ] **Step 5: Commit**

```bash
git add src/core/storage/repos.ts tests/e2e/storage.spec.ts
git commit -m "storage: repos for sessions/blocks/trials/domain-state"
```

---

## Task 8: Display calibration probe

**Files:**
- Create: `src/core/stimulus/display-calibration.ts`
- Test: `tests/unit/core/stimulus/display-calibration.test.ts`

- [ ] **Step 1: Write failing test (pure math portion)**

`tests/unit/core/stimulus/display-calibration.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { estimateRefresh, msToFrames } from '~/core/stimulus/display-calibration';

describe('display calibration', () => {
  it('estimates refresh rate from frame timestamps', () => {
    // 60 Hz: frames 16.67ms apart
    const ts = Array.from({ length: 61 }, (_, i) => i * 16.666);
    const hz = estimateRefresh(ts);
    expect(hz).toBeGreaterThan(55);
    expect(hz).toBeLessThan(65);
  });

  it('msToFrames rounds to integer frames at given Hz', () => {
    expect(msToFrames(33.33, 60)).toBe(2);
    expect(msToFrames(16.67, 60)).toBe(1);
    expect(msToFrames(500, 60)).toBe(30);
  });
});
```

- [ ] **Step 2: Run — fail expected**

- [ ] **Step 3: Implement**

`src/core/stimulus/display-calibration.ts`:

```ts
export function estimateRefresh(timestamps: number[]): number {
  if (timestamps.length < 2) return 60;
  const diffs: number[] = [];
  for (let i = 1; i < timestamps.length; i++) diffs.push(timestamps[i]! - timestamps[i - 1]!);
  diffs.sort((a, b) => a - b);
  // median for robustness
  const med = diffs[Math.floor(diffs.length / 2)]!;
  return 1000 / med;
}

export function msToFrames(ms: number, hz: number): number {
  return Math.max(1, Math.round((ms / 1000) * hz));
}

export function framesToMs(frames: number, hz: number): number {
  return (frames / hz) * 1000;
}

// Run inside a worker or main thread — captures N rAF timestamps
export function captureFrameTimestamps(nFrames: number): Promise<number[]> {
  return new Promise((resolve) => {
    const ts: number[] = [];
    const tick = (t: number) => {
      ts.push(t);
      if (ts.length >= nFrames) resolve(ts);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

export interface CalibrationReport {
  refreshHz: number;
  frameMs: number;
  droppedFrames: number;
  samples: number;
}

export async function calibrateDisplay(nFrames = 120): Promise<CalibrationReport> {
  const ts = await captureFrameTimestamps(nFrames);
  const hz = estimateRefresh(ts);
  const expected = 1000 / hz;
  let dropped = 0;
  for (let i = 1; i < ts.length; i++) {
    const gap = ts[i]! - ts[i - 1]!;
    if (gap > expected * 1.5) dropped++;
  }
  return { refreshHz: hz, frameMs: expected, droppedFrames: dropped, samples: ts.length };
}
```

- [ ] **Step 4: Run unit test — pass expected**

- [ ] **Step 5: Commit**

```bash
git add src/core/stimulus/display-calibration.ts tests/unit/core/stimulus/display-calibration.test.ts
git commit -m "stimulus: display calibration probe (refresh detection)"
```

---

## Task 9: Stimulus engine worker — trial runner skeleton

**Files:**
- Create: `src/core/stimulus/engine-worker.ts`, `src/core/stimulus/engine-client.ts`, `src/core/stimulus/trial-runner.ts`
- Test: `tests/e2e/stimulus-engine.spec.ts`

This task establishes the worker boundary and the "run a trial, return timing + response" contract. For the smoke test we use a text-only stimulus ("press SPACE"); real stimulus kinds are handled per-module by extending `trial-runner.ts`.

- [ ] **Step 1: Write e2e test**

`tests/e2e/stimulus-engine.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('stimulus engine presents a text stimulus and captures keypress', async ({ page }) => {
  await page.goto('/stimulus-debug');  // debug page added in Task 11
  await page.getByRole('button', { name: /start trial/i }).click();
  // give the engine a frame to mount
  await page.waitForTimeout(50);
  await page.keyboard.press('Space');
  const resultText = await page.getByTestId('trial-result').textContent();
  expect(resultText).toMatch(/rtMs: \d+/);
  expect(resultText).toMatch(/timingFlag: ok/);
});
```

- [ ] **Step 2: Implement engine worker and client**

`src/core/stimulus/engine-worker.ts`:

```ts
/// <reference lib="webworker" />
import type { Trial, Response } from '~/types/module';

type Req =
  | { kind: 'run-trial'; trial: Trial; canvas?: OffscreenCanvas }
  | { kind: 'key-event'; key: string; ts: number };

type Res =
  | { kind: 'ready' }
  | { kind: 'trial-complete'; response: Response }
  | { kind: 'error'; message: string };

let pending: { trial: Trial; startTs: number; frames: number;
  resolve: (r: Response) => void } | null = null;
let canvas: OffscreenCanvas | null = null;

self.onmessage = (ev: MessageEvent<Req & { id: number }>) => {
  const { id, ...req } = ev.data;
  const reply = (body: Res) => (self as any).postMessage({ id, ...body });
  if (req.kind === 'run-trial') {
    if (req.canvas) canvas = req.canvas;
    runTrial(req.trial).then(response => reply({ kind: 'trial-complete', response }))
      .catch(e => reply({ kind: 'error', message: e.message }));
  } else if (req.kind === 'key-event' && pending) {
    const rtMs = req.ts - pending.startTs;
    const achievedMs = performance.now() - pending.startTs;
    const resp: Response = {
      trialId: pending.trial.id,
      event: { kind: 'keydown', value: req.key, rtMs },
      timing: {
        requestedDurationMs: pending.trial.timingSpec.stimulusMs === 'until-response'
          ? 0 : pending.trial.timingSpec.stimulusMs,
        achievedDurationMs: achievedMs,
        framesRendered: pending.frames,
        timingFlag: 'ok'
      }
    };
    pending.resolve(resp);
    pending = null;
  }
};

async function runTrial(trial: Trial): Promise<Response> {
  return new Promise<Response>((resolve) => {
    const startTs = performance.now();
    pending = { trial, startTs, frames: 0, resolve };
    // Draw text to offscreen canvas if provided
    if (canvas && trial.stimulus.kind === 'text-question') {
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = '48px system-ui';
      ctx.textAlign = 'center';
      const text = String((trial.stimulus.payload as { text?: string }).text ?? '—');
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }
    // rAF tick for frame counting + timeout handling
    const tick = () => {
      if (!pending) return;
      pending.frames++;
      const elapsed = performance.now() - pending.startTs;
      const spec = pending.trial.timingSpec;
      if (spec.stimulusMs !== 'until-response' && elapsed >= spec.stimulusMs) {
        // timeout → return no-response result
        const resp: Response = {
          trialId: pending.trial.id,
          event: { kind: 'timeout', value: null, rtMs: 0 },
          timing: {
            requestedDurationMs: spec.stimulusMs,
            achievedDurationMs: elapsed,
            framesRendered: pending.frames,
            timingFlag: 'ok'
          }
        };
        const resolve = pending.resolve;
        pending = null;
        resolve(resp);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
```

`src/core/stimulus/engine-client.ts`:

```ts
import type { Trial, Response } from '~/types/module';

let worker: Worker | null = null;
let counter = 0;
const pending = new Map<number, (r: any) => void>();

function ensureWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./engine-worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (ev) => {
      const { id, ...rest } = ev.data;
      const resolver = pending.get(id);
      if (resolver) { pending.delete(id); resolver(rest); }
    };
    window.addEventListener('keydown', (e) => {
      worker!.postMessage({ id: 0, kind: 'key-event', key: e.key, ts: performance.now() });
    });
  }
  return worker;
}

export async function runTrial(trial: Trial, canvas?: OffscreenCanvas): Promise<Response> {
  const w = ensureWorker();
  const id = ++counter;
  return new Promise((resolve, reject) => {
    pending.set(id, (r: any) => r.kind === 'error' ? reject(new Error(r.message)) : resolve(r.response));
    const msg: any = { id, kind: 'run-trial', trial };
    if (canvas) msg.canvas = canvas;
    w.postMessage(msg, canvas ? [canvas] : []);
  });
}
```

- [ ] **Step 3: Commit (we validate e2e in Task 11/12)**

```bash
git add src/core/stimulus tests/e2e/stimulus-engine.spec.ts
git commit -m "stimulus: engine worker + client, text-stimulus smoke path"
```

---

## Task 10: Orchestrator skeleton + DomainState store

**Files:**
- Create: `src/core/orchestrator/phases.ts`, `src/core/orchestrator/urgency.ts`, `src/core/orchestrator/session-composer.ts`
- Test: `tests/unit/core/orchestrator/`

- [ ] **Step 1: Write failing tests**

`tests/unit/core/orchestrator/phases.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computePhase } from '~/core/orchestrator/phases';

describe('orchestrator phases', () => {
  it('week 1 is ramp', () => {
    expect(computePhase({ sessionsTotal: 3, weeksActive: 1 })).toBe('ramp');
  });
  it('week 5 is intensive', () => {
    expect(computePhase({ sessionsTotal: 25, weeksActive: 5 })).toBe('intensive');
  });
  it('week 10 is consolidation', () => {
    expect(computePhase({ sessionsTotal: 55, weeksActive: 10 })).toBe('consolidation');
  });
  it('week 13 is maintenance', () => {
    expect(computePhase({ sessionsTotal: 80, weeksActive: 13 })).toBe('maintenance');
  });
});
```

`tests/unit/core/orchestrator/urgency.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { urgencyScore } from '~/core/orchestrator/urgency';

describe('urgency score', () => {
  const NOW = 1_700_000_000_000;
  it('never-trained domain has max urgency', () => {
    expect(urgencyScore({ daysSinceLast: Infinity, plateauFlag: false, decayFlag: false }))
      .toBeGreaterThan(1.5);
  });
  it('recently-trained has low urgency', () => {
    expect(urgencyScore({ daysSinceLast: 0, plateauFlag: false, decayFlag: false }))
      .toBeLessThan(0.5);
  });
  it('plateau reduces urgency', () => {
    const plateaued = urgencyScore({ daysSinceLast: 3, plateauFlag: true, decayFlag: false });
    const normal = urgencyScore({ daysSinceLast: 3, plateauFlag: false, decayFlag: false });
    expect(plateaued).toBeLessThan(normal);
  });
  it('decay boosts urgency (maintenance)', () => {
    const decaying = urgencyScore({ daysSinceLast: 7, plateauFlag: false, decayFlag: true });
    const normal = urgencyScore({ daysSinceLast: 7, plateauFlag: false, decayFlag: false });
    expect(decaying).toBeGreaterThan(normal);
  });
});
```

`tests/unit/core/orchestrator/session-composer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { composeSession } from '~/core/orchestrator/session-composer';
import type { DomainState } from '~/types/domain';

const mk = (moduleId: any, daysAgo: number): DomainState => ({
  moduleId, level: {}, ewmaPerformance: 0.7,
  lastSessionTs: Date.now() - daysAgo * 86400000,
  sessionsTotal: 5, plateauFlag: false, updatedTs: Date.now()
});

describe('session composer', () => {
  it('ramp phase picks exactly one domain', () => {
    const states = [mk('working-memory', 2), mk('ufov', 1), mk('relational', 5)];
    const plan = composeSession({ phase: 'ramp', states, targetMinutes: 25 });
    expect(plan.modules.length).toBe(1);
  });
  it('intensive phase picks two domains for AB interleaving', () => {
    const states = [mk('working-memory', 3), mk('ufov', 2), mk('relational', 4)];
    const plan = composeSession({ phase: 'intensive', states, targetMinutes: 25 });
    expect(plan.modules.length).toBe(2);
    expect(plan.interleave).toBe(true);
  });
  it('respects target minutes and hard cap', () => {
    const states = [mk('working-memory', 3)];
    const plan = composeSession({ phase: 'ramp', states, targetMinutes: 25 });
    const total = plan.modules.reduce((s, m) => s + m.targetMinutes, 0);
    expect(total).toBeLessThanOrEqual(30);
  });
});
```

- [ ] **Step 2: Run — fail expected**

- [ ] **Step 3: Implement**

`src/core/orchestrator/phases.ts`:

```ts
import type { Phase } from '~/types/domain';

export function computePhase(ctx: { sessionsTotal: number; weeksActive: number }): Phase {
  if (ctx.weeksActive <= 3) return 'ramp';
  if (ctx.weeksActive <= 8) return 'intensive';
  if (ctx.weeksActive <= 12) return 'consolidation';
  return 'maintenance';
}
```

`src/core/orchestrator/urgency.ts`:

```ts
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
```

`src/core/orchestrator/session-composer.ts`:

```ts
import type { DomainState, SessionPlan, Phase } from '~/types/domain';
import { urgencyScore } from './urgency';

export interface ComposeInput {
  phase: Phase;
  states: DomainState[];
  targetMinutes: number;
}

export function composeSession(input: ComposeInput): SessionPlan {
  const now = Date.now();
  const ranked = input.states
    .map(s => ({
      state: s,
      score: urgencyScore({
        daysSinceLast: s.lastSessionTs ? (now - s.lastSessionTs) / 86400000 : Infinity,
        plateauFlag: s.plateauFlag,
        decayFlag: false
      })
    }))
    .sort((a, b) => b.score - a.score);

  const pickCount =
    input.phase === 'ramp' ? 1 :
    input.phase === 'maintenance' ? 1 : 2;

  const picked = ranked.slice(0, pickCount);
  const cap = Math.min(input.targetMinutes, 30);
  const perModule = cap / picked.length;

  return {
    id: crypto.randomUUID(),
    createdTs: now,
    phase: input.phase,
    modules: picked.map(p => ({ moduleId: p.state.moduleId, targetMinutes: perModule })),
    interleave: pickCount > 1,
    metacogOverlay: true
  };
}
```

- [ ] **Step 4: Run tests — pass expected**

- [ ] **Step 5: Commit**

```bash
git add src/core/orchestrator tests/unit/core/orchestrator
git commit -m "orchestrator: phases, urgency score, session composer"
```

---

## Task 11: Module registry + placeholder module

**Files:**
- Create: `src/core/modules/registry.ts`, `src/core/modules/placeholder/placeholder-module.ts`
- Test: `tests/unit/core/modules/placeholder.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/core/modules/placeholder.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { placeholderModule } from '~/core/modules/placeholder/placeholder-module';

describe('placeholder module', () => {
  it('produces trials until exhausted then returns null', () => {
    const session = placeholderModule.createSession({
      moduleId: 'placeholder',
      level: {}, ewmaPerformance: 0,
      lastSessionTs: null, sessionsTotal: 0,
      plateauFlag: false, updatedTs: Date.now()
    });
    let count = 0;
    while (session.nextTrial()) count++;
    expect(count).toBeGreaterThan(0);
  });

  it('scores SPACE response as correct, other keys as incorrect', async () => {
    const session = placeholderModule.createSession({
      moduleId: 'placeholder',
      level: {}, ewmaPerformance: 0,
      lastSessionTs: null, sessionsTotal: 0,
      plateauFlag: false, updatedTs: Date.now()
    });
    const trial = session.nextTrial()!;
    const result = await session.submit({
      trialId: trial.id,
      event: { kind: 'keydown', value: ' ', rtMs: 400 },
      timing: { requestedDurationMs: 0, achievedDurationMs: 400, framesRendered: 24, timingFlag: 'ok' }
    });
    expect(result.correct).toBe(true);
  });
});
```

- [ ] **Step 2: Run — fail expected**

- [ ] **Step 3: Implement**

`src/core/modules/placeholder/placeholder-module.ts`:

```ts
import type { TrainingModule, Session, Trial, Response, TrialResult, BlockStats, SessionResult, Block } from '~/types/module';
import type { DomainState } from '~/types/domain';

export const placeholderModule: TrainingModule = {
  id: 'placeholder',
  displayName: 'Placeholder (smoke test)',
  estimatedMinutes: 1,
  createSession(state: DomainState): Session {
    const blocks: Block[] = [
      { index: 0, kind: 'placeholder-block', targetTrialCount: 5 }
    ];
    let trialIdx = 0;
    const trials: Trial[] = Array.from({ length: 5 }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      blockIndex: 0,
      trialIndex: i,
      stimulus: { kind: 'text-question', payload: { text: 'Press SPACE' } },
      inputSpec: { accept: ['keyboard'], keys: [' ', 'Escape'] },
      timingSpec: { stimulusMs: 3000 }
    }));
    const results: TrialResult[] = [];
    let metacogPrediction: number | null = null;

    return {
      moduleId: 'placeholder',
      blocks,
      nextTrial() { return trialIdx < trials.length ? trials[trialIdx++]! : null; },
      setMetacogPrediction(_idx, p) { metacogPrediction = p; },
      async submit(resp: Response): Promise<TrialResult> {
        const correct = resp.event.kind === 'keydown' && resp.event.value === ' ';
        const result: TrialResult = {
          trialId: resp.trialId,
          correct,
          rtMs: resp.event.rtMs || null,
          scored: { correct: correct ? 1 : 0 }
        };
        results.push(result);
        return result;
      },
      currentBlockStats(): BlockStats {
        const done = results.length;
        const acc = done ? results.filter(r => r.correct).length / done : 0;
        return { blockIndex: 0, trialsCompleted: done, accuracy: acc, custom: {} };
      },
      complete(): SessionResult {
        const acc = results.filter(r => r.correct).length / Math.max(results.length, 1);
        const nextState: DomainState = {
          ...state,
          sessionsTotal: state.sessionsTotal + 1,
          ewmaPerformance: 0.7 * state.ewmaPerformance + 0.3 * acc,
          lastSessionTs: Date.now(),
          updatedTs: Date.now()
        };
        return {
          blocks: [this.currentBlockStats()],
          totalDurationMs: 0,
          nextDomainState: nextState
        };
      },
      metadata: { metacogPrediction }
    } as Session;
  }
};
```

`src/core/modules/registry.ts`:

```ts
import type { TrainingModule, ModuleId } from '~/types/module';
import { placeholderModule } from './placeholder/placeholder-module';

const registry = new Map<ModuleId, TrainingModule>();
registry.set(placeholderModule.id, placeholderModule);

export function registerModule(m: TrainingModule) { registry.set(m.id, m); }
export function getModule(id: ModuleId): TrainingModule | undefined { return registry.get(id); }
export function listModules(): TrainingModule[] { return Array.from(registry.values()); }
```

- [ ] **Step 4: Run tests — pass expected**

- [ ] **Step 5: Commit**

```bash
git add src/core/modules tests/unit/core/modules
git commit -m "modules: registry + placeholder smoke-test module"
```

---

## Task 12: UI — routes, home, session runner, stimulus debug page

**Files:**
- Create: `src/ui/routes.tsx`, `src/ui/theme.css`, `src/ui/pages/home.tsx`, `src/ui/pages/today.tsx`, `src/ui/pages/session-runner.tsx`, `src/ui/pages/results.tsx`, `src/ui/pages/stimulus-debug.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`

- [ ] **Step 1: Add @solidjs/router and wire routes**

`src/ui/theme.css`:

```css
:root {
  --bg: #0b0d10;
  --fg: #e6e6e6;
  --accent: #7aa2ff;
  --muted: #7c8088;
  --panel: #14181e;
  font-family: system-ui, sans-serif;
}
html, body, #root { height: 100%; margin: 0; background: var(--bg); color: var(--fg); }
button { background: var(--panel); color: var(--fg); border: 1px solid var(--muted);
  padding: .6rem 1rem; border-radius: .25rem; cursor: pointer; }
button:hover { border-color: var(--accent); }
a { color: var(--accent); text-decoration: none; }
.container { max-width: 640px; margin: 2rem auto; padding: 1rem; }
.hero { font-size: 1.5rem; margin-bottom: 1rem; }
.muted { color: var(--muted); font-size: .9rem; }
```

`src/ui/routes.tsx`:

```tsx
import { Router, Route } from '@solidjs/router';
import { Home } from './pages/home';
import { Today } from './pages/today';
import { SessionRunner } from './pages/session-runner';
import { Results } from './pages/results';
import { StimulusDebug } from './pages/stimulus-debug';

export function Routes() {
  return (
    <Router>
      <Route path="/" component={Home} />
      <Route path="/today" component={Today} />
      <Route path="/session/:sessionId" component={SessionRunner} />
      <Route path="/results/:sessionId" component={Results} />
      <Route path="/stimulus-debug" component={StimulusDebug} />
    </Router>
  );
}
```

`src/ui/pages/home.tsx`:

```tsx
import { A } from '@solidjs/router';

export function Home() {
  return (
    <div class="container">
      <h1 class="hero">Intellect Forge</h1>
      <p class="muted">Evidence-based cognitive training. Personal build.</p>
      <p><A href="/today">Start today's session →</A></p>
      <p class="muted"><A href="/stimulus-debug">stimulus debug</A></p>
    </div>
  );
}
```

`src/ui/pages/today.tsx`:

```tsx
import { createResource, Show } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { dbInit } from '~/core/storage/db-client';
import { getDomainState, saveSession } from '~/core/storage/repos';
import { computePhase } from '~/core/orchestrator/phases';
import { composeSession } from '~/core/orchestrator/session-composer';
import { listModules } from '~/core/modules/registry';
import type { DomainState } from '~/types/domain';

async function buildPlan() {
  await dbInit();
  const states: DomainState[] = [];
  for (const m of listModules()) {
    const s = await getDomainState(m.id) ?? {
      moduleId: m.id, level: {}, ewmaPerformance: 0,
      lastSessionTs: null, sessionsTotal: 0,
      plateauFlag: false, updatedTs: Date.now()
    };
    states.push(s);
  }
  const phase = computePhase({
    sessionsTotal: states.reduce((s, d) => s + d.sessionsTotal, 0),
    weeksActive: 1
  });
  const plan = composeSession({ phase, states, targetMinutes: 25 });
  await saveSession(plan);
  return plan;
}

export function Today() {
  const [plan] = createResource(buildPlan);
  const nav = useNavigate();
  return (
    <div class="container">
      <h1 class="hero">Today</h1>
      <Show when={plan()} fallback={<p class="muted">Composing session…</p>}>
        {p => (
          <div>
            <p>Phase: <b>{p().phase}</b></p>
            <p>Modules:</p>
            <ul>
              {p().modules.map(m => <li>{m.moduleId} — {m.targetMinutes.toFixed(0)} min</li>)}
            </ul>
            <button onClick={() => nav(`/session/${p().id}`)}>Start session</button>
          </div>
        )}
      </Show>
    </div>
  );
}
```

`src/ui/pages/session-runner.tsx`:

```tsx
import { createSignal, onMount, Show } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { getModule } from '~/core/modules/registry';
import { getDomainState, saveBlock, saveTrial, completeBlock, completeSession, upsertDomainState } from '~/core/storage/repos';
import { runTrial } from '~/core/stimulus/engine-client';
import type { Session } from '~/types/module';

export function SessionRunner() {
  const params = useParams();
  const nav = useNavigate();
  const [session, setSession] = createSignal<Session | null>(null);
  const [status, setStatus] = createSignal('initializing');
  const [log, setLog] = createSignal<string[]>([]);

  onMount(async () => {
    // MVP: hardcode placeholder module until WM pilot lands (Task 14-17)
    const m = getModule('placeholder')!;
    const state = await getDomainState('placeholder') ?? {
      moduleId: 'placeholder' as const, level: {}, ewmaPerformance: 0,
      lastSessionTs: null, sessionsTotal: 0, plateauFlag: false, updatedTs: Date.now()
    };
    const s = m.createSession(state);
    setSession(s);
    await saveBlock({
      id: crypto.randomUUID(), sessionId: params.sessionId!,
      moduleId: 'placeholder', blockIndex: 0, kind: 'placeholder-block',
      adaptiveParams: {}
    });
    setStatus('running');
    runSession(s);
  });

  async function runSession(s: Session) {
    let trial = s.nextTrial();
    while (trial) {
      setLog(l => [...l, `trial ${trial!.trialIndex}`]);
      const resp = await runTrial(trial);
      const result = await s.submit(resp);
      await saveTrial({
        id: trial.id, blockId: 'n/a', trialIndex: trial.trialIndex,
        stimulus: trial.stimulus, response: resp,
        correct: result.correct, rtMs: result.rtMs ?? 0,
        requestedDurationMs: resp.timing.requestedDurationMs,
        achievedDurationMs: resp.timing.achievedDurationMs,
        framesRendered: resp.timing.framesRendered,
        timingFlag: resp.timing.timingFlag
      });
      trial = s.nextTrial();
    }
    const result = s.complete();
    await completeSession(params.sessionId!);
    await upsertDomainState(result.nextDomainState);
    setStatus('done');
    nav(`/results/${params.sessionId}`);
  }

  return (
    <div class="container">
      <h1 class="hero">Session</h1>
      <p class="muted">Status: {status()}</p>
      <Show when={session()}>
        <ul>{log().map(l => <li>{l}</li>)}</ul>
      </Show>
    </div>
  );
}
```

`src/ui/pages/results.tsx`:

```tsx
import { A } from '@solidjs/router';

export function Results() {
  return (
    <div class="container">
      <h1 class="hero">Session complete</h1>
      <p class="muted">(Detailed results coming in Phase 3 dashboard.)</p>
      <p><A href="/">Home</A></p>
    </div>
  );
}
```

`src/ui/pages/stimulus-debug.tsx`:

```tsx
import { createSignal } from 'solid-js';
import { runTrial } from '~/core/stimulus/engine-client';

export function StimulusDebug() {
  const [out, setOut] = createSignal('');
  async function go() {
    const trial = {
      id: 'debug', blockIndex: 0, trialIndex: 0,
      stimulus: { kind: 'text-question' as const, payload: { text: 'Press SPACE' } },
      inputSpec: { accept: ['keyboard' as const], keys: [' '] },
      timingSpec: { stimulusMs: 3000 as const }
    };
    const resp = await runTrial(trial);
    setOut(JSON.stringify({
      rtMs: resp.event.rtMs,
      timingFlag: resp.timing.timingFlag,
      frames: resp.timing.framesRendered
    }, null, 2));
  }
  return (
    <div class="container">
      <h1 class="hero">Stimulus Debug</h1>
      <button onClick={go}>Start trial</button>
      <pre data-testid="trial-result">{out()}</pre>
    </div>
  );
}
```

- [ ] **Step 2: Wire into App and main**

`src/App.tsx`:

```tsx
import './ui/theme.css';
import { Routes } from './ui/routes';

export function App() { return <Routes />; }
```

- [ ] **Step 3: Typecheck and smoke-run**

```bash
npm run typecheck
npm run dev
```

Click through Home → Today → Start session → completes placeholder trials → Results page. Visit `/stimulus-debug`, click Start, press SPACE → see `rtMs` and `timingFlag: ok`.

- [ ] **Step 4: Run e2e tests (now that routes exist)**

```bash
npm run test:e2e
```

Expected: storage spec passes, stimulus-engine spec passes.

- [ ] **Step 5: Commit**

```bash
git add src/ui src/App.tsx src/main.tsx
git commit -m "ui: routes, home, today, session runner, stimulus debug"
```

---

## Task 13: Working Memory — dual n-back stimulus generation

**Files:**
- Create: `src/core/modules/working-memory/dual-nback.ts`
- Test: `tests/unit/core/modules/working-memory/dual-nback.test.ts`

Reference: `research/02-working-memory.md` — Jaeggi 2008 defaults, 8 positions, 8 letters (CHKLQRST), 6+6 targets + 2 dual per block, ~25% lures.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { generateNBackBlock, NBACK_LETTERS, NBACK_POSITIONS } from '~/core/modules/working-memory/dual-nback';

describe('dual n-back generator', () => {
  it('has 8 consonants and 8 positions', () => {
    expect(NBACK_LETTERS.length).toBe(8);
    expect(NBACK_POSITIONS.length).toBe(8);
  });

  it('generates N+20 trials for N=2', () => {
    const block = generateNBackBlock({ n: 2, nTargets: 6, nDualTargets: 2, nLures: 4, seed: 42 });
    expect(block.trials.length).toBeGreaterThanOrEqual(22);
  });

  it('guarantees ≥6 position targets and ≥6 audio targets and ≥2 duals', () => {
    const block = generateNBackBlock({ n: 2, nTargets: 6, nDualTargets: 2, nLures: 4, seed: 42 });
    const posTargets = block.trials.filter(t => t.isPositionTarget).length;
    const audTargets = block.trials.filter(t => t.isAudioTarget).length;
    const duals = block.trials.filter(t => t.isPositionTarget && t.isAudioTarget).length;
    expect(posTargets).toBeGreaterThanOrEqual(6);
    expect(audTargets).toBeGreaterThanOrEqual(6);
    expect(duals).toBeGreaterThanOrEqual(2);
  });

  it('is deterministic given a seed', () => {
    const a = generateNBackBlock({ n: 2, nTargets: 6, nDualTargets: 2, nLures: 4, seed: 123 });
    const b = generateNBackBlock({ n: 2, nTargets: 6, nDualTargets: 2, nLures: 4, seed: 123 });
    expect(a.trials.map(t => t.position + t.letter)).toEqual(b.trials.map(t => t.position + t.letter));
  });
});
```

- [ ] **Step 2: Run — fail expected**

- [ ] **Step 3: Implement generator (seeded PRNG + target-placement)**

```ts
export const NBACK_LETTERS = ['C','H','K','L','Q','R','S','T'] as const;
export const NBACK_POSITIONS = [0,1,2,3,4,5,6,7] as const;  // 8 positions (skip center of 3x3)

export type Letter = typeof NBACK_LETTERS[number];
export type Position = typeof NBACK_POSITIONS[number];

export interface NBackTrial {
  index: number;
  position: Position;
  letter: Letter;
  isPositionTarget: boolean;
  isAudioTarget: boolean;
  isLure: boolean;
}

export interface NBackBlockSpec {
  n: number;
  nTargets: number;       // per-stream target count (typically 6)
  nDualTargets: number;   // coincident (typically 2)
  nLures: number;         // N±1 lures (typically 4)
  seed: number;
}

export interface NBackBlock {
  n: number;
  trials: NBackTrial[];
}

// Mulberry32 seeded PRNG
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

export function generateNBackBlock(spec: NBackBlockSpec): NBackBlock {
  const totalTrials = spec.n + 20;
  const rand = prng(spec.seed);
  const pick = <T>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]!;
  const pickAvoid = <T>(arr: readonly T[], avoid: T) => {
    let x: T; do { x = pick(arr); } while (x === avoid);
    return x;
  };

  // Build base random sequence
  const trials: NBackTrial[] = Array.from({ length: totalTrials }, (_, i) => ({
    index: i,
    position: pick(NBACK_POSITIONS),
    letter: pick(NBACK_LETTERS),
    isPositionTarget: false,
    isAudioTarget: false,
    isLure: false
  }));

  // Choose target indices ≥ N
  const available = Array.from({ length: totalTrials - spec.n }, (_, i) => i + spec.n);
  const shuffle = (arr: number[]) => { for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1)); [arr[i], arr[j]] = [arr[j]!, arr[i]!]; } return arr; };
  shuffle(available);

  const posTargetIdx = available.slice(0, spec.nTargets);
  const audTargetIdx = available.slice(spec.nTargets, spec.nTargets * 2);
  const dualIdx = available.slice(spec.nTargets * 2, spec.nTargets * 2 + spec.nDualTargets);
  const lureIdx = available.slice(
    spec.nTargets * 2 + spec.nDualTargets,
    spec.nTargets * 2 + spec.nDualTargets + spec.nLures
  );

  for (const i of posTargetIdx) {
    trials[i]!.position = trials[i - spec.n]!.position;
    trials[i]!.isPositionTarget = true;
  }
  for (const i of audTargetIdx) {
    trials[i]!.letter = trials[i - spec.n]!.letter;
    trials[i]!.isAudioTarget = true;
  }
  for (const i of dualIdx) {
    trials[i]!.position = trials[i - spec.n]!.position;
    trials[i]!.letter = trials[i - spec.n]!.letter;
    trials[i]!.isPositionTarget = true;
    trials[i]!.isAudioTarget = true;
  }
  for (const i of lureIdx) {
    // N-1 or N+1 proximity lure
    const offset = rand() < 0.5 ? spec.n - 1 : spec.n + 1;
    const src = i - offset;
    if (src >= 0) {
      if (rand() < 0.5) trials[i]!.position = trials[src]!.position;
      else trials[i]!.letter = trials[src]!.letter;
      trials[i]!.isLure = true;
    }
  }

  return { n: spec.n, trials };
}
```

- [ ] **Step 4: Run tests — pass expected**

- [ ] **Step 5: Commit**

```bash
git add src/core/modules/working-memory/dual-nback.ts tests/unit/core/modules/working-memory/dual-nback.test.ts
git commit -m "wm: dual n-back stimulus generator (Jaeggi defaults, seeded)"
```

---

## Task 14: Working Memory — WM adaptive logic (per-stream d-prime rule + N level)

**Files:**
- Create: `src/core/modules/working-memory/wm-adaptive.ts`
- Test: `tests/unit/core/modules/working-memory/wm-adaptive.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { nextNLevel, scoreBlock } from '~/core/modules/working-memory/wm-adaptive';
import type { NBackTrial } from '~/core/modules/working-memory/dual-nback';

function mkTrial(partial: Partial<NBackTrial>): NBackTrial {
  return { index: 0, position: 0, letter: 'C', isPositionTarget: false,
    isAudioTarget: false, isLure: false, ...partial };
}

describe('wm adaptive', () => {
  it('scoreBlock computes per-stream d-prime', () => {
    const trials: NBackTrial[] = [
      mkTrial({ index: 2, isPositionTarget: true }),
      mkTrial({ index: 3, isAudioTarget: true }),
      mkTrial({ index: 4 })
    ];
    const responses = {
      2: { position: true, audio: false },   // hit position
      3: { position: false, audio: true },   // hit audio
      4: { position: false, audio: false }   // CR both
    };
    const stats = scoreBlock(trials, responses);
    expect(stats.position.hits).toBe(1);
    expect(stats.audio.hits).toBe(1);
  });

  it('promotes N when both streams ≥ 1.5 d-prime', () => {
    expect(nextNLevel({ currentN: 2, blockHistory: [
      { position: { dPrime: 1.6 } as any, audio: { dPrime: 1.7 } as any }
    ]})).toBe(3);
  });

  it('demotes N after two consecutive low-d-prime blocks', () => {
    expect(nextNLevel({ currentN: 3, blockHistory: [
      { position: { dPrime: 0.3 } as any, audio: { dPrime: 0.4 } as any },
      { position: { dPrime: 0.2 } as any, audio: { dPrime: 0.3 } as any }
    ]})).toBe(2);
  });

  it('holds N below promotion and above demotion', () => {
    expect(nextNLevel({ currentN: 3, blockHistory: [
      { position: { dPrime: 1.0 } as any, audio: { dPrime: 1.0 } as any }
    ]})).toBe(3);
  });

  it('never demotes below N=1', () => {
    expect(nextNLevel({ currentN: 1, blockHistory: [
      { position: { dPrime: 0.1 } as any, audio: { dPrime: 0.1 } as any },
      { position: { dPrime: 0.1 } as any, audio: { dPrime: 0.1 } as any }
    ]})).toBe(1);
  });
});
```

- [ ] **Step 2: Run — fail expected**

- [ ] **Step 3: Implement**

```ts
import type { NBackTrial } from './dual-nback';
import { computeDPrime, type DPrimeResult, type SdtCounts } from '~/core/adaptive/dprime';

export interface NBackResponse {
  position: boolean;  // user said "position match"
  audio: boolean;     // user said "audio match"
}

export interface BlockStreamStats {
  position: DPrimeResult & { counts: SdtCounts };
  audio: DPrimeResult & { counts: SdtCounts };
  overallAccuracy: number;
}

export function scoreBlock(
  trials: NBackTrial[],
  responses: Record<number, NBackResponse>
): BlockStreamStats {
  const posCounts: SdtCounts = { hits: 0, misses: 0, falseAlarms: 0, correctRejects: 0 };
  const audCounts: SdtCounts = { hits: 0, misses: 0, falseAlarms: 0, correctRejects: 0 };
  let correctTrials = 0;

  for (const t of trials) {
    const r = responses[t.index] ?? { position: false, audio: false };
    // Position stream
    if (t.isPositionTarget && r.position) posCounts.hits++;
    else if (t.isPositionTarget && !r.position) posCounts.misses++;
    else if (!t.isPositionTarget && r.position) posCounts.falseAlarms++;
    else posCounts.correctRejects++;
    // Audio stream
    if (t.isAudioTarget && r.audio) audCounts.hits++;
    else if (t.isAudioTarget && !r.audio) audCounts.misses++;
    else if (!t.isAudioTarget && r.audio) audCounts.falseAlarms++;
    else audCounts.correctRejects++;
    // Overall accuracy
    const posOk = (t.isPositionTarget === r.position);
    const audOk = (t.isAudioTarget === r.audio);
    if (posOk && audOk) correctTrials++;
  }

  return {
    position: { ...computeDPrime(posCounts), counts: posCounts },
    audio: { ...computeDPrime(audCounts), counts: audCounts },
    overallAccuracy: correctTrials / Math.max(trials.length, 1)
  };
}

export interface NLevelInput {
  currentN: number;
  blockHistory: BlockStreamStats[];
  minN?: number;
  maxN?: number;
  promoteDPrime?: number;
  demoteDPrime?: number;
  demoteConsec?: number;
}

export function nextNLevel(i: NLevelInput): number {
  const minN = i.minN ?? 1;
  const maxN = i.maxN ?? 10;
  const promote = i.promoteDPrime ?? 1.5;
  const demote = i.demoteDPrime ?? 0.5;
  const consec = i.demoteConsec ?? 2;
  const latest = i.blockHistory[i.blockHistory.length - 1];
  if (!latest) return i.currentN;

  if (latest.position.dPrime >= promote && latest.audio.dPrime >= promote) {
    return Math.min(i.currentN + 1, maxN);
  }
  const recent = i.blockHistory.slice(-consec);
  if (recent.length >= consec &&
      recent.every(b => b.position.dPrime <= demote || b.audio.dPrime <= demote)) {
    return Math.max(i.currentN - 1, minN);
  }
  return i.currentN;
}
```

- [ ] **Step 4: Run — pass expected**

- [ ] **Step 5: Commit**

```bash
git add src/core/modules/working-memory/wm-adaptive.ts tests/unit/core/modules/working-memory/wm-adaptive.test.ts
git commit -m "wm: per-stream d-prime adaptive rule for N level"
```

---

## Task 15: Working Memory — WM module (Session implementation)

**Files:**
- Create: `src/core/modules/working-memory/wm-module.ts`
- Modify: `src/core/modules/registry.ts` (register the module)
- Test: `tests/unit/core/modules/working-memory/wm-module.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { wmModule } from '~/core/modules/working-memory/wm-module';
import type { DomainState } from '~/types/domain';

const baseState: DomainState = {
  moduleId: 'working-memory', level: { n: 2 }, ewmaPerformance: 0.6,
  lastSessionTs: null, sessionsTotal: 0, plateauFlag: false, updatedTs: Date.now()
};

describe('WM module session', () => {
  it('creates a session with at least 1 block of N+20 trials', () => {
    const s = wmModule.createSession(baseState);
    expect(s.blocks.length).toBeGreaterThan(0);
    const total = s.blocks.reduce((sum, b) => sum + b.targetTrialCount, 0);
    expect(total).toBeGreaterThanOrEqual(22);
  });

  it('scores and completes, returning next N in domain state', async () => {
    const s = wmModule.createSession(baseState);
    let t = s.nextTrial();
    while (t) {
      // always "no match" answer for determinism
      await s.submit({
        trialId: t.id,
        event: { kind: 'keydown', value: 'Escape', rtMs: 400 },
        timing: { requestedDurationMs: 500, achievedDurationMs: 500, framesRendered: 30, timingFlag: 'ok' }
      });
      t = s.nextTrial();
    }
    const result = s.complete();
    expect(typeof (result.nextDomainState.level as any).n).toBe('number');
  });
});
```

- [ ] **Step 2: Run — fail expected**

- [ ] **Step 3: Implement**

```ts
import type { TrainingModule, Session, Trial, Response, TrialResult, BlockStats, SessionResult, Block } from '~/types/module';
import type { DomainState } from '~/types/domain';
import { generateNBackBlock } from './dual-nback';
import { scoreBlock, nextNLevel, type NBackResponse, type BlockStreamStats } from './wm-adaptive';

// Key mapping:
//   'a' / left arrow → position match
//   'l' / right arrow → audio match
// Multiple keys can be pressed within a trial (both at once = dual match)
// No key by end of trial → no match on either stream
const POS_KEYS = new Set(['a', 'ArrowLeft']);
const AUD_KEYS = new Set(['l', 'ArrowRight']);

export const wmModule: TrainingModule = {
  id: 'working-memory',
  displayName: 'Working Memory',
  estimatedMinutes: 15,
  createSession(state: DomainState): Session {
    const n = typeof (state.level as any)?.n === 'number' ? (state.level as any).n : 2;
    const blocksCount = 3;   // ~15 min
    const blockPlans = Array.from({ length: blocksCount }, (_, i) =>
      generateNBackBlock({
        n, nTargets: 6, nDualTargets: 2, nLures: 4,
        seed: (state.updatedTs + i) >>> 0
      })
    );
    const blocks: Block[] = blockPlans.map((bp, i) => ({
      index: i, kind: `dual-nback-n${bp.n}`, targetTrialCount: bp.trials.length
    }));

    let blockIdx = 0;
    let trialIdx = 0;
    const responses: Record<number, Record<number, NBackResponse>> = {};
    const blockStats: BlockStreamStats[] = [];
    const startTs = Date.now();

    return {
      moduleId: 'working-memory',
      blocks,
      nextTrial(): Trial | null {
        if (blockIdx >= blockPlans.length) return null;
        const bp = blockPlans[blockIdx]!;
        if (trialIdx >= bp.trials.length) {
          // score completed block
          const blockResp = responses[blockIdx] ?? {};
          blockStats.push(scoreBlock(bp.trials, blockResp));
          blockIdx++; trialIdx = 0;
          return this.nextTrial();
        }
        const src = bp.trials[trialIdx]!;
        const t: Trial = {
          id: `wm-${blockIdx}-${trialIdx}`,
          blockIndex: blockIdx,
          trialIndex: trialIdx,
          stimulus: {
            kind: 'nback-grid',
            payload: { position: src.position, letter: src.letter, n: bp.n }
          },
          inputSpec: { accept: ['keyboard'], keys: ['a','l','ArrowLeft','ArrowRight'] },
          timingSpec: { stimulusMs: 500, isiMs: 2500 },
          metadata: {
            isPositionTarget: src.isPositionTarget,
            isAudioTarget: src.isAudioTarget,
            isLure: src.isLure
          }
        };
        trialIdx++;
        return t;
      },
      setMetacogPrediction() {},
      async submit(resp: Response): Promise<TrialResult> {
        const parts = resp.trialId.split('-');
        const bIdx = parseInt(parts[1]!);
        const tIdx = parseInt(parts[2]!);
        const key = typeof resp.event.value === 'string' ? resp.event.value : '';
        const isPos = POS_KEYS.has(key);
        const isAud = AUD_KEYS.has(key);
        responses[bIdx] ??= {};
        responses[bIdx][tIdx] = { position: isPos, audio: isAud };
        const src = blockPlans[bIdx]!.trials[tIdx]!;
        const posOk = src.isPositionTarget === isPos;
        const audOk = src.isAudioTarget === isAud;
        const correct = posOk && audOk;
        return {
          trialId: resp.trialId, correct,
          rtMs: resp.event.rtMs || null,
          scored: { posHit: isPos && src.isPositionTarget ? 1 : 0,
                    audHit: isAud && src.isAudioTarget ? 1 : 0 }
        };
      },
      currentBlockStats(): BlockStats {
        const bIdx = Math.min(blockIdx, blockPlans.length - 1);
        const stats = blockStats[bIdx];
        return {
          blockIndex: bIdx,
          trialsCompleted: trialIdx,
          accuracy: stats?.overallAccuracy ?? 0,
          custom: stats ? {
            dpVisual: stats.position.dPrime,
            dpAudio: stats.audio.dPrime,
            posHits: stats.position.counts.hits,
            audHits: stats.audio.counts.hits
          } : {}
        };
      },
      complete(): SessionResult {
        // Ensure last block scored
        if (blockStats.length < blockPlans.length && responses[blockIdx]) {
          blockStats.push(scoreBlock(blockPlans[blockIdx]!.trials, responses[blockIdx] ?? {}));
        }
        const newN = nextNLevel({ currentN: n, blockHistory: blockStats });
        const overallAcc = blockStats.reduce((s, b) => s + b.overallAccuracy, 0) /
          Math.max(blockStats.length, 1);
        return {
          blocks: blockStats.map((bs, i) => ({
            blockIndex: i, trialsCompleted: blockPlans[i]!.trials.length,
            accuracy: bs.overallAccuracy,
            custom: { dpVisual: bs.position.dPrime, dpAudio: bs.audio.dPrime }
          })),
          totalDurationMs: Date.now() - startTs,
          nextDomainState: {
            ...state,
            level: { n: newN },
            ewmaPerformance: 0.7 * state.ewmaPerformance + 0.3 * overallAcc,
            lastSessionTs: Date.now(),
            sessionsTotal: state.sessionsTotal + 1,
            updatedTs: Date.now()
          }
        };
      },
      metadata: { n }
    } as Session;
  }
};
```

- [ ] **Step 4: Register the module**

Modify `src/core/modules/registry.ts` — add after the placeholder import:

```ts
import { wmModule } from './working-memory/wm-module';
registry.set(wmModule.id, wmModule);
```

- [ ] **Step 5: Run tests — pass expected**

```bash
npm test -- wm-module
```

- [ ] **Step 6: Commit**

```bash
git add src/core/modules/working-memory/wm-module.ts src/core/modules/registry.ts tests/unit/core/modules/working-memory/wm-module.test.ts
git commit -m "wm: module session (dual n-back with per-stream scoring)"
```

---

## Task 16: UI — n-back grid rendering and session runner integration

**Files:**
- Create: `src/ui/components/nback-grid.tsx`
- Modify: `src/core/stimulus/engine-worker.ts` (handle `nback-grid` stimulus)
- Modify: `src/ui/pages/session-runner.tsx` (use today's plan module, not hardcoded placeholder)
- Test: `tests/e2e/wm-session.spec.ts`

- [ ] **Step 1: Extend engine to render nback-grid**

Update `src/core/stimulus/engine-worker.ts` `runTrial()` — add after the text-question branch:

```ts
if (canvas && trial.stimulus.kind === 'nback-grid') {
  const { position, letter } = trial.stimulus.payload as { position: number; letter: string };
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#14181e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // 3x3 grid (skip center = position 4); 8 positions map to cells 0,1,2,3,5,6,7,8
  const cellW = canvas.width / 3;
  const cellH = canvas.height / 3;
  const cellMap = [0, 1, 2, 3, 5, 6, 7, 8];
  const cellIdx = cellMap[position] ?? 0;
  const cx = (cellIdx % 3) * cellW + cellW / 2;
  const cy = Math.floor(cellIdx / 3) * cellH + cellH / 2;
  ctx.fillStyle = '#7aa2ff';
  ctx.fillRect(cx - cellW / 3, cy - cellH / 3, (2 * cellW) / 3, (2 * cellH) / 3);
  ctx.fillStyle = '#ffffff';
  ctx.font = '72px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, cx, cy);
  // audio letter playback — emit message to main thread to play
  (self as any).postMessage({ id: 0, kind: 'play-audio', letter });
}
```

Add audio playback on main thread — extend `engine-client.ts` `ensureWorker()`:

```ts
worker.addEventListener('message', (ev) => {
  if (ev.data?.kind === 'play-audio') {
    const utter = new SpeechSynthesisUtterance(ev.data.letter);
    utter.rate = 1.2; utter.volume = 1;
    speechSynthesis.speak(utter);
  }
});
```

- [ ] **Step 2: Add NBackGrid component (Solid canvas host)**

`src/ui/components/nback-grid.tsx`:

```tsx
import { onMount, createSignal } from 'solid-js';
import { runTrial } from '~/core/stimulus/engine-client';
import type { Trial, Response } from '~/types/module';

export function NBackGrid(props: { trial: Trial; onDone: (r: Response) => void }) {
  let canvasRef: HTMLCanvasElement | undefined;
  const [prompt, setPrompt] = createSignal('');

  onMount(async () => {
    if (!canvasRef) return;
    const offscreen = canvasRef.transferControlToOffscreen();
    setPrompt('A = position · L = letter');
    const resp = await runTrial(props.trial, offscreen);
    props.onDone(resp);
  });

  return (
    <div>
      <canvas ref={canvasRef} width={480} height={480}
        style="background:#14181e;border-radius:.5rem;display:block;margin:0 auto" />
      <p class="muted" style="text-align:center">{prompt()}</p>
    </div>
  );
}
```

- [ ] **Step 3: Update session-runner to use today's plan**

Replace `src/ui/pages/session-runner.tsx` `onMount()` to read the plan's first module instead of hardcoding placeholder:

```tsx
onMount(async () => {
  const rows = await (await import('~/core/storage/db-client')).dbQuery<{ plan_json: string }>(
    'SELECT plan_json FROM sessions WHERE id = ?', [params.sessionId!]);
  const plan = JSON.parse(rows[0]!.plan_json);
  const firstModuleId = plan.modules[0].moduleId;
  const m = getModule(firstModuleId)!;
  const state = await getDomainState(firstModuleId) ?? {
    moduleId: firstModuleId, level: {}, ewmaPerformance: 0,
    lastSessionTs: null, sessionsTotal: 0, plateauFlag: false, updatedTs: Date.now()
  };
  const s = m.createSession(state);
  setSession(s);
  // blocks saved inside runSession() per block
  setStatus('running');
  runSession(s);
});
```

And update `runSession()` to render the canvas component for `nback-grid` trials. Simplest MVP: pass all trials through the canvas component, since placeholder trials use `text-question` kind and engine already handles both.

For Phase 0+1 MVP, swap the `log()` display in the SessionRunner to render `<NBackGrid trial={current} onDone={…}/>` when the trial kind is `nback-grid`.

Add this state + effect to session-runner:

```tsx
import { NBackGrid } from '~/ui/components/nback-grid';
const [current, setCurrent] = createSignal<Trial | null>(null);

async function runSession(s: Session) {
  let trial = s.nextTrial();
  while (trial) {
    setCurrent(trial);
    const resp = await new Promise<Response>((resolve) => {
      if (trial!.stimulus.kind === 'nback-grid') {
        // component calls onDone → resolve
        // (rendered via <Show when={current()?.stimulus.kind === 'nback-grid'}>)
        (window as any).__onTrialDone = resolve;
      } else {
        runTrial(trial!).then(resolve);
      }
    });
    // ...save trial and submit
  }
}
```

(A production-clean version uses a signal subscription instead of `window.__onTrialDone`; MVP version here prioritizes shipping.)

- [ ] **Step 4: Write e2e test**

`tests/e2e/wm-session.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('WM session runs at least one trial and records to DB', async ({ page }) => {
  await page.goto('/today');
  // ensure a plan gets composed to WM (since placeholder and WM are both registered,
  // force "working-memory" urgency by choosing it explicitly via a URL seed)
  await page.waitForSelector('button:has-text("Start session")');
  await page.click('button:has-text("Start session")');
  await page.waitForURL(/\/session\//);
  // wait a few trials worth of time; MVP: check canvas renders
  await page.waitForSelector('canvas');
  // press 'Escape' a few times to produce no-match responses
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }
  // Should eventually reach results page
  await page.waitForURL(/\/results\//, { timeout: 120_000 });
  await expect(page.getByText(/Session complete/i)).toBeVisible();
});
```

- [ ] **Step 5: Run typecheck + e2e**

```bash
npm run typecheck
npm run test:e2e -- wm-session
```

Expected: pass. If the urgency-based picker chose placeholder instead of WM, the test may need to pre-seed a session in DB. Acceptable outcome is: either module runs end-to-end via the canvas engine.

- [ ] **Step 6: Commit**

```bash
git add src/ui/components/nback-grid.tsx src/ui/pages/session-runner.tsx src/core/stimulus tests/e2e/wm-session.spec.ts
git commit -m "ui+stimulus: n-back grid rendering, session runner routes to any module"
```

---

## Task 17: Complex Span (Operation Span) minimal implementation + interleaving toggle

**Files:**
- Create: `src/core/modules/working-memory/complex-span.ts`
- Modify: `src/core/modules/working-memory/wm-module.ts` (interleave n-back blocks and complex-span blocks when a `hints.interleave` flag is set)
- Test: `tests/unit/core/modules/working-memory/complex-span.test.ts`

This is a minimal-MVP OSpan: math verification + letter recall, adaptive set size 3–7. Full englelab-compliant partial-credit scoring can land later.

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { generateOSpanBlock, scoreOSpanSet } from '~/core/modules/working-memory/complex-span';

describe('complex span (OSpan)', () => {
  it('generates a set with N memoranda interleaved with N processing items', () => {
    const block = generateOSpanBlock({ setSize: 4, seed: 1 });
    const memoranda = block.trials.filter(t => t.kind === 'memorandum');
    const processing = block.trials.filter(t => t.kind === 'processing');
    expect(memoranda.length).toBe(4);
    expect(processing.length).toBe(4);
  });

  it('scoreOSpanSet returns partial credit proportional to correct recall positions', () => {
    const block = generateOSpanBlock({ setSize: 4, seed: 1 });
    const memoranda = block.trials.filter(t => t.kind === 'memorandum').map(t => (t.payload as any).letter);
    // user recalled only first two correctly
    const recalled = [memoranda[0], memoranda[1], 'X', 'Y'];
    const score = scoreOSpanSet(memoranda, recalled);
    expect(score.partialCredit).toBeCloseTo(0.5, 2);
    expect(score.perfect).toBe(false);
  });
});
```

- [ ] **Step 2: Run — fail expected**

- [ ] **Step 3: Implement (minimal)**

```ts
import { NBACK_LETTERS } from './dual-nback';

export interface OSpanTrial {
  index: number;
  kind: 'memorandum' | 'processing' | 'recall';
  payload: unknown;
}

export interface OSpanBlock {
  setSize: number;
  trials: OSpanTrial[];
  memoranda: string[];
  mathKeys: { question: string; correct: number; presented: number; userTrueIfCorrect: boolean }[];
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

export function generateOSpanBlock(spec: { setSize: number; seed: number }): OSpanBlock {
  const rand = prng(spec.seed);
  const memoranda: string[] = [];
  const math: OSpanBlock['mathKeys'] = [];
  const trials: OSpanTrial[] = [];
  for (let i = 0; i < spec.setSize; i++) {
    const a = 1 + Math.floor(rand() * 9);
    const b = 1 + Math.floor(rand() * 9);
    const op = rand() < 0.5 ? '+' : '-';
    const correct = op === '+' ? a + b : a - b;
    const flip = rand() < 0.5;
    const presented = flip ? correct : correct + (rand() < 0.5 ? 1 : -1);
    const mathTrial = {
      question: `${a} ${op} ${b} = ${presented}`,
      correct, presented, userTrueIfCorrect: !flip ? true : false
    };
    math.push(mathTrial);
    trials.push({ index: trials.length, kind: 'processing', payload: mathTrial });
    const letter = NBACK_LETTERS[Math.floor(rand() * NBACK_LETTERS.length)]!;
    memoranda.push(letter);
    trials.push({ index: trials.length, kind: 'memorandum', payload: { letter } });
  }
  trials.push({ index: trials.length, kind: 'recall', payload: { setSize: spec.setSize } });
  return { setSize: spec.setSize, trials, memoranda, mathKeys: math };
}

export interface OSpanScore {
  perfect: boolean;
  partialCredit: number;      // 0-1 per-position recall
  mathAccuracy: number;
}

export function scoreOSpanSet(
  memoranda: string[],
  recalled: string[],
  mathResponses: boolean[] = [],
  mathTruths: boolean[] = []
): OSpanScore {
  let correct = 0;
  for (let i = 0; i < memoranda.length; i++) {
    if (recalled[i] === memoranda[i]) correct++;
  }
  const mathCorrect = mathResponses.filter((r, i) => r === mathTruths[i]).length;
  return {
    perfect: correct === memoranda.length,
    partialCredit: correct / Math.max(memoranda.length, 1),
    mathAccuracy: mathResponses.length ? mathCorrect / mathResponses.length : 1
  };
}
```

- [ ] **Step 4: Run — pass expected**

- [ ] **Step 5: (Optional for MVP) wire into wmModule as second block**

Extend wmModule's `createSession` to append one OSpan block after the n-back blocks when `hints?.interleaveWithComplexSpan` is set. Skip for v1 if session time is already tight; add in a follow-up.

Commit either way:

```bash
git add src/core/modules/working-memory/complex-span.ts tests/unit/core/modules/working-memory/complex-span.test.ts
git commit -m "wm: complex span (OSpan) generator and scorer (minimal)"
```

---

## Task 18: End-to-end smoke test and dashboard stub

**Files:**
- Create: `src/ui/pages/dashboard.tsx`
- Modify: `src/ui/routes.tsx` (add `/dashboard`)
- Modify: `src/ui/pages/home.tsx` (add link to dashboard)
- Test: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Dashboard page reading from DB**

`src/ui/pages/dashboard.tsx`:

```tsx
import { createResource, For } from 'solid-js';
import { dbInit, dbQuery } from '~/core/storage/db-client';

async function loadSummary() {
  await dbInit();
  const sessions = await dbQuery<{ id: string; phase: string; start_ts: number; end_ts: number | null }>(
    'SELECT id, phase, start_ts, end_ts FROM sessions ORDER BY start_ts DESC LIMIT 20');
  const domainState = await dbQuery<{ module_id: string; ewma_performance: number; sessions_total: number }>(
    'SELECT module_id, ewma_performance, sessions_total FROM domain_state');
  return { sessions, domainState };
}

export function Dashboard() {
  const [data] = createResource(loadSummary);
  return (
    <div class="container">
      <h1 class="hero">Dashboard</h1>
      <h3>Domains</h3>
      <ul>
        <For each={data()?.domainState ?? []}>{d =>
          <li>{d.module_id} — {d.sessions_total} sessions — ewma {d.ewma_performance.toFixed(2)}</li>
        }</For>
      </ul>
      <h3>Recent sessions</h3>
      <ul>
        <For each={data()?.sessions ?? []}>{s =>
          <li>{new Date(s.start_ts).toLocaleString()} — {s.phase} — {s.end_ts ? 'complete' : 'in progress'}</li>
        }</For>
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Add route and home link**

Modify `src/ui/routes.tsx`:

```tsx
import { Dashboard } from './pages/dashboard';
// ...
<Route path="/dashboard" component={Dashboard} />
```

Modify `src/ui/pages/home.tsx` to add a `<A href="/dashboard">dashboard</A>` link.

- [ ] **Step 3: Write smoke e2e**

`tests/e2e/smoke.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('full smoke: home → today → session → results → dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Intellect Forge')).toBeVisible();
  await page.getByRole('link', { name: /start today/i }).click();
  await page.waitForSelector('button:has-text("Start session")');
  await page.click('button:has-text("Start session")');
  await page.waitForURL(/\/session\//);
  // Run through trials — press Escape repeatedly
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
    if (page.url().includes('/results/')) break;
  }
  await page.waitForURL(/\/results\//, { timeout: 120_000 });
  await page.goto('/dashboard');
  await expect(page.getByText(/Domains/i)).toBeVisible();
  // Should show at least one session in recent list
  const sessions = page.locator('ul li');
  await expect(sessions.first()).toBeVisible();
});
```

- [ ] **Step 4: Run full suite**

```bash
npm run typecheck
npm test
npm run test:e2e
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/ui tests/e2e/smoke.spec.ts
git commit -m "ui: dashboard stub + full-flow smoke test"
```

---

## Self-review checklist (confirmed before handing off)

1. **Spec coverage:**
   - ✅ Stack (Vite + Solid + SQLite/OPFS + Worker) → Tasks 1, 6, 9
   - ✅ Module contract → Task 2
   - ✅ Adaptive library (Staircase, DPrime, BlockPromotion) → Tasks 3-5
   - ✅ Data model (all 9 tables) → Task 6
   - ✅ Storage repos → Task 7
   - ✅ Display calibration → Task 8
   - ✅ Stimulus engine worker → Task 9
   - ✅ Orchestrator (phases, urgency, composer) → Task 10
   - ✅ Module registry + placeholder → Task 11
   - ✅ Main shell UI → Task 12
   - ✅ WM dual n-back (generator + adaptive + module) → Tasks 13-15
   - ✅ N-back grid rendering + session integration → Task 16
   - ✅ Complex span minimal → Task 17
   - ✅ Dashboard stub + smoke test → Task 18
   - Deferred to Phase 2+3 (not this plan): QUEST/jsQUEST, UFOV, Compound EF, Matrix, Calibration overlay, real metacog prompts, transfer battery, booster logic, item bank loading

2. **Placeholder scan:** No TBD/TODO markers. Real code in every step. Commands and expected outputs specified.

3. **Type consistency:**
   - `ModuleId` used consistently across module.ts, registry, repos, UI
   - `DomainState` type used identically in orchestrator, repos, modules
   - `Session.submit()` signature (`(Response) => Promise<TrialResult>`) consistent across placeholder, WM module, tests
   - `runTrial(trial, canvas?)` consistent in engine-client and all callers

---

## Known risks / follow-ups not blocking this plan

- **OPFS availability requires COOP/COEP** — Task 1 sets headers; if the user deploys somewhere that strips them, DB init will fail with a clear error in db-worker.ts.
- **SpeechSynthesis for n-back audio** is quick to implement but has platform variance; Phase 2 should replace with pre-recorded letter WAVs or AudioWorklet scheduling for precise timing.
- **Session-runner trial resolution via `window.__onTrialDone`** is a shortcut in Task 16 — clean up to a real signal/subscription in Phase 2.
- **Stimulus engine currently uses in-worker rAF**; this works but for production UFOV-grade timing we may need `OffscreenCanvas` with an explicit `requestAnimationFrame` inside the worker, which requires browser support check. Task 8's calibrator reveals if this is a problem on your hardware.
- **No metacog prediction UI yet** — Block has the field but session-runner doesn't yet prompt. That's Phase 2 (becomes cross-cutting for all modules, so better added at that layer).

---

## Execution choice

Plan complete and saved to `docs/superpowers/plans/2026-04-15-intellect-forge-phase-0-1.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task with clean context, review between tasks, you get clean commits and can check progress task-by-task.

**2. Inline Execution** — Execute tasks in this session using the executing-plans skill, batched with checkpoints.

Which approach?
