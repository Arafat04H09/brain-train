# 10 — Adaptive Algorithms Deep-Dive (Source Code Read)

Round-2 companion to `01-perceptual-speed-ufov.md` §2. Every algorithm below was
verified against the live OSS source (jsQUEST, jsQuestPlus, PsychoPy
`staircase.py`, Palamedes). Pseudocode is TypeScript-portable; actual code
sketches for the top two (QUEST, n-down/1-up transformed staircase) are in §10.

**License note:** jsQUEST, jsQuestPlus, Palamedes are permissive (MIT / BSD);
PsychoPy `staircase.py` is **GPL-3.0** — we may read it for algorithmic
reference but **must not copy code**. PsiMarginal is MIT.

---

## 1. Transformed up-down staircase (Levitt 1971)

### 1.1 Convergence math

Levitt's result: an `n-down / m-up` rule with symmetric step size converges on
the intensity where the probability of the "down" event equals the probability
of the "up" event. For the "all-correct-runs" family (m = 1, n-down/1-up):

`p_converge^n = 0.5  →  p_converge = 0.5^(1/n)`

| Rule | p_converge | Use case |
|------|-----------|----------|
| 1-down / 1-up | 0.5000 | Quick orientation; PSE estimation |
| **2-down / 1-up** | **0.7071** | Common default; mild discrimination tasks |
| **3-down / 1-up** | **0.7937** | UFOV, auditory threshold, n-back adaptive |
| 4-down / 1-up | 0.8409 | High criterion (rare; slow convergence) |
| 1-down / 2-up | 0.2929 | Below-chance anchor |

**García-Pérez 1998 caveat** — with *equal* up/down step sizes the asymptotic
convergence point drifts upward (3-down/1-up lands near **83.15%**, not
79.4%). Use an asymmetric step ratio `step_up / step_down = 0.7393` for
3-down/1-up to actually converge on 79.4%, *or* use QUEST which avoids the
issue entirely.

### 1.2 Pseudocode (TS-portable, verified against PsychoPy `StairHandler`)

```ts
interface StaircaseState {
  intensity: number;           // current stimulus level
  direction: -1 | 0 | 1;       // last movement direction (0 = not yet moved)
  correctCounter: number;      // + for correct streak, - for incorrect streak
  reversalPoints: number[];    // trial indices at reversals
  reversalIntensities: number[];
  stepSizes: number[];         // e.g. [4, 4, 2, 2, 1] — shrink at each reversal
  stepIndex: number;
  nDown: number;               // e.g. 3
  nUp: number;                 // e.g. 1
  minVal: number; maxVal: number;
  scale: 'lin' | 'log' | 'db';
  trial: number;
}

function addResponse(s: StaircaseState, correct: boolean): StaircaseState {
  s.trial++;
  s.correctCounter = correct
    ? (s.correctCounter > 0 ? s.correctCounter + 1 : 1)
    : (s.correctCounter < 0 ? s.correctCounter - 1 : -1);

  let reversed = false;
  let newDir: -1 | 0 | 1 = s.direction;

  if (s.correctCounter >= s.nDown) {
    newDir = -1;                              // step down (harder)
    s.correctCounter = 0;
  } else if (s.correctCounter <= -s.nUp) {
    newDir = +1;                              // step up (easier)
    s.correctCounter = 0;
  }

  if (s.direction !== 0 && newDir !== 0 && newDir !== s.direction) {
    reversed = true;
    s.reversalPoints.push(s.trial);
    s.reversalIntensities.push(s.intensity);
    s.stepIndex = Math.min(s.stepIndex + 1, s.stepSizes.length - 1);
  }

  if (newDir !== 0 && newDir !== s.direction) s.direction = newDir;

  const step = s.stepSizes[s.stepIndex];
  if (newDir === -1) s.intensity = applyStep(s.intensity, -step, s.scale);
  if (newDir === +1) s.intensity = applyStep(s.intensity, +step, s.scale);
  s.intensity = clamp(s.intensity, s.minVal, s.maxVal);
  return s;
}

function applyStep(x: number, delta: number, scale: 'lin'|'log'|'db'): number {
  if (scale === 'lin') return x + delta;
  if (scale === 'log') return x * Math.pow(10, delta);
  /* db */              return x * Math.pow(10, delta / 20);
}

// Threshold estimate = mean/median of reversalIntensities after dropping
// first K (typically 2–4) reversals to discard transient.
function threshold(s: StaircaseState, dropFirst = 2): number {
  const kept = s.reversalIntensities.slice(dropFirst);
  return kept.reduce((a, b) => a + b, 0) / kept.length;
}
```

