# 07 — Orchestrator: Scheduling, Dosing, Interleaving, Booster Design, Transfer Assessment

Deep-research dossier for the Intellect Forge Orchestrator module. Evidence-first, open-source-first. Every design choice that follows is traceable to a cited source at the bottom of this file.

The Orchestrator is the brain of the suite. It decides **what the user trains next, how long, how often, when to stop, and how to verify that gains are actually generalizing**. It is also the module most likely to make or break real-world outcomes — dosing and transfer are where almost every commercial brain-training product fails.

---

## 1. Spacing Effect — Concrete Numbers

### Core finding (Cepeda et al. 2006, Cepeda et al. 2008)
Cepeda's meta-analysis aggregated 839 assessments from 317 experiments (184 papers). The single most actionable number:

> **Optimal inter-study interval (ISI) ≈ 10–20% of the retention interval (RI)**, with the optimal ratio *decreasing* as RI lengthens.

Practical translation for cognitive training where we want retention over months to years:

| Desired retention horizon | Optimal gap between sessions on same content |
|---|---|
| 1 week | ~1 day (ISI/RI ≈ 14–25%) |
| 1 month | ~3–5 days (ISI/RI ≈ 10–15%) |
| 6 months | ~3 weeks (ISI/RI ≈ 10%) |
| 1 year | ~4–5 weeks (ISI/RI ≈ 5–10%) |
| 10 years (ACTIVE horizon) | boosters at months 11, 35 (ACTIVE's empirical choice) |

### Does the spacing effect apply to cognitive training, not just declarative memory?

Mostly **yes**. Meta-analyses of motor and procedural learning show medium-to-large spacing effects comparable to those in verbal recall (Shea & Morgan 1979; Donovan & Radosevich 1999). Distributed practice outperforms massed practice for both motor and declarative learning. The mechanism is partly different — for skills, the spacing gap enables memory consolidation and prevents fatigue-driven performance plateaus; for declarative, it engages retrieval-based encoding. But the behavioral signature — superior test performance after gaps than after mass — holds across domains.

**Caveat for us:** most spacing research measures retention of previously learned material. Cognitive training is about *capacity change* (neural plasticity on an adaptive task). The literature here is thinner, but the ACTIVE trial (see §3) demonstrated that a 10-hour burst followed by spaced boosters produced decade-long effects, which is strong real-world evidence that spacing works for capacity training.

### Design implications
- Within a week, **minimum 1 rest day per domain before re-training it** (this is why the suite cycles 5 domains across 6 days).
- Within the initial 3-week ramp, touching each domain every 5–6 days matches the ~20% ISI/RI for a ~3-month retention window.
- Boosters must be **asymmetrically spaced** (expanding retrieval): ~1 month, ~3 months, ~9 months, ~yearly thereafter. This mirrors SM-2 / FSRS expansion schedules and ACTIVE's 11-month and 35-month boosters.

---

## 2. Interleaving Science — When It Helps, When It Hurts

### Core studies
- **Shea & Morgan (1979)**: Random (interleaved) practice produced worse acquisition but much better retention and transfer than blocked — the "contextual interference effect."
- **Kornell & Bjork (2008)**: Interleaved vs blocked art-style learning. Interleaved group scored 59% on transfer test; blocked 36%. Learners subjectively rated blocked as more effective — the **metacognitive illusion of blocking**.
- **Rohrer & Taylor (2007)**: Interleaved math practice reduced in-session accuracy but tripled final test scores.
- **Brunmair & Richter (2019) meta-analysis** (53 studies, 7,692 participants): Overall interleaving effect g = 0.42. BUT — the effect is largest for category learning with similar discriminable categories and smallest / sometimes reversed for highly dissimilar content.

### The nuance: blocked → interleaved transition
Interleaving hurts novices who haven't learned *each* underlying rule yet. A clean practical rule (Pan 2015, Rohrer 2012):

> **Block first to establish each skill above ~60% accuracy, then interleave to force discrimination and protect against forgetting.**

This matches the Intellect Forge phase structure exactly: weeks 1–3 blocked (one domain per day), weeks 4+ within-session interleaving.

### How much interleaving within a session?
Evidence for the specific prescription is thin. Best-guess defaults based on motor-skill CI and category-learning studies:

- **2 domains per session**, ~8–12 minute blocks each, with the second block of each domain after the other domain has intervened (AB-AB or AB-BA patterns, not AAAA-BBBB).
- **Avoid 3+ domains in one 25–30 min session** — trial counts per domain become too low to drive adaptive difficulty meaningfully.
- Consider micro-interleaving *within* a domain (e.g., in Relational Reasoning Lab alternate analogical / anomalous / antithetical trials) — this is the within-category version and has strong support.

---

## 3. Booster Design — ACTIVE Trial as Gold Standard

The ACTIVE trial (Ball et al. 2002; Willis et al. 2006; Rebok et al. 2014; Coe et al. 2026 20-yr update) remains the empirical reference for long-horizon cognitive training.

### ACTIVE booster schedule (literal)
- **Initial training**: 10 sessions × ~60–75 min = ~10 hours total, over 5–6 weeks.
- **Booster 1**: At 11 months post-training — 4 sessions × 75 min over 2–3 weeks. Offered to a random 39% subset who had completed ≥8 of 10 initial sessions.
- **Booster 2**: At 35 months post-training — same 4-session structure.

### What this implies for Intellect Forge
Adapted for a 5-domain suite and daily 25-min sessions:

| Phase | Weeks | Dose | Domain coverage |
|---|---|---|---|
| Ramp | 1–3 | 25–30 min/day × 6/wk (blocked, 1 domain/day) | Each domain ×3–4 sessions |
| Intensive | 4–8 | 25–30 min/day × 6/wk (2 domains interleaved/session) | Each domain ~10 sessions cumulative |
| Consolidation | 9–12 | 25–30 min/day × 4/wk (interleaved) | Target: 12–14 sessions per domain (plateau threshold from Belleville 2018) |
| Maintenance | 13+ | 3 sessions/wk × 25 min | Cycle domains, prioritize those showing decay |
| Booster 1 | Month 6 | 4 sessions × 25 min over 1 week, focused on domain showing largest decline | — |
| Booster 2 | Month 12 | Full re-ramp: 2 weeks × 6 sessions/wk | — |
| Booster N | Annually or when transfer assessment shows ≥0.3 SD decline | Short 1-week refresh | — |

ACTIVE used 11-month and 35-month gaps; we can use denser boosters because our sessions are shorter and self-paced. The asymmetric expansion (6 mo, 12 mo, 24 mo, yearly) matches FSRS-style expanding retrieval.

---

## 4. Transfer Assessment — The Contamination Problem

### Golden rule
**Transfer tasks MUST never be trained.** The moment a user practices a task, gains on it reflect practice effects, not capacity transfer.

### Battery design (administer at baseline, week 4, week 8, month 3, month 6, yearly)

| Trained domain | Near-transfer probe (untrained) | Far-transfer probe (untrained) |
|---|---|---|
| Perceptual Speed (UFOV) | A different UFOV subtest or simulated driving hazard-detection task (open-source jsPsych versions exist) | Self-reported driving confidence; reaction-time-to-brake simulation |
| Working Memory (dual n-back) | **Complex span** (operation span, symmetry span) — Cognitive Atlas has open validated stimuli | **ICAR matrix reasoning** subset, Raven's-like |
| Executive (compound task) | AX-CPT, task-switching variant never seen in training | BRIEF-A self-report (proprietary) **or free alternative ADEXI** |
| Relational Reasoning | Verbal analogies (untrained format) | **ICAR verbal reasoning** + ICAR letter/number series |
| Metacognitive Calibration | New knowledge domain confidence questions | Brier score on real forecasting questions (Good Judgment Open has public items) |

### Concrete open assets
- **ICAR** (International Cognitive Ability Resource) — public-domain matrix, verbal, 3D-rotation, and letter/number-series items; r ≈ 0.60–0.80 with Raven's/WAIS. Use as our far-transfer battery for Gf. [icar-project.org](https://icar-project.com/) and the Condon & Revelle validation on personality-project.org.
- **ADEXI** (Adult Executive Functioning Inventory) — free self-report executive function questionnaire, alternative to the proprietary BRIEF-A.
- **jsPsych** plugins already exist for n-back, flanker, Stroop, task-switching, AX-CPT, and matrix reasoning. These are ideal for transfer probes since they are browser-ready and untrained.
- **Cambridge Brain Sciences tasks** (some free) for additional untrained probes.

### Contamination prevention rules
1. Transfer tasks live in a separate module; user cannot practice or replay them.
2. Each probe has multiple parallel forms — same difficulty, different items — assigned in rotation so re-exposure over 6 assessments uses 6 different item sets.
3. Assessments are always **brief (≤10 min total)** and flagged clearly to the user as "measurement, not training."
4. Never adapt difficulty on transfer tasks — adaptation creates training exposure.

---

## 5. Plateau Detection — Algorithms

We need to detect per-domain plateau to trigger: (a) shift from ramp to maintenance, (b) schedule a booster, (c) temporarily de-prioritize that domain in rotation.

### Method A — Rolling regression slope (simple, recommended for MVP)
```
For each domain, each new session:
  1. Extract performance metric M (e.g., adaptive level reached, accuracy-at-threshold).
  2. Take last W sessions (W = 8 sessions ≈ ~2 weeks).
  3. Fit OLS: M ~ session_index.
  4. Compute slope b and 95% CI.
  5. If CI straddles 0 AND b < ε (ε = 0.05 × baseline SD of M):
        flag_plateau = True
  6. If flag_plateau for 2 consecutive windows: trigger maintenance transition.
```
- Robust, interpretable, no hyperparameter tuning besides W.
- W=8 balances responsiveness vs noise; tune per domain based on within-session variance.

### Method B — CUSUM for subtle decline detection
Useful for the maintenance phase where we're watching for *decay* rather than plateau.
```
  Running mean μ over last 20 sessions.
  CUSUM_neg += max(0, μ - x_t - k)   # k = allowable slack, e.g., 0.5 × σ
  If CUSUM_neg > h (h = 4–5 × σ): trigger booster.
```
CUSUM is standard in surgical learning-curve analysis (Biau et al.; Khan et al. 2023) and has good sensitivity to gradual declines that regression might miss.

### Method C — Change-point detection via `ruptures` (PELT)
For offline analysis of the whole time series, use the Python library `ruptures` with the PELT algorithm (Killick et al. 2012) to find segment breakpoints. Model choice: `l2` (piecewise constant) or `linear` (piecewise linear) depending on whether we expect slope changes. This is ideal for the analytics dashboard showing "you hit a plateau at session 14 in WM, recovered after booster at session 30." Linear-time under weak conditions, exact optimal segmentation.

### Method D — Bayesian online change-point detection
Adams & MacKay (2007). Gives probabilistic run-length posterior — "probability that the current regime started k sessions ago." Heavier, but ideal if we eventually ship an adaptive scheduler that needs real-time change-point posteriors.

### MVP recommendation
**Ship Method A (rolling regression) for live decisions** and **use Method C (ruptures PELT) offline** to annotate the user's trajectory in the analytics dashboard. CUSUM layered on top during maintenance.

---

## 6. Adaptive Scheduling — Beyond Adaptive Difficulty

Adaptive difficulty (§adaptive staircase in README) governs *within-trial*. Adaptive scheduling governs *which domain comes next on which day*.

### State of the art
- **Contextual bandits for learning-activity selection** (Lan & Baraniuk 2016; Sawyer et al. 2022 on adaptive curriculum). The arm = next training task; the reward = predicted gain on a held-out probe; the context = user state (recent accuracy, time since last session, current plateau status per domain).
- **Duolingo's half-life regression (Settles & Meeder 2016)**: h = 2^(θ·x). Features include right/wrong counts and time-since-last. Open-source on GitHub (duolingo/halflife-regression) — but it's tuned for declarative fact recall, not skill capacity. We can **borrow the feature-engineering approach** (log-count right, log-count wrong, days-since-last, item difficulty) but adapt the target: instead of memory half-life, predict **accuracy on next block** per domain.
- **FSRS (Free Spaced Repetition Scheduler)**: Open-source (open-spaced-repetition/fsrs4anki, py-fsrs, fsrs-rs). DSR (Difficulty, Stability, Retrievability) model. FSRS is fact-recall-optimized but its schema — a 3-parameter memory state per item, optimized on user data — is portable.
- **RL on schedule optimization** (Reddy, Levine, Dragan 2017, "Accelerating human learning with deep reinforcement learning"): DRL agent schedules review items; outperforms Leitner/SM-2.

### Why MVP should NOT ship full bandit/RL scheduling
- Cold-start problem: RL needs weeks of data per user before it stops exploring recklessly.
- Interpretability: users and clinicians need to understand *why* a session was scheduled. A bandit's explanation is "try things until we learn." This conflicts with the product's evidence-based ethos.
- Our domain count (5) is tiny — rule-based scheduling can reach near-optimal.

### What we actually ship (MVP)
Rule-based priority queue (see §8). Leave bandit integration as a v2 research track once we have ≥200 users × ≥8 weeks of data to train on offline.

---

## 7. Motivation Without Gamification

The brief prohibits streaks, leaderboards, badges, brain-age scores. We need genuine adherence without extrinsic manipulators. Self-Determination Theory (Deci & Ryan; Ryan & Deci 2020) identifies **three innate needs**: autonomy, competence, relatedness. SDT-consistent product patterns:

### Autonomy
- **User-scheduled sessions**, not app-imposed. "Your schedule says 2 domains today; pick which two and when."
- **Skip / defer** available without penalty. "Not today, try again tomorrow" — not "you broke your streak."
- **Transparent reasoning**: "The orchestrator recommends Working Memory next because performance has plateaued for 5 sessions and your last WM session was 8 days ago." The user can override.

### Competence
- **Honest progress curves**, not inflated scores. Show raw accuracy, adaptive level, percentile vs own baseline.
- **Calibration feedback** — the metacognitive overlay teaches "I can predict my own performance accurately," a competence signal grounded in reality.
- **Plateau honesty**: when a plateau is detected, tell the user. "You've reached plateau in domain X. This is expected around session 12–14. Maintenance schedule begins." This reframes plateau as success, not failure.

### Relatedness
- **No leaderboards**. But: optional aggregated, anonymous comparison ("median user at your session count is at adaptive level 4; you are at level 5") — informational, not competitive.
- **Optional research participation**: users can donate anonymized data to cognitive science. Creates meaning-from-contribution without social comparison.

### Anti-patterns to reject
- Streak counters (loss-aversion manipulation)
- Daily login push notifications > 1×/day
- XP / gems / coins
- "You're falling behind!" framing
- Unlock-the-next-level progression tied to consecutive days

### What BrainHQ does well vs poorly
BrainHQ supports flexible scheduling ("train in tiny bites or long blocks") and a personal trainer recommending next exercise. It does use gentle gamification (stars, progression). We reject the gamification layer but adopt the flexible-schedule + recommender pattern.

---

## 8. Dose-Response Curves — Evidence for the Caps

### The 25–30 min/day ceiling
Several lines of evidence converge on this range for adults <60:
- **Belleville et al. 2018 (MEMO+)**: benefits plateau after ~12–14 sessions of 60–90 min. Per-day, across studies, total daily doses above ~30 min show attenuating returns and sometimes fatigue-driven *worse* performance.
- **Willis et al. 2006 (ACTIVE)**: Only 10 hours initial training over 5–6 weeks (~75 min sessions × 10) produced decade-long effects. More is not demonstrably better.
- **Fatigue / cognitive depletion literature**: sustained focused attention declines after ~25–30 min without rest (Warm et al. 2008). The brain can't do productive struggle past this window in a single sitting.

### The 12–14 session plateau
After ~12–14 sessions *per domain*, additional sessions show diminishing returns on the trained task. Transfer effects may still consolidate — so we don't stop training, we shift to maintenance dose (fewer sessions/wk, interleaved, plus boosters).

### Maintenance dose
Evidence is sparse. Best estimate from ACTIVE + SM-2 heuristics:
- Post-plateau: **~40–50% of peak dose** (3–4 sessions/wk × 25 min).
- Boosters restore full dose briefly (1–2 weeks).
- After a year of maintenance, can often drop to 2 sessions/wk × 25 min while preserving gains.

---

## 9. Sleep / Exercise Correlation Dashboard

### What we want
Users log sleep hours and exercise minutes; app shows their individual correlation with next-day cognitive performance.

### Statistical caveats (must surface to user)
1. **N=1 inference is weak**. With 60 days of data, detecting r > 0.3 reliably requires clean signal; real lifestyle noise is huge.
2. **Multiple comparisons**: if we correlate sleep with 5 domains × 3 lags = 15 tests per user, random noise produces "significant" effects ~1/2 the time.
3. **Confounding**: sleep and exercise are correlated with each other, with stress, with day-of-week, with time of day. A naive univariate correlation overstates causal magnitude.
4. **Regression to the mean**: a user trains hard Monday, sleeps poorly, underperforms Tuesday — the "sleep → performance" correlation is contaminated by fatigue from the training itself.

### What we build
- Collect data, compute rolling Pearson + Spearman correlations.
- Use **partial correlations** controlling for time-of-day and days-since-last-session.
- Report with generous uncertainty intervals and **always label "for you, over the last N weeks — not a causal claim."**
- Use Bayesian updating so correlations with little data show wide intervals that narrow over time.

### Open-source references
- `pingouin` (Python) for partial correlation with CI.
- `statsmodels` rolling correlations.
- No consumer app I know of does this well; most either don't correlate at all (Apple Health just shows raw trends) or overclaim (Oura/Whoop make causal-sounding lifestyle claims from weak correlations).

### Integrations
- Apple HealthKit / Google Fit for passive sleep/activity import (reduces logging burden — autonomy-friendly).
- Manual fallback entry (one slider for sleep hours, one for "did you exercise today yes/no/intensity").

---

## 10. Open-Source Scheduling Engines — The Landscape

| System | URL | Algorithm | License | Relevance |
|---|---|---|---|---|
| **SM-2 (SuperMemo)** | https://super-memory.com/english/ol/sm2.htm | Rule-based ease-factor adjustment | Public algorithm | Classic fact-recall; foundation of Anki |
| **Anki** | https://github.com/ankitects/anki | SM-2 + FSRS | AGPL | Reference implementation |
| **FSRS** | https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler | DSR model (Difficulty, Stability, Retrievability), ML-optimized | MIT | Modern state-of-the-art, open-source scheduler; per-language ports (py-fsrs, fsrs-rs, rb-fsrs, ex_fsrs) |
| **Awesome FSRS** | https://github.com/open-spaced-repetition/awesome-fsrs | Curated papers + impls | — | Single best reading list |
| **Duolingo halflife-regression** | https://github.com/duolingo/halflife-regression | HLR: h = 2^(θ·x) | MIT | Paper: Settles & Meeder 2016 ACL (research.duolingo.com/papers/settles.acl16.pdf); public 13M-trace dataset |
| **py-fsrs** | https://github.com/open-spaced-repetition/py-fsrs | FSRS Python | MIT | Likely to be the core scheduling library we depend on if we add content-level SR |
| **fsrs-rs** | https://github.com/open-spaced-repetition/fsrs-rs | FSRS Rust + optimizer (Burn) | MIT | Native/offline-first path |
| **Mnemosyne Project** | https://github.com/mnemosyne-proj/mnemosyne | SM-2 variant + research dataset | GPL | 30M+ review dataset, academic-friendly |
| **SuperMemo papers (Wozniak)** | https://super-memory.com/english/contents.htm | SM-2 through SM-18 | Partly closed | Foundational theory |
| **ruptures (change-point)** | https://github.com/deepcharles/ruptures | PELT, BinSeg, Dynp, kernel CPD | BSD-2 | Plateau/change-point detection |
| **ICAR items** | https://icar-project.com/ & personality-project.org/sapa | — | Public domain | Far-transfer assessment battery |
| **jsPsych** | https://github.com/jspsych/jsPsych | Experiment framework | MIT | Transfer task probes (Raven-like, n-back-variant, flanker, AX-CPT) |
| **PsychoPy/PsychoJS** | https://github.com/psychopy/psychopy | Experiment framework | GPL-3 | UFOV and tight-timing paradigms |
| **ADEXI** | https://chexi.se | Self-report EF | Free | BRIEF-A alternative |

### Note on long-horizon cognitive-training schedulers
There is **no mature open-source scheduler specifically for cognitive training** (as opposed to flashcard SR). This is a gap. Our Orchestrator, if open-sourced, could fill it.

---

## 11. Recommended MVP Orchestrator Logic

Pseudocode. Deterministic, interpretable, evidence-anchored. No ML required for v1.

```
# State per user:
#   per_domain: {
#     sessions_completed, last_session_date,
#     adaptive_level, accuracy_window (last 8 blocks),
#     slope_window (rolling regression result),
#     plateau_flag, decay_flag,
#     transfer_scores (ICAR, etc., by probe date)
#   }
#   phase: ramp | intensive | consolidation | maintenance
#   consecutive_days_trained
#   daily_minutes_used_today

DOMAINS = [PerceptualSpeed, WorkingMemory, CompoundExecutive, RelationalReasoning, Calibration]
MAX_DAILY_MIN = 30
REST_DAYS_PER_WEEK = 1

def pick_next_session(user, today):
    # Hard cap
    if user.daily_minutes_used_today >= MAX_DAILY_MIN:
        return NO_SESSION("Daily cap reached. Rest.")

    # Rest day enforcement
    if user.consecutive_days_trained >= 6:
        return NO_SESSION("Rest day.")

    phase = compute_phase(user)  # from session counts + plateau flags
    candidates = score_domains(user, phase, today)
    plan = compose_session(candidates, phase, minutes=25)
    attach_metacog_prediction_prompt(plan)
    attach_transfer_probe_if_due(plan, today)
    return plan

def compute_phase(user):
    total = sum(d.sessions_completed for d in user.per_domain)
    plateaued_count = sum(1 for d in user.per_domain if d.plateau_flag)
    if total < 18:    return RAMP                    # weeks 1-3
    if total < 48:    return INTENSIVE               # weeks 4-8
    if plateaued_count < 4: return CONSOLIDATION     # weeks 9-12
    return MAINTENANCE

def score_domains(user, phase, today):
    scored = []
    for d in DOMAINS:
        s = user.per_domain[d]
        # Base priority: longer since last = higher urgency (spacing principle)
        days_since = (today - s.last_session_date).days
        urgency = min(days_since / 5.0, 2.0)         # cap at 2.0
        # Recency floor: don't re-train same domain within 1 day
        if days_since < 1: continue
        # Boost plateaued domains that might benefit from interleaving novelty
        if s.plateau_flag and phase in (INTENSIVE, CONSOLIDATION):
            urgency *= 0.7                           # slight deprioritize on plateau
        # Boost domains showing decay in maintenance
        if s.decay_flag and phase == MAINTENANCE:
            urgency *= 1.8                           # booster candidate
        # Penalize if adaptive level dropped >1 step in last window (fatigue signal)
        if s.fatigue_flag: urgency *= 0.5
        scored.append((urgency, d))
    scored.sort(reverse=True)
    return scored

def compose_session(candidates, phase, minutes=25):
    if phase == RAMP:
        # Blocked: one domain, full session
        return [Block(candidates[0].domain, minutes)]
    else:
        # Interleaved: top 2 domains, AB-AB pattern
        d1, d2 = candidates[0].domain, candidates[1].domain
        half = minutes // 2
        # Interleave in 2 alternations to induce contextual interference
        return [Block(d1, half//2), Block(d2, half//2),
                Block(d1, half//2), Block(d2, half//2)]

def attach_metacog_prediction_prompt(plan):
    # Before each Block: "predict your accuracy on this block (%)"
    # After: compute |predicted - actual|, feed into calibration metrics
    for b in plan: b.pre_prompt = "predict_accuracy"

def attach_transfer_probe_if_due(plan, today):
    # Baseline, week 4, week 8, month 3, month 6, yearly
    if today in scheduled_probe_dates(user):
        plan.insert(0, TransferProbe(next_icar_form(user), budget_min=8))

# Plateau detection (run nightly per domain)
def detect_plateau(domain_state, W=8, eps_factor=0.05):
    if len(domain_state.history) < W: return False
    x, y = zip(*domain_state.history[-W:])  # (session_idx, metric)
    slope, intercept, se = ols(x, y)
    ci_low, ci_high = slope - 1.96*se, slope + 1.96*se
    eps = eps_factor * domain_state.baseline_sd
    return (ci_low <= 0 <= ci_high) and abs(slope) < eps

# Booster trigger (maintenance phase)
def check_booster(domain_state):
    # CUSUM on maintenance-phase performance
    cusum_neg = 0
    k = 0.5 * domain_state.maintenance_sd
    h = 4.5 * domain_state.maintenance_sd
    for m in domain_state.maintenance_history:
        cusum_neg = max(0, cusum_neg + (domain_state.maintenance_mean - m - k))
        if cusum_neg > h:
            return True  # schedule 1-week booster (4 sessions × 25 min)
    return False
```

### Key properties of this MVP logic
- **Interpretable**: every scheduling decision produces a 1-line explanation (e.g., "WM prioritized: 6 days since last, no plateau.").
- **No ML training required** before first user.
- **Spacing enforced** by urgency-from-days-since-last.
- **Interleaving enforced** from phase 2 via `compose_session`.
- **Plateau → phase transition** via `compute_phase` + `detect_plateau`.
- **Decay → booster** via CUSUM.
- **Transfer probes on fixed cadence** — no contamination risk.
- **Metacognitive overlay** attached to every block.
- **Hard dose cap** honored before anything else.

---

## 12. Key Unresolved Questions

1. **Cross-domain interleaving dose**: literature gives no firm answer on "how much interleaving within a 25-min session is optimal." AB-AB is a defensible default; we should A/B test (ethically — within-user crossover) once we have users.
2. **Plateau definition metric**: we use adaptive level + accuracy, but the "right" metric might be a latent capacity estimate (IRT-style). Punt to v2.
3. **Do boosters restore transfer, or only trained-task performance?** ACTIVE showed both; smaller studies show only trained-task. Need our own longitudinal data to answer for our specific task set.
4. **Maintenance dose**: the 40–50% estimate is heuristic. Real answer requires multi-year data we won't have at launch.
5. **Individual differences in optimal ISI**: Cepeda's 10–20% ISI/RI is a population average. Within-subject optima vary substantially. A v2 adaptive scheduler could personalize ISI per user per domain.

---

## 13. Key Citations

### Spacing + interleaving
- Cepeda, Pashler, Vul, Wixted, & Rohrer (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin*, 132(3), 354–380. https://pubmed.ncbi.nlm.nih.gov/16719566/
- Cepeda, Vul, Rohrer, Wixted, & Pashler (2008). Spacing effects in learning: A temporal ridgeline of optimal retention. *Psychological Science*. https://laplab.ucsd.edu/articles/Cepeda%20et%20al%202008_psychsci.pdf
- Shea & Morgan (1979). Contextual interference effects on the acquisition, retention, and transfer of a motor skill.
- Kornell & Bjork (2008). Learning concepts and categories: Is spacing the "enemy of induction"? *Psychological Science*, 19(6), 585–592.
- Rohrer & Taylor (2007). The shuffling of mathematics problems improves learning. *Instructional Science*, 35(6), 481–498.
- Brunmair & Richter (2019). Similarity matters: A meta-analysis of interleaved learning and its moderators. *Psychological Bulletin*.
- Firth, Rivers, & Boyle (2021). A systematic review of interleaving as a concept learning strategy. *Review of Education*.

### Dose / ACTIVE / boosters
- Ball et al. (2002). Effects of cognitive training interventions with older adults. *JAMA*, 288(18), 2271–2281.
- Willis et al. (2006). Long-term effects of cognitive training on everyday functional outcomes. *JAMA*, 296(23), 2805–2814.
- Rebok et al. (2014). Ten-year effects of the ACTIVE cognitive training trial. *JAGS*. https://pmc.ncbi.nlm.nih.gov/articles/PMC4055506/
- Coe et al. (2026). Impact of cognitive training on claims-based diagnosed dementia over 20 years: evidence from the ACTIVE study. *Alz & Dementia: TRCI*. https://alz-journals.onlinelibrary.wiley.com/doi/10.1002/trc2.70197
- Belleville et al. (2018). MEMO+: Efficacy, durability and effect of cognitive training and psychosocial intervention in individuals with mild cognitive impairment. *JAGS*. https://agsjournals.onlinelibrary.wiley.com/doi/10.1111/jgs.15192
- Belleville et al. (2024). Five-year effects of cognitive training in individuals with mild cognitive impairment. *Alz & Dementia: DADM*.

### Transfer / assessment
- Soveri et al. (2017). Working memory training revisited: A multi-level meta-analytic review. *Psychonomic Bulletin & Review*.
- Condon & Revelle (2014). The International Cognitive Ability Resource (ICAR). https://icar-project.com/ & https://personality-project.org/sapa/
- Pappa et al. (2022). Adaptive working memory training does not produce transfer effects in cognition and neuroimaging. *Translational Psychiatry*. https://www.nature.com/articles/s41398-022-02272-7
- Holmes et al. (2022). Near transfer to an unrelated N-back task mediates the effect of N-back working memory training on matrix reasoning. *Nature Human Behaviour*. https://www.nature.com/articles/s41562-022-01384-w
- ADEXI: Adult Executive Functioning Inventory. https://chexi.se/onewebmedia/ADEXI_SELFREPORT_ENG.pdf

### Plateau detection
- Killick, Fearnhead, & Eckley (2012). Optimal detection of changepoints with a linear computational cost (PELT). *JASA*.
- Truong, Oudre, & Vayatis (2018). Selective review of offline change point detection methods. (ruptures paper) https://arxiv.org/abs/1801.00826 — and library at https://github.com/deepcharles/ruptures
- Adams & MacKay (2007). Bayesian online changepoint detection.
- Khan et al. (2023). CUSUM learning curves: what they can and can't tell us. https://pmc.ncbi.nlm.nih.gov/articles/PMC10520215/

### Adaptive scheduling
- Settles & Meeder (2016). A trainable spaced repetition model for language learning. *ACL*. https://research.duolingo.com/papers/settles.acl16.pdf. Code: https://github.com/duolingo/halflife-regression
- FSRS: https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler, https://github.com/open-spaced-repetition/awesome-fsrs
- Lan & Baraniuk (2016). A contextual bandits framework for personalized learning action selection. *EDM*. https://people.umass.edu/~andrewlan/papers/16edm-bandits.pdf
- Sawyer et al. (2022). Raising student completion rates with adaptive curriculum and contextual bandits. https://arxiv.org/abs/2207.14003
- Prihar et al. (2025). Learning to optimize feedback for one million students. https://arxiv.org/abs/2508.00270
- Reddy, Levine, & Dragan (2017). Accelerating human learning with deep RL.

### Motivation / SDT
- Ryan & Deci (2000). Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being. *American Psychologist*, 55(1), 68–78. https://selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf
- Ryan & Deci (2020). Intrinsic and extrinsic motivation from a self-determination theory perspective. *Contemporary Educational Psychology*. https://selfdeterminationtheory.org/wp-content/uploads/2020/04/2020_RyanDeci_CEP_PrePrint.pdf

### Sleep / exercise / cognition
- Nisar et al. (2020). Subjective sleep quality and cognitive performance. *Scientific Reports*. https://www.nature.com/articles/s41598-020-61627-6
- Dai et al. (2021). Effect of sleep and biobehavioral patterns on multidimensional cognitive performance: longitudinal in-the-wild study. *JMIR*. https://www.jmir.org/2021/2/e23936/
