# 00 — Intellect Forge Master Synthesis (Round 2)

Opinionated north-star document for the Intellect Forge cognitive training
suite. Derived from:

- Round 1 module dossiers `01-perceptual-speed-ufov.md` → `07-orchestrator.md`
- **Round 2 OSS-focused dossiers `08-oss-task-catalog.md` →
  `14-oss-apps-dissection.md`** (source-level reads of jsPsych, ts-fsrs,
  raven-gen, Brain Workshop, etc.)
- A read of the project `readme.md`.

This revision supplements, corrects, and in a few places overturns Round 1
findings with what we learned from reading actual OSS source code.

**TL;DR for the builder (round-2 edition)**
- Round-1 stack survives almost intact: **Tauri 2.x + TypeScript + jsPsych v8
  plugins-as-library + OffscreenCanvas worker render loop + jsQuestPlus +
  SQLite-over-OPFS**. Round 2 tightens three pieces:
  - **Port jsPsych's timing patterns rather than vendor its runtime** —
    `Trial.cleanupTrial()` does `display_element.innerHTML = ""` between every
    trial which will clobber any Solid/React subtree we render into, and
    default stimulus-duration timing is `setTimeout`-based and drifts by up to
    one vsync interval. Reuse plugin source as reference; build our own
    RAF-scheduled Solid-native stimulus engine.
  - **`ts-fsrs` (MIT, FSRS-6) is in, for *items only*** — calibration flash-
    cards, matrix rule-family review, instruction recall. Do **not** use FSRS
    for domain-level scheduling; that stays rule-based per `07-orchestrator.md`.
  - **m2c2kit was missed in round 1.** Apache-2.0, TS + canvaskit-wasm (Skia),
    best-in-class OSS cognitive architecture from Penn State's M2C2 project.
    Vendor as an architectural reference, not a runtime dependency (wrong
    renderer stack for us).
- **The single largest item-engine win is that we now have a concrete LOC
  estimate and port recipe for Raven-style matrices** — ~1200 LOC MVP / ~2300
  LOC full, grafting I-RAVEN's distractor-hypercube onto raven-gen's cleaner
  core. See §11.
- **Content-bank day-one picture is now concrete**: ~21k+ commercial-safe
  MCQ/binary items available out of the box (OpenTriviaDB CC-BY-SA 4.0 +
  MMLU MIT + TruthfulQA Apache-2.0), with ARC / CommonsenseQA as bonus.
  Fermi remains the best numeric-estimation set but is **license-unclear**
  (round-1 mislabelled it Apache-2.0; the repo has no LICENSE file). Drop
  The Trivia API — it is **CC-BY-NC**, not CC-BY as round 1 said.
- **Compound EF is real on day one** thanks to `Squared jsPsych` (Burgoyne
  2023 attention-control tasks in 3 min each) + STOP-IT's custom stop-signal
  plugin + SSD staircase. These dissolve the biggest Round-1 open question
  about whether we had a credible MVP for M4.
- Build order from Round 1 stands: **Orchestrator skeleton + Calibration
  overlay first**, then **Working Memory**, then **UFOV**, then **Compound
  EF**, then **Relational Reasoning** last. Round 2 sharpens effort
  estimates below.
- **The single most important unresolved question is unchanged**: does our
  web stack hit sub-33 ms UFOV durations on real hardware. Everything else
  is downstream.

---

## 1. README Corrections — Consolidated (unchanged from round 1 + license fixes)

The round-1 dossiers found ~15 places the README overstates, understates, or
miscites. Round 2 adds two more (C17, C18).

### 1.1 Factual errors in task specifications

| # | README claim | Correction | Source |
|---|---|---|---|
| C1 | "Three subtests" of UFOV | **Four subtests** in the modern PC version (Edwards 2005). Include subtest 4 (same/different central judgement) or document omission. | `01` §1.2 |
| C2 | UFOV omits mask | **Random-dot mask is mandatory.** Without it the paradigm collapses into an iconic-memory test. Every faithful implementation presents ≥250 ms mask. | `01` §1.3 |
| C3 | "75% accuracy threshold" | Correct target but 1-up/3-down with equal step sizes drifts to ~83.15% (García-Pérez 1998). Use asymmetric steps `up/down = 0.7393`, or use QUEST. | `01` §2.1, `10` §1 |
| C4 | "16.67 ms per frame at 60 Hz" | 60 Hz no longer universal (120 Hz, VRR). **Measure refresh rate per device**; express all durations in frames, not ms. | `01` §4.4, `06` §2 |
| C5 | "Progressive distractor addition" | Diagnostic UFOV uses **47 outline triangles on three concentric rings at matched luminance** (Wood & Owsley 2014). | `01` §1.3 |
| C6 | Dual n-back: "increase N when accuracy > 80%, < 50%" | Those are Brain Workshop *default* thresholds (80/50); **Jaeggi mode is 90/75**. Our dossier-preferred rule is **d′-based per-stream** (≥0.65 to advance). Raw accuracy lets no-press strategy look good. | `02` §2; `14` §2.2 |
| C7 | Dual n-back letter set unspecified | Use **C, H, K, L, Q, R, S, T** (Jaeggi/Brain Workshop). Audio on headphones via Web Audio, not `<audio>.play()`. | `02` §1.1, §7.2 |
| C8 | Subtest ordering | **1 → 2 → 3 (→ 4)** with warm-up. | `01` §7.3 |
| **C17** | "Use jsPsych for stimulus presentation" | **jsPsych's default stimulus-duration timing is `setTimeout`-based and drifts up to one vsync interval.** For UFOV-grade flashes (≤100 ms) we must use the RAF-based variant (`plugin-html-keyboard-response-raf`) or our own engine. | `09` §1.3 |
| **C18** | Implicit "jsPsych plugins vendored into production" | jsPsych's `Trial.cleanupTrial()` wipes `display_element.innerHTML = ""` between every trial — this will clobber any Solid/React subtree rendered inside. Plugins assume jsPsych owns the page. | `09` §5 |

### 1.2 Citation errors

| # | README claim | Correction |
|---|---|---|
| C9 | "Bollen et al. (2019) in NeuroImage. Complex compound = transfer to reasoning" | **Bollen 2019 is a null result.** Cite **Karbach & Kray (2009)** instead. |
| C10 | "Alexander et al. (2016) in npj Science of Learning… encode/infer/map/apply" | Wrong journal; that taxonomy is Sternberg-style, not TORR. TORR's operations are analogical/anomalous/antithetical/antinomous (Alexander 2016 *Frontiers* + Dumas & Alexander 2020). |
| C11 | Hacker 2008 calibration | Moderate effect, not transformative (Schneider 2021 meta-analysis). Active ingredient is **frequent feedback with reliability diagram**. |
| C12 | "3-4 IQ points; 2017 meta-analysis confirmed" | Soveri 2017 found **medium near-transfer, very small far-transfer**. Melby-Lervåg 2016 found no convincing far transfer. Au et al. 2015 ("4 IQ points") specifically contested. Framing as "confirmed" is misleading. |

### 1.3 Framings technically correct but misleading

| # | README | Correction |
|---|---|---|
| C13 | "Antinomous: what's paradoxically both?" | TORR's antinomy is **binary categorical exclusion**, not paradox resolution. Either use TORR's definition or drop the word. |
| C14 | "All layers active simultaneously" (Compound EF) | Compound tasks sample layers **probabilistically** (e.g., 25% stop trials inside switching+flanker). Not all active every trial. |
| C15 | "Don't add loss-aversion gamification" + "wagers on calibration" | Contradictory unless wagers stay within calibration module's scoring-rule elicitation. Don't bleed into cross-app XP. |
| C16 | "29% lower dementia at 10 years" | Correct for Edwards 2017 UFOV; **do not generalise to whole suite**. UFOV is the only module with that evidence strength. |

### 1.4 Silent omissions