**Termination:** typically after a fixed number of reversals (8–12) or a
fixed trial count. Good practice: both, whichever comes first.

---

## 2. QUEST (Watson & Pelli 1983) — source-verified from jsQUEST

### 2.1 Bayesian model

**State:** a 1-D discrete posterior `pdf[i]` over threshold values `x[i]`,
where `x = i * grain` for `i ∈ [-dim/2, dim/2]` (jsQUEST default `dim=500`,
`grain=0.01`, so ±2.5 log-units around `tGuess`).

**Prior:** Gaussian in log-intensity centred at `tGuess` with SD `tGuessSd`:
```
pdf[i] ∝ exp(-0.5 * (x[i] / tGuessSd)^2)
```

**Psychometric function (Weibull; jsQUEST `calc_p2`):**
```
p(correct | Δ = x) = δ·γ + (1 - δ) · [1 - (1 - γ) · exp(-10^(β·x))]
```
where `x = stimulus − threshold` (log units). Parameters:
- `β` — slope (default 3.5)
- `δ` — lapse rate (default 0.01) — finger errors even at easy
- `γ` — guess rate (e.g. 0.5 for 2AFC, 0.125 for 8-way localization, 0.25 for 4AFC)

**Implicit threshold shift.** jsQUEST's `calc_p2` does *not* take `pThreshold`
as an argument. Watson-Pelli instead solve for the `x` where `p = pThreshold`
and shift the Weibull so the tabulated value at `x=0` equals `pThreshold`.
jsQUEST implements this by building `p2` on an extended grid `x2` (range
`[-dim·grain, +dim·grain]`) and then indexing with offset during update.

**Likelihood table `s2` (precomputed, 2 × 2·dim):**
```
s2[0] = fliplr(1 - p2)   // P(response=0 | intensity)
s2[1] = fliplr(p2)       // P(response=1 | intensity)
```
The `fliplr` flips the array so indexing `s2[r][offset + i]` gives the
likelihood at threshold `x[i]` given an observed response `r` at intensity
`stim`, where `offset = round((stim - tGuess) / grain)`.

**Update (Bayes):**
```ts
function questUpdate(q: Quest, stim: number, response: 0 | 1) {
  const offset = Math.round((stim - q.tGuess) / q.grain);
  for (let i = 0; i < q.pdf.length; i++) {
    q.pdf[i] *= q.s2[response][offset + i + q.dim / 2];
  }
  normalize(q.pdf);   // optional; keeps numerics sane
}
```

