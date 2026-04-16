import type { Trial, Response } from '~/types/module';

let worker: Worker | null = null;
let counter = 0;
const pending = new Map<number, (r: any) => void>();

function ensureWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./engine-worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (ev) => {
      const { id, ...rest } = ev.data;
      const resolver = pending.get(id);
      if (resolver) { pending.delete(id); resolver(rest); }
    };
    window.addEventListener('keydown', (e) => {
      worker!.postMessage({ id: 0, kind: 'key-event', key: e.key, ts: performance.now() });
    });
  }
  return worker;
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
