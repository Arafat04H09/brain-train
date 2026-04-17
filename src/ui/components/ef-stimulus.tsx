import { onMount } from 'solid-js';
import { runTrial } from '~/core/stimulus/engine-client';
import type { Trial, Response } from '~/types/module';

export function EfStimulus(props: { trial: Trial; onDone: (r: Response) => void }) {
  let canvasRef: HTMLCanvasElement | undefined;
  onMount(async () => {
    if (!canvasRef) return;
    const offscreen = canvasRef.transferControlToOffscreen();
    const resp = await runTrial(props.trial, offscreen);
    props.onDone(resp);
  });

  const instructions = () => {
    const k = props.trial.stimulus.kind;
    if (k === 'ef-flanker-arrows') return '\u2190 / \u2192 \u2014 match the CENTER arrow';
    if (k === 'ef-stop-signal-arrow') return '\u2190 / \u2192 \u2014 match the arrow \u00b7 Withhold response on STOP signal';
    if (k === 'ef-task-switch') return '\u2190 / \u2192 \u2014 COLOR: red=left, blue=right \u00b7 SHAPE: square=left, circle=right';
    return 'A S K L \u2014 sort by rule \u00b7 Withhold on red border';
  };

  return (
    <div>
      <canvas ref={canvasRef} width={640} height={360}
        style="background:#14181e;border-radius:.5rem;display:block;margin:0 auto" />
      <p class="muted" style="text-align:center; font-size: 0.85rem;">
        {instructions()}
      </p>
    </div>
  );
}
