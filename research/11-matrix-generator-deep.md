# 11 — Matrix Generator Deep Dive (Raven's Progressive Matrices, Round 2)

Source-level analysis of open-source RPM generators and a concrete TypeScript port plan for Intellect Forge.

Primary sources read (verbatim source, not READMEs):
- **raven-gen** `src/raven_gen/{attribute,rule,matrix,panel,component,entity}.py` — a clean, pip-installable rewrite of Zhang et al. 2019
- **Original RAVEN** `src/dataset/{main,rendering,build_tree,sampling,const,Rule,Attribute,AoT}.py` (Zhang et al. 2019, CVPR)
- **I-RAVEN** `I-RAVEN/main.py` (Hu et al. 2021) — same generator as RAVEN but replaces the `separate()` distractor loop
- **PGM** (DeepMind, Barrett et al. 2018) — README-level; code is proprietary-ish, dataset is distributed as .npz

## 1 — Rule taxonomy, in actual code

raven-gen cleanly implements Carpenter/Just/Shell 1990's rule taxonomy via a `RuleType` enum of **four rules**, which is the canonical set both RAVEN and I-RAVEN use:

```python
class RuleType(Enum):
    CONSTANT = auto()
    PROGRESSION = auto()
    ARITHMETIC = auto()
    DISTRIBUTE_THREE = auto()
```

These map to Carpenter's taxonomy as follows:

| Carpenter rule | raven-gen / RAVEN rule | Semantics |
|---|---|---|
| Constant in a row (CR) | CONSTANT | attr(cell) = attr(row) for all cells |
| Pairwise progression (PP) | PROGRESSION, value ∈ {-2,-1,+1,+2} | attr[i+1] = attr[i] + value |
| Figure addition / subtraction | ARITHMETIC, value ∈ {+1,-1} | attr[col2] = attr[col0] ± attr[col1] |
| Distribution of three (D3) | DISTRIBUTE_THREE | three values permuted cyclically across rows |
| Distribution of two (D2) | *(absent in RAVEN; encoded in PGM as XOR/OR/AND)* | |

Carpenter's D2 is not modelled in the RAVEN family. PGM is the one that adds logical D2 rules (XOR, OR, AND, "consistent union"). For our initial port I recommend the four-rule set — matches every public generator, enough variety for calibrated difficulty, and is far simpler.

### CONSTANT — verbatim
```python
elif rule.name is RuleType.CONSTANT:
    next_comp = copy.deepcopy(next_comp)
    if rule.attr is AttributeType.CONFIGURATION:
        next_comp.sample(carryover=False)
    else:
        if rule.prev_is_col_0 and not prev_comp.uniformity.value:
            prev_comp.make_uniform(rule.attr)
        next_comp.set_uniform(rule.attr, prev_comp.setting_of(rule.attr))
```
Copies the attribute value from the previous cell. The `prev_is_col_0` flag flips on each call so the rule does the right thing from cell 1→2 and 2→3.

### PROGRESSION — verbatim
```python
elif rule.name is RuleType.PROGRESSION:
    next_comp = copy.deepcopy(next_comp)
    if rule.attr is AttributeType.NUMBER:
        next_comp.config.number.setting += rule.value          # integer index
        next_comp.sample(sample_position=True, carryover=False)
    elif rule.attr is AttributeType.POSITION:
        next_comp.config.position.setting = (
            next_comp.config.position.setting + rule.value
        ) % next_comp.config.position.values.shape[0]          # modular
    else:
        next_comp.set_uniform(rule.attr,
                              prev_comp.setting_of(rule.attr) + rule.value)
```
Note that attributes live in **index space**, not value space (e.g. SIZE_VALUES has indices 0-5, each mapping to 0.4..0.9). Progression adds to the index.

