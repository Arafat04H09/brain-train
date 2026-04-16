# 04 — Relational Reasoning Lab: Matrix Puzzles and the Four Operations

Research dossier for the Intellect Forge Relational Reasoning track. Targets abstract relational encoding, analogical reasoning, and pattern extraction. Neural substrate: rostrolateral PFC and frontoparietal network (per README).

---

## 1. Raven's Progressive Matrices: The Science

### 1.1 The RPM family

- **Standard Progressive Matrices (SPM)** — 60 items, five sets (A–E) of 12, 3x3 black-line figures (Sets C, D, E), increasing difficulty. General population 6+.
- **Advanced Progressive Matrices (APM)** — Sets I (12 items) and II (36 items). Exclusively 3x3 matrices; higher ceiling; used for university-age and gifted populations.
- **Coloured Progressive Matrices (CPM)** — 36 items in sets A, Ab, B; coloured backgrounds; for children 5–11 and older adults.

All three are copyrighted by Pearson/J C Raven Ltd., which is why the research community builds open clones (see Sandia, MaRs-IB, RAVEN, PGM).

### 1.2 Carpenter, Just & Shell (1990) — the foundational rule taxonomy

From "What one intelligence test measures: A theoretical account of the processing in the Raven Progressive Matrices Test" (*Psychological Review*). Via eye-tracking, verbal protocol, and error analysis of APM items, Carpenter et al. argued that only **five rule types** suffice to describe nearly all RPM items, roughly ordered from easy to hard:

1. **Constant in a row (CR)** — same value repeats in each cell of the row (applied per attribute).
2. **Quantitative pairwise progression (PP)** — an attribute increases/decreases by a fixed quantity (+1/+2, larger/smaller).
3. **Figure addition or subtraction (A/S)** — third cell is the union or set-difference of the first two (XOR/OR/AND/NOT in effect).
4. **Distribution of three values (D3)** — three distinct values of an attribute appear once each in every row and column (Latin-square property).
5. **Distribution of two values (D2)** — two distinct values and one "null"; the hardest pattern, because the null feels like a missing operation rather than a value.

Their simulation (FAIRAVEN/BETTERAVEN) showed that working memory capacity — specifically how many rule-goals a solver can maintain — predicts APM performance. This is the cognitive basis for scaling difficulty by *number of simultaneous rules*, not surface complexity.

### 1.3 Construction principles (derived from Carpenter + Embretson)

- Rules apply to **attributes** (shape, size, colour/shade, number, orientation, line type) independently.
- Difficulty ∝ (number of rules) × (abstractness of rules: CR < PP < A/S < D3 < D2) × (distractor quality).
- Good items have **rules on both rows AND columns** in APM-style items; simpler SPM items often use rows-only.

---

## 2. Procedural Generation Approaches

### 2.1 Sandia Matrices — Matzen et al. (2010)

"Recreating Raven's: Software for systematically generating large numbers of Raven-like matrix problems with normed properties" (*Behavior Research Methods*).

- **Purpose:** build a free, research-usable Raven clone.
- **Two item types:** *Object Relations* (OR-1, OR-2, OR-3) and *Logic* items.
- **Method:** analyze relation types in SPM, combine them with experimenter-chosen parameters. Output is a normed pool with known difficulty.
- **Validity:** r = .69 with SPM accuracy. Strong enough to substitute SPM for most research uses.
- **Psychometric review:** Harrison et al. (2020) — *Measuring Intelligence with the Sandia Matrices* — offers updated IRT parameters and recommended item subsets.
- **Availability:** items are published as image files in the paper supplements and distributed through PsyToolkit and other academic channels. Not a generator library you `pip install`; closer to a fixed item bank with documented construction rules.

### 2.2 RAVEN — Zhang et al. (2019, CVPR)

*RAVEN: A Dataset for Relational and Analogical Visual rEasoNing.* UCLA/Tsinghua. 70,000 RPM problems, 1.12M images.

Repo: https://github.com/WellyZhang/RAVEN

**Representation.** Each matrix is a parse tree from an Attributed Stochastic Image Grammar (A-SIG). The grammar yields 7 spatial configurations:

1. `Center` — one shape in the middle of each cell.
2. `2x2Grid` — four sub-cells per cell.
3. `3x3Grid` — nine sub-cells per cell.
4. `Left-Right` — two shapes side by side.
5. `Up-Down` — two shapes stacked.
6. `Out-InCenter` — an outer shape containing a smaller one.
7. `Out-InGrid` — an outer shape containing a 2x2 grid.

