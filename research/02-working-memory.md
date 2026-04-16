# Working Memory Forge — Research Dossier

**Module:** Dual N-Back + Complex Span
**Neural targets:** Dorsolateral prefrontal cortex (DLPFC), frontoparietal control network
**Primary evidence base:** Jaeggi et al. (2008, PNAS); Soveri et al. (2017 meta-analysis, N≈2,105); Melby-Lervåg, Redick, & Hulme (2016, counterpoint meta-analysis)

---

## 1. Task Mechanics — Exact Trial Structure

### 1.1 Dual N-Back (Jaeggi 2008 canonical protocol)

**Stimuli:**
- **Visual stream:** a single blue square appears at one of **8 positions** on a 3x3 grid (center empty). Positions are chosen randomly each trial.
- **Auditory stream:** one of **8 consonants** presented over headphones. The typical Jaeggi/Brain Workshop set is `C, H, K, L, Q, R, S, T`. Consonants are used (not vowels) to prevent accidental word formation, and visually/phonologically confusable letters (e.g., B/D, M/N) are excluded to reduce perceptual confusions that are not the construct of interest.
- The two streams are **independent**: position match and letter match are separate events.

**Timing (per trial, Jaeggi 2008):**
- Stimulus presentation: **500 ms**
- Inter-stimulus interval (ISI): **2,500 ms**
- Total cycle (SOA): **3,000 ms** per trial
- Response window: the full 2,500 ms ISI following stimulus offset

**Block length:**
- **20 + n trials** per block (e.g., 22 trials at 2-back, 23 at 3-back, 29 at 9-back)
- This guarantees 20 scorable trials regardless of N (the first N trials are unscorable warm-up).
- Jaeggi 2008 used **20 blocks per session**, ~25 min/session, 5 days/week for 8–19 days.

**Target structure per block (Jaeggi 2008):**
- **6 visual targets** and **6 auditory targets**, of which:
  - 4 are single-modality only (visual XOR auditory)
  - 2 are simultaneous dual-modality targets
- Target positions are randomized within the block.

**Response scheme:**
- Two keys: `A` (or left hand) = position match; `L` (or right hand) = letter match.
- No response is the implicit "no match" response.
- Simultaneous dual match requires both keys pressed within the response window.

**Feedback (Jaeggi protocol):**
- No trial-by-trial feedback during a block (silent scoring).
- Block-end summary: per-stream hit rate, false alarm rate, and whether N increased/decreased.
- Brain Workshop adds optional per-trial color feedback (configurable).

### 1.2 Lure trials (not in original Jaeggi 2008, but standard in research extensions)

A **lure** is a non-target that matches the stimulus N±1 or N±2 trials back. Lures drive proactive interference and differentiate active maintenance from familiarity-based responding.

Standard proportion (e.g., Kane, Conway, et al.; Anguera et al.):
- ~25% targets, ~50% nontarget non-lures, ~25% lures in a 40-trial block.
- Of the lures in a 2-back paradigm: ~80% are N−1 lures, 10% are N+1, 10% are N±2.
- Jaeggi's *training* protocol usually omits explicit lure scheduling (random distribution produces ~10–15% natural lures), but **research versions typically enforce ~25–30% lures** to increase construct validity as a WM measure.

**Recommendation for Forge:** enforce ~25% lure rate per stream at training levels N≥3 to prevent familiarity-based responding and keep the task probing maintenance/updating.

### 1.3 Complex Span (supplement)

Canonical forms from the Engle lab (Turner & Engle 1989; Unsworth, Heitz, Schrock, & Engle 2005):

| Task | Memoranda | Processor |
|---|---|---|
| **Operation Span (OSPAN)** | Letters or words | Solve `(a × b) + c = ?`, verify true/false |
| **Reading Span (RSpan)** | Letters | Judge sentence sensibility ("Andy was stopped by the policeman because he crossed the yellow heaven.") |
| **Symmetry Span (SymSpan)** | Red squares on 4x4 grid | Judge vertical symmetry of black-and-white pattern |
| **Rotation Span** | Arrows (direction + size) | Judge whether rotated letter is normal or mirrored |

