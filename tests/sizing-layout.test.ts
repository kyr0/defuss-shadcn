import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
// Vite ?raw imports (browser mode has no node:fs) — same pattern as
// tests/contrast.test.ts. The two shipped modules are the system under test;
// injecting their text as <style> tags mirrors how a consumer page loads them
// (tokens → sizing → layout), layer declarations included.
import sizingCss from '../src/theme/sizing.css?raw';
import layoutCss from '../src/theme/layout.css?raw';

/**
 * Why: theme/sizing.css + theme/layout.css are shipped as standalone public
 * modules whose entire contract is computed CSS — there is no JS to unit
 * test. This suite runs the geometry contracts (scale math, density factors,
 * logical axes, cascade behavior, native hidden/dialog/popover preservation)
 * in the real browser engine against the real stylesheet text, the same
 * checks the ad-hoc runner used to do, in typed Vitest form. The doc pages
 * themselves (shell, nav, live demos) are exercised over HTTP by
 * tests/e2e/sizing-layout.e2e.ts.
 */

/** One base unit is 4px at a 16px root; the scale both modules share. */
const UNIT = 4;
const SCALE = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96];
let host: HTMLElement;
const root = document.documentElement;

const css = (el: Element, prop: string) => getComputedStyle(el).getPropertyValue(prop).trim();
const px = (el: Element, prop: string) => parseFloat(css(el, prop));

/** Adds a probe element under `parent` (default: the current host). */
function add(classes = '', parent: HTMLElement = host, style = '', tag = 'div'): HTMLElement {
  const el = document.createElement(tag);
  if (classes) el.className = classes;
  if (style) el.style.cssText = style;
  parent.append(el);
  return el;
}

/** Injects a stylesheet for the duration of the suite; returns its remover. */
function inject(cssText: string): () => void {
  const style = document.createElement('style');
  style.textContent = cssText;
  document.head.append(style);
  return () => style.remove();
}

let removeSheets: (() => void)[] = [];
let cleanup: (() => void)[] = [];

beforeAll(() => {
  // load order matters: layer declarations in the sheets establish
  // `components` before `utilities`, exactly like <link> order on a page.
  removeSheets = [inject(sizingCss), inject(layoutCss)];
  // the "named query boundary" contracts need one app-level rule —
  // unlayered on purpose (a consumer's own CSS overrides the layers).
  cleanup.push(inject('@container layout (inline-size >= 400px) { .query-test { flex-direction: row; } }'));
});

afterAll(() => {
  for (const off of cleanup) off();
  for (const off of removeSheets) off();
  host?.remove();
  root.removeAttribute('style');
});

/** Fresh 600px host with neutral density/scale state for each contract. */
beforeEach(() => {
  host?.remove();
  host = document.createElement('div');
  host.style.cssText = 'width:600px;position:relative;font-size:16px;';
  document.body.append(host);
  root.style.cssText = '';
  root.style.fontSize = '16px'; // deterministic rem baseline in the test frame
});