**Attributes (per component):** Number, Position, Type (shape), Size, Color.

**Rules (per attribute):** `Constant`, `Progression` (±1 or ±2), `Arithmetic` (+/−, i.e. set add/subtract), `Distribute Three` (D3 from Carpenter). Note RAVEN *does not* implement D2. Arithmetic is disallowed for shape. Average ~6.29 rules per problem.

**How generation works:**
1. Sample a configuration → parse tree.
2. For each attribute, sample a rule from the allowed set.
3. Prune the grammar to ensure the rule can be applied validly.
4. Sample a first-row instantiation, apply rules to produce rows 2 and 3.
5. Generate 7 distractors via systematic attribute perturbations.

**Known flaw:** the 7 distractors in the original RAVEN share attributes with the answer such that the *answer can often be inferred from the candidates alone* (short-cut bias).

### 2.3 I-RAVEN and RAVEN-FAIR — fixing the candidate bias

- **I-RAVEN** (Hu et al. AAAI 2021, *Stratified Rule-Aware Network for Abstract Visual Reasoning*): constructs distractors by a tree-based attribute bisection strategy so that the correct panel is no longer inferable from candidates alone. Repo: https://github.com/husheng12345/SRAN (and mirror https://github.com/cwhy/i-raven).
- **RAVEN-FAIR / Balanced-RAVEN** (Benny et al. CVPR 2021, *Scale-Localized Abstract Reasoning*): an alternative rebalancing. Repo: https://github.com/yanivbenny/RAVEN_FAIR.

