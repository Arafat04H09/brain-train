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
  return (
    <div>
      <canvas ref={canvasRef} width={640} height={360}
        style="background:#14181e;border-radius:.5rem;display:block;margin:0 auto" />
      <p class="muted" style="text-align:center">A · S · K · L — withhold on red border</p>
    </div>
  );
}
