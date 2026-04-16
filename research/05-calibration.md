# 05 — Calibration Engine

Dossier for the **metacognitive training / confidence calibration / Brier scoring** track of Intellect Forge. Focus: open-source-first, evidence-backed design for a three-step (answer → confidence → optional wager) protocol with calibration-curve feedback and embeddable overlay for other modules.

---

## 1. Scoring math

### 1.1 Brier score (Brier 1950)

For a set of $N$ probabilistic forecasts $f_i \in [0,1]$ over binary outcomes $o_i \in \{0,1\}$:

$$\mathrm{BS} \;=\; \frac{1}{N}\sum_{i=1}^{N}(f_i - o_i)^2$$

Range: $[0, 1]$; lower is better. A forecaster who always says 50% on a balanced item set scores 0.25; a perfect oracle scores 0.

Multiclass generalisation over $K$ classes (one-hot $o_{ik}$):
$$\mathrm{BS} \;=\; \frac{1}{N}\sum_{i=1}^{N}\sum_{k=1}^{K}(f_{ik} - o_{ik})^2$$

### 1.2 Murphy's three-component decomposition (Murphy 1973)

Partition forecasts into $K$ bins (by stated confidence). Let $n_k$ = count in bin $k$, $f_k$ = mean forecast in bin, $\bar{o}_k$ = observed frequency in bin, $\bar{o}$ = overall base rate.

$$\mathrm{BS} \;=\; \underbrace{\frac{1}{N}\sum_k n_k (f_k - \bar{o}_k)^2}_{\text{Reliability (want 0)}} \;-\; \underbrace{\frac{1}{N}\sum_k n_k (\bar{o}_k - \bar{o})^2}_{\text{Resolution (want large)}} \;+\; \underbrace{\bar{o}(1 - \bar{o})}_{\text{Uncertainty (intrinsic)}}$$

- **Reliability**: do "80% confident" claims come out true 80% of the time? This is what we coach.
- **Resolution**: can the forecaster distinguish easy from hard items? Zero if they say the same thing to everything.
- **Uncertainty**: property of the item set, not the forecaster. Use it to normalise across question sets.

Ferro & Fricker (2012) provide a bias-corrected decomposition; worth using if bin counts are small. A simplified/generalised version: Siegert, *QJRMS* 2017.

### 1.3 Expected and Maximum Calibration Error

With $M$ equally-spaced confidence bins $B_m$:

$$\mathrm{ECE} \;=\; \sum_{m=1}^{M} \frac{|B_m|}{N}\,\bigl|\,\mathrm{acc}(B_m) - \mathrm{conf}(B_m)\,\bigr|$$
$$\mathrm{MCE} \;=\; \max_{m} \bigl|\,\mathrm{acc}(B_m) - \mathrm{conf}(B_m)\,\bigr|$$

ECE is the weighted mean gap on the reliability diagram; MCE is the worst-bin gap. Both are threshold-free and easy to explain in UI ("you are on average 12% over-confident; your worst region is the 90-100% bin").

Caveats (Nixon et al. 2019): ECE is sensitive to binning scheme and to empty bins. Use adaptive (equal-mass) bins for small N and report both ECE and Brier. Consider debiased ECE / kernel calibration error for N < a few hundred.

### 1.4 Proper scoring rules and why log is harsher than Brier

A scoring rule $S(f, o)$ is **strictly proper** iff the forecaster's expected score is uniquely minimised by reporting their true belief. Proper rules are the only rules that make honest reporting a dominant strategy — critical for training.

| Rule | Formula (binary, outcome $o=1$) | Penalty for $f\to 0$ when $o=1$ |
|---|---|---|
| **Brier (quadratic)** | $(1-f)^2$ | bounded: 1 |
| **Log (Good)** | $-\ln f$ | **unbounded: $+\infty$** |
| **Spherical** | $f / \sqrt{f^2 + (1-f)^2}$ (reward form) | bounded |

**Why log penalises certainty so hard.** $-\ln(f)$ has derivative $-1/f$, which explodes as $f\to 0$. Saying "99.9% sure" and being wrong costs you ~6.9 log-points; saying "50%" costs 0.69. Brier caps that same error at 1. Consequence: log score is **local** (depends only on the probability assigned to the observed event) and matches a KL-divergence interpretation — ideal for research/publication use and for calibrating LLMs. But in a training app for humans, unbounded penalties feel punitive and can blow up UI scales. Brier is bounded, elementary-math friendly, and decomposable — best default. Offer log score as an "expert" view once users are past the onboarding.

