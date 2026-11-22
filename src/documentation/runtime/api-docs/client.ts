/**
 * The API Documentation scaffold's defuss-rpc runtime, bundled into js/api-docs/client.js by scripts/build-rpc.ts: the
 * documented schema (rpc.docs.json, written by `defuss-rpc schema` from api.ts), the example API itself as the
 * in-page mock, and a client for a real server - both answer through {@link call} with the same shape.
 *
 * VERIFIED: (scaffold-api-docs.e2e) why the wire format and not defuss-rpc's client - Try it shows what travels (the body a curl sample sends, each
 * NDJSON frame of a stream), and the client hides both behind a typed proxy. The in-page mock round-trips arguments
 * and results through DSON as a server would, so a Date or a Map arrives as it would over the wire.
 */
import { DSON } from 'defuss-dson';
import api, { resetExample } from './api.ts';
import docs from './rpc.docs.json' with { type: 'json' };

/** The documented schema: what /rpc/schema of the example server serves, with each method's documentation. */
export const schema = docs;

/** Where a call goes: the example in this page, or a defuss-rpc server at `url`. */
export type Target = { kind: 'page' } | { kind: 'server'; url: string };

/** One answer: the HTTP status (200 in the page), the value or the error, a stream's frames, the time taken. */
export interface Answer {
  status: number;
  value?: unknown;
  error?: string;
  /** A generator's values, one per NDJSON frame, before its return value. */
  frames?: unknown[];
  ms: number;
}

/** The text of a call body as defuss-rpc's client sends it (DSON, JSON-compatible). */
export const body = (className: string, methodName: string, args: unknown[]): string =>
  DSON.stringify({ className, methodName, args });

/** DSON text of a value, and a value from DSON or JSON text. */
export const dson = { stringify: (value: unknown) => DSON.stringify(value), parse: (text: string) => DSON.parse(text) };

const roundTrip = <T>(value: T): T => DSON.parse(DSON.stringify(value)) as T;
const base = (url: string) => url.replace(/\/+$/, '').replace(/\/rpc(\/schema)?$/, '');

/**
 * Calls `className.methodName(...args)`. A stream (async generator) reports each value through `onFrame` as it
 * arrives and ends with its return value.
 */
export async function call(
  target: Target,
  className: string,
  methodName: string,
  args: unknown[],
  onFrame: (value: unknown) => void = () => {},
): Promise<Answer> {
  const started = performance.now();
  const ms = () => Math.round(performance.now() - started);
  if (target.kind === 'page') {
    const entry = (api as Record<string, unknown>)[className];
    const doc = docs.find((e) => ('className' in e ? e.className : e.moduleName) === className);
    if (!entry || !doc) return { status: 404, error: `Namespace ${className} not found`, ms: ms() };
    const descriptor = (doc.methods as Record<string, { generator: boolean }>)[methodName];
    if (!descriptor) return { status: 404, error: `Function ${methodName} not found on ${className}`, ms: ms() };
    const self = typeof entry === 'function' ? new (entry as new () => Record<string, unknown>)() : (entry as Record<string, unknown>);
    try {
      const result = (self[methodName] as (...a: unknown[]) => unknown).apply(self, roundTrip(args));
      if (descriptor.generator) {
        const iterator = result as AsyncGenerator<unknown, unknown>;
        const frames: unknown[] = [];
        for (;;) {
          const step = await iterator.next();
          if (step.done) return { status: 200, value: roundTrip(step.value ?? null), frames, ms: ms() };
          const value = roundTrip(step.value);
          frames.push(value);
          onFrame(value);
        }
      }
      return { status: 200, value: roundTrip(await result), ms: ms() };
    } catch (error) {
      return { status: 500, error: `Error calling ${methodName}: ${error instanceof Error ? error.message : String(error)}`, ms: ms() };
    }
  }

  let response: Response;
  try {
    response = await fetch(`${base(target.url)}/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body(className, methodName, args),
    });
  } catch (error) {
    return { status: 0, error: error instanceof Error ? error.message : String(error), ms: ms() };
  }
  if (!response.ok) {
    const text = await response.text();
    let error = text;
    try {
      error = (JSON.parse(text) as { error?: string }).error ?? text;
    } catch {
      // not JSON: the text as it came
    }
    return { status: response.status, error, ms: ms() };
  }
  if ((response.headers.get('content-type') ?? '').includes('ndjson')) {
    const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
    const frames: unknown[] = [];
    let rest = '';
    for (;;) {
      const { done, value } = await reader.read();
      rest += value ?? '';
      const lines = rest.split('\n');
      rest = done ? '' : lines.pop()!;
      for (const line of lines.filter(Boolean)) {
        const frame = DSON.parse(line) as { type: string; value?: unknown; error?: { message: string } };
        if (frame.type === 'yield') {
          frames.push(frame.value);
          onFrame(frame.value);
        } else if (frame.type === 'return') return { status: 200, value: frame.value, frames, ms: ms() };
        else if (frame.type === 'error') return { status: 200, error: frame.error?.message, frames, ms: ms() };
      }
      if (done) return { status: 200, frames, ms: ms() };
    }
  }
  return { status: 200, value: DSON.parse(await response.text()), ms: ms() };
}

/** The schema a server serves at /rpc/schema - what Try it checks before it calls a server. */
export async function served(url: string): Promise<{ className?: string; moduleName?: string; methods: Record<string, unknown> }[]> {
  const response = await fetch(`${base(url)}/rpc/schema`, { method: 'POST' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** Starts the in-page example over from its seed. */
export const reset = (): void => resetExample();

// the samples and example values of the static pages (pages.ts), so Try it shows the same code
export { exampleArgs, exampleValue, namespaceName, rpcSamples, RPC_SERVER, signature } from './pages.ts';
