import { createSignal, onMount, Show } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { getModule } from '~/core/modules/registry';
import { getDomainState, saveBlock, saveTrial, completeSession, upsertDomainState } from '~/core/storage/repos';
import { runTrial } from '~/core/stimulus/engine-client';
import type { Session } from '~/types/module';

export function SessionRunner() {
  const params = useParams();
  const nav = useNavigate();
  const [session, setSession] = createSignal<Session | null>(null);
  const [status, setStatus] = createSignal('initializing');
  const [log, setLog] = createSignal<string[]>([]);

  onMount(async () => {
    const m = getModule('placeholder')!;
    const state = await getDomainState('placeholder') ?? {
      moduleId: 'placeholder' as const, level: {}, ewmaPerformance: 0,
      lastSessionTs: null, sessionsTotal: 0, plateauFlag: false, updatedTs: Date.now()
    };
    const s = m.createSession(state);
    setSession(s);
    const blockId = crypto.randomUUID();
    await saveBlock({
      id: blockId, sessionId: params.sessionId!,
      moduleId: 'placeholder', blockIndex: 0, kind: 'placeholder-block',
      adaptiveParams: {}
    });
    setStatus('running');
    runSession(s, blockId);
  });

  async function runSession(s: Session, blockId: string) {
    let trial = s.nextTrial();
    while (trial) {
      setLog(l => [...l, `trial ${trial!.trialIndex}`]);
      const resp = await runTrial(trial);
      const result = await s.submit(resp);
      await saveTrial({
        id: trial.id, blockId, trialIndex: trial.trialIndex,
        stimulus: trial.stimulus, response: resp,
        correct: result.correct, rtMs: result.rtMs ?? 0,
        requestedDurationMs: resp.timing.requestedDurationMs,
        achievedDurationMs: resp.timing.achievedDurationMs,
        framesRendered: resp.timing.framesRendered,
        timingFlag: resp.timing.timingFlag
      });
      trial = s.nextTrial();
    }
    const result = s.complete();
    await completeSession(params.sessionId!);
    await upsertDomainState(result.nextDomainState);
    setStatus('done');
    nav(`/results/${params.sessionId}`);
  }

  return (
    <div class="container">
      <h1 class="hero">Session</h1>
      <p class="muted">Status: {status()}</p>
      <Show when={session()}>
        <ul>{log().map(l => <li>{l}</li>)}</ul>
      </Show>
    </div>
  );
}
