/**
 * The Database Explorer's connection to defuss-db: `connect()` starts the OPFS worker (db-worker.js beside this
 * module) and, where a page cannot have one - VERIFIED: a docs card is an opaque-origin sandbox without OPFS - opens the same
 * operations in memory on the page. Either way the page gets one API: `call(op, ...args)` → a Promise of the value.
 */
import type { Ops } from './ops.ts';

export interface Connection {
  /** 'opfs': the files of this origin, kept across visits; 'memory': this page only */
  mode: 'opfs' | 'memory';
  /** why the connection is in memory (the worker's error), empty on OPFS */
  reason: string;
  call<K extends keyof Ops>(op: K, ...args: Parameters<Ops[K]>): Promise<Awaited<ReturnType<Ops[K]>>>;
  close(): Promise<void>;
}

export interface ConnectOptions {
  /** the OPFS namespace - every tab of the app uses the same one */
  namespace?: string;
  /** 'memory' skips the worker */
  prefer?: 'opfs' | 'memory';
  /** how long the worker may take to open the admin database (default 15 s) */
  timeout?: number;
}

export async function connect(options: ConnectOptions = {}): Promise<Connection> {
  let reason = '';
  if (options.prefer !== 'memory') {
    try {
      return await worker(options);
    } catch (err) {
      reason = (err as Error).message;
    }
  } else reason = 'asked for memory';
  const [{ openMemory }, { createOps, OPEN_LIMITS, SYSTEM_DB }] = await Promise.all([
    import('defuss-db'),
    import('./ops.ts'),
  ]);
  const ops = createOps((name) => openMemory({ name, ...OPEN_LIMITS }));
  await ops.createDatabase(SYSTEM_DB);
  return {
    mode: 'memory',
    reason,
    call: (op, ...args) => (ops[op] as (...a: unknown[]) => Promise<never>).apply(ops, args),
    close: async () => void (await ops.close()),
  };
}

function worker({ namespace = 'defuss-db', timeout = 15_000 }: ConnectOptions): Promise<Connection> {
  return new Promise((resolve, reject) => {
    if (globalThis.origin === 'null' || !navigator.storage?.getDirectory)
      return reject(new Error('this page has no Origin Private File System'));
    let w: Worker;
    try {
      w = new Worker(new URL('./db-worker.js', import.meta.url), { type: 'module', name: 'defuss-db' });
    } catch (err) {
      return reject(err);
    }
    let seq = 0;
    const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
    w.onmessage = ({ data }) => {
      const p = pending.get(data.id);
      if (!p) return;
      pending.delete(data.id);
      if (data.ok) p.resolve(data.value);
      else p.reject(Object.assign(new Error(data.error.message), { code: data.error.code }));
    };
    w.onerror = (e) => {
      const err = new Error(e.message || 'the database worker failed to start');
      for (const p of pending.values()) p.reject(err);
      pending.clear();
    };
    const call = (op: string, ...args: unknown[]) =>
      new Promise<never>((res, rej) => {
        const id = ++seq;
        pending.set(id, { resolve: res as (v: unknown) => void, reject: rej });
        const transfer = args.filter((a): a is Uint8Array => a instanceof Uint8Array).map((a) => a.buffer);
        w.postMessage({ id, op, args }, transfer);
      });
    const timer = setTimeout(() => {
      w.terminate();
      reject(new Error('the database worker did not answer'));
    }, timeout);
    call('init', { namespace }).then(
      () => {
        clearTimeout(timer);
        resolve({
          mode: 'opfs',
          reason: '',
          call: call as Connection['call'],
          close: async () => {
            await call('close').catch(() => null);
            w.terminate();
          },
        });
      },
      (err) => {
        clearTimeout(timer);
        w.terminate();
        reject(err);
      },
    );
  });
}

// the query language's helpers, for a page that checks or shows what it sends (the insert dialog, a JSON view)
export { parseDocument, stringify, typeOf, QueryError } from './query.ts';
export { complete, literal, OPERATORS } from './complete.ts';
export { detect, extension } from './transfer.ts';
export { fromPipeline, parsePipeline } from './pipeline.ts';