### ARITHMETIC — verbatim (the novel part — asymmetric constraints on col 1)
```python
def set_constraints_col_1(self, prev_comp, next_comp):
    ...
    if self.value > 0:   # addition
        next_constraint.max = prev_constraint.max - (
            self.col_0_setting - prev_constraint.min)
    else:                # subtraction
        next_constraint.min = (next_constraint.min - offset) // 2
        if self.attr is AttributeType.COLOR:
            next_constraint.max = self.col_0_setting
        else:
            next_constraint.max = self.col_0_setting - min_prepruning - 1

def col_2_setting(self, col_1_setting):
    col_0_setting = self.pop()
    if self.value > 0:
        return col_0_setting + (col_1_setting + offset)
    else:
        return col_0_setting - (col_1_setting + offset)
```
For POSITION it's **set union / difference** rather than integer add:
```python
if self.value > 0: return list(set(col_0_setting) | set(col_1_setting))
else:              return list(set(col_0_setting) - set(col_1_setting))
```
This is Carpenter's "figure addition" — literally union two position sets.

### DISTRIBUTE_THREE — verbatim
```python
def create_settings(self, three_settings):
    self.settings.append(three_settings[[0, 1, 2]])          # row 0
    if np.random.uniform() >= 0.5:
        self.settings.append(three_settings[[1, 2, 0]])      # row 1 rotate left
        self.settings.append(three_settings[[2, 0, 1]])      # row 2
    else:
        self.settings.append(three_settings[[2, 0, 1]])
        self.settings.append(three_settings[[1, 2, 0]])
```
Three values are permuted across three rows. Each row has all three values, but in a different order.

## 2 — Attribute space (verbatim from `raven_gen/attribute.py`)

```python
NUM_VALUES   = (1, 2, 3, 4, 5, 6, 7, 8, 9)
SIZE_VALUES  = (0.4, 0.5, 0.6, 0.7, 0.8, 0.9)
COLOR_VALUES = (255, 224, 196, 168, 140, 112, 84, 56, 28, 0)   # grayscale (white→black)
ANGLE_VALUES = (-135, -90, -45, 0, 45, 90, 135, 180)           # degrees
UNI_VALUES   = (False, False, False, True)                     # 1/4 chance uniform

class Shapes(Enum):
    NONE = auto(); TRIANGLE = auto(); SQUARE = auto()
    PENTAGON = auto(); HEXAGON = auto(); CIRCLE = auto()

class AttributeType(Enum):
    NUMBER = auto(); SHAPE = auto(); SIZE = auto(); COLOR = auto()
    ANGLE = auto(); UNIFORMITY = auto(); POSITION = auto(); CONFIGURATION = auto()
```

| Attribute | Domain | Cardinality | Notes |
|---|---|---|---|
| NUMBER | 1..9 | 9 | how many shapes |
| SHAPE | triangle, square, pentagon, hexagon, circle | 5 | |
| SIZE | 0.4..0.9 (fraction of cell) | 6 | |
| COLOR | 10 grayscale levels | 10 | 255 = white, 0 = black |
| ANGLE | 8 rotations | 8 | Only used when shapes are asymmetric |
| POSITION | subset of grid slots | binomial | "which cells contain a shape" |
| UNIFORMITY | bool | 2 | do all shapes share a value, or vary independently |
| CONFIGURATION | layout-specific | — | determined by MatrixType |

## 3 — Grid composition (figure configurations)

raven-gen enumerates **eight `MatrixType`s** (RAVEN had 7, raven-gen added FOUR_SHAPE_IN_SHAPE):

```python
class MatrixType(Enum):
    ONE_SHAPE = auto()                      # single centered shape
    FOUR_SHAPE = auto()                     # 2×2 grid
    FIVE_SHAPE = auto()                     # quincunx (+ pattern)
    NINE_SHAPE = auto()                     # 3×3 grid
    TWO_SHAPE_VERTICAL_SEP = auto()         # left + right
    TWO_SHAPE_HORIZONTAL_SEP = auto()       # top + bottom
    SHAPE_IN_SHAPE = auto()                 # outer + inner
    FOUR_SHAPE_IN_SHAPE = auto()            # outer + inner 2×2
```

