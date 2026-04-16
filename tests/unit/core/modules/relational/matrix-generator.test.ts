import { describe, it, expect } from 'vitest';
import { generateMatrix } from '~/core/modules/relational/matrix-generator';

describe('Matrix generator', () => {
  it('generates a matrix with 9 panels, 1 correct answer, 7 distractors', () => {
    const m = generateMatrix(42);
    expect(m.panels).toHaveLength(9);
    expect(m.distractors).toHaveLength(7);
    expect(m.answer).toBeDefined();
  });

  it('answer panel is at index 8 of the grid', () => {
    const m = generateMatrix(42);
    const answer = m.panels[8];
    expect(answer).toBeDefined();
    expect(answer!.shape).toBe(m.answer.shape);
    expect(answer!.color).toBe(m.answer.color);
    expect(answer!.size).toBe(m.answer.size);
    expect(answer!.count).toBe(m.answer.count);
  });

  it('is deterministic given a seed', () => {
    const m1 = generateMatrix(12345);
    const m2 = generateMatrix(12345);
    expect(m1.answer.shape).toBe(m2.answer.shape);
    expect(m1.answer.color).toBe(m2.answer.color);
    expect(m1.answer.size).toBe(m2.answer.size);
    expect(m1.answer.count).toBe(m2.answer.count);
    expect(m1.rules.length).toBe(m2.rules.length);
  });

  it('distractors differ from the answer', () => {
    const m = generateMatrix(99);
    for (const d of m.distractors) {
      const isEqual =
        d.shape === m.answer.shape &&
        d.color === m.answer.color &&
        d.size === m.answer.size &&
        d.count === m.answer.count;
      expect(isEqual).toBe(false);
    }
  });

  it('ruleCount=1 uses 1 rule, ruleCount=3 uses 3', () => {
    const m1 = generateMatrix(42, 1);
    expect(m1.rules).toHaveLength(1);

    const m3 = generateMatrix(42, 3);
    expect(m3.rules).toHaveLength(3);
  });

  it('default ruleCount is 2', () => {
    const m = generateMatrix(42);
    expect(m.rules).toHaveLength(2);
  });

  it('all panels have valid attributes', () => {
    const m = generateMatrix(77);
    const shapes = ['circle', 'square', 'triangle', 'diamond'];
    const colors = ['red', 'blue', 'green', 'yellow'];
    const sizes = ['small', 'medium', 'large'];
    const counts = [1, 2, 3];

    for (const panel of m.panels) {
      expect(shapes).toContain(panel.shape);
      expect(colors).toContain(panel.color);
      expect(sizes).toContain(panel.size);
      expect(counts).toContain(panel.count);
    }
  });

  it('different seeds produce different puzzles', () => {
    const m1 = generateMatrix(1);
    const m2 = generateMatrix(2);
    const same =
      m1.answer.shape === m2.answer.shape &&
      m1.answer.color === m2.answer.color &&
      m1.answer.size === m2.answer.size &&
      m1.answer.count === m2.answer.count;
    expect(same).toBe(false);
  });
});
