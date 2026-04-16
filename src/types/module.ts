import type { StimulusDescriptor, InputSpec, TimingSpec, ResponseEvent, TrialTimingResult } from './stimulus';
import type { DomainState } from './domain';

export type ModuleId =
  | 'working-memory'
  | 'ufov'
  | 'compound-ef'
  | 'relational'
  | 'calibration'
  | 'placeholder';

export interface TrainingModule {
  id: ModuleId;
  displayName: string;
  estimatedMinutes: number;
  createSession(state: DomainState, hints?: OrchestratorHints): Session;
}

export interface OrchestratorHints {
  interleaveWithModule?: ModuleId;
  targetMinutes?: number;
  transferProbe?: boolean;
}

export interface Block {
  index: number;
  kind: string;
  targetTrialCount: number;
  metacogPrediction?: number;
}

export interface Trial {
  id: string;
  blockIndex: number;
  trialIndex: number;
  stimulus: StimulusDescriptor;
  inputSpec: InputSpec;
  timingSpec: TimingSpec;
  metadata?: Record<string, unknown>;
}

export interface Response {
  trialId: string;
  event: ResponseEvent;
  timing: TrialTimingResult;
  allKeys?: string[];  // every keydown during the trial's response window
}

export interface TrialResult {
  trialId: string;
  correct: boolean | null;   // null = no response / timeout
  rtMs: number | null;
  scored: Record<string, number>;  // module-specific (e.g. {visualHit:1, audioFA:0})
}

export interface BlockStats {
  blockIndex: number;
  trialsCompleted: number;
  accuracy: number;
  custom: Record<string, number>;  // d-prime, switch cost, etc.
}

export interface SessionResult {
  blocks: BlockStats[];
  totalDurationMs: number;
  nextDomainState: DomainState;
}

export interface Session {
  readonly moduleId: ModuleId;
  readonly blocks: readonly Block[];
  nextTrial(): Trial | null;
  setMetacogPrediction(blockIndex: number, predicted: number): void;
  submit(response: Response): Promise<TrialResult>;
  currentBlockStats(): BlockStats;
  complete(): SessionResult;
}