For human-facing training items we care less about the short-cut (humans can't exploit it at speed), but the I-RAVEN distractor-generation *method* is still the best template because it systematically produces "correct on 1 rule, wrong on another" foils — exactly what the Forge spec calls for.

### 2.4 PGM — Barrett, Hill, Santoro et al. (2018, ICML)

*Measuring Abstract Reasoning in Neural Networks.* DeepMind. 1.42M items.

Repo: https://github.com/google-deepmind/abstract-reasoning-matrices
Data bucket: `gs://ravens-matrices`
TFDS: https://www.tensorflow.org/datasets/catalog/abstract_reasoning

**Structure.** Each problem is a 3x3 context matrix + 8 candidate panels. Critically, items carry structured metadata: `(relation_type, object_type, attribute_type)` triples.

- **Relation types (the rule set):** `progression`, `XOR`, `OR`, `AND`, `consistent_union` (≈ D3).
- **Object types:** `shape`, `line`.
- **Attribute types:** `size`, `type`, `color`, `position`, `number`.

**Generalization splits.** The landmark contribution is 8 train/test regimes designed to probe generalization: `neutral`, `interpolation`, `extrapolation`, `held-out Attribute-Pair`, `held-out Triple-Pairs`, `held-out Triples`, `held-out line-type`, `held-out shape-color`. For a human product these splits are less interesting — but the *schema* (triples of relation × object × attribute) is a very clean data model.

### 2.5 Minor open generators

- **raven-gen** (pip-installable) — https://github.com/shlomenu/raven-gen — light Python API. `Matrix.make(MatrixType.CENTER_SINGLE)`, customizable `Ruleset(size_rules=[RuleType.CONSTANT, RuleType.PROGRESSION])`. Renders PNG. Good reference for a minimal generator.
- **pyRavenMatrices** — https://github.com/cmekik/pyRavenMatrices — representation + generation library, academic-style.
- **A-I-RAVEN / I-RAVEN-Mesh** (2024) — https://arxiv.org/abs/2406.11061 — adds analogical transfer across configurations and a mesh-based variant.

### 2.6 Comparison

| Generator | Rule set | Configs | Language | Images | Distractors | Notes |
|---|---|---|---|---|---|---|
| Sandia | OR, Logic subtypes | ~2 | fixed bank | PNG | fixed | Normed, free, 144 items |
| RAVEN | Const, Prog, Arith, D3 | 7 | Python | PNG | 7 shared-attr | Has candidate bias |
| I-RAVEN | same | 7 | Python | PNG | tree-bisection | Bias-fixed |
| PGM | Prog, XOR, OR, AND, D3 | shape+line only | Python | PNG | 8 | Cleanest schema |
| raven-gen | CONSTANT, PROGRESSION, ARITHMETIC, DISTRIBUTE_THREE | 7 | Python (pip) | PNG | configurable | Smallest footprint |
| MaRs-IB | (human-authored) | — | items pre-rendered | PNG | 4 foils/item | 80 items, IRT-calibrated, Gorilla-hosted |

---

## 3. The Four Operations — Is the Taxonomy Real?

**Yes — but it's not from Alexander 2016 in the way the README suggests, and the pairing with matrix puzzles is largely a product choice, not a validated task format.**

### 3.1 Provenance

The four-form taxonomy (analogy, anomaly, antinomy, antithesis) is Patricia A. Alexander's. It is operationalized in the **Test of Relational Reasoning (TORR)**:

- Alexander (2012, unpublished) designed the instrument.
- **Alexander et al. (2016)**, *Frontiers in Psychology* / *Thinking Skills and Creativity* — "Calibration of the Test of Relational Reasoning." PubMed: https://pubmed.ncbi.nlm.nih.gov/26765927/
- Bifactor re-analysis: Dumas & Alexander (2020), *Frontiers in Psychology*. https://pmc.ncbi.nlm.nih.gov/articles/PMC7492651/

**Definitions (from TORR papers):**

| Form | Relation | Cognitive operation |
|---|---|---|
| **Analogy** | Similarity (A:B :: C:D) | Map higher-order pattern from source to target |
| **Anomaly** | Discrepancy / deviation | Detect an item that breaks an established trend |
| **Antinomy** | Incompatibility / mutual exclusivity (categorical) | Identify which items cannot co-occur in a class |
| **Antithesis** | Polarity / opposition (continuous) | Reverse a salient relation to form an oppositional pair |

The antinomy/antithesis distinction is subtle: *antinomy* is binary (in-category vs. out-of-category), *antithesis* is graded (hot↔cold, tall↔short).

### 3.2 The TORR task formats

TORR has **32 non-verbal items, four 8-item scales, one per form — all using abstract geometric stimuli**, not the four-operations-on-matrices mapping the README hints at. Formats:

- **Analogy subscale** — classic A:B::C:? with geometric figures.
- **Anomaly subscale** — four figures that share a relation, plus one that violates it; pick the outlier.
- **Antinomy subscale** — sets of figures; the solver identifies which figure *cannot* belong to the same category as the others based on a binary feature.
- **Antithesis subscale** — given a transformation pair (figure → transformed figure), pick the figure that represents the *reverse* transformation.

TORR correlates significantly with SAT, GPA, working memory, fluid-g, and critical thinking. Individual forms dissociate: analogical and antithetical uniquely predict mathematical problem solving (Dumas et al.).

### 3.3 Implication for Intellect Forge

The taxonomy is **real and psychometrically supported**, but the operationalization is lean — 8 items per form, copyright-friendly only because TORR is academic. What the Forge can do:

- **Analogical** — 3x3 matrix completion (the well-trodden Raven path). Also verbal A:B::C:D.
- **Anomalous** — 5-panel odd-one-out where four share a rule and one deviates. Procedurally: generate a rule-consistent set of 4 panels, then mutate one panel by breaking exactly one rule. This is how Sandia constructs its distractors; reuse the generator.
- **Antithetical** — inverse-pair task. Generate a transformation pair (e.g., rotation +90°, size +1, color invert), present source→target, ask solver to pick the figure that undoes the transformation. No off-the-shelf generator; easy to build on top of RAVEN primitives.
- **Antinomous** — categorical exclusion. Hardest to procedurally generate with abstract shapes; TORR uses hand-crafted items. Viable alternative: a semantic-category task ("which word does not belong to the category X") or a 2-constraint set task ("find the figure that is BOTH red AND circular; all others violate at least one constraint"). The "paradox resolution" framing in the README is looser than the TORR definition and may drift toward a *different* construct (e.g., cognitive dissonance tasks), so be careful.

**Verdict:** ship analogical and anomalous with strong grounding; ship antithetical as a reasonable extension; treat antinomous as experimental and flag the construct mapping explicitly.

---

## 4. Verbal Analogies Datasets

For human training these are more useful as *supplementary* items (domain transfer) than as the core lab.

- **Turney SAT analogies** — 374 items, real SAT prep. Not openly downloadable; email Turney for access. https://arxiv.org/abs/cs/0508103
- **BATS (Bigger Analogy Test Set)** — 98,000 questions, 40 relations × 4 types (inflectional, derivational, lexicographic, encyclopedic), 50 pairs per category. http://vecto.space/projects/BATS/ — suited for embedding evaluation but items are short pairs usable for human tasks.
- **Google analogy test (Mikolov 2013)** — 19,544 items, 14 relations. Biased (56% country:capital) and designed for word2vec, but legal and trivially parseable.
- **relbert/analogy_questions** on HuggingFace — consolidated dump of SAT, BATS, Google, U2/U4, and SCAN analogy sets. https://huggingface.co/datasets/relbert/analogy_questions
- **Inventory of verbal analogy test materials** — Ichien, Liu, Stamenković, Holyoak, Lu (2020), *Behavior Research Methods*. Useful catalog of human-facing analogy item banks.

---

## 5. Odd-One-Out Paradigms

- **THINGS odd-one-out** — 4.7M human triplet judgments over 1,854 concepts. https://things-initiative.org/ and https://plus.figshare.com/articles/dataset/20552784. Primarily for object-concept embedding, but the triplet task format (pick 1 of 3) is directly reusable.
- **Relational match-to-sample / relational odd-one-out** in the animal-cognition literature (Premack; Thompson & Oden; Fagot) — the paradigm where the odd item differs by *relation between features* (same-pair vs. different-pair) rather than surface. This is the purest test of relational encoding. Easy to synthesize: three triads of two shapes; two triads are "same-same" and one is "same-different" — or vice versa.
- *The odd one out task: Toward an intelligence test for robots* — Lovett & Forbus type work; describes computational construction principles.

For Intellect Forge the animal-cognition-style relational OOO is probably the best anomalous-reasoning template: it forces abstraction over surface features, which is explicitly the training goal.

---

## 6. Difficulty Calibration

### 6.1 Predictors of matrix item difficulty (empirically established)

From Embretson (1998, *Psychological Assessment*) and Primi (2001, *Intelligence*) analyses:

1. **Number of rules applied simultaneously** — strongest single predictor. Each added rule roughly +0.5 to +1.0 logit of difficulty.
2. **Rule abstractness** (Carpenter order) — D2 > D3 > A/S > PP > CR.
3. **Number of elements per cell** — more sub-objects → more binding load.
4. **Perceptual organization** — overlap, occlusion, line-vs-shape mixing.
5. **Distractor similarity to the key** — foils that satisfy N−1 of N rules are hardest.
6. **Working memory load** — number of transformations to be maintained in parallel.

### 6.2 Embretson's Cognitive Design System (CDS)

Embretson (1998) generated matrix items whose difficulty was predictable *from the construction parameters alone* using a Linear Logistic Test Model (LLTM). Parameters: number of rules, rule types, object count, distraction level. The result: an automatically generated item bank with **a priori known IRT parameters**, good enough to skip separate calibration.

This is the gold-standard approach for a training app: generate with parameters P, predict difficulty from P, adjust P to target the user's theta.

### 6.3 IRT for calibration

- **MaRs-IB IRT paper** (Yeung et al., 2023, *Behavior Research Methods*) fits a 2-parameter logistic to all 80 MaRs-IB items and reports per-item a, b, c parameters. https://pmc.ncbi.nlm.nih.gov/articles/PMC10551052/
- **R packages:** `mirt`, `ltm`, `TAM`.
- **Python:** `py-irt` (https://github.com/nd-ball/py-irt), `girth`.
- **TypeScript/JS:** nothing mature. For live adaptive difficulty use a simple 1PL/Elo update on theta (BKT-lite) rather than offline IRT.

---

## 7. Open-Source Implementations (URLs)

### Procedural matrix generators
- RAVEN: https://github.com/WellyZhang/RAVEN
- I-RAVEN (SRAN): https://github.com/husheng12345/SRAN
- RAVEN-FAIR: https://github.com/yanivbenny/RAVEN_FAIR
- PGM (data + schema): https://github.com/google-deepmind/abstract-reasoning-matrices
- raven-gen (pip): https://github.com/shlomenu/raven-gen — `pip install raven-gen`
- pyRavenMatrices: https://github.com/cmekik/pyRavenMatrices

### Human-facing item banks (free/open)
- Sandia Matrices paper: https://link.springer.com/article/10.3758/BRM.42.2.525
- MaRs-IB: https://royalsocietypublishing.org/doi/10.1098/rsos.190232 — open materials on OSF: https://osf.io/ and Gorilla: https://app.gorilla.sc/openmaterials/36164
- Bilker et al. short-form Raven (9 items, public): https://pubmed.ncbi.nlm.nih.gov/23148026/

### Browser / experiment frameworks
- jsPsych matrix-reasoning demos (Niv Lab, includes Bilker Forms A/B): https://nivlab.github.io/jspsych-demos/
- jsPsych MaRs-IB port (Chierchia 2019 replica): same repo.
- jsPsych plugin development: https://www.jspsych.org/v8/developers/plugin-development/
- Millisecond Inquisit open matrix-reasoning library: https://www.millisecond.com/library/matrixreasoning

### IRT / calibration
- `mirt` (R): https://cran.r-project.org/package=mirt
- `py-irt`: https://github.com/nd-ball/py-irt
- `girth`: https://github.com/eribean/girth

### Verbal analogies
- HuggingFace relbert/analogy_questions: https://huggingface.co/datasets/relbert/analogy_questions
- BATS: http://vecto.space/projects/BATS/
- awmacpherson/BATS loader: https://github.com/awmacpherson/BATS

### Odd-one-out data
- THINGS-data: https://plus.figshare.com/articles/dataset/20552784

---

## 8. Recommended MVP: Simplest Procedural Generator That Could Work

### 8.1 Design principles

- **TypeScript/React**, render shapes as **SVG** (crisp at any resolution, trivial to diff for unit tests, easy to animate).
- **No external image pipeline** — every cell is an SVG `<g>` composed from primitives.
- **Schema follows PGM** — triple of `(rule, object, attribute)`, which is the cleanest academic reference design.
- **Rule set follows Carpenter** — start with CR, PP, D3, A/S. Skip D2 for MVP (low payoff, high difficulty).
- **Configurations follow RAVEN** — ship `Center`, `2x2Grid`, `3x3Grid`, `Out-InCenter` in v1; skip the rest.

### 8.2 Core data model (sketch)

```ts
type Shape = 'triangle' | 'square' | 'pentagon' | 'hexagon' | 'circle';
type Color = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7; // 8 shades / hues
type Size  = 0 | 1 | 2 | 3 | 4 | 5;          // 6 discrete sizes
type Angle = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;

interface CellObject {
  shape: Shape; color: Color; size: Size; angle: Angle;
}
interface Cell { objects: CellObject[]; layout: Layout; }

type Attribute = 'shape' | 'color' | 'size' | 'angle' | 'number' | 'position';
type Rule =
  | { kind: 'constant' }
  | { kind: 'progression'; step: -2 | -1 | 1 | 2 }
  | { kind: 'arithmetic'; op: '+' | '-' }          // set add/sub for position/number
  | { kind: 'distributeThree'; values: [V, V, V] };

interface Problem {
  config: Layout;
  rules: Map<Attribute, Rule>;
  context: Cell[];      // 8 cells (row-major, missing cell 9)
  candidates: Cell[];   // 8: 1 correct + 7 foils
  answerIndex: number;
}
```

### 8.3 Generation algorithm (≈ 150 LOC)

1. **Sample config** (weighted by difficulty): `Center` (easy) → `Out-InCenter` (hard).
2. **Sample rules** — for the target difficulty `d`, pick `k = ceil(d * 4)` attributes and assign each a rule; bias harder rules (D3, A/S) at higher `d`.
3. **Sample first row** — a random fully-specified cell consistent with the attribute domains.
4. **Apply rules per attribute** to generate cells 2 and 3 of row 1; re-sample rows 2 and 3 with the same rules but different starting values (enforce D3 consistency column-wise where required).
5. **Produce the answer cell** by applying the rules to row 3.
6. **Build 7 foils** using I-RAVEN-style bisection: each foil mutates exactly one attribute of the answer to violate exactly one rule (one foil per rule ⊕ distractor slots filled with two-rule violations).
7. **Render** each cell via React components; every primitive shape is a hand-written SVG path.

### 8.4 Adaptive difficulty loop

- Maintain per-user theta per operation (analogical, anomalous, antithetical, antinomous).
- On each trial, generate a problem with predicted difficulty `b ≈ theta + 0.3` (slightly challenging).
- Predict `b` from construction parameters with a simple LLTM: `b = β₀ + β₁·k + β₂·complexity + β₃·configHardness + β₄·objectCount`. Calibrate β from a pilot of ~500 human trials; until then, use hand-tuned values and update via Elo on accuracy × RT.

### 8.5 Four operations mapping

| Operation | MVP task format |
|---|---|
| Analogical | 3x3 matrix completion (main path, 60% of items) |
| Anomalous | 5-panel odd-one-out: reuse 4 rule-consistent cells + 1 cell with exactly one rule broken |
| Antithetical | Pair-inverse: show `(A → A')` where A' is A transformed by rule R; show C; candidates are C transformed by R⁻¹ and 3 decoys |
| Antinomous | Binary categorization with a hidden rule: present a set of 8 figures, 4 satisfy constraint, 4 do not; ask which candidate belongs to the same category as a query figure |

All four can share the **same primitive renderer and attribute system**; only the item-template logic changes. This is the single biggest leverage point — build the SVG primitive/attribute engine once.

### 8.6 What to steal from raven-gen

Start by reading `raven-gen` in Python to understand the `Matrix` / `MatrixType` / `Ruleset` separation, then re-implement in TS. It is the smallest readable generator and its rule/matrix split maps directly onto the sketch above. Then layer I-RAVEN's distractor-bisection on top.

---

## 9. Key Citations

- **Carpenter, P. A., Just, M. A., & Shell, P. (1990).** What one intelligence test measures: A theoretical account of the processing in the Raven Progressive Matrices Test. *Psychological Review*, 97(3), 404–431.
- **Embretson, S. E. (1998).** A cognitive design system approach to generating valid tests: Application to abstract reasoning. *Psychological Methods*, 3(3), 380–396.
- **Matzen, L. E., Benz, Z. O., Dixon, K. R., Posey, J., Kroger, J. K., & Speed, A. E. (2010).** Recreating Raven's: Software for systematically generating large numbers of Raven-like matrix problems with normed properties. *Behavior Research Methods*, 42(2), 525–541.
- **Zhang, C., Gao, F., Jia, B., Zhu, Y., & Zhu, S.-C. (2019).** RAVEN: A Dataset for Relational and Analogical Visual rEasoNing. *CVPR 2019*. arXiv:1903.02741.
- **Barrett, D. G. T., Hill, F., Santoro, A., Morcos, A., & Lillicrap, T. (2018).** Measuring abstract reasoning in neural networks. *ICML 2018*. arXiv:1807.04225.
- **Hu, S., Ma, Y., Liu, X., Wei, Y., & Bai, S. (2021).** Stratified Rule-Aware Network for Abstract Visual Reasoning. *AAAI 2021* (I-RAVEN).
- **Benny, Y., Pekar, N., & Wolf, L. (2021).** Scale-Localized Abstract Reasoning. *CVPR 2021* (RAVEN-FAIR).
- **Alexander, P. A., & the Disciplined Reading and Learning Research Laboratory (2016).** Relational reasoning in STEM domains: A foundation for academic development. *Educational Psychology Review*, 28, 1–7.
- **Alexander, P. A. et al. (2016).** Calibration of the Test of Relational Reasoning. *Frontiers in Psychology*.
- **Dumas, D., & Alexander, P. A. (2020).** Calibrating the Test of Relational Reasoning: New information from oblique bifactor models. *Frontiers in Psychology*, 11:2129.
- **Chierchia, G., Fuhrmann, D., Knoll, L. J., Pi-Sunyer, B. P., Sakhardande, A. L., & Blakemore, S.-J. (2019).** The matrix reasoning item bank (MaRs-IB): novel, open-access abstract reasoning items for adolescents and adults. *Royal Society Open Science*, 6(10):190232.
- **Yeung, S. K., Chierchia, G., et al. (2023).** An item response theory analysis of the matrix reasoning item bank (MaRs-IB). *Behavior Research Methods*.
- **Harrison, T. L., Shipstead, Z., & Engle, R. W. (2020).** Measuring Intelligence with the Sandia Matrices: Psychometric Review and Recommendations for Free Raven-Like Item Sets. *Personnel Assessment and Decisions*, 6(3).
- **Turney, P. D., & Littman, M. L. (2005).** Corpus-based learning of analogies and semantic relations. *Machine Learning*, 60, 251–278.
- **Gentner, D., & Holyoak, K. J. (1997).** Reasoning and learning by analogy. *American Psychologist*, 52(1), 32–34.
- **Lovett, A., & Forbus, K. (2017).** Modeling visual problem solving as analogical reasoning. *Psychological Review*, 124(1), 60–90.
