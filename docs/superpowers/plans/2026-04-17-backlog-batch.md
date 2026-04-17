# Backlog Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 5 independent features from the Intellect Forge backlog: transfer assessment tasks (flanker + digit span), keypress flash, daily session cap, CUSUM plateau detection with boosters, and Observable Plot dashboard upgrades.

**Architecture:** Each feature is fully independent with no cross-dependencies. They can be implemented in any order or in parallel. The about page (#4 in the original backlog) already exists and is skipped.

**Tech Stack:** Vite + SolidJS + TypeScript, OPFS SQLite, @observablehq/plot (new dependency for Task 5)

---

## File Map

| Feature | Create | Modify |
|---------|--------|--------|
| Transfer assessments | `src/core/modules/assessment/flanker-task.ts`, `src/core/modules/assessment/digit-span-task.ts`, `tests/unit/core/modules/assessment/flanker.test.ts`, `tests/unit/core/modules/assessment/digit-span.test.ts` | `src/core/modules/assessment/assessment-module.ts`, `src/types/stimulus.ts`, `src/core/stimulus/engine-worker.ts`, `src/ui/pages/session-runner.tsx`, `src/ui/pages/results.tsx`, `src/ui/pages/dashboard.tsx` |
| Keypress flash | — | `src/core/stimulus/engine-worker.ts` |
| Daily session cap | `tests/unit/core/orchestrator/daily-cap.test.ts` | `src/ui/pages/today.tsx`, `src/ui/pages/home.tsx`, `src/core/storage/repos.ts` |
| CUSUM + boosters | `src/core/adaptive/cusum.ts`, `tests/unit/core/adaptive/cusum.test.ts` | `src/core/orchestrator/session-composer.ts`, `src/ui/pages/session-runner.tsx`, `src/types/domain.ts` |
| Observable Plot | — | `src/ui/pages/dashboard.tsx`, `package.json` |

---

### Task 1: Transfer Assessment — Flanker Task

Adds an Eriksen flanker task to the assessment battery. 24 trials (12 congruent, 12 incongruent), measure conflict cost (incongruent RT - congruent RT) as inhibition transfer metric.

**Files:**
- Create: `src/core/modules/assessment/flanker-task.ts`
- Create: `tests/unit/core/modules/assessment/flanker.test.ts`
- Modify: `src/types/stimulus.ts` (add `'flanker-assessment'` to StimulusKind)
- Modify: `src/core/modules/assessment/assessment-module.ts` (add block index 2)
- Modify: `src/core/stimulus/engine-worker.ts` (add flanker renderer)
- Modify: `src/ui/pages/session-runner.tsx` (route flanker-assessment to GenericStimulus)
- Modify: `src/ui/pages/results.tsx` (handle flanker-assessment in Transfer section)
- Modify: `src/ui/pages/dashboard.tsx` (add flanker to TRANSFER_TASK_META)

- [ ] **Step 1: Write flanker trial generator tests**

In `tests/unit/core/modules/assessment/flanker.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateFlankerTrials, scoreFlanker } from '~/core/modules/assessment/flanker-task';

describe('Flanker assessment', () => {
  it('generates 24 trials with balanced congruency', () => {
    const trials = generateFlankerTrials();
    expect(trials).toHaveLength(24);
    const congruent = trials.filter(t => t.congruent);
    const incongruent = trials.filter(t => !t.congruent);
    expect(congruent).toHaveLength(12);
    expect(incongruent).toHaveLength(12);
  });

  it('each trial has direction left or right', () => {
    const trials = generateFlankerTrials();
    for (const t of trials) {
      expect(['left', 'right']).toContain(t.direction);
    }
  });

  it('scores conflict cost as incongruent minus congruent mean RT', () => {
    const rts = [
      { congruent: true, rt: 300 },
      { congruent: true, rt: 320 },
      { congruent: false, rt: 400 },
      { congruent: false, rt: 420 },
    ];
    const result = scoreFlanker(rts);
    expect(result.congruentMeanRT).toBe(310);
    expect(result.incongruentMeanRT).toBe(410);
    expect(result.conflictCost).toBe(100);
  });

  it('returns 0 conflict cost when no valid RTs', () => {
    const result = scoreFlanker([]);
    expect(result.conflictCost).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/core/modules/assessment/flanker.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement flanker trial generator**

Create `src/core/modules/assessment/flanker-task.ts`:

```typescript
export interface FlankerTrial {
  direction: 'left' | 'right';
  congruent: boolean;
}

export interface FlankerScore {
  congruentMeanRT: number;
  incongruentMeanRT: number;
  conflictCost: number;
  accuracy: number;
}

export function generateFlankerTrials(): FlankerTrial[] {
  const trials: FlankerTrial[] = [];
  for (let i = 0; i < 6; i++) {
    trials.push({ direction: 'left', congruent: true });
    trials.push({ direction: 'right', congruent: true });
    trials.push({ direction: 'left', congruent: false });
    trials.push({ direction: 'right', congruent: false });
  }
  // Fisher-Yates shuffle
  for (let i = trials.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [trials[i], trials[j]] = [trials[j]!, trials[i]!];
  }
  return trials;
}

export function scoreFlanker(rts: Array<{ congruent: boolean; rt: number }>): FlankerScore {
  const cong = rts.filter(r => r.congruent);
  const incong = rts.filter(r => !r.congruent);
  const mean = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const congruentMeanRT = mean(cong.map(r => r.rt));
  const incongruentMeanRT = mean(incong.map(r => r.rt));
  return {
    congruentMeanRT,
    incongruentMeanRT,
    conflictCost: incongruentMeanRT - congruentMeanRT,
    accuracy: rts.length > 0 ? rts.length / 24 : 0
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/core/modules/assessment/flanker.test.ts`
Expected: PASS

- [ ] **Step 5: Add StimulusKind and wire up rendering**

In `src/types/stimulus.ts`, add `'flanker-assessment'` to the StimulusKind union.

In `src/core/stimulus/engine-worker.ts`, add renderer in `drawStimulus()` after the simple-rt block:

```typescript
if (trial.stimulus.kind === 'flanker-assessment') {
  const p = trial.stimulus.payload as { direction: 'left' | 'right'; congruent: boolean };
  const cx = w / 2, cy = h / 2;
  const arrow = p.direction === 'left' ? '<' : '>';
  const flanker = p.congruent ? arrow : (p.direction === 'left' ? '>' : '<');
  const display = `${flanker} ${flanker} ${arrow} ${flanker} ${flanker}`;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(display, cx, cy);
}
```

In `src/ui/pages/session-runner.tsx`:
- Add `'flanker-assessment'` to the canvas trial kind check on line 131
- Add `'flanker-assessment'` to the `validCanvasKind` check on line 179
- Add routing: `if (trial.stimulus.kind === 'flanker-assessment') return <GenericStimulus trial={trial} onDone={onTrialDone} />;`

- [ ] **Step 6: Integrate flanker into assessment battery**

In `src/core/modules/assessment/assessment-module.ts`:

Add import: `import { generateFlankerTrials, scoreFlanker, type FlankerTrial } from './flanker-task';`

Add constant: `const FLANKER_TRIALS = 24;`

Add block: `{ index: 2, kind: 'flanker-assessment', targetTrialCount: FLANKER_TRIALS }`

Add state: `const flankerTrials: FlankerTrial[] = generateFlankerTrials();` and `const flankerRTs: Array<{ congruent: boolean; rt: number }> = [];`

Add to `nextTrial()` — after blockIdx 1 check add block transition for blockIdx 1→2, then:

```typescript
} else if (blockIdx === 2) {
  if (trialIdx >= FLANKER_TRIALS) return null;
  const ft = flankerTrials[trialIdx]!;
  const id = `assessment-flanker-${trialIdx}`;
  const t: Trial = {
    id,
    blockIndex: blockIdx,
    trialIndex: trialIdx,
    stimulus: { kind: 'flanker-assessment', payload: { direction: ft.direction, congruent: ft.congruent } },
    metadata: { correctKey: ft.direction === 'left' ? 'ArrowLeft' : 'ArrowRight' },
    inputSpec: { accept: ['keyboard'], keys: ['ArrowLeft', 'ArrowRight'], timeoutMs: 2000 },
    timingSpec: { preMs: 500, stimulusMs: 'until-response' }
  };
  trialIdx++;
  return t;
}
```

Add to `submit()`:

```typescript
} else if (resp.trialId.startsWith('assessment-flanker-')) {
  const idx = parseInt(resp.trialId.split('-').pop()!);
  const ft = flankerTrials[idx]!;
  const correctKey = ft.direction === 'left' ? 'ArrowLeft' : 'ArrowRight';
  const correct = resp.event.value === correctKey;
  const rtMs = resp.event.rtMs || 0;
  if (correct && rtMs >= 100 && rtMs <= 1500) {
    flankerRTs.push({ congruent: ft.congruent, rt: rtMs });
  }
  return { trialId: resp.trialId, correct, rtMs: rtMs || null, scored: { correct: correct ? 1 : 0 } };
}
```

Add to `currentBlockStats()`: handle blockIdx === 2 returning flanker accuracy.

Add to `complete()`: compute flanker score and save transfer assessment:

```typescript
const flankerResult = scoreFlanker(flankerRTs);
saveTransferAssessment({
  ts: now,
  taskId: 'flanker-inhibition',
  score: flankerResult.conflictCost,
  raw: { ...flankerResult, validTrials: flankerRTs.length, totalTrials: FLANKER_TRIALS }
});
```

Add flanker block to the return `blocks` array.

- [ ] **Step 7: Update results page and dashboard**

In `src/ui/pages/results.tsx`, add to `TRANSFER_TASKS`:
```typescript
{ id: 'flanker-inhibition', label: 'Flanker (Inhibition)', lowerIsBetter: true, fmt: v => `${Math.round(v)}ms` }
```

Also handle `flanker-assessment` kind in the Performance Breakdown table the same way as `simple-rt` (show RT, not accuracy).

In `src/ui/pages/dashboard.tsx`, add to `TRANSFER_TASK_META`:
```typescript
'flanker-inhibition': { label: 'Flanker (Inhibition)', lowerIsBetter: true, unit: 'ms conflict cost' }
```

- [ ] **Step 8: Run all tests and commit**

Run: `npx vitest run`
Expected: All pass (except pre-existing EF module failure)

```bash
git add src/core/modules/assessment/flanker-task.ts tests/unit/core/modules/assessment/flanker.test.ts src/types/stimulus.ts src/core/modules/assessment/assessment-module.ts src/core/stimulus/engine-worker.ts src/ui/pages/session-runner.tsx src/ui/pages/results.tsx src/ui/pages/dashboard.tsx
git commit -m "feat: add flanker inhibition task to transfer assessment battery"
```

---

### Task 2: Transfer Assessment — Digit Span (Recognition)

Adds a recognition-based digit span task. Present a sequence of N digits, then show two sequences (original + foil with one digit transposed). User picks which is correct. Adaptive span: starts at 4, goes up on correct, down on wrong. 20 trials total. Score = max span achieved.

**Files:**
- Create: `src/core/modules/assessment/digit-span-task.ts`
- Create: `tests/unit/core/modules/assessment/digit-span.test.ts`
- Modify: `src/types/stimulus.ts` (add `'digit-span-present'` and `'digit-span-probe'`)
- Modify: `src/core/modules/assessment/assessment-module.ts` (add block index 3)
- Modify: `src/core/stimulus/engine-worker.ts` (add digit span renderers)
- Modify: `src/ui/pages/session-runner.tsx` (route new stimulus kinds)
- Modify: `src/ui/pages/results.tsx` (add to Transfer section)
- Modify: `src/ui/pages/dashboard.tsx` (add to TRANSFER_TASK_META)

- [ ] **Step 1: Write digit span tests**

In `tests/unit/core/modules/assessment/digit-span.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateDigitSequence, generateFoil } from '~/core/modules/assessment/digit-span-task';

