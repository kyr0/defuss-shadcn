// the df$ runtime core installs in production (shared code selects through it)
import './lib/df-runtime.ts';
import { afterEach, describe, expect, it } from 'vitest';
import { anim } from '../src/shared/anim.js';
import {
  animateCount,
  clampIndex,
  coerceIndex,
  installDdf,
  presentationScope,
  revealAttr,
  REVEAL_DIRECTIONS,
} from '../src/shared/presentation.js';

/**
 * Why: pins the shared presentation library contract (src/shared/presentation.ts)
 * - the helpers core publishes under the global `ddf$` alias. Pure math
 * (coerceIndex/clampIndex) and the declarative reveal vocabulary (revealAttr)
 * are isomorphic; the DOM-facing ones (animateCount, presentationScope, the
 * ddf$ install guard) run here in Vitest browser mode.
 */

afterEach(() => {
  document.body.innerHTML = '';
});

describe('coerceIndex', () => {
  it('accepts numbers and numeric strings, truncating toward zero', () => {
    expect(coerceIndex(3, -1)).toBe(3);
    expect(coerceIndex('7', -1)).toBe(7);
    expect(coerceIndex('2.9', -1)).toBe(2);
    expect(coerceIndex(-4, -1)).toBe(-4);
  });

  it('falls back for anything un-parseable', () => {
    expect(coerceIndex('slide-2', -1)).toBe(-1);
    expect(coerceIndex(undefined, 0)).toBe(0);
    expect(coerceIndex(NaN, 5)).toBe(5);
    expect(coerceIndex(null, 2)).toBe(2);
  });
});

describe('clampIndex', () => {
  it('keeps indices inside [0, count-1]', () => {
    expect(clampIndex(1, 5)).toBe(1);
    expect(clampIndex(-3, 5)).toBe(0);
    expect(clampIndex(99, 5)).toBe(4);
    expect(clampIndex('2', 3)).toBe(2);
  });

  it('returns 0 for an empty window', () => {
    expect(clampIndex(4, 0)).toBe(0);
  });
});

describe('revealAttr (re-exported from the shared motion module)', () => {
  it('maps a direction to the data-df-entrance attribute', () => {
    expect(revealAttr('up')).toEqual({ 'data-df-entrance': 'up' });
    for (const dir of REVEAL_DIRECTIONS) expect(revealAttr(dir)['data-df-entrance']).toBe(dir);
  });

  it('writes the delay as the shared --df-motion-delay custom property', () => {
    expect(revealAttr('left', 400)).toEqual({
      'data-df-entrance': 'left',
      style: '--df-motion-delay:400ms',
    });
  });

  it('fails soft: unknown directions fall back to up; zero/junk delays are omitted', () => {
    expect(revealAttr('sideways')).toEqual({ 'data-df-entrance': 'up' });
    expect(revealAttr('up', 'soon')).not.toHaveProperty('style');
    // zero delay is the default - the style would be noise
    expect(revealAttr('zoom', '0')).not.toHaveProperty('style');
  });
});

describe('animateCount', () => {
  it('settles immediately on the final (locale-formatted) value', () => {
    const el = document.createElement('span');
    document.body.append(el);
    animateCount(el, { to: 1200, duration: 0 });
    expect(el.textContent).toBe(new Intl.NumberFormat().format(1200));
  });

  it('reads its configuration from data-* attributes', () => {
    const el = document.createElement('span');
    el.dataset.count = '4.50';
    el.dataset.countDecimals = '1';
    document.body.append(el);
    animateCount(el, { duration: 0 });
    expect(el.textContent).toBe(new Intl.NumberFormat(undefined, { minimumFractionDigits: 1 }).format(4.5));
  });

  it('runs a rAF animation from start to target and returns a canceller', async () => {
    const el = document.createElement('span');
    document.body.append(el);
    const cancel = animateCount(el, { from: 0, to: 100, duration: 80, decimals: 0 });
    expect(el.textContent).toBe('0');
    await new Promise((r) => setTimeout(r, 160));
    expect(el.textContent).toBe('100');
    cancel();
  });
});

describe('ddf$ install guard', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>)['ddf$'];
  });

  it('installs once and rejects a second core copy loudly', () => {
    delete (globalThis as Record<string, unknown>)['ddf$'];
    const ns = installDdf({
      abi: 'test',
      defussGlobals: null,
      safeShowPopover: () => undefined,
      defussQuery: null,
      debounce: null,
      presentation: presentationScope,
      animateCount,
      revealAttr,
      // the motion controller members of the namespace contract
      entrance: () => ({ finished: Promise.resolve(), cancel: () => undefined }),
      draw: () => ({ finished: Promise.resolve(), cancel: () => undefined }),
      // the animation engine member of the namespace contract
      anim,
      bindGlobalKeys: () => () => undefined,
      loadTheme: async () => undefined,
      clampIndex,
      coerceIndex,
    });
    expect((globalThis as Record<string, unknown>)['ddf$']).toBe(ns);
    expect(() => installDdf(ns)).toThrow(/already defined/);
  });
});

describe('presentationScope', () => {
  it('throws when no deck exists', () => {
    expect(() => presentationScope()).toThrow(/no \.presentation element/);
  });
});
