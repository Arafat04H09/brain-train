# 06 — Platforms & Stack Survey for Intellect Forge

Cross-cutting survey of open-source frameworks, timing primitives, native
vs. web trade-offs, local-first storage, charting, and adaptive
psychophysics libraries for a consumer-grade cognitive training suite.

> Scope reminder: Six modules — UFOV-style perceptual speed (frame-level
> timing), dual n-back, compound executive function, relational/matrix
> reasoning, metacognitive calibration, orchestrator. Multi-session,
> longitudinal, local-first with optional sync.

---

## 1. Experiment Framework Comparison (research-oriented web stack)

| Framework | Lang | License | GUI builder | Timing (online) | Production-grade? | Notes |
|---|---|---|---|---|---|---|
| **jsPsych v8** (2024–2025) | JS/TS | **MIT** | No (code) | Frame-aligned via rAF; ~1 frame (17ms) typical accuracy; sub-ms RT precision | **Usable for consumer apps** but built for research; 100+ plugins | Largest plugin ecosystem; v8 modernised ESM/TS; permissive licence |
| **lab.js** | JS | **Apache-2.0** (docs also mention AGPL for builder) | Yes (drag-and-drop) | Among the best browser timing in Bridges mega-study; sub-ms RT precision | Research first; limited in custom logic | Integrates w/ jsPsych runtime; builder good for non-coders |
| **PsychoPy / PsychoJS** | Python / JS | **GPLv3** | Yes (Builder) | Best-in-class online: <5ms inter-trial variability; often sub-ms; WebGL frame-precise | Research standard; GPL is the sticking point for a commercial product | "Export to JS" can be brittle for complex logic |
| **OpenSesame** | Python | **GPLv3** | Yes | Desktop: lab-grade (Expyriment backend); online via OSWeb is weaker | Research | GPL + Python desktop focus; not a fit for cross-platform consumer |
| **Expfactory** (Stanford) | Python/JS + Docker | **MIT** | No | Variable (collects heterogeneous experiments) | Infrastructure for deploying many experiments, not a framework to build one | Great for task library reuse |
| **Pavlovia** | Hosting for PsychoJS/jsPsych/lab.js | Proprietary SaaS | — | Depends on framework | Research hosting | Paid participant credits — not a deployment target for a product |
| **Gorilla** (compare) | SaaS | **Proprietary** | Yes | Good (in mega-study) but depends on network | No — SaaS research platform | Excluded on principle (vendor lock-in, licensing) |
| **Inquisit (Millisecond)** (compare) | Proprietary desktop | **Proprietary, paid** | Yes | Frame-precise desktop | No — commercial research | Benchmark for what "good" timing looks like |
| **Brain Workshop** | Python (pyglet) | **GPLv2** | No | Desktop, frame-aligned | Hobbyist/open-source dual-n-back reference implementation | Good reference for n-back mechanics; GPL |

**Verdict for Intellect Forge:** jsPsych (MIT) is the only research
framework whose licence and architecture fit a commercial product; PsychoPy
ecosystem is richer scientifically but GPLv3 is a non-starter for
closed-source distribution. lab.js is acceptable (Apache-2.0 core) and
worth pulling in for specific paradigms. Treat jsPsych v8 as the
**paradigm reference** (we may vendor individual plugins) rather than the
runtime shell for the consumer app.

---

## 2. Timing Precision: Concrete Benchmarks

### Key papers

- **Bridges, Pitiot, MacAskill & Peirce (2020), "The timing mega-study",**
  PeerJ 8:e9414 — compared PsychoPy, E-Prime, NBS Presentation,
  Psychtoolbox, OpenSesame, Expyriment, Gorilla, jsPsych, lab.js, Testable.
  Lab-based: PsychoPy/Psychtoolbox/Presentation/E-Prime most precise.
  Online: **PsychoJS sub-ms inter-trial variability in most browsers;
  jsPsych and lab.js ~5–10 ms RT variability within a browser.**
  <https://peerj.com/articles/9414/>
