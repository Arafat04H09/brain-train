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
    const rtMs = performance.now() - pending.startTs;
    pending.keys.push({ key: req.key, rtMs });
    if (canvas) {
      const ctx = canvas.getContext('2d')!;
      const sz = 12;
      ctx.fillStyle = 'rgba(77, 255, 153, 0.7)';
      ctx.fillRect(canvas.width - sz - 8, canvas.height - sz - 8, sz, sz);
      setTimeout(() => {
        ctx.fillStyle = '#14181e';
        ctx.fillRect(canvas.width - sz - 8, canvas.height - sz - 8, sz, sz);
      }, 80);
    }
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
    const spec = trial.timingSpec;
    const preMs = spec.preMs ?? 0;
    const stimulusMs = spec.stimulusMs === 'until-response' ? Infinity : spec.stimulusMs;
    const isiMs = spec.isiMs ?? 0;
    const totalMs = stimulusMs === Infinity ? Infinity : stimulusMs + isiMs;

    // Pre-stimulus phase: fixation cross so the user knows where to look and
    // when the stimulus is coming. Keys pressed during this window are ignored
    // because `pending` is still null.
    if (preMs > 0) drawFixation();

    const startStimulus = () => {
      const startTs = performance.now();
      pending = { trial, startTs, frames: 0, stimClearedAt: null, keys: [], resolve };
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
          setTimeout(tick, 16);
        }
      };
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(tick);
      } else {
        setTimeout(tick, 16);
      }
    };

    if (preMs > 0) setTimeout(startStimulus, preMs);
    else startStimulus();
  });
}

