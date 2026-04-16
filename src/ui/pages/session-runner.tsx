import { createSignal, onMount, Show } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { getModule } from '~/core/modules/registry';
import { dbQuery } from '~/core/storage/db-client';
import { getDomainState, saveBlock, saveTrial, completeSession, upsertDomainState, saveMetacogPrediction } from '~/core/storage/repos';
import { runTrial } from '~/core/stimulus/engine-client';
import { NBackGrid } from '~/ui/components/nback-grid';
import { UfovStimulus } from '~/ui/components/ufov-stimulus';
import { MetacogPrompt } from '~/ui/components/metacog-prompt';
import type { Session, Trial, Response, ModuleId } from '~/types/module';

export function SessionRunner() {
  const params = useParams();
  const nav = useNavigate();
  const [session, setSession] = createSignal<Session | null>(null);
  const [status, setStatus] = createSignal('initializing');
  const [current, setCurrent] = createSignal<Trial | null>(null);
  const [pendingPrompt, setPendingPrompt] = createSignal<{ blockKind: string;
    resolve: (pct: number) => void } | null>(null);
  let canvasResolver: ((r: Response) => void) | null = null;

  function promptMetacog(blockKind: string): Promise<number> {
    return new Promise((resolve) => {
      setPendingPrompt({ blockKind, resolve });
    });
  }

  onMount(async () => {
    // read plan from DB to find the first module
    const rows = await dbQuery<{ plan_json: string }>(
      'SELECT plan_json FROM sessions WHERE id = ?', [params.sessionId!]
    );
    if (rows.length === 0) { setStatus('session not found'); return; }
    const plan = JSON.parse(rows[0]!.plan_json);
    const firstModuleId: ModuleId = plan.modules[0]?.moduleId ?? 'placeholder';
    const m = getModule(firstModuleId) ?? getModule('placeholder')!;
    const state = await getDomainState(m.id) ?? {
      moduleId: m.id, level: {}, ewmaPerformance: 0,
      lastSessionTs: null, sessionsTotal: 0, plateauFlag: false, updatedTs: Date.now()
    };
    const s = m.createSession(state);
    setSession(s);
    const blockId = crypto.randomUUID();
    await saveBlock({
      id: blockId, sessionId: params.sessionId!,
      moduleId: m.id, blockIndex: 0, kind: s.blocks[0]?.kind ?? 'block-0',
      adaptiveParams: state.level
    });
    setStatus('running');
    runSessionLoop(s, blockId);
  });

  async function runSessionLoop(s: Session, blockId: string) {
    let trial = s.nextTrial();
    let lastBlockIndex = -1;
    while (trial) {
      if (trial.blockIndex !== lastBlockIndex) {
        lastBlockIndex = trial.blockIndex;
        const blockKind = s.blocks[trial.blockIndex]?.kind ?? 'block';
        const pred = await promptMetacog(blockKind);
        s.setMetacogPrediction(trial.blockIndex, pred);
        await saveMetacogPrediction({
          blockId: `${blockId}-${trial.blockIndex}`,
          predictedAccuracy: pred
        });
      }
      setCurrent(trial);
      const resp = await new Promise<Response>((resolve) => {
        if (trial!.stimulus.kind === 'nback-grid' || trial!.stimulus.kind === 'ufov-peripheral') {
          canvasResolver = resolve;
        } else {
          runTrial(trial!).then(resolve);
        }
      });
      canvasResolver = null;
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
    setCurrent(null);
    const result = s.complete();
    await completeSession(params.sessionId!);
    await upsertDomainState(result.nextDomainState);
    setStatus('done');
    nav(`/results/${params.sessionId}`);
  }

  function onTrialDone(r: Response) {
    if (canvasResolver) canvasResolver(r);
  }

  return (
    <div class="container">
      <h1 class="hero">Session</h1>
      <p class="muted">Status: {status()}</p>
      <Show when={pendingPrompt()}>
        {p => <MetacogPrompt blockKind={p().blockKind}
          onSubmit={(pct) => { const cb = p().resolve; setPendingPrompt(null); cb(pct); }} />}
      </Show>
      <Show when={!pendingPrompt() && current() && current()!.stimulus.kind === 'nback-grid'}>
        <NBackGrid trial={current()!} onDone={onTrialDone} />
      </Show>
      <Show when={!pendingPrompt() && current() && current()!.stimulus.kind === 'ufov-peripheral'}>
        <UfovStimulus trial={current()!} onDone={onTrialDone} />
      </Show>
    </div>
  );
}