- **Anwyl-Irvine, Dalmaijer, Hodges & Evershed (2021), "Realistic precision
  and accuracy of online experiment platforms, web browsers, and devices",**
  Behavior Research Methods. Windows+Chrome was best; **RT lags of 8–67 ms,
  precision <1–8 ms, visual lag 0–2 frames, variance <10 ms** for most
  combos. <https://link.springer.com/article/10.3758/s13428-020-01501-5>
- **Pronk, Wiers, Molenkamp & Murre (2020), "Mental chronometry in the
  pocket? Timing accuracy of web applications on touchscreen and keyboard
  devices",** Behavior Research Methods 52(3):1371–1382. **RT lags 50–70 ms
  typical on touch devices** (up to 133 ms on an outlier); input hardware
  dominates error on mobile.
- **Pronk et al. (2022), "Precise display time measurement in JavaScript for
  web-based experiments",** BRM. Shows that with a tight rAF loop and
  careful canvas use, **display-duration measurement error can be held to
  <1 frame** on desktop Chrome.
  <https://link.springer.com/article/10.3758/s13428-022-01835-2>

### What you can and cannot assume in 2025

- `performance.now()` resolution: **~5 µs on unisolated contexts, clamped to
  ~100 µs on Chrome / 1 ms jittered on Firefox post-Spectre**. Adequate for
  RT recording.
- `requestAnimationFrame` callbacks are now aligned to vsync with
  **sub-millisecond precision** in modern Chromium (dedicated worker rAF
  also available via `DedicatedWorkerGlobalScope.requestAnimationFrame`).
- Visual onset: you **cannot guarantee the stimulus was on-screen when rAF
  fires** — there is still a GPU/compositor pipeline delay (typically
  ~1 frame). The mitigation is to log the rAF timestamp *after* the next
  rAF fires, i.e. "stimulus is certainly visible by T+1 frame".
- Input: keyboard events on desktop ~5–15 ms added lag (USB polling).
  Touchscreen ~50–70 ms (Pronk). Gamepad polling is typically worst.
- `screen.refreshRate` is supported in Chromium/Firefox but **not Safari**
  and returns the max rate on VRR displays; for the UFOV module we must
  **measure refresh rate at session start with a rAF loop** (~1 Hz
  accuracy in 1–2 s).
- Audio: `AudioWorklet` gives ~3 ms processing block at 44.1 kHz and is
  the most precise timing clock available in the browser — useful as a
  metronome for paced tasks.

### Rule of thumb

| Requirement | Web OK? | Notes |
|---|---|---|
| RT precision <10 ms | **Yes, desktop** | jsPsych/PsychoJS numbers confirm this |
| RT absolute accuracy <20 ms | **Desktop yes, mobile no** (50–70 ms touch lag) | Measure per-device baseline |
| Stimulus duration 1 frame (16.7 ms @ 60 Hz) | **Risky in browser** — typically ±1 frame jitter | Acceptable if you log actual frames shown |
| Sub-frame stimulus timing | **No** — go native | Required for some UFOV paradigms at short SOAs |
| Audio cue to visual onset <5 ms | **No** — use AudioWorklet + rAF fusion (~10–15 ms) | |

---

## 3. Native Stack Options

| Stack | Lang | Bundle / RAM | Timing quality | Mobile? | Solo-maintainer realistic? | Licence | Notes |
|---|---|---|---|---|---|---|---|
| **Tauri 2.x** | Rust + web front-end | ~10 MB installer, ~40 MB RAM; uses WebView2/WKWebView | Web-grade timing + native spawn for precision tasks via Rust | **Yes** (iOS + Android in 2.x) | **Yes** — one codebase, mostly JS | **Apache-2.0 / MIT** | Strong fit; Rust-layer escape hatch for truly precise timing |
| **Electron** | Node + Chromium | 100–200 MB, 200 MB+ RAM | Web-grade | No first-party mobile | Easy, mature ecosystem | **MIT** | Heavy, but proven for consumer apps |
| **React Native + Expo** | JS/TS + native modules | Mid-weight | Good with native modules; bridge latency | Yes (mobile-first) | Yes if mobile-first | **MIT** | Desktop (macOS/Windows) is 2nd-class |
| **Flutter** | Dart | Medium | Frame budget 4 ms p95 in 2025 benchmarks — best of the cross-platform | Yes | Yes | **BSD-3** | Best rendering determinism of the cross-platform options; but Dart is an ecosystem bet, and stimulus libraries are thin |
| **SwiftUI + Jetpack Compose** (true native) | Swift / Kotlin | Small | Best possible | One per platform | **No** — 2× the work | Apple/Google SDK terms | Only if a platform-specific premium UX matters |
| **Unity** | C# | Large | Frame-precise, vsync control, GPU-perfect stimulus | Yes | Overkill for non-3D UI; good if a module is game-like | Proprietary engine, free tier | Unity Experiment Framework exists (academic) |
| **Godot** | GDScript / C# | Small | Good; vsync controllable | Yes | Fine for 2D, less mature for data-heavy dashboards | **MIT** | Charming but thin ecosystem for charts/forms |