Gneiting & Raftery (2007) is the canonical unified treatment of proper scoring rules.

---

## 2. Confidence elicitation methods

| Method | Range | Pros | Cons | Use when |
|---|---|---|---|---|
| **Direct 0–100%** | 0–100 | intuitive; rich data | slider anchoring; people cluster on multiples of 5/10 | open-ended forecasts, multi-choice |
| **Half-range 50–100%** | 50–100 on binary | removes "I don't know which side" confound; valid because you can always flip a binary | only works for 2-choice | binary MCQ, true/false |
| **Discrete bins (5-level)** | 50/60/70/80/90/99 | fast; low-friction; matches psychophysics | coarse; fewer data points per cell | mobile; overlay on other tasks |
| **Wagers / scoring-rule elicitation** | bet size | loss aversion produces sharper calibration (Fischhoff, Slovic & Lichtenstein 1977 — subjects still bet on 50:1 odds they got wrong 12% of the time, so training effect is real) | requires points economy; more cognitive load | dedicated calibration sessions |
| **Tetlock IARPA style** | 0–100, but with structured practices: decompose, reference class, extremise, update | produced Good Judgment Project "superforecasters" who beat control by ~35% Brier | training-heavy; needs scenario questions; not pure math | long-form forecasting module |

**Empirical recommendation.** For pure binary items, **half-range 50–100%** is the cleanest elicitation — it is what CFAR's Credence Calibration Game, 80,000 Hours, Open Philanthropy, and Clearer Thinking all converge on. It (a) eliminates the "which side" dimension from the calibration curve, (b) maps directly onto the one-dimensional reliability diagram, (c) and prevents the common 0%-and-100% pathologies.

For open-ended/numeric items, use **90% credible interval elicitation** (lower & upper bound, hit rate should be 90%) — this is the standard Clearer Thinking / Hubbard "How to Measure Anything" format. Two numeric fields, scored by containment.

Avoid log/unbounded scoring in the elicitation UI; use it only in the backend for research views.

---

## 3. Evidence-backed training protocols

### 3.1 Classic findings

- **Lichtenstein & Fischhoff (1977)** — baseline: untrained adults who say "65–70% confident" are correct ~50% of the time; systematic overconfidence peaks near the extremes.
- **Koriat, Lichtenstein & Fischhoff (1980)** — generating *opposing* reasons (not just any reasons) is what reduces overconfidence. → Design implication: include a "what could make this wrong?" prompt on high-confidence items before locking in.
- **Hacker, Bol, Horgan & Rakow (2000); Hacker et al. (2008)** — calibration practice with feedback improves classroom outcomes; **incentives** (small rewards for accuracy) produce measurable gains, especially in low-achievers. → Include gamified point incentives that reward calibration, not accuracy.
- **Bol, Hacker et al.** — meta-analysis (Schneider 2021, *Calibrating Calibration*) finds calibration instruction interventions reliably improve monitoring accuracy across domains; effect sizes are moderate but replicable.
- **Butler (2017)**, **Frontiers PMC3408109 (2012)** — metacognition/calibration predicts academic and decision outcomes beyond IQ; transfer across domains is the distinguishing strength vs other cognitive training.

### 3.2 Tetlock / Good Judgment Project lessons

Superforecasters outperformed intelligence analysts on classified data. Training generalises to ~10% Brier improvement from ~1 hour of instruction. Techniques to bake into the app:

1. **Decompose** the question into sub-questions; assign probabilities to each.
2. **Outside view first** — ask "what is the base rate for this reference class?" before reasoning about specifics.
3. **Inside view second** — *then* adjust for case-specific detail.
4. **Extremise cautiously** — if aggregating multiple independent views, push away from 50%. For solo users, this is risky; better to train via slow, deliberate updating.
5. **Granularity** — superforecasters use 1% increments, not 10%.
6. **Post-mortem every resolved question** — did I over- or under-shoot? Why?

### 3.3 CFAR Credence Calibration Game

Two-choice trivia + confidence (50–100%). Scored with a proper scoring rule, reliability diagram after each session. Documented at acritch.com/credence-game and recreated open-source at github.com/humanharlan/Calibration. This is the minimal viable protocol.

### 3.4 Clearer Thinking "Calibrate Your Judgment"

Adds: (i) 90% credible intervals for numeric items, (ii) domain tagging so users see per-domain calibration, (iii) lifetime reliability graph. Strong UX reference.

### 3.5 Exercises that measurably move the needle

