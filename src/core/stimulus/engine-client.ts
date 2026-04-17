import type { Trial, Response } from '~/types/module';

let worker: Worker | null = null;
let counter = 0;
const pending = new Map<number, (r: any) => void>();

function ensureWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./engine-worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (ev) => {
      if (ev.data?.kind === 'play-audio' && typeof ev.data.letter === 'string') {
        try {
          const utter = new SpeechSynthesisUtterance(ev.data.letter);
          utter.rate = 1.2; utter.volume = 1;
          speechSynthesis.speak(utter);
        } catch (e) { /* ignore — not all browsers support synth */ }
        return;
      }
      const { id, ...rest } = ev.data;
      const resolver = pending.get(id);
      if (resolver) { pending.delete(id); resolver(rest); }
    };
    window.addEventListener('keydown', (e) => {
      // Only forward keys if a trial is actively running/pending to avoid spamming the worker 
      // when the user is typing in standard UI inputs (like Complex Span recall).
      if (pending.size > 0) {
        if ([' ', 'Spacebar', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
          e.preventDefault();
        }
        const mappedKey = e.key === ' ' || e.key === 'Spacebar' ? 'Space' : e.key;
        worker!.postMessage({ id: 0, kind: 'key-event', key: mappedKey, ts: performance.now() });
      }
    });
  }
  return worker;
}

export function sendSyntheticKey(key: string) {
  const w = ensureWorker();
  w.postMessage({ id: 0, kind: 'key-event', key, ts: performance.now() });
}

export async function runTrial(trial: Trial, canvas?: OffscreenCanvas): Promise<Response> {
  const w = ensureWorker();
  const id = ++counter;
  return new Promise((resolve, reject) => {
    pending.set(id, (r: any) => r.kind === 'error' ? reject(new Error(r.message)) : resolve(r.response));
    const msg: any = { id, kind: 'run-trial', trial };
    if (canvas) msg.canvas = canvas;
    w.postMessage(msg, canvas ? [canvas] : []);
  });
}
