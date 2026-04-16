# Intellect Forge — Design Spec

**Date:** 2026-04-15
**Scope:** Full personal-use cognitive training suite (v1)
**Audience:** Implementation plan writer + implementing agents

## 1. Overview

Intellect Forge is an evidence-based cognitive training web app for single-user personal use. Six research-backed modules (UFOV perceptual speed, dual n-back + complex span, compound executive function, relational reasoning matrices, metacognitive calibration) coordinated by an Orchestrator that enforces dosing, interleaving, and booster scheduling. All training domains share a single stimulus engine, adaptive algorithm library, and append-only session log.

The product thesis and research basis are in `readme.md` and `research/`. This document is the implementation-facing design. When the readme and this spec disagree, this spec wins (it incorporates research corrections).

## 2. Scope

### In scope for v1

- All six training modules with research-corrected parameters
- Orchestrator: phase detection, daily session composition, plateau detection, booster scheduling, 30-min/day cap
- Calibration overlay (pre-block accuracy predictions) wired into every module
- Analytics dashboard: per-domain performance curves, calibration curves, switch cost trends, d-prime trajectories, transfer-assessment snapshots
- SQLite-backed append-only session log, local-first, no network
- Seeded calibration item bank (~21,000 MCQ from OpenTriviaDB + MMLU + TruthfulQA)
- Seeded procedural matrix generator (raven-gen port + I-RAVEN distractor logic)

### Out of scope for v1 (reversible)

- Mobile / touch UI (desktop browser only)
- Cloud sync, accounts, multi-device
- Social features, leaderboards, streaks, brain-age scores
- Eye tracking (UFOV subtests 1–2 work without it via mandatory post-stimulus mask)
- Cloud-served backend (pure static SPA)
- Multi-user support

## 3. Stack

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Browser (modern Chromium/Firefox/Safari) | Personal use, Windows desktop, zero install friction |
| Build | Vite + TypeScript | Fast HMR, production-ready static builds |
| UI framework | SolidJS | Signal-based reactivity, no VDOM jank during stimulus frames |
| Stimulus rendering | OffscreenCanvas in Web Worker + dedicated rAF loop | Main-thread isolation, frame-accurate timing |
| Audio | Web Audio API (AudioWorklet for precise scheduling) | N-back letter playback with known latency |
| Persistence | sqlite-wasm + OPFS SyncAccessHandle | Durable, queryable, survives reloads, single-file |
| Adaptive (psychophysics) | jsQUEST + jsQuestPlus (vendored, MIT) | Watson-Pelli Bayesian threshold estimation |
| Adaptive (n-back/EF) | Custom ~80 LOC Levitt n-down/m-up staircase | PsychoPy is GPL; rewrite is trivial |
| Item scheduling | ts-fsrs (MIT, FSRS-6) | Calibration items and matrix rule families ONLY — never domain scheduling |
| Matrix generation | Custom TS port of raven-gen + I-RAVEN distractor logic (~1,200 LOC) | Python package unusable directly in browser; distractor bisection must be fixed |
| Analytics | Observable Plot + D3 | Honest scientific visual language, no dark-pattern gamification |
| Testing | Vitest + Playwright | Unit + e2e for stimulus engine + flow |

No Tauri in v1. No backend. No network calls at runtime (item banks ship static).

## 4. Architecture

### 4.1 Module contract

Every training module implements the same interface so the orchestrator, stimulus engine, and analytics don't know or care which module is running.

```ts
export type ModuleId =
  | 'ufov' | 'working-memory' | 'compound-ef'
  | 'relational' | 'calibration';

export interface TrainingModule {
  id: ModuleId;
  displayName: string;
  estimatedMinutes: number;
  createSession(
    domainState: DomainState,
    hints: OrchestratorHints
  ): Session;
}

export interface Session {
  readonly blocks: readonly Block[];
  nextTrial(): Trial | null;
  submit(response: Response): Promise<TrialResult>;
  currentBlockStats(): BlockStats;
  complete(): SessionResult;
  readonly metadata: SessionMetadata;
}

export interface Block {
  index: number;
  kind: string;                // e.g. "dual-nback-n3"
  targetTrialCount: number;
  metacogPrediction?: number;  // user's predicted accuracy 0-1, set before block
}

export interface Trial {
  id: string;
  blockIndex: number;
  trialIndex: number;
  stimulus: StimulusDescriptor;  // consumed by stimulus engine
  inputSpec: InputSpec;          // what responses are accepted
  timingSpec: TimingSpec;        // presentation timing in ms or frames
}
```

### 4.2 Stimulus engine

Single component that takes a `Trial` and returns a `Response` + precise timing data. Lives in a Web Worker; communicates with main thread via `postMessage` + `OffscreenCanvas`.