| Exercise | Source | Effect |
|---|---|---|
| "Consider the opposite" prompt on high-confidence items | Koriat et al. 1980 | reduces overconfidence ~7 points |
| Immediate per-item feedback with running reliability diagram | CFAR; 80K Hours | fastest route to 50/60/70/80/90 well-calibrated |
| 90% interval estimation with hit-rate feedback | Hubbard / Clearer Thinking | ~80% hit-rate in 3–5 sessions |
| Wager-based scoring | Fischhoff, Slovic & Lichtenstein 1977 | sharper tails; engages loss aversion |
| Reference-class / base-rate prompt | Tetlock GJP | largest single move on forecasting items |
| Post-session written reflection ("which bin drifted?") | Hacker 2008 | supports transfer |

---

## 4. Open-source question banks

| Source | License | Quality for our use | Notes |
|---|---|---|---|
| **OpenTriviaDB** (opentdb.com) | **CC-BY-SA 4.0** | Good for binary/MCQ; spans 24 domains | Easy REST API; ~4k+ curated questions. Full dump on Kaggle. Biggest risk: trivia bias, cultural skew. |
| **TriviaQA** (allenai) | **Apache-2.0** | 95K Q/A with evidence docs | Trivia-heavy but well-scrubbed; good for knowability filtering. |
| **Natural Questions** (Google) | **CC-BY-SA 3.0** | 307K real Google queries + Wikipedia answers | Longer-form; harder to convert to binary; great for "some knowledge, some inference". |
| **SQuAD 2.0** | **CC-BY-SA 4.0** | Passage-conditioned; includes "no answer" items | Useful for "I don't know" training — about 1/3 of SQuAD 2.0 items have no answer. |
| **AllenAI Fermi** (github.com/allenai/fermi) | **Apache-2.0** | 928 Fermi problems + program-form solutions | Gold for quantitative calibration with 90% intervals. |
| **Science Olympiad Fermi corpus** (landy8697.github.io/open-scioly-fermi) | Public practice pool | Shorter questions w/ numeric answers | Breadth across physics/bio/chem. |
| **Metaculus public API** (metaculus.com/api) | ToS: non-commercial research use; consult before redistributing | Resolved forecasting questions with community-aggregated forecasts | Good for retrodictions; not clearly open-licensed — treat as "via API, no rehost". |
| **GJOpen** | No open data license | Practice/reference only | Don't ingest; link out. |
| **Open Philanthropy calibration corpus** (github.com/willfind/calibrate-your-judgement) | Repo code appears MIT / unlicensed question bank — **check before shipping** | ~thousands of binary questions used by 80K Hours / OpenPhil | If licensed, this is the best ready-made bank for our exact protocol. |
| **Clearer Thinking question bank** | Closed | Reference only | API not public. |
| **OpenTriviaQA** (github.com/uberspot/OpenTriviaQA) | **Creative Commons** | ~160K trivia Q/A | Raw, needs filtering. |

**Recommendation.** Ship MVP on **OpenTriviaDB (CC-BY-SA)** for binary items + **AllenAI Fermi (Apache-2.0)** for quantitative items + a hand-curated seed of ~200 "no-right-answer" & reasoning questions. Respect CC-BY-SA: attribute, and if you ship modifications as a dataset, you must share-alike.

---

## 5. Domain-spanning questions (avoiding the trivia trap)

Evidence on breadth: Hacker 2008 and the 80K/OpenPhil design both use broad-domain item pools because narrow-domain calibration does not transfer. Pure trivia trains recall, not calibration — the Brier signal gets dominated by domain knowledge variance.

**Design principles for our bank (curation spec):**

1. **Category quotas** — each session mixes at least 5 of: Geography, History, Science (physical/bio), Current events, Logic/math, Linguistics, Estimation (Fermi), Reasoning/inference, "Genuinely uncertain" (forecast-style).
2. **Knowability tag** per item: `knowledge` (lookup-able), `inference` (derive from principles), `estimation` (Fermi), `uncertain` (forecast / opinion). Surface the tag *after* answering — users should learn to recognise which mode they're in.
3. **Difficulty by confidence, not correctness.** Include items designed to elicit 60%, 75%, 90% confidence respectively — target even distribution across bins so every reliability-diagram cell has data.
4. **"I don't know" items**: include questions with no correct answer, extremely obscure answers, or contradictory evidence. Reward is calibration, not accuracy. Fraction: ~10–15%.
5. **Question writing rubric** (adapt from 80K Hours): unambiguous resolution criterion, verifiable answer, minimum cultural bias, minimum temporal decay.

---

## 6. "I don't know" training

Published protocols converge on three mechanisms:

