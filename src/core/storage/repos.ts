import { dbExec, dbQuery } from './db-client';
import type { DomainState, SessionPlan } from '~/types/domain';
import type { ModuleId } from '~/types/module';

export async function saveSession(plan: SessionPlan): Promise<void> {
  await dbExec(
    'INSERT INTO sessions(id, start_ts, plan_json, phase, completed) VALUES(?,?,?,?,0)',
    [plan.id, plan.createdTs, JSON.stringify(plan), plan.phase]
  );
}

export async function completeSession(id: string): Promise<void> {
  await dbExec('UPDATE sessions SET end_ts=?, completed=1 WHERE id=?', [Date.now(), id]);
}

export async function saveBlock(b: {
  id: string; sessionId: string; moduleId: ModuleId; blockIndex: number;
  kind: string; metacogPrediction?: number | null; adaptiveParams: unknown;
}): Promise<void> {
  await dbExec(
    `INSERT INTO blocks(id, session_id, module_id, block_index, kind, start_ts,
       metacog_prediction, adaptive_params_json) VALUES(?,?,?,?,?,?,?,?)`,
    [b.id, b.sessionId, b.moduleId, b.blockIndex, b.kind, Date.now(),
     b.metacogPrediction ?? null, JSON.stringify(b.adaptiveParams)]
  );
}

export async function completeBlock(id: string, actualAccuracy: number): Promise<void> {
  await dbExec('UPDATE blocks SET end_ts=?, actual_accuracy=? WHERE id=?',
    [Date.now(), actualAccuracy, id]);
}

export interface TrialRow {
  id: string; blockId: string; trialIndex: number;
  stimulus: unknown; response: unknown;
  correct: boolean | null; rtMs: number | null;
  requestedDurationMs: number; achievedDurationMs: number;
  framesRendered: number; timingFlag: string;
}

export async function saveTrial(t: TrialRow): Promise<void> {
  await dbExec(
    `INSERT INTO trials(id, block_id, trial_index, stimulus_json, response_json,
       correct, rt_ms, requested_duration_ms, achieved_duration_ms,
       frames_rendered, timing_flag) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
    [t.id, t.blockId, t.trialIndex, JSON.stringify(t.stimulus),
     JSON.stringify(t.response), t.correct === null ? null : (t.correct ? 1 : 0),
     t.rtMs, t.requestedDurationMs, t.achievedDurationMs, t.framesRendered, t.timingFlag]
  );
}

export async function getDomainState(moduleId: ModuleId): Promise<DomainState | null> {
  const rows = await dbQuery<{ module_id: string; level_json: string; ewma_performance: number;
    last_session_ts: number | null; sessions_total: number; plateau_flag: number; updated_ts: number; }>(
    'SELECT * FROM domain_state WHERE module_id = ?', [moduleId]);
  if (rows.length === 0) return null;
  const r = rows[0]!;
  return {
    moduleId: r.module_id as ModuleId,
    level: JSON.parse(r.level_json),
    ewmaPerformance: r.ewma_performance,
    lastSessionTs: r.last_session_ts,
    sessionsTotal: r.sessions_total,
    plateauFlag: r.plateau_flag === 1,
    updatedTs: r.updated_ts
  };
}

export async function upsertDomainState(s: DomainState): Promise<void> {
  await dbExec(
    `INSERT OR REPLACE INTO domain_state(module_id, level_json, ewma_performance,
       last_session_ts, sessions_total, plateau_flag, updated_ts)
     VALUES(?,?,?,?,?,?,?)`,
    [s.moduleId, JSON.stringify(s.level), s.ewmaPerformance,
     s.lastSessionTs, s.sessionsTotal, s.plateauFlag ? 1 : 0, s.updatedTs]
  );
}

export async function saveMetacogPrediction(row: {
  blockId: string; predictedAccuracy: number;
  actualAccuracy?: number | null; brierContribution?: number | null;
}): Promise<void> {
  await dbExec(
    `INSERT OR REPLACE INTO metacog_predictions(block_id, predicted_accuracy, actual_accuracy, brier_contribution)
     VALUES(?, ?, ?, ?)`,
    [row.blockId, row.predictedAccuracy, row.actualAccuracy ?? null, row.brierContribution ?? null]
  );
}

export async function saveTransferAssessment(row: {
  ts: number;
  taskId: string;
  score: number;
  raw: unknown;
}): Promise<void> {
  await dbExec(
    `INSERT INTO transfer_assessments(id, ts, task_id, score, raw_json)
     VALUES(?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), row.ts, row.taskId, row.score, JSON.stringify(row.raw)]
  );
}
