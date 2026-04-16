import { createResource, For } from 'solid-js';
import { dbInit, dbQuery } from '~/core/storage/db-client';

async function loadSummary() {
  await dbInit();
  const sessions = await dbQuery<{ id: string; phase: string; start_ts: number; end_ts: number | null }>(
    'SELECT id, phase, start_ts, end_ts FROM sessions ORDER BY start_ts DESC LIMIT 20');
  const domainState = await dbQuery<{ module_id: string; ewma_performance: number; sessions_total: number }>(
    'SELECT module_id, ewma_performance, sessions_total FROM domain_state');
  return { sessions, domainState };
}

export function Dashboard() {
  const [data] = createResource(loadSummary);
  return (
    <div class="container">
      <h1 class="hero">Dashboard</h1>
      <h3>Domains</h3>
      <ul>
        <For each={data()?.domainState ?? []}>{d =>
          <li>{d.module_id} — {d.sessions_total} sessions — ewma {d.ewma_performance?.toFixed(2) ?? '—'}</li>
        }</For>
      </ul>
      <h3>Recent sessions</h3>
      <ul>
        <For each={data()?.sessions ?? []}>{s =>
          <li>{new Date(s.start_ts).toLocaleString()} — {s.phase} — {s.end_ts ? 'complete' : 'in progress'}</li>
        }</For>
      </ul>
    </div>
  );
}