| # | Missing | Add |
|---|---|---|
| O1 | **Lure trials** in n-back | Research versions enforce ~25% lures at N≥3 to prevent familiarity-based responding. `02` §1.2; `14` §3 |
| O2 | **d′ / SDT** scoring | Every n-back, UFOV, go/no-go, flanker metric should use SDT (d′, criterion c, Hautus 1995 log-linear edge correction). `02` §3 |
| O3 | **Processing-time calibration** for complex span | Engle lab standard: deadline = mean + 2.5 SD of practice-phase processing RT. `02` §1.3, §7.2 |
| O4 | **Viewing-distance estimation** | UFOV eccentricity is in degrees of visual angle, not CSS px. Virtual-chinrest at session start. `01` §8 |
| O5 | **Variable training** | Karbach & Kray's broad-transfer ingredient. If Forge just cycles the same rule daily, we forfeit the main transfer citation. `03` §R6 |
| O6 | **ACTIVE booster schedule** (11 mo, 35 mo) as empirical anchor | `07` §3 — also derivable from FSRS forgetting curve at `r_target=0.8`, see `13` §9. |
| O7 | **Transfer-assessment contamination** rules | Transfer probes must never be trained, must have parallel forms, must not be adaptive. `07` §4 |

---

## 2. Converged Stack — Round 2 Update

The Round 1 stack survives. Round 2 sharpens the "vendor vs port vs
reference" call for each piece.

### 2.1 Runtime and shell

- **Tauri 2.x shell** (Apache-2.0/MIT) — desktop + mobile from one web-first
  codebase, with a native escape hatch for timing. `06` §3, §9.
- **TypeScript + SolidJS** (preferred) or React. Stimulus surface renders to
  `<canvas>` outside the reactive tree. `06` §4.
- **OffscreenCanvas + Web Worker rAF** for stimulus rendering. `06` §4.
- **`document.timeline.currentTime`** inside rAF for timestamping (not clamped
  like `performance.now()` on Firefox). `01` §4.1.
- **SQLite-WASM + OPFS SyncAccessHandle** for local storage. `06` §5. Append-
  only session log with schema-versioned header (Brain Workshop pattern in
  `14` §2.4 — "accidentally great").
- **Web Audio API** with `AudioBufferSourceNode` + `ctx.currentTime` scheduling
  (never `<audio>.play()`). `02` §7.2; `06` §4.
- **Rollover hour = 4 AM, not midnight** (Brain Workshop pattern, `14` §2.1).

### 2.2 Stimulus engine — *Updated:* port, don't vendor jsPsych

Round 1 recommended "jsPsych v8 plugins as a library, not a runtime." Round 2
(`09`) reads the jsPsych source and makes that concrete: **we do not ship
jsPsych in the production binary.** We build our own tiny stimulus engine that
follows the plugin API *patterns* — RAF loop, single-root keyboard listener
with minimum-valid-RT filter, per-trial data rows, preloaded assets — and we
**use the jsPsych source tree in `research/tmp-jspsych/` as the reference
implementation** for each paradigm.

Critical gotchas that pushed us from "vendor" to "port" (all in `09`):

1. `Trial.cleanupTrial()` wipes `display_element.innerHTML = ""` between every
   trial. Any Solid/React subtree rendered inside it is clobbered.
2. Default stimulus-duration timing uses `window.setTimeout`, which fires on
   the macrotask queue — advertised 200 ms flash becomes ~200–216 ms.
3. Keyboard listeners are bound at `JsPsych` instance construction; re-init
   without teardown duplicates listeners.
4. `jsPsych.data` is a single in-memory bucket with no persistence, no
   cross-session concept, no schema migration.
5. Default CSS bleeds into the host app unless scoped with PostCSS/@scope.
6. Timeline is effectively frozen at `jsPsych.run()` time; session-level
   adaptation across days must happen in our orchestrator anyway.
7. Audio preload silently disabled under `file://` — verify Tauri's protocol
   (`tauri://`, `asset.localhost`) unlocks it.

**What we *do* lift from jsPsych**:
- The RAF-driven frame scheduler pattern from `plugin-html-keyboard-response-raf`
  and `jspsych-psychophysics`'s `step()` loop (`09` §1.3). Port verbatim.
- The `KeyboardListenerAPI` design (`performance.now()` timestamps, minimum-
  valid-RT filter) — ~50 LOC in TS. `09` §1.3.
- Plugin **drawing logic** per paradigm (the flanker SVG glyphs, Corsi block
  coordinates, psychophysics stimulus classes). These are data, not code;
  copy with MIT attribution.
- The RDK plugin's per-trial `frame_rate_array` logging of actual inter-frame
  deltas — adopt as baseline instrumentation. `09` §1.3.

### 2.3 Adaptive algorithms — *Concrete TS-ready*

Round 1 said "jsQuestPlus + custom staircase." Round 2 (`10`) verified
against source and provides TS-ready skeletons.

- **`jsQUEST`** (MIT, kurokida) — vendor directly. 1-D Bayesian threshold.
  Weibull psychometric, Gaussian prior, discrete posterior. ~40 trials for a
  threshold. Use for UFOV training blocks. `10` §2.
- **`jsQuestPlus`** (MIT, kurokida) — vendor directly. Multi-param Bayesian,
  expected-entropy stimulus placement, <1 ms/trial. Use when we want
  threshold + slope jointly (UFOV subtest 3/4 duration × eccentricity). `10`
  §3.
- **Custom transformed staircase** (n-down/m-up) — we *must* write this
  ourselves because PsychoPy's `StairHandler` is GPL-3.0. ~80 LOC in TS,
  sketch in `10` §10.2. Use for UFOV diagnostic (1-up/3-down double
  interleaved for clinical comparability), and per-trial 3-down/1-up on
  n-back composite score.
- **Hybrid per-dim staircase + global gate** for Compound EF (`10` §7.4).
  Independent 3-down/1-up per dimension, master difficulty advances only
  when all dimensions' SDs stabilise. Revisit QUEST+ / Thompson bandit once
  ≥200 users × 8 weeks.
- **IRT-based item selection** for Relational Reasoning (2-PL or 3-PL). No
  good TS library; seed item difficulties from pilot data then port
  EAP estimation (~300 LOC) or use static banded templates v1. `10` §9; `11`.

### 2.4 Spaced repetition — *New:* `ts-fsrs` for items only

Round 2 (`13`) reads the FSRS-6 source and concludes:

- **Vendor `ts-fsrs` (MIT, FSRS-6)** for item-level scheduling only:
  - Calibration flashcards (meta-facts like "your 70% bin was 65% correct").
  - Matrix rule-family review (schedule at rule family, not instance —
    retention target **0.85**, not 0.9, to tolerate transfer noise).
  - Instruction recall (protocol reminders at top of weekly sessions).
- **Do *not* use FSRS for domain-level cadence.** FSRS's DSR (Difficulty /
  Stability / Retrievability) model is fitted on binary recall of facts;
  collapsing a whole cognitive domain into one (D, S) pair is semantically
  wrong (`13` §6). Use the rule-based orchestrator from `07`.
- **In-house HLR-style predictor** (~100 LOC; port Duolingo's open-feature
  log-linear model) for between-session performance forecasting at the
  domain level. `13` §5, §8.3.
- **ACTIVE-style booster schedule is principled** — derivable from the FSRS
  forgetting curve at `r_target = 0.8`, initial domain stability ~150 days
  (`13` §9). Hard-code checkpoints: **30 / 90 / 270 / 540 / 900 / yearly days.**

### 2.5 Measurement / metrics (unchanged from round 1)

- **SDT everywhere**: d′, criterion c, Hautus 1995 log-linear edge correction.
- **Brier + Murphy decomposition** for calibration; log score and spherical
  opt-in research views. ECE (equal-mass bins) as dashboard single-number.
- **Pre-block accuracy prediction** as universal metacognitive overlay.
- **Rolling-regression plateau detector** (W=8 sessions) for MVP; `ruptures`
  for offline annotation; CUSUM for maintenance decay.

### 2.6 Pedagogy / schedule (unchanged)

- Blocked → interleaved per Pan 2015 / Rohrer 2012.
- 25–30 min/day hard cap, 6 days/week with 1 rest day.
- Boosters on asymmetric expansion — now justified by §2.4 above.
- Transfer assessment at baseline/week 4/8/mo 3/6/yearly on ICAR.
- **No gamification** (no streaks, XP, leaderboards, brain age).

