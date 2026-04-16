/// <reference lib="webworker" />
import type { Trial, Response } from '~/types/module';

type Req =
  | { kind: 'run-trial'; trial: Trial; canvas?: OffscreenCanvas }
  | { kind: 'key-event'; key: string; ts: number };

type Res =
  | { kind: 'ready' }
  | { kind: 'trial-complete'; response: Response }
  | { kind: 'error'; message: string };

// Pending trial state; accumulates keys during the response window.
let pending: {
  trial: Trial;
  startTs: number;
  frames: number;
  stimClearedAt: number | null;
  keys: { key: string; rtMs: number }[];
  resolve: (r: Response) => void;
} | null = null;
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
    pending.keys.push({ key: req.key, rtMs });
  }
};

function clearCanvas() {
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#14181e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

async function runTrial(trial: Trial): Promise<Response> {
  return new Promise<Response>((resolve) => {
    const startTs = performance.now();
    pending = { trial, startTs, frames: 0, stimClearedAt: null, keys: [], resolve };
    const spec = trial.timingSpec;
    const stimulusMs = spec.stimulusMs === 'until-response' ? Infinity : spec.stimulusMs;
    const isiMs = spec.isiMs ?? 0;
    const totalMs = stimulusMs === Infinity ? Infinity : stimulusMs + isiMs;

    // Draw initial stimulus
    drawStimulus(trial);

    const tick = () => {
      if (!pending) return;
      pending.frames++;
      const elapsed = performance.now() - pending.startTs;
      // Clear stimulus when stimulus phase ends (before ISI)
      if (pending.stimClearedAt === null && elapsed >= stimulusMs && stimulusMs !== Infinity) {
        clearCanvas();
        pending.stimClearedAt = elapsed;
      }
      // "until-response" kind: resolve on first key press
      if (stimulusMs === Infinity && pending.keys.length > 0) {
        finishTrial(resolve, 'ok');
        return;
      }
      // Timed trial: resolve at end of stimulus + ISI window
      if (elapsed >= totalMs) {
        finishTrial(resolve, 'ok');
        return;
      }
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(tick);
      } else {
        // Fallback for environments where rAF isn't available in the worker
        setTimeout(tick, 16);
      }
    };
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(tick);
    } else {
      setTimeout(tick, 16);
    }
  });
}

function finishTrial(resolve: (r: Response) => void, flag: 'ok' | 'dropped-frames' | 'over-duration') {
  if (!pending) return;
  const elapsed = performance.now() - pending.startTs;
  const spec = pending.trial.timingSpec;
  const stimulusMs = spec.stimulusMs === 'until-response' ? 0 : spec.stimulusMs;
  const firstKey = pending.keys[0];
  const resp: Response = {
    trialId: pending.trial.id,
    event: firstKey
      ? { kind: 'keydown', value: firstKey.key, rtMs: firstKey.rtMs }
      : { kind: 'timeout', value: null, rtMs: 0 },
    timing: {
      requestedDurationMs: stimulusMs,
      achievedDurationMs: elapsed,
      framesRendered: pending.frames,
      timingFlag: flag
    },
    allKeys: pending.keys.map(k => k.key)
  };
  const r = pending.resolve;
  pending = null;
  r(resp);
}

