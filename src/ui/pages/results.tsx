import { createResource, Show, For } from 'solid-js';
import { A, useParams } from '@solidjs/router';
import { dbInit, dbQuery } from '~/core/storage/db-client';
import { brierScore, brierDecomposition } from '~/core/adaptive/brier';

interface BlockRow {
  id: string;
  module_id: string;
  block_index: number;
  kind: string;
  actual_accuracy: number | null;
  metacog_prediction: number | null;
  adaptive_params_json: string;
}
interface TrialAggRow {
  block_id: string;
  total: number;
  correct: number;
  avg_rt: number | null;
}
interface CalibTrialRow {
  correct: number;
  response_json: string;
}
interface TransferHistRow {
  ts: number;
  task_id: string;
  score: number;
}

async function loadResults(sessionId: string) {
  await dbInit();
  const sessions = await dbQuery<{ plan_json: string; start_ts: number; end_ts: number | null; phase: string }>(
    'SELECT plan_json, start_ts, end_ts, phase FROM sessions WHERE id = ?', [sessionId]
  );
  const session = sessions[0] ?? null;
  const blocks = await dbQuery<BlockRow>(
    'SELECT id, module_id, block_index, kind, actual_accuracy, metacog_prediction, adaptive_params_json FROM blocks WHERE session_id = ? ORDER BY block_index',
    [sessionId]
  );
  const trials = await dbQuery<TrialAggRow>(
    `SELECT block_id, COUNT(*) as total, SUM(correct) as correct, AVG(rt_ms) as avg_rt
     FROM trials WHERE block_id IN (SELECT id FROM blocks WHERE session_id = ?)
     GROUP BY block_id`,
    [sessionId]
  );
  const trialsByBlock = new Map<string, TrialAggRow>();
  for (const t of trials) trialsByBlock.set(t.block_id, t);

  let calibration: {
    count: number;
    accuracy: number;
    brier: number;
    decomposition: { reliability: number; resolution: number; uncertainty: number };
    bins: { bin: string; n: number; meanConf: number; accuracy: number }[];
  } | null = null;
  if (blocks.some(b => b.module_id === 'calibration')) {
    const calibTrials = await dbQuery<CalibTrialRow>(
      `SELECT correct, response_json FROM trials
       WHERE block_id IN (SELECT id FROM blocks WHERE session_id = ? AND module_id = 'calibration')`,
      [sessionId]
    );
    const points = calibTrials
      .map(t => {
        try {
          const resp = JSON.parse(t.response_json);
          const payload = typeof resp?.event?.value === 'string' ? JSON.parse(resp.event.value) : null;
          const conf = typeof payload?.confidence === 'number' ? payload.confidence / 100 : null;
          if (conf === null) return null;
          return { p: conf, outcome: t.correct ? 1 as const : 0 as const };
        } catch { return null; }
      })
      .filter((x): x is { p: number; outcome: 0 | 1 } => x !== null);

    if (points.length > 0) {
      const acc = points.reduce((s, p) => s + p.outcome, 0) / points.length;
      const b = brierScore(points);
      const d = brierDecomposition(points, 5);
      const bucketEdges = [0.25, 0.4, 0.55, 0.7, 0.85, 1.01];
      const bins = bucketEdges.slice(0, -1).map((lo, i) => {
        const hi = bucketEdges[i + 1]!;
        const items = points.filter(p => p.p >= lo && p.p < hi);
        return {
          bin: `${Math.round(lo * 100)}-${Math.round((hi - 0.01) * 100)}%`,
          n: items.length,
          meanConf: items.length ? items.reduce((s, p) => s + p.p, 0) / items.length : 0,
          accuracy: items.length ? items.reduce((s, p) => s + p.outcome, 0) / items.length : 0
        };
      });
      calibration = {
        count: points.length,
        accuracy: acc,
        brier: b,
        decomposition: { reliability: d.reliability, resolution: d.resolution, uncertainty: d.uncertainty },
        bins
      };
    }
  }

  let transferHistory: Record<string, TransferHistRow[]> | null = null;
  if (blocks.some(b => b.module_id === 'transfer-battery')) {
    const rows = await dbQuery<TransferHistRow>(
      'SELECT ts, task_id, score FROM transfer_assessments ORDER BY ts ASC'
    );
    transferHistory = {};
    for (const r of rows) {
      (transferHistory[r.task_id] ??= []).push(r);
    }
  }

  return { session, blocks, trialsByBlock, calibration, transferHistory };
}