### 2.7 Honest-marketing posture (unchanged)

All dossiers converge: we can truthfully claim reliable improvement on
trained capacities (near transfer), but not general intelligence. UFOV is
the only module with defensible long-horizon real-world claims.

---

## 3. OSS Dependency Sheet — The Canonical List

**This is the single most important artifact for a builder starting tomorrow.**
Every OSS dependency we would use, organised by module, with license /
verification status / action. Rows are ordered roughly by priority within
each section.

### 3.1 Runtime and cross-cutting

| # | Dependency | License | URL | Version / status | Action |
|---|---|---|---|---|---|
| R1 | **Tauri 2.x** | Apache-2.0 / MIT | https://github.com/tauri-apps/tauri | 2.x, actively maintained | **Vendor** (runtime) |
| R2 | **SolidJS** | MIT | https://github.com/solidjs/solid | 1.x, active | **Vendor** (runtime) |
| R3 | **@tauri-apps/plugin-sql** | Apache-2.0 / MIT | https://github.com/tauri-apps/plugins-workspace | Active | **Vendor** |
| R4 | **sqlite-wasm** (official) | Public domain | https://sqlite.org/wasm/ | Actively maintained | **Vendor** (or wa-sqlite MIT alt) |
| R5 | **Observable Plot** | ISC | https://github.com/observablehq/plot | Active | **Vendor** — dashboards |
| R6 | **D3 submodules as needed** | ISC | https://d3js.org/ | Stable | **Vendor** |
| R7 | **m2c2kit** | Apache-2.0 | https://github.com/m2c2-project/m2c2kit | Active 2025, 699+ commits, Jest+Playwright CI | **Reference** — best architectural model for a TS + canvaskit cognitive lib. Do not vendor runtime (wrong renderer for us) but study it hard. |

### 3.2 Stimulus engine / paradigm patterns

| # | Dependency | License | URL | Status | Action |
|---|---|---|---|---|---|
| S1 | **jsPsych core** (v8) | MIT | https://github.com/jspsych/jsPsych | v8.x, very active, 1.5k+ stars | **Port patterns** — run in `research/tmp-jspsych/` for pilot only; do not ship in binary. |
| S2 | **jspsych-contrib** | Per-package (mostly MIT) | https://github.com/jspsych/jspsych-contrib | Active, 53 packages | **Fork specific plugins** — audit each package.json before use. |
| S3 | **jspsych-psychophysics** | MIT (kurokida) | https://github.com/kurokida/jspsych-psychophysics | Active, single 2,531-line TS file | **Port** the `step()` RAF-loop pattern (`09` §1.3). |
| S4 | **@jspsych-contrib/plugin-flanker** | MIT | jspsych-contrib monorepo | Active | **Vendor as reference** — SVG arrows + SOA + keyboard/button. |
| S5 | **@jspsych-contrib/plugin-spatial-nback** | MIT | jspsych-contrib monorepo | Active, 585 LOC | **Port for prod** — plugin is single-trial only; n-back stream state must live in our caller. |
| S6 | **@jspsych-contrib/plugin-rdk** | MIT | jspsych-contrib monorepo | Active, 1,629 LOC | **Reference** — adopt its `frame_rate_array` logging pattern. |
| S7 | **@jspsych-contrib/plugin-corsi-blocks** | MIT | jspsych-contrib monorepo | Active | **Vendor** (clean, display + input modes). |
| S8 | **@jspsych-contrib/plugin-trail-making** | MIT | jspsych-contrib monorepo | Active | **Vendor**. |
| S9 | **STOP-IT** (fredvbrug) | No LICENSE at repo root | https://github.com/fredvbrug/STOP-IT | Maintained; legacy jsPsych 6.0.5 in `jsPsych_version/` | **Port** the SSD-staircase algorithm (`09` §4 verbatim) — algorithm is Verbruggen 2019, not copyrightable. Do not redistribute code. |
| S10 | **twiecki/stopsignal** | BSD-typical | https://github.com/twiecki/stopsignal | Stable | **Port** — HDDM hierarchical Bayesian SSRT (Matzke 2011). |
| S11 | **Squared jsPsych** | Unverified — audit before vendor | https://github.com/vrtliceralde/squared_jspsych | 2023–2024 | **Vendor if MIT-confirmed** — Burgoyne 2023 attention-control tasks, avg loading .70 on AC factor, 3 min each. *Directly unblocks compound EF MVP.* |
| S12 | **vekteo/Card_sorting_jsPsych** | Audit | https://github.com/vekteo/Card_sorting_jsPsych | Recent | **Vendor if MIT** — WCST component for compound EF. |
| S13 | **Expfactory library** | BSD-3 | https://github.com/expfactory/experiments | Semi-active (Poldrack lab) | **Reference** — 100+ paradigm references incl. AX-CPT, hierarchical-rule, Raven's, BART. |
| S14 | **mentasuave01/brainworkshop** | MIT | https://github.com/mentasuave01/brainworkshop | Moderate | **Vendor-as-reference** — TS + Solid.js port of Brain Workshop; exact stack match. Check licence on dependent assets. |
| S15 | **Brain Workshop (original)** | GPL-2.0 | https://github.com/brain-workshop/brainworkshop | v5.0.3, Feb 2024 | **Reference only** — paradigm bible for n-back tuning. Steal the single-tick-clock-per-trial pattern (`14` §2.3), Jaeggi 90/75 vs. BW 80/50 preset strategy, 4 AM rollover, append-only CSV schema. Never link. |

### 3.3 Psychophysics / adaptive

| # | Dependency | License | URL | Status | Action |
|---|---|---|---|---|---|
| P1 | **jsQUEST** | MIT | https://github.com/kurokida/jsQUEST | Stable | **Vendor** — 1-D Bayesian threshold. |
| P2 | **jsQuestPlus** | MIT | https://github.com/kurokida/jsQuestPlus | Active; BRM 2022 paper | **Vendor** — multi-param Bayesian. `10` §3. |
| P3 | **Palamedes Toolbox** | Academic-free (MATLAB) | https://www.palamedestoolbox.org/ | Maintained | **Reference** — port `PAL_PFML_Fit` (~150 LOC TS) if we need standalone MLE fitting. |
| P4 | **PsiMarginal** | MIT | Python, Niehof | Stable | **Port if we need slope + lapse marginalization** (~200 LOC TS). QUEST+ is equivalent math and already MIT+JS. |
| P5 | **PsychoPy `staircase.py`** | GPL-3.0 | https://github.com/psychopy/psychopy | Active | **Reference only** — reimplement (algorithm not copyrightable). TS skeleton in `10` §10.2. |

### 3.4 Working memory / complex span

| # | Dependency | License | URL | Status | Action |
|---|---|---|---|---|---|
| W1 | **englelab R package** | Academic (Engle Lab) | https://englelab.github.io/englelab/ | Maintained | **Port** the partial-credit scoring & edit-distance algorithms (`08` §3 M3). Canonical span scoring. |
| W2 | **mahiluthra/working_memory_tests** | Unverified — audit | https://github.com/mahiluthra/working_memory_tests | Older, stable | **Port** — plain JS, Oswald 2014-compliant operation/symmetry/visual/spatial span. Cleanest browser-JS reference. |
| W3 | **OpenWMB** | GPL (OpenSesame) | Zenodo 10600494 | Active, BRM 2024 | **Reference** — 7 WM tasks, authoritative paradigm reference. |
| W4 | **tmalsburg/py-span-task** | GPL-2+ | https://github.com/tmalsburg/py-span-task | Long-lived | **Reference** — most battle-tested OSS span. |
| W5 | **CARP cognition_package** | MIT | https://github.com/cph-cachet/cognition_package | Active | **Reference** — Flutter; port Stroop + Flanker + Paired Assoc Learning logic. |
| W6 | **neuropsychology/ComplexSpan** | PsychoPy/GPL | https://github.com/neuropsychology/ComplexSpan | Older, stable | **Reference** — Gonthier-composite paradigm. |

