import { createResource, createSignal, For, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { dbInit, dbQuery } from '~/core/storage/db-client';

async function exportAllData() {
  await dbInit();
  const [sessions, blocks, trials, domainState, metacog, transfer, calibrationReviews] =
    await Promise.all([
      dbQuery<Record<string, unknown>>('SELECT * FROM sessions ORDER BY start_ts'),
      dbQuery<Record<string, unknown>>('SELECT * FROM blocks ORDER BY session_id, block_index'),
      dbQuery<Record<string, unknown>>('SELECT * FROM trials ORDER BY block_id, trial_index'),
      dbQuery<Record<string, unknown>>('SELECT * FROM domain_state'),
      dbQuery<Record<string, unknown>>('SELECT * FROM metacog_predictions'),
      dbQuery<Record<string, unknown>>('SELECT * FROM transfer_assessments ORDER BY ts'),
      dbQuery<Record<string, unknown>>('SELECT * FROM calibration_reviews ORDER BY ts'),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    sessions,
    blocks,
    trials: trials.map(t => ({
      ...t,
      stimulus: typeof t.stimulus_json === 'string' ? JSON.parse(t.stimulus_json as string) : t.stimulus_json,
      response: typeof t.response_json === 'string' ? JSON.parse(t.response_json as string) : t.response_json,
    })),
    domainState,
    metacogPredictions: metacog,
    transferAssessments: transfer,
    calibrationReviews,
  };
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCsv(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;
  const keys = Object.keys(rows[0]!);
  const lines = [keys.join(',')];
  for (const row of rows) {
    lines.push(keys.map(k => {
      const v = row[k];
      if (v === null || v === undefined) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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
interface MetacogStats {
  meanBrier: number | null;
  totalPredictions: number;
}

const TRANSFER_TASK_META: Record<string, { label: string; lowerIsBetter: boolean; unit: string }> = {
  'matrix-reasoning': { label: 'Matrix Reasoning', lowerIsBetter: false, unit: '% correct' },
  'simple-rt': { label: 'Simple Reaction Time', lowerIsBetter: true, unit: 'ms' },
  'flanker-inhibition': { label: 'Flanker (Inhibition)', lowerIsBetter: true, unit: 'ms conflict cost' },
  'digit-span': { label: 'Digit Span (STM)', lowerIsBetter: false, unit: 'max span' }
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
  const metacog = await dbQuery<{ brier: number }>(
    'SELECT brier_contribution as brier FROM metacog_predictions WHERE brier_contribution IS NOT NULL'
  );

  const meanBrier = metacog.length > 0 
    ? metacog.reduce((acc, curr) => acc + curr.brier, 0) / metacog.length 
    : null;

  return { 
    sessions, 
    domainState, 
    perSession, 
    transfer,
    metacog: { meanBrier, totalPredictions: metacog.length } as MetacogStats
  };
}

function Sparkline(props: { values: number[]; width?: number; height?: number; color?: string }) {
  const w = () => props.width ?? 140;
  const h = () => props.height ?? 28;
  const color = () => props.color ?? '#7aa2ff';
  const path = () => {
    const vs = props.values;
    if (vs.length === 0) return '';
    if (vs.length === 1) return `M 0 ${h() / 2} L ${w()} ${h() / 2}`;
    const step = w() / (vs.length - 1);
    const min = Math.min(...vs);
    const max = Math.max(...vs);
    const range = max - min || 1;
    
    return vs.map((v, i) => {
      const x = i * step;
      const y = h() - ((v - min) / range) * h() * 0.8 - (h() * 0.1);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };
  return (
    <svg width={w()} height={h()} style="display: block">
      <path d={path()} stroke={color()} stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

export function Dashboard() {
  const [data] = createResource(loadSummary);
  const [exporting, setExporting] = createSignal(false);

  async function handleExportJson() {
    setExporting(true);
    try {
      const d = await exportAllData();
      const ts = new Date().toISOString().slice(0, 10);
      downloadJson(d, `intellect-forge-${ts}.json`);
    } finally { setExporting(false); }
  }

  async function handleExportCsv() {
    setExporting(true);
    try {
      await dbInit();
      const trials = await dbQuery<Record<string, unknown>>('SELECT * FROM trials ORDER BY block_id, trial_index');
      const ts = new Date().toISOString().slice(0, 10);
      downloadCsv(trials, `intellect-forge-trials-${ts}.csv`);
    } finally { setExporting(false); }
  }

  const seriesByDomain = () => {
    const d = data();
    if (!d) return new Map<string, number[]>();
    const map = new Map<string, number[]>();
    const chronological = [...d.perSession].reverse();
    for (const row of chronological) {
      const arr = map.get(row.module_id) ?? [];
      arr.push(row.accuracy);
      map.set(row.module_id, arr);
    }
    return map;
  };

  return (
    <div class="container" style="max-width: 900px">
      <header style="margin-bottom: 3rem">
        <div class="flex-between">
          <h1 class="hero" style="margin: 0">Analytics Dashboard</h1>
          <A href="/" class="muted" style="text-decoration: underline">&larr; Back to Terminal</A>
        </div>
        <div class="flex-between" style="margin-top: 0.5rem">
          <p class="muted" style="margin: 0">Longitudinal cognitive performance tracking.</p>
          <div style="display: flex; gap: 0.5rem">
            <button style="font-size:.75rem;padding:.3rem .7rem" onClick={handleExportJson} disabled={exporting()}>
              {exporting() ? 'Exporting\u2026' : 'Export JSON'}
            </button>
            <button style="font-size:.75rem;padding:.3rem .7rem" onClick={handleExportCsv} disabled={exporting()}>
              Export Trials CSV
            </button>
          </div>
        </div>
      </header>

      <div class="card-grid" style="margin-bottom: 2rem">
        <div class="panel">
          <div class="muted" style="font-size: 0.75rem; text-transform: uppercase; margin-bottom: 0.5rem">Metacognitive Calibration</div>
          <div class="flex-between" style="align-items: flex-end">
            <div>
              <div class="mono" style="font-size: 1.5rem; color: var(--accent)">
                {data()?.metacog.meanBrier?.toFixed(3) ?? '0.000'}
              </div>
              <div class="muted" style="font-size: 0.7rem">Mean Brier Score (lower is better)</div>
            </div>
            <div class="mono" style="font-size: 0.8rem">{data()?.metacog.totalPredictions ?? 0} samples</div>
          </div>
        </div>
        <div class="panel">
          <div class="muted" style="font-size: 0.75rem; text-transform: uppercase; margin-bottom: 0.5rem">Current Training Phase</div>
          <div class="mono" style="font-size: 1.5rem">
            {data()?.sessions[0]?.phase ?? 'ramp'}
          </div>
          <div class="muted" style="font-size: 0.7rem">Based on latest {data()?.sessions.length ?? 0} sessions</div>
        </div>
      </div>

      <section class="panel">
        <h3 style="font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1.5rem">Cognitive Domain Efficiency</h3>
        <Show when={(data()?.domainState?.length ?? 0) > 0}
          fallback={<p class="muted">Insufficient data. Complete more sessions to generate trends.</p>}>
          <table>
            <thead>
              <tr>
                <th>Domain</th>
                <th>Sessions</th>
                <th>Performance (EWMA)</th>
                <th>Trend (Accuracy)</th>
              </tr>
            </thead>
            <tbody>
              <For each={data()!.domainState}>{d => {
                const series = seriesByDomain().get(d.module_id) ?? [];
                return (
                  <tr>
                    <td class="mono" style="color: var(--accent)">{d.module_id}</td>
                    <td class="mono">{d.sessions_total}</td>
                    <td class="mono">{d.ewma_performance?.toFixed(3) ?? '—'}</td>
                    <td><Sparkline values={series} width={180} /></td>
                  </tr>
                );
              }}</For>
            </tbody>
          </table>
        </Show>
      </section>

      <div class="card-grid" style="margin-top: 2rem">
        <section class="panel" style="grid-column: span 2">
          <h3 style="font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1.5rem">Transfer Assessments</h3>
          <Show when={(data()?.transfer?.length ?? 0) > 0}
            fallback={<p class="muted">No transfer assessments recorded yet.</p>}>
            <div style="display: grid; gap: 2rem">
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
                      ? ((b - l) / b) * 100
                      : ((l - b) / Math.max(b, 0.01)) * 100;
                    return { improved, pct };
                  };
                  const fmt = (v: number) =>
                    meta.lowerIsBetter ? `${Math.round(v)}ms` : `${(v * 100).toFixed(1)}%`;

                  return (
                    <div style="padding-bottom: 1rem; border-bottom: 1px solid var(--panel-border)">
                      <div class="flex-between" style="margin-bottom: 0.5rem">
                        <div class="mono" style="font-size: 0.9rem">{meta.label}</div>
                        <Show when={delta()}>
                          {d => (
                            <div class="mono" style={`font-size: 0.8rem; color:${d().improved ? '#4dff99' : '#ff8a8a'}`}>
                              {d().improved ? '▲' : '▼'} {Math.abs(d().pct).toFixed(1)}%
                            </div>
                          )}
                        </Show>
                      </div>
                      <div class="flex-between">
                        <div>
                          <div class="muted" style="font-size: 0.7rem">BASELINE</div>
                          <div class="mono" style="font-size: 1.1rem">{baseline() !== null ? fmt(baseline()!) : '—'}</div>
                        </div>
                        <div style="flex: 1; margin: 0 2rem">
                          <Sparkline 
                            values={runs().map(r => r.score)} 
                            width={200} 
                            height={30} 
                            color={delta()?.improved ? '#4dff99' : '#7aa2ff'} 
                          />
                        </div>
                        <div style="text-align: right">
                          <div class="muted" style="font-size: 0.7rem">LATEST</div>
                          <div class="mono" style="font-size: 1.1rem">{latest() !== null ? fmt(latest()!) : '—'}</div>
                        </div>
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>
          </Show>
        </section>

        <section class="panel">
          <h3 style="font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1.5rem">Recent Session Log</h3>
          <Show when={(data()?.sessions?.length ?? 0) > 0} fallback={<p class="muted">No sessions.</p>}>
            <div style="display: grid; gap: 0.75rem">
              <For each={data()!.sessions}>{s => (
                <div class="flex-between" style="font-size: 0.85rem">
                  <A href={`/results/${s.id}`} style="color:var(--accent)" class="mono">
                    {new Date(s.start_ts).toLocaleDateString()}
                  </A>
                  <span class="muted mono" style="font-size: 0.75rem">{s.phase}</span>
                </div>
              )}</For>
            </div>
          </Show>
        </section>
      </div>
    </div>
  );
}
