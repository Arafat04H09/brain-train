import { For } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { dbInit } from '~/core/storage/db-client';
import { saveSession } from '~/core/storage/repos';
import { listModules } from '~/core/modules/registry';
import type { SessionPlan } from '~/types/domain';
import type { ModuleId } from '~/types/module';

export function Home() {
  const nav = useNavigate();
  const modules = listModules().filter(m => m.id !== 'placeholder');

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
          {m => (
            <li style="padding:.5rem 0;border-bottom:1px solid #1a1e24;display:flex;align-items:center;justify-content:space-between">
              <div>
                <b>{m.displayName}</b>
                <span class="muted"> · ~{m.estimatedMinutes} min</span>
              </div>
              <button onClick={() => startSingle(m.id, m.estimatedMinutes)}>Start</button>
            </li>
          )}
        </For>
      </ul>
      <p style="margin-top:2rem" class="muted">
        <A href="/dashboard">dashboard</A> · <A href="/stimulus-debug">stimulus debug</A>
      </p>
    </div>
  );
}