function drawFixation() {
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#14181e';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#7c8088';
  ctx.lineWidth = 2;
  const cx = w / 2, cy = h / 2;
  const s = 14;
  ctx.beginPath();
  ctx.moveTo(cx - s, cy); ctx.lineTo(cx + s, cy);
  ctx.moveTo(cx, cy - s); ctx.lineTo(cx, cy + s);
  ctx.stroke();
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
    // Vehicle silhouettes (canonical UFOV uses real vehicle images). These are
    // simple side-view paths — recognizable as car vs truck at sub-200ms flash
    // without needing external image assets.
    drawVehicle(ctx, cx, cy, p.centralTarget as 'car' | 'truck', 1);
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
    // Random-dot mask after stimulus duration (UFOV-specific).
    // Sparser than before — dense masks turn into visual chaos and don't help
    // disrupt iconic memory more than a moderate-density mask already does.
    const currentTrialId = trial.id;
    setTimeout(() => {
      // Prevent bleeding into the next trial if this one ended early
      if (!pending || pending.trial.id !== currentTrialId) return;
      if (!canvas) return;
      const ctx2 = canvas.getContext('2d')!;
      ctx2.fillStyle = '#14181e'; ctx2.fillRect(0, 0, w, h);
      for (let i = 0; i < 180; i++) {
        ctx2.fillStyle = Math.random() < 0.5 ? '#555' : '#aaa';
        const dx = Math.random() * w, dy = Math.random() * h;
        ctx2.fillRect(dx, dy, 4, 4);
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
    const scale = p.size === 'large' ? 1.4 : 0.75;
    draw(cx - 100, cy, flankerColor, flankerShape, scale);
    draw(cx, cy, p.color, p.shape, scale);
    draw(cx + 100, cy, flankerColor, flankerShape, scale);
    if (p.hasStopSignal) {
      const currentTrialId = trial.id;
      setTimeout(() => {
        if (!pending || pending.trial.id !== currentTrialId) return;
        if (!canvas) return;
        const ctx2 = canvas.getContext('2d')!;
        ctx2.strokeStyle = '#ff4d4d'; ctx2.lineWidth = 8;
        ctx2.strokeRect(4, 4, w - 8, h - 8);
      }, p.ssdMs);
    }
  }

  if (trial.stimulus.kind === 'matrix-3x3') {
    const p = trial.stimulus.payload as {
      grid: Array<{ shape: string; color: string; size: string; count: number }>;
      choices: Array<{ shape: string; color: string; size: string; count: number }>;
      ruleCount: number;
    };

    const colors: Record<string, string> = {
      red: '#ff4d4d', blue: '#4d4dff', green: '#4dff4d', yellow: '#ffff4d'
    };

    const drawPanel = (cx: number, cy: number, panel: any, boxScale = 1) => {
      const sizeMap: Record<string, number> = { small: 14, medium: 26, large: 42 };
      const size = (sizeMap[panel.size] ?? 26) * boxScale;
      const count = panel.count ?? 1;

      // Adjust spacing based on size to ensure they fit in the 120x120 or 80x80 cell
      const spacing = size + (4 * boxScale); 
      
      // Calculate starting positions to center the group
      let positions = [];
      if (count === 1) {
        positions.push({ x: cx, y: cy });
      } else if (count === 2) {
        positions.push({ x: cx - spacing / 2, y: cy });
        positions.push({ x: cx + spacing / 2, y: cy });
      } else if (count === 3) {
        // Triangle formation to keep them tight
        positions.push({ x: cx, y: cy - spacing / 2 });
        positions.push({ x: cx - spacing / 2, y: cy + spacing / 2 });
        positions.push({ x: cx + spacing / 2, y: cy + spacing / 2 });
      }

      for (let i = 0; i < count; i++) {
        const x = positions[i]!.x;
        const y = positions[i]!.y;
        ctx.fillStyle = colors[panel.color] ?? '#fff';

        if (panel.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(x, y, size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (panel.shape === 'square') {
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
        } else if (panel.shape === 'triangle') {
          ctx.beginPath();
          ctx.moveTo(x, y - size / 2);
          ctx.lineTo(x - size / 2, y + size / 2);
          ctx.lineTo(x + size / 2, y + size / 2);
          ctx.closePath();
          ctx.fill();
        } else if (panel.shape === 'diamond') {
          ctx.beginPath();
          ctx.moveTo(x, y - size / 2);
          ctx.lineTo(x + size / 2, y);
          ctx.lineTo(x, y + size / 2);
          ctx.lineTo(x - size / 2, y);
          ctx.closePath();
          ctx.fill();
        }
      }
    };

    // Draw 3x3 grid (top portion of canvas)
    const cellSize = 120;
    const gridStartX = (w - cellSize * 3) / 2;
    const gridStartY = 40;

    ctx.strokeStyle = '#2a2f38';
    ctx.lineWidth = 2;

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const x = gridStartX + col * cellSize;
        const y = gridStartY + row * cellSize;

        ctx.strokeRect(x, y, cellSize, cellSize);

        if (row === 2 && col === 2) {
          // Draw "?" for the answer cell
          ctx.fillStyle = '#7c8088';
          ctx.font = '48px system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('?', x + cellSize / 2, y + cellSize / 2);
        } else {
          const idx = row * 3 + col;
          const panel = p.grid[idx];
          if (panel) {
            drawPanel(x + cellSize / 2, y + cellSize / 2, panel, 1);
          }
        }
      }
    }

    // Draw answer choices (8 options in 2x4 grid at bottom)
    const choiceGridStartY = gridStartY + cellSize * 3 + 30;
    const choiceCellSize = 80;
    const choiceGridWidth = choiceCellSize * 4;
    const choiceGridStartX = (w - choiceGridWidth) / 2;

    ctx.fillStyle = '#e6e6e6';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Press 1–8 to select:', w / 2, choiceGridStartY - 20);

    for (let i = 0; i < 8; i++) {
      const row = Math.floor(i / 4);
      const col = i % 4;
      const x = choiceGridStartX + col * choiceCellSize;
      const y = choiceGridStartY + row * choiceCellSize;

      ctx.strokeStyle = '#2a2f38';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, choiceCellSize, choiceCellSize);

      if (p.choices[i]) {
        drawPanel(x + choiceCellSize / 2, y + choiceCellSize / 2 - 10, p.choices[i], 0.66);
      }

      // Draw choice number
      ctx.fillStyle = '#e6e6e6';
      ctx.font = '12px system-ui';
      ctx.fillText(String(i + 1), x + choiceCellSize / 2, y + choiceCellSize - 10);
    }
  }

  if (trial.stimulus.kind === 'ef-flanker-arrows') {
    const p = trial.stimulus.payload as { centerDirection: string; flankerDirection: string };
    const cx = w / 2, cy = h / 2;
    const center = p.centerDirection === 'left' ? '\u2190' : '\u2192';
    const flank = p.flankerDirection === 'left' ? '\u2190' : '\u2192';
    ctx.font = '64px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const sp = 70;
    ctx.fillStyle = '#888';
    ctx.fillText(flank, cx - 2 * sp, cy);
    ctx.fillText(flank, cx - sp, cy);
    ctx.fillStyle = '#fff';
    ctx.fillText(center, cx, cy);
    ctx.fillStyle = '#888';
    ctx.fillText(flank, cx + sp, cy);
    ctx.fillText(flank, cx + 2 * sp, cy);
  }

  if (trial.stimulus.kind === 'ef-stop-signal-arrow') {
    const p = trial.stimulus.payload as { direction: string; isStopTrial: boolean; ssdMs: number };
    const cx = w / 2, cy = h / 2;
    ctx.fillStyle = '#fff';
    ctx.font = '80px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.direction === 'left' ? '\u2190' : '\u2192', cx, cy);
    if (p.isStopTrial) {
      const currentTrialId = trial.id;
      setTimeout(() => {
        if (!pending || pending.trial.id !== currentTrialId) return;
        if (!canvas) return;
        const ctx2 = canvas.getContext('2d')!;
        ctx2.strokeStyle = '#ff4d4d';
        ctx2.lineWidth = 8;
        ctx2.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
        ctx2.fillStyle = '#ff4d4d';
        ctx2.font = '28px system-ui';
        ctx2.textAlign = 'center';
        ctx2.textBaseline = 'top';
        ctx2.fillText('STOP', canvas.width / 2, 16);
      }, p.ssdMs);
    }
  }

  if (trial.stimulus.kind === 'ef-task-switch') {
    const p = trial.stimulus.payload as { cue: string; color: string; shape: string };
    const cx = w / 2, cy = h / 2;
    ctx.fillStyle = '#7aa2ff';
    ctx.font = 'bold 36px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.cue, cx, 60);
    ctx.fillStyle = '#555';
    ctx.font = '16px system-ui';
    ctx.fillText('Wait for shape\u2026', cx, cy);
    const currentTrialId = trial.id;
    setTimeout(() => {
      if (!pending || pending.trial.id !== currentTrialId) return;
      if (!canvas) return;
      const ctx2 = canvas.getContext('2d')!;
      ctx2.fillStyle = '#14181e';
      ctx2.fillRect(0, 80, canvas.width, canvas.height - 80);
      ctx2.fillStyle = p.cue === 'COLOR' ? '#7aa2ff' : '#fff';
      ctx2.font = 'bold 36px system-ui';
      ctx2.textAlign = 'center';
      ctx2.textBaseline = 'middle';
      ctx2.fillText(p.cue, cx, 60);
      const colors: Record<string, string> = { red: '#ff4d4d', blue: '#4d8cff' };
      ctx2.fillStyle = colors[p.color] ?? '#fff';
      const sz = 60;
      if (p.shape === 'circle') {
        ctx2.beginPath();
        ctx2.arc(cx, cy, sz / 2, 0, Math.PI * 2);
        ctx2.fill();
      } else {
        ctx2.fillRect(cx - sz / 2, cy - sz / 2, sz, sz);
      }
    }, 800);
  }

  if (trial.stimulus.kind === 'simple-rt') {
    // Draw white dot in center for reaction time task
    const cx = w / 2, cy = h / 2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI * 2);
    ctx.fill();

    // Draw instruction text
    ctx.fillStyle = '#888';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Press SPACE as fast as possible', w / 2, cy - 60);
  }

  if (trial.stimulus.kind === 'flanker-assessment') {
    const p = trial.stimulus.payload as { direction: 'left' | 'right'; congruent: boolean };
    const cx = w / 2, cy = h / 2;
    const arrow = p.direction === 'left' ? '<' : '>';
    const flanker = p.congruent ? arrow : (p.direction === 'left' ? '>' : '<');
    const display = `${flanker} ${flanker} ${arrow} ${flanker} ${flanker}`;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(display, cx, cy);
  }

  if (trial.stimulus.kind === 'digit-span-present') {
    const p = trial.stimulus.payload as { digit: number; position: number; total: number };
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(p.digit), w / 2, h / 2);
    ctx.fillStyle = '#444';
    ctx.font = '14px system-ui';
    ctx.fillText(`${p.position + 1} / ${p.total}`, w / 2, h / 2 + 60);
  }

  if (trial.stimulus.kind === 'digit-span-probe') {
    const p = trial.stimulus.payload as { option1: number[]; option2: number[]; correctOption: 1 | 2 };
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Which sequence did you see?', w / 2, h / 2 - 80);
    ctx.font = 'bold 36px monospace';
    ctx.fillText(`1:  ${p.option1.join('  ')}`, w / 2, h / 2 - 10);
    ctx.fillText(`2:  ${p.option2.join('  ')}`, w / 2, h / 2 + 50);
    ctx.fillStyle = '#888';
    ctx.font = '14px system-ui';
    ctx.fillText('Press 1 or 2', w / 2, h / 2 + 110);
  }
}

