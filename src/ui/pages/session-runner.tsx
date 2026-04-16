import { createSignal, onMount, Show } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { getModule } from '~/core/modules/registry';
import { dbQuery } from '~/core/storage/db-client';
import { getDomainState, saveBlock, saveTrial, completeSession, upsertDomainState, saveMetacogPrediction } from '~/core/storage/repos';
import { runTrial } from '~/core/stimulus/engine-client';
import { NBackGrid } from '~/ui/components/nback-grid';
import { UfovStimulus } from '~/ui/components/ufov-stimulus';
import { EfStimulus } from '~/ui/components/ef-stimulus';
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
  const [aborted, setAborted] = createSignal(false);
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
    // Pre-create all blocks for this session
    const blockIds: string[] = [];
    for (let i = 0; i < s.blocks.length; i++) {
      const block = s.blocks[i];
      if (!block) continue;
      const id = crypto.randomUUID();
      blockIds[i] = id;
      await saveBlock({
        id, sessionId: params.sessionId!,
        moduleId: m.id, blockIndex: i, kind: block.kind,
        adaptiveParams: state.level
      });
    }
    setStatus('running');
    runSessionLoop(s, blockIds);
  });

  async function runSessionLoop(s: Session, blockIds: string[]) {
    let trial = s.nextTrial();
    let lastBlockIndex = -1;
    while (trial && !aborted()) {
      const blockId = blockIds[trial.blockIndex];
      if (!blockId) {
        console.error(`Missing block ID for block index ${trial.blockIndex}`);
        break;
      }
      if (trial.blockIndex !== lastBlockIndex) {
        lastBlockIndex = trial.blockIndex;
        const blockKind = s.blocks[trial.blockIndex]?.kind ?? 'block';
        const pred = await promptMetacog(blockKind);
        s.setMetacogPrediction(trial.blockIndex, pred);
        await saveMetacogPrediction({
          blockId,
          predictedAccuracy: pred
        });
      }
      setCurrent(trial);
      const resp = await new Promise<Response>((resolve) => {
        if (trial!.stimulus.kind === 'nback-grid' || trial!.stimulus.kind === 'ufov-peripheral' || trial!.stimulus.kind === 'flanker-compound') {
          canvasResolver = resolve;
        } else {
          runTrial(trial!).then(resolve);
        }
      });
      canvasResolver = null;
      const result = await s.submit(resp);
      await saveTrial({
        id: `${blockId}:${trial.id}`, blockId, trialIndex: trial.trialIndex,
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
    if (aborted()) {
      await completeSession(params.sessionId!);
      setStatus('aborted');
      nav('/');
      return;
    }
    const result = s.complete();
    await completeSession(params.sessionId!);
    await upsertDomainState(result.nextDomainState);
    setStatus('done');
    nav(`/results/${params.sessionId}`);
  }

  function onTrialDone(r: Response) {
    if (canvasResolver) canvasResolver(r);
  }

  const activeCanvas = () => {
    const t = current();
    if (pendingPrompt() || !t) return null;
    const k = t.stimulus.kind;
    if (k === 'nback-grid' || k === 'ufov-peripheral' || k === 'flanker-compound') return t;
    return null;
  };

  const blockProgress = () => {
    const s = session();
    const t = current();
    if (!s || !t) return null;
    const block = s.blocks[t.blockIndex];
    return {
      blockIdx: t.blockIndex + 1,
      blockTotal: s.blocks.length,
      trialIdx: t.trialIndex + 1,
      trialTotal: block?.targetTrialCount ?? 0,
      kind: block?.kind ?? ''
    };
  };

  return (
    <div class="container">
      <h1 class="hero">Session</h1>
      <Show when={blockProgress()}>
        {p => (
          <p class="muted">
            Block {p().blockIdx}/{p().blockTotal} · Trial {p().trialIdx}/{p().trialTotal} · {p().kind}
          </p>
        )}
      </Show>
      <Show when={!current()}>
        <p class="muted">Status: {status()}</p>
      </Show>
      <Show when={status() === 'running'}>
        <p style="text-align:right;margin-top:-1.4rem;margin-bottom:1rem">
          <button style="font-size:.85rem;padding:.3rem .7rem" onClick={() => setAborted(true)}>
            End session
          </button>
        </p>
      </Show>
      <Show when={pendingPrompt()}>
        {p => <MetacogPrompt blockKind={p().blockKind}
          onSubmit={(pct) => { const cb = p().resolve; setPendingPrompt(null); cb(pct); }} />}
      </Show>
      <Show when={activeCanvas()} keyed>
        {trial => {
          if (trial.stimulus.kind === 'nback-grid') return <NBackGrid trial={trial} onDone={onTrialDone} />;
          if (trial.stimulus.kind === 'ufov-peripheral') return <UfovStimulus trial={trial} onDone={onTrialDone} />;
          if (trial.stimulus.kind === 'flanker-compound') return <EfStimulus trial={trial} onDone={onTrialDone} />;
          return null;
        }}
      </Show>
    </div>
  );
}
