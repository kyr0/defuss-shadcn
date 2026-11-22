/**
 * The Database Explorer's OPFS worker. VERIFIED: defuss-db's `openOPFS` runs only in a dedicated worker (OPFS sync access
 * handles, Web Locks). The page posts { id, op, args }; the worker answers { id, ok, value } or { id, ok: false,
 * error }. The first message is { op: 'init', args: [{ namespace }] }, answered once the admin database opened -
 * a page that gets no answer falls back to memory (db.ts).
 */
import { openOPFS } from 'defuss-db/browser';
import { createOps, OPEN_LIMITS, SYSTEM_DB, type Ops } from './ops.ts';

let ops: Ops | null = null;
self.onmessage = async ({ data }: MessageEvent<{ id: number; op: string; args: unknown[] }>) => {
  const { id, op, args = [] } = data;
  try {
    let value: unknown;
    if (op === 'init') {
      const { namespace } = (args[0] ?? {}) as { namespace?: string };
      ops = createOps((name) => openOPFS({ namespace: namespace ?? 'defuss-db', name, ...OPEN_LIMITS }));
      await ops.createDatabase(SYSTEM_DB);
      value = 'opfs';
    } else {
      if (!ops) throw new Error('the worker is not initialized');
      const fn = (ops as unknown as Record<string, (...a: unknown[]) => unknown>)[op];
      if (typeof fn !== 'function') throw new Error(`unknown operation ${op}`);
      value = await fn.apply(ops, args);
    }
    const transfer = value instanceof Uint8Array ? [value.buffer] : [];
    (self as unknown as Worker).postMessage({ id, ok: true, value }, transfer);
  } catch (err) {
    const e = err as Error & { code?: string };
    (self as unknown as Worker).postMessage({
      id,
      ok: false,
      error: { message: e?.message ?? String(err), code: e?.code ?? null },
    });
  }
};