Original RAVEN builds these with functions like `build_center_single()`, `build_distribute_four()`, `build_in_center_single_out_center_single()`. Each matrix is not one grid of atomic shapes — it's **a grid of Panels, each Panel containing 1–2 Components, each Component containing 1–N Entities (shapes)**. That compositional structure is the whole point: you can have rules operating on the inner component and a different rule on the outer component independently.

Hierarchy: `Matrix → Panel[9] → Component[1..2] → Entity[N]`.

PGM uses 7 "figure configurations" that are somewhat different: shapes-only, lines-only, shapes-in-outer-shape, etc., and introduces line primitives (diagonal/horizontal/vertical bars). For our port the raven-gen eight is cleaner and more visually consistent.

## 4 — Rule application logic (three-row scaffold)

From RAVEN `main.py` and mirrored in raven-gen's `make_ground_truth`:

```python
start_node = new_root.sample()
row_1_1 = copy.deepcopy(start_node)
for l in range(len(rule_groups)):
    rule_group = rule_groups[l]
    rule_num_pos = rule_group[0]                             # NUMBER/POSITION rule
    row_1_2 = rule_num_pos.apply_rule(row_1_1)
    row_1_3 = rule_num_pos.apply_rule(row_1_2)
    for i in range(1, len(rule_group)):                      # other-attr rules
        rule = rule_group[i]
        row_1_2 = rule.apply_rule(row_1_1, row_1_2)
    for i in range(1, len(rule_group)):
        rule = rule_group[i]
        row_1_3 = rule.apply_rule(row_1_2, row_1_3)
    ...merge components...
# repeat for row 2, row 3 with resample(True)
```

Key insight: **NUMBER/POSITION rules run first** because they change the structure (how many shapes / where). Other attribute rules (COLOR, SIZE, SHAPE, ANGLE) then apply on the already-positioned shapes. Rows 2 and 3 are independent re-samples of the *same* rules, which is how D3 gets three distinct rows sharing a pattern.

## 5 — Distractor generation (the critical difference)

### Original RAVEN (Zhang 2019) — **biased**
```python
modifiable_attr = sample_attr_avail(rule_groups, row_3_3)
answer_AoT = copy.deepcopy(row_3_3)
candidates = [answer_AoT]
for j in range(7):
    component_idx, attr_name, min_level, max_level = sample_attr(modifiable_attr)
    answer_j = copy.deepcopy(answer_AoT)
    answer_j.sample_new(component_idx, attr_name, min_level, max_level, answer_AoT)
    candidates.append(answer_j)
```
For each of 7 distractors it picks a *fresh random attribute each time* and perturbs it from the answer. Problem: **the majority vote across distractors reveals the correct value.** If 6/7 distractors have color=3 and one has color=5, the answer is color=3 — no need to look at the matrix at all. This leakage is the "RAVEN shortcut" that I-RAVEN fixes.

### I-RAVEN (Hu 2021) — **attribute-bisection tree**
```python
# sample up to 3 attributes to vary; rest are fixed at the answer's values
selected_attr = modifiable_attr[:3]

if len(selected_attr) == 1:
    for i in xrange(7):
        value = answer_AoT.sample_new_value(...)
        new_AoT = copy.deepcopy(answer_AoT)
        new_AoT.apply_new_value(component_idx, attr_name, value)
        candidates.append(new_AoT)

elif len(selected_attr) == 2:
    # binary tree: 2 leaves × 3/4 depth
    value = answer_AoT.sample_new_value(...)                  # attr A, one value
    new_AoT = apply(answer_AoT, A, value); candidates.append(new_AoT)
    for i in xrange(3):                                       # attr B, 3 values
        value = answer_AoT.sample_new_value(...)
        for j in xrange(2):                                   # ×2 parents
            new_AoT = copy.deepcopy(candidates[j])
            new_AoT.apply_new_value(component_idx_B, attr_B, value)
            candidates.append(new_AoT)

elif len(selected_attr) >= 3:
    for i in xrange(3):                                       # 2×2×2 = 8 = 1 answer + 7 distractors
        value = answer_AoT.sample_new_value(...)
        tmp = []
        for j in candidates:
            new_AoT = copy.deepcopy(j)
            new_AoT.apply_new_value(component_idx, attr_name, value)
            tmp.append(new_AoT)
        candidates += tmp
```

