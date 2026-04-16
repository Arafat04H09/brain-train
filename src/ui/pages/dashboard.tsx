import { createResource, For, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { dbInit, dbQuery } from '~/core/storage/db-client';

interface DomainRow {
  module_id: string;
  ewma_performance: number;
  sessions_total: number;
  last_session_ts: number | null;
}
interface SessionRow {
  id: string;
  phase: string;
  start_ts: number;
  end_ts: number | null;
  completed: number;
}
interface SessionAccRow {
  session_id: string;
  module_id: string;
  accuracy: number;
  start_ts: number;
}

async function loadSummary() {
  await dbInit();
  const sessions = await dbQuery<SessionRow>(
    'SELECT id, phase, start_ts, end_ts, completed FROM sessions WHERE completed = 1 ORDER BY start_ts DESC LIMIT 30'
  );
  const domainState = await dbQuery<DomainRow>(
    'SELECT module_id, ewma_performance, sessions_total, last_session_ts FROM domain_state ORDER BY module_id'
  );
  // Per-session accuracy per domain (session-weighted, averages blocks of that module within each session)
  const perSession = await dbQuery<SessionAccRow>(
    `SELECT b.session_id, b.module_id, AVG(b.actual_accuracy) as accuracy, s.start_ts
     FROM blocks b JOIN sessions s ON s.id = b.session_id
     WHERE b.actual_accuracy IS NOT NULL AND s.completed = 1
     GROUP BY b.session_id, b.module_id
     ORDER BY s.start_ts DESC
     LIMIT 120`
  );
  return { sessions, domainState, perSession };
}

function Sparkline(props: { values: number[]; width?: number; height?: number }) {
  const w = () => props.width ?? 140;
  const h = () => props.height ?? 28;
  const path = () => {
    const vs = props.values;
    if (vs.length === 0) return '';
    if (vs.length === 1) return `M 0 ${h() / 2} L ${w()} ${h() / 2}`;
    const step = w() / (vs.length - 1);
    return vs.map((v, i) => {
      const x = i * step;
      const y = h() - v * h();  // accuracy 0..1 → bottom..top
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };
  return (
    <svg width={w()} height={h()} style="vertical-align:middle">
      <line x1="0" y1={h() - 0.75 * h()} x2={w()} y2={h() - 0.75 * h()}
        stroke="#2a2f38" stroke-dasharray="2,2" />
      <path d={path()} stroke="#7aa2ff" stroke-width="2" fill="none" />
    </svg>
  );
}

export function Dashboard() {
  const [data] = createResource(loadSummary);

  // Build per-domain session-accuracy series (oldest → newest)
  const seriesByDomain = () => {
    const d = data();
    if (!d) return new Map<string, number[]>();
    const map = new Map<string, number[]>();
    // perSession is sorted DESC; reverse to get chronological order
    const chronological = [...d.perSession].reverse();
    for (const row of chronological) {
      const arr = map.get(row.module_id) ?? [];
      arr.push(row.accuracy);
      map.set(row.module_id, arr);
    }
    return map;
  };

  return (
    <div class="container" style="max-width:720px">
      <h1 class="hero">Dashboard</h1>
      <h3>Domains</h3>
      <Show when={(data()?.domainState?.length ?? 0) > 0}
        fallback={<p class="muted">No completed sessions yet. <A href="/">Start one</A>.</p>}>
        <table style="width:100%;border-collapse:collapse;font-size:.9rem">
          <thead>
            <tr style="border-bottom:1px solid #2a2f38;text-align:left">
              <th style="padding:.4rem">Domain</th>
              <th style="padding:.4rem">Sessions</th>
              <th style="padding:.4rem">Last</th>
              <th style="padding:.4rem">EWMA</th>
              <th style="padding:.4rem">Recent accuracy</th>
            </tr>
          </thead>
          <tbody>
            <For each={data()!.domainState}>{d => {
              const series = seriesByDomain().get(d.module_id) ?? [];
              return (
                <tr style="border-bottom:1px solid #1a1e24">
                  <td style="padding:.4rem">{d.module_id}</td>
                  <td style="padding:.4rem">{d.sessions_total}</td>
                  <td style="padding:.4rem">{d.last_session_ts
                    ? new Date(d.last_session_ts).toLocaleDateString()
                    : '—'}</td>
                  <td style="padding:.4rem">{d.ewma_performance?.toFixed(2) ?? '—'}</td>
                  <td style="padding:.4rem"><Sparkline values={series} /></td>
                </tr>
              );
            }}</For>
          </tbody>
        </table>
      </Show>

      <h3 style="margin-top:2rem">Recent sessions</h3>
      <Show when={(data()?.sessions?.length ?? 0) > 0}
        fallback={<p class="muted">(none)</p>}>
        <ul style="list-style:none;padding:0">
          <For each={data()!.sessions}>{s => (
            <li style="padding:.3rem 0;border-bottom:1px solid #1a1e24">
              <A href={`/results/${s.id}`} style="color:var(--accent)">
                {new Date(s.start_ts).toLocaleString()}
              </A>
              <span class="muted"> — {s.phase}
                {s.end_ts && ` — ${Math.round((s.end_ts - s.start_ts) / 1000)}s`}
              </span>
            </li>
          )}</For>
        </ul>
      </Show>

      <p style="margin-top:2rem" class="muted">
        <A href="/">← Home</A>
      </p>
    </div>
  );
}
