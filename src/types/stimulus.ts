export type StimulusKind =
  | 'nback-grid'
  | 'nback-letter'
  | 'ufov-peripheral'
  | 'flanker-compound'
  | 'matrix-3x3'
  | 'calibration-mcq'
  | 'text-question'
  | 'complex-span';

export interface StimulusDescriptor {
  kind: StimulusKind;
  payload: unknown;  // kind-specific; discriminated in each module
}

export interface InputSpec {
  accept: ('keyboard' | 'mouse-click' | 'slider' | 'text')[];
  keys?: string[];
  timeoutMs?: number;
}

export interface TimingSpec {
  preMs?: number;
  stimulusMs: number | 'until-response';
  maskMs?: number;
  isiMs?: number;
}

export interface ResponseEvent {
  kind: 'keydown' | 'click' | 'slider' | 'text' | 'timeout';
  value: string | number | null;
  rtMs: number;
}

export interface TrialTimingResult {
  requestedDurationMs: number;
  achievedDurationMs: number;
  framesRendered: number;
  timingFlag: 'ok' | 'dropped-frames' | 'over-duration';
}