**Trial structure:**
1. **Processing item** appears (e.g., math equation). Participant answers within a deadline calibrated to their individual mean + 2.5 SD from a practice block (prevents strategic use of the processing interval for rehearsal).
2. **Memorandum** appears for ~800–1000 ms.
3. Steps 1–2 repeat **2–7 times** (set size varies).
4. **Recall phase:** user reproduces memoranda in serial order by clicking a grid (for letters) or re-clicking grid cells (SymSpan).

Automated OSPAN (Unsworth et al. 2005) uses set sizes **3–7**, each size presented **3 times**, yielding **75 letters total** across 15 sets.

**Scoring:**
- **Partial-credit unit scoring (PCU):** proportion of correctly recalled items in correct serial position, averaged across sets. Sensitive; best psychometrically (Conway et al. 2005; Unsworth & Engle 2007).
- **Absolute scoring (ACS):** sum of perfectly recalled set sizes (all items, correct order). Older but still reported.
- **Processing accuracy** (math/sentence/symmetry correctness) reported separately; exclude participants <85% processing accuracy — this enforces the dual-task nature.
- **Standard metric to report:** PCU + processing accuracy.

---

## 2. Adaptive Algorithm

### 2.1 The Jaeggi rule (canonical)

```
After each block of (20 + n) trials:
  combined_errors = visual_errors + auditory_errors + dual_errors
  # Jaeggi originally used a simple error count threshold
  if block_errors <= 3:           # roughly >= 85% combined accuracy
      n = n + 1                   # promote
  elif block_errors >= 5:         # roughly <= 75% combined accuracy
      n = max(1, n - 1)           # demote
  else:
      n = n                       # stay
```

This is the rule Jaeggi 2008 used: a single-block promotion trigger. Some later papers (Jaeggi 2010, 2011 in children) use a 3-lives / 3-strikes variant to slow demotion.

### 2.2 Brain Workshop's standard rule (widely adopted)

```
advance_threshold = 80%          # combined accuracy per block
fallback_threshold = 50%         # accuracy below this
fallback_sessions_required = 3   # must be below threshold this many blocks in a row

if combined_accuracy >= advance_threshold:
    n = n + 1
    consecutive_failures = 0
elif combined_accuracy < fallback_threshold:
    consecutive_failures += 1
    if consecutive_failures >= fallback_sessions_required:
        n = max(1, n - 1)
        consecutive_failures = 0
else:
    consecutive_failures = 0     # reset on middling blocks
```

Brain Workshop's "Jaeggi mode" raises the advance threshold to **90%** and the fallback to **75%**, which matches the PNAS 2008 paper's implicit thresholds more closely.

### 2.3 Recommended Forge rule (cleanest and research-defensible)

Use **per-stream accuracy tracking** and require BOTH streams to meet threshold. This prevents one strong modality from carrying the other:

```
def update_n(block):
    hit_v  = hits_visual   / targets_visual
    hit_a  = hits_auditory / targets_auditory
    fa_v   = fa_visual     / nontargets_visual
    fa_a   = fa_auditory   / nontargets_auditory

    # Use hits - false_alarms (proportion correct corrected for guessing)
    perf_v = hit_v - fa_v
    perf_a = hit_a - fa_a

    if perf_v >= 0.65 and perf_a >= 0.65:       # ~ Jaeggi 80% hit / 15% FA
        n += 1
        strikes = 0
    elif perf_v < 0.25 or perf_a < 0.25:
        strikes += 1
        if strikes >= 2:
            n = max(1, n - 1)
            strikes = 0
    else:
        strikes = 0
    return n
```

**Why this is cleaner than raw accuracy:** raw accuracy conflates hits and correct rejections, and a passive "no press" strategy scores ~80% on a block with 25% targets. `hits − false_alarms` (a linear analog of d′ that is stable at edge rates) forces real discrimination.

---

## 3. Scoring and Metrics

### 3.1 Signal Detection Theory (SDT) metrics — per stream