The 8 candidates form a **complete 2×2×2 hypercube** on 3 attribute axes (or a similar balanced tree on 1–2 axes). Every attribute value appears in **exactly half** the candidates — majority voting gives no signal, the solver must consult the matrix. This is the "solvable only by relational reasoning" property.

This is literally what our readme's "correct on one rule but not another" means: each distractor is the correct answer on some subset of rules but wrong on at least one.

raven-gen's `make_alternatives` uses a different approach (tracks uniqueness via `AttributeHistory`) that guarantees the distractor is *visually distinct* from the answer but does not explicitly balance. **For our port we want I-RAVEN semantics.**

## 6 — Difficulty parameterization

Nothing in the RAVEN family is IRT-calibrated. Observed difficulty knobs:

1. **Number of rule types active** — 1 rule (CONSTANT-only) is trivial; 4–5 rules across several attributes is hard. This is the single biggest lever.
2. **Which attributes vary** — NUMBER/POSITION rules are visually salient (you can count); SIZE and COLOR progressions are subtler; SHAPE DISTRIBUTE_THREE is hardest because the value domain is non-ordinal.
3. **Which MatrixType** — ONE_SHAPE is easiest (single perceptual object), SHAPE_IN_SHAPE and FOUR_SHAPE_IN_SHAPE are hardest (multiple compositional rules interacting).
4. **UNIFORMITY=False** means the N shapes in a cell vary independently, adding clutter.
5. **ARITHMETIC** is empirically harder than PROGRESSION; D3 is hardest.
6. **Distractor similarity** — hypercube edges matter; a distractor that differs on 1 axis is harder to reject than one differing on 3.

Matzen's Sandia matrices (2010) offered an *a priori* difficulty classification by counting relations and transformations; empirical fit to human data was reasonable (r ≈ 0.7–0.8) but not IRT-grade. For us this is enough for bootstrapping before live data arrives.

**Proposed static difficulty formula** (score 0–100):
```
difficulty =
    15 * n_rules                          # 1–5 rules → +15..+75
  + 10 * n_attrs_varied                   # 1–4 → +10..+40
  + matrix_type_factor                    # 0 (ONE) … 20 (FOUR_IN_SHAPE)
  + 10 * (1 if has_arithmetic else 0)
  + 15 * (1 if has_distribute_three else 0)
  + 5  * (1 if uniformity_off else 0)
  - 10 * (distractor_mean_hamming_to_answer / n_attrs)   # easier if distractors far
```
Quantise into 5 bands; each band maps to a rule template. Recalibrate with real user data once we have > 500 responses per template (BetaBernoulli → 2PL IRT).

## 7 — TypeScript port plan

### Cleanest source: **raven-gen**
- Clean dataclass hierarchy (Attribute / Component / Panel / Matrix)
- Only ~6 files, ~2000 LOC total Python
- Same rule set and attribute space as I-RAVEN; renders cleanly in pure primitives
- No OpenCV — we can render to SVG in the browser

**Use raven-gen as the port base, graft I-RAVEN's `separate()` distractor loop on top.**

