import { describe, it, expect } from 'vitest';
import { cusumUpdate, cusumInit, ewmaUpdate } from '~/core/adaptive/cusum';

describe('CUSUM change detection', () => {
  it('initializes with zero sum', () => {
    const state = cusumInit(0.75);
    expect(state.sum).toBe(0);
    expect(state.target).toBe(0.75);
    expect(state.alarm).toBe(false);
  });

  it('does not alarm on stable performance', () => {
    let state = cusumInit(0.75);
    for (let i = 0; i < 10; i++) {
      state = cusumUpdate(state, 0.75);
    }
    expect(state.alarm).toBe(false);
    expect(state.sum).toBe(0);
  });

  it('alarms after sustained performance drop', () => {
    let state = cusumInit(0.75);
    for (let i = 0; i < 10; i++) {
      state = cusumUpdate(state, 0.55);
    }
    expect(state.alarm).toBe(true);
  });

  it('resets sum on good performance', () => {
    let state = cusumInit(0.75);
    state = cusumUpdate(state, 0.50);
    state = cusumUpdate(state, 0.50);
    // After two bad observations, sum has accumulated.
    // A single very good observation reduces sum but may not zero it;
    // sustained good performance clamps it back to 0.
    state = cusumUpdate(state, 0.90);
    state = cusumUpdate(state, 0.90);
    state = cusumUpdate(state, 0.90);
    expect(state.sum).toBe(0);
    expect(state.alarm).toBe(false);
  });

  it('computes EWMA correctly', () => {
    expect(ewmaUpdate(0, 0.8, 0.3)).toBeCloseTo(0.24);
    expect(ewmaUpdate(0.5, 0.8, 0.3)).toBeCloseTo(0.59);
  });
});
