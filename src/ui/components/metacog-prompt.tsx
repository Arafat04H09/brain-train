import { createSignal } from 'solid-js';

export function MetacogPrompt(props: {
  blockKind: string;
  onSubmit: (predictedPct: number) => void;
}) {
  const [value, setValue] = createSignal(75);
  return (
    <div class="container" style="text-align:center">
      <h2 class="hero">Predict your accuracy</h2>
      <p class="muted">Upcoming block: <b>{props.blockKind}</b></p>
      <p class="muted">How likely is it that you'll get each trial correct?</p>
      <div style="margin:2rem 0">
        <input type="range" min="0" max="100" value={value()}
          onInput={e => setValue(parseInt(e.currentTarget.value))}
          style="width:80%" />
        <div style="font-size:2rem;margin-top:.5rem">{value()}%</div>
      </div>
      <button onClick={() => props.onSubmit(value() / 100)}>Submit prediction</button>
    </div>
  );
}