For each of visual and auditory streams, define:
- **H = hit rate** = hits / (hits + misses) = correct responses on target trials
- **F = false alarm rate** = false alarms / (false alarms + correct rejections) = "match" responses on nontarget trials

**d′ (sensitivity):**
```
d' = Z(H) - Z(F)
```
where `Z()` is the inverse standard normal CDF (probit). d′ = 0 means no discrimination; d′ = 1 ≈ 69% correct in a 2AFC equivalent; d′ > 2 is strong.

**Edge correction (required — Hautus 1995 log-linear correction):**
Whenever H = 0, 1 or F = 0, 1 (common with few trials), substitute:
```
H_corr = (hits + 0.5) / (n_targets + 1)
F_corr = (fa   + 0.5) / (n_nontargets + 1)
```
This avoids infinite z-scores. Apply to **all** trials, not just edge cases, for consistency.

**Response bias c (criterion):**
```
c = -0.5 * (Z(H) + Z(F))
```
c > 0 = conservative (prefers "no match"); c < 0 = liberal (prefers "match"). Useful diagnostic — n-back trainees often show drifting bias as N increases.

**A′ (nonparametric alternative; robust to low N):**
```
if H >= F:
    A' = 0.5 + (H - F) * (1 + H - F) / (4 * H * (1 - F))
else:
    A' = 0.5 - (F - H) * (1 + F - H) / (4 * F * (1 - H))
```
Report A′ as a secondary metric when block has <15 trials.

### 3.2 Summary metrics to store per session

| Metric | Definition |
|---|---|
| `n_max` | Highest N completed in session |
| `n_mean` | Mean N across blocks |
| `d_prime_v`, `d_prime_a` | Per-stream sensitivity |
| `hit_rate_v`, `hit_rate_a` | Per-stream hit rate |
| `fa_rate_v`, `fa_rate_a` | Per-stream false alarm rate |
| `lure_fa_rate` | FA rate on lure trials specifically |
| `dual_hit_rate` | Hit rate on simultaneous dual-modality targets |
| `criterion_v`, `criterion_a` | Response bias |
| `n_weighted_accuracy` | Σ(accuracy × n) / Σ(n) — difficulty-weighted single scalar |

**"Working memory capacity" (long-term metric):** the maximum N sustained at d′ ≥ 1.5 across ≥3 consecutive blocks. This is the reportable "max N" number.

### 3.3 Complex span scoring

- **PCU** (partial credit): proportion of items recalled in correct serial position, averaged across all sets. Recommended primary.
- **ACS** (absolute): sum of correctly recalled full-set sizes. Report as secondary.
- **Processing accuracy:** must be ≥ 85% or exclude session (Engle lab threshold).
- **Span:** highest set size at which participant recalled all items on ≥2 of 3 trials.

---

## 4. Open-Source Implementations — Survey