### Decision criteria

- **Choose native (Tauri shell or SwiftUI/Compose)** for any module whose
  validity depends on sub-frame stimulus durations or input-device timing
  (UFOV @ short SOAs is the canonical case).
- **Choose web-only** if you can live with ±1 frame stimulus jitter and
  desktop-Chrome RT precision (most cognitive training does — the
  *training signal* survives jitter even if you wouldn't publish a
  100-trial psychophysics study from it).
- **Choose Unity** only if you end up wanting true 3D stimuli or
  game-feel that a web renderer can't deliver.

---

## 4. Modern Web Stack (browser-first path)

### UI framework

- **SolidJS** — fine-grained signal reactivity, ~7 KB runtime, consistently
  fastest in JS-framework benchmarks. **Best fit for a timing-sensitive
  app** because there is literally no component re-render cycle to jank
  rAF callbacks.
- **Svelte 5** — rune-based signals; compiler output, tiny. Comparable
  performance to Solid; better DX / ecosystem maturity.
- **React 19 + Compiler** — closes much of the performance gap for typical
  apps but still has reconciliation overhead and is measurably slower on
  heavy DOM manipulation. Wins on hiring/ecosystem/Storybook/Recharts.

Recommendation: **SolidJS** for the experiment runner shell; **React** is
acceptable if you need the ecosystem and can keep the stimulus surface
off the reactive tree (render stimuli to a `<canvas>` bypassed entirely
by the framework).

### Stimulus rendering

- **Canvas 2D** — right default. Deterministic, cheap, well-understood.
- **OffscreenCanvas + Web Worker rAF** — move the render loop off the
  main thread. Measured: ~4× less main-thread time per frame.
  *This is the single highest-leverage timing decision for the web path.*
- **WebGL / WebGPU** — only if we need a shader effect (useful for some
  contrast/texture UFOV stimuli). PsychoJS uses WebGL specifically for
  frame-precise scheduling on the GPU.
- **SVG** — avoid for timed stimuli; use only for static dashboards.

### Timing primitives

| Primitive | Use for |
|---|---|
| `requestAnimationFrame` | Schedule stimulus onset; timestamp arg is aligned to vsync |
| `performance.now()` | RT recording (microsecond-ish resolution) |
| `OffscreenCanvas` + worker rAF | Keep render loop independent of UI jank |
| `AudioWorklet` | Sub-block audio cues; most precise clock in the browser |
| `screen.refreshRate` | Hint; verify with a rAF calibration at session start |
| `Web Animations API` | Avoid for stimulus timing (not frame-accurate) |
| Dedicated Worker + `postMessage` | Stats, scoring, adaptive updates — never on main thread |

---

## 5. Local-First Data

Longitudinal cognitive data is append-mostly, small per-event,
structured. No heavy collaborative editing. This rules out Yjs/Automerge
as the *primary* storage.

