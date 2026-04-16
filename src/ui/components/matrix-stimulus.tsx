import { onMount, createSignal } from 'solid-js';
import { runTrial } from '~/core/stimulus/engine-client';
import type { Trial, Response } from '~/types/module';

export function MatrixStimulus(props: { trial: Trial; onDone: (r: Response) => void }) {
  let canvasRef: HTMLCanvasElement | undefined;
  const [prompt, setPrompt] = createSignal('');

  onMount(async () => {
    if (!canvasRef) return;
    const offscreen = canvasRef.transferControlToOffscreen();
    setPrompt('Press 1–8 to select the answer');
    const resp = await runTrial(props.trial, offscreen);
    props.onDone(resp);
  });

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={600}
        height={700}
        style="background:#14181e;border-radius:.5rem;display:block;margin:0 auto"
      />
      <p class="muted" style="text-align:center">{prompt()}</p>
    </div>
  );
}
