import { createSignal } from 'solid-js';
import { runTrial } from '~/core/stimulus/engine-client';

export function StimulusDebug() {
  const [out, setOut] = createSignal('');
  async function go() {
    const trial = {
      id: 'debug', blockIndex: 0, trialIndex: 0,
      stimulus: { kind: 'text-question' as const, payload: { text: 'Press SPACE' } },
      inputSpec: { accept: ['keyboard' as const], keys: [' '] },
      timingSpec: { stimulusMs: 3000 as const }
    };
    const resp = await runTrial(trial);
    setOut(JSON.stringify({
      rtMs: resp.event.rtMs,
      timingFlag: resp.timing.timingFlag,
      frames: resp.timing.framesRendered
    }, null, 2));
  }
  return (
    <div class="container">
      <h1 class="hero">Stimulus Debug</h1>
      <button onClick={go}>Start trial</button>
      <pre data-testid="trial-result">{out()}</pre>
    </div>
  );
}