| Option | Fit for longitudinal cognitive data | Notes |
|---|---|---|
| **WA-SQLite + OPFS SyncAccessHandle VFS** (as of SQLite 3.43+) | **Strong**. Real SQL, real indexes, fast | Best single choice for browser; Notion migrated their DB layer to this |
| sqlite3 WASM (official) | Equivalent; official build | Same OPFS story |
| absurd-sql | Obsoleted by official OPFS VFS | Historical |
| **Dexie.js** | Good if we stay on IndexedDB | Simpler than wa-sqlite; 100k+ projects use it; Apache-2.0 |
| **RxDB** | Reactive wrapper over Dexie/OPFS with replication | Heavier; good if we want Mongo-style queries and encrypted fields |
| **Yjs** (CRDT) | Not for the primary store | Use only if we add a collaborative feature (e.g. shared notes) |
| **Automerge 3** | Not for primary store | v3 is 10× lighter than v2 |
| **ElectricSQL** | Good **if** we want SQL + sync | Adds server dependency |
| **PowerSync** | Commercial; SQLite-to-backend sync | Good if we want managed sync |

**Recommendation:**
- Primary store: **SQLite-in-browser via the official sqlite3 WASM + OPFS**
  (wa-sqlite is acceptable, 1.0 released July 2024).
- Schema layer: a thin TypeScript wrapper (not full RxDB) — we don't need
  reactive queries for the main data model.
- Sync (phase 2): **ElectricSQL** or our own push endpoint with
  last-write-wins on the per-session aggregate. Don't adopt PowerSync
  unless we want commercial sync as a dependency.

---

## 6. Charting / Analytics

| Library | Licence | Best for |
|---|---|---|
| **Observable Plot** | ISC | Exploratory dashboards, grammar-of-graphics. **Closest to "serious science" visual language** out of the box |
| **D3** | ISC | When you need a bespoke viz (e.g. item-characteristic curves, calibration diagrams with custom CI bands) |
| **Visx** (Airbnb) | MIT | React + D3 primitives; our pick if the shell is React |
| **Recharts** | MIT | Quick business-y dashboards; not ideal for psychometric curves |

**Recommendation:** Observable Plot for the dashboards (performance
curves over sessions, switch cost, calibration plots) + D3 directly for
one-off scientific visualisations (ROC, psychometric fits, Brier
decomposition). Avoid Recharts — its defaults look like a SaaS, not a
research tool.

---

## 7. Adaptive Algorithm Libraries

| Library | Language | Licence | URL |
|---|---|---|---|
| **Palamedes** | MATLAB | Free for academic/personal, not clearly OSS; confirm before redistribution | <https://www.palamedestoolbox.org/> |
| **Psychtoolbox QUEST** | MATLAB / Octave | MIT-like | Watson & Pelli (1983) reference implementation |
| **jsQUEST** | JavaScript | **MIT** | <https://github.com/kurokida/jsQUEST> · <https://kurokida.github.io/jsQUEST/> |
| **jsQuestPlus** | JavaScript | **MIT** | <https://github.com/kurokida/jsQuestPlus> — QUEST+ (Watson 2017) multi-parameter Bayesian; integrates with jsPsych, PsychoJS, lab.js. Mean <1 ms computation per trial on 37 browser/device combinations. |
| **StaircaseJS** | JavaScript | MIT | <https://github.com/hadrienj/StaircaseJS> — transformed up-down staircase |
| **PsychoPy `data.QuestHandler`, `StairHandler`** | Python | GPLv3 | Part of PsychoPy; useful as a reference implementation, not to link into a commercial product |
| **Psi method** (Kontsevich & Tyler) | — | — | No native TS port known; jsQuestPlus covers the same multi-parameter Bayesian space |
| **ZEST** (King-Smith et al.) | — | — | No JS/TS port found; derivable from jsQuestPlus with a flat prior |

**Recommendation:** Use **jsQuestPlus** (MIT) for any module that needs
threshold tracking (UFOV presentation time, matrix difficulty). For n-back
and EF tasks, a simple 2-up/1-down staircase suffices — implement inline
or vendor StaircaseJS.

---

## 8. Licence Compatibility Table