### 3.5 Content: question banks and item pools

| # | Dependency | License | Size | Action |
|---|---|---|---|---|
| Q1 | **Open Trivia DB** | CC-BY-SA 4.0 | ~5k+ verified, continually growing | **Vendor** — binary/MCQ backbone. Attribution on credits page. Live API + Kaggle dump. |
| Q2 | **MMLU (HendrycksTest)** | MIT | 14k test + 1.5k val + 231k aux | **Vendor** — domain-spanning 4-choice MCQ, 57 academic subjects. `12` §2.2. |
| Q3 | **TruthfulQA** | Apache-2.0 | 817 items, 38 categories | **Vendor** — adversarial overconfidence-training set. `12` §2.4. |
| Q4 | **AI2 ARC** | CC-BY-SA 4.0 | 7,787 (Challenge + Easy) | **Vendor** (optional) — grade-school science MCQ. |
| Q5 | **CommonsenseQA** | MIT | 12,102 | **Vendor** (optional) — everyday-reasoning MCQ. |
| Q6 | **SQuAD 2.0 unanswerable items** | CC-BY-SA 4.0 | ~50k unanswerable | **Phase 2 vendor** — best publicly available "no-answer" training set. Needs reading-mode UX. |
| Q7 | **AllenAI Fermi (RealFP + SynthFP)** | **NO LICENSE FILE** — round-1 "Apache-2.0" was WRONG | 928 + 10k | **Watch / negotiate** — email Kalyan et al. to confirm license. Best numeric estimation set if approved. |
| Q8 | **Wikidata SPARQL (backup generator)** | CC0 | Unbounded | **Vendor our own templates** — city-population-comparison, GDP, atomic numbers, birth-date. Fail-safe backbone. |
| Q9 | **BIG-bench subtasks** (known_unknowns, fact_checker, hindsight_neglect) | Apache-2.0 | ~46 items + more | **Vendor** — small high-quality "I don't know" items. |
| Q10 | **OpenPhilanthropy / 80K Hours calibrate-your-judgement** | Code MIT; bank license not declared | ~several thousand binary | **Watch** — email to confirm before vendoring. |
| Q11 | **ICAR Project** | Public domain / CC-BY-equivalent | 1000+ items, 19 constructs incl. 11 matrix-reasoning | **Vendor items directly** — gold-standard reasoning pool. Core of transfer battery. |
| Q12 | **MaRs-IB** | **Non-commercial open-access** — blocks commercial use | 80 matrix items, IRT-analyzed, CVD-friendly | **Negotiate with Blakemore Lab / UCL** or fall back to ICAR + our own generator. |
| Q13 | **Lumosity NCPT open dataset** | CC-BY (Nature SD) | 5.5M subtests, 757k adults | **Vendor norms** — largest open normative cognitive dataset. Moat for "percentile vs. 750k adults" reporting. |
| Q14 | **Cognitive Atlas ontology** | Open (API BSD-ish — verify) | Concepts / tasks / contrasts | **Vendor** for task-tagging metadata layer. |
| Q15 | **The Trivia API** | **CC-BY-NC 4.0 free tier** (round-1 "CC-BY-4.0" was WRONG) | ~13k | **DROP** — NC kills commercial use. OpenTriviaDB covers the need. |
| Q16 | **jService (Jeopardy!)** | Code MIT; **content Sony copyright** | ~200k clues | **Skip** — copyright risk. |
| Q17 | **TriviaQA** | **License effectively indeterminate** | ~95k Q-A | **Skip**. |
| Q18 | **Natural Questions** | CC-BY-SA 3.0 | 315k | **Skip** — passage-heavy schema; low fit without heavy preprocessing. |
| Q19 | **Metaculus public archive** | ToS-restricted | ~30k resolved | **Link-out only**; never redistribute. |
| Q20 | **Good Judgment Open** | No open license | Hundreds public tournaments | **Reference only**. |

### 3.6 Matrix / relational reasoning generator

| # | Dependency | License | URL | Status | Action |
|---|---|---|---|---|---|
| M1 | **raven-gen** | MIT-ish (verify) | https://github.com/shlomenu/raven-gen | Python, stable | **Port** (not vendor) — cleanest RPM generator. 6 files, ~2k LOC Python → ~2300 LOC TS incl. tests + renderer. `11` §7. |
| M2 | **RAVEN (Zhang 2019)** | GPL-3.0 | https://github.com/WellyZhang/RAVEN | CVPR 2019, stable | **Reference only** — algorithms not copyrightable; re-implement. |
| M3 | **I-RAVEN** | Research code | https://github.com/husheng12345/SRAN | AAAI 2021 | **Port** the `separate()` distractor-hypercube loop (`11` §5) — this is the "solvable only by relational reasoning" bit. |
| M4 | **DeepMind PGM** | Dataset-proprietary-ish | https://github.com/deepmind/abstract-reasoning-matrices | Stable | **Reference** — adds XOR/OR/AND logical rules (D2 family). Defer to v2. |
| M5 | **pyRavenMatrices** | Unverified | https://github.com/cmekik/pyRavenMatrices | Low activity | **Reference** — RPM problem-generator prototype. |
| M6 | **ndawlab/mars-irt** | Unverified | https://github.com/ndawlab/mars-irt | Published 2023 | **Port** — IRT scoring (R/Stan) for item-level adaptive difficulty. |

### 3.7 Spaced repetition / scheduling

| # | Dependency | License | URL | Status | Action |
|---|---|---|---|---|---|
| SR1 | **ts-fsrs** | MIT | https://github.com/open-spaced-repetition/ts-fsrs | FSRS-6 default, actively maintained 2025 | **Vendor** — item-level SR for calibration flashcards, matrix rule-family, instruction recall. `13` §8. |
| SR2 | **@open-spaced-repetition/binding** (Rust/WASM optimizer) | MIT | Same monorepo | Active | **Optional vendor** — per-user parameter optimisation once user has >500 reviews. Nightly server batch. |
| SR3 | **py-fsrs** | MIT | https://github.com/open-spaced-repetition/py-fsrs | Active | **Optional** — server-side batch re-optimisation. |
| SR4 | **fsrs-rs** | MIT | https://github.com/open-spaced-repetition/fsrs-rs | Active | **Optional** — not needed unless native/offline. |
| SR5 | **duolingo/halflife-regression** | MIT | https://github.com/duolingo/halflife-regression | Python research, stable | **Port** ~50-line math into TS as domain-level HLR predictor. `13` §5. |
| SR6 | **Anki / AnkiDroid** | AGPL | https://github.com/ankitects/anki | v25.09.2 Sep 2025 | **Reference only** — AGPL viral for SaaS. Don't link. |
| SR7 | **Mnemosyne** | GPL | https://github.com/mnemosyne-proj/mnemosyne | v2.11 Nov 2023 | **Reference only** — note opt-in research telemetry pattern. |

### 3.8 Analytics / inference (server-side, Python)

| # | Dependency | License | Action |
|---|---|---|---|
| A1 | **ruptures** | BSD-2 | **Vendor** — offline change-point detection (PELT). |
| A2 | **pingouin**, **statsmodels** | BSD | **Vendor** — server-side analytics. |
| A3 | **fmin** (BFGS) / **ml-levenberg-marquardt** (npm) | MIT | **Vendor** — hand-write Weibull MLE fit if no pyodide. |
| A4 | **scipy via pyodide** | BSD | **Optional** — for serious offline psychometric fitting. |

### 3.9 Eye tracking / optional

| # | Dependency | License | Action |
|---|---|---|---|
| E1 | **WebGazer.js** | MIT (some builds LGPL — confirm) | **Watch** — optional v2; verify build licence. |

### 3.10 Blocked / off-limits (commercial incompatibility)

