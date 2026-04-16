# 03 — Compound Executive Controller

Layered inhibition + task-switching + interference research dossier for the Intellect Forge "Compound Executive Controller" module.

> Scope: canonical building blocks, how real compound paradigms are constructed, SSRT/switch-cost pseudocode, multi-dimensional adaptive strategies, open-source implementations, and a recommended MVP.

---

## 0. The awkward truth (read first)

The project README asserts that complex compound tasks **do** transfer where single paradigms do not, citing Bollen et al. 2019 (NeuroImage). **Bollen 2019 is actually a null result.** The study explicitly tested the "complexity drives transfer" hypothesis and found that a complex compound task produced *equivalent* transfer to a passive control group, despite producing plastic changes in prefrontal networks. [pubmed.ncbi.nlm.nih.gov/30974240](https://pubmed.ncbi.nlm.nih.gov/30974240/)

Supporting evidence for "complexity → transfer" is really Karbach & Kray (2009), who showed that **variable** task-switching training produced broad transfer (to inhibition, WM, fluid intelligence) across three age groups. [onlinelibrary.wiley.com/doi/10.1111/j.1467-7687.2009.00846.x](https://onlinelibrary.wiley.com/doi/10.1111/j.1467-7687.2009.00846.x). The 2023 Gobet & Sala review ("Cognitive Training: A Field in Search of a Phenomenon") argues far transfer is essentially null once placebo-controls are matched. [pmc.ncbi.nlm.nih.gov/articles/PMC9903001](https://pmc.ncbi.nlm.nih.gov/articles/PMC9903001/)

**Implication for Intellect Forge:** this module is the weakest-evidence domain in the suite. Design it for **near transfer** (trained executive control metrics — switch cost, SSRT, interference cost) and be honest with users that far-transfer evidence is contested. The design principle "variable, adaptive, compound" is the most defensible interpretation of the literature.

---

## 1. Canonical building blocks

### 1.1 Eriksen Flanker

**Stimulus:** central target arrow (or letter) flanked by 4 distractors (2 each side). Example: `<<<<<` (congruent), `<<><<` (incongruent), `--<--` (neutral).

**Standard timings** (varies widely in literature; these are defensible defaults):
- Fixation cross: 500 ms
- Flanker array: 80–800 ms; modal choice ~200 ms or "until response" with 1500 ms cap
- Response window: 800–1500 ms
- ITI: 500–1600 ms (often jittered)

**Response mapping:** left key if central arrow points left, right key if right. Two-alternative forced choice.

**Key metric:** interference/congruency effect = RT(incongruent) − RT(congruent). Congruency effects concentrate in responses <600 ms. [pmc.ncbi.nlm.nih.gov/articles/PMC2864991](https://pmc.ncbi.nlm.nih.gov/articles/PMC2864991/) [en.wikipedia.org/wiki/Eriksen_flanker_task](https://en.wikipedia.org/wiki/Eriksen_flanker_task)

### 1.2 Stroop

**Stimulus:** color word ("RED", "BLUE", "GREEN", "YELLOW") rendered in a possibly mismatched ink color.

**Response mapping:** 4-choice (one key per ink color). Name the **ink color**, ignore the word.

**Timings:**
- Word display: until response, max 2000 ms
- ITI: 500–1000 ms

**Conditions:** congruent, incongruent, neutral (e.g., `XXXXX` in color), sometimes color patches only.

**Key metric:** Stroop effect = RT(incongruent) − RT(congruent).

### 1.3 Go/NoGo

**Stimulus:** two-category stream (e.g., letters; respond to all letters except X). Typical Go:NoGo ratio 80:20 to build a prepotent response.

**Timings:**
- Stimulus: 200–500 ms
- Response window: 1000 ms
- ITI: 500–1500 ms

**Key metrics:** commission errors (responses on NoGo = inhibition failures); omission errors (missed Go). d-prime over Go vs NoGo.

### 1.4 Stop-signal task (SST)

**Distinct from Go/NoGo:** participant is already committing to a response, then a *late* stop signal arrives. Measures *action cancellation*, not action withholding.

**Verbruggen et al. 2019 consensus recommendations** [pmc.ncbi.nlm.nih.gov/articles/PMC6533084](https://pmc.ncbi.nlm.nih.gov/articles/PMC6533084/):
- Go task: 2-choice (typically arrow direction).
- 25% stop trials, 75% go trials.
- Stop signal = auditory tone or color change of go stimulus.
- SSD (stop-signal delay) tracked adaptively: start ~200 ms, ±50 ms staircase on success/failure (50 ms = 3 frames at 60 Hz).
- Goal: p(respond | stop) ≈ 0.50.
- Practice block before experimental.
- Per-participant: check mean RT(unsuccessful stop) < mean RT(go) — race model independence sanity check.

**Canonical open implementation:** STOP-IT (Verbruggen lab), jsPsych version. [github.com/fredvbrug/STOP-IT](https://github.com/fredvbrug/STOP-IT)
- Fixation 250 ms
- Stimulus until response, max 1250 ms
- ITI 750 ms
- Initial SSD 200 ms, step 50 ms
- 4 blocks × 64 trials

### 1.5 Task-switching

**Rogers & Monsell (1995) alternating-runs paradigm:** predictable sequence (AABB). Number-letter: classify letter as vowel/consonant OR classify number as odd/even. Participants rotate through quadrants so each position dictates task. Preparation time = response-stimulus interval (RSI). Switch cost plateaus beyond ~600 ms RSI; residual cost persists even at 3500 ms. [pmc.ncbi.nlm.nih.gov/articles/PMC1779821](https://pmc.ncbi.nlm.nih.gov/articles/PMC1779821/)

**Meiran (1996) cued paradigm:** task unpredictable; explicit cue signals current task. CSI (cue-stimulus interval) manipulated. Longer CSI → smaller switch cost. Residual cost again survives. [escholarship.org/content/qt4cc0166t](https://escholarship.org/content/qt4cc0166t/qt4cc0166t_noSplash_da419b4a67099efe2571b186d2100dca.pdf)

**Typical timings:**
- Cue: 200–500 ms; CSI: 200–1500 ms (manipulate for prep effect)
- Stimulus: until response, max ~3000 ms
- RSI: 500–1000 ms

**Key metrics:**
- Switch cost = RT(switch trial) − RT(repeat trial) within mixed block.
- Mixing cost = RT(repeat in mixed) − RT(single-task pure block). Mixing cost typically > switch cost. [tandfonline.com/doi/full/10.1080/20445911.2022.2089153](https://www.tandfonline.com/doi/full/10.1080/20445911.2022.2089153)
- Residual switch cost = switch cost at long CSI.

### 1.6 AX-CPT / DPX

Cue–probe paradigm, measures proactive vs reactive cognitive control. [sites.wustl.edu/dualmechanisms/ax-cpt-task](https://sites.wustl.edu/dualmechanisms/ax-cpt-task/) [cntracs.ucdavis.edu/dpx](https://cntracs.ucdavis.edu/dpx)

- Trial types (proportions): AX 70% (target), AY 10%, BX 10%, BY 10% (or 72/11/11/6 in DPX).
- Respond "target" only when an A-cue is followed by an X-probe.
- Cue 1000 ms → ISI 2000–5000 ms → probe 500 ms, response window 1500 ms.
- Signature errors: AY errors → excessive proactive control; BX errors → reactive/failure.

DPX replaces letters with dot patterns to avoid verbal rehearsal. Same four trial types, same logic.

---

## 2. How compound tasks are actually constructed in the literature

The literature rarely layers *all four* paradigms simultaneously. Instead, compound tasks are:

**A. Task-switching with ambiguous stimuli.** The dominant design (Karbach & Kray; Koch lineage). Stimuli have features relevant for multiple tasks (e.g., a large fruit); cue dictates which feature to act on. This bakes in interference (irrelevant feature) and set-shifting inside one trial. Karbach & Kray used variable training — cueing, stimuli, and rules rotated across sessions — which was the mechanism for transfer. [pmc.ncbi.nlm.nih.gov/articles/PMC7039846](https://pmc.ncbi.nlm.nih.gov/articles/PMC7039846/)

**B. Hybrid Go/NoGo-Flanker.** Groom & Cragg hybrid: flanker array plus an occasional NoGo. Two conflict sources (perceptual interference + inhibition) with distinct ERP signatures (N2 for flanker, P3 for inhibition). [nature.com/articles/s41598-017-04907-y](https://www.nature.com/articles/s41598-017-04907-y)

**C. Stop-signal combined with X.** Verbruggen's lab systematically combined SST with: go/no-go, flanker, shape matching, n-back, directed forgetting, cued/predictable switching. On stop trials, participants try to cancel whichever task's response. Finding: SSRT increased when distractors were incongruent — interference and inhibition interact. [sciencedirect.com/science/article/abs/pii/S0001691803001203](https://www.sciencedirect.com/science/article/abs/pii/S0001691803001203)

**D. Bollen 2019 compound.** Layered motor-control (bimanual mapping), perceptual-control (stimulus feature), and task-set control (rule switching) into a single trial flow. Tested against a simplified motor-only version. **Null far transfer despite prefrontal plasticity.** [pubmed.ncbi.nlm.nih.gov/30974240](https://pubmed.ncbi.nlm.nih.gov/30974240/)

**Practical pattern across these:** the *base task* (categorization) is always present; additional layers (stop signal, flanker distractors, switch) are **probabilistic** per-trial, not all-simultaneous. "All active simultaneously" in the Intellect Forge README is design-framing, not literal: in practice each trial samples from a distribution of trial types.

---

## 3. SSRT estimation — pseudocode (integration method with replacement)

Per Verbruggen 2019 consensus:

```
function estimateSSRT(goTrials, stopTrials, maxRT):
    # 1. Handle go omissions: replace missing RTs with maxRT (penalty)
    goRTs = []
    for t in goTrials:
        if t.responded: goRTs.append(t.rt)
        else:           goRTs.append(maxRT)      # replacement

    # 2. Compute p(respond | stop)
    pRespondStop = countWhere(stopTrials, t.responded) / len(stopTrials)

    # 3. Sanity: race model check
    unsuccessfulStopRTs = [t.rt for t in stopTrials if t.responded]
    if mean(unsuccessfulStopRTs) > mean(goRTs):
        return INVALID    # race model independence violated

    # 4. Integration: find the p(respond|stop)-th quantile of goRT distribution
    sortedGoRTs = sort(goRTs)
    n = round(pRespondStop * len(sortedGoRTs))
    nthRT = sortedGoRTs[n - 1]     # 1-indexed

    # 5. SSRT = nthRT - mean SSD
    meanSSD = mean([t.ssd for t in stopTrials])
    return nthRT - meanSSD
```

### Staircase SSD tracking

```
SSD = 200 ms
for each stop trial t:
    present go stimulus
    after SSD ms, present stop signal
    record t.responded, t.ssd = SSD
    if t.responded:  SSD = max(SSD - 50, 0)      # made it easier
    else:            SSD = min(SSD + 50, 1000)   # made it harder
```

Single staircase converges on p(respond|stop) ≈ 0.50. For more stable estimation with short blocks, run two interleaved staircases (start 100 ms and 300 ms).

---

## 4. Switch cost and mixing cost — pseudocode

```
function trialMetrics(trials):
    # Assume each trial has: block_type ∈ {pure, mixed},
    #                        trial_type ∈ {switch, repeat, single},
    #                        correct (bool), rt (ms)

    correct = [t for t in trials if t.correct and t.rt > 150]

    rt_pure     = mean([t.rt for t in correct if t.block_type == 'pure'])
    rt_mix_rep  = mean([t.rt for t in correct
                        if t.block_type == 'mixed' and t.trial_type == 'repeat'])
    rt_mix_sw   = mean([t.rt for t in correct
                        if t.block_type == 'mixed' and t.trial_type == 'switch'])

    switchCost  = rt_mix_sw  - rt_mix_rep       # local / specific
    mixingCost  = rt_mix_rep - rt_pure          # global / sustained control
    overallCost = rt_mix_sw  - rt_pure
    return {switchCost, mixingCost, overallCost}
```

- Always exclude the first trial of each block and trials following an error.
- RT-trimming: drop RT < 150 ms (anticipations) and RT > 3 SD from participant mean.
- Compute on correct trials only; report error-switch-cost separately.
- If training, log residual-switch-cost at the longest CSI as the primary plasticity marker.

---

## 5. Multi-dimensional adaptive strategy

Five knobs: **number of rules**, **switch frequency**, **stop-signal delay**, **distractor congruency ratio**, **response window**.

### Why naive per-knob staircases will thrash

Each knob affects accuracy. If you run five independent 1-up/1-down staircases, they compete — pushing accuracy down via harder SSD can trigger a *decrease* in switch frequency on a separate staircase, even though the user is perfectly fine at switching. The staircases interact through the shared accuracy signal.

### Options

**Option A — Hierarchical staircases (recommended for MVP).**
One knob per skill-level, gated by a single composite accuracy target.
- **SSD** — its own independent staircase (fast, per-trial). This is the Verbruggen standard and should not be merged; it has a mathematical target (p=0.5) unlike the others.
- **Congruency ratio** — adjust only after a block (20–30 trials) on flanker accuracy.
- **Switch frequency** — adjust after a block on switch-cost stability (not accuracy — you want a stable non-zero switch cost).
- **Number of rules** — "level-up" condition: adjust only after 2 consecutive blocks at ≥ 80% accuracy *with* a current switch cost < threshold.
- **Response window** — tighten by 5% per block when accuracy > 85%; loosen 10% when < 65%.

This cascades from fast → slow. Only SSD changes within a block. Everything else is between-block.

**Option B — QUEST+ / multidim Bayesian.** QUEST+ supports arbitrary dimensions by modelling a joint psychometric function. Expensive; requires a functional form; implementation overhead high for per-user deployment. Viable if you have >500 trials per user. [jov.arvojournals.org/article.aspx?articleid=2611972](https://jov.arvojournals.org/article.aspx?articleid=2611972)

**Option C — Contextual multi-armed bandit.** Each "arm" is a difficulty preset (e.g., 3 rules + fast window + high incongruency + short SSD). Thompson sampling or UCB picks the arm that maximizes a learning signal (accuracy delta, RT delta, engagement). Handles the "thrashing" problem elegantly because arms are pre-defined coherent combinations. Downside: discrete.

**Practical MVP recommendation:** Option A + a small bandit on top that selects among 3–5 named difficulty archetypes ("High-interference", "Fast-switch", "Inhibition-heavy"). This keeps within-block dynamics simple (just SSD) while still giving long-run adaptation.

### Zone-of-productive-struggle guardrail

Global constraint across all knobs: maintain **70–80% overall accuracy**. If composite accuracy falls below 60%, freeze all knobs for one block and relax the hardest-recently-changed knob. If accuracy exceeds 90% for two blocks, force one knob harder.

---

## 6. Open-source implementations (URLs + quality notes)

| Resource | URL | Notes |
|---|---|---|
| **STOP-IT (jsPsych)** | [github.com/fredvbrug/STOP-IT](https://github.com/fredvbrug/STOP-IT) | Canonical; Verbruggen-endorsed; includes analysis scripts. **Use this as reference.** |
| **Expfactory stop-signal** | [github.com/expfactory-experiments/stop-signal](https://github.com/expfactory-experiments/stop-signal) | Stanford, Poldrack lab. jsPsych-based; older. |
| **Expfactory flanker** | [github.com/expfactory-experiments/flanker](https://github.com/expfactory-experiments/flanker) | Stanford. Minimal but clean. |
| **Expfactory main** | [github.com/expfactory-experiments](https://github.com/expfactory-experiments) | 50+ cognitive tasks; browse for related paradigms. |
| **jsPsych core** | [github.com/jspsych/jsPsych](https://github.com/jspsych/jsPsych) | Framework. v8 preferred. |
| **jspsych-contrib** | [github.com/jspsych/jspsych-contrib](https://github.com/jspsych/jspsych-contrib) | Community plugins; has a flanker plugin by de Leeuw and a stop-signal plugin (limited). Most paradigms require composing `html-keyboard-response` or writing a small custom plugin. |
| **jspsych-hearts-flowers** | [github.com/jodeleeuw/jspsych-hearts-flowers](https://github.com/jodeleeuw/jspsych-hearts-flowers) | Child-friendly task-switching in jsPsych v7. Good reference for switching mechanics. |
| **squared (attention control, Burgoyne 2023)** | [github.com/vrtliceralde/squared_jspsych](https://github.com/vrtliceralde/squared_jspsych) | Modern attention-control battery. |
| **PsychoPy** | [github.com/psychopy/psychopy](https://github.com/psychopy/psychopy) | Demos library includes flanker/Stroop/Simon; Builder GUI. PsychoJS runs in browser. |
| **PsyToolkit** | [psytoolkit.org/experiment-library/](https://www.psytoolkit.org/experiment-library/) | Has cued task-switching, Go/NoGo, flanker. Reference implementations, non-JS. |
| **NIH Toolbox DCCS/Flanker** | [nihtoolbox.org](https://nihtoolbox.zendesk.com/hc/en-us/articles/36421110128788) | Validated adult/child versions; closed source but specifications are published. |
| **OpenSesame conflict tasks** | [jeshuat.github.io/Experimentation1/content/03_conditionals/conflict_tasks.html](https://jeshuat.github.io/Experimentation1/content/03_conditionals/conflict_tasks.html) | Teaching demos, Stroop/flanker/go-nogo. |

**Quality take:** STOP-IT and Expfactory are the two credible references. jspsych-contrib's coverage is thin; expect to write a custom compound-trial plugin. No open-source implementation of a fully-compound (switch + interference + stop + prep-interval) task exists — Intellect Forge would be contributing one.

---

## 7. Stimulus design

Procedural generation is trivial and preferable to datasets:
- **Color** — HSL primaries (`red`, `blue`, `green`, `yellow`, `purple`, `orange`) + WCAG-checked lightness.
- **Shape** — SVG primitives (circle, square, triangle, star, hexagon, diamond).
- **Size** — 3 discrete sizes (small/medium/large) or continuous px range (30–100 px diameter).

Cross-product: 6 colors × 6 shapes × 3 sizes = 108 unique stimuli. Each can be target + flanker; generate on the fly. No asset licensing.

For a letter/digit variant (Rogers-Monsell style): 1–9 digits, A–Z letters, consistent typeface (tabular figures). Render via canvas or SVG for precise timing.

Hold out 2 colors/shapes for a post-training transfer assessment to avoid stimulus-specific learning.

---

## 8. Recommended MVP compound task

### Target task: **"Compound Executive Controller v1"**

A single stimulus per trial is a **colored shape at a particular size**. One of three rules applies, signaled by a pre-stimulus **cue**.

- **Rules (levels 1–3):** color (red/blue ↦ left/right), shape (circle/square ↦ left/right), size (small/large ↦ left/right).
- **Layers per trial** (probabilistic):
  - Rule-switch vs repeat: starts at 33% switch, adapts.
  - Flanker congruency: 4 flanker stimuli either all congruent, all incongruent on the target dimension, or neutral (other-dimension). Incongruency rate starts 33%.
  - Stop signal: on 25% of trials, a red border flashes after SSD; withhold response. SSD staircased ±50 ms around 200 ms start.
  - Interference from irrelevant dimensions is built in (stimulus has color + shape + size; only cued dimension matters).

### Trial structure (defaults)

```
Fixation            500 ms
Cue (rule)          500 ms
CSI                 400 ms   (adaptive 200–1200)
Stimulus            until response or 1250 ms
  └── on 25% trials, stop signal onsets at SSD
ITI                 750 ms  (jitter ±250)
```

### Block structure

- Session = 4 blocks of 48 trials = ~15 minutes.
- First block: 2-rule, 20% switch, 20% incongruent, 25% stop (warm-up / calibration).
- Blocks 2–4: adaptive.
- Optional pure-block calibration (16 trials single-rule) at session start and end to compute mixing cost.

### Adaptive controller (MVP)

Hierarchical (§5 Option A):
- **SSD** staircased per stop trial (single tracker, 50 ms step).
- **Response window, congruency ratio, switch frequency** adjusted between blocks on composite accuracy.
- **Rule count** (2 → 3) gated on 2 consecutive blocks ≥ 80% accuracy with stable (positive) switch cost.
- Accuracy target 70–80%.

### Metrics logged per session

- Overall accuracy, RT mean + SD
- Switch cost (RT-based, accuracy-based)
- Mixing cost (if pure blocks included)
- Commission-error rate (stop failures) + SSRT (integration with replacement)
- Congruency effect RT(incongruent) − RT(congruent)
- Residual switch cost at long CSI
- Race-model sanity check flag

### Honest user-facing framing

> "You're training executive control directly. Your switch cost, SSRT, and interference cost should improve meaningfully (near transfer). Evidence for transfer to everyday cognition is mixed — we measure real movement in these scores rather than promising improved 'intelligence'."

---

## 9. Open questions & risks

**R1 — Transfer is contested.** Bollen 2019 is a null; Gobet & Sala 2023 meta-review argues far transfer is essentially absent. This module's public narrative must not overclaim. Biggest reputational risk in the suite.

**R2 — Adaptive thrashing.** Five simultaneous knobs will oscillate if naively staircased. Hierarchical/bandit approach needed. Requires pilot testing to confirm stability.

**R3 — SSRT validity depends on race-model integrity.** If users strategically slow on the go task (waiting for a possible stop), SSRT estimates are garbage. Enforce instructions + check `mean RT(unsuccessful stop) < mean RT(go)` post-session; invalidate SSRT otherwise.

**R4 — Switch cost reliability is notoriously poor.** Individual differences in switch cost have modest test-retest reliability (often r < 0.5). Pre/post changes need large N of trials (200+) per session to detect individual movement.

**R5 — Motor confounding.** If response window is a knob, RT-based metrics become non-comparable across sessions. Prefer keeping response window near-fixed (e.g., 1250 ms) and adapting other knobs; log window separately.

**R6 — Karbach & Kray's "variable training" ingredient.** Their transfer found transfer when training *varied stimuli, cues, and rules across sessions*. Intellect Forge must actively vary these (not just repeat the same rule set daily) to have any claim on their evidence.

**R7 — Fatigue/engagement.** Compound load is mentally expensive. Session length should cap at ~15 min. Beyond that, accuracy declines and measurement becomes noise.

**R8 — Metric leakage into adaptation.** If accuracy drives *all* adaptation, the system will converge on a fixed ~75% accuracy point regardless of actual capacity growth. Include a separate "difficulty headroom" score (hardest combo the user can sustain) as the primary progress indicator.

---

## 10. Key citations

- **Verbruggen, F., Aron, A. R., Band, G. P. H., et al. (2019).** *A consensus guide to capturing the ability to inhibit actions and impulsive behaviors in the stop-signal task.* eLife. [pmc.ncbi.nlm.nih.gov/articles/PMC6533084](https://pmc.ncbi.nlm.nih.gov/articles/PMC6533084/)
- **Bollen, Z. et al. (2019).** *Executive control training does not generalize, even when associated with plastic changes in domain-general prefrontal areas.* NeuroImage. [pubmed.ncbi.nlm.nih.gov/30974240](https://pubmed.ncbi.nlm.nih.gov/30974240/)
- **Karbach, J., & Kray, J. (2009).** *How useful is executive control training? Age differences in near and far transfer of task-switching training.* Developmental Science. [onlinelibrary.wiley.com/doi/10.1111/j.1467-7687.2009.00846.x](https://onlinelibrary.wiley.com/doi/10.1111/j.1467-7687.2009.00846.x)
- **Rogers, R. D., & Monsell, S. (1995).** *Costs of a predictable switch between simple cognitive tasks.* Journal of Experimental Psychology: General.
- **Meiran, N. (1996).** *Reconfiguration of processing mode prior to task performance.* JEP:LMC.
- **Logan, G. D., & Cowan, W. B. (1984).** *On the ability to inhibit thought and action: A theory of an act of control.* Psychological Review.
- **Eriksen, B. A., & Eriksen, C. W. (1974).** *Effects of noise letters upon the identification of a target letter in a nonsearch task.* Perception & Psychophysics.
- **Braver, T. S. et al. — Dual Mechanisms of Cognitive Control (AX-CPT).** [sites.wustl.edu/dualmechanisms](https://sites.wustl.edu/dualmechanisms/ax-cpt-task/)
- **MacLeod, W. et al. — DPX Task.** [cntracs.ucdavis.edu/dpx](https://cntracs.ucdavis.edu/dpx)
- **Watson, A. B. (2017).** *QUEST+: A general multidimensional Bayesian adaptive psychometric method.* Journal of Vision. [jov.arvojournals.org/article.aspx?articleid=2611972](https://jov.arvojournals.org/article.aspx?articleid=2611972)
- **Gobet, F., & Sala, G. (2023).** *Cognitive Training: A Field in Search of a Phenomenon.* Perspectives on Psychological Science. [pmc.ncbi.nlm.nih.gov/articles/PMC9903001](https://pmc.ncbi.nlm.nih.gov/articles/PMC9903001/)
- **Groom, M. J., & Cragg, L. (2015).** *Hybrid Go/NoGo flanker N2/P3 dissociation.* [nature.com/articles/s41598-017-04907-y](https://www.nature.com/articles/s41598-017-04907-y)
- **Kalanthroff, E. et al. — stop-signal × flanker interaction.** [sciencedirect.com/science/article/abs/pii/S0001691803001203](https://www.sciencedirect.com/science/article/abs/pii/S0001691803001203)
