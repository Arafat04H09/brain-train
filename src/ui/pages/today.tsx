import { createResource, Show } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { dbInit, dbExec } from '~/core/storage/db-client';
import { getDomainState, saveSession } from '~/core/storage/repos';
import { computePhase } from '~/core/orchestrator/phases';
import { composeSession } from '~/core/orchestrator/session-composer';
import { listModules } from '~/core/modules/registry';
import type { DomainState } from '~/types/domain';

async function buildPlan() {
  await dbInit();
  // Clean up stale incomplete sessions (> 1 hour old) so the DB doesn't bloat
  // with abandoned plans from every /today visit.
  const oneHourAgo = Date.now() - 3600_000;
  await dbExec('DELETE FROM sessions WHERE completed = 0 AND start_ts < ?', [oneHourAgo]);
  const states: DomainState[] = [];
  for (const m of listModules().filter(m => m.id !== 'placeholder')) {
    const s = await getDomainState(m.id) ?? {
      moduleId: m.id, level: {}, ewmaPerformance: 0,
      lastSessionTs: null, sessionsTotal: 0,
      plateauFlag: false, updatedTs: Date.now()
    };
    states.push(s);
  }
  const phase = computePhase({
    sessionsTotal: states.reduce((s, d) => s + d.sessionsTotal, 0),
    weeksActive: 1
  });
  const plan = composeSession({ phase, states, targetMinutes: 25 });
  await saveSession(plan);
  return plan;
}

export function Today() {
  const [plan] = createResource(buildPlan);
  const nav = useNavigate();
  return (
    <div class="container">
      <h1 class="hero">Today</h1>
      <Show when={plan()} fallback={<p class="muted">Composing session…</p>}>
        {p => (
          <div>
            <p>Phase: <b>{p().phase}</b></p>
            <p>Modules:</p>
            <ul>
              {p().modules.map(m => <li>{m.moduleId} — {m.targetMinutes.toFixed(0)} min</li>)}
            </ul>
            <button onClick={() => nav(`/session/${p().id}`)}>Start session</button>
          </div>
        )}
      </Show>
    </div>
  );
}
