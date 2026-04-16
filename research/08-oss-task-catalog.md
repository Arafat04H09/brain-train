# 08 — Open-Source Cognitive Task Catalog

Round 2 research, focused on **source code we can actually use or learn
from**. Round 1 (`06-platforms-and-stack.md`) covered the *frameworks*
(jsPsych, lab.js, PsychoPy, Tauri, etc.); this document catalogs the
*task libraries* and concrete paradigm implementations that exist on
GitHub, GitLab, and OSF as of April 2026, with a reuse verdict for each
against the six Intellect Forge modules:

- **M1 UFOV** — perceptual speed / useful field of view
- **M2 N-back** — dual n-back and variants
- **M3 Span** — complex span (operation / symmetry / reading / rotation)
- **M4 Compound EF** — Stroop / flanker / task-switching / stop-signal
- **M5 Matrix** — Raven-style matrix reasoning
- **M6 Calibration** — metacognitive confidence / calibration

## 1. Landscape Summary

The OSS cognitive-task ecosystem in 2025–26 is **paradigm-dense but
product-sparse**. There are dozens of independent implementations of
every classic paradigm (n-back, Stroop, flanker, span), almost all
**research-grade** — written for a single study, licensed permissively
but unevenly (MIT, BSD-3, Apache, CC-BY, GPL all represented), and
maintained only until the publication ships. Very few repositories
present as a **curated, polished, cross-task battery** the way NIH
Toolbox or Lumosity do commercially. The closest OSS equivalents are
**m2c2kit** (Penn State, Apache-2.0, TypeScript/Skia, actively
maintained in 2025), **CARP cognition_package** (DTU, MIT, Flutter,
active), and the **TestMyBrain toolkits** (Harvard / McLean,
partially open). For item banks, **ICAR** and **MaRs-IB** are the two
public-domain reasoning item pools that matter.

Key licence pattern: **the runtime frameworks are split (jsPsych MIT,
lab.js Apache-2.0 ↔ PsychoPy GPLv3, OpenSesame GPLv3, Brain Workshop
GPLv2, PsyToolkit GPLv2)** but **most individual task repositories on
GitHub default to MIT or BSD-3**. Paradigms themselves are not
copyrightable, so "learn-only" GPL code is still useful as a
reference.

Notable gaps:
- **No OSS UFOV implementation that's honestly production-grade.** The
  SourceForge ufov project is pygame hobby code; nobody has published an
  MIT-licensed JS UFOV with adaptive SOA tracking.
- **No polished compound-EF battery as a single OSS bundle** — you mix
  Stroop from one repo, flanker from another, task-switching from a
  third.
- **No published Brier/calibration-scoring OSS library.** Calibration
  maths is re-implemented per study in R/Python. The scoring code has
  to be ours.
- **No OSS "orchestrator" that schedules multiple paradigms with
  per-module adaptive difficulty.** CARP and m2c2kit get closest but
  are batteries, not trainers.

---

## 2. Master Catalog

Legend for Reuse verdict:
- **Vendor** — copy the code into our repo (licence permits, quality
  OK)
- **Port** — reimplement the algorithm/paradigm from the code
- **Reference** — read for design but don't copy (GPL or weak code)
- **Skip** — not worth the time

