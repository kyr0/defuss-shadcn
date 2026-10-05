/**
 * Why: one state primitive for the whole system (AGENTS.md "State through
 * stores"): defuss-store's synchronous observable store, plus the one way to
 * keep a value in Web Storage - validated, versioned, falling back to memory
 * when storage is blocked (private mode, sandboxed frames), synchronized
 * across tabs on request. Emitted once inside core: components bind to it
 * through df$.shadcn.shared, pages and apps reach it as df$.store.
 * Limits: values must be JSON (defuss-store's codec rejects the rest);
 * cross-tab sync is whole-value last-write-wins.
 */
import { computed, createStore, jsonEquals } from 'defuss-store';
import type { Store } from 'defuss-store';
import { createMemoryStorage, createWebStorage, jsonCodec } from 'defuss-store/storage';
import type { Codec, StorageBackend } from 'defuss-store/storage';
import { attachPersistence } from 'defuss-store/persist';
import type { PersistenceController } from 'defuss-store/persist';

export { computed, createStore, jsonEquals };
export type { Store };

export interface PersistOptions<T> {
  /** 'local' (default) or 'session' */
  area?: 'local' | 'session';
  /** a storage of your own (getItem / setItem / removeItem - e.g. a
   *  component's configurable backend) instead of the area */
  storage?: StorageBackend;
  /** schema version of the stored value (default 1) */
  version?: number;
  /** a stored value is only restored when this accepts it - default: the
   *  same JSON shape as the initial value (see sameShape) */
  validate?: (value: unknown) => value is T;
  /** follow writes from other tabs (localStorage) */
  sync?: boolean;
  /** turn a value written before the store existed (plain JSON or a raw
   *  string, not a defuss-store envelope) into the current shape - e.g. a
   *  legacy '1' into true. Without it such a value is adopted as-is. */
  migrate?: (legacy: unknown) => T;
  /** a read or write the storage refused (quota, permission) - the value
   *  stays in memory either way; default: ignored */
  onError?: (error: unknown) => void;
}

/** One Web Storage adapter per area, memory when the browser refuses. */
const areas: Partial<Record<'local' | 'session', ReturnType<typeof createWebStorage>>> = {};
const inMemory = new Set<'local' | 'session'>();
function storageOf(area: 'local' | 'session') {
  return (areas[area] ??= createWebStorage(area, { fallback: createMemoryStorage(), onUnavailable: () => inMemory.add(area) }));
}

/** false once the browser refused the area and its values live in memory
 *  only (they are gone with the page) */
export function storageAvailable(area: 'local' | 'session' = 'local'): boolean {
  try {
    storageOf(area).getItem('defuss-store:probe');
  } catch {
    return false;
  }
  return !inMemory.has(area);
}

/**
 * The default validator: the stored value has the initial value's JSON shape
 * - same primitive type, arrays stay arrays, an object's known keys keep
 * their shapes (extra keys are tolerated, missing keys are not).
 */
export function sameShape(initial: unknown): (value: unknown) => boolean {
  const check = (model: unknown, value: unknown): boolean => {
    if (model === null) return value === null;
    if (Array.isArray(model)) return Array.isArray(value);
    if (typeof model === 'object') {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
      return Object.keys(model as object).every((k) => k in (value as object) && check((model as Record<string, unknown>)[k], (value as Record<string, unknown>)[k]));
    }
    return typeof value === typeof model;
  };
  return (value) => check(initial, value);
}

/**
 * Values written before the store existed are adopted once: a key that holds
 * plain JSON (`true`, `["a"]`) or a raw string (`claude`) instead of a
 * defuss-store envelope decodes as that value, tagged `legacyVersion` (0 when
 * a migrate() converts it, else the current version) - and the next write
 * stores the envelope. Everything else is jsonCodec's.
 */
function adoptingCodec(legacyVersion: number): Codec {
  return {
    encode: (value) => jsonCodec.encode(value),
    decode: (serialized) => {
      let parsed: unknown;
      try {
        parsed = jsonCodec.decode(serialized);
      } catch {
        return { format: 'defuss-store', formatVersion: 1, version: legacyVersion, value: serialized };
      }
      const isEnvelope = typeof parsed === 'object' && parsed !== null && (parsed as { format?: unknown }).format === 'defuss-store';
      return isEnvelope ? parsed : { format: 'defuss-store', formatVersion: 1, version: legacyVersion, value: parsed };
    },
  };
}

/**
 * Same-tab peers: two bundles on one page (the docs head script and core)
 * may each hold a store for one key. Native storage events only reach OTHER
 * tabs, so every write announces itself on the document and the peers read
 * the key again - no shared global needed.
 */