| Project | URL | Lang | Notes |
|---|---|---|---|
| **Brain Workshop** (Paul Hoskinson et al.) | https://github.com/brain-workshop/brainworkshop | Python 2 / Pyglet | The canonical OSS dual n-back. 20+n trials, 3 s SOA, 8 positions, 8 consonants (C,H,K,L,Q,R,S,T), 80/50% advance/fallback thresholds, "Jaeggi mode" enforces 90/75% + exact 6+6 targets. Comprehensive (triple, quad, arithmetic, variable N-back modes). Codebase is dated (Python 2) but authoritative on defaults. Read this first. |
| **jtoomim / ktec forks of Brain Workshop** | http://jtoomim.org/brain-training | Python | Maintained forks; jtoomim's is useful for the documented session logic. |
| **alexjago/dual-n-back** | https://github.com/alexjago/dual-n-back | JS (jsPsych) | Web port. Useful reference for jsPsych plugin pattern. |
| **tmlbl/nback** | https://github.com/tmlbl/nback | JS | Direct JS port claiming PNAS 2008 fidelity. Simple; good reference for browser audio timing. |
| **j-holub/N-Back-Experiment** | https://github.com/j-holub/N-Back-Experiment | JS (PsychJS/jsPsych) | Experimental-grade. |
| **vekteo/Nback_jsPsych** | https://github.com/vekteo/Nback_jsPsych | JS (jsPsych 7) | Verbal single n-back; cleanest modern jsPsych pattern. |
| **PsychoPy n-back tutorial** | https://workshops.psychopy.org/tutorials/n-back.html | Python (PsychoPy) | Official PsychoPy walkthrough. |
| **ForrestCKoch/psychoblocks** | https://github.com/ForrestCKoch/psychoblocks | Python (PsychoPy) | n-back + face-name, fMRI-grade timing. |
| **abcsds/Nback** | https://github.com/abcsds/Nback | Python (PsychoPy) | 20% target probability, 90 s block. |
| **tmalsburg/py-span-task** | https://github.com/tmalsburg/py-span-task | Python 3 / Tk | Complex span (OSPAN + RSpan) following Conway et al. (2005) recommendations. **Best OSS complex span reference.** |
| **rw2mitch/operation-span-task** | https://github.com/rw2mitch/operation-span-task | Unknown | Turner & Engle OSPAN with letters. |
| **Engle Lab Task Downloads** | https://englelab.gatech.edu/taskdownloads | E-Prime | Official Engle lab releases (OSPAN, RSpan, SymSpan, RotSpan). Email for password; not open source but free for research. The gold-standard implementations. |
| **englelab R package** | https://englelab.github.io/englelab/ | R | Official scoring package: PCU, ACS, processing accuracy for all complex span tasks. Use this scoring logic verbatim. |
| **cognitivetools.uk** (Stone et al.) | http://www.cognitivetools.uk | Java | Free Java collection: digit, matrix, arrow, reading, operation, rotation, symmetry spans. Published in Journal of Open Research Software. |
| **PsyToolkit AOSPAN** | https://www.psytoolkit.org/experiment-library/aospan.html | JS | Browser-ready AOSPAN. |

**What they get right:** Brain Workshop's timing, target structure, and adaptive rule are faithful to Jaeggi 2008. py-span-task correctly enforces processing-time calibration per participant.

**What they get wrong or omit:**
- Most web ports don't enforce the practice-phase calibration of processing-time deadlines (critical for complex span).
- Almost none report d′; they all report raw accuracy. Bake SDT into your core from day one.
- Few track lure FA rate separately — a missed diagnostic.
- Many web n-back implementations have audio latency jitter ≥50 ms from `Audio.play()`; use Web Audio API with `AudioBufferSourceNode.start(ctx.currentTime + delay)` for sample-accurate onsets.
- Very few interleave n-back with complex span in a single session.

---

## 5. Evidence Summary — Honest State in 2026

### 5.1 The "works" case

- **Jaeggi et al. (2008, PNAS):** 4 groups, dose-response (8/12/17/19 sessions), dual n-back training, transfer to BOMAT and Raven's APM. Gain ~40% over controls at highest dose.
- **Au et al. (2015) meta-analysis** (20 studies, N=1,010): n-back training produces small but significant Gf transfer (g = 0.24, ~3–4 IQ points equivalent).
- **Soveri et al. (2017)** multi-level meta-analysis of n-back training, 33 RCTs, 203 effect sizes: **medium** effect on untrained n-back tasks; **very small but present** effects on other WM tasks, Gf, and cognitive control. No moderator effect of single vs dual, age, or training dose.
- **Karbach & Verhaeghen (2014):** executive-function training including n-back transfers to reasoning in older adults.

### 5.2 The "doesn't work" case

- **Redick et al. (2013):** 17 training sessions dual n-back, placebo-controlled, N=73. Training group improved on n-back itself but **no transfer** to fluid intelligence, multitasking, crystallized intelligence, perceptual speed, or reading comprehension.
- **Shipstead, Redick, & Engle (2012):** review arguing prior positive findings were methodologically weak (no-contact controls, small samples, single Gf tests).
- **Melby-Lervåg, Redick, & Hulme (2016)** meta-analysis, 87 publications, 145 comparisons: reliable near-transfer to verbal and visuospatial WM, but **no convincing evidence of far transfer** to nonverbal ability, verbal ability, decoding, reading comprehension, or arithmetic when compared to **actively treated** (not passive) control groups. N-back specifically: g = 0.15 on nonverbal ability, but the effect vanishes when restricted to largest/best-powered studies.
- **Simons et al. (2016, Psychological Science in the Public Interest):** consensus review — "little evidence" for broad real-world transfer from any brain-training product.

