let worker: Worker | null = null;
let counter = 0;
const pending = new Map<number, (r: any) => void>();

function ensureWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./db-worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (ev) => {
      const { id, ...rest } = ev.data;
      const resolver = pending.get(id);
      if (resolver) { pending.delete(id); resolver(rest); }
    };
  }
  return worker;
}

function call<T>(req: unknown): Promise<T> {
  const w = ensureWorker();
  const id = ++counter;
  return new Promise((resolve, reject) => {
    pending.set(id, (r: any) => r.kind === 'error' ? reject(new Error(r.message)) : resolve(r));
    w.postMessage({ id, ...(req as Record<string, unknown>) });
  });
}

export async function dbInit(): Promise<void> {
  await call({ kind: 'init' });
}

export async function dbExec(sql: string, bind: unknown[] = []): Promise<void> {
  await call({ kind: 'exec', sql, bind });
}

export async function dbQuery<T = Record<string, unknown>>(
  sql: string, bind: unknown[] = []
): Promise<T[]> {
  const r = await call<{ kind: 'rows'; rows: T[] }>({ kind: 'query', sql, bind });
  return r.rows;
}
