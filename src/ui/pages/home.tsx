import { createResource, For } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { dbInit, dbQuery } from '~/core/storage/db-client';
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

async function loadDomainStates(): Promise<Record<string, DomainStateRow>> {
  await dbInit();
  const rows = await dbQuery<DomainStateRow>(
    'SELECT module_id, last_session_ts, sessions_total, ewma_performance FROM domain_state'
  );
  const map: Record<string, DomainStateRow> = {};
  for (const r of rows) map[r.module_id] = r;
  return map;
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
  const modules = listModules().filter(m => m.id !== 'placeholder');
  const [states] = createResource(loadDomainStates);

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

  return (
    <div class="container">
      <h1 class="hero">Intellect Forge</h1>
      <p class="muted">Evidence-based cognitive training. Personal build.</p>
      <p><A href="/today">Start today's session →</A> <span class="muted">(orchestrator picks)</span></p>
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