describe('public styles are static CSS', () => {
  it('carries no runtime or build directives', () => {
    for (const sheet of [sizingCss, layoutCss]) {
      expect(sheet).not.toMatch(/@(?:tailwind|apply|source|config)\b|!important|documentation\//);
      expect(sheet).toContain('@layer components, utilities;');
      expect(sheet).not.toMatch(/devicePixelRatio|font-size\s*:|@import\b/);
    }
  });
});

describe('sizing utilities', () => {
  it('maps every numeric dimension class to n × base units', () => {
    const props: Record<string, string[]> = {
      w: ['width'], h: ['height'], size: ['width', 'height'],
      'min-w': ['min-width'], 'min-h': ['min-height'],
      'max-w': ['max-width'], 'max-h': ['max-height'],
      inline: ['inline-size'], block: ['block-size'],
    };
    for (const [prefix, list] of Object.entries(props)) {
      for (const n of SCALE) {
        const el = add(`${prefix}-${n}`);
        for (const prop of list) expect(px(el, prop), `${prefix}-${n}: ${prop}`).toBeCloseTo(n * UNIT, 1);
      }
    }
  });

  it('applies density factors to every spacing family', () => {
    const families: Record<string, string> = { gap: 'gap', 'gap-x': 'column-gap', 'gap-y': 'row-gap' };
    for (const [prefix, long] of [['p', 'padding'], ['m', 'margin']]) {
      families[prefix] = long;
      for (const [suffix, side] of [['x', 'inline'], ['y', 'block'], ['t', 'top'], ['r', 'right'], ['b', 'bottom'], ['l', 'left'], ['s', 'inline-start'], ['e', 'inline-end']]) {
        families[prefix + suffix] = `${long}-${side}`;
      }
    }
    for (const [density, factor] of [['compact', 0.75], ['comfortable', 1], ['spacious', 1.25]] as const) {
      const context = add();
      context.dataset.density = density;
      for (const [family, prop] of Object.entries(families)) {
        for (const n of SCALE) {
          const el = add(`${family}-${n}`, context);
          expect(px(el, prop), `${density}: ${family}-${n}`).toBeCloseTo(n * UNIT * factor, 1);
        }
      }
    }
  });

  it('keeps -px values at exactly one CSS pixel under density', () => {
    host.dataset.density = 'compact';
    for (const [cls, prop] of [['w-px', 'width'], ['h-px', 'height'], ['gap-px', 'gap'], ['p-px', 'padding']]) {
      expect(px(add(cls), prop), cls).toBeCloseTo(1, 1);
    }
  });

  it('never scales dimensions or typography with density', () => {
    for (const density of ['compact', 'comfortable', 'spacious']) {
      const parent = add();
      parent.dataset.density = density;
      const el = add('size-4', parent);
      expect(px(el, 'width')).toBeCloseTo(16, 1);
      expect(px(el, 'height')).toBeCloseTo(16, 1);
      expect(px(el, 'font-size')).toBeCloseTo(16, 1);
    }
  });

  it('scopes density locally and inherits it', () => {
    const outer = add();
    outer.dataset.density = 'compact';
    const inner = add('p-4', outer);
    inner.dataset.density = 'comfortable';
    expect(px(add('p-4', outer), 'padding')).toBeCloseTo(12, 1); // inherits compact
    expect(px(inner, 'padding')).toBeCloseTo(16, 1);
    expect(px(add('p-4', inner), 'padding')).toBeCloseTo(16, 1); // inherits comfortable
  });

  it('honors a custom density factor and clamps negatives to 0', () => {
    host.style.setProperty('--layout-density', '0.9');
    expect(px(add('gap-4'), 'gap')).toBeCloseTo(14.4, 1);
    host.style.setProperty('--layout-density', '-1');
    expect(px(add('gap-4'), 'gap')).toBeCloseTo(0, 1);
  });

  it('follows the root font size preference', () => {
    root.style.fontSize = '20px';
    expect(px(add('w-4'), 'width')).toBeCloseTo(20, 1);
    expect(px(add('gap-4'), 'gap')).toBeCloseTo(20, 1);
  });

  it('reads the existing --spacing token as the scale base', () => {
    root.style.setProperty('--spacing', '6px');
    expect(px(add('w-4'), 'width')).toBeCloseTo(24, 1);
  });

  it('recomputes named aliases when --size-base changes globally', () => {
    root.style.setProperty('--size-base', '5px');
    expect(px(add('', host, 'width:var(--size-sm)'), 'width')).toBeCloseTo(15, 1);
    expect(px(add('w-4'), 'width')).toBeCloseTo(20, 1);
  });

  it('recomputes named aliases at an explicit size scope', () => {
    const context = add('', host, '--size-base:8px');
    context.dataset.sizeScope = '';
    expect(px(add('', context, 'width:var(--size-sm)'), 'width')).toBeCloseTo(24, 1);
    expect(px(add('w-4', context), 'width')).toBeCloseTo(32, 1);
    expect(px(add('w-4'), 'width')).toBeCloseTo(16, 1);
  });

  it('does not silently recompute inherited alias formulas', () => {
    // an inherited --size-sm formula resolved before the local base change:
    const context = add('', host, '--size-base:8px');
    expect(px(add('', context, 'width:var(--size-sm)'), 'width')).toBeCloseTo(12, 1); // still the root alias
    expect(px(add('w-4', context), 'width')).toBeCloseTo(32, 1); // numerics use the base directly
  });

  it('supports fractional and full dimensions', () => {
    const fractions: [string, number][] = [['1/2', 300], ['1/3', 200], ['2/3', 400], ['1/4', 150], ['3/4', 450], ['full', 600]];
    for (const [suffix, value] of fractions) {
      expect(px(add(`w-${suffix}`), 'width'), suffix).toBeCloseTo(value, 1);
    }
    host.style.height = '200px';
    expect(px(add('h-1/2'), 'height')).toBeCloseTo(100, 1);
  });

  it('ships no global box-sizing reset', () => {
    expect(css(add(), 'box-sizing')).toBe('content-box');
    expect(css(add('box-border'), 'box-sizing')).toBe('border-box');
  });

  it('applies logical spacing in RTL and vertical writing modes', () => {
    const el = add('ps-4 pe-2 ms-3 me-1');
    el.dir = 'rtl';
    expect(px(el, 'padding-right')).toBeCloseTo(16, 1);
    expect(px(el, 'padding-left')).toBeCloseTo(8, 1);
    expect(px(el, 'margin-right')).toBeCloseTo(12, 1);
    expect(px(el, 'margin-left')).toBeCloseTo(4, 1);

    const vertical = add('inline-8 block-16 px-2', host, 'writing-mode:vertical-rl');
    expect(px(vertical, 'width')).toBeCloseTo(64, 1);
    expect(px(vertical, 'height')).toBeCloseTo(32, 1);
    expect(px(vertical, 'padding-top')).toBeCloseTo(8, 1);
    expect(px(vertical, 'padding-bottom')).toBeCloseTo(8, 1);
  });
});

describe('layout utilities', () => {
  it('keeps plain flex row/nowrap with zero gap', () => {
    const el = add('flex');
    expect(css(el, 'display')).toBe('flex');
    expect(css(el, 'flex-direction')).toBe('row');
    expect(css(el, 'flex-wrap')).toBe('nowrap');
    expect(px(el, 'gap')).toBeCloseTo(0, 1);
  });

  it('keeps plain grid track-free', () => {
    const el = add('grid');
    expect(css(el, 'display')).toBe('grid');
    expect(css(el, 'grid-template-columns')).toBe('none');
    expect(px(el, 'gap')).toBeCloseTo(0, 1);
  });

  it('gives stack a density-aware default gap that a utility class beats', () => {
    const a = add('stack');
    expect(css(a, 'display')).toBe('flex');
    expect(css(a, 'flex-direction')).toBe('column');
    expect(px(a, 'gap')).toBeCloseTo(16, 1);
    // the gap-2 utility (utilities layer) wins over the --layout-gap default
    const b = add('stack gap-2', host, '--layout-gap:40px');
    expect(px(b, 'gap')).toBeCloseTo(8, 1);
    // without a utility class, the instance property configures the default
    expect(px(add('stack', host, '--layout-gap:40px'), 'gap')).toBeCloseTo(40, 1);
  });

  it('does not leak instance gap into nested primitives', () => {
    const outer = add('stack', host, '--layout-gap:40px');
    expect(px(outer, 'gap')).toBeCloseTo(40, 1);
    expect(px(add('stack', outer), 'gap')).toBeCloseTo(16, 1);
    expect(px(add('flex', outer), 'gap')).toBeCloseTo(0, 1);
  });

  it('makes named containers opt-in, never implicit', () => {
    expect(css(add('container'), 'container-type')).toBe('normal');
    expect(css(add('grid'), 'container-type')).toBe('normal');
    const el = add('query');
    expect(css(el, 'container-type')).toBe('inline-size');
    expect(css(el, 'container-name')).toBe('layout');
  });

  it('bounds, centers and gutters the container', () => {
    const el = add('container', host, '--layout-max:400px;--layout-gutter:20px');
    expect(el.getBoundingClientRect().width).toBeCloseTo(400, 1);
    expect(px(el, 'padding-inline-start')).toBeCloseTo(20, 1);
    expect(px(el, 'margin-left')).toBeCloseTo(100, 1);
    expect(css(el, 'box-sizing')).toBe('border-box');
  });

  it('resets max and gutter on nested containers', () => {
    const outer = add('container', host, '--layout-max:400px;--layout-gutter:30px');
    const inner = add('container', outer);
    expect(px(inner, 'max-inline-size')).toBeCloseTo(1280, 1); // 80rem default
    expect(px(inner, 'padding-inline-start')).toBeCloseTo(16, 1); // 4-unit default
  });

  it('applies density to container gutters and stack gaps', () => {
    host.dataset.density = 'compact';
    expect(px(add('container'), 'padding-inline-start')).toBeCloseTo(12, 1);
    expect(px(add('stack'), 'gap')).toBeCloseTo(12, 1);
  });

  it('adapts auto-fit columns to the container, not the viewport', () => {
    for (const [width, cols] of [[600, 3], [350, 2], [120, 1]]) {
      const grid = add('grid grid-cols-auto gap-4', host, `width:${width}px;--layout-min:150px`);
      for (let n = 0; n < 3; n++) add('', grid, 'height:20px');
      expect(css(grid, 'grid-template-columns').split(' ').length, `${width}px tracks`).toBe(cols);
      if (width === 120) expect(grid.children[0].getBoundingClientRect().width).toBeCloseTo(120, 1);
    }
  });

  it('collapses empty auto-fit tracks', () => {
    const grid = add('grid grid-cols-auto gap-4', host, '--layout-min:100px');
    const item = add('', grid);
    expect(item.getBoundingClientRect().width).toBeCloseTo(600, 1);
  });

  it('resets the track minimum on nested grids', () => {
    const outer = add('grid grid-cols-auto', host, '--layout-min:20px');
    const inner = add('grid grid-cols-auto', outer);
    expect(css(inner, '--layout-min')).toBe('16rem');
  });

  it('builds fixed grids and column spans', () => {
    for (let n = 1; n <= 12; n++) {
      const grid = add(`grid grid-cols-${n}`);
      for (let i = 0; i < n; i++) add('', grid);
      expect(css(grid, 'grid-template-columns').split(' ').length).toBe(n);
      grid.remove();
    }
    const grid = add('grid grid-cols-3');
    expect(add('col-span-2', grid).getBoundingClientRect().width).toBeCloseTo(400, 1);
  });

  it('matches named query boundaries at the exact threshold', () => {
    for (const [width, direction] of [[399, 'column'], [400, 'row'], [550, 'row']]) {
      const outer = add('query', host, `width:${width}px`);
      const unnamed = add('', outer, 'container-type:inline-size');
      expect(css(add('flex flex-col query-test', unnamed), 'flex-direction'), String(width)).toBe(direction);
    }
  });

  it('binds nested named queries to the nearest boundary', () => {
    const outer = add('query', host, 'width:600px');
    const inner = add('query', outer, 'width:200px');
    expect(css(add('flex flex-col query-test', inner), 'flex-direction')).toBe('column');
  });

  it('wraps flex items following available width', () => {
    const el = add('flex flex-wrap gap-4', host, 'width:220px');
    const a = add('w-24 h-4 shrink-0', el);
    const b = add('w-24 h-4 shrink-0', el);
    const c = add('w-24 h-4 shrink-0', el);
    expect(b.offsetTop).toBeCloseTo(a.offsetTop, 0);
    expect(c.offsetTop > a.offsetTop).toBe(true);
  });

  it('shrinks flexible content with the min-width escape hatch', () => {
    const el = add('flex', host, 'width:200px');
    const side = add('w-24 shrink-0', el);
    const content = add('flex-1 min-w-0', el, 'overflow-wrap:anywhere');
    content.textContent = 'LongIdentifier'.repeat(8);
    expect(side.getBoundingClientRect().width).toBeCloseTo(96, 1);
    expect(content.getBoundingClientRect().width).toBeCloseTo(104, 1);
    expect(el.scrollWidth <= 201).toBe(true);
  });

  it('has no implicit viewport height on center', () => {
    const el = add('center');
    add('h-8', el);
    expect(el.getBoundingClientRect().height).toBeCloseTo(32, 1);
    expect(css(el, 'place-items')).toBe('center');
  });

  it('aligns sibling row content through subgrid', () => {
    if (!CSS.supports('grid-template-rows', 'subgrid')) return; // skip on unsupporting engines
    const grid = add('grid grid-cols-2 gap-4');
    const a = add('grid row-span-3 grid-rows-subgrid', grid);
    const b = add('grid row-span-3 grid-rows-subgrid', grid);
    for (const [i, parent] of [a, b].entries()) {
      add('', parent, 'height:20px');
      add('', parent, `height:${i ? 80 : 30}px`);
      add('', parent, 'height:30px');
    }
    expect(b.children[2].getBoundingClientRect().top).toBeCloseTo(a.children[2].getBoundingClientRect().top, 0);
  });

  it('keeps a 44px target minimum independent of scale and density', () => {
    host.style.setProperty('--size-base', '2px');
    host.dataset.density = 'compact';
    const el = add('size-4 p-0', host, 'min-width:44px;min-height:44px', 'button');
    expect(el.getBoundingClientRect().width).toBeCloseTo(44, 1);
    expect(el.getBoundingClientRect().height).toBeCloseTo(44, 1);
  });
});

describe('cascade and native behavior', () => {
  it('lets unlayered app CSS override regardless of link order', () => {
    for (const before of [true, false]) {
      const style = document.createElement('style');
      style.textContent = '.app-override { width:63px;gap:31px; }';
      if (before) document.head.prepend(style);
      else document.head.append(style);
      const el = add('app-override w-4 flex gap-4');
      expect(px(el, 'width')).toBeCloseTo(63, 1);
      expect(px(el, 'gap')).toBeCloseTo(31, 1);
      style.remove();
    }
  });

  it('lets utilities beat the components layer without !important', () => {
    const style = document.createElement('style');
    style.textContent = '@layer components { .component-probe { width:99px;gap:99px; } }';
    document.head.append(style);
    const el = add('component-probe w-4 flex gap-4');
    expect(px(el, 'width')).toBeCloseTo(16, 1);
    expect(px(el, 'gap')).toBeCloseTo(16, 1);
    style.remove();
  });

  it('preserves hidden and until-found native display', () => {
    for (const cls of ['flex', 'grid', 'stack', 'center', 'inline-flex', 'inline-grid', 'block', 'inline-block', 'inline']) {
      const el = add(cls);
      el.hidden = true;
      expect(css(el, 'display'), cls).toBe('none');
      const probe = add();
      probe.setAttribute('hidden', 'until-found');
      el.setAttribute('hidden', 'until-found');
      expect(css(el, 'display'), `${cls} until-found display`).toBe(css(probe, 'display'));
      expect(css(el, 'content-visibility'), `${cls} until-found visibility`).toBe(css(probe, 'content-visibility'));
    }
  });

  it('does not expose closed dialogs through display helpers', () => {
    const el = add('flex', host, '', 'dialog') as HTMLDialogElement;
    expect(css(el, 'display')).toBe('none');
    el.show();
    expect(css(el, 'display')).toBe('flex');
    el.close();
    expect(css(el, 'display')).toBe('none');
  });

  it('does not expose closed popovers through display helpers', () => {
    const el = add('grid');
    el.setAttribute('popover', 'manual');
    expect(css(el, 'display')).toBe('none');
    el.showPopover();
    expect(css(el, 'display')).toBe('grid');
    el.hidePopover();
    expect(css(el, 'display')).toBe('none');
  });
});