**Next-intensity selection (jsQUEST):**
- `QuestQuantile(q, quantileOrder)` — default `quantileOrder` is chosen so
  that the expected variance reduction is maximal (classical QUEST; for a
  Gaussian prior and pThreshold = 0.82 it's ≈ 0.5 = the median). Implemented
  as linear interpolation on the cumulative `cumsum(pdf)`.
- `QuestMean(q)` — posterior expectation; **this is what you report** as the
  final threshold estimate (Pelli's recommendation).
- `QuestMode(q)` — MAP; rarely used for placement.

**Termination.** Either (a) fixed trial count (25–40 trials typical for 1-D
Weibull); or (b) posterior SD below a target (e.g. 0.05 log-units), computed
as `sqrt(Σ pdf·(x − mean)^2)`.

### 2.2 TypeScript skeleton (ready to paste)

```ts
export interface QuestConfig {
  tGuess: number;      // prior mean (log-units)
  tGuessSd: number;    // prior SD; use generous value (3 log-units)
  pThreshold: number;  // target, e.g. 0.75 for UFOV
  beta: number;        // Weibull slope, default 3.5
  delta: number;       // lapse, default 0.01
  gamma: number;       // guess, e.g. 0.5 for 2AFC
  grain?: number;      // default 0.01
  range?: number;      // default 5 (log-units total)
}

export class Quest {
  readonly x: Float64Array;       // threshold grid (relative to tGuess)
  readonly x2: Float64Array;      // extended grid for likelihoods
  readonly p2: Float64Array;      // Weibull evaluated on x2
  readonly s2: [Float64Array, Float64Array];
  pdf: Float64Array;              // posterior over threshold
  private cfg: Required<QuestConfig>;
  private history: { intensity: number; response: 0 | 1 }[] = [];

  constructor(cfg: QuestConfig) {
    const grain = cfg.grain ?? 0.01;
    const range = cfg.range ?? 5;
    const dim = Math.round(range / grain);
    this.cfg = { ...cfg, grain, range } as Required<QuestConfig>;

    this.x  = mkGrid(-dim / 2, dim / 2, grain);
    this.x2 = mkGrid(-dim,     dim,     grain);

    // Weibull shifted so p2(x=0) == pThreshold
    // Solve: pThreshold = δγ + (1-δ)(1 - (1-γ)·exp(-10^(β·x0)))
    const x0 = this.solveForThresholdShift();
    this.p2 = new Float64Array(this.x2.length);
    for (let i = 0; i < this.x2.length; i++) {
      const v = this.x2[i] - x0;
      this.p2[i] = cfg.delta * cfg.gamma +
        (1 - cfg.delta) * (1 - (1 - cfg.gamma) *
          Math.exp(-Math.pow(10, cfg.beta * v)));
    }
    this.s2 = [flipSub(this.p2), flipCopy(this.p2)];

    // Gaussian prior
    this.pdf = new Float64Array(this.x.length);
    for (let i = 0; i < this.x.length; i++)
      this.pdf[i] = Math.exp(-0.5 * (this.x[i] / cfg.tGuessSd) ** 2);
    normalize(this.pdf);
  }

  quantile(q = 0.5): number {
    const cdf = cumsum(this.pdf);
    const target = q * cdf[cdf.length - 1];
    const idx = binarySearch(cdf, target);
    return this.cfg.tGuess + this.x[idx];
  }
  mean(): number {
    let m = 0, z = 0;
    for (let i = 0; i < this.pdf.length; i++) { m += this.pdf[i]*this.x[i]; z += this.pdf[i]; }
    return this.cfg.tGuess + m / z;
  }
  sd(): number {
    const mu = this.mean() - this.cfg.tGuess;
    let v = 0, z = 0;
    for (let i = 0; i < this.pdf.length; i++) { v += this.pdf[i]*(this.x[i]-mu)**2; z += this.pdf[i]; }
    return Math.sqrt(v / z);
  }

  suggest(): number { return this.quantile(0.5); }   // default placement

  update(intensity: number, response: 0 | 1) {
    this.history.push({ intensity, response });
    const offset = Math.round((intensity - this.cfg.tGuess) / this.cfg.grain);
    const lik = this.s2[response];
    const half = this.x.length / 2 | 0;
    for (let i = 0; i < this.pdf.length; i++) {
      const j = offset + i + half;      // map into extended grid
      if (j >= 0 && j < lik.length) this.pdf[i] *= lik[j];
    }
    normalize(this.pdf);
  }

  done(opts: { trials?: number; sdBelow?: number }): boolean {
    if (opts.trials && this.history.length >= opts.trials) return true;
    if (opts.sdBelow && this.sd() < opts.sdBelow) return true;
    return false;
  }
  // solveForThresholdShift(): numeric root-find for x0. Omitted for brevity.
}
```

---

## 3. QUEST+ (Watson 2017) — source-verified from jsQuestPlus

### 3.1 What changes

QUEST is 1-D (threshold only). QUEST+ generalizes to:
- **Multi-dim stimulus space** (e.g. contrast × spatial-frequency)
- **Multi-dim parameter space** (threshold, slope, lapse jointly)
- **Multi-outcome** (≥ 2 response categories; not just correct/incorrect)

Trial placement uses **minimum expected entropy of the posterior** (Shannon
information gain), not a quantile of the marginal.

### 3.2 Algorithm (jsQuestPlus)

```
Offline:
  θ_grid  = combvec(paramPriors)        // all joint parameter combinations
  s_grid  = combvec(stimPriors)         // all candidate stimuli
  prior   = normalize(combvec(paramPriors))    // joint prior over θ
  LUT[r][s][θ] = P(response = r | stimulus = s, parameter = θ)   // precomputed

Per trial:
  // Choose the stimulus that minimizes expected posterior entropy
  for each s in s_grid:
    EH[s] = 0
    for each r in outcomes:
      joint    = prior .* LUT[r][s]
      p_outcome = sum(joint)
      post_rs   = joint / p_outcome
      H_rs      = -sum(post_rs .* log2(post_rs))   // NaNs → 0
      EH[s]    += p_outcome * H_rs
  nextStim = argmin_s EH[s]

Post-response:
  posterior = normalize(prior .* LUT[observed_r][nextStim])
```

### 3.3 When worth the complexity?

Worth it when:
- You need **both threshold *and* slope** (fitting a whole psychometric fn in
  ≤ 40 trials).
- You have a **compound stimulus** whose dimensions trade off (e.g. UFOV's
  duration × eccentricity).
- You care about **lapse rate** explicitly (the 1-D QUEST fixes δ).

Not worth it when:
- You only need threshold → QUEST is simpler, faster, well-calibrated.
- Parameter grid is large (>10⁵ cells): LUT memory and per-trial loops blow up.

jsQuestPlus is MIT-licensed and plug-and-play. **This is the correct tool for
UFOV** if we ever want to jointly estimate threshold & slope.

---

## 4. Psi method (Kontsevich & Tyler 1999)

Psi is essentially QUEST+ specialized to joint (threshold α, slope β) with a
binary outcome, published 18 years earlier. Structure:

1. **Prior** `p(α, β)` — uniform or weakly informative on a 2-D grid.
2. **Likelihood lookup** `Ψ(x; α, β) = γ + (1 - γ - λ)·F(x; α, β)` for every
   (x, α, β).
3. **Per-trial placement:** for each candidate intensity `x`,
   - compute `p_k(x) = Σ_{α,β} prior(α,β) · Ψ_k(x;α,β)` for k ∈ {0,1}
   - compute posterior entropies `H_k(x)`
   - expected entropy `E[H | x] = p_0·H_0 + p_1·H_1`
   - pick `argmin_x E[H | x]`
4. **Update:** `posterior ∝ prior · Ψ_{response}(x*; α, β)`; normalize.

**PsiMarginal** (Niehof, MIT) extends to *nuisance marginalization*: integrate
out lapse λ and report marginal posterior over (α, β). Useful when λ > 0 and
the lapse would otherwise bias the threshold estimate downward.

**When to use over QUEST:** if you need slope (discrimination ability) in
addition to threshold, and you only have ~60 trials to spend. Otherwise
QUEST's marginal-over-threshold is cheaper and lower variance.

---

## 5. ZEST (King-Smith et al. 1994)

ZEST = QUEST with:
- A **Gaussian posterior** (not generic discrete pdf) — stores only mean + SD.
- Next-intensity = **posterior mean** (not quantile).
- Designed for **single-interval Yes/No** with a fixed slope assumption.

Practical upshot: 2-3x cheaper per trial, slightly less robust to
slope misspecification. Used in clinical visual-field perimetry (Humphrey
HFA, Octopus). **We don't need ZEST**; jsQUEST gives the same convergence
with trivial memory cost on modern browsers.

---

## 6. Adaptive rules for cognitive training (non-psychophysics)

### 6.1 The key disanalogy

Staircases and QUEST assume:
- Binary outcome per trial.
- Monotone psychometric function P(correct | intensity) at a fixed slope.
- Stationarity within a block.

N-back, complex span, switching — all violate the *stationarity* assumption
(fatigue, learning within a session) and often use a *block-level* summary
(% correct over N trials) rather than per-trial responses.

### 6.2 Recommended rule for block-level accuracy targets

For **n-back**, Jaeggi 2008 uses: increase `n` if block accuracy ≥ 90%,
decrease if ≤ 75%, else hold. This is effectively a band-pass version of
transformed up-down. To hit an *explicit* target accuracy `p*` with a smooth
rule, use a **discrete Robbins-Monro** update:

```ts
// After each block (or each trial, for per-trial adapting):
// intensity moves by step * (correct - p*), so expected move = 0 at p*
n_next = n + step * (observedAccuracy - pStar)
```

For n-back `n` is integer, so you need either (a) a hysteresis band ±ε or
(b) a continuous difficulty surrogate (e.g. inter-stimulus interval or
lure-trial ratio) adapted with Robbins-Monro, with `n` advancing only when
the surrogate saturates.

**To converge on 79.4%** block accuracy in a per-trial rule: use
3-down/1-up on individual trials *within* a fixed `n`; promote `n` after a
full block at ceiling (e.g. 90%+ for 2 consecutive blocks), demote `n` after
a block at floor (≤ 60%).

### 6.3 Block-based rules vs per-trial staircases

| Approach | Pros | Cons |
|----------|------|------|
| Fixed 20-trial block, bump n on ≥90% | Matches Jaeggi; interpretable | Coarse; 20 trials wasted per level |
| Per-trial 3-down/1-up on n | Fast convergence | n is integer → jitters |
| Continuous surrogate (ISI, lures) + discrete n | Smooth; matches BrainHQ style | More tuning parameters |
| QUEST on a composite difficulty score | Rigorous; reports threshold | Requires a unidimensional scale (often hard to construct) |

---

## 7. Multi-dimensional adaptive (compound EF task)

The Compound Executive Controller adapts ≥5 dimensions: stop-signal delay,
congruency ratio, switch frequency, rule count, response window. Options:

### 7.1 Independent per-dimension staircases
**Pros:** trivial to implement; each dim interpretable.
**Cons:** ignores interactions (a hard rule-count might compensate for easy
switches → user plateau not detectable).

### 7.2 QUEST+ with joint parameters
**Pros:** rigorous posterior over joint difficulty.
**Cons:** grid size = O(∏ dim_i); with 5 dims × 10 levels = 10⁵ cells per
parameter-space point. Memory & entropy computation both become painful.
**Mitigation:** coarsen grid (5 levels per dim) and use sparse representation.

### 7.3 Contextual bandit (Thompson sampling over difficulty arms)
Treat each difficulty configuration as an arm; reward = |observed accuracy −
target|⁻¹ (or a smoother proxy). Thompson sampling over a low-rank Gaussian
Process on the difficulty manifold scales to many dimensions.
**Pros:** handles non-monotone interactions.
**Cons:** needs ≥ 100 trials before the posterior localizes; not
interpretable as a "threshold."

### 7.4 **Recommended for Intellect Forge compound EF:**
Hybrid — **independent staircases per dimension**, each running its own
3-down/1-up, with a **single overall "master" difficulty level** that
advances only when all dimensions' individual staircases have stabilized
(SDs below threshold). This gives us interpretable per-dim adaptation AND a
global progression signal. If we later want sharper adaptation we can
upgrade to QUEST+ on two correlated dims at a time.

---

## 8. Psychometric function fitting (post-hoc)

### 8.1 Math (Palamedes)

Canonical form (four-parameter Weibull/Gumbel/Quick/logistic):
```
Ψ(x; α, β, γ, λ) = γ + (1 - γ - λ) · F(x; α, β)
```

Common `F`:
- **Weibull** (linear x): `F = 1 − exp(−(x/α)^β)`
- **Gumbel / log-Weibull** (log x): `F = 1 − exp(−10^(β(x−α)))` ← **use this**
- **Logistic**: `F = 1 / (1 + exp(−β(x−α)))`
- **Quick**: `F = 1 − (1 − x/α)^β`

At `x = α`: Weibull/Gumbel give F = 1 − 1/e ≈ 0.632; logistic gives 0.5.

### 8.2 MLE fit

Given trials `{(x_i, r_i)}`, log-likelihood:
```
log L = Σ_i [ r_i · log Ψ(x_i) + (1 - r_i) · log(1 - Ψ(x_i)) ]
```
Maximize numerically (Nelder-Mead or BFGS on `(α, β)` with γ, λ fixed).
Grid-initialize to avoid local minima.

### 8.3 JS libraries / gaps

- **No well-known JS psychometric-fit library.** jsQuestPlus gives you the
  posterior-mean fit implicitly after running QUEST+; for standalone offline
  fitting we'd need to port Palamedes' `PAL_PFML_Fit`.
- **Workaround:** use `fmin` (BFGS, npm) or `ml-levenberg-marquardt` and
  hand-write the Weibull likelihood. ~50 lines.
- **Alternative:** call Python Palamedes (or scipy) via a WebAssembly
  pyodide worker for serious offline analysis — overkill for per-user
  adaptation but right for research exports.

---

## 9. Module → algorithm mapping

| Module | Dimensions | Recommended | Why |
|--------|-----------|-------------|-----|
| **Perceptual Speed (UFOV)** | display duration | **QUEST (1-D Weibull)** via jsQUEST | Canonical; ~40 trials for threshold; precise; MIT |
| UFOV subtest 3/4 | duration + eccentricity | **QUEST+ (2-D)** via jsQuestPlus | Joint posterior; BrainHQ-style |
| **Working Memory (n-back)** | integer n + ISI | **Per-trial 3-down/1-up on composite score, block-level promotion of n** | Standard; interpretable; Jaeggi-compatible |
| Working Memory (complex span) | span + processing difficulty | Independent staircases per dim | Interactions are weak |
| **Compound EF** | SSD, cong, switch, rule, RT | Hybrid: independent staircases + global promotion gate | See §7.4 |
| **Relational Reasoning (matrices)** | rule count, rule type, distractor similarity | **IRT-based item selection** (2-PL or 3-PL) after seeding item difficulties from pilot data | Matrices are Raven-style; psychometric tradition is IRT not staircases |
| **Calibration** | contrast, luminance, timing | Direct measurement, not adaptive | Measure once per session |

---

## 10. Concrete code sketches — top 2

### 10.1 `Quest` class (see §2.2 above — ready to paste)

### 10.2 `Staircase` class (n-down/m-up, ready to paste)

```ts
export interface StaircaseConfig {
  startVal: number;
  nDown: number;                      // e.g. 3
  nUp: number;                        // 1
  stepSizes: number[];                // shrinking on reversals, e.g. [4,4,2,2,1,1]
  scale: 'lin' | 'log' | 'db';
  minVal: number; maxVal: number;
  nReversalsToStop?: number;          // default 10
  nTrialsMax?: number;                // safety cap
  dropFirstReversals?: number;        // default 2 for threshold calc
}

export class Staircase {
  intensity: number;
  private dir: -1 | 0 | 1 = 0;
  private cc = 0;                     // correct counter
  private stepIdx = 0;
  private trials = 0;
  readonly reversals: { trial: number; intensity: number }[] = [];
  finished = false;

  constructor(private cfg: StaircaseConfig) { this.intensity = cfg.startVal; }

  addResponse(correct: boolean): void {
    this.trials++;
    this.cc = correct
      ? (this.cc > 0 ? this.cc + 1 : 1)
      : (this.cc < 0 ? this.cc - 1 : -1);

    let newDir: -1 | 0 | 1 = this.dir;
    if (this.cc >=  this.cfg.nDown) { newDir = -1; this.cc = 0; }
    else if (this.cc <= -this.cfg.nUp) { newDir = +1; this.cc = 0; }

    if (this.dir !== 0 && newDir !== 0 && newDir !== this.dir) {
      this.reversals.push({ trial: this.trials, intensity: this.intensity });
      this.stepIdx = Math.min(this.stepIdx + 1, this.cfg.stepSizes.length - 1);
    }
    if (newDir !== 0) this.dir = newDir;

    const step = this.cfg.stepSizes[this.stepIdx] * (newDir === -1 ? -1 : newDir === +1 ? +1 : 0);
    if (step !== 0) this.intensity = this.applyStep(this.intensity, step);
    this.intensity = Math.max(this.cfg.minVal, Math.min(this.cfg.maxVal, this.intensity));

    const stopReversals = this.cfg.nReversalsToStop ?? 10;
    if (this.reversals.length >= stopReversals) this.finished = true;
    if (this.cfg.nTrialsMax && this.trials >= this.cfg.nTrialsMax) this.finished = true;
  }

  threshold(): number {
    const drop = this.cfg.dropFirstReversals ?? 2;
    const kept = this.reversals.slice(drop).map(r => r.intensity);
    return kept.length ? kept.reduce((a, b) => a + b, 0) / kept.length : this.intensity;
  }

  private applyStep(x: number, d: number): number {
    if (this.cfg.scale === 'lin') return x + d;
    if (this.cfg.scale === 'log') return x * Math.pow(10, d);
    return x * Math.pow(10, d / 20);
  }
}
```

---

## 11. Gaps requiring a port

| Feature | Status | Needed work |
|---------|--------|-------------|
| **QUEST** (1-D) | ✅ jsQUEST (MIT) usable as-is | Wrap in TS interface |
| **QUEST+** (n-D) | ✅ jsQuestPlus (MIT) usable as-is | Wrap in TS interface |
| **Transformed staircase** | ⚠️ PsychoPy is GPL; must write our own | §10.2 above; ~80 LOC |
| **Psi / PsiMarginal** | ⚠️ Python MIT; no JS port | Port ~200 LOC to TS if we want slope estimation. Or use QUEST+ instead (equivalent math). |
| **Psychometric-function MLE fitting** | ❌ No JS lib | Port Palamedes `PAL_PFML_Fit` (~150 LOC) or call scipy via pyodide |
| **IRT (2-PL / 3-PL) for matrices** | ⚠️ `jIRT` exists but thin; `mirt` (R) is gold standard | Either port or use R offline for item calibration then ship static item difficulties |
| **Bootstrap CIs on fitted parameters** | ❌ No JS | ~40 LOC; wrap around MLE fit |

---

## 12. References (beyond round-1 dossier)

- Watson, A. B., & Pelli, D. G. (1983). QUEST. *Perception & Psychophysics* 33:113–120.
- Watson, A. B. (2017). QUEST+: A general multidimensional Bayesian adaptive psychometric method. *Journal of Vision* 17(3):10.
- Kontsevich, L. L., & Tyler, C. W. (1999). Bayesian adaptive estimation of psychometric slope and threshold. *Vision Research* 39:2729–2737.
- King-Smith, P. E., et al. (1994). Efficient and unbiased modifications of the QUEST threshold method: theory, simulations, experimental evaluation and practical implementation. *Vision Research* 34:885–912.
- Levitt, H. (1971). Transformed up-down methods in psychoacoustics. *JASA* 49:467–477.
- García-Pérez, M. A. (1998). Forced-choice staircases with fixed step sizes: asymptotic and small-sample properties. *Vision Research* 38:1861–1881.
- Kuroki, D., & Pronk, T. (2022). jsQuestPlus: A JavaScript implementation of the QUEST+ method. *Behavior Research Methods*.
- Kingdom, F. A. A., & Prins, N. (2016). *Psychophysics: A Practical Introduction* (2nd ed.) — Palamedes companion text.