const TRANSFER_TASKS: Array<{ id: string; label: string; lowerIsBetter: boolean; fmt: (v: number) => string }> = [
  { id: 'matrix-reasoning', label: 'Matrix Reasoning', lowerIsBetter: false, fmt: v => `${(v * 100).toFixed(0)}%` },
  { id: 'simple-rt', label: 'Simple Reaction Time', lowerIsBetter: true, fmt: v => `${Math.round(v)}ms` },
  { id: 'flanker-inhibition', label: 'Flanker (Inhibition)', lowerIsBetter: true, fmt: v => `${Math.round(v)}ms` }
];

function TransferSection(props: { history: Record<string, TransferHistRow[]> }) {
  const isFirstAssessment = () => {
    const counts = Object.values(props.history).map(a => a.length);
    return counts.length === 0 || counts.every(n => n <= 1);
  };
  return (
    <section class="panel" style="margin-top: 2rem; border-left: 4px solid #f2c94c">
      <h3 style="font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1.5rem">Transfer Effects</h3>
      <Show when={isFirstAssessment()}>
        <p class="muted" style="margin-bottom: 1rem">
          Baseline recorded. Subsequent assessments will track longitudinal change.
        </p>
      </Show>
      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th>Baseline</th>
            <th>Current</th>
            <th>Delta</th>
          </tr>
        </thead>
        <tbody>
          <For each={TRANSFER_TASKS}>
            {task => {
              const runs = props.history[task.id] ?? [];
              const latest = runs.length > 0 ? runs[runs.length - 1]!.score : null;
              const baseline = runs.length > 0 ? runs[0]!.score : null;
              const isBaseline = runs.length <= 1;
              const delta = !isBaseline && baseline !== null && latest !== null
                ? deltaLabel(baseline, latest, task.lowerIsBetter)
                : null;
              return (
                <tr>
                  <td><b style="color: var(--fg)">{task.label}</b></td>
                  <td class="mono">{baseline !== null ? task.fmt(baseline) : '—'}</td>
                  <td class="mono">{latest !== null ? task.fmt(latest) : '—'}</td>
                  <td class="mono" style={`color:${delta?.color ?? 'var(--muted)'}`}>
                    {isBaseline ? 'BASELINE' : (delta?.text ?? '—')}
                  </td>
                </tr>
              );
            }}
          </For>
        </tbody>
      </table>
    </section>
  );
}

function deltaLabel(
  baseline: number,
  current: number,
  lowerIsBetter: boolean
): { text: string; color: string } {
  if (baseline === current) return { text: '±0%', color: 'var(--muted)' };
  const improved = lowerIsBetter ? current < baseline : current > baseline;
  const pct = lowerIsBetter
    ? ((baseline - current) / baseline) * 100
    : ((current - baseline) / Math.max(baseline, 0.01)) * 100;
  return {
    text: `${improved ? '▲' : '▼'} ${Math.abs(pct).toFixed(0)}%`,
    color: improved ? '#4dff99' : '#ff8a8a'
  };
}

