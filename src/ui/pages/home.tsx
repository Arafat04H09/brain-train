import { createResource, For, Show } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { dbInit, dbQuery } from '~/core/storage/db-client';
import { saveSession } from '~/core/storage/repos';
import { listModules } from '~/core/modules/registry';
import type { SessionPlan, Phase } from '~/types/domain';
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

interface OverallStats {
  totalSessions: number;
  currentPhase: Phase;
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

async function loadOverallStats(): Promise<OverallStats> {
  await dbInit();
  const rows = await dbQuery<{ count: number }>('SELECT COUNT(*) as count FROM sessions WHERE completed = 1');
  const latestRow = await dbQuery<{ phase: string }>('SELECT phase FROM sessions ORDER BY start_ts DESC LIMIT 1');
  return {
    totalSessions: rows[0]?.count ?? 0,
    currentPhase: (latestRow[0]?.phase as Phase) ?? 'ramp'
  };
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
  const [overall] = createResource(loadOverallStats);

  async function startSingle(moduleId: ModuleId, minutes: number) {
    await dbInit();
    const plan: SessionPlan = {
      id: crypto.randomUUID(),
      createdTs: Date.now(),
      phase: overall()?.currentPhase ?? 'ramp',
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
      phase: overall()?.currentPhase ?? 'ramp',
      modules: [{ moduleId: 'transfer-battery', targetMinutes: 12 }],
      interleave: false,
      metacogOverlay: false
    };
    await saveSession(plan);
    nav(`/session/${plan.id}`);
  }

  return (
    <div class="container">
      <header style="margin-bottom: 3rem">
        <h1 class="hero">Intellect Forge</h1>
        <div class="flex-between">
          <p class="muted" style="margin: 0">Evidence-based cognitive training engine.</p>
          <div class="mono" style="font-size: 0.75rem; color: var(--accent); text-transform: uppercase; letter-spacing: 0.1em">
            System Online
          </div>
        </div>
      </header>

      <section class="panel" style="border-left: 4px solid var(--accent); background: linear-gradient(90deg, #1a1e24 0%, var(--panel) 100%)">
        <h2 style="font-size: 1.25rem; margin-bottom: 1rem">Current Status</h2>
        <div class="card-grid" style="margin-bottom: 1.5rem">
          <div>
            <div class="muted" style="font-size: 0.75rem; text-transform: uppercase; margin-bottom: 0.25rem">Active Phase</div>
            <div class="mono" style="font-size: 1.1rem; color: var(--accent)">{overall()?.currentPhase ?? 'ramp'}</div>
          </div>
          <div>
            <div class="muted" style="font-size: 0.75rem; text-transform: uppercase; margin-bottom: 0.25rem">Total Sessions</div>
            <div class="mono" style="font-size: 1.1rem">{overall()?.totalSessions ?? 0}</div>
          </div>
        </div>
        <A href="/today">
          <button class="primary" style="width: 100%; padding: 1rem; font-size: 1rem">
            Begin Today's Protocol →
          </button>
        </A>
      </section>

      <Show when={assessmentState()}>
        {aState => {
          const lastTs = aState().lastTs;
          const daysSinceLast = lastTs ? Math.floor((Date.now() - lastTs) / 86400000) : null;
          const isDue = daysSinceLast === null || daysSinceLast >= 28;

          return (
            <div class="panel" style="border-left: 4px solid #f2c94c">
              <Show when={!lastTs} fallback={
                <Show when={isDue} fallback={
                  <p class="muted" style="margin:0">
                    Next transfer assessment in <span class="mono" style="color: var(--fg)">{28 - daysSinceLast!}d</span>
                  </p>
                }>
                  <div class="flex-between">
                    <div>
                      <h3 style="font-size: 1rem; margin-bottom: 0.25rem">Re-assessment Due</h3>
                      <p class="muted" style="margin:0">Last baseline captured {daysSinceLast} days ago.</p>
                    </div>
                    <button onClick={startAssessment}>Run Assessment</button>
                  </div>
                </Show>
              }>
                <div class="flex-between">
                  <div>
                    <h3 style="font-size: 1rem; margin-bottom: 0.25rem">Baseline Required</h3>
                    <p class="muted" style="margin:0">Establish your cognitive baseline to track transfer effects.</p>
                  </div>
                  <button onClick={startAssessment} class="primary">Start Baseline</button>
                </div>
              </Show>
            </div>
          );
        }}
      </Show>

      <section style="margin-top: 3rem">
        <h3 style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 1.5rem">
          Training Modules
        </h3>
        <div class="card-grid">
          <For each={modules}>
            {m => {
              const state = () => states()?.[m.id];
              return (
                <div class="panel" style="margin-bottom: 0; display: flex; flex-direction: column; justify-content: space-between">
                  <div>
                    <h4 style="margin-bottom: 0.25rem">{m.displayName}</h4>
                    <p class="muted" style="font-size: 0.8rem; margin-bottom: 1rem">
                      {state()
                        ? `${state()!.sessions_total} sessions · ${formatLastTrained(state()!.last_session_ts)}`
                        : 'No history recorded'}
                    </p>
                  </div>
                  <button onClick={() => startSingle(m.id, m.estimatedMinutes)} style="width: 100%">
                    Train · {m.estimatedMinutes}m
                  </button>
                </div>
              );
            }}
          </For>
        </div>
      </section>

      <footer style="margin-top: 4rem; padding-top: 2rem; border-top: 1px solid var(--panel-border); display: flex; gap: 1.5rem">
        <A href="/dashboard" class="muted" style="text-decoration: underline">Analytics Dashboard</A>
        <A href="/about" class="muted" style="text-decoration: underline">About &amp; Science</A>
        <A href="/stimulus-debug" class="muted" style="text-decoration: underline">Hardware Calibration</A>
      </footer>
    </div>
  );
}