| # | Name / URL | Licence | Stack | Scope (tasks) | Maintenance | Modules | Code quality | Reuse |
|---|---|---|---|---|---|---|---|---|
| 1 | **jsPsych v8** · <https://github.com/jspsych/jsPsych> | **MIT** | JS/TS, 0 deps | Runtime + 40+ core plugins; timing primitives | Very active (weekly commits, 1.5k+ stars) | All | Production-grade | **Vendor** core plugins; run in our shell |
| 2 | **jspsych-contrib** · <https://github.com/jspsych/jspsych-contrib> | Per-package (mostly **MIT**) | JS/TS | 40+ community plugins: flanker, spatial-nback, corsi-blocks, tower-of-london, trail-making, stop-signal, visual-search, RDK, BART | Active | M2, M3, M4, M6 | Variable — individually audit | **Vendor** per-package (audit each) |
| 3 | **Expfactory** · <https://github.com/expfactory/experiments> · <https://expfactory.github.io/experiments/> | **BSD-3** | JS/HTML (jsPsych-derived) | 100+ experiments: n-back, digit-span, spatial-span, stroop, flanker, stop-signal, simon, AX-CPT, dim-set-shifting, hierarchical-rule, **ravens**, BART | Semi-active (Poldrack lab) | M2, M3, M4, M5, M6 | Research-grade, heterogeneous | **Port** best reference corpus after jsPsych itself |
| 4 | **m2c2kit** · <https://github.com/m2c2-project/m2c2kit> | **Apache-2.0** | TS + canvaskit-wasm (Skia) | Cross-platform battery: Color Dots (binding), Grid Memory (visuospatial WM), Symbol Search, Color Shapes (change detection) | **Active 2025** (699+ commits, Jest+Playwright CI) | M3 | **Production-grade** — best code quality in the OSS cognitive space | **Vendor** — study the architecture |
| 5 | **CARP cognition_package** · <https://github.com/cph-cachet/cognition_package> | **MIT** | Flutter / Dart | 14 tests spanning 8 domains: MOT, Corsi, Verbal Recognition Memory, Delayed Recall, Flanker, Letter Tapping, Paired Assoc Learning, Picture Seq Memory, RVIP, Reaction Time, Stroop, Finger Tapping, Trail Making, Visual Array | Active | M3, M4 | Production (part of CARP platform) | **Reference** (Flutter, wrong stack); **Port** Stroop + flanker logic |
| 6 | **TestMyBrain toolkits** · <https://www.testmybrain.org/using-tmb/tmb-toolkits.html> | "Open-source" — per-toolkit, licence unclear — needs verification | JS | Digital Neuropsychology Toolkit + Cognitive Science Toolkit; scoring/normative transparent | Active (Harvard/McLean) | M3, M4, M5 | Research-grade, validated in clinic | **Reference** — use as psychometric validation benchmark |
| 7 | **Niv Lab jspsych-demos** · <https://github.com/nivlab/jspsych-demos> | MIT (typical) — verify | JS | Spatial-recall (forward/back), digit-symbol matching, TMB vocab-20, bandit tasks | Active (Princeton) | M3 | Good | **Vendor** spatial-recall and digit-symbol plugins |
| 8 | **Squared jsPsych** · <https://github.com/vrtliceralde/squared_jspsych> | Licence unclear — needs verification | JS (jsPsych) | Stroop Squared, Flanker Squared, Simon Squared — high-reliability attention-control tests (Burgoyne et al. 2023, avg loading .70 on AC factor) | 2023–2024 | **M4 (key)** | Research-grade; tasks are from peer-reviewed paper | **Vendor** — directly addresses compound EF |
| 9 | **STOP-IT (jsPsych)** · <https://github.com/fredvbrug/STOP-IT> · <https://kywch.github.io/STOP-IT/> | Verify per-repo | JS (jsPsych) + R (analysis) | Stop-signal task + SSRT analysis scripts | Maintained | M4 | Research-grade, widely cited | **Vendor** |
| 10 | **neuropsychology/ComplexSpan** · <https://github.com/neuropsychology/ComplexSpan> | Check repo — historical "free to use" | PsychoPy (Python) | Composite complex-span adapted from Gonthier et al. (short single-task WM measure) | Older, stable | M3 | Research-grade | **Reference** (PsychoPy/GPL runtime) — port algorithm |
| 11 | **mahiluthra/working_memory_tests** · <https://github.com/mahiluthra/working_memory_tests> | Verify | Vanilla JS + PHP save | Digit span, operation span, symmetry span, visual array, spatial span (follows Oswald et al. 2014) | Older | **M3 (key)** | Research-grade; decent reference | **Port** — clean JS, algorithm is portable |
| 12 | **tmalsburg/py-span-task** · <https://github.com/tmalsburg/py-span-task> | **GPLv2+** | Python (Tk) | Reading span, operation span (cross-platform desktop) | Long-lived, used in multiple labs | M3 | Research-grade | **Reference** (GPL) — but this is the most battle-tested span OSS |
| 13 | **janakl4us/workingmemory** · <https://github.com/janakl4us/workingmemory> | Verify | Browser JS | Three complex-span tasks in browser | Low activity | M3 | Research demo | Reference |
| 14 | **Java WM Task Battery** · <https://openresearchsoftware.metajnl.com/articles/10.5334/jors.br> | OSS (per JORS policy) | Java | 7 tasks: digit, matrix, arrow, reading, operation, rotation, symmetry span | Stable | M3 | Research-grade | Reference; Java stack won't fit |
| 15 | **OpenWMB** · <https://zenodo.org/doi/10.5281/zenodo.10600494> | GPL (OpenSesame-based) | OpenSesame / Python | 7 WM tasks: reading/operation/symmetry span + n-back + memory updating + binding + multimodal span; published BRM 2024 | Active | **M2, M3** | Research-grade, published | **Reference** (GPL) — authoritative paradigm reference |
| 16 | **englelab R package** · <https://englelab.github.io/englelab/> · <https://englelab.gatech.edu/shortenedtasks.html> | Check (academic) | R for scoring; E-Prime/web for tasks | Automated shortened complex-span (operation/symmetry/rotation); **partial-credit scoring algorithms** | Maintained (Engle Lab, Georgia Tech) | **M3 (key)** | The authoritative span scoring | **Port** the scoring formulae (PartialScore / EditDistanceScore) |
| 17 | **NCMlab/CognitiveTasks** · <https://github.com/NCMlab/CognitiveTasks> | Check | PsychoPy (Python 3.5) | Memory, processing speed, fluid ability, verbal IQ, WM, EF | Older, stable | M3, M4, M5 | Research-grade | **Reference** (PsychoPy) |
| 18 | **mbroedl/cognitive-tasks-for-expyriment** · <https://github.com/mbroedl/cognitive-tasks-for-expyriment> | **MIT** | Python (Expyriment) | Simple RT, visual n-back, trail making, digit span — desktop + Android | Stable | M2, M3, M4 | Research-grade | Reference; wrong stack but MIT |
| 19 | **sho-87/cognitive-battery** · <https://github.com/sho-87/cognitive-battery> | Check (MIT typical) | Python + PyQt5 | Flanker, Raven's-like, Sternberg, others; modular per-task dataframe output | Older (was active 2018–2021) | M3, M4, M5 | Solid | Reference — paradigm reference |
| 20 | **flowersteam/cognitive-testbattery** · <https://github.com/flowersteam/cognitive-testbattery> | Verify (Flowers team tends toward GPLv3) | p5.js (JS) | 7 tasks: multiple-objects tracking, enumeration, go/no-go, load-induced blindness, task-switching, WM, memorability | Older | M1 (MOT adjacent), M4 | Research, published | **Reference** — MOT logic relevant to M1 |
| 21 | **cognitive-battery (thesimonho)** · <https://github.com/thesimonho/cognitive-battery> | Check | Python/PyQt | Eriksen flanker, Raven's, Sternberg | Older | M3, M4, M5 | Research | Reference |
| 22 | **lab.js example library** · <https://github.com/FelixHenninger/lab.js/> | Apache-2.0 (core) | JS | Gallery: BART, Flanker, **N-Back**, paired recall, Simon, Stroop, visual search | Active (Henninger) | M2, M4 | Good | **Vendor** specific example JSON configs |
| 23 | **Brain Workshop (original)** · <https://github.com/brain-workshop/brainworkshop> · <https://brainworkshop.sourceforge.net/> | **GPLv2** | Python + pyglet | Dual / triple / arithmetic / image n-back — the historical reference implementation | Slow (v5 beta) | **M2 (canonical)** | Hobbyist but complete; tons of heuristic tuning | **Reference** (GPL) — paradigm bible for n-back |
| 24 | **mentasuave01/brainworkshop** · <https://github.com/mentasuave01/brainworkshop> | Check repo | TypeScript + Solid.js | Browser port of Brain Workshop; dual + triple n-back + stats | Moderate | **M2 (key)** | Modern stack matches ours (Solid + TS) | **Vendor** if licence permits — very close to our chosen stack |
| 25 | **hindol/dual-n-back** · <https://github.com/hindol/dual-n-back> | Check | React + TS | Dual n-back game | Older | M2 | Simple, clean | Reference |
| 26 | **4skinSkywalker/3D-N-back** · <https://github.com/4skinSkywalker/3D-N-back> | Check | JS | 3D n-back variant | Moderate | M2 | Niche | Reference for 3D variant |
| 27 | **loethen/brain-training-games** · <https://github.com/loethen/brain-training-games> | **AGPL-3.0** | Next.js 15 + TS + Tailwind | Dual N-Back, Schulte Table, Stroop, Reaction Time, Block Memory, Pomodoro | 2024–25 active | M2, M4 | Modern, polished | **Reference only** — AGPL forbids closed-source linking |
| 28 | **ICAR Project** · <https://icar-project.com/> · <https://icar-project.org/> | **Public domain / CC-BY equivalent** (explicitly for open use) | HTML/PDF items, computable via any runner | **1000+ items across 19 constructs** — incl. **11 Matrix Reasoning items (Raven-style)**, letter/number series, 3D rotation, verbal. Uses rule-based item generation | Maintained; expanded into Mobile Toolbox (2024) | **M5 (key)**, supplementary | Gold-standard item bank | **Vendor items directly** — best public-domain reasoning pool |
| 29 | **MaRs-IB** · <https://osf.io/g96f4/> · Paper: <https://royalsocietypublishing.org/doi/10.1098/rsos.190232> | **Non-commercial open-access** (licence restricts commercial use — verify / negotiate) | Gorilla / stimulus PNGs | **80 matrix-reasoning items**, 3 shape sets, CVD-friendly palettes, full IRT analysis | 2024 IRT paper published | **M5 (key)** | Peer-reviewed, psychometrically validated | **Vendor items** — but licence blocks commercial use; **negotiate licence** or use ICAR instead |
| 30 | **RAVEN / I-RAVEN / PGM** · <https://github.com/WellyZhang/RAVEN> · <https://github.com/husheng12345/SRAN> · <https://github.com/shlomenu/raven-gen> | GPLv3 (RAVEN), MIT-ish (raven-gen; verify) | Python (generator) | **Algorithmic RPM generation** — attributed stochastic image grammar; infinite items | Older (RAVEN 2019) but stable | **M5 (generator)** | ML-research-grade | **Port** generation rules; use raven-gen or re-implement |
| 31 | **ndawlab/mars-irt** · <https://github.com/ndawlab/mars-irt> | Check | R / Stan | IRT analysis of MaRs-IB | Published 2023 | M5, M6 | Publication code | **Port** IRT scoring for item-level adaptive difficulty |
| 32 | **pyRavenMatrices** · <https://github.com/cmekik/pyRavenMatrices> | Verify | Python | RPM-style problem generator | Low activity | M5 | Research prototype | Reference |
| 33 | **jsQUEST** · <https://github.com/kurokida/jsQUEST> | **MIT** | JS | Bayesian adaptive threshold (QUEST) | Stable | **M1 (key)** | Production | **Vendor** (already flagged in R1) |
| 34 | **jsQuestPlus** · <https://github.com/kurokida/jsQuestPlus> | **MIT** | JS | Multi-parameter Bayesian (QUEST+, Watson 2017); <1 ms/trial on 37 browsers | Active | **M1 (key)**, M5 | Production | **Vendor** |
| 35 | **Palamedes Toolbox** · <https://www.palamedestoolbox.org/> | Free (academic / personal; not clearly FOSS) | MATLAB / Octave | QUEST, QUEST+, Psi method, Kontsevich-Tyler | Maintained | M1 | Reference implementations | **Port** algorithms if we need Psi |
| 36 | **twiecki/stopsignal** · <https://github.com/twiecki/stopsignal> | BSD-typical | Python (HDDM) | Hierarchical Bayesian SSRT estimation (Matzke et al. 2011) | Stable | M4 | Research-grade | **Port** — the right way to score SSRT |
| 37 | **UOSAN/SST** · <https://github.com/UOSAN/SST> | Verify | PsychoPy | Stop-signal task | Stable | M4 | Research | Reference |
| 38 | **vekteo/Card_sorting_jsPsych** · <https://github.com/vekteo/Card_sorting_jsPsych> | Verify | JS (jsPsych) | Berg / WCST-style card-sorting, color/shape/number | Recent | **M4 (key)** | Good | **Vendor** — direct compound-EF component |
| 39 | **GEJ1/jsPsych_online_TMT** · <https://github.com/GEJ1/jsPsych_online_TMT> | Verify | JS (jsPsych) | Trail-Making Test | Recent | M4 | Good | **Vendor** |
| 40 | **ccraddock/RVIP** · <https://github.com/ccraddock/rvip> | Check | PsychoPy | Rapid Visual Information Processing (sustained attention) | Older | M4 | Research | Reference |
| 41 | **ktec/brainworkshop, andrwj/brainworkshop, samcv/brainworkshop, mentasuave01/brainworkshop** | GPLv2 (downstream) | Python / TS ports | Brain Workshop forks | Various | M2 | Mixed | Reference only (GPL inheritance) |
| 42 | **Cognitive Atlas** · <https://www.cognitiveatlas.org/> · <https://github.com/CognitiveAtlas> | Open (site is CC-derived; API code BSD-ish — verify) | Python API + OWL ontology | **Not a task library — an ontology** of concepts, tasks, contrasts, measures. Programmatic access via cogat-python | Maintained | All (metadata) | Good | **Vendor** the ontology for our task-tagging / concept metadata layer |
| 43 | **PsyToolkit experiment library** · <https://www.psytoolkit.org/experiment-library/> | **GPLv3** | Custom scripting lang | 100+ paradigms incl. task-switching-cued, n-back, stroop, flanker, span, **Raven-style**, IAT | Very active (Stoet) | M2, M3, M4, M5 | Research-grade | **Reference** (GPL + custom lang) — paradigm reference only |
| 44 | **PsychoPy demos** · <https://github.com/psychopy/psychopy/tree/release/psychopy/demos/builder> | **GPLv3** | PsychoPy | Stroop, Stroop Extended, Sternberg, Navon, BART, staircase | Active | M3, M4 | Reference quality | **Reference** (GPL — don't vendor into closed product) |
| 45 | **OpenSesame osdoc tasks** · <https://osdoc.cogsci.nl/> | **GPLv3** | OpenSesame | Large task library | Active | All | Research | Reference |
| 46 | **Lumosity NCPT dataset + tools** · <https://github.com/pauljaffe/lumos-ncpt-tools> | Check (dataset is CC-BY on Nature SD) | Python | **5.5M subtest scores, 757k adults, 8 batteries.** Not task code, but reference-norm dataset for working memory, visual attention, abstract reasoning | Published 2022 | All (norms) | Analysis utilities | **Reference** — the largest open normative dataset we can calibrate against |
| 47 | **SourceForge ufov** · <https://sourceforge.net/projects/ufov/> | GPL (typical SF) | Python + pygame | UFOV-style exercise | Dead-ish | M1 | Hobbyist | **Skip** — reference only |
| 48 | **Tuuleh/masters-battery** · <https://github.com/Tuuleh/masters-battery> | Verify | JS (jsPsych) | Flanker, mental rotation, spatial span, Tower of London | 2019 static | M3, M4 | Thesis-grade | Reference |
| 49 | **rmgeddert/stability-flexibility-tradeoff** · <https://github.com/rmgeddert/stability-flexibility-tradeoff> | Verify | JS | Task-switching, flanker, Navon interference | 2022+ | M4 | Research | Reference for task-switching design |
| 50 | **carp-dk/research.package** · <https://github.com/cph-cachet/research.package> | **MIT** | Flutter | Parent of cognition_package; survey/consent framework | Active | All (wrapper) | Production | Reference — architecture for a research app |