### File structure
```
src/domain/matrix/
├── attributes.ts          # AttributeType enum, value tables, bounds     ~150 LOC
├── shapes.ts              # Shape enum + SVG primitive renderers         ~200 LOC
├── component.ts           # Component / Entity / Configuration types     ~250 LOC
├── rules.ts               # Rule variants + apply_rule()                 ~400 LOC
├── matrixTypes.ts         # 8 MatrixTypes, layout coordinates            ~200 LOC
├── generator.ts           # Matrix.make() — rule sampling + 3-row build  ~250 LOC
├── distractors.ts         # I-RAVEN hypercube distractor builder         ~150 LOC
├── difficulty.ts          # static difficulty formula + banding          ~100 LOC
├── renderer.tsx           # SolidJS component that renders a Matrix      ~200 LOC
└── __tests__/             # property tests, golden matrices              ~400 LOC
Total:                                                                  ~2300 LOC
```

### Core types (sketch)
```typescript
type AttrType =
  | "number" | "shape" | "size" | "color"
  | "angle" | "uniformity" | "position" | "configuration";

type RuleType = "constant" | "progression" | "arithmetic" | "distribute_three";

interface Rule { name: RuleType; attr: AttrType; value: number; }

interface Entity {
  shape: Shape; size: number; color: number; angle: number;
  x: number; y: number;   // normalized 0..1 within its slot
}

interface Component {
  componentType: ComponentType;
  layoutType: LayoutType;
  uniformity: boolean;
  number: number;          // setting index into NUM_VALUES
  positionSet: number[];   // which slots are occupied
  entities: Entity[];
  constraints: Constraints;
}

interface Panel { components: Component[]; }         // 1 or 2 components
interface Matrix {
  type: MatrixType;
  rules: Rule[][];                                   // one per component
  context: Panel[];                                  // length 8
  answer: Panel;
  alternatives: Panel[];                             // length 7
}
```

### What's hard to port
1. **`copy.deepcopy`** — SolidJS stores are reactive; use `structuredClone` or immer drafts. Rule application is *purely functional* if we're careful.
2. **numpy `np.random.choice` with `replace=False`** — trivial (Fisher-Yates), already in our utils.
3. **The `prune()` function** — walks an AoT (And-Or-Tree) pruning branches that violate constraints. This is ~100 LOC of tree traversal. Port directly.
4. **`AttributeHistory` deduplication** — ensures a distractor isn't sampled twice. Use a `Set<string>` with a canonical JSON key.
5. **The nested constraint objects** (`min`, `max` on every attribute, per component) — straightforward but tedious. Test-drive with property tests.
6. **Position sampling** — `np.random.choice` over a set of slot indices; combinatorial but bounded (max 9 slots = 2^9 combinations). Exhaustive enumeration is fine.

Not hard: the rule logic itself. The Python is mostly branching on enum tags. A direct TS translation of `apply_rule` is ~150 LOC.

### Estimated TS LOC: **~2300** (incl. tests and renderer)
Without tests/renderer: ~1500 LOC generator core.

## 8 — SVG primitive vocabulary

A Raven cell needs exactly these primitives:

```typescript
// shapes.ts
export function renderShape(
  shape: Shape, cx: number, cy: number, size: number,
  color: number, angle: number, strokeW: number
): JSX.Element {
  switch (shape) {
    case "triangle":  return <polygon points={ngonPoints(cx, cy, size, 3, angle)} fill={grey(color)} />;
    case "square":    return <polygon points={ngonPoints(cx, cy, size, 4, angle + 45)} ... />;
    case "pentagon":  return <polygon points={ngonPoints(cx, cy, size, 5, angle)} ... />;
    case "hexagon":   return <polygon points={ngonPoints(cx, cy, size, 6, angle)} ... />;
    case "circle":    return <circle cx={cx} cy={cy} r={size} fill={grey(color)} ... />;
  }
}
```
Plus `ngonPoints(cx, cy, r, n, angleDeg)` which returns a `"x1,y1 x2,y2 ..."` points string — 10 lines of trig.

