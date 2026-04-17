import { onMount, createSignal, onCleanup } from 'solid-js';
import { runTrial, sendSyntheticKey } from '~/core/stimulus/engine-client';
import type { Trial, Response } from '~/types/module';

export function MatrixStimulus(props: { trial: Trial; onDone: (r: Response) => void }) {
  let canvasRef: HTMLCanvasElement | undefined;
  const [prompt, setPrompt] = createSignal('');
  let abortController = new AbortController();

  onMount(async () => {
    if (!canvasRef) return;
    const offscreen = canvasRef.transferControlToOffscreen();
    setPrompt('Press 1–8 (or click) to select the answer');
    const resp = await runTrial(props.trial, offscreen);
    if (!abortController.signal.aborted) {
      props.onDone(resp);
    }
  });

  onCleanup(() => {
    abortController.abort();
  });

  const handleClick = (e: MouseEvent) => {
    if (!canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const scaleX = 600 / rect.width;
    const scaleY = 700 / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // The choices are drawn in a 2x4 grid starting at x=140, y=430, with cells 80x80
    if (y >= 430 && y <= 590 && x >= 140 && x <= 460) {
      const col = Math.floor((x - 140) / 80);
      const row = Math.floor((y - 430) / 80);
      const choice = row * 4 + col + 1; // 1 to 8
      
      // Directly notify the engine of the synthetic key press
      sendSyntheticKey(String(choice));
    }
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={600}
        height={700}
        onClick={handleClick}
        style="background:#14181e;border-radius:.5rem;display:block;margin:0 auto; cursor:pointer;"
      />
      <p class="muted" style="text-align:center; margin-top:1rem;">{prompt()}</p>
    </div>
  );
}