### Additional resources worth mentioning

- **Cognitive Atlas Python API** (`cogat-python`) — programmatic access to the concept/task/measure ontology; useful for auto-tagging our modules with established constructs. <https://cogat-python.readthedocs.io/>
- **jsPsych touchscreen extension** (Springer BRM, 2024) — relevant for mobile deployment. <https://link.springer.com/article/10.3758/s13428-024-02454-9>
- **NIH Toolbox / Mobile Toolbox** — NIH Toolbox itself is **not** open-source; the Python *normative-scoring* code exists but is closed to Assessment Center users. Mobile Toolbox claims "all components open-source" but the SDK is gated. Treat as a clinical benchmark only. <https://mobiletoolbox.org/> · <https://nihtoolbox.org/>
- **Millisecond Inquisit library** — proprietary, but the paradigm descriptions (including their UFOV implementation at <https://www.millisecond.com/download/library/usefulfieldofviewtest>) are educational. Do not copy code.
- **Psychtoolbox-3** — MATLAB-world. MIT-ish licence but wrong stack. Use only for algorithm reference (especially QUEST). <http://psychtoolbox.org/>

---

## 3. Per-Module Shortlists

For each Intellect Forge module, the top-3 OSS resources ranked by
reuse value.

### M1 — UFOV / Perceptual Speed

| Rank | Resource | Why |
|---|---|---|
| 1 | **jsQuestPlus** (MIT) · <https://github.com/kurokida/jsQuestPlus> | The only production-grade OSS adaptive threshold library in JS. Multi-parameter Bayesian; integrates with jsPsych. Vendor directly. |
| 2 | **Palamedes toolbox** (academic-free, MATLAB) | Reference implementations of QUEST, QUEST+, Psi, Kontsevich-Tyler. Port Psi to TS if we want a second adaptive engine. |
| 3 | **flowersteam/cognitive-testbattery** (verify licence) | MOT and load-induced blindness are peripheral-attention paradigms adjacent to UFOV; useful for distractor-subtask design. |

**Gap:** *No honest, OSS, JS-ported UFOV-style task with adaptive
presentation time exists.* We will have to build it. The SourceForge
ufov project is the only thing that names the paradigm and it's a
dead pygame hobby project.

### M2 — Dual N-Back

| Rank | Resource | Why |
|---|---|---|
| 1 | **mentasuave01/brainworkshop** · <https://github.com/mentasuave01/brainworkshop> | TypeScript + **Solid.js** port of Brain Workshop. Our exact stack. Vendor pending licence check (likely inherits GPLv2 from BW original — verify). |
| 2 | **jspsych-contrib plugin-spatial-nback** (MIT) | MIT-safe for a spatial n-back plugin; starting point if we want to run inside jsPsych. |
| 3 | **Brain Workshop (original)** (GPLv2) · <https://brainworkshop.sourceforge.net/> | The paradigm bible. Read for interference-rate tuning, trial timing, lure design. Do not copy code — paradigms aren't copyrightable, re-implement. |

Also notable: **OpenWMB** (GPL) includes a validated n-back for direct
comparison; **hindol/dual-n-back** (React+TS) is a simpler reference.

### M3 — Complex Span

| Rank | Resource | Why |
|---|---|---|
| 1 | **englelab scoring** · <https://englelab.github.io/englelab/> | The canonical partial-credit / edit-distance scoring algorithms for operation/symmetry/rotation span. Port the R scoring code to TS. |
| 2 | **mahiluthra/working_memory_tests** · <https://github.com/mahiluthra/working_memory_tests> | Plain-JS browser implementations of digit/operation/symmetry/visual-array/spatial span; follows Oswald et al. 2014. Clean starting point for a port. |
| 3 | **m2c2kit** (Apache-2.0) · <https://github.com/m2c2-project/m2c2kit> | Best *architectural* reference: TypeScript + Skia canvaskit, cross-platform, well-tested. Grid Memory is adjacent to symmetry span. Vendor architecture patterns. |

Also: **neuropsychology/ComplexSpan** (PsychoPy) and **OpenWMB** for
paradigm-correct references (learn-only, GPL).

### M4 — Compound Executive Function

| Rank | Resource | Why |
|---|---|---|
| 1 | **Squared jsPsych** · <https://github.com/vrtliceralde/squared_jspsych> | Burgoyne et al. 2023 validated Stroop/Flanker/Simon "Squared" — high-reliability attention-control tests, 3 min each, already in jsPsych. Vendor (confirm licence). |
| 2 | **jspsych-contrib plugin-flanker + plugin-stop-signal** (MIT) | First-party-quality flanker with SOA timing and stop-signal plugins; MIT-safe. |
| 3 | **twiecki/stopsignal** · <https://github.com/twiecki/stopsignal> | Hierarchical Bayesian SSRT estimation (Matzke et al. 2011). Port the scoring; it's how modern stop-signal analysis is done. |

Also worth vendoring: **vekteo/Card_sorting_jsPsych** (WCST) and
**GEJ1/jsPsych_online_TMT** (Trail Making). **STOP-IT** (fredvbrug)
gives both the task + R analysis pipeline.

### M5 — Matrix Reasoning

| Rank | Resource | Why |
|---|---|---|
| 1 | **ICAR Project** · <https://icar-project.com/> | Public-domain item pool incl. 11 Raven-style matrix items + rule-based item generation for infinite items. **Best reuse option for a commercial product.** |
| 2 | **MaRs-IB** · <https://osf.io/g96f4/> | 80 validated items, IRT-analyzed, 3 shape sets, CVD-friendly palettes. **Licence is "non-commercial open-access"** — vendor items only after confirming licence with Blakemore Lab / UCL, or fall back to ICAR. |
| 3 | **RAVEN / I-RAVEN / raven-gen** · <https://github.com/shlomenu/raven-gen> · <https://github.com/WellyZhang/RAVEN> | Algorithmic generation (attributed stochastic image grammar). Port the generation rules to produce unlimited items with controlled difficulty. IRT-score with ndawlab/mars-irt method. |

**Gap:** no OSS repository combines "renderer + item bank + IRT
difficulty model + adaptive item selection" in one place. We will
compose it ourselves from ICAR items + mars-irt scoring + a
custom renderer.

### M6 — Calibration / Metacognition

| Rank | Resource | Why |
|---|---|---|
| 1 | **ndawlab/mars-irt** · <https://github.com/ndawlab/mars-irt> | IRT in R/Stan — the right statistical frame for item-level confidence calibration. Port scoring. |
| 2 | **jspsych-contrib confidence/likert plugins** (MIT) | Primitive UI for confidence ratings; combine with our own Brier/ECE scoring layer. |
| 3 | **Cognitive Atlas ontology** (cogat-python) | Tag each confidence judgment with a construct from the atlas (e.g. "metacognitive monitoring") so our reports use established language. |

**Gap:** **there is no OSS TypeScript library for Brier decomposition,
reliability diagrams, or ECE/MCE computation in a psychology context.**
Calibration scoring code will have to be ours. This is a real product
differentiator — we should write it to publication standard.

---

## 4. Licence Summary

Out of 50 catalog entries, the licence split (where identifiable) is
roughly:

- **Permissive (MIT / Apache-2.0 / BSD / ISC / public-domain):** ~55%
  — jsPsych, jspsych-contrib majority, Expfactory (BSD-3), m2c2kit
  (Apache), CARP cognition_package (MIT), mbroedl (MIT), jsQUEST/Plus
  (MIT), ICAR (public-domain), Cognitive Atlas (open), research.package
  (MIT).
- **Copyleft (GPLv2 / GPLv3 / AGPL):** ~25% — Brain Workshop (GPLv2),
  py-span-task (GPLv2+), OpenSesame / PsychoPy / PsyToolkit (GPLv3),
  OpenWMB (inherits OpenSesame), loethen/brain-training-games (AGPL-3).
  **Usable as paradigm reference only; cannot link into a closed-source
  product.** Paradigms themselves are not copyrightable.
- **Non-commercial / restrictive open-access:** MaRs-IB items — free
  for non-commercial research; commercial use requires negotiation.
- **Licence unclear (needs verification):** ~15% — many single-author
  research repos (Squared jsPsych, mahiluthra, TestMyBrain
  per-toolkit, several jspsych thesis repos). **Audit each before
  vendoring.**
- **Commercial / closed:** NIH Toolbox (clinical), Millisecond
  Inquisit, Lumosity engine, Cambridge Brain Sciences, CANTAB.
  Reference benchmarks only.

**Bottom line:** There is more than enough MIT/Apache/BSD code to
assemble Intellect Forge without any GPL contamination. The sharpest
licence risk is **MaRs-IB items** (M5 matrix reasoning) — mitigated
by using ICAR items as primary and/or negotiating with UCL for MaRs-IB
redistribution rights.

---

## 5. Surprising Finds & Gaps

### Surprising finds (worth highlighting)

1. **m2c2kit** (Penn State M2C2 project, Apache-2.0) is the most
   technically impressive OSS cognitive-assessment library of the last
   three years and was **not** in our Round 1 platform survey. It's
   TypeScript-first, uses Google's canvaskit-wasm (Skia) for rendering
   — exactly the architecture Flutter uses under the hood, but with
   JS/TS ergonomics — and has real CI with Jest + Playwright. If we
   wanted a reference for "how a serious cross-platform cognitive
   assessment library is built in 2025," this is it.
2. **Squared tasks** (Burgoyne et al. 2023, jsPsych) are a recent
   breakthrough in attention-control measurement: 3-minute tasks with
   reliability and validity comparable to 20-minute span batteries,
   and the jsPsych implementation is public. This is the best thing
   that has happened to compound-EF measurement in a decade and is
   directly usable.
3. **Lumosity's NCPT open dataset** (757k adults, 5.5M subtests, 2022
   Scientific Data paper, CC-BY) is probably the largest normative
   cognitive-performance dataset ever released. We can use it for
   **population norms** for M3/M4/M5 without building our own norming
   study — a genuine moat for a consumer product.

