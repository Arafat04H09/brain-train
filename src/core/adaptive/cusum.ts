export interface CusumState {
  target: number;
  sum: number;
  alarm: boolean;
}

const SLACK = 0.05;
const THRESHOLD = 1.0;

export function cusumInit(target: number): CusumState {
  return { target, sum: 0, alarm: false };
}

export function cusumUpdate(state: CusumState, observation: number): CusumState {
  const deviation = state.target - observation;
  const newSum = Math.max(0, state.sum + deviation - SLACK);
  return {
    target: state.target,
    sum: newSum,
    alarm: newSum >= THRESHOLD
  };
}

export function ewmaUpdate(prev: number, observation: number, alpha: number = 0.3): number {
  return alpha * observation + (1 - alpha) * prev;
}