| Component | Licence | Commercial / closed-source distribution? |
|---|---|---|
| jsPsych (core + most plugins) | **MIT** | Yes |
| jsPsych Contrib plugins | Mixed — check per plugin | Audit before bundling |
| lab.js (core) | Apache-2.0 | Yes |
| lab.js Builder app | AGPL (as hosted app; core runtime is Apache) | Don't embed the builder |
| PsychoPy / PsychoJS | **GPLv3** | **No** — copyleft virus for a closed product |
| OpenSesame | **GPLv3** | No |
| Brain Workshop | **GPLv2** | No |
| Expfactory | MIT | Yes |
| jsQUEST / jsQuestPlus | MIT | Yes |
| StaircaseJS | MIT | Yes |
| Palamedes | Academic free; not clearly OSS | Don't redistribute; reference only |
| Tauri | Apache-2.0 / MIT | Yes |
| Electron | MIT | Yes |
| React / Solid / Svelte | MIT | Yes |
| Dexie | Apache-2.0 | Yes |
| RxDB | Apache-2.0 (core) | Yes; some enterprise modules are commercial |
| Yjs | MIT | Yes |
| Automerge | MIT | Yes |
| ElectricSQL | Apache-2.0 | Yes |
| PowerSync | Commercial SaaS + OSS client | Mixed; check plan |
| sqlite3 WASM / wa-sqlite | Public domain (SQLite) / MIT (wa-sqlite) | Yes |
| Observable Plot / D3 | ISC | Yes |
| Visx / Recharts | MIT | Yes |