Responsibilities:
- Frame-locked presentation (rAF inside worker)
- Input capture (keyboard, mouse; abstracted to `InputEvent`)
- Per-trial timing log (requested vs achieved display duration, input latency, frame drops)
- Mask management (critical for UFOV)
- Audio scheduling (n-back)

Key guarantee: every trial logs `requestedDurationMs`, `achievedDurationMs`, `framesRendered`. If achieved duration differs from requested by more than half a frame, the trial is flagged. This is our in-app version of a photodiode rig.

### 4.3 Adaptive algorithm library

Pure functions, no rendering dependency:
- `Quest` class — Watson-Pelli QUEST (Weibull psychometric, Bayesian posterior, quantile/mean/mode placement)
- `QuestPlus` wrapper — jsQuestPlus for multi-parameter (UFOV subtests 3–4)
- `Staircase` class — Levitt n-down/m-up, reversal tracking, shrinking step sizes
- `DPrime` — signal detection theory scoring (hits, false alarms, log-linear correction)
- `BlockPromotion` — rule evaluator; given block stats, decides `promote | demote | hold`

### 4.4 Orchestrator

Rule-based state machine:

```
inputs:  domain_state[5], today_date, user_overrides
process:
  1. phase := compute_phase(total_sessions, weeks_active, plateau_flags)
  2. if today is rest_day: return RestSuggestion
  3. urgency[d] := f(days_since_last[d], decay_flag[d], plateau_penalty[d])
  4. picks := phase_specific_picker(phase, urgency, calendar)
  5. session_plan := compose_blocks(picks, target_minutes=25, cap=30)
  6. attach metacog predictions + transfer probes if due
output: SessionPlan
```

Phases:
- **Ramp** (weeks 1–3): one domain per day, blocked, rotating
- **Intensive** (weeks 4–8): two domains per day, AB-AB interleaving
- **Consolidation** (weeks 9–12): continue two-domain sessions, reduce to 5 days/week
- **Maintenance** (week 13+): 3–4 sessions/week, booster triggers via CUSUM on performance

## 5. Data model

SQLite schema (OPFS-backed, single file `intellect-forge.db`):

```sql
-- core
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  start_ts INTEGER NOT NULL,
  end_ts INTEGER,
  plan_json TEXT NOT NULL,
  phase TEXT NOT NULL,
  completed INTEGER DEFAULT 0
);
CREATE TABLE blocks (
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
);
CREATE TABLE trials (
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
);

-- domain state (mutable)
CREATE TABLE domain_state (
  module_id TEXT PRIMARY KEY,
  level_json TEXT NOT NULL,       -- module-specific current difficulty
  ewma_performance REAL,
  last_session_ts INTEGER,
  sessions_total INTEGER DEFAULT 0,
  plateau_flag INTEGER DEFAULT 0,
  updated_ts INTEGER NOT NULL
);

-- item banks
CREATE TABLE calibration_items (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,           -- 'opentdb' | 'mmlu' | 'truthfulqa'
  category TEXT,
  question TEXT NOT NULL,
  answer_type TEXT NOT NULL,      -- 'binary' | 'mcq' | 'numeric'
  choices_json TEXT,
  correct_answer TEXT NOT NULL,
  difficulty TEXT
);
CREATE TABLE calibration_reviews (
  item_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  confidence REAL NOT NULL,
  correct INTEGER NOT NULL,
  fsrs_state_json TEXT,           -- ts-fsrs card state
  PRIMARY KEY(item_id, ts),
  FOREIGN KEY(item_id) REFERENCES calibration_items(id)
);
CREATE TABLE matrix_items (
  id TEXT PRIMARY KEY,
  matrix_type TEXT NOT NULL,
  rules_json TEXT NOT NULL,
  svg_seed TEXT NOT NULL,         -- deterministic regeneration
  difficulty_est REAL,
  fsrs_state_json TEXT
);

-- metacognition
CREATE TABLE metacog_predictions (
  block_id TEXT PRIMARY KEY,
  predicted_accuracy REAL NOT NULL,
  actual_accuracy REAL,
  brier_contribution REAL,
  FOREIGN KEY(block_id) REFERENCES blocks(id)
);

-- transfer
CREATE TABLE transfer_assessments (
  id TEXT PRIMARY KEY,
  ts INTEGER NOT NULL,
  task_id TEXT NOT NULL,          -- 'ICAR-matrix', 'ADEXI', etc.
  score REAL NOT NULL,
  raw_json TEXT
);
```

All writes are append-only except `domain_state` (upsert on module_id). No deletes in v1.

## 6. Module specs (research-corrected)

These are summary specs. Each module gets a child design doc during implementation if needed.

### 6.1 UFOV Perceptual Speed