### 5.3 The synthesis (what to tell users honestly)

1. **Near transfer is real and robust.** You will get better at n-back and at other WM-updating tasks. Effect sizes g ≈ 0.4–0.8.
2. **Far transfer to Gf is contested.** Meta-analyses split depending on whether they count only actively-controlled studies; when they do, effects shrink toward zero. When they don't, effects are small (g ≈ 0.2) but consistent.
3. **Dose-response matters where it exists.** Jaeggi 2008 found linear gains with session count. Most null findings used ≤15 sessions. Our 20+ session protocol is on the right side of this.
4. **Active control is the methodological watershed.** Claims rely on whether you believe a passive control is adequate. Redick/Shipstead/Melby-Lervåg say no; Jaeggi/Au/Soveri push back, arguing that "adaptive-but-easy" controls themselves produce small transfer, artifactually suppressing the comparison.
5. **Individual differences are large.** Responders vs non-responders show distinct neural profiles (Jaeggi et al. 2014). We can't predict who responds.

**Framing mandate for product:**
> "Working memory training robustly improves working memory performance. Whether it broadly improves general intelligence is contested — meta-analyses split on this. The strongest honest claim: you will sustain higher N, your complex-span scores will rise, and you may see modest improvements on novel reasoning tasks. Do not expect a measurable IQ bump you would notice outside a testing room."

---

## 6. Interleaving N-Back with Complex Span

### 6.1 Evidence

Direct evidence for within-session interleaving of n-back and complex span specifically is **weak** — most training studies use a single paradigm. General interleaving evidence (Rohrer, Taylor, Firth et al. 2021 review): interleaving across problem *types* produces superior delayed retention relative to blocked practice (median +50% on test 1, +125% on test 2 in the physics-problem literature; +25% at 1 day, +76% at 1 month on delayed tests).

Theoretical rationale for combining n-back + complex span:
- n-back loads **updating** and **familiarity discrimination**.
- Complex span loads **maintenance under interference** and **controlled retrieval**.
- Shipstead, Harrison, & Engle (2016) argue these are separable components of WM. Training both should produce broader near-transfer than training either alone.
- Redick & Lindsey (2013) meta-analysis found complex span and n-back correlate r ≈ 0.20–0.35 — they share variance but are not redundant, so training both should target overlapping and complementary mechanisms.

### 6.2 Recommended session schedule

**25-minute session, adult, post-ramp (week 2+):**

| Segment | Duration | Block |
|---|---|---|
| Warm-up n-back (current N − 1) | 2 min | 1 block |
| N-back at adaptive N | 6 min | 2 blocks |
| **Switch** → Complex span (rotating: OSPAN / SymSpan / RSpan) | 7 min | 1 task, set sizes 3–6 |
| N-back at adaptive N | 6 min | 2 blocks |
| Cool-down complex span (different task than midpoint) | 4 min | 1 short task |

- Rotate the complex-span task across days (OSPAN Monday, SymSpan Tuesday, RSpan Wednesday, Rotation Thursday; repeat) to prevent item-level carryover and maximize interleaving at the between-session level.
- Weeks 1–2 (ramp): pure n-back only, establishing baseline N.
- Week 3+: introduce the interleaved structure above.
- Metacognitive prediction (per the Forge spec): before each segment, ask user "Predict your accuracy (%)".

---

## 7. Recommended Implementation Approach for Forge

### 7.1 Core defaults (research-defensible)

