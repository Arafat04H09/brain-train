export type Shape = 'circle' | 'square' | 'triangle' | 'diamond';
export type Color = 'red' | 'blue' | 'green' | 'yellow';
export type Size = 'small' | 'medium' | 'large';
export type Count = 1 | 2 | 3;

export interface Panel {
  shape: Shape;
  color: Color;
  size: Size;
  count: Count;
}

export type RuleKind = 'constant' | 'progression' | 'distribute3';

export interface MatrixRule {
  attribute: 'shape' | 'color' | 'size' | 'count';
  kind: RuleKind;
}

export interface MatrixPuzzle {
  panels: Panel[];       // 9 panels; index 8 is the answer slot
  answer: Panel;         // equals panels[8]
  distractors: Panel[];  // 7 foils, each violating exactly one rule
  rules: MatrixRule[];
  seed: number;
}

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SHAPES = ['circle', 'square', 'triangle', 'diamond'] as const;
const COLORS = ['red', 'blue', 'green', 'yellow'] as const;
const SIZES = ['small', 'medium', 'large'] as const;
const COUNTS = [1, 2, 3] as const;

const ATTRIBUTES = ['shape', 'color', 'size', 'count'] as const;
const RULE_KINDS = ['constant', 'progression', 'distribute3'] as const;

function pick<T>(rand: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

function pickK<T>(rand: () => number, arr: readonly T[], k: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < k && copy.length > 0; i++) {
    const idx = Math.floor(rand() * copy.length);
    result.push(copy[idx]!);
    copy.splice(idx, 1);
  }
  return result;
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function panelEquals(a: Panel, b: Panel): boolean {
  return a.shape === b.shape && a.color === b.color && a.size === b.size && a.count === b.count;
}

// Build a 3x3 grid of attribute values honoring the rule for one attribute.
// When no rule applies, the attribute is held constant across the ENTIRE matrix
// so non-rule dimensions don't add visual noise that obscures the pattern.
function buildAttributeGrid<V>(
  rand: () => number,
  values: readonly V[],
  rule: MatrixRule | undefined
): V[][] {
  if (!rule) {
    const v = pick(rand, values);
    return [[v, v, v], [v, v, v], [v, v, v]];
  }
  if (rule.kind === 'constant') {
    // Same value across a row; each row picks its own.
    return [0, 1, 2].map(() => {
      const v = pick(rand, values);
      return [v, v, v];
    });
  }
  if (rule.kind === 'progression') {
    // Each row: [values[i], values[i+1], values[i+2]] for some start i.
    return [0, 1, 2].map(() => {
      const start = Math.floor(rand() * values.length);
      return [0, 1, 2].map(c => values[(start + c) % values.length]!);
    });
  }
  // distribute3: pick 3 distinct values; each row is a permutation of those 3.
  const three = pickK(rand, values, Math.min(3, values.length));
  while (three.length < 3) three.push(three[0]!); // defensive for 2-value sets
  return [0, 1, 2].map(() => shuffle(three, rand));
}

export function generateMatrix(seed: number, ruleCount: 1 | 2 | 3 = 2): MatrixPuzzle {
  const rand = mulberry32(seed);

  const ruledAttrs = pickK(rand, ATTRIBUTES, ruleCount);
  const rules: MatrixRule[] = ruledAttrs.map(attr => {
    // 'count' only has 3 values so 'distribute3' always works; but 'progression'
    // on count wraps fine too. Allow any rule kind.
    return { attribute: attr, kind: pick(rand, RULE_KINDS) };
  });

  const shapeGrid = buildAttributeGrid(rand, SHAPES, rules.find(r => r.attribute === 'shape'));
  const colorGrid = buildAttributeGrid(rand, COLORS, rules.find(r => r.attribute === 'color'));
  const sizeGrid = buildAttributeGrid(rand, SIZES, rules.find(r => r.attribute === 'size'));
  const countGrid = buildAttributeGrid(rand, COUNTS, rules.find(r => r.attribute === 'count'));

  const panels: Panel[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      panels.push({
        shape: shapeGrid[row]![col]!,
        color: colorGrid[row]![col]!,
        size: sizeGrid[row]![col]!,
        count: countGrid[row]![col]! as Count
      });
    }
  }
  const answer = panels[8]!;

  // One distractor per rule that violates exactly that rule.
  const distractors: Panel[] = [];
  for (const rule of rules) {
    const v = { ...answer };
    if (rule.attribute === 'shape') {
      v.shape = pick(rand, SHAPES.filter(s => s !== answer.shape));
    } else if (rule.attribute === 'color') {
      v.color = pick(rand, COLORS.filter(c => c !== answer.color));
    } else if (rule.attribute === 'size') {
      v.size = pick(rand, SIZES.filter(s => s !== answer.size));
    } else {
      v.count = pick(rand, COUNTS.filter(c => c !== answer.count)) as Count;
    }
    if (!distractors.some(d => panelEquals(d, v)) && !panelEquals(v, answer)) {
      distractors.push(v);
    }
  }

  // Fill to 7 with random perturbations of one attribute.
  let guard = 0;
  while (distractors.length < 7 && guard++ < 200) {
    const attr = pick(rand, ATTRIBUTES);
    const v = { ...answer };
    if (attr === 'shape') {
      v.shape = pick(rand, SHAPES.filter(s => s !== answer.shape));
    } else if (attr === 'color') {
      v.color = pick(rand, COLORS.filter(c => c !== answer.color));
    } else if (attr === 'size') {
      v.size = pick(rand, SIZES.filter(s => s !== answer.size));
    } else {
      v.count = pick(rand, COUNTS.filter(c => c !== answer.count)) as Count;
    }
    if (!panelEquals(v, answer) && !distractors.some(d => panelEquals(d, v))) {
      distractors.push(v);
    }
  }
  // Pathological fallback: random panels.
  while (distractors.length < 7) {
    const v: Panel = {
      shape: pick(rand, SHAPES),
      color: pick(rand, COLORS),
      size: pick(rand, SIZES),
      count: pick(rand, COUNTS) as Count
    };
    if (!panelEquals(v, answer) && !distractors.some(d => panelEquals(d, v))) {
      distractors.push(v);
    }
  }

  return { panels, answer, distractors: distractors.slice(0, 7), rules, seed };
}
