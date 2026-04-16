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
    if (canvas && trial.stimulus.kind === 'nback-grid') {
      const { position, letter } = trial.stimulus.payload as { position: number; letter: string };
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#14181e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // 3x3 grid (skip center = position 4); 8 positions map to cells 0,1,2,3,5,6,7,8
      const cellW = canvas.width / 3;
      const cellH = canvas.height / 3;
      const cellMap = [0, 1, 2, 3, 5, 6, 7, 8];
      const cellIdx = cellMap[position] ?? 0;
      const cx = (cellIdx % 3) * cellW + cellW / 2;
      const cy = Math.floor(cellIdx / 3) * cellH + cellH / 2;
      ctx.fillStyle = '#7aa2ff';
      ctx.fillRect(cx - cellW / 3, cy - cellH / 3, (2 * cellW) / 3, (2 * cellH) / 3);
      ctx.fillStyle = '#ffffff';
      ctx.font = '72px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter, cx, cy);
      // request audio playback from main thread
      (self as any).postMessage({ id: 0, kind: 'play-audio', letter });
    }
    if (canvas && trial.stimulus.kind === 'ufov-peripheral') {
      const p = trial.stimulus.payload as {
        subtestId: string; centralTarget: string; peripheralLocation: number;
        distractorCount: number; displayMs: number; maskMs: number;
      };
      const ctx = canvas.getContext('2d')!;
      const w = canvas.width, h = canvas.height;
      const cx = w / 2, cy = h / 2;

      // Stimulus frame
      ctx.fillStyle = '#14181e'; ctx.fillRect(0, 0, w, h);
      // Central target (car=blue rect, truck=orange wider rect)
      ctx.fillStyle = p.centralTarget === 'car' ? '#7aa2ff' : '#ff8a4d';
      const tw = p.centralTarget === 'car' ? 48 : 72, th = 28;
      ctx.fillRect(cx - tw / 2, cy - th / 2, tw, th);
      // Peripheral target (white square on radial ring)
      if (p.peripheralLocation >= 0) {
        const angle = (p.peripheralLocation / 8) * Math.PI * 2;
        const r = Math.min(w, h) * 0.35;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 12, py - 12, 24, 24);
      }
      // Distractors (grey triangles) arranged on intermediate radius
      for (let i = 0; i < p.distractorCount; i++) {
        const ang = (i / p.distractorCount) * Math.PI * 2 + 0.3;
        const rr = Math.min(w, h) * 0.25;
        const dx = cx + Math.cos(ang) * rr, dy = cy + Math.sin(ang) * rr;
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.moveTo(dx, dy - 10); ctx.lineTo(dx - 9, dy + 6); ctx.lineTo(dx + 9, dy + 6);
        ctx.closePath(); ctx.fill();
      }

      // Schedule mandatory random-dot mask after stimulus duration
      setTimeout(() => {
        if (!canvas) return;
        const ctx2 = canvas.getContext('2d')!;
        ctx2.fillStyle = '#14181e'; ctx2.fillRect(0, 0, w, h);
        for (let i = 0; i < 600; i++) {
          ctx2.fillStyle = Math.random() < 0.5 ? '#666' : '#ccc';
          const dx = Math.random() * w, dy = Math.random() * h;
          ctx2.fillRect(dx, dy, 3, 3);
        }
        setTimeout(() => {
          if (!canvas) return;
          ctx2.fillStyle = '#14181e'; ctx2.fillRect(0, 0, w, h);
        }, p.maskMs);
      }, p.displayMs);
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
