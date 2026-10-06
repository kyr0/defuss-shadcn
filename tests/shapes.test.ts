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
    for (const cls of ['shape-circle', 'shape-hexagon', 'shape-hexagon-2', 'shape-star', 'shape-chevron', 'edge-slant-bottom']) {
      expect(css(add(cls), 'clip-path'), cls).not.toBe('none');
    }
  });

  it('ship every DaisyUI mask-* shape as shape-* (same names and numbering)', () => {
    const daisy = ['squircle', 'heart', 'hexagon', 'hexagon-2', 'decagon', 'pentagon', 'diamond', 'circle',
      'star', 'star-2', 'triangle', 'triangle-2', 'triangle-3', 'triangle-4'];
    for (const name of daisy) {
      const el = add(`shape-${name}`);
      const drawn = css(el, 'clip-path') !== 'none' || css(el, 'mask-image') !== 'none';
      expect(drawn, `shape-${name}`).toBe(true);
    }
    // numbered triangles point down / left / right, like their named twins
    expect(css(add('shape-triangle-2'), 'clip-path')).toBe(css(add('shape-triangle-down'), 'clip-path'));
    expect(css(add('shape-triangle-3'), 'clip-path')).toBe(css(add('shape-triangle-left'), 'clip-path'));
    expect(css(add('shape-triangle-4'), 'clip-path')).toBe(css(add('shape-triangle-right'), 'clip-path'));
    // hexagon is pointy-top, hexagon-2 flat-top
    expect(css(add('shape-hexagon'), 'clip-path')).toMatch(/^polygon\(50% 0/);
    expect(css(add('shape-hexagon-2'), 'clip-path')).toMatch(/^polygon\(25% 0/);
  });

  it('keep every v0.9 clip-* name as an alias of its shape-* rule', () => {
    const names = [...new Set([...shapesCss.matchAll(/\.clip-([a-z0-9-]+)\b/g)].map((m) => m[1]))];
    expect(names.length).toBeGreaterThan(40);
    for (const name of names) {
      const shape = `shape-${name === 'hexagon' ? 'hexagon-2' : name}`;
      for (const prop of ['clip-path', 'mask-image', 'background-image']) {
        expect(css(add(`clip-${name}`), prop), `clip-${name} ${prop}`).toBe(css(add(shape), prop));
      }
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
    for (const cls of ['shape-cube', 'shape-pyramid', 'shape-gem', 'shape-sphere', 'shape-star-3d', 'shape-coin']) {
      const el = add(cls, 'background-color: rgb(0, 0, 255);');
      expect(css(el, 'background-color'), cls).toBe('rgb(0, 0, 255)');
      expect(css(el, 'background-image'), cls).not.toBe('none');
    }
  });

  it('aura: a wrapper whose conic light turns on a typed angle, ring width by size', () => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const base = add('aura');
    expect(css(base, 'animation-name')).toBe(reduced ? 'none' : 'shape-aura-spin');
    expect(css(base, 'background-image')).toMatch(/^conic-gradient/);
    expect(css(base, 'padding-top')).toBe('3px');
    const widths = { xs: '1px', sm: '2px', md: '3px', lg: '5px', xl: '8px' } as Record<string, string>;
    for (const [z, w] of Object.entries(widths)) expect(css(add(`aura aura-${z}`), 'padding-top'), z).toBe(w);
    // the ring hugs the wrapped element: wrapper radius = element radius + ring width
    expect(css(add('aura', '--shape-round: 10px;'), 'border-top-left-radius')).toBe('13px');
  });

  it('aura styles swap the light, glow moves it into a blurred halo behind', () => {
    const light = (cls: string) => css(add(`aura ${cls}`), 'background-image');
    const all = ['', 'aura-dual', 'aura-rainbow', 'aura-holo', 'aura-gold', 'aura-silver'].map(light);
    expect(new Set(all).size).toBe(all.length);
    const glow = add('aura aura-glow');
    expect(css(glow, 'padding-top')).toBe('0px');
    expect(css(glow, 'background-image')).toBe('none');
    const halo = getComputedStyle(glow, '::before');
    expect(halo.filter).toMatch(/^blur\(12px\)$/);
    expect(halo.backgroundImage).toMatch(/^conic-gradient/);
    expect(halo.zIndex).toBe('-1');
    // --shape-ink recolors the plain light; --shape-duration sets one turn
    expect(css(add('aura', '--shape-ink: rgb(255, 0, 0);'), 'background-image')).toContain('rgb(255, 0, 0)');
    expect(css(add('aura', '--shape-duration: 2s;'), 'animation-duration')).toBe('2s');
  });

  it('stacks: three sheets (fill + edge each), offset by direction, tapered when centered', () => {
    /** [x, y, spread] of each sheet's EDGE shadow (the 2nd, 4th, 6th layer) */
    const sheets = (cls: string) => {
      const parts = css(add(cls), 'box-shadow').split(/,(?![^(]*\))/).map((p) => p.trim());
      expect(parts.length, cls).toBe(6);
      return [1, 3, 5].map((i) => parts[i].match(/(-?[\d.]+)px (-?[\d.]+)px 0px (-?[\d.]+)px/)!.slice(1).map(Number));
    };
    expect(sheets('stack-bottom-right')).toEqual([[8, 8, 0], [16, 16, 0], [24, 24, 0]]);
    expect(sheets('stack-top-left')).toEqual([[-8, -8, 0], [-16, -16, 0], [-24, -24, 0]]);
    expect(sheets('stack-bottom-left')).toEqual([[-8, 8, 0], [-16, 16, 0], [-24, 24, 0]]);
    expect(sheets('stack-top-right')).toEqual([[8, -8, 0], [16, -16, 0], [24, -24, 0]]);
    // centered piles taper: each sheet half a step narrower per side, 1.5
    // steps out - so every sheet still peeks out one full step
    expect(sheets('stack-bottom')).toEqual([[0, 12, -4], [0, 24, -8], [0, 36, -12]]);
    expect(sheets('stack-top')).toEqual([[0, -12, -4], [0, -24, -8], [0, -36, -12]]);
    expect(sheets('stack-left')).toEqual([[-12, 0, -4], [-24, 0, -8], [-36, 0, -12]]);
    expect(sheets('stack-right')).toEqual([[12, 0, -4], [24, 0, -8], [36, 0, -12]]);
    // density
    expect(sheets('stack-bottom-right stack-tight')[0]).toEqual([4, 4, 0]);
    expect(sheets('stack-bottom-right stack-loose')[2]).toEqual([42, 42, 0]);
  });

  it('stacks: card / outline / filled sheets, --shape-ink, and a fade toward the background', () => {
    const colors = (cls: string, style = '') => css(add(cls, style), 'box-shadow').split(/,(?![^(]*\))/).map((p) => p.trim().replace(/ -?[\d.]+px.*$/, ''));
    const card = colors('stack-bottom-right');
    expect(card[0]).not.toBe(card[1]); // a fill and a distinct edge
    const filled = colors('stack-bottom-right stack-filled');
    expect(filled[0]).toBe(filled[1]); // solid sheet, no edge
    expect(colors('stack-bottom-right stack-outline')[1]).not.toBe(card[1]); // a stronger edge
    // --shape-ink recolors (the mix serializes in oklab: red stays red - a > 0, b > 0)
    const ab = (c: string) => /^oklab\(([\d.]+) (-?[\d.]+) (-?[\d.]+)/.exec(c)!.slice(1).map(Number);
    const [, ra, rb] = ab(colors('stack-bottom-right stack-filled', '--shape-ink: rgb(255, 0, 0);')[0]);
    expect(ra).toBeGreaterThan(0.1);
    expect(rb).toBeGreaterThan(0.05);
    // filled sheets step toward the background on their own (one solid colour
    // would merge into a block); stack-fade does the same for card sheets
    expect(new Set([filled[0], filled[2], filled[4]]).size).toBe(3);
    const lightness = (c: string) => ab(c)[0];
    const red = colors('stack-bottom-right stack-filled', '--shape-ink: rgb(255, 0, 0);');
    expect(lightness(red[0])).toBeLessThan(lightness(red[2]));
    expect(lightness(red[2])).toBeLessThan(lightness(red[4])); // light theme: toward the white background
    // (card sheets fill with --card, which can equal the background - their edges show the fade)
    const faded = colors('stack-bottom-right stack-fade');
    expect(new Set([faded[1], faded[3], faded[5]]).size).toBe(3);
    expect(new Set([card[1], card[3], card[5]]).size).toBe(1);
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
      'shape-daisy', 'shape-heart', 'shape-cloud', 'shape-squircle', 'shape-donut', 'shape-moon', 'shape-tag', 'edge-concave-bottom',
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
