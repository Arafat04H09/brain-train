import { createResource, Show, For } from 'solid-js';
import { A, useParams } from '@solidjs/router';
import { dbInit, dbQuery } from '~/core/storage/db-client';

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
  return { session, blocks, trialsByBlock };
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
            <p style="margin-top:2rem">
              <A href="/">← Home</A> · <A href="/dashboard">Dashboard</A>
            </p>
          </div>
        )}
      </Show>
    </div>
  );
}