// Side-view vehicle silhouette for UFOV central targets.
// Canonical UFOV uses photographs of a car vs a truck; these hand-drawn paths
// are a CC0 approximation recognizable under sub-200ms presentation.
function drawVehicle(
  ctx: OffscreenCanvasRenderingContext2D,
  cx: number,
  cy: number,
  kind: 'car' | 'truck',
  scale = 1
) {
  const s = scale;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.fillStyle = kind === 'car' ? '#7aa2ff' : '#ff8a4d';

  if (kind === 'car') {
    // Sedan silhouette: body with raked roofline
    ctx.beginPath();
    ctx.moveTo(-40, 6);
    ctx.lineTo(-40, -2);
    ctx.quadraticCurveTo(-38, -6, -32, -8);
    ctx.lineTo(-20, -8);
    ctx.quadraticCurveTo(-12, -20, 4, -20);
    ctx.quadraticCurveTo(20, -20, 26, -8);
    ctx.lineTo(36, -8);
    ctx.quadraticCurveTo(40, -6, 40, -2);
    ctx.lineTo(40, 6);
    ctx.closePath();
    ctx.fill();
  } else {
    // Flatbed / box truck: cab on left, tall cargo box on right
    ctx.beginPath();
    // cab
    ctx.moveTo(-44, 6);
    ctx.lineTo(-44, -4);
    ctx.quadraticCurveTo(-42, -16, -30, -16);
    ctx.lineTo(-18, -16);
    ctx.lineTo(-18, -4);
    ctx.lineTo(-14, -4);
    // cargo box
    ctx.lineTo(-14, -22);
    ctx.lineTo(42, -22);
    ctx.lineTo(42, 6);
    ctx.closePath();
    ctx.fill();
  }

  // Wheels (both have 2 wheels visible in side view)
  ctx.fillStyle = '#0a0c0f';
  for (const wx of kind === 'car' ? [-22, 24] : [-30, 28]) {
    ctx.beginPath();
    ctx.arc(wx, 8, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Lighter wheel centers
  ctx.fillStyle = '#555';
  for (const wx of kind === 'car' ? [-22, 24] : [-30, 28]) {
    ctx.beginPath();
    ctx.arc(wx, 8, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