| Parameter | Value | Source |
|---|---|---|
| Grid | 3x3, center empty, 8 peripheral positions | Jaeggi 2008 |
| Letter set | C, H, K, L, Q, R, S, T | Jaeggi 2008 / Brain Workshop |
| Stimulus duration | 500 ms | Jaeggi 2008 |
| ISI | 2,500 ms | Jaeggi 2008 |
| Trials/block | 20 + n | Jaeggi 2008 |
| Blocks/session | 20 (pure n-back day) or 4 n-back + 2 span (interleaved day) | Adapted from Jaeggi |
| Targets/block | 6 visual + 6 auditory, 2 dual | Jaeggi 2008 |
| Lure proportion (N≥3) | ~25% of nontargets | Kane/Conway; Anguera |
| Advance rule | d′_v ≥ 1.5 AND d′_a ≥ 1.5 in single block | Hybrid of Jaeggi / Brain Workshop |
| Demote rule | d′_v < 0.5 OR d′_a < 0.5 in 2 consecutive blocks | Our derivation |
| Starting N | 2 | Brain Workshop |
| Feedback | Block-end summary with per-stream hit/FA/d′ | Our choice |
| Input | `A` = position match, `L` = letter match, both for dual | Jaeggi 2008 |

### 7.2 Architectural notes

- **Audio timing:** use Web Audio API with preloaded `AudioBuffer`s. Schedule via `source.start(ctx.currentTime + offset)`. Do NOT use `<audio>` + `.play()` — introduces 20–200 ms jitter that destroys the auditory/visual synchrony that *is* the task.
- **Visual timing:** align stimulus onsets with `requestAnimationFrame`; record `performance.now()` timestamps for both onset and keypress.
- **Response collection:** log keypress timestamps relative to stimulus onset, not ISI offset. This lets you reconstruct RT distributions later even though RT isn't a primary DV.
- **State machine:** trial-level FSM with states `{STIM_ON, STIM_OFF_WINDOW_OPEN, WINDOW_CLOSED}`. Accept responses in `STIM_ON` and `STIM_OFF_WINDOW_OPEN`.
- **Per-stream independence:** score visual and auditory completely separately. Report both. This is a major differentiator from consumer n-back apps that report a single accuracy number.
- **Lure tagging:** at block generation time, tag each nontarget trial as `{lure_N-1, lure_N+1, lure_N±2, pure_nontarget}`. Store response on lures separately. This lets you compute a proactive-interference index: `FA_rate(lures) − FA_rate(pure_nontargets)`.
- **Complex span:** use the `englelab` R package's scoring logic (PCU + processing accuracy) verbatim, re-implemented in TS. Do not invent new scoring.
- **Processing-time calibration:** in the practice phase for each complex span task, compute participant's mean + 2.5 SD RT on the processing judgments; use that as their deadline. Re-calibrate every 10 sessions.
- **Metacognitive overlay:** pre-block confidence prompt ("Predict your % correct on this block"), post-block display of predicted vs actual. Log to feed the Calibration Engine.

### 7.3 What to skip / deprioritize

- **Triple n-back (adding a color or tactile stream):** no meta-analytic evidence it outperforms dual. Soveri 2017 explicitly found no moderator effect of stream count. Skip in v1.
- **"Brain age" or IQ equivalents:** dishonest. Don't display.
- **Streak mechanics on n-back:** undermines intrinsic motivation per Forge spec. Don't add.
- **Auditory position stream (triple n-back with spatial audio):** interesting but under-researched; skip v1.

### 7.4 Metrics for the Orchestrator

Publish to the cross-domain analytics layer:
- `wm.n_max_sustained` — max N where d′ ≥ 1.5 for ≥3 consecutive blocks
- `wm.span_pcu` — complex span partial-credit score (rolling over last 3 sessions)
- `wm.dprime_trend` — slope of d′ across sessions (improvement rate)
- `wm.calibration_brier` — Brier score of pre-block predictions
- `wm.dose_sessions` — count of sessions completed (for the 12–14 session plateau detection)

---

## 8. Key Citations

