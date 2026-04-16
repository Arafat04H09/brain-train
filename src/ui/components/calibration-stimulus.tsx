import { createSignal, For, Show } from 'solid-js';
import type { Trial, Response } from '~/types/module';

interface CalibrationPayload {
  itemId: string;
  question: string;
  choices: string[];
  correctIndex: number;
}

export function CalibrationStimulus(props: {
  trial: Trial;
  onDone: (r: Response) => void;
}) {
  const payload = props.trial.stimulus.payload as CalibrationPayload;

  const [step, setStep] = createSignal<'answer' | 'confidence' | 'feedback'>('answer');
  const [choice, setChoice] = createSignal<number | null>(null);
  const [confidence, setConfidence] = createSignal(75);
  const [feedbackMessage, setFeedbackMessage] = createSignal('');
  const [responseStartTime] = createSignal(Date.now());

  function handleKeyDown(e: KeyboardEvent) {
    if (step() === 'answer' && e.key >= '1' && e.key <= '4') {
      const idx = parseInt(e.key) - 1;
      setChoice(idx);
      setStep('confidence');
      e.preventDefault();
    } else if (step() === 'confidence') {
      if (e.key === 'ArrowLeft') {
        setConfidence(Math.max(50, confidence() - 1));
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        setConfidence(Math.min(99, confidence() + 1));
        e.preventDefault();
      } else if (e.key === 'Enter') {
        handleSubmit();
        e.preventDefault();
      }
    }
  }

  function handleChoiceClick(idx: number) {
    if (step() === 'answer') {
      setChoice(idx);
      setStep('confidence');
    }
  }

  function handleSliderChange(e: Event) {
    const val = parseInt((e.target as HTMLInputElement).value);
    setConfidence(val);
  }

  function handleSubmit() {
    if (step() === 'confidence' && choice() !== null) {
      const isCorrect = choice() === payload.correctIndex;
      const conf = confidence();
      if (isCorrect) {
        setFeedbackMessage(`Correct! You said ${conf}%`);
      } else {
        const correctLabel = String.fromCharCode(65 + payload.correctIndex);
        setFeedbackMessage(`Wrong. Right answer: ${correctLabel}. You said ${conf}%`);
      }
      setStep('feedback');

      // After 800ms, resolve the response
      setTimeout(() => {
        const rtMs = Date.now() - responseStartTime();
        const response: Response = {
          trialId: props.trial.id,
          event: {
            kind: 'click',
            value: JSON.stringify({ choice: choice(), confidence: conf }),
            rtMs
          },
          timing: {
            requestedDurationMs: 0,
            achievedDurationMs: rtMs,
            framesRendered: 0,
            timingFlag: 'ok'
          }
        };
        props.onDone(response);
      }, 800);
    }
  }

  return (
    <div class="container" style="text-align:center" onKeyDown={handleKeyDown}>
      <Show when={step() === 'answer'}>
        <div>
          <h2 class="hero">{payload.question}</h2>
          <div style="margin:2rem 0;display:flex;gap:1rem;flex-wrap:wrap;justify-content:center">
            <For each={payload.choices}>
              {(choice_text, idx) => {
                const choiceIdx = idx();
                const label = String.fromCharCode(65 + choiceIdx);
                return (
                  <button
                    onClick={() => handleChoiceClick(choiceIdx)}
                    style={{
                      'padding': '1rem 1.5rem',
                      'font-size': '1rem',
                      'cursor': 'pointer',
                      'border': '2px solid #ccc',
                      'border-radius': '4px',
                      'background': '#f9f9f9',
                      'min-width': '180px'
                    }}
                  >
                    <strong>{label}.</strong> {choice_text}
                  </button>
                );
              }}
            </For>
          </div>
          <p class="muted" style="margin-top:1.5rem">
            Use keys 1-4 or click to select
          </p>
        </div>
      </Show>

      <Show when={step() === 'confidence'}>
        <div>
          <h2 class="hero">How confident are you?</h2>
          <p class="muted">Selected: <b>{String.fromCharCode(65 + (choice() ?? 0))}. {payload.choices[choice() ?? 0]}</b></p>
          <div style="margin:2rem 0">
            <input
              type="range"
              min="50"
              max="99"
              value={confidence()}
              onInput={handleSliderChange}
              style="width:80%;max-width:400px"
            />
            <div style="font-size:2rem;margin-top:0.5rem">{confidence()}%</div>
          </div>
          <button onClick={handleSubmit} style="padding:0.8rem 1.5rem;font-size:1rem;cursor:pointer">
            Submit
          </button>
          <p class="muted" style="margin-top:1.5rem">
            Use arrow keys to adjust, Enter to submit
          </p>
        </div>
      </Show>

      <Show when={step() === 'feedback'}>
        <div style="margin:2rem 0">
          <p style="font-size:1.2rem">{feedbackMessage()}</p>
        </div>
      </Show>
    </div>
  );
}
