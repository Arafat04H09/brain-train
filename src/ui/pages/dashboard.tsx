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
interface TransferRow {
  ts: number;
  task_id: string;
  score: number;
}

// Task display metadata. `lowerIsBetter` for RT tasks; higher-is-better for accuracy tasks.
const TRANSFER_TASK_META: Record<string, { label: string; lowerIsBetter: boolean; unit: string }> = {
  'matrix-reasoning': { label: 'Matrix Reasoning', lowerIsBetter: false, unit: '% correct' },
  'simple-rt': { label: 'Simple Reaction Time', lowerIsBetter: true, unit: 'ms' }
};

async function loadSummary() {
  await dbInit();
  const sessions = await dbQuery<SessionRow>(
    'SELECT id, phase, start_ts, end_ts, completed FROM sessions WHERE completed = 1 ORDER BY start_ts DESC LIMIT 30'
  );
  const domainState = await dbQuery<DomainRow>(
    'SELECT module_id, ewma_performance, sessions_total, last_session_ts FROM domain_state ORDER BY module_id'
  );
  const perSession = await dbQuery<SessionAccRow>(
    `SELECT b.session_id, b.module_id, AVG(b.actual_accuracy) as accuracy, s.start_ts
     FROM blocks b JOIN sessions s ON s.id = b.session_id
     WHERE b.actual_accuracy IS NOT NULL AND s.completed = 1
     GROUP BY b.session_id, b.module_id
     ORDER BY s.start_ts DESC
     LIMIT 120`
  );
  const transfer = await dbQuery<TransferRow>(
    'SELECT ts, task_id, score FROM transfer_assessments ORDER BY ts ASC'
  );
  return { sessions, domainState, perSession, transfer };
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

      <h3 style="margin-top:2rem">Transfer assessment</h3>
      <Show when={(data()?.transfer?.length ?? 0) > 0}
        fallback={<p class="muted">No baseline yet. <A href="/">Run baseline</A> to enable transfer tracking.</p>}>
        <For each={Object.keys(TRANSFER_TASK_META)}>
          {taskId => {
            const meta = TRANSFER_TASK_META[taskId]!;
            const runs = () => (data()?.transfer ?? []).filter(r => r.task_id === taskId);
            const baseline = () => runs()[0]?.score ?? null;
            const latest = () => {
              const rs = runs();
              return rs.length > 0 ? rs[rs.length - 1]!.score : null;
            };
            const delta = () => {
              const b = baseline(); const l = latest();
              if (b === null || l === null || runs().length < 2) return null;
              const raw = l - b;
              const improved = meta.lowerIsBetter ? raw < 0 : raw > 0;
              const pct = meta.lowerIsBetter
                ? ((b - l) / b) * 100   // RT: shrink = improvement
                : ((l - b) / Math.max(b, 0.01)) * 100;  // accuracy: grow = improvement
              return { improved, pct, raw };
            };
            const fmt = (v: number) =>
              meta.lowerIsBetter ? `${Math.round(v)} ms` : `${(v * 100).toFixed(0)}%`;

            return (
              <div style="margin-bottom:1rem">
                <p style="margin:.4rem 0;font-size:.95rem">
                  <b>{meta.label}</b>
                  <span class="muted" style="margin-left:.5rem">{runs().length} run{runs().length === 1 ? '' : 's'}</span>
                </p>
                <Show when={runs().length > 0}>
                  <p class="muted" style="font-size:.85rem;margin:.2rem 0">
                    Baseline: <b>{fmt(baseline()!)}</b>
                    {' · Latest: '}<b>{fmt(latest()!)}</b>
                    <Show when={delta()}>
                      {d => (
                        <span style={`color:${d().improved ? '#4dff99' : '#ff8a8a'};margin-left:.5rem`}>
                          {d().improved ? '▲' : '▼'} {Math.abs(d().pct).toFixed(0)}%
                          {d().improved ? ' improved' : ' declined'}
                        </span>
                      )}
                    </Show>
                  </p>
                </Show>
                <Show when={runs().length >= 2}>
                  <Sparkline
                    values={meta.lowerIsBetter
                      ? runs().map(r => {
                          // Invert so the sparkline goes UP for improvement.
                          // Normalize against the worst run to fit in 0-1 range.
                          const vals = runs().map(x => x.score);
                          const worst = Math.max(...vals);
                          return worst === 0 ? 0.5 : 1 - (r.score / worst);
                        })
                      : runs().map(r => r.score)}
                    width={300}
                    height={32}
                  />
                </Show>
              </div>
            );
          }}
        </For>
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
