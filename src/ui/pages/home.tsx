import { createResource, For, Show } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { dbInit, dbQuery, dbExec } from '~/core/storage/db-client';
import { saveSession } from '~/core/storage/repos';
import { listModules } from '~/core/modules/registry';
import type { SessionPlan } from '~/types/domain';
import type { ModuleId } from '~/types/module';

interface DomainStateRow {
  module_id: string;
  last_session_ts: number | null;
  sessions_total: number;
  ewma_performance: number;
}

interface AssessmentState {
  lastTs: number | null;
  taskCount: number;
}

async function loadDomainStates(): Promise<Record<string, DomainStateRow>> {
  await dbInit();
  const rows = await dbQuery<DomainStateRow>(
    'SELECT module_id, last_session_ts, sessions_total, ewma_performance FROM domain_state'
  );
  const map: Record<string, DomainStateRow> = {};
  for (const r of rows) map[r.module_id] = r;
  return map;
}

async function loadAssessmentState(): Promise<AssessmentState> {
  await dbInit();
  const rows = await dbQuery<{ ts: number }>(
    'SELECT MAX(ts) as ts FROM transfer_assessments'
  );
  if (rows.length === 0 || rows[0]?.ts === null) {
    return { lastTs: null, taskCount: 0 };
  }
  const lastTs = rows[0]!.ts;
  const countRows = await dbQuery<{ count: number }>(
    'SELECT COUNT(DISTINCT task_id) as count FROM transfer_assessments WHERE ts = ?',
    [lastTs]
  );
  return { lastTs, taskCount: countRows[0]?.count ?? 0 };
}

function formatLastTrained(ts: number | null): string {
  if (ts === null) return 'never';
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function Home() {
  const nav = useNavigate();
  const modules = listModules().filter(m => m.id !== 'placeholder' && m.id !== 'transfer-battery');
  const [states] = createResource(loadDomainStates);
  const [assessmentState] = createResource(loadAssessmentState);

  async function startSingle(moduleId: ModuleId, minutes: number) {
    await dbInit();
    const plan: SessionPlan = {
      id: crypto.randomUUID(),
      createdTs: Date.now(),
      phase: 'ramp',
      modules: [{ moduleId, targetMinutes: minutes }],
      interleave: false,
      metacogOverlay: true
    };
    await saveSession(plan);
    nav(`/session/${plan.id}`);
  }

  async function startAssessment() {
    await dbInit();
    const plan: SessionPlan = {
      id: crypto.randomUUID(),
      createdTs: Date.now(),
      phase: 'ramp',
      modules: [{ moduleId: 'transfer-battery', targetMinutes: 12 }],
      interleave: false,
      metacogOverlay: false
    };
    await saveSession(plan);
    nav(`/session/${plan.id}`);
  }

  return (
    <div class="container">
      <h1 class="hero">Intellect Forge</h1>
      <p class="muted">Evidence-based cognitive training. Personal build.</p>
      <p><A href="/today">Start today's session →</A> <span class="muted">(orchestrator picks)</span></p>

      <Show when={assessmentState()}>
        {aState => {
          const lastTs = aState().lastTs;
          const daysSinceLast = lastTs ? Math.floor((Date.now() - lastTs) / 86400000) : null;
          const isDue = daysSinceLast === null || daysSinceLast >= 28;

          return (
            <div style="margin-top:1.5rem;padding:1rem;background:#1a1e24;border-left:3px solid #7aa2ff;border-radius:4px">
              <Show when={!lastTs} fallback={
                <Show when={isDue} fallback={
                  <p style="margin:0">
                    <span class="muted">Next assessment in {28 - daysSinceLast!}d</span>
                  </p>
                }>
                  <p style="margin:0;margin-bottom:.5rem">
                    <b>Re-assessment due</b> — last run {daysSinceLast}d ago
                  </p>
                  <button onClick={startAssessment} style="background:#7aa2ff;color:#14181e;font-weight:bold">Start assessment</button>
                </Show>
              }>
                <p style="margin:0;margin-bottom:.5rem">
                  <b>Run baseline assessment</b> to enable transfer tracking
                </p>
                <button onClick={startAssessment} style="background:#7aa2ff;color:#14181e;font-weight:bold">Start baseline</button>
              </Show>
            </div>
          );
        }}
      </Show>

      <h3 style="margin-top:2rem">Or train a specific domain</h3>
      <ul style="list-style:none;padding:0">
        <For each={modules}>
          {m => {
            const state = () => states()?.[m.id];
            return (
              <li style="padding:.6rem 0;border-bottom:1px solid #1a1e24;display:flex;align-items:center;justify-content:space-between;gap:1rem">
                <div style="flex:1;min-width:0">
                  <div><b>{m.displayName}</b>
                    <span class="muted"> · ~{m.estimatedMinutes} min</span>
                  </div>
                  <div class="muted" style="font-size:.8rem;margin-top:.2rem">
                    {state()
                      ? `${state()!.sessions_total} sessions · last ${formatLastTrained(state()!.last_session_ts)}`
                      : 'not yet trained'}
                  </div>
                </div>
                <button onClick={() => startSingle(m.id, m.estimatedMinutes)}>Start</button>
              </li>
            );
          }}
        </For>
      </ul>
      <p style="margin-top:2rem" class="muted">
        <A href="/dashboard">dashboard</A> · <A href="/stimulus-debug">stimulus debug</A>
      </p>
    </div>
  );
}
