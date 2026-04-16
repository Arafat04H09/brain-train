# Perceptual Speed / UFOV — Deep Research Dossier

Module: Perceptual Speed Engine (flagship). Target: build a web-first, evidence-faithful UFOV trainer with frame-accurate timing, Bayesian-adaptive thresholding, and honest fallbacks when the browser can't hit sub-33 ms durations.

This dossier documents the original paradigm, the algorithms, the open-source landscape, the concrete timing limits of the modern web, and a recommended stack. Inline URLs are primary sources where possible.

---

## 1. Mechanism — What a UFOV trial actually looks like

### 1.1 Origins and canonical reference
UFOV was developed by Karlene Ball (UAB), Daniel Roenker (WKU), and colleagues (Ball, Beard, Roenker, Miller, Griggs 1988; Owsley, Ball et al. 1991). The commercial successor (Visual Awareness, later acquired by Posit Science in 2008) is BrainHQ's "Double Decision." Canonical PC-version psychometric paper: Edwards et al., *Reliability and Validity of UFOV Test Scores as Administered by Personal Computer*, J Clin Exp Neuropsychol 2005/2006 (https://pubmed.ncbi.nlm.nih.gov/16019630/).

### 1.2 The four subtests (modern PC version)
1. **Subtest 1 — Processing Speed (focused attention).** Single central target only.
2. **Subtest 2 — Divided Attention.** Central target + simultaneous peripheral target (localization).
3. **Subtest 3 — Selective Attention.** Central + peripheral + distractors (47 triangles on the commercial test) at same contrast/luminance as the peripheral target, arranged in three concentric rings.
4. **Subtest 4 — Selective Attention with Same/Different Judgment.** Two central stimuli; subject must judge same/different in addition to peripheral localization. (Often folded into "Subtest 3" in research papers; the Inquisit/Visual Awareness materials list it separately — Millisecond manual: https://www.millisecond.com/download/library/v6/usefulfieldofviewtest/usefulfieldofviewtest.manual.)

### 1.3 Canonical stimulus parameters
- **Central target:** Silhouette of a **car** vs. **truck** (binary discrimination), shown inside a fixation box. Images were the original Ball/Roenker silhouettes — see Figshare: https://figshare.com/articles/_The_car_and_truck_targets_from_the_UFOV_central_identification_task_/937098.
- **Peripheral target:** Silhouette of a **car** (single) at one of **8 radial locations** along the cardinal and oblique axes.
- **Eccentricity:** Original Visual Awareness hardware tested out to **~30°** of visual angle. The modern PC/online version places the peripheral target at a fixed **~10–15°** ring (some versions use 5° ring for easy / up to 30° for hardest). BrainHQ's Double Decision adapts eccentricity (moves farther out) as the user improves.
- **Distractors (subtest 3):** 47 outline triangles, same size/contrast/luminance as peripheral target, on three concentric rings. (See K-State VCL and reproductions in Wood & Owsley 2014.)
- **Display duration:** The adaptive variable. Range: **~17 ms to ~500 ms**, matching one to ~30 frames at 60 Hz. PC version uses multiples of the frame period (16.67 ms steps).
- **Post-stimulus mask:** Full-screen **random-dot / spatial-noise mask**, typically presented for ~250–500 ms (some versions up to 3 s before the response screen). The mask is load-bearing — without it, iconic memory extends effective processing time 200–400 ms beyond offset and the whole paradigm collapses into a "how good is your afterimage" test. (Sperling 1960 iconic-memory literature; Breitmeyer & Ogmen on metacontrast masking.)
- **Trial flow:** fixation (≥500 ms) → stimulus (variable ms) → mask (≥250 ms) → response screen (central forced choice first, then 8-way peripheral localization; unlimited time).

### 1.4 The dependent variable
Threshold = display duration (ms) at which the subject achieves **~75% correct** (the Edwards PC version uses 75%; Ball's early work used 50% psychometric midpoint; BrainHQ's Double Decision targets ~79.4% by using a 3-down/1-up staircase). Lower = better. Clinical cutoffs: <100 ms ~ healthy, 100–350 ms ~ mild impairment, >350 ms ~ "high crash risk" in ACTIVE/Ball cohorts.

### 1.5 What BrainHQ Double Decision actually does
Per https://www.brainhq.com/why-brainhq/about-the-brainhq-exercises/attention/double-decision and https://www.brainhq.com/partners/brainhq-for-clinicians/ufov/development/:
- Two vehicle options shown as "target set" (not just car/truck) — the user learns which two they're discriminating this level.
- Peripheral target is a **Route 66 sign** (gamified rebrand of the peripheral car).
- Distractors are **other road signs** that gradually appear.
- Adaptation dimensions (all simultaneously): (1) display duration shortens, (2) peripheral eccentricity grows, (3) vehicles become more similar (perceptual confusability), (4) background scenes grow more complex (figure/ground noise).
- Posit Science licensed the underlying algorithm from Ball/Roenker; "defining scientific elements — divided attention, adaptivity, difficulty, intensity, feedback — were verified consistent" (Roenker, in Posit's own account).

### 1.6 Flags on the README
- README says "three subtests." Technically there are four in the commercial/Edwards version. Subtest 4 (same/different central) is a small addition but worth including for comprehensiveness.
- README says "progressive distractor addition" — correct for the training mode, but the diagnostic test presents distractors only on subtests 3/4 (not progressively within a subtest).
- README says "75% accuracy" — correct for Edwards PC version; note research-grade UFOV scoring uses a **double staircase** that converges there, not a single staircase.

---

## 2. Algorithms — Staircases and Bayesian adaptive procedures

### 2.1 Transformed up-down (Levitt 1971) — the workhorse
Levitt (1971) "Transformed up-down methods in psychoacoustics" (http://bdml.stanford.edu/twiki/pub/Haptics/DetectionThreshold/psychoacoustics.pdf) derived convergence points for various rules:

| Rule | Convergence p(correct) | Notes |
|------|------------------------|-------|
| 1-up / 1-down | 0.500 | Simple |
| 1-up / 2-down | 0.707 | Common |
| **1-up / 3-down** | **0.794** | **UFOV / most used** |
| 1-up / 4-down | 0.841 | Rare |
| 2-up / 1-down | 0.293 | Lower anchor |

**Pseudocode (3-down/1-up, fixed step in frames):**
```
level_frames = 30          # start at 500 ms
step_down = 3              # frames to shorten after 3 consecutive correct
step_up   = 3              # frames to lengthen after 1 error
consec_correct = 0
reversals = []
reversal_target = 8        # terminate after N reversals (or N trials)
last_direction = None

while len(reversals) < reversal_target and trial < max_trials:
    duration_ms = level_frames * 16.67
    correct = run_trial(duration_ms)
    if correct:
        consec_correct += 1
        if consec_correct >= 3:
            new_level = max(1, level_frames - step_down)
            if last_direction == 'up': reversals.append(level_frames)
            last_direction = 'down'
            level_frames = new_level
            consec_correct = 0
    else:
        new_level = min(MAX, level_frames + step_up)
        if last_direction == 'down': reversals.append(level_frames)
        last_direction = 'up'
        level_frames = new_level
        consec_correct = 0

threshold = mean(reversals[-6:])   # drop first 2 reversals, average last 6
```

**Gotcha (Garcia-Pérez 1998, https://pubmed.ncbi.nlm.nih.gov/9797963/):** For 3-down/1-up the step sizes should NOT be equal. To truly converge on 79.4%, step_up / step_down should equal **0.7393**. With equal steps, convergence actually drifts to ~83.15%. For UFOV the precision difference is small, but worth documenting.

### 2.2 QUEST (Watson & Pelli 1983)
Bayesian adaptive: maintains a posterior over the threshold parameter of an assumed Weibull psychometric function, places each trial at the current posterior **mode** (or mean, per Pelli 1987). Paper: https://link.springer.com/article/10.3758/BF03202828. Efficient — reaches 2 dB precision in ~30 trials for 2AFC detection.

Core update (schematic):
```
prior(t)  = Normal(tGuess, tGuessSd)      # over log-contrast or log-duration
for trial in 1..N:
    intensity = argmax_t posterior(t)      # mode, or use quantile
    resp = run_trial(intensity)
    likelihood(t) = psych_fn(intensity, t, beta, gamma, delta) if resp else
                    1 - psych_fn(...)
    posterior(t) *= likelihood(t)
    normalize(posterior)
threshold = mean(posterior)                # or mode
```
Weibull: `p_correct(x; t, beta, gamma, delta) = delta*gamma + (1 - delta)*(1 - (1-gamma)*exp(-10^(beta*(x-t))))` where gamma=guess rate (0.5 for 2AFC), delta=lapse rate (~0.02), beta=slope (~3.5).

JS port: **jsQUEST** (Kuroki, https://kurokida.github.io/jsQUEST/) — a direct port of Psychtoolbox's QUEST with `QuestCreate/QuestQuantile/QuestUpdate/QuestMean/QuestSd`.

### 2.3 ZEST (King-Smith et al. 1994)
Similar to QUEST but uses posterior **mean** placement and a simpler uniform or lognormal prior. Slightly more robust to prior misspecification. Rarely used standalone anymore; folded into Psi.

### 2.4 Psi method (Kontsevich & Tyler 1999)
https://pubmed.ncbi.nlm.nih.gov/10492833/. Bayesian over a **2-D grid** (threshold × slope). Places each trial at the intensity that minimizes expected entropy (maximum-information placement). Estimates threshold in ~30 trials to 2 dB precision; slope requires ~300 trials — which is why for UFOV (we care about threshold, not slope) QUEST is usually preferred.

JS implementations: none mainstream yet; the Palamedes MATLAB toolbox (http://www.palamedestoolbox.org/) and NNiehof/Psi-staircase Python (https://github.com/NNiehof/Psi-staircase) are the reference implementations.

### 2.5 Double staircase (what the commercial UFOV actually uses)
Edwards' PC UFOV runs **two interleaved staircases** — one starting high (500 ms) and stepping down, one starting low (~17 ms) and stepping up. Trial-by-trial the software randomly picks which staircase to advance. Benefits: (a) reduces response bias — subject can't predict direction, (b) each staircase converges from a different side, average = more robust threshold. This is what to replicate for diagnostic mode.

### 2.6 Recommendation for this project
- **Diagnostic runs (pre-test, assessment blocks):** Double interleaved 3-down/1-up staircase, 6–8 reversals per staircase, report mean of last 4 reversals per staircase, take grand mean.
- **Training runs:** QUEST (via jsQUEST or our own port) for faster within-block convergence, with session-to-session prior carryover — each new session's prior mean = last session's posterior mean, with widened SD.
- Enforce **frame-quantized step sizes** (integer frames). All durations are `N * frame_period`.

---

## 3. Open-source implementations found

| Repo / Resource | URL | Relevance |
|---|---|---|
| **jspsych-psychophysics** (Kuroki) | https://github.com/kurokida/jspsych-psychophysics | jsPsych plugin for frame-locked stimulus presentation; supports gabors/shapes/images at arbitrary coords with SOAs. Listed by jsPsych official docs as the recommended plugin for timing-critical experiments. |
| **jsQUEST** (Kuroki) | https://github.com/kurokida/jsQUEST , https://kurokida.github.io/jsQUEST/ | JS port of Psychtoolbox QUEST. Integrates cleanly with jsPsych. |
| **jsPsych visual-search-circle plugin** | https://github.com/jspsych/jsPsych/tree/main/packages/plugin-visual-search-circle | Presents N items on a circle at fixed radius. Not UFOV per se, but the closest off-the-shelf building block for the peripheral ring. |
| **lab.js** (Henninger) | https://github.com/FelixHenninger/lab.js | Alternative experiment builder; strong timing (Chrome/Safari exact on display duration per Henninger 2022). Good fallback if jsPsych ergonomics fail. |
| **PsychoPy + PsychoJS** | https://github.com/psychopy/psychopy | Python for lab/desktop, auto-compiles to JS (psychojs) for web. Probably the single best timing platform online per Bridges 2020 mega-study. |
| **PsychoPy Discourse: UFOV thread** | https://discourse.psychopy.org/ (search "Useful Field of View") | July 2022 thread of a researcher building UFOV in PsychoPy Builder — useful reference for parameter choices. |
| **Inquisit UFOV** | https://www.millisecond.com/library/usefulfieldofviewtest | Commercial but the manual is public; documents the mask, distractor counts, subtest structure precisely. |
| **Palamedes toolbox** | http://www.palamedestoolbox.org/ | MATLAB/Octave reference for psychometric fitting + all adaptive procedures. Read the source. |
| **NNiehof/Psi-staircase** | https://github.com/NNiehof/Psi-staircase | Python Psi/psi-marginal reference if we later add slope estimation. |
| **psybayes** (Acerbi) | https://github.com/lacerbi/psybayes | MATLAB Bayesian adaptive; most mathematically polished. |
| **K-State VCL — ONR studies** | https://www.k-state.edu/psych/vcl/applied-research/ONR-studies.html | Academic UFOV-variant implementations (military research), parameter-documented. |

**Gap finding:** There is **no canonical open-source UFOV implementation** I could locate — no jsPsych plugin, no PsychoPy demo pack entry, no GitHub repo named "ufov" with stars. This is a genuine niche for the project, and it means we should expect to implement from primary sources rather than fork.

---

## 4. Web timing feasibility — concrete numbers

### 4.1 The relevant timing APIs
- `requestAnimationFrame(cb)` — browser fires callback before next repaint. On a 60 Hz display this is **~16.67 ms cadence** and is VSync-locked in all modern engines (Chrome/Firefox/Safari). Ref: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame.
- `performance.now()` — high-resolution monotonic clock. Post-Spectre mitigations (Chrome 91+, https://developer.chrome.com/blog/cross-origin-isolated-hr-timers): resolution clamped to **100 μs** by default; **5 μs** if page is cross-origin-isolated (COOP/COEP headers set). Firefox default: **1 ms** (privacy.reduceTimerPrecision=true). This matters less than you'd think — the real limit is frame cadence, not clock readout.
- `document.timeline.currentTime` — DOM high-res timestamp passed to rAF callback; use this (not `performance.now()` inside rAF) — it corresponds to the actual VSync time the frame is scheduled for.

### 4.2 What published benchmarks actually show

**Bridges et al. 2020 — "The timing mega-study"** (PeerJ, https://peerj.com/articles/9414/). Measured visual presentation timing across PsychoPy, E-Prime, jsPsych, lab.js, Gorilla, PsychoJS, Testable, etc., with photodiode ground truth.
- Lab-based: Psychtoolbox / PsychoPy / Presentation / E-Prime all <1 ms precision.
- Online: **PsychoPy/PsychoJS 2020.1 — <5 ms inter-trial variability in nearly all browser/OS combos; often sub-millisecond.** Lowest RT variability: 0.2 ms on Ubuntu+Chrome.
- jsPsych and lab.js were competitive (a few ms variability) but browser-dependent.

**Anwyl-Irvine et al. 2020 — "Realistic precision and accuracy of online experiment platforms"** (Behav Res Methods, https://link.springer.com/article/10.3758/s13428-020-01501-5). Tested Gorilla, jsPsych 6.0.5, lab.js 19.1, PsychoJS 3.1.5 across Chrome/Edge/Firefox/Safari, macOS+Win10. Key takeaways:
- Most platforms now present within 1 frame of requested duration most of the time.
- **jsPsych 6.0.5 on Firefox/Edge had larger outliers**; Chrome was best.
- **Sub-33 ms durations (≤2 frames) are the regime where outliers become dangerous** — a single dropped frame doubles the stimulus duration.

**Henninger et al. 2022 — lab.js paper** (Behav Res Methods, https://link.springer.com/article/10.3758/s13428-019-01283-5). Using external photodiode: Chrome and Safari matched intended durations exactly for 50/100/250/500/1000 ms conditions.

### 4.3 What this means for UFOV
- **17 ms (1 frame):** feasible but fragile. Any dropped frame = 33 ms displayed. Need frame-based scheduling + integrity checks.
- **33 ms (2 frames):** usually reliable on modern Chrome/Safari with rAF scheduling.
- **50 ms+:** well within spec for all online platforms.
- **BrainHQ's clinical threshold (~40 ms for healthy adults at subtest 1):** achievable on the web with care.
- **Research caution (from README): "below ~33ms":** validated by the literature. We should report achieved duration per trial (from rAF timestamps) and exclude or flag trials where actual > requested + 1 frame.

### 4.4 The VRR / G-Sync / FreeSync problem
Variable-refresh-rate displays break the 16.67 ms assumption — frame period becomes workload-dependent. GitHub W3C discussion: https://github.com/w3c/html/issues/375. Mitigations:
1. Query `screen.refreshRate` (limited support) or measure empirically with a 60-frame rAF burst at startup — compute actual frame period.
2. Specify all durations in **frames**, not ms; the "500 ms" level is always "30 frames at whatever the current period is."
3. On first session, run a **display calibration block** (30 s of rAF sampling) to detect: refresh rate, jitter, dropped-frame rate. Store per-device. Refuse sub-33 ms trials on devices with >5% frame-miss rate.

### 4.5 Mobile browser quirks
- iOS Safari: background-tab throttling is aggressive; rAF can drop to 1 Hz when tab is hidden — must detect `visibilitychange` and pause trials.
- Chrome on Android: OLED displays with VRR (Pixel 120 Hz adaptive) behave unpredictably. Strong recommendation: detect device class, disable sub-50 ms levels on mobile by default.
- Low-power mode on iOS throttles rAF to 30 Hz. Detect via frame-period calibration and refuse training or widen floor.

### 4.6 When native is required
Web can get you to ~33 ms reliably and ~17 ms with effort + per-trial integrity checks. If future clinical-grade / research-grade use is needed (i.e., we want to publish our own validation paper), consider:
- **Tauri** desktop shell with native rendering layer — same JS codebase, better frame pacing control.
- **PsychoPy standalone** for validation studies only.
- **CSS `will-change: transform` + offscreen canvas + GPU preloaded textures** — tricks that measurably reduce jitter.

---

## 5. Eye tracking — is it required?

**Short answer: no, if display durations are short enough.** Here is why and the alternatives.

### 5.1 The saccade argument
A voluntary saccade has a latency of **~200 ms** and a peripheral-guided saccade ~250 ms. UFOV target durations (17–500 ms) plus the immediate mask mean that for durations ≤~200 ms, the subject literally **cannot saccade to the peripheral target before the mask wipes iconic memory** — central fixation is enforced by physics, not software. This is a load-bearing insight from Ball's original design.

For durations >200 ms (the easy end, subtest 1), fixation compliance matters more, but the task by construction pressures it: the central discrimination also requires processing, so subjects learn to keep central gaze.

### 5.2 Practical implication
Original UFOV and BrainHQ Double Decision run without any eye tracking at all — they rely on (a) short durations making saccades impossible, (b) the demand of the central task competing for fixation, (c) the mask eliminating iconic-memory cheating. Bundled in clinical form for 30+ years with no eye tracker.

### 5.3 If we want it anyway
- **WebGazer.js** (https://webgazer.cs.brown.edu/) — webcam-based, MIT-licensed, ~4° accuracy per https://www.jspsych.org/v7/extensions/webgazer/. **Not precise enough for threshold enforcement** but sufficient for compliance gating: "is the subject looking roughly at the center box?" Use only at longer durations (>200 ms) to flag trials where gaze wandered.
- Calibration takes 1–2 minutes and must re-calibrate if user moves. Tolerable once per session at most.

### 5.4 Recommendation
Do **not** ship eye tracking v1. Rely on:
- Short durations → saccade-proof by design.
- Central discrimination task → implicit fixation incentive.
- Post-stimulus mask (mandatory) → no iconic-memory leakage.
- Optional v2: WebGazer compliance monitoring on easy trials only, plus periodic "fixation compliance" diagnostics.

---

## 6. Known pitfalls (implementation booby-traps)

1. **Dropped frames from GC pauses.** V8/SpiderMonkey GC can stall 5–30 ms unpredictably. Mitigation: pre-allocate all trial objects, disable closure creation in hot path, use `OffscreenCanvas` where possible. Run GC-trigger (`new Array(1e6)`) during inter-trial intervals, not during stimuli.
2. **`setTimeout` drift.** Never use `setTimeout` to end a stimulus. Use `requestAnimationFrame` counting frames. setTimeout has 4 ms minimum and can drift 20+ ms under load.
3. **Chained rAF callback timing.** The first rAF timestamp after DOM change can be delayed by layout/paint. Warm-up by calling `ctx.getImageData(0,0,1,1)` at trial-start to force GPU sync.
4. **Monitor refresh rate variance.** If user's monitor is 75 Hz, 120 Hz, 144 Hz — your 16.67 ms assumption is wrong. Always measure at startup.
5. **Input lag.** Keyboard handler latency adds 5–40 ms; irrelevant for UFOV since reaction time isn't the DV, but matters if response screen closes on timeout.
6. **Browser zoom / DPR changes.** If user changes zoom mid-session, eccentricity in degrees drifts. Compute size in CSS px from a viewing-distance estimate (ask at session start: "arm's length, ~50 cm") and monitor physical-size approximation.
7. **Color/contrast on cheap monitors.** UFOV requires distractors at SAME luminance as peripheral target. On uncalibrated displays (all consumer displays) luminance ≠ what you set. Mitigation: use only grayscale values with documented gamma, include a high-contrast mode for low-quality displays.
8. **Fullscreen exit kills trials.** ESC during stimulus = instant abort. Trap ESC, require confirmation.
9. **Mask contamination.** If the random-dot mask is regenerated each trial, load time can steal frames. Pre-render 50 mask canvases at session start, rotate through.
10. **Staircase never converging.** If subject lapses (random button-mashing), 3-down/1-up ratchets up indefinitely. Add a floor (never allow >500 ms) and a lapse-detection check (too many consecutive misses at max duration → abort block).
11. **VRR displays (G-Sync/FreeSync) in fullscreen.** Some drivers turn off VRR for fullscreen web; some don't. Empirical measurement is the only answer.
12. **Chrome throttling rAF for unfocused windows.** `requestAnimationFrame` → 1 Hz when tab loses focus. Detect blur and abort the trial + flag.
13. **Performance.now clamped to 1 ms on Firefox.** Use `document.timeline.currentTime` (passed into rAF callback) — it is not clamped the same way and aligns with VSync.

---

## 7. Recommended tech stack

### 7.1 First principles
- Web-first (per project direction). Native later via Tauri if we hit a wall.
- Use existing, peer-reviewed timing infrastructure — **do not roll our own stimulus scheduler from scratch.**
- Frame-indexed durations everywhere. Never ms in the adaptive state.
- Report actual achieved duration per trial. Log it. Reject bad trials.

### 7.2 Concrete stack
| Layer | Choice | Rationale |
|---|---|---|
| Experiment framework | **jsPsych 8 + jspsych-psychophysics plugin** | jsPsych 8 is the current stable major version; psychophysics plugin is explicitly endorsed by jsPsych docs for timing-critical work. |
| Adaptive procedure | **jsQUEST** for training blocks + **custom double 3-down/1-up** for diagnostic blocks | Best of both. QUEST fast-converges each block; staircase gives clinically-comparable assessment. |
| Rendering | Plugin handles canvas; add `OffscreenCanvas` for mask pre-rendering | Offloads paint work from main thread. |
| Timing clock | `document.timeline.currentTime` via rAF | Not clamped, VSync-aligned. |
| Display calibration | Custom 60-frame burst at session start | Measure refresh rate, jitter, frame-miss rate. Persist per device. |
| Eye tracking | **None in v1.** Plan WebGazer.js hook for v2 compliance monitoring only. | Saccade physics makes it unnecessary for short trials. |
| Stimulus assets | SVG car/truck silhouettes, programmatic random-dot mask | Lightweight, sharp at any DPR. Use Ball/Roenker-style silhouettes (not literal copies — redraw clean). |
| Wrapper / UI | React (TanStack) around jsPsych timeline | Dashboard, session flow, metacognition overlay. jsPsych embeds fine in a React portal. |
| Desktop fallback | **Tauri** (not Electron — Tauri ships Webview2, smaller footprint, same JS, better frame pacing on Win/Mac) | If web timing fails validation, same codebase moves to desktop. |
| Validation | External photodiode (a Teensy + LDR, ~$30) on one developer machine before release | Prove we match requested durations before shipping. |

### 7.3 Implementation recipe
1. Build a 30-frame rAF calibration probe first. Ship nothing until we can measure actual display cadence on the dev machine.
2. Implement mask pre-rendering + stimulus rendering via jspsych-psychophysics, with durations expressed as `N frames`.
3. Wrap jsQUEST for training; implement double-staircase for assessment.
4. Instrument every trial with: requested_frames, achieved_frames, frame_timestamps[], blur_events, focus_lost. Log to local DB (IndexedDB + optional sync).
5. Reject trials with achieved > requested + 1 frame from the staircase update — they're mis-timed and will bias threshold upward.
6. Build a "timing quality" dashboard — per-device, per-session. If device hits <95% on-target trials, switch to a "long-duration" variant (never go below 50 ms).
7. Subtest ordering: always 1 → 2 → 3 (→ 4). Start each session with a 5-trial warm-up at the previous session's threshold + 100 ms.

---

## 8. Open questions / gotchas requiring decisions

1. **Subtest 4 (same/different central) — include or skip?** Commercial UFOV has it; research papers usually drop it. Recommend including for fidelity.
2. **Eccentricity: fixed or adaptive?** Original: fixed. BrainHQ: adaptive. Evidence is not decisive which transfers better. Recommend: fixed (10°) for first 4 sessions, then gradually push out once user reaches 50 ms threshold at subtest 3.
3. **Viewing distance estimation.** Visual angle depends on eye-screen distance. No cheap way to measure in browser. Options: (a) ask user, (b) use credit-card calibration (https://virtualchinrest.web.app/), (c) ignore and express eccentricity in CSS px with reasonable defaults. Recommend (b) — well-validated.
4. **Trials per block / convergence termination.** Edwards PC uses ~30–40 trials per subtest. QUEST can finish in ~20. Recommend 25 per subtest = ~3 minutes total per subtest, 4 subtests = ~12 minutes, fits the 8–10 min session from the README but trends a bit high.
5. **Prior carryover session to session.** QUEST with last-session posterior as next-session prior saves ~30% of trials over time. Do it, but widen SD by 50% between sessions to avoid over-confidence in a stale estimate.
6. **Floor at 1 frame.** Don't allow the staircase to request 0 or sub-frame durations. Clamp at 1 frame.
7. **ACTIVE dose model.** Per README: 10-hour initial protocol. That is ~60 UFOV sessions. Plan scheduling accordingly — plateau expected around session 12–14, followed by weekly booster.
8. **Mobile disable threshold?** Recommend disabling sub-50 ms levels on mobile outright. Show a "training may be less precise on this device" notice.
9. **Clinical comparability.** If we want to compare our thresholds to published norms (Edwards 2006, Owsley), we need to match their exact stimulus: car/truck silhouettes at specific size, 10° eccentricity, 47 distractors, random-dot mask. Worth replicating precisely in "diagnostic mode."
10. **Metacognitive overlay timing.** README wants prediction + calibration embedded. Ask prediction BEFORE each block, show actual AFTER — do not ask mid-trial (breaks timing).

---

## 9. Key citations

Primary papers:
- Ball, K., Beard, B., Roenker, D., Miller, R., Griggs, D. (1988). *Age and visual search: Expanding the useful field of view.* J Opt Soc Am A 5(12), 2210–2219.
- Owsley, C., Ball, K., McGwin, G., et al. (1998). *Visual processing impairment and risk of motor vehicle crash among older adults.* JAMA 279(14), 1083–1088.
- Edwards, J. D., Vance, D. E., Wadley, V. G., et al. (2005). *Reliability and validity of Useful Field of View test scores as administered by personal computer.* J Clin Exp Neuropsychol 27(5), 529–543. https://pubmed.ncbi.nlm.nih.gov/16019630/
- Ball, K., Edwards, J. D., Ross, L. A. (2007). *The impact of speed of processing training on cognitive and everyday functions.* J Gerontol B 62(Spec No 1), 19–31.
- Edwards, J. D., Xu, H., Clark, D. O., Guey, L. T., Ross, L. A., Unverzagt, F. W. (2017). *Speed of processing training results in lower risk of dementia.* Alzheimer's & Dementia: TRCI 3(4), 603–611. https://pmc.ncbi.nlm.nih.gov/articles/PMC5700828/
- Johns Hopkins release (Feb 2026), 20-year ACTIVE follow-up: https://www.hopkinsmedicine.org/news/newsroom/news-releases/2026/02/cognitive-speed-training-linked-to-lower-dementia-incidence-up-to-20-years-later

Psychophysics / adaptive procedures:
- Levitt, H. (1971). *Transformed up-down methods in psychoacoustics.* J Acoust Soc Am 49(2B), 467–477. http://bdml.stanford.edu/twiki/pub/Haptics/DetectionThreshold/psychoacoustics.pdf
- Watson, A. B., Pelli, D. G. (1983). *QUEST: A Bayesian adaptive psychometric method.* Percept Psychophys 33(2), 113–120. https://link.springer.com/article/10.3758/BF03202828
- Kontsevich, L. L., Tyler, C. W. (1999). *Bayesian adaptive estimation of psychometric slope and threshold.* Vision Research 39(16), 2729–2737. https://pubmed.ncbi.nlm.nih.gov/10492833/
- García-Pérez, M. A. (1998). *Forced-choice staircases with fixed step sizes: asymptotic and small-sample properties.* Vision Research 38(12), 1861–1881. https://pubmed.ncbi.nlm.nih.gov/9797963/
- Prins, N. (2013). *The psi-marginal adaptive method.* Journal of Vision 13(7):3.

Web timing:
- Bridges, D., Pitiot, A., MacAskill, M. R., Peirce, J. W. (2020). *The timing mega-study: comparing a range of experiment generators, both lab-based and online.* PeerJ 8:e9414. https://peerj.com/articles/9414/
- Anwyl-Irvine, A., Dalmaijer, E. S., Hodges, N., Evershed, J. K. (2020). *Realistic precision and accuracy of online experiment platforms, web browsers, and devices.* Behav Res Methods 53, 1407–1425. https://link.springer.com/article/10.3758/s13428-020-01501-5
- Henninger, F., Shevchenko, Y., Mertens, U. K., Kieslich, P. J., Hilbig, B. E. (2022). *lab.js: A free, open, online study builder.* Behav Res Methods 54(2), 556–573. https://link.springer.com/article/10.3758/s13428-019-01283-5
- Reimers, S., Stewart, N. (2015). *Presentation and response timing accuracy in Adobe Flash and HTML5/JavaScript web experiments.* Behav Res Methods 47, 309–327.
- Google / Chrome, *Aligning timers with cross-origin isolation restrictions* (blog). https://developer.chrome.com/blog/cross-origin-isolated-hr-timers

Tooling:
- jsPsych docs: https://www.jspsych.org/v8/
- jsPsych timing-accuracy page: https://www.jspsych.org/v8/overview/timing-accuracy/
- jspsych-psychophysics: https://github.com/kurokida/jspsych-psychophysics
- jsQUEST: https://github.com/kurokida/jsQUEST
- PsychoPy / PsychoJS: https://www.psychopy.org/, https://github.com/psychopy/psychopy
- lab.js: https://lab.js.org/
- WebGazer.js: https://webgazer.cs.brown.edu/
- Palamedes toolbox: http://www.palamedestoolbox.org/
- Virtual chinrest / viewing distance calibration: https://virtualchinrest.web.app/
- Inquisit UFOV manual (commercial but publicly readable parameters): https://www.millisecond.com/download/library/v6/usefulfieldofviewtest/usefulfieldofviewtest.manual

---

## 10. README corrections / caveats to flag

1. **"Three subtests" — there are four** in the commercial version (selective attention has two variants). Include subtest 4 or document the omission.
2. **"75% accuracy threshold" is correct for Edwards PC UFOV**, but 3-down/1-up converges on ~79.4%, and if equal step sizes are used it drifts to ~83% (Garcia-Pérez 1998). QUEST targets an arbitrary p chosen by `pThreshold`. Pick 0.75 or 0.794 and be explicit.
3. **"16.67 ms per frame at 60 Hz" assumes 60 Hz**, which is no longer universal. 120 Hz and VRR are increasingly common. Measure, don't assume.
4. **"Web browsers may struggle below ~33ms" — correct**, but with careful frame-scheduling and per-trial integrity checks, 17 ms is achievable in Chrome/Safari. Don't rule out the floor a priori; gate on per-device measurement.
5. **Distractor design on subtest 3 is specific** (47 triangles, three rings, matched luminance) — not "visual clutter." Specify precisely.
6. **Peripheral eccentricity**: "ring distance in degrees" varies by test version (5°, 10°, up to 30°). Pick one, document it, keep it constant during diagnostic runs, adapt only in training mode.
7. **The mask is not optional.** README doesn't mention it; the whole paradigm depends on it.
