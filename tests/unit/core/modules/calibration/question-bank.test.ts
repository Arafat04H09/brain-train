import { describe, it, expect } from 'vitest';
import { CALIBRATION_ITEMS } from '~/core/modules/calibration/question-bank';

describe('Question bank', () => {
  it('has at least 10,000 items', () => {
    expect(CALIBRATION_ITEMS.length).toBeGreaterThanOrEqual(10000);
  });

  it('all items have exactly 4 choices', () => {
    for (const item of CALIBRATION_ITEMS) {
      expect(item.choices).toHaveLength(4);
    }
  });

  it('all items have valid correctIndex (0-3)', () => {
    for (const item of CALIBRATION_ITEMS) {
      expect(item.correctIndex).toBeGreaterThanOrEqual(0);
      expect(item.correctIndex).toBeLessThan(4);
    }
  });

  it('all item IDs are unique', () => {
    const ids = CALIBRATION_ITEMS.map(it => it.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all five categories are represented', () => {
    const categories = new Set(CALIBRATION_ITEMS.map(it => it.category));
    expect(categories.has('geography')).toBe(true);
    expect(categories.has('history')).toBe(true);
    expect(categories.has('science')).toBe(true);
    expect(categories.has('logic')).toBe(true);
    expect(categories.has('estimation')).toBe(true);
  });

  it('each category has at least 500 items', () => {
    const categories = ['geography', 'history', 'science', 'logic', 'estimation'] as const;
    for (const category of categories) {
      const count = CALIBRATION_ITEMS.filter(it => it.category === category).length;
      expect(count).toBeGreaterThanOrEqual(500);
    }
  });

  it('all items have valid difficulty level', () => {
    for (const item of CALIBRATION_ITEMS) {
      expect(['easy', 'medium', 'hard']).toContain(item.difficulty);
    }
  });

  it('all items have non-empty question and choices', () => {
    for (const item of CALIBRATION_ITEMS) {
      expect(item.question.length).toBeGreaterThan(0);
      for (const choice of item.choices) {
        expect(choice.length).toBeGreaterThan(0);
      }
    }
  });

  it('no duplicate questions', () => {
    const questions = CALIBRATION_ITEMS.map(it => it.question);
    const uniqueQuestions = new Set(questions);
    expect(uniqueQuestions.size).toBe(questions.length);
  });

  it('every item is from a verified OSS source (no synthetic or AI-generated)', () => {
    // Guard against regression: every item ID must be prefixed with a known
    // real-source tag. Synthetic/AI-generated items (synth-*, seed-*) are not
    // acceptable.
    const verifiedPrefixes = ['mmlu-', 'otdb-', 'tqa-'];
    for (const item of CALIBRATION_ITEMS) {
      const ok = verifiedPrefixes.some(p => item.id.startsWith(p));
      if (!ok) {
        throw new Error(`Item ${item.id} is not from a verified OSS source`);
      }
    }
  });
});