1. **Abstention / "skip" option** scored neutrally. Penalises forced guessing but doesn't reward avoidance.
2. **50% confidence = maximum uncertainty** on binary items. In half-range elicitation, 50% is literally "I'm guessing" and the proper scoring rule rewards this correctly when the user genuinely doesn't know.
3. **Explicit no-answer items** (SQuAD 2.0 style): mix in items where the *correct* response is "unanswerable." Train users to detect this.
4. **Per-bin reliability feedback**: the 95–100% bin should shrink as users learn to withhold top confidence. Show this trend explicitly.
5. **"Consider the opposite" prompt** on high-confidence items (Koriat et al. 1980) — this is the single best-documented intervention for overconfidence.

Avoid: forced distributions (e.g., "rank how sure you are across five claims") — they are cognitively costly and don't match downstream real-world elicitation.

---

## 7. Calibration overlay for other modules

Goal: before any block in another domain (e.g., working-memory N-back, processing-speed task), user predicts their accuracy; we score calibration on the prediction and fold it into the cross-module metacognitive metric.

**Design — single-number prediction (recommended MVP).** Cleanest; maps directly to Brier.

```
Before block:  "Predict your % correct on the next 20 items:  [ __ ]"
After block:   Actual % correct = X. Predicted = Y.
                  Per-block Brier = ((X - Y)/100)^2
                  Overlay on cross-module calibration curve.
```

**Design — distribution elicitation (advanced/opt-in).** Ask for a 80% credible interval on predicted accuracy; score by containment. Closer to the literature's recommendation (Hubbard; Clearer Thinking) but more friction.

**Key implementation points from the literature:**

- **Do it before every block**, not once per session (Hacker 2008 — frequent monitoring is what drives improvement).
- **Post-hoc feedback must be immediate**: show predicted vs actual side-by-side within 1 screen (Haddara & Rahnev 2022 show feedback reduces bias but not sensitivity unless it is per-trial or per-block).
- **Track drift**: users often get sharper in one module and leak overconfidence elsewhere. Show a per-module mini reliability diagram.
- **Aggregate into a single "calibration score"** (e.g., 100 − ECE·100) visible on the main dashboard; this is the cross-cutting metric that makes the whole suite cohere.

---

## 8. Open-source implementations (URLs)

| Project | URL | Notes |
|---|---|---|
| CFAR Credence Calibration Game (text recreation) | https://github.com/humanharlan/Calibration | Reference implementation of the minimal protocol |
| CFAR calibration-market (betting variant) | https://github.com/aslanides/calibration-market | Wager-based scoring |
| 80,000 Hours Calibration Training | https://80000hours.org/calibration-training/ | Best production UX; thousands of binary items |
| Open Philanthropy Calibration | https://www.openphilanthropy.org/calibration | Same app / question bank as 80K Hours |
| Open Philanthropy calibration source + question tooling | https://github.com/willfind/calibrate-your-judgement | CouchDB-based; check license before vendoring |
| Clearer Thinking Calibrate Your Judgment | https://programs.clearerthinking.org/calibrate_your_judgment.html | Numeric + binary; great UX reference (closed source) |
| ConfiQuiz | https://sneerajmohan.github.io/confiquiz_webapp/ | Small open web implementation |
| Credence Calibration (Critch overview) | https://acritch.com/credence-game/ | Design rationale |
| Quantified Intuitions | https://www.quantifiedintuitions.org/ | Multiple calibration exercises incl. Pastcasting |
| LessWrong list of calibration exercises | https://www.lesswrong.com/posts/LdFbx9oqtKAAwtKF3/list-of-probability-calibration-exercises | Curated index |
| AllenAI Fermi dataset | https://github.com/allenai/fermi | Apache-2.0 Fermi problems |
| Open Trivia DB | https://opentdb.com/api_config.php | CC-BY-SA 4.0, API + dumps |
| OpenTriviaQA | https://github.com/uberspot/OpenTriviaQA | Creative Commons trivia Q/A dump |
| Metaculus API | https://www.metaculus.com/api/ | Archived forecasting questions |
| Metaculus bot template | https://github.com/Metaculus/metac-bot-template | API usage reference |
| EFS-OpenSource calibration-framework (nn uncertainty) | https://github.com/EFS-OpenSource/calibration-framework | Python lib for ECE/MCE/Platt/temp scaling — useful backend |
| torchmetrics CalibrationError | https://lightning.ai/docs/torchmetrics/stable/classification/calibration_error.html | Drop-in ECE/MCE |
| jsPsych | https://www.jspsych.org/ | No dedicated confidence plugin, but `survey-html-form` and `survey-likert` cover it; most labs roll custom |

