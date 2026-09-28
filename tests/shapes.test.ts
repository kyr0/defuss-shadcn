import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
// Vite ?raw imports (browser mode has no node:fs) - same pattern as
// tests/sizing-layout.test.ts: the shipped module text is the system under test.
import tokensCss from '../src/theme/utils/default-semantic-tokens.css?raw';
import shapesCss from '../src/theme/utils/shapes.css?raw';

/**
 * Why: theme/utils/shapes.css is a public opt-in module whose whole contract
 * is computed CSS. These checks pin what a consumer relies on: every class is
 * zero-specificity (:where) in @layer utilities, so it beats component styles
 * yet loses to any author rule; colors resolve from the theme tokens (dark
 * mode follows); the knobs (--shape-*) inherit from an ancestor; and the
 * fallback / native corner-shape split stays consistent.
 */

let host: HTMLElement;
const removers: (() => void)[] = [];

function inject(cssText: string): () => void {
  const style = document.createElement('style');
  style.textContent = cssText;
  document.head.append(style);
  return () => style.remove();
}

function add(classes: string, style = '', parent: HTMLElement = host): HTMLElement {
  const el = document.createElement('div');
  el.className = classes;
  if (style) el.style.cssText = style;
  parent.append(el);
  return el;
}

const css = (el: Element, prop: string) => getComputedStyle(el).getPropertyValue(prop).trim();

beforeAll(() => {
  removers.push(inject(tokensCss));
  // a stand-in component rule in the lower layer (like all.css ships)
  removers.push(inject('@layer components { .probe-card { border-radius: 12px; box-shadow: 0 1px 2px red; } }'));
  removers.push(inject(shapesCss));
});

afterAll(() => {
  for (const off of removers) off();
  host?.remove();
  document.documentElement.classList.remove('dark');
});

beforeEach(() => {
  host?.remove();
  host = document.createElement('div');
  host.style.cssText = 'width:400px;font-size:16px;';
  document.body.append(host);
  document.documentElement.classList.remove('dark');
});

describe('shapes module is static, layered, zero-specificity CSS', () => {
  it('carries no runtime or build directives and no new tokens', () => {
    expect(shapesCss).not.toMatch(/@(?:tailwind|apply|source|config|import)\b|!important/);
    expect(shapesCss).toContain('@layer components, utilities;');
    // only the module's own knobs are declared - never a theme token
    const declared = [...shapesCss.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]);
    for (const name of declared) expect(name, name).toMatch(/^--(?:_|shape-)/);
  });

  it('wraps every class selector in :where()', () => {
    const body = shapesCss
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/url\("[^"]*"\)/g, '')
      .replace(/:where\([^)]*\)/g, '');
    const bare = [...body.matchAll(/(^|[\s,{}])\.([a-z][a-z0-9-]*)/g)].map((m) => m[2]);
    expect(bare, 'class selectors outside :where()').toEqual([]);
  });
});

describe('shape utilities', () => {
  it('beat component styles through the utilities layer', () => {
    const card = add('probe-card rounded-none shadow-none');
    expect(css(card, 'border-top-left-radius')).toBe('0px');
    expect(css(card, 'box-shadow')).toBe('none');
  });

  it('lose to any author rule (zero specificity)', () => {
    const off = inject('.author-wins { border-radius: 3px; }');
    const el = add('author-wins rounded-full');
    expect(css(el, 'border-top-left-radius')).toBe('3px');
    off();
  });

  it('derive the radius scale from --radius', () => {
    const lg = add('rounded-lg', '--radius: 10px;');
    const sm = add('rounded-sm', '--radius: 10px;');
    expect(css(lg, 'border-top-left-radius')).toBe('10px');
    expect(css(sm, 'border-top-left-radius')).toBe('6px');
  });

  it('inherit knobs from an ancestor', () => {
    const section = add('', '--shape-round: 10px;');
    const leaf = add('corner-leaf', '', section);
    expect(css(leaf, 'border-top-left-radius')).toBe('10px');
    expect(css(leaf, 'border-top-right-radius')).toBe('0px');
  });

  it('draw clip-path silhouettes', () => {
    for (const cls of ['clip-circle', 'clip-hexagon', 'clip-star', 'clip-chevron', 'edge-slant-bottom']) {
      expect(css(add(cls), 'clip-path'), cls).not.toBe('none');
    }
  });

  it('cut corners natively or by clip-path - never both, never neither', () => {
    const cut = add('cut-corners');
    const native = CSS.supports('corner-shape', 'bevel');
    if (native) {
      expect(css(cut, 'clip-path')).toBe('none');
      expect(css(cut, 'border-top-left-radius')).toBe('12px');
    } else {
      expect(css(cut, 'clip-path')).toMatch(/^polygon/);
    }
  });

  it('paint 3D facets over the author background-color', () => {
    for (const cls of ['clip-cube', 'clip-pyramid', 'clip-gem', 'clip-sphere', 'clip-star-3d', 'clip-coin']) {
      const el = add(cls, 'background-color: rgb(0, 0, 255);');
      expect(css(el, 'background-color'), cls).toBe('rgb(0, 0, 255)');
      expect(css(el, 'background-image'), cls).not.toBe('none');
    }
  });

  it('extrude through stacked drop-shadows', () => {
    const filter = css(add('drop-shadow-extrude'), 'filter');
    expect(filter.match(/drop-shadow/g)?.length).toBe(6);
  });

  it('stop the marching ants under reduced motion only', () => {
    const ants = add('frame-marching-ants');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    expect(css(ants, 'animation-name')).toBe(reduced ? 'none' : 'shape-march');
  });

  it('mask the mask-based shapes', () => {
    for (const cls of ['ticket', 'ticket-vertical', 'stamp', 'scoop-corner-tr', 'shape-flower', 'shape-flower-6',
      'shape-daisy', 'shape-heart', 'shape-cloud', 'clip-donut', 'clip-moon', 'clip-tag', 'edge-concave-bottom',
      'edge-crenel-bottom', 'edge-wave-top', 'edge-zigzag-top', 'edge-scallop-top',
      'edge-wave-bottom', 'edge-zigzag-bottom', 'edge-scallop-bottom']) {
      expect(css(add(cls), 'mask-image'), cls).not.toBe('none');
    }
  });

  it('follow the theme tokens into dark mode', () => {
    const hard = add('shadow-hard');
    const light = css(hard, 'box-shadow');
    document.documentElement.classList.add('dark');
    const dark = css(hard, 'box-shadow');
    expect(light).toMatch(/4px 4px 0px 0px$/);
    expect(dark).not.toBe(light);
  });

  it('recolor through --shape-ink', () => {
    const el = add('shadow-hard', '--shape-ink: rgb(255, 0, 0);');
    expect(css(el, 'box-shadow')).toContain('rgb(255, 0, 0)');
  });

  it('keep background-color when drawing frame corners and patterns', () => {
    for (const cls of ['frame-corners', 'pattern-dots', 'pattern-grid']) {
      const el = add(cls, 'background-color: rgb(0, 128, 0);');
      expect(css(el, 'background-color'), cls).toBe('rgb(0, 128, 0)');
      expect(css(el, 'background-image'), cls).not.toBe('none');
    }
  });
});