const WRITE_EVENT = 'defuss-store-write';
let peerSeq = 0;
const controllers = new WeakMap<Store<unknown>, PersistenceController>();
const controllerOf = (store: Store<unknown>): PersistenceController | undefined => controllers.get(store);

/** read the stored value again (a write from elsewhere); false on failure */
export function reload(store: Store<unknown>): boolean {
  return controllerOf(store)?.rehydrate() ?? false;
}
/** remove the stored value; the store keeps its value in memory */
export function forget(store: Store<unknown>): boolean {
  return controllerOf(store)?.clear() ?? false;
}
/** true while the store's value is safely in storage (no failed read or write) */
export function persistOk(store: Store<unknown>): boolean {
  const status = controllerOf(store)?.status();
  return !!status && status.phase === 'active' && !status.lastError;
}

/**
 * A store whose value lives in Web Storage under `key`: the stored value (if
 * valid) wins over `initial`; every change is written synchronously and
 * reaches the page's other stores for the same key.
 */
export function persisted<T>(key: string, initial: T, options: PersistOptions<T> = {}): Store<T> {
  const store = createStore<T>(initial, { equals: jsonEquals });
  const area = options.storage ? null : (options.area ?? 'local');
  const controller = attachPersistence(store, {
    key,
    storage: options.storage ?? storageOf(area!),
    version: options.version ?? 1,
    validate: (options.validate ?? sameShape(initial)) as (value: unknown) => value is T,
    sync: options.sync ?? false,
    codec: adoptingCodec(options.migrate ? 0 : (options.version ?? 1)),
    ...(options.migrate ? { migrate: (old: unknown, from: number) => (from === 0 ? options.migrate!(old) : old) } : {}),
    // a blocked or full storage keeps the value in memory - never throws at the page
    onError: options.onError ?? (() => {}),
  });
  controllers.set(store as Store<unknown>, controller);
  // a stored value that failed to read (corrupt, wrong shape, newer version)
  // pauses defuss-store's writes to keep those bytes; here the next real
  // change replaces them - what every Web Storage use did before the stores
  store.subscribe(() => {
    if (controller.status().phase === 'paused') controller.flush();
  });
  const doc = (globalThis as { document?: Document }).document;
  // peers share an area; a storage of one's own has none
  if (doc && area) {
    const id = ++peerSeq + ':' + Math.random();
    let reading = false;
    store.subscribe(() => {
      if (!reading) doc.dispatchEvent(new CustomEvent(WRITE_EVENT, { detail: { area, key, id } }));
    });
    const onPeerWrite = (e: Event): void => {
      const d = (e as CustomEvent<{ area: string; key: string; id: string }>).detail;
      if (!d || d.id === id || d.area !== area || d.key !== key || store.destroyed) return;
      reading = true;
      try {
        controller.rehydrate();
      } finally {
        reading = false;
      }
    };
    doc.addEventListener(WRITE_EVENT, onPeerWrite);
    store.onDestroy(() => doc.removeEventListener(WRITE_EVENT, onPeerWrite));
  }
  return store;
}

/** Where a component instance keeps its view: `session` (the default),
 *  `local`, or `none`. */
export type PersistArea = 'session' | 'local' | 'none';
export interface ViewPersistence {
  area?: PersistArea;
  /** the generated key's prefix (default `defuss-shadcn:<page path>`) */
  prefix?: string;
  /** the whole key - replaces the generated one */
  key?: string;
}

/**
 * Why: a data grid's sort and filters should survive a reload of the page
 * without any setup - and an app (an admin dashboard, an issue tracker)
 * should be able to keep them across visits, or share one key between pages.
 * Resolves an element's persistence from its attributes and an optional
 * config (the config wins): `data-persist="session|local|none"`,
 * `data-persist-prefix`, `data-persist-key`. The generated key is
 * `<prefix>:<kind>:<id>` - `id` the element's id, else `fallbackId` (its
 * position among its kind on the page). null = not persisted.
 */
export function viewPersistence(el: HTMLElement, kind: string, fallbackId: string, config: ViewPersistence = {}): { area: 'session' | 'local'; key: string } | null {
  const area = config.area ?? (el.dataset.persist as PersistArea | undefined) ?? 'session';
  if (area === 'none') return null;
  const path = (globalThis as { location?: Location }).location?.pathname ?? '';
  const prefix = config.prefix ?? el.dataset.persistPrefix ?? `defuss-shadcn:${path}`;
  const key = config.key ?? el.dataset.persistKey ?? `${prefix}:${kind}:${el.id || fallbackId}`;
  return { area: area === 'local' ? 'local' : 'session', key };
}
