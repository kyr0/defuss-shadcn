/**
 * Why: the Math components keep their state as plain JSON and take configs from setState() and authored
 * script tags - untrusted input. mathClone() is the one guard every one of them runs it through (bounded,
 * acyclic, plain objects, no prototype keys, finite numbers), mathText() the TeX size limit. A rejected value
 * throws before any state changes; an accepted one is a copy the caller cannot mutate from outside.
 */
import { describe, expect, it } from 'vitest';
import { mathClone, mathText } from '../src/shared/math.ts';

describe('mathClone: a validated copy of JSON math data', () => {
  it('copies plain JSON - nested objects, arrays, MathJSON - as a structurally equal, separate value', () => {
    const value = { latex: '\\frac{x}{x}', json: ['Divide', 'x', 'x'], context: { domain: 'real', precision: 34 }, ok: true, none: null };
    const copy = mathClone(value);
    expect(copy).toEqual(value);
    expect(copy).not.toBe(value);
    expect(copy.json).not.toBe(value.json);
  });

  it('keeps an object two fields share (a DAG is no cycle)', () => {
    const shared = { latex: 'x', json: 'x' };
    expect(mathClone({ before: shared, after: shared })).toEqual({ before: shared, after: shared });
  });

  it.each([
    ['a cycle', () => {
      const a: Record<string, unknown> = {};
      a.self = a;
      return a;
    }, /acyclic/],
    ['a class instance', () => ({ when: new Date(0) }), /plain objects/],
    ['a function', () => ({ fn: () => 1 }), /acyclic JSON/],
    ['NaN', () => ({ n: Number.NaN }), /non-finite/],
    ['Infinity', () => [Number.POSITIVE_INFINITY], /non-finite/],
    ['a prototype key', () => JSON.parse('{"__proto__": {"polluted": true}}'), /__proto__/],
    ['a constructor key', () => ({ constructor: 1 }), /constructor/],
    ['undefined', () => ({ u: undefined }), /acyclic JSON/],
  ])('refuses %s', (_label, make, message) => {
    expect(() => mathClone(make())).toThrow(message);
  });

  it('refuses data past the depth and the size limit', () => {
    let deep: unknown = 0;
    for (let i = 0; i < 100; i++) deep = [deep];
    expect(() => mathClone(deep)).toThrow(/depth/);
    expect(() => mathClone({ text: 'x'.repeat(2_000) }, 1_000)).toThrow(/size limit/);
  });
});

describe('mathText: TeX within the byte limit', () => {
  it('accepts a string up to 65,536 UTF-8 bytes and returns it', () => {
    expect(mathText('a^2 + b^2 = c^2')).toBe('a^2 + b^2 = c^2');
    expect(mathText('x'.repeat(65_536))).toHaveLength(65_536);
  });

  it('counts bytes, not UTF-16 units: 21,846 three-byte characters are too many', () => {
    expect(() => mathText('∑'.repeat(21_846))).toThrow(/65,536 bytes/);
  });

  it('refuses anything but a string', () => {
    expect(() => mathText(42)).toThrow(/string/);
    expect(() => mathText(null)).toThrow(/string/);
  });
});