- **4 subtests** (not 3 per readme): focused attention, divided attention, selective attention with 8 distractors, selective attention with 24+ distractors
- **Mandatory random-dot mask** post-stimulus (prevents iconic memory artefact)
- Central stimulus + peripheral target at 8 radial locations
- Adaptive variable: **display duration** (shortens as accuracy improves), not RT
- QUEST converges to 75% accuracy threshold
- Session: blocks of 20–30 trials per subtest; 8–10 min per session
- Pre-session calibration probe: measure display refresh rate and achieved-vs-requested frame durations

### 6.2 Working Memory Forge (PILOT MODULE)

Dual n-back + complex span, interleaved.

**Dual n-back:**
- 3×3 grid, 8 positions; 8 consonants (C,H,K,L,Q,R,S,T)
- Jaeggi 2008 timing: 500ms stimulus, 2500ms ISI, 3000ms SOA
- 20+N trials per block, 6 position targets + 6 audio targets + 2 duals
- Lures (N-1 and N+1 proximity) ~25% of trials to prevent pattern memorization
- **Per-stream d-prime adaptive rule** (research correction — raw accuracy lets passive no-press score ~80%):
  - Promote N when `d'_visual >= 1.5 AND d'_audio >= 1.5` in a block
  - Demote N when `d' < 0.5` on either stream for 2 consecutive blocks
  - Hautus log-linear correction for edge counts

**Complex span (Operation Span variant):**
- Alternating memoranda (letters) and processing (simple math verification)
- Partial-credit scoring (englelab-compliant)
- Set sizes 3–7, adaptive per englelab rules

### 6.3 Compound Executive Controller

Layered single-trial task — NOT separate Stroop/Flanker/Stop-signal.

- Colored shape at variable size, pre-stim cue selects rule (color/shape/size)
- Probabilistic layering per trial:
  - Rule-switch (~50%) vs repeat
  - Flanker congruency on relevant dimension (~50% incongruent)
  - Stop signal on ~25% of trials, SSD staircase (Verbruggen 2019)
- Timing: fixation 500ms, cue 500ms, CSI 400ms, stim ≤1250ms, ITI 750±250ms
- Blocks of 48 trials, 4 per session
- **Hierarchical adaptation:** SSD staircases within-block; congruency ratio, switch freq, response window adjust between blocks; rule count (2→3→4) levels up after stable switch cost over 2+ blocks ≥80%
- Metrics logged: switch cost, mixing cost, SSRT (integration method), congruency RT effect, commission errors separate from accuracy errors
- Reference impl: STOP-IT SSD staircase

**Honest framing note:** Bollen 2019 is a null result; README citation #5 is wrong. Karbach & Kray 2009 is the actual transfer-positive study, and their "variable training" (rotating stimuli/cues/rules across sessions) is non-optional. This is the weakest-evidence module.

### 6.4 Relational Reasoning Lab