export function Results() {
  const params = useParams();
  const [data] = createResource(() => params.sessionId!, loadResults);

  return (
    <div class="container" style="max-width: 800px">
      <header style="margin-bottom: 3rem">
        <div class="flex-between">
          <h1 class="hero" style="margin: 0">Session Complete</h1>
          <div class="mono" style="font-size: 0.75rem; color: var(--accent); text-transform: uppercase; letter-spacing: 0.1em">
            Data Processed
          </div>
        </div>
        <Show when={data()?.session}>
          {s => (
            <p class="muted">
              Phase: <span class="mono" style="color: var(--fg)">{s().phase}</span> · 
              Duration: <span class="mono" style="color: var(--fg)">{s().start_ts && s().end_ts ? Math.round((s().end_ts! - s().start_ts) / 1000) : 0}s</span>
            </p>
          )}
        </Show>
      </header>

      <Show when={data()} fallback={<p class="muted mono">INITIALIZING ANALYTICS ENGINE…</p>}>
        {d => (
          <div>
            <section class="panel">
              <h3 style="font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1.5rem">Performance Breakdown</h3>
              <Show when={d().blocks.length > 0} fallback={<p class="muted">No telemetry captured.</p>}>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Module</th>
                      <th>Accuracy</th>
                      <th>Pred. (Brier)</th>
                      <th>Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={d().blocks}>
                      {b => {
                        const t = d().trialsByBlock.get(b.id);
                        const isRT = b.kind === 'simple-rt' || b.kind === 'flanker-assessment';
                        const acc = !isRT && t && t.total > 0 ? t.correct / t.total : null;
                        const predicted = b.metacog_prediction;
                        const brierPoint = predicted !== null && acc !== null
                          ? Math.pow(predicted - acc, 2).toFixed(3)
                          : '—';
                        return (
                          <tr>
                            <td class="mono muted">{b.block_index + 1}</td>
                            <td class="mono" style="color: var(--accent)">{b.kind}</td>
                            <td class="mono">{isRT
                              ? (t?.avg_rt ? `${Math.round(t.avg_rt)}ms` : '—')
                              : (acc !== null ? (acc * 100).toFixed(0) + '%' : '—')}</td>
                            <td class="mono">
                              {!isRT && predicted !== null ? `${(predicted * 100).toFixed(0)}%` : '—'}
                              <span class="muted" style="font-size: 0.75rem; margin-left: 0.5rem">({!isRT ? brierPoint : '—'})</span>
                            </td>
                            <td class="mono">{!isRT && t?.avg_rt ? `${Math.round(t.avg_rt)}ms` : '—'}</td>
                          </tr>
                        );
                      }}
                    </For>
                  </tbody>
                </table>
              </Show>
            </section>

            <Show when={d().blocks.some(b => b.module_id === 'transfer-battery')}>
              <TransferSection history={d().transferHistory ?? {}} />
            </Show>

            <Show when={d().calibration}>
              {c => (
                <section class="panel" style="margin-top: 2rem">
                  <div class="flex-between" style="margin-bottom: 1.5rem">
                    <h3 style="font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; margin: 0">Calibration Reliability</h3>
                    <div class="mono" style="font-size: 1.25rem; color: var(--accent)">{c().brier.toFixed(3)} <span class="muted" style="font-size: 0.7rem">BRIER</span></div>
                  </div>
                  
                  <div class="card-grid" style="margin-bottom: 1.5rem">
                    <div>
                      <div class="muted" style="font-size: 0.7rem; text-transform: uppercase">Reliability</div>
                      <div class="mono">{c().decomposition.reliability.toFixed(3)}</div>
                    </div>
                    <div>
                      <div class="muted" style="font-size: 0.7rem; text-transform: uppercase">Resolution</div>
                      <div class="mono">{c().decomposition.resolution.toFixed(3)}</div>
                    </div>
                  </div>

                  <table>
                    <thead>
                      <tr>
                        <th>Confidence Bin</th>
                        <th>N</th>
                        <th>Mean Stated</th>
                        <th>Actual Accuracy</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={c().bins}>
                        {b => {
                          const gap = b.n === 0 ? null : b.accuracy - b.meanConf;
                          const gapLabel = gap === null
                            ? '—'
                            : Math.abs(gap) < 0.05 ? 'CALIBRATED'
                            : gap > 0 ? 'UNDERCONFIDENT'
                            : 'OVERCONFIDENT';
                          return (
                            <tr>
                              <td class="mono">{b.bin}</td>
                              <td class="mono">{b.n}</td>
                              <td class="mono">{b.n ? (b.meanConf * 100).toFixed(0) + '%' : '—'}</td>
                              <td class="mono">{b.n ? (b.accuracy * 100).toFixed(0) + '%' : '—'}</td>
                              <td class="mono" style={`font-size: 0.75rem; color: ${gap === null || Math.abs(gap) < 0.05 ? 'var(--muted)' : (gap > 0 ? '#7aa2ff' : '#ff8a8a')}`}>
                                {gapLabel}
                              </td>
                            </tr>
                          );
                        }}
                      </For>
                    </tbody>
                  </table>
                </section>
              )}
            </Show>

            <footer style="margin-top: 4rem; padding-top: 2rem; border-top: 1px solid var(--panel-border); display: flex; gap: 1.5rem">
              <A href="/" class="muted" style="text-decoration: underline">Home Terminal</A>
              <A href="/dashboard" class="muted" style="text-decoration: underline">Longitudinal Analytics</A>
            </footer>
          </div>
        )}
      </Show>
    </div>
  );
}