**Rule:** We can consume anything MIT / Apache / BSD / ISC freely. We
**cannot link against** PsychoPy/PsychoJS, OpenSesame, or Brain Workshop
source in a closed-source product. We *can* reimplement their paradigms
(paradigms aren't copyrightable) and cite them scientifically.

---

## 9. Recommended Stack for Intellect Forge (opinionated)

### Primary path: **Tauri shell + SolidJS + TypeScript**

- **Shell:** Tauri 2.x — Apache-2.0/MIT, small bundle, mobile-capable,
  Rust escape hatch for any timing-critical work. Ships the same code to
  Windows, macOS, Linux, iOS, Android.
- **UI framework:** SolidJS (MIT) — signals, no reconciliation; stimulus
  surface is `<canvas>` and never touches the reactive tree anyway.
- **Stimulus layer:** OffscreenCanvas in a dedicated Web Worker running
  its own `requestAnimationFrame` loop. Main thread handles UI, worker
  handles stimulus frames, Rust handles anything the worker can't
  (currently nothing, but we reserve the right).
- **Audio:** AudioWorklet for paced-task metronome and any auditory
  stimuli.
- **Refresh-rate / timing calibration:** rAF-loop calibration at the
  start of every session; log measured refresh rate with every trial;
  use `screen.refreshRate` as a hint only.
- **Paradigm library:** jsPsych v8 plugins as a **reference corpus** — we
  vendor the specific plugins we need (MIT, all compatible), but run
  them inside our own runtime (jsPsych's `core.run` is acceptable to
  keep if we want the plugin API). Treat lab.js as a fallback source of
  paradigms, but don't adopt its runtime.
- **Adaptive algorithms:** jsQuestPlus (MIT) for threshold modules;
  inline 2-up/1-down staircase for rule-based difficulty scaling.
- **Local-first storage:** official sqlite3 WASM + OPFS SyncAccessHandle
  VFS, with a thin TS query layer. Full ACID, real SQL, easy to dump/import
  for longitudinal analysis.
- **Sync (phase 2):** ElectricSQL (Apache-2.0) or a custom push endpoint
  with session-level last-write-wins. No CRDTs until we actually have a
  collaborative feature.
- **Dashboards:** Observable Plot + targeted D3 for psychometric /
  calibration curves.
- **Scheduling/orchestrator:** plain TS service inside the app; no
  framework.

### Main trade-off

The alternative — plain **browser-only (PWA) with jsPsych-as-runtime and
IndexedDB/Dexie** — would ship in roughly half the engineering time, have
zero install friction, and let us iterate on paradigm design before
committing to a binary. But it **caps us at web-grade timing** (±1 frame
stimulus jitter, 50–70 ms touch lag) *and* makes a premium, offline,
multi-device product harder to position. Choosing Tauri buys us: (a) a
native-timing escape hatch for UFOV, (b) a real desktop+mobile product
posture, (c) OPFS-backed SQLite without PWA install quirks, at the cost
of roughly one extra engineer-quarter to set up the shell and CI.

### What to skip

- PsychoJS/PsychoPy as a runtime — GPL blocks commercial use; re-export
  path is brittle.
- Electron — too heavy given Tauri exists.
- React Native — strong on mobile but weak on desktop, which we need.
- Unity/Godot — overkill for 2D stimuli + forms + dashboards.
- Yjs/Automerge as primary store — wrong data model for append-mostly
  trial logs.
- Recharts — wrong visual language for an evidence-based product.

---

## 10. Key Citations

- Bridges, D., Pitiot, A., MacAskill, M. R., & Peirce, J. W. (2020).
  The timing mega-study: comparing a range of experiment generators,
  both lab-based and online. *PeerJ*, 8, e9414.
  <https://peerj.com/articles/9414/>
- Anwyl-Irvine, A., Dalmaijer, E. S., Hodges, N., & Evershed, J. K.
  (2021). Realistic precision and accuracy of online experiment
  platforms, web browsers, and devices. *Behavior Research Methods*.
  <https://link.springer.com/article/10.3758/s13428-020-01501-5>
- Pronk, T., Wiers, R. W., Molenkamp, B., & Murre, J. (2020). Mental
  chronometry in the pocket? Timing accuracy of web applications on
  touchscreen and keyboard devices. *Behavior Research Methods*, 52(3),
  1371–1382.
- Pronk, T., et al. (2022). Precise display time measurement in
  JavaScript for web-based experiments. *Behavior Research Methods*.
  <https://link.springer.com/article/10.3758/s13428-022-01835-2>
- Watson, A. B., & Pelli, D. G. (1983). QUEST: A Bayesian adaptive
  psychometric method. *Perception & Psychophysics*, 33(2), 113–120.
- Watson, A. B. (2017). QUEST+: A general multidimensional Bayesian
  adaptive psychometric method. *Journal of Vision*, 17(3):10.
  <https://jov.arvojournals.org/article.aspx?articleid=2611972>
- Kuroki, D. (2021). jsQUEST. <https://kurokida.github.io/jsQUEST/>
- Kuroki, D., & Pronk, T. (2022). jsQuestPlus. *Behavior Research
  Methods*. <https://link.springer.com/article/10.3758/s13428-022-01948-8>
- Henninger, F., Shevchenko, Y., Mertens, U. K., Kieslich, P. J., &
  Hilbig, B. E. (2022). lab.js: A free, open, online study builder.
  *Behavior Research Methods*.
  <https://link.springer.com/article/10.3758/s13428-019-01283-5>
- Mathôt, S., Schreij, D., & Theeuwes, J. (2012). OpenSesame: An
  open-source, graphical experiment builder for the social sciences.
  *Behavior Research Methods*.
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC3356517/>
- jsPsych (de Leeuw, 2015; de Leeuw, Gilbert, & Luchterhandt, 2023).
  MIT-licensed. <https://github.com/jspsych/jsPsych>
- jsPsych timing docs: <https://www.jspsych.org/v8/overview/timing-accuracy/>
- PsychoPy online cautions:
  <https://docs.psychopy.org/online/cautions.html>
- Brain Workshop: <https://brainworkshop.sourceforge.net/> (GPLv2)
- Expfactory: <https://expfactory.org/> (MIT)
- SQLite WASM / OPFS status (PowerSync, 2025):
  <https://www.powersync.com/blog/sqlite-persistence-on-the-web>
- wa-sqlite: <https://github.com/rhashimoto/wa-sqlite>
- Official sqlite3 WASM: <https://sqlite.org/wasm>
- Tauri vs Electron comparison (2025):
  <https://www.gethopp.app/blog/tauri-vs-electron>
- Chrome rAF sub-ms precision announcement:
  <https://developer.chrome.com/blog/requestanimationframe-api-now-with-sub-millisecond-precision>
- OffscreenCanvas: <https://web.dev/articles/offscreen-canvas>
- AudioWorklet: <https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet>
- Observable Plot: <https://observablehq.com/plot/>
- ElectricSQL alternatives page (compares CRDT vs SQL-sync):
  <https://electric-sql.com/docs/reference/alternatives>