Procedural matrix generator + three operations (dropping "antinomous-as-paradox" — TORR's actual definition is binary exclusion; out of scope for v1).

- Port raven-gen (Python → TS, ~1,200 LOC MVP / ~2,300 full)
- 4 Carpenter rules: Constant in Row, Pairwise Progression, Addition/Subtraction, Distribution of Three (skip Distribution of Two in MVP)
- 5 attributes: shape, color, size, count, position
- 3 matrix types day one (grid-only); more layouts later
- **I-RAVEN `separate()` distractor bisection** — each foil violates exactly one rule
- SVG rendering from primitive vocabulary (triangle, square, pentagon, hexagon, circle × color × size × rotation)
- Difficulty estimated pre-hoc by rule count + attribute complexity; IRT calibration after 500+ user responses
- Property-test the generator exhaustively against rule-satisfaction invariants (guard against degenerate matrices from constraint propagation bugs)
- Matrix items scheduled via ts-fsrs (item-level recall)

### 6.5 Calibration Engine + Overlay

Two facets:
1. **Standalone module** — calibration training sessions with MCQ/numeric questions
2. **Overlay** — every block in every module prompts "predict your accuracy (%)" before, shows actual after, contributes to Brier score

Standalone:
- **50–99% half-range slider** (binary items; research-backed elicitation method)
- 90% credible interval elicitation (numeric items, two fields, scored by containment)
- Brier score as primary metric; decompose into reliability/resolution/uncertainty (Murphy 1973) for dashboard
- Include TruthfulQA overconfidence-trigger items; use Koriat "consider the opposite" prompt on high-confidence responses
- Calibration items scheduled via ts-fsrs (spaced re-exposure)

Seed banks (day one):
- OpenTriviaDB (CC-BY-SA, ~5k MCQ)
- MMLU / HendrycksTest (MIT, ~15.5k academic MCQ)
- TruthfulQA (Apache-2.0, 817 adversarial)
- **Fermi estimation: needs license resolution.** Treat AllenAI Fermi as unresolved; start hand-curated 50-item seed + Wikidata SPARQL template fallback.

### 6.6 Orchestrator module (not a training domain, but user-facing)

- Phase detection from session counts + plateau flags
- Daily session plan generation (see §4.4)
- Plateau detection: rolling 8-session OLS slope + 95% CI; flag when slope CI includes zero for 5+ sessions
- Booster trigger (maintenance phase): CUSUM on domain performance; when drift detected, inject booster session
- Hard cap: 30 min/day, enforced; late-night sessions split at 4AM day-rollover
- Rest day enforcement: minimum 1/week; user can override but UI warns once

## 7. Evidence-honest framing

The UI must never claim:
- "IQ increase", "X IQ points gained"
- "Brain age"
- "Scientifically proven to transfer"

The UI can claim:
- "Your threshold for peripheral detection improved from Xms to Yms"
- "Your max sustained n-back is now N"
- "Your calibration has tightened (Brier 0.XX → 0.YY)"

Far-transfer language stays in the About page as honest caveat: "Near-transfer gains (better on trained tasks) are robust. Far-transfer to general fluid intelligence is small and contested. We show raw metrics and let you draw your own conclusions."

## 8. Build phases

Estimated wall-clock assumes multi-agent parallel implementation after foundations lock.

### Phase 0 — Foundations (sequential, 1–3 hours)

- Vite + SolidJS + TS scaffold
- SQLite-wasm + OPFS wiring, schema migrations
- Stimulus engine worker + rAF loop + display calibration probe
- Adaptive library (Quest, Staircase, DPrime, BlockPromotion)
- Orchestrator skeleton + DomainState store
- Module contract types + "placeholder module" that implements the interface as a smoke test
- Main shell UI: Home → Today's Session → Block runner → Results

### Phase 1 — WM Pilot (1 hour, single agent)

- Dual n-back implementation against contract
- Complex span implementation
- Interleaving logic within session
- End-to-end validation: can you start app, click "Today's Session", run WM session, see result in dashboard

### Phase 2 — Parallel module explosion (1–2 hours, 5 agents in parallel)

- Agent A: UFOV (4 subtests + mask + QUEST + calibration probe UI)
- Agent B: Compound EF (layered trial + SSD staircase + metrics)
- Agent C: Relational (raven-gen port + SVG renderer + FSRS wiring)
- Agent D: Calibration module + metacog overlay hook in stimulus engine
- Agent E: Analytics dashboard (Observable Plot)

### Phase 3 — Polish (as needed)

- Transfer assessment battery (ICAR matrices, ADEXI subset) + baseline/wk4/wk8/mo3/mo6
- Booster logic and CUSUM detection
- Calibration item bank ingestion (load 21k items into SQLite)
- Fermi seed curation (hand-write 50 + SPARQL templates)
- Session history, export, About page

## 9. Open questions

- **Fermi dataset licensing.** AllenAI repo has no LICENSE file. Action: email authors; in parallel, hand-curate 50-item seed and Wikidata SPARQL templates. Not blocking v1 since calibration works with MCQ alone.
- **Sub-33ms display stability in browser.** If display calibration probe shows frame drops at requested ≤33ms, UFOV subtests 3–4 may need degraded target accuracy (bump floor to 50ms) or move to Tauri later. V1 ships with the measurement + floor fallback.
- **IRT calibration threshold.** Matrix difficulty est is pre-hoc on v1; live IRT calibration kicks in after 500+ responses. Not blocking; just flagged.
- **Metacog overlay on very short blocks.** Some UFOV blocks may be too short for prediction to be meaningful. Decision: overlay runs once per subtest, not per mini-block.

## 10. References

Research dossiers in `research/`:
- `00-synthesis.md` — master synthesis (read this first)
- `01-perceptual-speed-ufov.md` — UFOV mechanics + timing
- `02-working-memory.md` — n-back + complex span
- `03-compound-executive.md` — compound task design
- `04-relational-reasoning.md` — Raven + TORR
- `05-calibration.md` — Brier + elicitation
- `06-platforms-and-stack.md` — platform survey
- `07-orchestrator.md` — scheduling
- `08-oss-task-catalog.md` — 50 OSS resources
- `09-jspsych-deep-dive.md` — plugin internals
- `10-adaptive-algorithms-deep.md` — QUEST/staircase TS-ready code
- `11-matrix-generator-deep.md` — raven-gen port plan
- `12-question-banks-deep.md` — calibration item banks
- `13-spaced-repetition-deep.md` — ts-fsrs scoped to items
- `14-oss-apps-dissection.md` — Brain Workshop patterns

Readme: `readme.md` — product thesis and research basis (pre-corrections).