1. **Jaeggi, S. M., Buschkuehl, M., Jonides, J., & Perrig, W. J. (2008).** Improving fluid intelligence with training on working memory. *PNAS, 105(19), 6829–6833.* https://www.pnas.org/doi/10.1073/pnas.0801268105
2. **Jaeggi, S. M., Buschkuehl, M., Jonides, J., & Shah, P. (2011).** Short- and long-term benefits of cognitive training. *PNAS, 108(25), 10081–10086.*
3. **Soveri, A., Antfolk, J., Karlsson, L., Salo, B., & Laine, M. (2017).** Working memory training revisited: A multi-level meta-analysis of n-back training studies. *Psychonomic Bulletin & Review, 24(4), 1077–1096.* https://link.springer.com/article/10.3758/s13423-016-1217-0
4. **Au, J., Sheehan, E., Tsai, N., Duncan, G. J., Buschkuehl, M., & Jaeggi, S. M. (2015).** Improving fluid intelligence with training on working memory: a meta-analysis. *Psychonomic Bulletin & Review, 22(2), 366–377.*
5. **Melby-Lervåg, M., Redick, T. S., & Hulme, C. (2016).** Working memory training does not improve performance on measures of intelligence or other measures of "far transfer": Evidence from a meta-analytic review. *Perspectives on Psychological Science, 11(4), 512–534.* https://journals.sagepub.com/doi/10.1177/1745691616635612
6. **Redick, T. S., Shipstead, Z., Harrison, T. L., et al. (2013).** No evidence of intelligence improvement after working memory training: A randomized, placebo-controlled study. *Journal of Experimental Psychology: General, 142(2), 359–379.*
7. **Shipstead, Z., Redick, T. S., & Engle, R. W. (2012).** Is working memory training effective? *Psychological Bulletin, 138(4), 628–654.*
8. **Unsworth, N., Heitz, R. P., Schrock, J. C., & Engle, R. W. (2005).** An automated version of the operation span task. *Behavior Research Methods, 37(3), 498–505.* https://englelab.gatech.edu/articles/2005/aospanpaper.pdf
9. **Turner, M. L., & Engle, R. W. (1989).** Is working memory capacity task dependent? *Journal of Memory and Language, 28(2), 127–154.*
10. **Conway, A. R. A., Kane, M. J., Bunting, M. F., Hambrick, D. Z., Wilhelm, O., & Engle, R. W. (2005).** Working memory span tasks: A methodological review and user's guide. *Psychonomic Bulletin & Review, 12(5), 769–786.*
11. **Redick, T. S., Broadway, J. M., Meier, M. E., et al. (2012).** Measuring working memory capacity with automated complex span tasks. *European Journal of Psychological Assessment, 28(3), 164–171.*
12. **Kane, M. J., Conway, A. R. A., Miura, T. K., & Colflesh, G. J. H. (2007).** Working memory, attention control, and the n-back task: A question of construct validity. *JEP:LMC, 33(3), 615–622.*
13. **Shipstead, Z., Harrison, T. L., & Engle, R. W. (2016).** Working memory capacity and fluid intelligence: Maintenance and disengagement. *Perspectives on Psychological Science, 11(6), 771–799.*
14. **Hautus, M. J. (1995).** Corrections for extreme proportions and their biasing effects on estimated values of d′. *Behavior Research Methods, 27(1), 46–51.* (log-linear correction — critical reference)
15. **Stanislaw, H., & Todorov, N. (1999).** Calculation of signal detection theory measures. *Behavior Research Methods, 31(1), 137–149.* (d′, A′, c formulas reference implementation)
16. **Brain Workshop** (Hoskinson, McVey, et al.) — https://github.com/brain-workshop/brainworkshop
17. **Engle Lab Task Downloads** — https://englelab.gatech.edu/taskdownloads
18. **englelab R package** (scoring) — https://englelab.github.io/englelab/
19. **py-span-task** (Malsburg) — https://github.com/tmalsburg/py-span-task
20. **Rohrer, D., Dedrick, R. F., & Stershic, S. (2015).** Interleaved practice improves mathematics learning. *Journal of Educational Psychology, 107(3), 900–908.*
