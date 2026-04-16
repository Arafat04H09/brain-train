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
  panels: Panel[];       // length 9
  answer: Panel;         // the true answer (= panels[8])
  distractors: Panel[];  // 7 foils
  rules: MatrixRule[];   // 1–3 rules applied
  seed: number;
}

// Mulberry32 seeded PRNG
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

function panelEquals(a: Panel, b: Panel): boolean {
  return a.shape === b.shape && a.color === b.color && a.size === b.size && a.count === b.count;
}

function removeDuplicatePanels(panels: Panel[]): Panel[] {
  const unique: Panel[] = [];
  for (const p of panels) {
    if (!unique.some(u => panelEquals(u, p))) unique.push(p);
  }
  return unique;
}

export function generateMatrix(seed: number, ruleCount: 1 | 2 | 3 = 2): MatrixPuzzle {
  const rand = mulberry32(seed);

  // Pick ruleCount unique attributes
  const attributePool = [...ATTRIBUTES];
  const ruledAttrs = pickK(rand, attributePool, ruleCount);
  const rules: MatrixRule[] = ruledAttrs.map((attr) => ({
    attribute: attr,
    kind: pick(rand, RULE_KINDS)
  }));

  // Initialize panels array (9 total; 0-8 where 8 is the answer)
  const panels: Panel[] = [];

  // Fill grid row by row (3 rows, 3 columns)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col;

      // For each attribute, determine its value
      const shape = getAttributeValue('shape', row, rand, rules) as Shape;
      const color = getAttributeValue('color', row, rand, rules) as Color;
      const size = getAttributeValue('size', row, rand, rules) as Size;
      const count = getAttributeValue('count', row, rand, rules) as Count;

      panels[idx] = { shape, color, size, count };
    }
  }

  const answer = panels[8]!;

  // Generate distractors
  const distractors: Panel[] = [];

  // For each rule, create a distractor that violates it
  for (const rule of rules) {
    const violator = { ...answer };
    const attr = rule.attribute;

    if (attr === 'shape') {
      const options = SHAPES.filter((s) => s !== answer.shape);
      violator.shape = pick(rand, options);
    } else if (attr === 'color') {
      const options = COLORS.filter((c) => c !== answer.color);
      violator.color = pick(rand, options);
    } else if (attr === 'size') {
      const options = SIZES.filter((s) => s !== answer.size);
      violator.size = pick(rand, options);
    } else if (attr === 'count') {
      const options = COUNTS.filter((c) => c !== answer.count);
      violator.count = pick(rand, options) as Count;
    }

    distractors.push(violator);
  }

  // Fill remaining distractor slots (if < 7) with random perturbations
  while (distractors.length < 7) {
    const perturbed = { ...answer };
    const attrToPerturb = pick(rand, ATTRIBUTES);

    if (attrToPerturb === 'shape') {
      const options = SHAPES.filter((s) => s !== answer.shape);
      if (options.length > 0) perturbed.shape = pick(rand, options);
    } else if (attrToPerturb === 'color') {
      const options = COLORS.filter((c) => c !== answer.color);
      if (options.length > 0) perturbed.color = pick(rand, options);
    } else if (attrToPerturb === 'size') {
      const options = SIZES.filter((s) => s !== answer.size);
      if (options.length > 0) perturbed.size = pick(rand, options);
    } else if (attrToPerturb === 'count') {
      const options = COUNTS.filter((c) => c !== answer.count);
      if (options.length > 0) perturbed.count = pick(rand, options) as Count;
    }

    // Only add if it doesn't equal the answer and hasn't already been added
    if (!panelEquals(perturbed, answer) && !distractors.some((d) => panelEquals(d, perturbed))) {
      distractors.push(perturbed);
    }
  }

  // Ensure we have exactly 7 distractors, and none equal the answer
  const finalDistractors = removeDuplicatePanels(distractors)
    .filter((d) => !panelEquals(d, answer))
    .slice(0, 7);

  // If we still need more, generate random
  while (finalDistractors.length < 7) {
    const random: Panel = {
      shape: pick(rand, SHAPES),
      color: pick(rand, COLORS),
      size: pick(rand, SIZES),
      count: pick(rand, COUNTS) as Count
    };
    if (!panelEquals(random, answer) && !finalDistractors.some((d) => panelEquals(d, random))) {
      finalDistractors.push(random);
    }
  }

  return {
    panels,
    answer,
    distractors: finalDistractors,
    rules,
    seed
  };
}

function getAttributeValue(
  attr: 'shape' | 'color' | 'size' | 'count',
  row: number,
  rand: () => number,
  rules: MatrixRule[]
): Shape | Color | Size | Count {
  const rule = rules.find((r) => r.attribute === attr);

  if (!rule) {
    // No rule on this attribute: random constant within the row
    if (attr === 'shape') return pick(rand, SHAPES);
    if (attr === 'color') return pick(rand, COLORS);
    if (attr === 'size') return pick(rand, SIZES);
    return pick(rand, COUNTS) as Count;
  }

  if (rule.kind === 'constant') {
    // Same value across the row
    if (attr === 'shape') return pick(rand, SHAPES);
    if (attr === 'color') return pick(rand, COLORS);
    if (attr === 'size') return pick(rand, SIZES);
    return pick(rand, COUNTS) as Count;
  }

  if (rule.kind === 'progression') {
    // Index-based progression across columns 0, 1, 2
    const baseIdx = Math.floor(rand() * 4);
    if (attr === 'shape') {
      return SHAPES[(baseIdx + row) % SHAPES.length]!;
    } else if (attr === 'color') {
      return COLORS[(baseIdx + row) % COLORS.length]!;
    } else if (attr === 'size') {
      return SIZES[(baseIdx + row) % SIZES.length]!;
    } else {
      return COUNTS[(baseIdx + row) % COUNTS.length]! as Count;
    }
  }

  // distribute3
  const baseIdx = Math.floor(rand() * 2); // 0 or 1 to pick first 3 of the ordered list
  if (attr === 'shape') {
    const values = SHAPES.slice(baseIdx, baseIdx + 3);
    const wrap = values.length < 3 ? SHAPES : values;
    return wrap[row % wrap.length]!;
  } else if (attr === 'color') {
    const values = COLORS.slice(baseIdx, baseIdx + 3);
    const wrap = values.length < 3 ? COLORS : values;
    return wrap[row % wrap.length]!;
  } else if (attr === 'size') {
    const values = SIZES.slice(baseIdx, baseIdx + 3);
    const wrap = values.length < 3 ? SIZES : values;
    return wrap[row % wrap.length]!;
  } else {
    const values = COUNTS.slice(0, 3) as Count[];
    const wrap = values.length < 3 ? COUNTS : values;
    return (wrap[row % wrap.length]! as unknown) as Count;
  }
}