| # | What | Why |
|---|---|---|
| B1 | **PsychoPy / PsychoJS** | GPL-3 — do not link |
| B2 | **OpenSesame** | GPL-3 |
| B3 | **Brain Workshop** code | GPL-2 — reference only |
| B4 | **Anki / AnkiDroid** | AGPL |
| B5 | **Mnemosyne** | GPL |
| B6 | **PsyToolkit** | GPL-2 + custom scripting language |
| B7 | **loethen/brain-training-games** | AGPL-3 |
| B8 | **Millisecond Inquisit** | Proprietary |
| B9 | **NIH Toolbox / Mobile Toolbox SDK** | Gated; claims open but not |
| B10 | **Lumosity engine / CANTAB / BrainHQ** | Proprietary |
| B11 | **The Trivia API** | CC-BY-NC 4.0 |
| B12 | **MaRs-IB** for commercial use | Non-commercial open access |
| B13 | **jService content** | Sony copyright |
| B14 | **Raven's SPM/APM/CPM** (Pearson) | Proprietary |
| B15 | **GJOpen / Metaculus item text** | ToS |

---

## 4. Port Plans — What We Rewrite, What It Costs

### 4.1 Stimulus engine (replacing jsPsych runtime)

**Scope:** our own Solid-native equivalent of jsPsych's `pluginAPI` + timeline,
scoped to what we actually ship.

**Files** (sketch from `09` §7):
- `engine/clock.ts` — `performance.now()` + per-frame dt log + monotonic block clock.
- `engine/scheduler.ts` — RAF scheduler with `onShowAt(ms)` / `onHideAt(ms)`.
- `engine/keyboard.ts` — single-root listener with minimum-valid-RT filter.
- `engine/audio.ts` — WebAudio `AudioBufferSourceNode` scheduling via `ctx.currentTime`.
- `engine/results.ts` — typed trial rows streamed to SQLite per `finishTrial`.
- `engine/preload.ts` — per-day asset preloader.

**LOC estimate:** ~800–1000 LOC engine core + tests.
**Time:** 2–3 engineer-weeks.
**Risks:**
- Getting audio preload + unlocking right across Tauri protocols.
- Per-plugin refactor effort (1–2 days / paradigm × 6 modules ~ 2 weeks).
- Foregoing jsPsych's `simulation_mode` (we don't need it for a consumer
  product).

**Gotchas (`09` §8):**
- CSS scoping to avoid bleed.
- One `JsPsych`-equivalent per module run; teardown on completion.
- No i18n support comes for free; strings pass through trial params.

### 4.2 Raven matrix generator

**Scope:** TS port of raven-gen's four-rule generator + I-RAVEN's distractor
hypercube + SVG renderer + static difficulty scoring.

**Files** (from `11` §7):
- `attributes.ts` (~150 LOC), `shapes.ts` + SVG primitives (~200 LOC),
  `component.ts` (~250), `rules.ts` (~400), `matrixTypes.ts` (~200),
  `generator.ts` (~250), `distractors.ts` (~150), `difficulty.ts` (~100),
  `renderer.tsx` (~200), `__tests__/` (~400).

**LOC estimate (MVP v1)**: ~1200 LOC (4 rules × 5 attributes × 3 MatrixTypes
— ONE_SHAPE / FOUR_SHAPE / NINE_SHAPE — I-RAVEN hypercube, 5 SVG primitives,
10 grayscale levels, seeded RNG).
**LOC estimate (full v2)**: ~2300 LOC (adds SHAPE_IN_SHAPE, FOUR_SHAPE_IN_SHAPE,
ANGLE rules, UNIFORMITY=False mode, empirical IRT calibration, PGM-style
XOR/OR/AND optionally).

**Risks / gotchas (`11` §7):**
- `copy.deepcopy` → use `structuredClone` or immer drafts; rule application
  is pure if we're careful.
- Attribute-value index space vs value space (SIZE_VALUES indices 0..5 →
  0.4..0.9); progression adds to the index.
- Tree pruning (~100 LOC port of `prune()`).
- `AttributeHistory` deduplication via `Set<string>` with canonical JSON key.
- Position sampling over slot-index subsets — exhaustive enumeration fine
  (max 9 slots = 2^9 combinations).

**Difficulty phases (`11` §9):**
- **P1 no user data**: static rule-based formula (`11` §6), 5 bands.
- **P2 100+ users × 20 items**: empirical p-value + median RT per template;
  quantile bands.
- **P3 500+ × 50**: 2PL IRT via `mirt` server-side or ported catR-style EAP
  (~300 LOC TS).

### 4.3 Custom transformed staircase (replaces PsychoPy's GPL StairHandler)

**Scope:** n-down/m-up with reversal tracking, shrinking step sizes, log/lin/dB
scales.
**LOC:** ~80 LOC TS (sketch ready in `10` §10.2).
**Risks:** García-Pérez 1998 asymmetric-step correction (`step_up/step_down =
0.7393` for 3-down/1-up to actually converge on 79.4%) or use QUEST.

### 4.4 STOP-IT SSD staircase

**Scope:** 1-up/1-down 50 ms steps clamped to `[SSDstep, MAXRT - SSDstep]`,
plus the lightweight custom-stop-signal plugin (~190 LOC).
**LOC:** ~50 LOC for staircase + ~200 LOC for plugin port.
**Risks:** legacy STOP-IT uses jsPsych 6 numeric keycodes; translate to jsPsych
7+ `e.key` strings. Algorithm from Verbruggen 2019 — not copyrightable.

### 4.5 Englelab span scoring

**Scope:** partial-credit scoring + edit-distance scoring for OSPAN / SymSpan
/ RSpan / RotSpan.
**LOC:** ~150 LOC TS port of R code.
**Risks:** handling mixed correct-order / correct-item credit; match the
englelab definitions exactly. Paper trail: Oswald 2014.

### 4.6 Duolingo HLR domain-level predictor

**Scope:** open-feature log-linear half-life regressor for between-session
performance prediction.
**LOC:** ~50 LOC math + ~50 LOC SGD training loop + ~50 LOC feature extractor.
**Risks:** start θ=0; update after each session; HLR's feature vector is
where the value is (add sessions-count, days-since, last z, 30d mean z,
time-of-day). Don't collapse to FSRS.

### 4.7 Calibration scoring library (Brier / ECE / Murphy decomposition / reliability)

**Scope:** Brier + decomposition into reliability / resolution / uncertainty,
ECE (equal-mass bins), reliability diagram plotter, log score + spherical
alt.
**LOC:** ~200 LOC TS.
**Risks:** **there is no OSS JS library for this** (`08` §3 M6 gap).
Calibration maths is scattered across R scripts per paper. Writing this to
publication standard is a product differentiator.

### 4.8 Psychometric function MLE fit (optional)

**Scope:** port Palamedes `PAL_PFML_Fit` Weibull/Gumbel/logistic MLE.
**LOC:** ~150 LOC (uses `fmin`/`ml-levenberg-marquardt`).
**Risks:** local minima; grid-initialize. Alt: call scipy via pyodide for
research exports.

### 4.9 IRT engine for matrix items (phase 3)

**Scope:** 2-PL IRT item calibration + adaptive selection.
**LOC:** ~300 LOC TS (catR-style EAP).
**Risks:** needs 500+ responses per template before fit stabilises; seed with
Phase 1/2 static bands until then. Alt: `mirt` (R) offline, export difficulty
to JSON.

---

## 5. Licensing Summary — Clean vs Contaminated

### 5.1 Commercial-safe (MIT / Apache / BSD / ISC / public domain)

Runtimes: Tauri, Solid, sqlite-wasm, Observable Plot.
Adaptive: jsQUEST, jsQuestPlus, ts-fsrs, py-fsrs, fsrs-rs.
Paradigm refs / ports: jsPsych core, jspsych-contrib (most), jspsych-
psychophysics, Expfactory, m2c2kit, CARP cognition_package, mentasuave01/
brainworkshop, Cognitive Atlas.
Items: OpenTriviaDB (CC-BY-SA 4.0 — share-alike applies only on adapted
items, not on our app), MMLU, TruthfulQA, CommonsenseQA, ARC (CC-BY-SA),
Lumosity NCPT, ICAR, BIG-bench.

### 5.2 Commercial-hostile (GPL / AGPL / NC / unclear)