That's the **entire primitive vocabulary**. Every RAVEN problem is generated from these 5 primitives + color + size + rotation + position. Each SVG cell is 100–200 bytes of markup. A full 3×3 + 8 alternatives fits in ~8 KB of inlined SVG, well under any budget.

PGM additionally needs line primitives (diag, horiz, vert bars). Not needed for our MVP.

## 9 — Difficulty calibration strategy

**Phase 1 (no user data): static rule-based.** Use the formula in §6. Bucket into 5 bands. Each session draws from a band targeting the user's current ability estimate ±1 band.

**Phase 2 (100+ users × 20 items): empirical item difficulty.** Log response and RT per item template (template = MatrixType × rule-tuple × distractor-hypercube). Compute p-value (proportion correct) and median RT. Replace static bands with empirical quantiles.

**Phase 3 (500+ × 50): 2-parameter logistic IRT.** Fit `mirt` or a small Stan model server-side (or port `catR`-style EAP estimation to TS — ~300 LOC). With 2PL we get discrimination + difficulty per template; adaptive engine picks items near the user's theta.

Between Phase 1 and Phase 2 we can already do **Bayesian tracking per rule type** (BKT or a simple Beta per rule) to personalise which rules appear more often. That's what our `05-calibration.md` already specifies.

## 10 — Minimum viable matrix generator spec

Scope for v1 (ship in 1–2 sprints):

- [x] 4 rules: CONSTANT, PROGRESSION, ARITHMETIC, DISTRIBUTE_THREE
- [x] 5 attributes actively used: NUMBER, SHAPE, SIZE, COLOR, POSITION (defer ANGLE/UNIFORMITY)
- [x] 3 MatrixTypes: ONE_SHAPE, FOUR_SHAPE, NINE_SHAPE (grid-only; defer nested)
- [x] I-RAVEN distractor hypercube (1–3 attribute axes)
- [x] Static difficulty formula with 3 bands (easy / medium / hard)
- [x] SVG renderer, 5 shape primitives, 10 grayscale levels
- [x] Seeded RNG so matrices are reproducible for tests & for review

Deferred to v2: nested MatrixTypes (SHAPE_IN_SHAPE etc.), ANGLE rules, UNIFORMITY=False mode, PGM-style logical rules (XOR/OR/AND), empirical IRT calibration.

MVP LOC estimate: **~1200 LOC** (v1 subset of the §7 plan). Full port to ~2300 LOC in v2.

---

### Appendix — source URLs used

- https://github.com/shlomenu/raven-gen — `src/raven_gen/{attribute,rule,matrix,panel,component,entity}.py`
- https://github.com/WellyZhang/RAVEN — `src/dataset/{main,rendering,build_tree,sampling,const,Rule,Attribute}.py`
- https://github.com/husheng12345/SRAN — `I-RAVEN/main.py`
- https://github.com/deepmind/abstract-reasoning-matrices — PGM (dataset + schema reference)
- Carpenter P., Just M., Shell P. (1990). "What one intelligence test measures: a theoretical account of the processing in the Raven Progressive Matrices Test." *Psychological Review* 97(3):404-431.
- Matzen L. et al. (2010). "Recreating Raven's: Software for systematically generating large numbers of Raven-like matrix problems with normed properties." *Behavior Research Methods* 42(2):525-541.
- Zhang C., Gao F., Jia B., Zhu Y., Zhu S.-C. (2019). "RAVEN: A dataset for Relational and Analogical Visual rEasoNing." *CVPR*.
- Hu S., Ma Y., Liu X., Wei Y., Bai S. (2021). "Stratified Rule-Aware Network for Abstract Visual Reasoning." *AAAI*. (Introduces I-RAVEN.)
- Barrett D., Hill F., Santoro A., Morcos A., Lillicrap T. (2018). "Measuring abstract reasoning in neural networks." *ICML*. (PGM.)
