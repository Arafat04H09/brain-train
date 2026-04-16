import type { ModuleId } from './module';

export type Phase = 'ramp' | 'intensive' | 'consolidation' | 'maintenance';

export interface DomainState {
  moduleId: ModuleId;
  level: Record<string, unknown>;  // module-specific: {n:2}, {threshold:120}, etc.
  ewmaPerformance: number;         // 0-1
  lastSessionTs: number | null;
  sessionsTotal: number;
  plateauFlag: boolean;
  updatedTs: number;
}

export interface SessionPlan {
  id: string;
  createdTs: number;
  phase: Phase;
  modules: { moduleId: ModuleId; targetMinutes: number }[];
  interleave: boolean;
  transferProbe?: { taskId: string };
  metacogOverlay: boolean;
}