function drawStimulus(trial: Trial) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#14181e';
  ctx.fillRect(0, 0, w, h);

  if (trial.stimulus.kind === 'text-question') {
    ctx.fillStyle = '#fff';
    ctx.font = '48px system-ui';
    ctx.textAlign = 'center';
    const text = String((trial.stimulus.payload as { text?: string }).text ?? '—');
    ctx.fillText(text, w / 2, h / 2);
  }

  if (trial.stimulus.kind === 'nback-grid') {
    const { position, letter } = trial.stimulus.payload as { position: number; letter: string };
    // Draw 3x3 grid lines so the spatial layout is visible
    ctx.strokeStyle = '#2a2f38';
    ctx.lineWidth = 2;
    const cellW = w / 3;
    const cellH = h / 3;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellW, 0); ctx.lineTo(i * cellW, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellH); ctx.lineTo(w, i * cellH);
      ctx.stroke();
    }
    // Highlighted cell (8 positions skip center slot 4 of the 3x3)
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
    // audio cue
    (self as any).postMessage({ id: 0, kind: 'play-audio', letter });
  }

  if (trial.stimulus.kind === 'ufov-peripheral') {
    const p = trial.stimulus.payload as {
      subtestId: string; centralTarget: string; peripheralLocation: number;
      distractorCount: number; displayMs: number; maskMs: number;
    };
    const cx = w / 2, cy = h / 2;
    ctx.fillStyle = p.centralTarget === 'car' ? '#7aa2ff' : '#ff8a4d';
    const tw = p.centralTarget === 'car' ? 48 : 72, th = 28;
    ctx.fillRect(cx - tw / 2, cy - th / 2, tw, th);
    if (p.peripheralLocation >= 0) {
      const angle = (p.peripheralLocation / 8) * Math.PI * 2;
      const r = Math.min(w, h) * 0.35;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - 12, py - 12, 24, 24);
    }
    for (let i = 0; i < p.distractorCount; i++) {
      const ang = (i / p.distractorCount) * Math.PI * 2 + 0.3;
      const rr = Math.min(w, h) * 0.25;
      const dx = cx + Math.cos(ang) * rr, dy = cy + Math.sin(ang) * rr;
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.moveTo(dx, dy - 10); ctx.lineTo(dx - 9, dy + 6); ctx.lineTo(dx + 9, dy + 6);
      ctx.closePath(); ctx.fill();
    }
    // Random-dot mask after stimulus duration (UFOV-specific)
    setTimeout(() => {
      if (!canvas) return;
      const ctx2 = canvas.getContext('2d')!;
      ctx2.fillStyle = '#14181e'; ctx2.fillRect(0, 0, w, h);
      for (let i = 0; i < 600; i++) {
        ctx2.fillStyle = Math.random() < 0.5 ? '#666' : '#ccc';
        const dx = Math.random() * w, dy = Math.random() * h;
        ctx2.fillRect(dx, dy, 3, 3);
      }
    }, p.displayMs);
  }

  if (trial.stimulus.kind === 'flanker-compound') {
    const p = trial.stimulus.payload as any;
    ctx.fillStyle = '#e6e6e6';
    ctx.font = '24px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`Sort by: ${p.rule}`, w / 2, 40);
    const colors: Record<string, string> = { red: '#ff4d4d', blue: '#4d4dff', green: '#4dff4d', yellow: '#ffff4d' };
    const draw = (cx: number, cy: number, color: string, shape: string, scale = 1) => {
      ctx.fillStyle = colors[color] ?? '#fff';
      const size = 40 * scale;
      if (shape === 'circle') { ctx.beginPath(); ctx.arc(cx, cy, size / 2, 0, Math.PI * 2); ctx.fill(); }
      else if (shape === 'square') { ctx.fillRect(cx - size / 2, cy - size / 2, size, size); }
      else if (shape === 'triangle') { ctx.beginPath(); ctx.moveTo(cx, cy - size / 2); ctx.lineTo(cx - size / 2, cy + size / 2); ctx.lineTo(cx + size / 2, cy + size / 2); ctx.closePath(); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(cx, cy - size / 2); ctx.lineTo(cx + size / 2, cy); ctx.lineTo(cx, cy + size / 2); ctx.lineTo(cx - size / 2, cy); ctx.closePath(); ctx.fill(); }
    };
    const cx = w / 2, cy = h / 2;
    const flankerColor = p.flankerCongruent ? p.color : (p.color === 'red' ? 'blue' : 'red');
    const flankerShape = p.flankerCongruent ? p.shape : (p.shape === 'circle' ? 'square' : 'circle');
    const scale = p.size === 'large' ? 1.3 : 1;
    draw(cx - 100, cy, flankerColor, flankerShape, scale);
    draw(cx, cy, p.color, p.shape, scale);
    draw(cx + 100, cy, flankerColor, flankerShape, scale);
    if (p.hasStopSignal) {
      setTimeout(() => {
        if (!canvas) return;
        const ctx2 = canvas.getContext('2d')!;
        ctx2.strokeStyle = '#ff4d4d'; ctx2.lineWidth = 8;
        ctx2.strokeRect(4, 4, w - 8, h - 8);
      }, p.ssdMs);
    }
  }
}
