/// <reference lib="webworker" />
import type { Trial, Response } from '~/types/module';

type Req =
  | { kind: 'run-trial'; trial: Trial; canvas?: OffscreenCanvas }
  | { kind: 'key-event'; key: string; ts: number };

type Res =
  | { kind: 'ready' }
  | { kind: 'trial-complete'; response: Response }
  | { kind: 'error'; message: string };

let pending: { trial: Trial; startTs: number; frames: number;
  resolve: (r: Response) => void } | null = null;
let canvas: OffscreenCanvas | null = null;

self.onmessage = (ev: MessageEvent<Req & { id: number }>) => {
  const { id, ...req } = ev.data;
  const reply = (body: Res) => (self as any).postMessage({ id, ...body });
  if (req.kind === 'run-trial') {
    if (req.canvas) canvas = req.canvas;
    runTrial(req.trial).then(response => reply({ kind: 'trial-complete', response }))
      .catch(e => reply({ kind: 'error', message: e.message }));
  } else if (req.kind === 'key-event' && pending) {
    const rtMs = req.ts - pending.startTs;
    const achievedMs = performance.now() - pending.startTs;
    const resp: Response = {
      trialId: pending.trial.id,
      event: { kind: 'keydown', value: req.key, rtMs },
      timing: {
        requestedDurationMs: pending.trial.timingSpec.stimulusMs === 'until-response'
          ? 0 : pending.trial.timingSpec.stimulusMs,
        achievedDurationMs: achievedMs,
        framesRendered: pending.frames,
        timingFlag: 'ok'
      }
    };
    pending.resolve(resp);
    pending = null;
  }
};

async function runTrial(trial: Trial): Promise<Response> {
  return new Promise<Response>((resolve) => {
    const startTs = performance.now();
    pending = { trial, startTs, frames: 0, resolve };
    if (canvas && trial.stimulus.kind === 'text-question') {
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = '48px system-ui';
      ctx.textAlign = 'center';
      const text = String((trial.stimulus.payload as { text?: string }).text ?? '—');
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }
    const tick = () => {
      if (!pending) return;
      pending.frames++;
      const elapsed = performance.now() - pending.startTs;
      const spec = pending.trial.timingSpec;
      if (spec.stimulusMs !== 'until-response' && elapsed >= spec.stimulusMs) {
        const resp: Response = {
          trialId: pending.trial.id,
          event: { kind: 'timeout', value: null, rtMs: 0 },
          timing: {
            requestedDurationMs: spec.stimulusMs,
            achievedDurationMs: elapsed,
            framesRendered: pending.frames,
            timingFlag: 'ok'
          }
        };
        const resolve = pending.resolve;
        pending = null;
        resolve(resp);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
