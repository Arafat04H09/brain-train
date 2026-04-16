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

  // Calibration-specific: fetch per-trial confidence data if any calibration
  // block is in this session.
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
      // Bucket into 10% bins from 50-100%
      const bucketEdges = [0.5, 0.6, 0.7, 0.8, 0.9, 1.01];
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

  return { session, blocks, trialsByBlock, calibration };
}

export function Results() {
  const params = useParams();
  const [data] = createResource(() => params.sessionId!, loadResults);

  return (
    <div class="container">
      <h1 class="hero">Session complete</h1>
      <Show when={data()} fallback={<p class="muted">Loading…</p>}>
        {d => (
          <div>
            <p class="muted">
              Phase: <b>{d().session?.phase ?? '—'}</b>
              {d().session?.start_ts && d().session?.end_ts &&
                ` · Duration: ${Math.round(((d().session!.end_ts! - d().session!.start_ts) / 1000))}s`}
            </p>
            <h3>Blocks</h3>
            <Show when={d().blocks.length > 0} fallback={<p class="muted">No block data recorded.</p>}>
              <table style="width:100%;border-collapse:collapse;font-size:.9rem">
                <thead>
                  <tr style="border-bottom:1px solid #2a2f38;text-align:left">
                    <th style="padding:.4rem">#</th>
                    <th style="padding:.4rem">Kind</th>
                    <th style="padding:.4rem">Trials</th>
                    <th style="padding:.4rem">Accuracy</th>
                    <th style="padding:.4rem">Predicted</th>
                    <th style="padding:.4rem">Avg RT</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={d().blocks}>
                    {b => {
                      const t = d().trialsByBlock.get(b.id);
                      const acc = t && t.total > 0 ? t.correct / t.total : null;
                      const predicted = b.metacog_prediction;
                      const brierPoint = predicted !== null && acc !== null
                        ? Math.pow(predicted - acc, 2).toFixed(3)
                        : '—';
                      return (
                        <tr style="border-bottom:1px solid #1a1e24">
                          <td style="padding:.4rem">{b.block_index + 1}</td>
                          <td style="padding:.4rem">{b.kind}</td>
                          <td style="padding:.4rem">{t ? `${t.correct}/${t.total}` : '—'}</td>
                          <td style="padding:.4rem">{acc !== null ? (acc * 100).toFixed(0) + '%' : '—'}</td>
                          <td style="padding:.4rem">
                            {predicted !== null ? `${(predicted * 100).toFixed(0)}% (Brier ${brierPoint})` : '—'}
                          </td>
                          <td style="padding:.4rem">{t?.avg_rt ? `${Math.round(t.avg_rt)}ms` : '—'}</td>
                        </tr>
                      );
                    }}
                  </For>
                </tbody>
              </table>
            </Show>

            <Show when={d().blocks.some(b => b.module_id === 'transfer-battery')}>
              <div style="margin-top:2rem">
                <h3>Transfer Assessment</h3>
                <table style="width:100%;border-collapse:collapse;font-size:.9rem">
                  <thead>
                    <tr style="border-bottom:1px solid #2a2f38;text-align:left">
                      <th style="padding:.4rem">Task</th>
                      <th style="padding:.4rem">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style="border-bottom:1px solid #1a1e24">
                      <td style="padding:.4rem"><b>ICAR Matrix (Reasoning)</b></td>
                      <td style="padding:.4rem">
                        {(() => {
                          const matrixBlock = d().blocks.find(b => b.kind === 'assessment-matrix');
                          const matrixAcc = matrixBlock && d().trialsByBlock.get(matrixBlock.id)
                            ? d().trialsByBlock.get(matrixBlock.id)!.correct / d().trialsByBlock.get(matrixBlock.id)!.total
                            : null;
                          return matrixAcc !== null ? (matrixAcc * 100).toFixed(0) + '%' : '—';
                        })()}
                      </td>
                    </tr>
                    <tr style="border-bottom:1px solid #1a1e24">
                      <td style="padding:.4rem"><b>Simple Reaction Time</b></td>
                      <td style="padding:.4rem">
                        {(() => {
                          const rtBlock = d().blocks.find(b => b.kind === 'simple-rt');
                          const rtMean = rtBlock && d().trialsByBlock.get(rtBlock.id)
                            ? d().trialsByBlock.get(rtBlock.id)!.avg_rt
                            : null;
                          return rtMean !== null ? Math.round(rtMean) + 'ms' : '—';
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Show>

            <Show when={d().calibration}>
              {c => (
                <div style="margin-top:2rem">
                  <h3>Calibration</h3>
                  <p class="muted">
                    {c().count} items · accuracy {(c().accuracy * 100).toFixed(0)}% ·
                    Brier <b>{c().brier.toFixed(3)}</b>
                    <span class="muted" style="margin-left:.4rem">(lower is better; 0 = perfect)</span>
                  </p>
                  <p class="muted" style="font-size:.85rem">
                    reliability {c().decomposition.reliability.toFixed(3)} ·
                    resolution {c().decomposition.resolution.toFixed(3)} ·
                    uncertainty {c().decomposition.uncertainty.toFixed(3)}
                  </p>
                  <table style="width:100%;border-collapse:collapse;font-size:.85rem;margin-top:.6rem">
                    <thead>
                      <tr style="border-bottom:1px solid #2a2f38;text-align:left">
                        <th style="padding:.3rem">Confidence bin</th>
                        <th style="padding:.3rem">N</th>
                        <th style="padding:.3rem">Mean stated</th>
                        <th style="padding:.3rem">Actual accuracy</th>
                        <th style="padding:.3rem">Calibration</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={c().bins}>
                        {b => {
                          const gap = b.n === 0 ? null : b.accuracy - b.meanConf;
                          const gapLabel = gap === null
                            ? '—'
                            : Math.abs(gap) < 0.05 ? 'calibrated'
                            : gap > 0 ? `underconfident by ${(gap * 100).toFixed(0)}pt`
                            : `overconfident by ${(-gap * 100).toFixed(0)}pt`;
                          return (
                            <tr style="border-bottom:1px solid #1a1e24">
                              <td style="padding:.3rem">{b.bin}</td>
                              <td style="padding:.3rem">{b.n}</td>
                              <td style="padding:.3rem">{b.n ? (b.meanConf * 100).toFixed(0) + '%' : '—'}</td>
                              <td style="padding:.3rem">{b.n ? (b.accuracy * 100).toFixed(0) + '%' : '—'}</td>
                              <td style="padding:.3rem">{gapLabel}</td>
                            </tr>
                          );
                        }}
                      </For>
                    </tbody>
                  </table>
                </div>
              )}
            </Show>

            <p style="margin-top:2rem">
              <A href="/">← Home</A> · <A href="/dashboard">Dashboard</A>
            </p>
          </div>
        )}
      </Show>
    </div>
  );
}