### Expected but genuine gaps

- **No honest OSS UFOV (M1).** Every claim of "open-source UFOV"
  resolves to either the dead SourceForge pygame project or a study
  that re-implemented the paradigm and didn't release polished code.
  Our UFOV module will be a ground-up build.
- **No single OSS battery of Stroop+flanker+task-switching+stop-signal
  with consistent scoring and adaptive difficulty.** You mix-and-match
  per-paradigm repos. That's an integration opportunity for us.
- **No OSS metacognitive-calibration library** (Brier
  decomposition, reliability diagrams, ECE). The maths is in
  R scripts attached to individual papers — nothing to vendor.
  Writing this well is a differentiator.
- **No OSS orchestrator / adaptive scheduler** across paradigms.
  m2c2kit has session management; nobody has a "periodize this
  trainee across six paradigms over 12 weeks with per-module
  adaptive difficulty" engine. Also ours to build.
- **NIH Toolbox is not open.** Despite the "Mobile Toolbox"
  page claiming open-source components, the actual SDK is gated. Treat
  as a clinical benchmark, not a reuse target.
- **PsyToolkit is GPLv3 and has its own scripting language** —
  surprising amount of paradigm coverage (Raven-style, task-switching,
  IAT) but unreachable for our codebase.

---

## 6. Key URLs (one-stop reference)

