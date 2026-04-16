/// <reference lib="webworker" />
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { SCHEMA_DDL, CURRENT_VERSION } from './schema';

type Req =
  | { kind: 'init' }
  | { kind: 'exec'; sql: string; bind?: unknown[] }
  | { kind: 'query'; sql: string; bind?: unknown[] };

type Res =
  | { kind: 'ready' }
  | { kind: 'ok' }
  | { kind: 'rows'; rows: Record<string, unknown>[] }
  | { kind: 'error'; message: string };

let db: any = null;

async function init() {
  const sqlite3 = await sqlite3InitModule({
    print: () => {}, printErr: (m: string) => console.warn('[sqlite]', m)
  });
  if (!('opfs' in sqlite3)) {
    throw new Error('OPFS not available — check COOP/COEP headers and crossOriginIsolated');
  }
  db = new sqlite3.oo1.OpfsDb('/intellect-forge.db', 'ct');
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  for (const stmt of SCHEMA_DDL) db.exec(stmt);
  const row = db.selectObject('SELECT MAX(version) as v FROM schema_version');
  if (!row || row.v == null) {
    db.exec({
      sql: 'INSERT INTO schema_version(version, migrated_ts) VALUES(?, ?)',
      bind: [CURRENT_VERSION, Date.now()]
    });
  }
}

self.onmessage = async (ev: MessageEvent<Req & { id: number }>) => {
  const { id, ...req } = ev.data;
  const reply = (body: Res) => (self as any).postMessage({ id, ...body });
  try {
    if (req.kind === 'init') { await init(); reply({ kind: 'ready' }); return; }
    if (!db) throw new Error('db not initialized');
    if (req.kind === 'exec') { db.exec({ sql: req.sql, bind: req.bind ?? [] }); reply({ kind: 'ok' }); return; }
    if (req.kind === 'query') {
      const rows: any[] = [];
      db.exec({ sql: req.sql, bind: req.bind ?? [], rowMode: 'object', callback: (r: any) => rows.push(r) });
      reply({ kind: 'rows', rows });
      return;
    }
  } catch (e: any) {
    reply({ kind: 'error', message: e?.message ?? String(e) });
  }
};
