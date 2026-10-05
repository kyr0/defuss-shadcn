import { afterEach, describe, expect, it } from 'vitest';
import { forget, persistOk, persisted, reload, sameShape } from '../src/shared/store.ts';

/**
 * Why: every value the system keeps in Web Storage goes through persisted()
 * (AGENTS.md "State through stores") - including values visitors already
 * have from before the stores existed. Losing a visitor's theme or sidebar
 * state on upgrade would be the regression; these pin the adoption path.
 */
const KEY = 'defuss-shadcn-test:persisted';
afterEach(() => {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
});

describe('persisted()', () => {
  it('starts from the initial value and writes the defuss-store envelope on change', () => {
    const store = persisted(KEY, { page: 1 });
    expect(store.value).toEqual({ page: 1 });
    expect(localStorage.getItem(KEY)).toBeNull(); // no eager default write
    store.set('page', 3);
    const saved = JSON.parse(localStorage.getItem(KEY)!);
    expect(saved).toMatchObject({ format: 'defuss-store', version: 1, value: { page: 3 } });
    store.destroy();
  });

  it('restores a stored value over the initial one', () => {
    persisted(KEY, 'default').set('claude');
    expect(persisted(KEY, 'default').value).toBe('claude');
  });

  it('adopts a raw pre-store string (theme ids were written unwrapped)', () => {
    localStorage.setItem(KEY, 'claude');
    const store = persisted(KEY, 'default');
    expect(store.value).toBe('claude');
    store.set('vercel');
    expect(JSON.parse(localStorage.getItem(KEY)!).value).toBe('vercel');
  });

  it('adopts pre-store plain JSON', () => {
    localStorage.setItem(KEY, JSON.stringify({ intro: true }));
    expect(persisted(KEY, {} as Record<string, boolean>).value).toEqual({ intro: true });
  });

  it('migrate() converts a legacy value into the current shape', () => {
    localStorage.setItem(KEY, '1');
    expect(persisted(KEY, false, { migrate: (old) => old === 1 || old === '1' }).value).toBe(true);
  });

  it('a stored value of the wrong shape never replaces the initial one', () => {
    localStorage.setItem(KEY, JSON.stringify({ format: 'defuss-store', formatVersion: 1, version: 1, value: 42 }));
    expect(persisted(KEY, 'default').value).toBe('default');
  });

  it('a corrupt stored value is replaced by the next change (writes resume)', () => {
    localStorage.setItem(KEY, JSON.stringify({ format: 'defuss-store', formatVersion: 1, version: 1, value: 42 }));
    const store = persisted(KEY, 'default');
    store.set('claude');
    expect(JSON.parse(localStorage.getItem(KEY)!).value).toBe('claude');
    expect(persistOk(store)).toBe(true);
  });

  it('stores for the same key on one page follow each other (two bundles, no global)', () => {
    const a = persisted(KEY, 'default');
    const b = persisted(KEY, 'default');
    a.set('vercel');
    expect(b.value).toBe('vercel');
    b.set('claude');
    expect(a.value).toBe('claude');
    a.destroy();
    b.destroy();
  });

  it('a storage of its own: reload() reads it again, forget() removes the key only', () => {
    const bytes = new Map<string, string>();
    const storage = { getItem: (k: string) => bytes.get(k) ?? null, setItem: (k: string, v: string) => void bytes.set(k, v), removeItem: (k: string) => void bytes.delete(k) };
    const store = persisted(KEY, 0, { storage });
    store.set(3);
    expect(JSON.parse(bytes.get(KEY)!).value).toBe(3);
    bytes.set(KEY, JSON.stringify({ format: 'defuss-store', formatVersion: 1, version: 1, value: 9 }));
    reload(store);
    expect(store.value).toBe(9);
    forget(store);
    expect(bytes.has(KEY)).toBe(false);
    expect(store.value).toBe(9);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('a refusing storage keeps the value in memory and reports it', () => {
    const errors: unknown[] = [];
    const storage = { getItem: () => null, setItem: () => { throw new Error('quota'); }, removeItem: () => {} };
    const store = persisted(KEY, 0, { storage, onError: (e) => errors.push(e) });
    store.set(5);
    expect(store.value).toBe(5);
    expect(errors.length).toBeGreaterThan(0);
    expect(persistOk(store)).toBe(false);
  });

  it('session storage is one option away', () => {
    persisted(KEY, 0, { area: 'session' }).set(7);
    expect(JSON.parse(sessionStorage.getItem(KEY)!).value).toBe(7);
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

describe('sameShape()', () => {
  it('checks JSON types, arrays and known keys', () => {
    const v = sameShape({ a: 1, b: ['x'], c: { d: 'e' } });
    expect(v({ a: 2, b: [], c: { d: 'f' }, extra: true })).toBe(true);
    expect(v({ a: '2', b: [], c: { d: 'f' } })).toBe(false);
    expect(v({ a: 2, b: {}, c: { d: 'f' } })).toBe(false);
    expect(v({ a: 2, b: [] })).toBe(false);
    expect(sameShape(null)(null)).toBe(true);
  });
});