**GPL** — do not link into the closed-source product. Re-implement paradigms
(not copyrightable): PsychoPy/PsychoJS, OpenSesame, Brain Workshop, RAVEN
generator (GPL-3), PsyToolkit, OpenWMB.
**AGPL** — especially viral for SaaS: Anki, AnkiDroid, loethen/brain-training-games.
**Non-commercial**: MaRs-IB items (negotiate or use ICAR), The Trivia API.
**No license file** (copyright defaults apply): AllenAI Fermi, OpenBookQA
dataset card, QANTA, STOP-IT repo root, TestMyBrain toolkits (per-toolkit
audit), several thesis repos (Squared jsPsych — audit before vendor).
**ToS-restricted**: Metaculus, GJOpen, Jeopardy/jService content.

### 5.3 Round-1 license corrections

- **AllenAI Fermi** — round 1 said Apache-2.0; **wrong, no LICENSE file.**
  Treat as license-unclear; email Kalyan et al.
- **The Trivia API** — round 1 said CC-BY 4.0; **wrong, CC-BY-NC 4.0 on free
  tier.** Drop.
- **MaRs-IB** — round 1 didn't flag; non-commercial open access only.
- **STOP-IT** — no LICENSE at repo root; port the algorithm (fair use —
  published in Verbruggen 2019), don't redistribute code.
- **Squared jsPsych** — license unclear; audit before vendor. The tasks are
  from a peer-reviewed paper so at worst we re-implement.

### 5.4 CC-BY-SA 4.0 in a commercial app — how it works (from `12` §3)

- **Attribution required** per collection is enough (credits page lists source
  + license + URL).
- **ShareAlike is viral on *the derivative of the licensed data*, NOT on app
  code, UI, or sibling banks.** Verbatim inclusion + filtering is a
  "Collection" not an "Adaptation" → attribution only.
- Adaptations (translating, re-wording, merging) trigger ShareAlike on the
  adapted items themselves. Keep the CC-BY-SA bank files as clean JSON
  alongside proprietary banks, with a NOTICE file.
- **Technical protection measures clause** (4.0 §2.a.5.A): no DRM that
  prevents users from exercising CC rights. Standard app delivery is fine;
  encrypted proprietary blob is grey area.

---

## 6. Cross-Cutting Tensions — Open Decisions

Where dossiers conflict or leave decisions open. Builder must pick.

### T1. Web timing vs. native for UFOV
(Unchanged from round 1.) Web-first in Tauri shell. Ship a display-calibration
block on first session. Tier users into `high-fidelity` / `standard` / `mobile`.
Log achieved duration per trial; reject trials where achieved > requested + 1
frame. This is gate-decision Q1 (§8 below).

### T2. Within-session interleaving — how much?
(Unchanged.) Cross-domain AB-AB in the Orchestrator. Within-domain micro-
interleaving only for Relational Reasoning. Flag for A/B testing once we
have users.

### T3. QUEST prior carryover vs. session-independence
(Unchanged.) Carryover in training mode; fresh priors in diagnostic mode at
transfer-assessment points.

### T4. Compound EF adaptive strategy
**Round 2 sharpens:** hybrid per-dim 3-down/1-up + global gate (`10` §7.4).
Independent staircases on SSD / congruency / switch / rules / RT window,
master difficulty advances only when all dims' SDs stabilise. Revisit
QUEST+ or Thompson bandit once ≥200 users × 8 weeks. 3–5 named archetypes
("High-interference", "Fast-switch") exposed to user on deterministic
rotation, not bandit-driven.

### T5. Complex span — which variants, on what rotation?
(Unchanged.) Rotate OSPAN Mon / SymSpan Tue / RSpan Wed / RotSpan Thu / repeat.
Report PCU + processing accuracy regardless of variant.

### T6. "Antinomous" in Relational Reasoning
(Unchanged.) Ship analogical / anomalous / antithetical in v1. Antinomous is
a stretch goal; if shipped, use TORR-faithful 2-constraint set membership.