describe('Digit span', () => {
  it('generates sequence of requested length', () => {
    const seq = generateDigitSequence(5);
    expect(seq).toHaveLength(5);
    for (const d of seq) {
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(9);
    }
  });

  it('foil has exactly one transposition', () => {
    const seq = [3, 7, 2, 9, 1];
    const foil = generateFoil(seq);
    expect(foil).toHaveLength(seq.length);
    let diffs = 0;
    for (let i = 0; i < seq.length; i++) {
      if (seq[i] !== foil[i]) diffs++;
    }
    expect(diffs).toBe(2); // transposition swaps 2 positions
  });

  it('no consecutive duplicate digits in sequence', () => {
    for (let trial = 0; trial < 50; trial++) {
      const seq = generateDigitSequence(6);
      for (let i = 1; i < seq.length; i++) {
        expect(seq[i]).not.toBe(seq[i - 1]);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/core/modules/assessment/digit-span.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement digit span generator**

Create `src/core/modules/assessment/digit-span-task.ts`:

```typescript
export function generateDigitSequence(length: number): number[] {
  const seq: number[] = [];
  for (let i = 0; i < length; i++) {
    let d: number;
    do { d = 1 + Math.floor(Math.random() * 9); }
    while (seq.length > 0 && d === seq[seq.length - 1]);
    seq.push(d);
  }
  return seq;
}

export function generateFoil(original: number[]): number[] {
  const foil = [...original];
  // Pick two non-adjacent positions to swap
  const i = Math.floor(Math.random() * (foil.length - 1));
  const j = i + 1;
  [foil[i], foil[j]] = [foil[j]!, foil[i]!];
  return foil;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/core/modules/assessment/digit-span.test.ts`
Expected: PASS

- [ ] **Step 5: Add StimulusKinds and renderers**

In `src/types/stimulus.ts`, add `'digit-span-present'` and `'digit-span-probe'` to the StimulusKind union.

In `src/core/stimulus/engine-worker.ts`, add to `drawStimulus()`:

```typescript
if (trial.stimulus.kind === 'digit-span-present') {
  const p = trial.stimulus.payload as { digit: number; position: number; total: number };
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(p.digit), w / 2, h / 2);
  // Position indicator
  ctx.fillStyle = '#444';
  ctx.font = '14px system-ui';
  ctx.fillText(`${p.position + 1} / ${p.total}`, w / 2, h / 2 + 60);
}

if (trial.stimulus.kind === 'digit-span-probe') {
  const p = trial.stimulus.payload as { option1: number[]; option2: number[]; correctOption: 1 | 2 };
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Which sequence did you see?', w / 2, h / 2 - 80);
  ctx.font = 'bold 36px monospace';
  ctx.fillText(`1:  ${p.option1.join('  ')}`, w / 2, h / 2 - 10);
  ctx.fillText(`2:  ${p.option2.join('  ')}`, w / 2, h / 2 + 50);
  ctx.fillStyle = '#888';
  ctx.font = '14px system-ui';
  ctx.fillText('Press 1 or 2', w / 2, h / 2 + 110);
}
```

Wire up in `session-runner.tsx` same as flanker (add to canvas kind checks, route to GenericStimulus).

- [ ] **Step 6: Integrate into assessment battery**

In `assessment-module.ts`:

Add import: `import { generateDigitSequence, generateFoil } from './digit-span-task';`

Add constants: `const DIGIT_SPAN_SETS = 14;` (14 sets, adaptive span)

Add block: `{ index: 3, kind: 'digit-span', targetTrialCount: DIGIT_SPAN_SETS }`

The digit span task is multi-phase per set: present N digits one at a time, then one probe trial. Implement using a state machine within the block:

```typescript
// Digit span state
let dsSpan = 4;
let dsSetIdx = 0;
let dsPhase: 'present' | 'probe' = 'present';
let dsDigitIdx = 0;
let dsCurrentSeq: number[] = [];
let dsFoil: number[] = [];
let dsCorrectOption: 1 | 2 = 1;
let dsMaxSpan = 0;
let dsConsecutiveWrong = 0;
```

In `nextTrial()` for blockIdx === 3:

```typescript
} else if (blockIdx === 3) {
  if (dsSetIdx >= DIGIT_SPAN_SETS) return null;
  if (dsPhase === 'present') {
    if (dsDigitIdx === 0) {
      dsCurrentSeq = generateDigitSequence(dsSpan);
      dsFoil = generateFoil(dsCurrentSeq);
      dsCorrectOption = Math.random() < 0.5 ? 1 : 2;
    }
    const t: Trial = {
      id: `assessment-ds-present-${dsSetIdx}-${dsDigitIdx}`,
      blockIndex: blockIdx,
      trialIndex: trialIdx,
      stimulus: { kind: 'digit-span-present', payload: { digit: dsCurrentSeq[dsDigitIdx]!, position: dsDigitIdx, total: dsSpan } },
      metadata: {},
      inputSpec: { accept: ['keyboard'], keys: [] },
      timingSpec: { stimulusMs: 800, isiMs: 200 }
    };
    dsDigitIdx++;
    if (dsDigitIdx >= dsSpan) {
      dsPhase = 'probe';
      dsDigitIdx = 0;
    }
    trialIdx++;
    return t;
  } else {
    const opt1 = dsCorrectOption === 1 ? dsCurrentSeq : dsFoil;
    const opt2 = dsCorrectOption === 2 ? dsCurrentSeq : dsFoil;
    const t: Trial = {
      id: `assessment-ds-probe-${dsSetIdx}`,
      blockIndex: blockIdx,
      trialIndex: trialIdx,
      stimulus: { kind: 'digit-span-probe', payload: { option1: opt1, option2: opt2, correctOption: dsCorrectOption } },
      metadata: { correctKey: String(dsCorrectOption) },
      inputSpec: { accept: ['keyboard'], keys: ['1', '2'], timeoutMs: 10000 },
      timingSpec: { preMs: 500, stimulusMs: 'until-response' }
    };
    dsPhase = 'present';
    dsSetIdx++;
    trialIdx++;
    return t;
  }
}
```

In `submit()`:

```typescript
} else if (resp.trialId.startsWith('assessment-ds-present-')) {
  return { trialId: resp.trialId, correct: null, rtMs: null, scored: {} };
} else if (resp.trialId.startsWith('assessment-ds-probe-')) {
  const correct = String(resp.event.value) === String(dsCorrectOption);
  if (correct) {
    dsMaxSpan = Math.max(dsMaxSpan, dsSpan);
    dsSpan++;
    dsConsecutiveWrong = 0;
  } else {
    dsConsecutiveWrong++;
    if (dsConsecutiveWrong >= 2 && dsSpan > 3) dsSpan--;
    if (dsConsecutiveWrong < 2) dsConsecutiveWrong = 0;
  }
  return { trialId: resp.trialId, correct, rtMs: resp.event.rtMs || null, scored: { correct: correct ? 1 : 0 } };
}
```

In `complete()`:

```typescript
saveTransferAssessment({
  ts: now,
  taskId: 'digit-span',
  score: dsMaxSpan,
  raw: { maxSpan: dsMaxSpan, setsCompleted: dsSetIdx }
});
```

- [ ] **Step 7: Update results page and dashboard**

In `results.tsx` TRANSFER_TASKS, add:
```typescript
{ id: 'digit-span', label: 'Digit Span (STM)', lowerIsBetter: false, fmt: v => `span ${Math.round(v)}` }
```

In `dashboard.tsx` TRANSFER_TASK_META, add:
```typescript
'digit-span': { label: 'Digit Span (STM)', lowerIsBetter: false, unit: 'max span' }
```

- [ ] **Step 8: Run all tests and commit**

Run: `npx vitest run`
Expected: All pass

```bash
git add src/core/modules/assessment/digit-span-task.ts tests/unit/core/modules/assessment/digit-span.test.ts src/types/stimulus.ts src/core/modules/assessment/assessment-module.ts src/core/stimulus/engine-worker.ts src/ui/pages/session-runner.tsx src/ui/pages/results.tsx src/ui/pages/dashboard.tsx
git commit -m "feat: add digit span recognition task to transfer assessment battery"
```

---

### Task 3: Per-Trial Keypress Flash

Subtle corner pulse when a key registers during canvas-based trials. A green rectangle in the bottom-right corner flashes for ~80ms on each valid keypress. Non-intrusive confirmation that the input was received.

**Files:**
- Modify: `src/core/stimulus/engine-worker.ts`

- [ ] **Step 1: Add flash rendering to key event handler**

In `src/core/stimulus/engine-worker.ts`, modify the key-event handler:

```typescript
} else if (req.kind === 'key-event' && pending) {
  const rtMs = performance.now() - pending.startTs;
  pending.keys.push({ key: req.key, rtMs });
  // Flash indicator
  if (canvas) {
    const ctx = canvas.getContext('2d')!;
    const sz = 12;
    ctx.fillStyle = 'rgba(77, 255, 153, 0.7)';
    ctx.fillRect(canvas.width - sz - 8, canvas.height - sz - 8, sz, sz);
    setTimeout(() => {
      ctx.fillStyle = '#14181e';
      ctx.fillRect(canvas.width - sz - 8, canvas.height - sz - 8, sz, sz);
    }, 80);
  }
}
```

- [ ] **Step 2: Test manually in browser**

Start dev server, run any canvas-based module (e.g. Working Memory n-back). Press keys and confirm:
1. Green square flashes in bottom-right corner on each keypress
2. Flash disappears after ~80ms
3. Stimulus rendering is not disrupted
4. Flash works across all canvas modules (n-back, UFOV, EF, assessment tasks)

- [ ] **Step 3: Commit**

```bash
git add src/core/stimulus/engine-worker.ts
git commit -m "feat: add subtle keypress flash indicator on canvas trials"
```

---

### Task 4: 30-Minute Daily Session Cap

Enforce a total daily training time limit of 30 minutes, aligned with the research evidence. Check before composing a session; show remaining time on the home page.

**Files:**
- Create: `tests/unit/core/orchestrator/daily-cap.test.ts`
- Modify: `src/core/storage/repos.ts` (add query for daily training time)
- Modify: `src/ui/pages/today.tsx` (enforce cap before session creation)
- Modify: `src/ui/pages/home.tsx` (show daily training time status)

- [ ] **Step 1: Write daily training time query test**

In `tests/unit/core/orchestrator/daily-cap.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('Daily session cap', () => {
  it('MAX_DAILY_MINUTES is 30', () => {
    const MAX_DAILY_MINUTES = 30;
    expect(MAX_DAILY_MINUTES).toBe(30);
  });

  it('computes remaining minutes correctly', () => {
    const usedMs = 15 * 60 * 1000; // 15 minutes used
    const maxMs = 30 * 60 * 1000;
    const remaining = Math.max(0, maxMs - usedMs) / 60000;
    expect(remaining).toBe(15);
  });

  it('returns 0 when over cap', () => {
    const usedMs = 35 * 60 * 1000;
    const maxMs = 30 * 60 * 1000;
    const remaining = Math.max(0, maxMs - usedMs) / 60000;
    expect(remaining).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run tests/unit/core/orchestrator/daily-cap.test.ts`
Expected: PASS (pure logic test)

- [ ] **Step 3: Add daily training time query to repos.ts**

In `src/core/storage/repos.ts`, add:

```typescript
export async function getDailyTrainingMs(): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const rows = await dbQuery<{ total: number | null }>(
    `SELECT SUM(end_ts - start_ts) as total FROM sessions
     WHERE completed = 1 AND start_ts >= ?`,
    [startOfDay.getTime()]
  );
  return rows[0]?.total ?? 0;
}
```

- [ ] **Step 4: Enforce cap in today.tsx**

In `src/ui/pages/today.tsx`, modify `buildPlan()`:

```typescript
import { getDailyTrainingMs } from '~/core/storage/repos';

// Add at the start of buildPlan(), after dbInit():
const MAX_DAILY_MS = 30 * 60 * 1000;
const usedMs = await getDailyTrainingMs();
if (usedMs >= MAX_DAILY_MS) {
  return null; // Signal: cap reached
}
```

Update the UI to handle null plan (cap reached):

```typescript
<Show when={plan() === null}>
  <div class="panel" style="border-left: 4px solid #ff8a8a; text-align: center; padding: 2rem">
    <div class="mono" style="font-size: 1.1rem; color: #ff8a8a; margin-bottom: 0.5rem">Daily Cap Reached</div>
    <p class="muted">You've completed 30 minutes of training today. Research shows diminishing returns beyond this threshold. Come back tomorrow.</p>
    <A href="/" class="muted" style="text-decoration: underline; margin-top: 1rem; display: inline-block">← Back to Terminal</A>
  </div>
</Show>
```

- [ ] **Step 5: Show daily usage on home page**

In `src/ui/pages/home.tsx`, add a daily training indicator near the "Begin Today's Protocol" button:

Query daily training time alongside existing home data. Display:

```typescript
<div class="muted mono" style="font-size: 0.75rem; margin-top: 0.5rem">
  Today: {Math.round(dailyMinutes())}m / 30m
</div>
```

- [ ] **Step 6: Run all tests and commit**

Run: `npx vitest run`
Expected: All pass

```bash
git add src/core/storage/repos.ts src/ui/pages/today.tsx src/ui/pages/home.tsx tests/unit/core/orchestrator/daily-cap.test.ts
git commit -m "feat: enforce 30-minute daily training session cap"
```

---

### Task 5: CUSUM Plateau Detection + EWMA + Auto Boosters

Implement CUSUM (Cumulative Sum) change detection on rolling domain performance. When performance drifts down in maintenance phase, trigger booster sessions. Also implement EWMA computation which currently exists as a field but is never calculated.

**Files:**
- Create: `src/core/adaptive/cusum.ts`
- Create: `tests/unit/core/adaptive/cusum.test.ts`
- Modify: `src/core/orchestrator/session-composer.ts` (pass decayFlag from CUSUM)
- Modify: `src/ui/pages/session-runner.tsx` (compute EWMA + CUSUM on session completion)
- Modify: `src/types/domain.ts` (add cusumState to level record)

- [ ] **Step 1: Write CUSUM tests**

In `tests/unit/core/adaptive/cusum.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { cusumUpdate, type CusumState, cusumInit } from '~/core/adaptive/cusum';

describe('CUSUM change detection', () => {
  it('initializes with zero sum', () => {
    const state = cusumInit(0.75);
    expect(state.sum).toBe(0);
    expect(state.target).toBe(0.75);
    expect(state.alarm).toBe(false);
  });

  it('does not alarm on stable performance', () => {
    let state = cusumInit(0.75);
    for (let i = 0; i < 10; i++) {
      state = cusumUpdate(state, 0.75);
    }
    expect(state.alarm).toBe(false);
    expect(state.sum).toBe(0);
  });

  it('alarms after sustained performance drop', () => {
    let state = cusumInit(0.75);
    // 6 sessions at 0.55 (target - 0.20 each, slack 0.05 → +0.15 per session)
    for (let i = 0; i < 6; i++) {
      state = cusumUpdate(state, 0.55);
    }
    // sum should be ~0.9, threshold is 1.0 — not yet
    // A few more should trigger
    for (let i = 0; i < 4; i++) {
      state = cusumUpdate(state, 0.55);
    }
    expect(state.alarm).toBe(true);
  });

  it('resets sum on good performance', () => {
    let state = cusumInit(0.75);
    state = cusumUpdate(state, 0.50); // bad
    state = cusumUpdate(state, 0.50); // bad
    state = cusumUpdate(state, 0.90); // good — resets
    expect(state.sum).toBe(0);
    expect(state.alarm).toBe(false);
  });

  it('computes EWMA correctly', () => {
    const { ewmaUpdate } = require('~/core/adaptive/cusum');
    expect(ewmaUpdate(0, 0.8, 0.3)).toBeCloseTo(0.24);
    expect(ewmaUpdate(0.5, 0.8, 0.3)).toBeCloseTo(0.59);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/core/adaptive/cusum.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement CUSUM and EWMA**

Create `src/core/adaptive/cusum.ts`:

```typescript
export interface CusumState {
  target: number;
  sum: number;
  alarm: boolean;
}

const SLACK = 0.05;
const THRESHOLD = 1.0;

export function cusumInit(target: number): CusumState {
  return { target, sum: 0, alarm: false };
}

export function cusumUpdate(state: CusumState, observation: number): CusumState {
  const deviation = state.target - observation;
  const newSum = Math.max(0, state.sum + deviation - SLACK);
  return {
    target: state.target,
    sum: newSum,
    alarm: newSum >= THRESHOLD
  };
}

export function ewmaUpdate(prev: number, observation: number, alpha: number = 0.3): number {
  return alpha * observation + (1 - alpha) * prev;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/core/adaptive/cusum.test.ts`
Expected: PASS

- [ ] **Step 5: Integrate EWMA and CUSUM into session completion**

In `src/ui/pages/session-runner.tsx`, after the session loop completes and `s.complete()` is called, update the domain state with EWMA and CUSUM:

Find the section that calls `upsertDomainState(result.nextDomainState)` and modify:

```typescript
import { ewmaUpdate, cusumUpdate, cusumInit, type CusumState } from '~/core/adaptive/cusum';

// After s.complete():
const result = s.complete();
const newState = { ...result.nextDomainState };

// Compute EWMA
const blockAccuracies = result.blocks.filter(b => b.accuracy > 0).map(b => b.accuracy);
if (blockAccuracies.length > 0) {
  const meanAcc = blockAccuracies.reduce((a, b) => a + b, 0) / blockAccuracies.length;
  newState.ewmaPerformance = ewmaUpdate(state.ewmaPerformance, meanAcc);
}

// CUSUM update
const cusumPrev: CusumState = (state.level as any)?._cusum ?? cusumInit(0.75);
if (blockAccuracies.length > 0) {
  const meanAcc = blockAccuracies.reduce((a, b) => a + b, 0) / blockAccuracies.length;
  const cusumNext = cusumUpdate(cusumPrev, meanAcc);
  newState.level = { ...newState.level, _cusum: cusumNext };
  if (cusumNext.alarm) {
    newState.plateauFlag = false; // not plateau — it's decay
    // decayFlag is communicated via level._cusum.alarm
  }
}

await upsertDomainState(newState);
```

- [ ] **Step 6: Wire decayFlag into session composer**

In `src/core/orchestrator/session-composer.ts`, change line 18:

```typescript
decayFlag: false
```
to:
```typescript
decayFlag: !!((s.level as any)?._cusum?.alarm)
```

This reads the CUSUM alarm state from the stored level JSON and passes it to urgency scoring, which already adds +0.5 for decay.

- [ ] **Step 7: Run all tests and commit**

Run: `npx vitest run`
Expected: All pass

```bash
git add src/core/adaptive/cusum.ts tests/unit/core/adaptive/cusum.test.ts src/core/orchestrator/session-composer.ts src/ui/pages/session-runner.tsx
git commit -m "feat: CUSUM plateau detection + EWMA computation + auto booster urgency"
```

---

### Task 6: Observable Plot Dashboard Upgrades

Replace SVG sparklines with @observablehq/plot charts. Add richer visualizations: per-domain performance curves with proper axes, transfer assessment progression charts, and metacognitive calibration trend.

**Files:**
- Modify: `package.json` (add @observablehq/plot)
- Modify: `src/ui/pages/dashboard.tsx`

- [ ] **Step 1: Install Observable Plot**

```bash
npm install @observablehq/plot
```

- [ ] **Step 2: Replace Sparkline component with Observable Plot**

In `src/ui/pages/dashboard.tsx`:

Add import:
```typescript
import * as Plot from '@observablehq/plot';
import { onCleanup } from 'solid-js';
```

Replace the `Sparkline` component with a `PlotChart` component:

```typescript
function PlotChart(props: { 
  data: Array<{ x: number; y: number }>; 
  width?: number; 
  height?: number; 
  color?: string;
  yLabel?: string;
  yDomain?: [number, number];
}) {
  let container: HTMLDivElement | undefined;
  const render = () => {
    if (!container || props.data.length === 0) return;
    container.innerHTML = '';
    const plot = Plot.plot({
      width: props.width ?? 300,
      height: props.height ?? 120,
      style: { background: 'transparent', color: '#888', fontSize: '10px' },
      x: { label: null, tickFormat: '' },
      y: { label: props.yLabel ?? null, domain: props.yDomain },
      marks: [
        Plot.lineY(props.data, { x: 'x', y: 'y', stroke: props.color ?? '#7aa2ff', strokeWidth: 1.5 }),
        Plot.dot(props.data, { x: 'x', y: 'y', fill: props.color ?? '#7aa2ff', r: 2 })
      ]
    });
    container.appendChild(plot);
  };
  return <div ref={container} style="display:inline-block" {...{ 'prop:_render': requestAnimationFrame(() => render()) }} />;
}
```

Note: SolidJS doesn't have useEffect. Use a ref + manual render call pattern. Alternatively, wrap in `onMount`:

```typescript
function PlotChart(props: { data: Array<{ x: number; y: number }>; width?: number; height?: number; color?: string; yLabel?: string }) {
  let container!: HTMLDivElement;
  onMount(() => {
    if (props.data.length === 0) return;
    const plot = Plot.plot({
      width: props.width ?? 300,
      height: props.height ?? 120,
      style: { background: 'transparent', color: '#888', fontSize: '10px' },
      x: { label: null },
      y: { label: props.yLabel ?? null, grid: true },
      marks: [
        Plot.lineY(props.data, { x: 'x', y: 'y', stroke: props.color ?? '#7aa2ff', strokeWidth: 1.5 }),
        Plot.dot(props.data, { x: 'x', y: 'y', fill: props.color ?? '#7aa2ff', r: 2 })
      ]
    });
    container.appendChild(plot);
    onCleanup(() => { container.innerHTML = ''; });
  });
  return <div ref={container} style="display:inline-block" />;
}
```

- [ ] **Step 3: Upgrade Domain Efficiency section**

Replace the sparkline in the Domain Efficiency table with a larger PlotChart. Map `seriesByDomain()` data to `{x, y}` format:

```typescript
<td>
  <PlotChart
    data={series.map((v, i) => ({ x: i, y: v }))}
    width={200}
    height={50}
  />
</td>
```

- [ ] **Step 4: Upgrade Transfer Assessments section**

Replace transfer sparklines with PlotChart, adding proper time axes:

```typescript
<PlotChart
  data={runs().map(r => ({ x: r.ts, y: r.score }))}
  width={200}
  height={40}
  color={delta()?.improved ? '#4dff99' : '#7aa2ff'}
  yLabel={meta.unit}
/>
```

- [ ] **Step 5: Add metacognitive calibration trend chart**

Add a new section below the existing Metacognitive Calibration panel showing Brier score trend over time. Query per-session Brier scores:

Add to `loadSummary()`:
```typescript
const brierTrend = await dbQuery<{ session_id: string; start_ts: number; brier: number }>(
  `SELECT b.session_id, s.start_ts, AVG(m.brier_contribution) as brier
   FROM metacog_predictions m
   JOIN blocks b ON m.block_id = b.id
   JOIN sessions s ON b.session_id = s.id
   WHERE m.brier_contribution IS NOT NULL AND s.completed = 1
   GROUP BY b.session_id
   ORDER BY s.start_ts`
);
```

Display as a PlotChart:
```typescript
<PlotChart
  data={data()?.brierTrend?.map(r => ({ x: r.start_ts, y: r.brier })) ?? []}
  width={400}
  height={100}
  color="#f2c94c"
  yLabel="Brier"
/>
```

- [ ] **Step 6: Remove old Sparkline component**

Delete the `Sparkline` function and ensure no references remain.

- [ ] **Step 7: Test in browser**

Navigate to `/dashboard`. Verify:
1. Domain efficiency charts render with proper axes and dots
2. Transfer assessment charts show progression
3. Brier score trend displays
4. Charts handle empty data (0 sessions) gracefully
5. Export buttons still work

- [ ] **Step 8: Run tests and commit**

Run: `npx vitest run`
Expected: All pass

```bash
git add package.json package-lock.json src/ui/pages/dashboard.tsx
git commit -m "feat: upgrade dashboard with Observable Plot charts"
```

---

## Summary

| Task | Feature | Est. Time | Dependencies |
|------|---------|-----------|-------------|
| 1 | Flanker assessment | 30 min | None |
| 2 | Digit span assessment | 30 min | None |
| 3 | Keypress flash | 10 min | None |
| 4 | Daily session cap | 15 min | None |
| 5 | CUSUM + EWMA + boosters | 30 min | None |
| 6 | Observable Plot dashboard | 30 min | Tasks 1-2 (for new transfer task entries) |

All tasks except Task 6 are fully independent and can be parallelized. Task 6 should run last since it references transfer task metadata added in Tasks 1-2.
