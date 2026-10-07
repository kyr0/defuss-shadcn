import { describe, expect, it } from 'vitest';
import { buildVocab, checkMarkup } from '../scripts/lib/markup-check.ts';

/**
 * Why: shadcn-review's checker (bundled as skills/shadcn-review/scripts/
 * markup-check.mjs) must name real mistakes and stay silent on correct
 * markup - calibrated on 234 e2e fixtures and 1,553 docs examples, where
 * every early false alarm came from a too-narrow vocabulary. Pins each rule
 * and each precision fix on a two-component system; agent-skills.e2e runs
 * the bundle built from the real one.
 */

const vocab = buildVocab(
  [
    { name: 'button', css: '.btn { &[data-variant="outline"] {} &[data-size="sm"] {} }', ts: '' },
    { name: 'card', css: '.card {} .card-title {} .card-header {}', ts: '' },
    { name: 'panel', css: '.panel {}', ts: "dfDollar(el).find('.panel-close'); el.setAttribute('aria-label', 'Close');" },
    { name: 'navigation-menu', css: '.nav-menu {}', ts: '' },
  ],
  [':root { --primary: #000; --spacing: 0.25rem; } .flex { display: flex }'],
  'test',
  { 'navigation-menu': '<li class="nav-menu-item">', button: '<button class="btn" data-variant="ghost">' },
);
const run = (text: string, path = 'page.html') => checkMarkup([{ path, text }], vocab).map((f) => `${f.rule}:${f.line}`);

describe('buildVocab', () => {
  it('reads parts and values from stylesheets, scripts and skills', () => {
    expect(vocab.classes['card-title']).toBe('card');
    expect(vocab.classes['panel-close']).toBe('panel');
    expect(vocab.classes['nav-menu-item']).toBe('navigation-menu');
    expect(vocab.variants.button).toEqual({ variant: ['default', 'ghost', 'outline'], size: ['default', 'sm'] });
    expect(vocab.autoLabels).toEqual(['panel']);
  });
});

describe('checkMarkup', () => {
  it('passes correct markup', () => {
    expect(run('<button class="btn" data-variant="outline" data-size="sm">a</button>\n<div class="card flex"><h3 class="card-title">t</h3></div>\n<p style="color: var(--primary)">x</p>')).toEqual([]);
  });
  it('a modifier class on the root, a part that does not exist, a typo', () => {
    expect(run('<a class="btn-outline">\n<b class="card-titel">\n<i class="card-title-sm">')).toEqual(['modifier-class:1', 'unknown-part:2', 'unknown-part:3']);
    const [mod, typo] = checkMarkup([{ path: 'p.html', text: '<a class="btn-outline"><b class="card-titel">' }], vocab);
    expect(mod.fix).toBe('class="btn" data-variant="outline"');
    expect(typo.fix).toMatch(/did you mean "card-title"/);
  });
  it('a value the component does not know', () => {
    expect(run('<button class="btn" data-variant="primary">a</button>')).toEqual(['unknown-variant:1']);
  });
  it('tokens: unknown ones fail, fallbacks and the project\'s own pass', () => {
    expect(run('<p style="color: var(--brand)">x</p>')).toEqual(['unknown-token:1']);
    expect(run('<p style="color: var(--brand, red)">x</p>')).toEqual([]);
    expect(run('<p style="--tint: red; color: var(--tint)">x</p>')).toEqual([]);
    expect(checkMarkup([{ path: 'a.css', text: '.x { --brand: red; }' }, { path: 'b.html', text: '<p style="color: var(--brand)">' }], vocab)).toEqual([]);
  });
  it('a project class is the project\'s - only a component prefix makes it a finding', () => {
    expect(run('<div class="hero my-layout">')).toEqual([]);
    expect(checkMarkup([{ path: 'a.css', text: '.card-fancy {}' }, { path: 'b.html', text: '<div class="card-fancy">' }], vocab)).toEqual([]);
  });
  it('icon-only buttons need a name, unless the component names them', () => {
    expect(run('<button class="btn"><svg></svg></button>')).toEqual(['icon-button-label:1']);
    expect(run('<button class="btn" aria-label="Close"><svg></svg></button>')).toEqual([]);
    expect(run('<button class="btn"><svg></svg><span class="sr-only">Close</span></button>')).toEqual([]);
    expect(run('<button class="panel-close"><svg></svg></button>')).toEqual([]);
  });
  it('loading: modules, one runtime, core first, pinned', () => {
    const page = [
      '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/kyr0/defuss-shadcn@latest/dist/components/all.min.css">',
      '<script src="/dist/components/core.js"></script>',
      '<script type="module" src="/dist/components/all.js"></script>',
    ].join('\n');
    expect(run(page)).toEqual(['core-css:1', 'pin-version:1', 'module-script:2', 'double-runtime:2']);
  });
  it('scripts: window globals and HTML sinks, comments ignored', () => {
    expect(run('window.app = 1;\n// window.x = 2\nel.innerHTML += s;\nel.innerHTML === s;', 'app.js')).toEqual(['window-global:1', 'html-sink:3']);
  });
});