---

## 9. Recommended MVP

### Core session (5–10 min)

1. **20 items** drawn from: 12 binary knowledge/inference (OpenTriviaDB + hand-curated), 4 quantitative 90%-CI estimation (AllenAI Fermi), 2 "uncertain/no-answer", 2 reasoning.
2. Elicitation:
   - Binary → half-range slider 50–100%, snapping to 50/60/70/80/90/99.
   - Numeric → two fields: low and high bound of 90% CI.
   - Optional wager toggle (off by default).
3. On items where user reports ≥90%, show a one-click "what could make this wrong?" pre-commit prompt (Koriat et al. 1980).
4. Immediate per-item feedback: right/wrong + running Brier.

### End-of-session dashboard

- Reliability diagram with diagonal reference, per-bin counts.
- Brier with Murphy decomposition (reliability / resolution / uncertainty).
- ECE with plain-language interpretation.
- Per-domain mini-sparklines.
- Trend over past 30 sessions.

### Overlay (ships with every other module)

- Pre-block single-number prediction of accuracy.
- Post-block delta + contribution to lifetime calibration curve.
- Weekly email/notification: "you are 8% overconfident in N-back; 2% in reaction-time; well-calibrated in reasoning."

### Scoring & storage

- Primary: **Brier** (bounded, decomposable, friendly).
- Research view: log score + spherical for power users.
- Calibration metric for dashboard: $100 - 100\cdot\mathrm{ECE}$ (equal-mass 10 bins; report equal-width as secondary).
- Compute with EFS-OpenSource/calibration-framework or a ~50-line local implementation.

### Data

- Ship with OpenTriviaDB dump (CC-BY-SA, credit in-app) + AllenAI Fermi (Apache-2.0) + ~200 curated seed.
- Tag every item with: domain, knowability, expected-difficulty.
- Respect CC-BY-SA: if we expose our filtered/tagged dataset, share-alike applies.

### Stretch goals

- Import resolved Metaculus questions via API for a "forecasting" module.
- Reference-class prompt on forecasting items (Tetlock decomposition).
- Social leaderboard on Brier, not accuracy (keeps incentives aligned).

---

## 10. Key citations

- Brier, G. W. (1950). Verification of forecasts expressed in terms of probability. *Mon. Weather Rev.* 78: 1–3.
- Murphy, A. H. (1973). A new vector partition of the probability score. *J. Appl. Meteorol.* 12: 595–600.
- Lichtenstein, S. & Fischhoff, B. (1977). Do those who know more also know more about how much they know? *OBHP* 20: 159–183.
- Koriat, A., Lichtenstein, S. & Fischhoff, B. (1980). Reasons for confidence. *JEP:HLM* 6: 107–118.
- Fischhoff, B., Slovic, P. & Lichtenstein, S. (1977). Knowing with certainty: The appropriateness of extreme confidence. *JEP:HPP* 3: 552–564.
- Gneiting, T. & Raftery, A. E. (2007). Strictly proper scoring rules, prediction, and estimation. *JASA* 102: 359–378.
- Ferro, C. A. T. & Fricker, T. E. (2012). A bias-corrected decomposition of the Brier score. *QJRMS* 138: 1954–1960.
- Siegert, S. (2017). Simplifying and generalising Murphy's Brier-score decomposition. *QJRMS* 143: 2117–2125.
- Nixon, J. et al. (2019). Measuring calibration in deep learning. *CVPR Workshops*.
- Hacker, D. J., Bol, L. & Keener, M. C. (2008). Metacognition in education: a focus on calibration. In Dunlosky & Bjork (eds), *Handbook of Memory and Metacognition*.
- Butler, A. C. (2017). Metacognition and self-regulated learning. (cited in project README.)
- Schneider, W. (2021). Calibrating Calibration: A meta-analysis of learning-strategy interventions. *Educ. Psych. Rev.*
- Haddara, N. & Rahnev, D. (2022). The impact of feedback on perceptual decision-making and metacognition. *Psychological Science.*
- Tetlock, P. E. & Gardner, D. (2015). *Superforecasting: The Art and Science of Prediction.* Crown.
- Mellers, B., Stone, E., Atanasov, P. et al. (2015). The psychology of intelligence analysis: drivers of prediction accuracy in world politics (Good Judgment Project).
- Hubbard, D. (2014). *How to Measure Anything.* Wiley. (Calibration training protocol for 90% CIs.)