### T7. **New:** Calibration flashcards with ts-fsrs vs. pure Brier
`13` recommends FSRS *items* for calibration-meta-facts ("your 70% bin was
65% correct"). Pure Brier + reliability-diagram feedback is the primary
training mechanism; FSRS schedules the *lessons about calibration*, not the
calibration measurements themselves.

### T8. **New:** Scoring mode exposure
Brain Workshop ships two scoring modes (BW-default 80/50 vs Jaeggi 90/75)
silently controlled by a config flag. **We ship both, with plain-English
UI explanations, and always tell the user which one they're on.** `14` §2.2.

---

## 7. Recommended MVP Build Order (Round 2 — Effort-Updated)

### 7.1 The argument for inverting README priority (unchanged)

- UFOV is hardest and most timing-fragile; don't let it block WM.
- Relational Reasoning has the largest item-engine surface area.
- WM is the best-understood paradigm with the most reference implementations.
- The Calibration overlay scaffolds with the Orchestrator.

### 7.2 Concrete order with round-2 effort

**Phase 0 — Foundations (1–2 weeks).** Ship nothing user-facing.
1. Tauri scaffold + TS + SolidJS skeleton.
2. OffscreenCanvas worker render loop.
3. SQLite-over-OPFS schema (append-only session log, schema-versioned).
4. Display-calibration probe (rAF burst → refresh rate, jitter, dropped
   frames per device).
5. **Stimulus engine** skeleton (`clock.ts`, `scheduler.ts`, `keyboard.ts`,
   `audio.ts`, `results.ts`, `preload.ts`). ~800 LOC, 2 weeks. `09` §7.
6. Vendor jsQUEST + jsQuestPlus as TS dependencies.
7. Logging instrumentation (requested_frames, achieved_frames, blur/focus,
   rAF timestamps, RDK-style per-trial frame_rate_array).

**Phase 1 — Orchestrator skeleton + Calibration overlay (1 week).**
8. Orchestrator priority-queue scheduler (`07` §11 pseudocode).
9. Daily dose cap + rest-day enforcement. **Rollover at 4 AM.** `14` §2.1.
10. Metacognitive overlay: pre-block prediction + post-block Brier.
11. Per-domain rolling-regression plateau detector (W=8).
12. Transfer-probe scheduler (hardcoded ICAR item bank; 10-min cap,
    non-adaptive, parallel forms).
13. **Calibration scoring library**: Brier + Murphy decomposition + ECE +
    reliability-diagram plotter (~200 LOC). `4.7` above.
14. **Booster checkpoint scheduler** with hard-coded 30/90/270/540/900/+365
    days. Standalone module with no ts-fsrs dep. `13` §9.
15. Vendor `ts-fsrs`; wire for calibration-meta-facts + instruction-recall.

**Phase 2 — Working Memory Forge (2 weeks).** First real training domain.
16. Dual n-back: 8-position grid + C-H-K-L-Q-R-S-T letter set, 500 ms / 2500 ms
    SOA, 20+n trials/block, 6+6 targets, 25% lures at N≥3.
17. Per-stream d′ + Hautus edge correction.
18. **Two scoring modes exposed with plain-English UI**: Jaeggi strict (per-
    modality 90/75) and BW-default combined (80/50). `14` §2.2.
19. Complex span: automated OSPAN, SymSpan, RSpan, Rotation with processing-
    time calibration (mean + 2.5 SD from practice).
20. PCU + processing accuracy (englelab scoring ported verbatim to TS).
21. Inter-session carryover of adaptive N with SD widening.

**Phase 3 — UFOV Perceptual Speed Engine (3–4 weeks).** The hard one.
22. Random-dot mask (pre-render 50 masks, rotate).
23. Car/truck silhouettes (redrawn SVG, not Ball's originals).
24. 4-subtest ladder with proper 10° peripheral ring.
25. Double 1-up/3-down interleaved staircase (diagnostic). ~80 LOC from `10`
    §10.2 + reversal-mean logic.
26. jsQuestPlus adaptive (training).
27. Virtual-chinrest distance estimation at session start.
28. Per-trial timing integrity check (reject if achieved > requested + 1
    frame); log to session record and exclude from staircase update.
29. Device-tier gating (sub-33 ms disabled on mobile and non-calibrated
    desktops).
30. Photodiode validation on one dev machine before shipping.

**Phase 4 — Compound Executive Controller (2–3 weeks).** Round-2 makes this
feasible.
31. Colored-shape-size stimulus engine with cued rule-switching.
32. Probabilistic layering: switch vs. repeat, flanker congruency, stop
    signal, go/no-go.
33. **Vendor Squared jsPsych** (licence-audit first) for Stroop/Flanker/Simon
    Squared high-reliability attention-control tasks.
34. **Port STOP-IT SSD staircase** (~50 LOC) + custom-stop-signal plugin
    (~200 LOC). `09` §4.
35. Hybrid adaptive: per-dim 3-down/1-up + global gate (`10` §7.4).
36. SSRT integration-with-replacement + race-model sanity check (Verbruggen
    2019).
37. Consider twiecki-style hierarchical Bayesian SSRT as offline enrichment.
38. Variable training (stimuli/cues/rules rotate across sessions) — Karbach-
    Kray ingredient.

**Phase 5 — Relational Reasoning Lab (3–4 weeks).** Bigger than WM but now
LOC-bounded.
39. **MVP v1 matrix generator** (~1200 LOC): 4 rules × 5 attributes × 3
    MatrixTypes (ONE/FOUR/NINE), I-RAVEN distractor hypercube, static
    difficulty banding, SVG renderer + 5 shape primitives, seeded RNG. `11`
    §10.
40. **ICAR item pool** vendored directly for diagnostic + transfer probes
    (public domain).
41. Per-operation item-template modules: analogical (3x3 completion),
    anomalous (5-panel odd-one-out), antithetical (inverse-pair).
42. `ts-fsrs` at **rule-family level** for re-exposure scheduling, retention
    target 0.85. `13` §7B.
43. Phase-2 empirical difficulty calibration after 100+ users × 20 items.
44. Skip antinomous for v1; if shipped, TORR-faithful categorical exclusion.

**Phase 5b — Relational Reasoning v2 (later).** ~1100 more LOC.
45. Matrix generator full: SHAPE_IN_SHAPE, FOUR_SHAPE_IN_SHAPE, ANGLE rules,
    UNIFORMITY mode, optional PGM-style XOR/OR/AND.
46. IRT-based adaptive item selection (2-PL) once 500+ responses per template.
47. Port ndawlab/mars-irt scoring to TS (~300 LOC) or `mirt` offline.

**Phase 6 — Polish + transfer validation (ongoing).**
48. Observable Plot dashboards (per-domain curves, calibration diagrams,
    switch-cost trends, reliability diagrams).
49. Sleep/exercise correlation dashboard with honest N=1 caveats + partial
    correlation.
50. Booster scheduler (CUSUM on maintenance-phase performance).
51. Opt-in research-data contribution (Mnemosyne pattern, off by default).
52. Lumosity NCPT percentile norms dashboard.
53. Per-user FSRS parameter optimisation (nightly batch via
    `@open-spaced-repetition/binding`) once any user has >500 reviews.

### 7.3 What this sequencing buys us

- Every module after Phase 1 inherits calibration overlay + plateau detector
  for free.
- UFOV timing pain doesn't block WM.
- Relational Reasoning item-engine work doesn't block anything.
- After ~5–6 weeks we have 2 working training domains + orchestrator +
  transfer probes — the right time for real user test.
- Compound EF is now tractable (Squared + STOP-IT unblocked it).

---

## 8. Open Questions — Round 2 Update

Many round-1 open questions are now resolved. Struck items are deleted from
the open list; new items added.

### Resolved by round 2

- ~~Q-R1. Is there a credible OSS path to compound EF?~~ **Resolved.**
  Squared jsPsych + STOP-IT + contrib flanker = credible MVP.
- ~~Q-R2. What's the concrete port cost of a matrix generator?~~ **Resolved.**
  ~1200 LOC v1 / ~2300 LOC v2, from `11`.
- ~~Q-R3. Should domain scheduling use FSRS or rule-based?~~ **Resolved.**
  Rule-based; FSRS is for items only. `13`.
- ~~Q-R4. Where does calibration math live?~~ **Resolved.** Ours to write;
  no OSS JS library exists — explicit product differentiator.

### Still open after round 2

**Q1 (critical, unchanged).** Can our web stack hit sub-33 ms UFOV durations
on real hardware? Needs 30-frame rAF calibration burst + photodiode on ≥5
user machines. Consequence if no: UFOV goes Tauri-native with Rust render
loop, doubling its effort.

**Q2.** Does our adaptive Compound EF hybrid converge or thrash? Per-dim
staircases + global gate should stabilise; needs ≥100 sessions × ≥20 users.

**Q3.** Actual plateau session count per domain for our paradigms. Literature
says 12–14 for WM; unclear for compound EF or relational reasoning.

**Q4.** Do boosters restore *transfer* or only trained-task performance?
ACTIVE says both; smaller studies say only trained-task. Needs ≥6 months
longitudinal on our tasks.

**Q5.** Optimal within-session interleaving dose. Literature gives no firm
answer. A/B test within-user once we have users.

**Q6.** Real-world click-to-stimulus-onset latency on target hardware for
SSRT. ~5–15 ms keyboard / 50–70 ms touch (Pronk 2020). **Mobile SSRT
probably not trustworthy** — measure before shipping stop-signal on mobile.

**Q7.** Distractor item-difficulty reliability in Relational Reasoning. LLTM
betas are for Embretson's items; ours may need ~500 pilot trials to
recalibrate.

**Q8.** Do users stick to 25 min/day without streak mechanics? SDT says yes;
adherence literature sparse. Measure dropout from day one.

**Q9.** Pre-block prediction overlay — friction or useful feedback? 24
prediction prompts/week. Test for habituation.

**Q10 (new).** Fermi license. Email Kalyan et al. at AllenAI to confirm.
If blocked, fall back to hand-curated 500 + Wikidata SPARQL + Science
Olympiad pool.

**Q11 (new).** Psychometric-function MLE fit library gap. No OSS JS lib.
Options: port Palamedes `PAL_PFML_Fit` (~150 LOC); call scipy via pyodide;
skip until research exports needed.

**Q12 (new).** Is `ts-fsrs`'s default `request_retention = 0.9` right for
matrix rule-families given transfer noise? Round 2 recommends 0.85; measure
in pilot.

**Q13 (new).** Lumosity NCPT dataset schema match for norming. We assume we
can produce comparable subtest scores; verify column alignment and
population demographics before claiming "750k-adult percentile."

**Q14 (new).** MaRs-IB negotiation outcome. Default to ICAR if UCL /
Blakemore Lab won't license for commercial use.

**Q15 (new).** Squared jsPsych license. Audit before vendor; worst case
re-implement from Burgoyne et al. 2023 paper (~2 weeks).

---

## 9. Honest Marketing Language (unchanged from round 1)

### 9.1 What we can truthfully claim

- Trains specific cognitive capacities that underlie effective thinking.
- **Processing speed training (UFOV)**: strongest long-horizon evidence
  (ACTIVE N=2,832, 20y follow-up; 29% lower dementia at 10y; Edwards 2017,
  Rebok 2014, Coe 2026).
- **Working memory**: reliably improves WM performance (near transfer);
  broad-IQ transfer contested (Soveri 2017 AND Melby-Lervåg 2016).
- **Executive control**: measurable improvement in trained metrics; transfer
  to everyday cognition mixed.
- **Relational reasoning**: matrix practice → matrix performance +
  fluid-reasoning-related tests. Not a general-intelligence booster.
- **Calibration**: broadest transfer evidence. Prediction of real-world
  decision quality rivals IQ for some outcomes.
- Sleep + exercise + training → optimises biological substrate.

### 9.2 Avoid

- "Raises your IQ" / "Makes you smarter" / "Brain age."
- "29% lower dementia risk" as suite-wide claim — UFOV only.
- "Proven to transfer to general intelligence."
- Citing Bollen 2019 as supporting compound-EF transfer (null).
- "4 IQ points" (Au 2015, contested).
- Lumosity/BrainHQ-style copy.

### 9.3 Template disclaimer per module

> This module trains [X]. The trained metrics reliably improve with practice
> (near transfer). Evidence for broader real-world transfer is [strongest for
> UFOV / contested for WM / contested for EF / moderate for relational /
> promising for calibration]. Your progress is reported as measured changes,
> not as an "intelligence" score.

---

## 10. Immediate Actionable Next Steps

Ordered by sequence and dependency. Each item should be checkable within
hours or days of starting.

### 10.1 Content / license unblocking (can start today, parallel to build)

1. **Email Kalyan et al. about AllenAI Fermi license.** Confirm Apache-2.0
   intent or obtain written permission; if declined or silent 30 days,
   assume blocked and pivot to hand-curated 500 + Wikidata SPARQL + Sci-Oly.
2. **Audit license of Squared jsPsych repo** (Burgoyne 2023 tasks). If MIT,
   vendor; if unclear, email authors; if blocked, re-implement from paper.
3. **Email Blakemore Lab / UCL about MaRs-IB commercial use.** Default to
   ICAR if declined.
4. **Pull OpenTriviaDB Kaggle dump, MMLU from HuggingFace, TruthfulQA from
   sylinrl/TruthfulQA.** Wire into a local SQLite `items` table with
   `source`, `license`, `attribution_url` columns. Verify ~21k items load.
5. **Draft the NOTICE / credits page scaffold** listing OpenTriviaDB (CC-BY-
   SA 4.0), MMLU (MIT), TruthfulQA (Apache-2.0), ICAR (public domain).
   CC-BY-SA item files live as separate clean JSON to satisfy §2.a.5.A.

### 10.2 Scaffolding (week 1–2)

6. **Stand up Tauri 2.x scaffold** + TS + SolidJS + SQLite-over-OPFS.
   Append-only session log table with schema-versioned header.
7. **Vendor `ts-fsrs`** (`pnpm add ts-fsrs`). Define persistence schema:
   `(userId, itemId, domain) → Card`. Implement
   `reviewCalibrationItem` / `dueCalibrationItems` per `13` §8.1.
8. **Vendor jsQUEST and jsQuestPlus**. Write TS typings wrapper.
9. **Build the stimulus engine skeleton** (~800 LOC per §4.1).
10. **Clone `research/tmp-jspsych/` + jspsych-contrib + jspsych-psychophysics +
    STOP-IT** as read-only reference trees. Git-ignore.

### 10.3 Gatekeeper probes (week 2–3, resolves Q1)

11. **Build the display-calibration probe**: 30-frame rAF burst → refresh
    rate, jitter, dropped-frame rate, persisted per-device. Tier users
    high-fidelity / standard / mobile.
12. **Start UFOV timing calibration probe on 5 user machines** (desktop Chrome,
    desktop Safari, desktop Firefox, one mobile Chrome, one mobile Safari).
    This is the critical gate for whether UFOV goes web or native.
13. **Measure click-to-stimulus-onset latency** on the same 5 machines for
    SSRT viability (Q6).

### 10.4 First training domain (week 3–5)

14. **Ship WM Forge MVP** (§7.2 Phase 2). Both scoring modes visible.
15. **Wire pre-block prediction overlay + post-block Brier** as cross-cutting
    orchestrator service.
16. **Hard-code booster calendar** (§13 §9 table) as standalone module.

### 10.5 Longer-horizon (month 2+)

17. **Port raven-gen + I-RAVEN hypercube** to TS (~1200 LOC MVP).
18. **Port englelab span scoring** (~150 LOC).
19. **Write calibration scoring library** (Brier + Murphy + ECE + reliability
    diagram). Target publication quality; this is our moat.
20. **Port Duolingo HLR** as domain-level predictor (~150 LOC).
21. **Decide UFOV web vs native** based on probe results; ship Phase 3.
22. **Compound EF Phase 4** — Squared + STOP-IT + hybrid staircase.
23. **Lumosity NCPT column mapping** for percentile-vs-750k-adults feature.

### 10.6 Post-MVP (user data in, 100+ users)

24. Empirical matrix item difficulty calibration; replace static bands.
25. Per-user `ts-fsrs` parameter optimisation (nightly batch via
    @open-spaced-repetition/binding) once any user has ≥500 reviews.
26. A/B test within-session interleaving (Q5) within-user crossover.
27. Photodiode validation pass on production build.
28. ≥500 responses/template → 2-PL IRT on matrices (ndawlab/mars-irt port).

---

## 11. Quick Cross-Reference Index

| Topic | Primary dossier(s) | Section |
|---|---|---|
| UFOV 4 subtests + mask | `01` | §1.2, §1.6, §10 |
| Jaeggi canonical n-back | `02` | §1.1 |
| d′ / SDT / Hautus | `02` | §3 |
| Bollen 2019 null correction | `03` | §0 |
| Karbach-Kray variable training | `03` | §0, §R6 |
| SSRT estimation | `03` | §3 |
| Compound EF thrashing | `03`, `10` | `03` §5, `10` §7.4 |
| RAVEN/I-RAVEN/PGM schemas | `04`, `11` | `11` §1–5 |
| TORR four-operations | `04` | §3 |
| Procedural matrix generator | `04`, `11` | `11` all |
| Brier + Murphy decomposition | `05` | §1 |
| Half-range 50–100% elicitation | `05` | §2 |
| CFAR / 80K / Clearer Thinking refs | `05` | §8 |
| jsPsych internals + port plan | `06`, `09` | `09` all |
| jsPsych `cleanupTrial` gotcha | `09` | §1.1, §5 |
| STOP-IT SSD staircase | `09` | §4 |
| Tauri vs Electron vs Flutter | `06` | §3 |
| SQLite-WASM + OPFS | `06` | §5 |
| License table (round 1) | `06` | §8 |
| License table (round 2 corrections) | `08`, `12`, `13` | `12` §3 |
| Cepeda spacing ratios | `07` | §1 |
| ACTIVE booster schedule | `07`, `13` | `13` §9 |
| ICAR transfer battery | `07`, `08` | `08` §3 M5 |
| Plateau detection | `07` | §5 |
| Orchestrator MVP pseudocode | `07` | §11 |
| SDT-consistent motivation | `07` | §7 |
| OSS task catalog (50 entries) | `08` | §2 |
| m2c2kit discovery | `08` | §5 |
| Squared jsPsych (compound EF) | `08`, `09` | `08` §3 M4 |
| QUEST TS skeleton | `10` | §2.2 |
| Transformed staircase TS skeleton | `10` | §10.2 |
| Question banks, day-one picks | `12` | §4 |
| Fermi license issue | `12` | §2.3, §9 |
| CC-BY-SA 4.0 in commercial app | `12` | §3 |
| Wikidata SPARQL backup | `12` | §7 |
| ts-fsrs (FSRS-6) internals | `13` | §2 |
| Why SR breaks for domains | `13` | §6 |
| Booster checkpoints derivation | `13` | §9 |
| Brain Workshop patterns | `14` | §2, §3 |
| Patterns to avoid (Lumosity FTC) | `14` | §4 |
| Consumer-grade checklist | `14` | §5 |

---

## 12. Final Word

The README is close to right. Round-2 corrections are surgical:
- The Trivia API is dropped (NC).
- Fermi needs a license email.
- jsPsych is ported, not vendored.
- FSRS is for items, not domains.
- Matrix generator has a concrete 1200-LOC recipe.
- Compound EF is unblocked by Squared + STOP-IT.

The dossiers collectively still converge on the same story: **build the
Orchestrator + Calibration overlay first, then Working Memory, then UFOV,
then Compound EF, then Relational Reasoning.** Use Tauri + TS + SolidJS +
OffscreenCanvas + our own stimulus engine (ported patterns from jsPsych) +
jsQuestPlus + ts-fsrs + SQLite-WASM. Measure with SDT + Brier + ICAR. Market
like a serious tool.

The bet you're making that desk research still cannot resolve is **web timing
for UFOV**. Everything else has been flushed out by reading the actual
source. Run the calibration probe first (§10.3). Everything else is
engineering.
