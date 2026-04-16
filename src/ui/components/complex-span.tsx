import { createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import type { Trial, Response } from '~/types/module';

interface ComplexSpanPayload {
  mathProblems: Array<{
    question: string;
    correct: boolean;
    presented: number;
    userTrueIfCorrect: boolean;
  }>;
  letters: string[];
}

export function ComplexSpan(props: {
  trial: Trial;
  onDone: (r: Response) => void;
}) {
  const payload = props.trial.stimulus.payload as ComplexSpanPayload;
  const setSize = payload.letters.length;

  const [step, setStep] = createSignal<'math' | 'letter' | 'recall'>('math');
  const [mathIndex, setMathIndex] = createSignal(0);
  const [mathResponses, setMathResponses] = createSignal<boolean[]>([]);
  const [recalled, setRecalled] = createSignal<string[]>([]);
  const [recallInput, setRecallInput] = createSignal('');
  const [letterShowTime, setLetterShowTime] = createSignal(0);
  const [responseStartTime] = createSignal(Date.now());

  function handleMathResponse(userSaysTrue: boolean) {
    const currentResponses = mathResponses();
    currentResponses.push(userSaysTrue);
    setMathResponses(currentResponses);

    const nextMathIdx = mathIndex() + 1;
    if (nextMathIdx < setSize) {
      // Show letter after math
      setMathIndex(nextMathIdx);
      setStep('letter');
      setLetterShowTime(Date.now());
      // Auto-advance to next math after 500ms
      setTimeout(() => {
        setStep('math');
      }, 500);
    } else {
      // All math+letter pairs done, move to recall
      setStep('recall');
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (step() === 'math') {
      if (e.key === 't' || e.key === 'T') {
        handleMathResponse(true);
        e.preventDefault();
      } else if (e.key === 'f' || e.key === 'F') {
        handleMathResponse(false);
        e.preventDefault();
      }
    } else if (step() === 'recall') {
      if (e.key === 'Enter' && recallInput().length > 0) {
        handleRecallSubmit();
        e.preventDefault();
      } else if (e.key === 'Backspace') {
        const input = recallInput();
        setRecallInput(input.slice(0, -1));
        setRecalled(recalled().slice(0, -1));
        e.preventDefault();
      } else if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        const letter = e.key.toUpperCase();
        if (recalled().length < setSize) {
          setRecallInput(recallInput() + letter);
          setRecalled([...recalled(), letter]);
        }
        e.preventDefault();
      }
    }
  }

  onMount(() => window.addEventListener('keydown', handleKeyDown));
  onCleanup(() => window.removeEventListener('keydown', handleKeyDown));

  function handleRecallSubmit() {
    const rtMs = Date.now() - responseStartTime();
    const response: Response = {
      trialId: props.trial.id,
      event: {
        kind: 'text',
        value: JSON.stringify({
          mathResponses: mathResponses(),
          recalled: recalled()
        }),
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
  }

  return (
    <div class="container" style="text-align:center">
      <Show when={step() === 'math'}>
        <div>
          <h2 class="hero">Is this correct?</h2>
          <p class="muted">
            Item {mathIndex() + 1} of {setSize}
          </p>
          <div style="margin:2rem 0;font-size:2.5rem;font-family:monospace;font-weight:bold;min-height:80px;display:flex;align-items:center;justify-content:center">
            {payload.mathProblems[mathIndex()]?.question}
          </div>
          <div style="display:flex;gap:2rem;justify-content:center;margin:2rem 0">
            <button
              onClick={() => handleMathResponse(true)}
              style="padding:1rem 2rem;font-size:1.2rem;min-width:120px"
            >
              TRUE (T)
            </button>
            <button
              onClick={() => handleMathResponse(false)}
              style="padding:1rem 2rem;font-size:1.2rem;min-width:120px"
            >
              FALSE (F)
            </button>
          </div>
          <p class="muted">Press T or F, or click button</p>
        </div>
      </Show>

      <Show when={step() === 'letter'}>
        <div>
          <h2 class="hero" style="font-size:5rem;font-weight:bold">
            {payload.letters[mathIndex()]}
          </h2>
          <p class="muted">Memorize this letter</p>
        </div>
      </Show>

      <Show when={step() === 'recall'}>
        <div>
          <h2 class="hero">Recall the letters</h2>
          <p class="muted">Enter the letters in the order they appeared</p>
          <div
            style="margin:2rem 0;font-size:2rem;font-family:monospace;letter-spacing:0.5rem;min-height:80px;display:flex;align-items:center;justify-content:center;border:2px solid #444;padding:1rem;border-radius:0.5rem"
          >
            {recallInput() || '\u00A0'}
          </div>
          <div style="margin:2rem 0">
            <p class="muted">
              Progress: {recalled().length} / {setSize}
            </p>
          </div>
          <div style="display:flex;gap:1rem;justify-content:center">
            <button
              onClick={() => {
                setRecallInput('');
                setRecalled([]);
              }}
              style="padding:0.8rem 1.5rem;font-size:1rem"
            >
              Clear
            </button>
            <button
              onClick={handleRecallSubmit}
              disabled={recalled().length === 0}
              style="padding:0.8rem 1.5rem;font-size:1rem;cursor:pointer"
            >
              Submit (Enter)
            </button>
          </div>
          <p class="muted" style="margin-top:1.5rem">
            Type letters, Backspace to delete, Enter to submit
          </p>
        </div>
      </Show>
    </div>
  );
}
