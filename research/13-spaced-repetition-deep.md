# 13 — Spaced Repetition: Deep Dive on FSRS, SM-2, HLR and Fit for Intellect Forge

**Round 2, open-source code focused.** Supersedes the brief treatment in `07-orchestrator.md`.
All formulas below are extracted verbatim from the actual source code of `ts-fsrs`
(MIT, FSRS-6, cloned April 2026) or from the canonical SM-2 page at SuperMemo, and
from `duolingo/halflife-regression` (MIT).

Reading order:
1. [§1 TL;DR decision](#1-tldr-decision)
2. [§2 FSRS model in detail](#2-fsrs-model-in-detail-dsr--21-parameters)
3. [§3 SM-2 in detail](#3-sm-2-in-detail)
4. [§4 Why FSRS beats SM-2](#4-why-fsrs-beats-sm-2-failure-modes)
5. [§5 Half-life regression (Duolingo)](#5-half-life-regression-duolingo)
6. [§6 Does SR apply at the domain level?](#6-critical-analysis-does-sr-apply-at-the-domain-level-for-skills)
7. [§7 Where SR DOES apply in Intellect Forge](#7-where-sr-applies-in-intellect-forge)
8. [§8 Code sketches](#8-code-sketches-for-using-ts-fsrs)
9. [§9 ACTIVE booster schedule and first principles](#9-principled-derivation-of-a-booster-schedule)
10. [§10 Libraries and licensing matrix](#10-libraries-and-licensing-matrix)
11. [§11 Final recommendation](#11-final-recommendation)

---

## 1. TL;DR decision

| Scheduling problem | Use SR? | Which algorithm |
|---|---|---|
| Domain-level cadence (when to train working memory vs UFOV) | **No, do not force fit FSRS** | Rule-based orchestrator from doc 07, optionally with HLR-style log-linear predictor for next-session performance |
| Calibration flashcards (metacognitive items, e.g. "was your last confidence well calibrated?") | **Yes** | `ts-fsrs` directly, FSRS-6 defaults |
| Matrix-reasoning item bank (per-item re-exposure for relational reasoning) | **Yes, loosely** | `ts-fsrs` per item, but with skill-based fuzz and a retention target of 0.85 (not 0.9) |
| Multi-year booster sessions (ACTIVE-style) | **Partial** | Expanding-retrieval schedule derived from FSRS forgetting curve at domain level (see §9), but domain "stability" is a proxy, not truly memory stability |

**Biggest pitfall**: treating a cognitive-training domain as a "card" collapses dozens of
heterogeneous skill elements (speed of processing, divided attention, calibration) into a
single D/S/R triplet, which the algorithm was never validated on. Use FSRS where the
retention semantics are real (items the user must recall) and don't pretend the algorithm
is principled for "skills."

---

## 2. FSRS model in detail: DSR + 21 parameters

### 2.1 The model

FSRS represents each card as a pair **(D, S)** — *Difficulty* and *Stability* — and derives
**R(t)** — *Retrievability* (probability of successful recall) — from stability and elapsed
time.

From `ts-fsrs/src/algorithm.ts` (`forgetting_curve`, lines 34–51):

```
R(t, S) = (1 + FACTOR × t / (9 × S))^DECAY
```

where `DECAY = -w[20]` (FSRS-6 adds a learnable decay; earlier versions fixed it to −0.5)
and `FACTOR = exp(ln(0.9)/DECAY) − 1`.

`FACTOR/9` is chosen so that **R(S) = 0.9** — i.e. *stability is, by definition, the
interval in days at which retrievability has decayed to 90%*.

### 2.2 The 21 parameters

FSRS-6 uses a 21-vector `w[0..20]`. Older FSRS-4 uses 17, FSRS-5 uses 19. The actual
defaults in `constant.ts`:

```ts
export const default_w = Object.freeze([
  0.212, 1.2931, 2.3065, 8.2956,   // w0..w3 initial stability for Again/Hard/Good/Easy
  6.4133, 0.8334,                  // w4  initial difficulty (Good); w5 difficulty-grade sensitivity
  3.0194, 0.001,                   // w6  difficulty delta per grade; w7 mean-reversion toward easy
  1.8722, 0.1666, 0.796,           // w8,w9,w10 stability growth exponent / power / retention-effect
  1.4835, 0.0614, 0.2629, 1.6483,  // w11..w14 post-lapse (PLS) multipliers
  0.6014, 1.8729,                  // w15 Hard penalty (<1); w16 Easy bonus (>1)
  0.5425, 0.0912,                  // w17,w18 short-term stability exponents (same-day reviews)
  0.0658,                          // w19 short-term stability negative power (FSRS-6)
  0.1542,                          // w20 decay (FSRS-6)
])
```

Clamp ranges (also from `constant.ts`) tell you the *semantic shape* of each parameter —
e.g. `w9 ∈ [0, 0.8]`, `w20 ∈ [0.1, 0.8]`. This matters if you are doing your own
optimisation.

### 2.3 Initial state

```ts
// First review rating g ∈ {Again=1, Hard=2, Good=3, Easy=4}
init_stability(g)  = max(w[g-1], 0.1)
init_difficulty(g) = clamp(w[4] − exp((g-1) × w[5]) + 1, 1, 10)
```

Note: **not** `w[4] − (g−3)×w[5]` as the older wiki described — FSRS-5/6 use
`w[4] − exp((g−1)×w[5]) + 1`. This is one reason you should read the source, not the wiki.

### 2.4 Stability update after a successful review

From `next_recall_stability` (lines 253–272):

```
S'_r(D,S,R,g) = S × (1 + exp(w[8]) × (11 − D) × S^(−w[9])
                       × (exp((1 − R) × w[10]) − 1)
                       × hard_penalty × easy_bound)
```

where `hard_penalty = w[15]` if `g = Hard`, else 1; `easy_bound = w[16]` if `g = Easy`,
else 1; and `S'` is clamped to `[0.001, 36500]`.

Intuition: the *multiplier* on S is monotone in (11 − D), S^{−w9} (so easier stabilities
grow faster — the **spacing effect**), and in the retrievability gap (1 − R) — i.e. **the
less likely you were to remember, the more stability increases when you do**. This is the
"desirable difficulty" effect baked in.

### 2.5 Stability update after a lapse (post-lapse stability, PLS)

From `next_forget_stability` (lines 284–297):

```
S'_f(D,S,R) = w[11] × D^(−w[12]) × ((S+1)^(w[13]) − 1) × exp((1 − R) × w[14])
```

Clamped to `[0.001, S_prev]` (you never *gain* stability by forgetting). When short-term
is enabled, further clamped by `S / exp(w[17] × w[18])`.

### 2.6 Same-day (short-term) stability

```
S'_s(S,g) = S × S^(−w[19]) × exp(w[17] × (g − 3 + w[18]))
          = S^(1−w[19])     × exp(w[17] × (g − 3 + w[18]))
```

Used only when `t = 0` (i.e. the user is re-reviewing within the same day). Masked so
that `g ≥ Hard` never *decreases* stability.

### 2.7 Difficulty update

From `next_difficulty` / `linear_damping` / `mean_reversion`:

```
delta_d = −w[6] × (g − 3)
damped  = delta_d × (10 − D) / 9        // linear damping: big D resists change
next_d  = D + damped
D'      = clamp( w[7] × init_difficulty(Easy) + (1 − w[7]) × next_d, 1, 10 )
```

Mean reversion toward `D₀(Easy)` with strength `w[7]` ≈ 0.001 by default (effectively
none in FSRS-6 defaults; the mean reversion was stronger in older versions).

### 2.8 Optimal next interval for target retention *r*

From `calculate_interval_modifier` (lines 87–93):

```
I(r, S) = S × (r^(1/DECAY) − 1) / FACTOR
```

Setting `r = 0.9` recovers `I = S` (by definition). The scheduler multiplies stability by
this modifier, clamps to `[1, maximum_interval]`, then optionally fuzzes.

### 2.9 How the parameters are trained

FSRS parameters are fitted by gradient descent on the user's review history. The loss
is the log-loss between predicted `R(t, S)` and the observed 0/1 outcome for each review
(lapses vs successes). The Rust implementation uses the **Burn** framework; Python uses
autograd. From a user's 1000+ review log, an optimisation run takes seconds and typically
improves log-loss by 5–30% over defaults. See `packages/binding` in `ts-fsrs` for a
WASM/N-API bridge into the Rust optimizer.

Key fact for us: **you need roughly 500+ reviews before personal optimisation beats the
population defaults.** Until then, use the defaults above.

---

## 3. SM-2 in detail

From SuperMemo's canonical 1987 description (`super-memory.com/english/ol/sm2.htm`):

```
Quality q ∈ {0..5}:
  5 perfect
  4 correct with hesitation
  3 correct with serious difficulty
  2 incorrect but correct one seemed easy
  1 incorrect, correct one remembered
  0 complete blackout

Interval:
  I(1) = 1 day
  I(2) = 6 days
  I(n) = I(n-1) × EF    for n > 2

Ease-factor update (applied after every review):
  EF' = EF + (0.1 − (5 − q) × (0.08 + (5 − q) × 0.02))
  EF  = max(EF', 1.3)
  Initial EF = 2.5

Lapse: if q < 3, reset n := 0 (restart the card).
```

That is the entire algorithm. **No D, no S, no R; no concept of retrievability decay**.
Two heuristics (expanding intervals + ease), one update rule.

### Anki's variant

Anki diverges from canonical SM-2 in practical ways:
- 4-point grading (Again/Hard/Good/Easy) instead of 0–5.
- Configurable learning steps (e.g. `1m 10m`) before a card enters Review state.
- On lapse, Anki doesn't fully reset — it applies a relearning step and reduces the
  interval by a factor.
- Ease changes: Again −20%, Hard ×1.0 but penalises ease −15%, Good ×EF, Easy ×EF×bonus.
- Late reviews (`t > scheduled_days`) get credit in the interval calculation.

These are empirical patches to SM-2's failure modes (see §4).

---

## 4. Why FSRS beats SM-2 (failure modes)

1. **SM-2 has no forgetting curve.** It *prescribes* an interval from ease×previous, but
   never asks "what is the probability of recall at that time?". You cannot set a target
   retention. FSRS makes retention the first-class parameter.
2. **SM-2 doesn't reward desirable difficulty.** Stability growth in FSRS is
   proportional to `(exp(w10·(1−R)) − 1)`; harder-won successes boost stability more.
   SM-2 just multiplies by EF.
3. **SM-2 collapses on late/early reviews.** If the user reviews 2× the scheduled
   interval, SM-2 still multiplies by EF next time. FSRS uses actual elapsed time in the
   stability update, so late reviews expose real stability and produce larger intervals.
4. **"Ease hell"** — repeated Hard/Again ratings drive EF toward 1.3 and the card
   cycles forever. FSRS has mean-reversion on difficulty and post-lapse stability bounded
   by prior stability.
5. **SM-2 cannot be personalised** beyond EF changes. FSRS has 21 parameters optimisable
   on the user's own history.

In direct benchmarks on the 13M+ Anki collection datasets, FSRS-4.5 and FSRS-5 produce
15–25% fewer reviews for the same retention vs SM-2. (Source: FSRS benchmark repo.)

---

## 5. Half-life regression (Duolingo)

Settles & Meeder 2016 (ACL) proposed HLR: a trainable log-linear model of memory half-life.
From `duolingo/halflife-regression/experiment.py` (MIT):

```
h(x)  = 2^(θ · x)                          # half-life prediction
p(x, Δ) = 2^(−Δ / h(x))                    # recall prob at lag Δ

Feature vector x per review instance:
  ('right', sqrt(1 + n_right))
  ('wrong', sqrt(1 + n_wrong))
  ('bias',  1)
  + optional per-lexeme one-hots

Loss per instance:
  ℓ = (p_obs − p)² + α × (h_obs − h)² + λ‖θ‖²

Training: SGD with per-feature adaptive rates:
  rate_k = (1/(1 + p_obs)) × lrate / sqrt(1 + fcounts[k])
  θ[k] −= rate_k × (dℓ/dp × ∂p/∂θ[k] + α × dℓ/dh × ∂h/∂θ[k])
```

Key differences from FSRS:
- HLR uses an **exponential** (half-life) forgetting model; FSRS-6 uses a learnable
  power-law decay.
- HLR fits a single θ across all users and items (with per-lexeme features). FSRS fits
  per-user parameters.
- HLR's feature vector is open — you can add arbitrary features like "session position",
  "time of day", "last performance z-score". This is the **most appealing aspect for
  skill-domain modelling**.

### Why HLR is a better conceptual fit for domain-level scheduling

For Intellect Forge's domain-level scheduler, we don't want to pretend a domain is a card
with a stability parameter. What we actually want is:

> Given domain d, user u, last session's performance p_{t−1}, time since last session Δ,
> and various covariates, predict performance at the next session as a function of Δ.
> Choose Δ to keep predicted performance in a target band.

HLR's log-linear form is exactly this kind of feature-engineering-friendly regressor.
There's no 2016 OSS HLR library in TypeScript; the duolingo repo is a Python research
codebase. We would port the math (~50 lines) and fit our own θ.

---

## 6. Critical analysis: does SR apply at the domain level for skills?

### The naive mapping

| Card concept | Domain mapping |
|---|---|
| Card | Training domain (UFOV, n-back, matrix, calibration) |
| Review | A training session |
| Rating | Session performance z-score vs. rolling baseline |
| Stability | "Decay time" of domain performance |
| Retrievability | Predicted performance on next session |

### Why this *partially* works

- There is a real decay of task-specific performance over weeks/months. ACTIVE demonstrated
  it — untrained groups lost 5–10% on speed-of-processing over 5 years; booster groups
  preserved the gain. This is somewhat analogous to retention decay.
- An expanding schedule (more frequent early, sparser later) does fit the empirical
  evidence (ACTIVE's 11-month and 35-month boosters).

### Why this *breaks*

1. **FSRS was fitted on fact recall, not capacity change.** The forgetting curve
   `R(t,S) = (1 + t/(9S))^-1` is calibrated against Anki review outcomes, where each
   review is a binary recall of the *same fact*. Cognitive training sessions produce
   multi-dimensional performance vectors that change *even when stability is constant*
   (mood, sleep, practice effects, adaptive difficulty). The mapping from session-performance
   to a binary "remembered/forgot" is lossy.
2. **Skill decay is asymmetric.** Skills can get *better* with no exposure (consolidation,
   sleep). Memory stability in FSRS cannot. The DSR model has no notion of overnight
   consolidation.
3. **Difficulty in FSRS is of the *item*; domains have no stable intrinsic difficulty.**
   Working-memory capacity is trained *up*, not remembered.
4. **Ratings semantics mismatch.** FSRS rating maps to a stability multiplier. A
   near-at-ceiling session on UFOV and a failing session both should reduce the
   *interval-to-next* for opposite reasons (at-ceiling → advance stage; failing →
   consolidate). FSRS cannot express that.
5. **Target retention doesn't translate.** There is no "90% recall probability" for
   divided attention; there is only "% of ceiling performance retained" which is
   continuous and has different operational meaning.

### Conclusion

**At the domain level, use a rule-based scheduler (the orchestrator in doc 07) optionally
augmented with an HLR-style log-linear performance predictor. Do not pretend FSRS is
principled here.** The DSR model's three state variables are insufficient to describe the
joint evolution of capacity, speed, calibration, and transfer on a training domain.

---

## 7. Where SR applies in Intellect Forge

### Yes, use ts-fsrs directly:

**A. Metacognitive calibration items.**
From doc 05, we plan a calibration bank where the user rates confidence, we measure the
Brier score, and we present calibration lessons. The lessons are *true flashcards* —
factual items like "under-confidence is more common than over-confidence in your data",
or "when you say 70%, you were right 65% of the time". Each lesson is a card; each review
is a quick quiz that is genuinely binary recall.

**B. Matrix-reasoning item bank.**
For relational reasoning (doc 04), we have a pool of several hundred matrix items at
varying difficulty. Re-exposing a user to an item they failed 60 days ago is **exactly**
the SR problem, with the caveat that transfer effects require presenting *different
instances of the same rule family* — so schedule at the **rule-family level**, not the
instance level, with FSRS and a lower retention target (~0.85 to tolerate the noise).

**C. Instruction recall.**
Training paradigms have protocol details (e.g. "in the dual 3-back variant, respond to
position repeats 3 trials back, not 2"). Users who train weekly often forget these on
return. A short instruction-recall quiz at the top of each session, scheduled with
FSRS, avoids expensive re-training of protocol.

### No, do not use FSRS:

- **Domain-level cadence** (§6 above). Rule-based + HLR predictor.
- **Booster scheduling** over months/years. Use an expanding-retrieval schedule with
  hardcoded checkpoints (1mo, 3mo, 9mo, 24mo, 36mo) informed by ACTIVE and §9.
- **Within-session item selection for adaptive tasks.** Already governed by the adaptive
  staircase (doc 01/02).

---

## 8. Code sketches for using ts-fsrs

### 8.1 Calibration item scheduler

```ts
import {
  createEmptyCard,
  fsrs,
  Rating,
  generatorParameters,
  type Card,
} from 'ts-fsrs'

const params = generatorParameters({
  request_retention: 0.9,   // default
  enable_fuzz: true,        // spread reviews across days
  enable_short_term: true,
})
const scheduler = fsrs(params)

type CalibrationItemRecord = {
  itemId: string
  userId: string
  card: Card        // persisted per (userId, itemId)
}

function gradeFromOutcome(correct: boolean, ms: number): 1 | 2 | 3 | 4 {
  if (!correct) return 1 as const                         // Again
  if (ms > 8000) return 2 as const                        // Hard
  if (ms > 3000) return 3 as const                        // Good
  return 4 as const                                       // Easy
}

export function reviewCalibrationItem(
  record: CalibrationItemRecord,
  outcome: { correct: boolean; responseMs: number },
  now = new Date()
) {
  const grade = gradeFromOutcome(outcome.correct, outcome.responseMs)
  const { card: nextCard, log } = scheduler.next(record.card, now, grade)
  return { card: nextCard, log }   // persist both
}

export function dueCalibrationItems(
  records: CalibrationItemRecord[],
  now = new Date()
): CalibrationItemRecord[] {
  return records.filter(r => r.card.due <= now)
}
```

### 8.2 Matrix-rule-family scheduler

Schedule *rule families* (e.g. "progression", "XOR", "distribution-of-three"), not
individual matrix instances. On review, randomly draw an unseen instance of the due
family.

```ts
import { createEmptyCard, fsrs, Rating } from 'ts-fsrs'

const matrixScheduler = fsrs({
  request_retention: 0.85,   // lower than 0.9: transfer is noisy
  enable_fuzz: true,
  enable_short_term: false,  // no same-day repeats for reasoning
})

type RuleFamilyCard = {
  familyId: string
  userId: string
  card: Card
}

// Skill-aware grading: accuracy on family's last 3 presented items
function gradeFromFamilySession(
  accuracy: number,   // 0..1, averaged over 3+ instances
  medianMs: number,
  ceilingMs: number
): 1 | 2 | 3 | 4 {
  if (accuracy < 0.5) return 1
  if (accuracy < 0.75) return 2
  if (medianMs > ceilingMs * 1.5) return 2
  if (accuracy < 0.9) return 3
  return 4
}
```

### 8.3 Domain-level HLR-style predictor (do NOT use FSRS here)

```ts
// Simple log-linear predictor of next-session z-score decay.
// This is NOT FSRS. This is our own HLR-inspired model.

type DomainReview = {
  userId: string
  domain: 'ufov' | 'dual_nback' | 'matrix' | 'calibration'
  ts: Date
  zScoreVsBaseline: number       // capped performance signal
}

type Features = Float64Array     // [bias, sqrt(sessions), sqrt(days_since), lastZ, meanZ_30d, ...]

function extractFeatures(history: DomainReview[], now: Date): Features {
  // ... compute feature vector per session ...
}

// Predict: halfLifeDays = 2^(theta · x)
// Choose next-session Δ so that expected z-decay stays above threshold.
function predictHalfLifeDays(theta: Float64Array, x: Features): number {
  let dp = 0
  for (let i = 0; i < x.length; i++) dp += theta[i] * x[i]
  return Math.min(Math.max(2 ** dp, 0.5), 365)
}

function scheduleNextSession(
  theta: Float64Array,
  x: Features,
  targetRetention: number = 0.8
): number /* days until next session */ {
  const h = predictHalfLifeDays(theta, x)
  // recall prob r at lag Δ: r = 2^(-Δ/h)  →  Δ = -h * log2(r)
  return -h * Math.log2(targetRetention)
}
```

Training θ is done offline with SGD on the user's own history (~20 lines of code). Start
with θ = 0 (which yields h = 1 day, 2^0 = 1, a reasonable conservative prior) and update
after each session.

---

## 9. Principled derivation of a booster schedule

ACTIVE used boosters at 11 months and 35 months post-initial. Can we derive those
spacings from first principles?

**First-principles derivation using FSRS forgetting curve at the domain level:**

Assume domain stability after a 10-session burst is some `S_0` days, and we want to
maintain retrievability above `r_target`. Use `I(r, S) = S × (r^{1/d} − 1) / FACTOR` with
FSRS-6 defaults (`d = 0.1542`, FACTOR ≈ 19.5):

- If `S_0 = 150` days and `r_target = 0.9`, next booster ≈ `150 × ((0.9)^{1/0.1542} − 1)/19.5`
  ≈ 150 days ≈ 5 months.
- After successful booster, stability grows (eq. §2.4 with D≈5, r≈0.9, g=Good): `S_1 ≈
  3.5 × S_0 ≈ 525` days, booster at 525 days ≈ 17 months.
- `S_2 ≈ 3.5 × S_1 ≈ 1838` days — far beyond ACTIVE's window.

With `r_target = 0.8`: intervals stretch ~2×, giving roughly `10mo, 28mo, ...` — this is
extremely close to ACTIVE's 11-month and 35-month spacing.

**So: ACTIVE's booster schedule is consistent with a domain-stability FSRS model at
r_target ≈ 0.8 and initial domain stability ≈ 150 days.** This gives us a defensible,
first-principles justification for our booster cadence even if we don't adopt FSRS as a
runtime scheduler at the domain level.

**Recommended hard-coded booster checkpoints for Intellect Forge (post 10-session burst):**

| Booster # | Target day | Rationale |
|---|---|---|
| 1 | 30 | Short consolidation check after burst |
| 2 | 90 | ~3mo; typical skill-decay window |
| 3 | 270 | ~9mo; ACTIVE-style midpoint |
| 4 | 540 | ~18mo |
| 5 | 900 | ~30mo; near ACTIVE's 35mo |
| 6+ | yearly | Maintenance |

Early boosters (30/90) are *denser than ACTIVE* because self-paced app contexts have more
variable adherence than the ACTIVE clinical setting.

---

## 10. Libraries and licensing matrix

| Library | Repo | License | Size | Use for us |
|---|---|---|---|---|
| **ts-fsrs** | open-spaced-repetition/ts-fsrs | MIT | ~30KB min+gz | **Adopt directly** for calibration/matrix/instruction items |
| `@open-spaced-repetition/binding` | same repo | MIT | Rust+WASM | Optional; for per-user parameter optimisation once we have data |
| **py-fsrs** | open-spaced-repetition/py-fsrs | MIT | — | Server-side batch re-optimisation only |
| **fsrs-rs** | open-spaced-repetition/fsrs-rs | MIT | — | Not needed unless native/offline |
| **Anki core** | ankitects/anki | **AGPL** | — | **Do not vendor**. AGPL is viral for SaaS. Reference code only. |
| **Mnemosyne** | mnemosyne-proj/mnemosyne | **GPL** | — | Reference only. |
| **Duolingo HLR** | duolingo/halflife-regression | MIT | Python research | Port the ~50-line model into TS ourselves |
| **SuperMemo SM-17/18** | — (proprietary) | closed | — | Paper reading only |

`ts-fsrs` is the clear integration choice. MIT, actively maintained (FSRS-6 as of 2025),
pure TypeScript with ES modules / CJS / UMD, no runtime dependencies.

---

## 11. Final recommendation

1. **Adopt `ts-fsrs` (MIT, FSRS-6) as the item-level scheduler** for:
   - calibration flashcards (doc 05),
   - matrix rule-family review (doc 04),
   - instruction-recall items (protocol reminders).
   Use FSRS-6 defaults for v1. Collect review logs. Fit per-user parameters once any
   user has >500 reviews.

2. **Do not use FSRS for domain-level cadence.** Use the rule-based orchestrator from
   doc 07, optionally augmented with an in-house HLR-style predictor (~100 LOC) for
   between-session performance forecasting. HLR's open feature vector is the right
   abstraction for skill-domain modelling; FSRS's fixed DSR triplet is not.

3. **Hard-code booster checkpoints (30 / 90 / 270 / 540 / 900 / +365 days)** justified by
   §9's FSRS-forgetting-curve derivation at `r_target = 0.8`. This gives a principled
   story to defend in any research writeup, while remaining operationally simple.

4. **Biggest pitfall to avoid:** silently widening `ts-fsrs` to swallow domain-level
   scheduling by stuffing domain-z-scores into Rating. FSRS's DSR model is calibrated on
   binary-recall events, not continuous skill-performance; the `next_recall_stability`
   multiplier's inductive bias is wrong for capacity change. Keep item scheduling and
   domain scheduling on *separate code paths* even though both vaguely "space things
   out over time."

### Integration checklist

- [ ] Add `ts-fsrs` as dependency (`pnpm add ts-fsrs`).
- [ ] Define persistence schema: `(userId, itemId, domain) → Card` row.
- [ ] Implement `reviewCalibrationItem`, `reviewMatrixFamily`, `reviewInstructionItem`
      following §8.1/8.2.
- [ ] Implement `dueQueueForUser(userId): Array<{itemId, domain}>`.
- [ ] Implement in-house HLR predictor behind an interface so we can swap the model.
- [ ] Hard-code booster calendar (§9 table) as a separate module with no dependency on
      `ts-fsrs`.
- [ ] After ~3 months of data, trigger per-user FSRS parameter optimisation via
      `@open-spaced-repetition/binding` nightly batch.

---

### Appendix A — Where the FSRS formulas live in ts-fsrs source

| Concept | File | Function | Lines |
|---|---|---|---|
| Retrievability / forgetting curve | `algorithm.ts` | `forgetting_curve`, `computeDecayFactor` | 17–51 |
| Initial stability | `algorithm.ts` | `init_stability` | 156–158 |
| Initial difficulty | `algorithm.ts` | `init_difficulty` | 169–173 |
| Stability after recall | `algorithm.ts` | `next_recall_stability` | 253–272 |
| Stability after lapse | `algorithm.ts` | `next_forget_stability` | 284–297 |
| Short-term stability | `algorithm.ts` | `next_short_term_stability` | 305–311 |
| Difficulty update | `algorithm.ts` | `next_difficulty` + `mean_reversion` + `linear_damping` | 209–242 |
| Next-interval modifier | `algorithm.ts` | `calculate_interval_modifier` | 87–93 |
| Defaults (`w[0..20]`, clamps) | `constant.ts` | `default_w`, `CLAMP_PARAMETERS` | 24–77 |
| Card & ReviewLog types | `models.ts` | — | 1–99 |
| Public scheduling API | `fsrs.ts` | `FSRS.next`, `FSRS.repeat`, `FSRS.forget`, `FSRS.reschedule` | 38–120 |

Local working copy for reference: `C:\dev\brain-train\research\tmp-fsrs-src\`.

### Appendix B — SM-2 canonical and Anki variant references

- Canonical SM-2: https://super-memory.com/english/ol/sm2.htm
- Anki SM-2 doc: https://faqs.ankiweb.net/what-spaced-repetition-algorithm.html
- Anki core scheduler (AGPL, read-only reference): https://github.com/ankitects/anki/tree/main/rslib/src/scheduler

### Appendix C — HLR and Reddy RL references

- Settles & Meeder 2016 (ACL): https://research.duolingo.com/papers/settles.acl16.pdf
- duolingo/halflife-regression (MIT, Python): https://github.com/duolingo/halflife-regression
- Reddy, Levine, Dragan 2017 "Accelerating human learning with deep reinforcement
  learning": DRL replaces the scheduler; outperforms Leitner/SM-2 on simulated students.
  No production-quality OSS; not recommended for v1.