- jsPsych core: <https://github.com/jspsych/jsPsych>
- jsPsych contrib: <https://github.com/jspsych/jspsych-contrib>
- Expfactory library: <https://expfactory.github.io/experiments/>
- m2c2kit: <https://github.com/m2c2-project/m2c2kit>
- CARP cognition_package: <https://github.com/cph-cachet/cognition_package>
- TestMyBrain toolkits: <https://www.testmybrain.org/using-tmb/tmb-toolkits.html>
- Squared jsPsych: <https://github.com/vrtliceralde/squared_jspsych>
- Brain Workshop (TS port): <https://github.com/mentasuave01/brainworkshop>
- ICAR item pool: <https://icar-project.com/ICAR_Catalogue.pdf>
- MaRs-IB on OSF: <https://osf.io/g96f4/>
- raven-gen: <https://github.com/shlomenu/raven-gen>
- mars-irt analysis: <https://github.com/ndawlab/mars-irt>
- englelab scoring: <https://englelab.github.io/englelab/>
- mahiluthra WM tests: <https://github.com/mahiluthra/working_memory_tests>
- py-span-task: <https://github.com/tmalsburg/py-span-task>
- STOP-IT: <https://github.com/fredvbrug/STOP-IT>
- twiecki/stopsignal: <https://github.com/twiecki/stopsignal>
- jsQuestPlus: <https://github.com/kurokida/jsQuestPlus>
- Lumos NCPT dataset/tools: <https://github.com/pauljaffe/lumos-ncpt-tools>
- Cognitive Atlas: <https://github.com/CognitiveAtlas> · <https://www.cognitiveatlas.org/>
- OpenWMB: <https://zenodo.org/doi/10.5281/zenodo.10600494>
- PsyToolkit library: <https://www.psytoolkit.org/experiment-library/>
- PsychoPy demos: <https://github.com/psychopy/psychopy/tree/release/psychopy/demos/builder>

---

*Licence and maintenance data collected April 2026. Where the source
page did not explicitly display a licence, the entry reads "licence
unclear — needs verification" and should be checked against the
repository's LICENSE file before vendoring.*
