import { createResource, Show, For } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { dbInit, dbExec } from '~/core/storage/db-client';
import { getDomainState, saveSession } from '~/core/storage/repos';
import { computePhase } from '~/core/orchestrator/phases';
import { composeSession } from '~/core/orchestrator/session-composer';
import { listModules } from '~/core/modules/registry';
import type { DomainState } from '~/types/domain';

async function buildPlan() {
  await dbInit();
  const oneHourAgo = Date.now() - 3600_000;
  await dbExec('DELETE FROM sessions WHERE completed = 0 AND start_ts < ?', [oneHourAgo]);
  const states: DomainState[] = [];
  for (const m of listModules().filter(m => m.id !== 'placeholder' && m.id !== 'transfer-battery')) {
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
    <div class="container" style="max-width: 600px">
      <header style="margin-bottom: 3rem">
        <div class="flex-between">
          <h1 class="hero" style="margin: 0">Today's Protocol</h1>
          <A href="/" class="muted" style="text-decoration: underline">← Cancel</A>
        </div>
        <p class="muted">Orchestrator has composed your daily cognitive load.</p>
      </header>

      <Show when={plan()} fallback={
        <div class="panel" style="text-align: center; padding: 3rem">
          <div class="mono muted">COMPOSING SESSION...</div>
        </div>
      }>
        {p => (
          <div>
            <div class="panel" style="border-left: 4px solid var(--accent)">
              <div class="muted" style="font-size: 0.75rem; text-transform: uppercase; margin-bottom: 0.5rem">Protocol Phase</div>
              <div class="mono" style="font-size: 1.25rem; color: var(--accent); margin-bottom: 1.5rem">{p().phase}</div>
              
              <div class="muted" style="font-size: 0.75rem; text-transform: uppercase; margin-bottom: 1rem">Module Sequence</div>
              <div style="display: grid; gap: 0.75rem; margin-bottom: 2rem">
                <For each={p().modules}>
                  {m => (
                    <div class="flex-between" style="padding: 0.75rem; background: rgba(255,255,255,0.03); border-radius: 4px; border: 1px solid var(--panel-border)">
                      <div class="mono" style="font-size: 0.9rem">{m.moduleId}</div>
                      <div class="muted mono" style="font-size: 0.8rem">{m.targetMinutes.toFixed(0)}m</div>
                    </div>
                  )}
                </For>
              </div>

              <button class="primary" onClick={() => nav(`/session/${p().id}`)} style="width: 100%; padding: 1rem; font-size: 1.1rem">
                Initialize Session →
              </button>
            </div>

            <div class="panel" style="background: transparent; border-style: dashed; opacity: 0.7">
              <h4 style="font-size: 0.8rem; text-transform: uppercase; color: var(--muted); margin-bottom: 0.5rem">Orchestrator Note</h4>
              <p class="muted" style="font-size: 0.85rem; line-height: 1.5; margin: 0">
                This session interleaves {p().modules.length} domains to maximize process overlap. 
                Adaptive difficulty will be locked to your current threshold. 
                Metacognitive calibration is enabled for all blocks.
              </p>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}
