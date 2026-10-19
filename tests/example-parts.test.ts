import { describe, expect, it } from 'vitest';
import { parseHTML } from 'linkedom';
import { activeParts, classifyFence, componentRoots, compositeParts, exampleParts, galleryItems, type PartComponent } from '../scripts/lib/example-parts.ts';
import { isPartMeta } from '../src/documentation/lib/mdx-example.ts';

/**
 * Why: the individual-examples contract (scripts/lib/example-parts.ts) decides what verify's `individual examples`
 * gate asks of every docs page - which fence is an individual example, which kinds a composite holds, what a page
 * owes, which part fences are no individual example or would run something. Pinned on small components and pages; the
 * gate runs it over the real docs.
 */

const fence = (body: string, label: string) => `\`\`\`html example label="${label}"\n${body}\n\`\`\`\n`;
const components: PartComponent[] = [
  { name: 'button', classes: ['btn'], structure: '<button class="btn">Go</button>' },
  { name: 'card', classes: ['card', 'card-title'], structure: '<div class="card"><h3 class="card-title">T</h3></div>' },
  { name: 'checkbox', classes: ['checkbox'], structure: '<div class="flex gap-2"><input type="checkbox" class="checkbox"><label>A</label></div>' },
  { name: 'icon', classes: [], structure: '<i data-lucide="sun"></i>', roots: ['[data-lucide]'] },
  { name: 'chart', classes: ['chart'], structure: '<script src="echarts.js"></script>' },
];

describe('componentRoots', () => {
  it('the classes a component owns on the first elements of its Structure that carry one (depth-first); declared roots replace them; none - rootless', () => {
    const { roots, rootless } = componentRoots(components);
    expect(roots.map((r) => `${r.component} ${r.selector}${r.declared ? ' (declared)' : ''}`)).toEqual([
      'button .btn',
      'card .card',
      'checkbox .checkbox',
      'icon [data-lucide] (declared)',
    ]);
    expect(rootless).toEqual(['chart']);
  });
});

describe('classifyFence', () => {
  const { roots } = componentRoots(components);
  const f = (body: string) => ({ body, label: 'x', line: 1 });
  it('one instance of the page\'s component - through a wrapper that only lays it out - is individual, its kind its root, variant and size', () => {
    const c = classifyFence(f('<style>.x{}</style>\n<div class="flex justify-center"><button class="btn" data-variant="outline" data-size="sm">Go</button></div>'), 'button', roots);
    expect([c.individual, c.kind]).toEqual([true, 'button:.btn|outline|sm|']);
  });
  it('two elements, an instance of another component, or a wrapper with text beside its child: a composite holding every instance at any depth', () => {
    expect(classifyFence(f('<button class="btn">A</button><button class="btn" data-variant="ghost">B</button>'), 'button', roots).holds).toEqual([
      'button:.btn|ghost||',
      'button:.btn|||',
    ]);
    const card = classifyFence(f('<div class="card"><h3 class="card-title">T</h3><button class="btn">Go <i data-lucide="x"></i></button></div>'), 'button', roots);
    expect([card.individual, card.holds]).toEqual([false, ['button:.btn|||', 'card:.card|||', 'icon:[data-lucide]|||']]);
    expect(classifyFence(f('<p>Press <button class="btn">Go</button></p>'), 'button', roots).individual).toBe(false);
  });
  it('a native state makes a kind of its own: a disabled button is not the plain one', () => {
    expect(classifyFence(f('<button class="btn" disabled>Go</button>'), 'button', roots).kind).toBe('button:.btn|||disabled');
  });
  it('the same single card on the card page is individual - made of the button inside it', () => {
    const c = classifyFence(f('<div class="card"><button class="btn">Go</button></div>'), 'card', roots);
    expect([c.kind, c.holds]).toEqual(['card:.card|||', ['button:.btn|||']]);
  });
});

describe('exampleParts', () => {
  const { roots } = componentRoots(components);
  it('a page owes the kinds of its component that composites anywhere hold with no individual example, its individual examples after a composite, and duplicates', () => {
    const debt = exampleParts(
      [
        {
          slug: 'button',
          own: 'button',
          mdx:
            fence('<button class="btn">Default</button>', 'Default') +
            fence('<div class="flex"><button class="btn">A</button><button class="btn" data-variant="ghost">B</button></div>', 'Row') +
            fence('<button class="btn" data-variant="outline">Outline</button>', 'Outline') +
            fence('<button class="btn">Default</button>', 'Again'),
        },
        { slug: 'card', own: 'card', mdx: fence('<div class="card"><button class="btn" data-size="sm">Go</button></div>', 'Card') },
        { slug: 'card-gallery', own: 'card', mdx: fence('<div class="flex"><div class="card" data-variant="muted">A</div><div class="card">B</div></div>', 'Two') },
      ],
      roots,
    );
    expect(Object.fromEntries(debt)).toEqual({
      button: { late: ['Outline', 'Again'], duplicates: ['Again'], missing: ['button:.btn|ghost||', 'button:.btn||sm|'] },
      card: { late: [], duplicates: [], missing: ['card:.card|muted||'] },
    });
  });
  it('a kind whose component has no page is owed by "(no page)"; a page that owes nothing is left out', () => {
    const debt = exampleParts([{ slug: 'button', own: 'button', mdx: fence('<div class="flex"><i data-lucide="a"></i><i data-lucide="b"></i></div>', 'Icons') }], roots);
    expect([...debt.keys()]).toEqual(['(no page)']);
    expect(debt.get('(no page)')!.missing).toEqual(['icon:[data-lucide]|||']);
  });
});

describe('isPartMeta', () => {
  it('the part flag is a word outside the attribute values - a hint that says "part of" is no part fence', () => {
    expect(isPartMeta('html example part label="Outline"')).toBe(true);
    expect(isPartMeta('html example label="Text addons" hint="the prefix is part of the field"')).toBe(false);
    expect(isPartMeta('html part label="Not an example"')).toBe(false);
  });
});

describe('compositeParts', () => {
  it('a part fence (```html example part) must be one instance of the page\'s component - a part card shows nothing else', () => {
    const { roots } = componentRoots(components);
    const mdx =
      '```html example part label="Outline"\n<button class="btn" data-variant="outline">Go</button>\n```\n' +
      '```html example part label="Row"\n<button class="btn">A</button><button class="btn">B</button>\n```\n' +
      '```html example label="Not a part"\n<button class="btn">A</button><button class="btn">B</button>\n```\n';
    expect(compositeParts([{ slug: 'button', own: 'button', mdx }], roots)).toEqual(['button line 4 "Row"']);
  });
});

describe('activeParts', () => {
  it('a part fence with a <script> or an inline handler runs on the docs page - a part card has no sandbox; a full example may', () => {
    const mdx =
      '```html example part label="Plain"\n<button class="btn">Go</button>\n```\n' +
      '```html example part label="Handler"\n<button class="btn" onclick="alert(1)">Go</button>\n```\n' +
      '```html example part label="Script"\n<button class="btn">Go</button><script>go()</script>\n```\n' +
      '```html example part label="Words"\n<button class="btn" data-hint="onclick=x">online</button>\n```\n' +
      '```html example label="Full"\n<button class="btn" onclick="go()">Go</button>\n```\n';
    expect(activeParts([{ slug: 'button', own: 'button', mdx }])).toEqual(['button line 4 "Handler"', 'button line 7 "Script"']);
  });
});

describe('guides (a page about no component, not a template)', () => {
  const { roots } = componentRoots(components);
  const shapes = new Set(['rounded-lg', 'corner-leaf', 'shape-star', 'aura', 'aura-dual']);
  const gallery =
    '<div class="grid"><div class="stack"><div class="shape-demo rounded-lg"></div><p class="demo-label">rounded-lg</p></div>' +
    '<div class="stack" dir="rtl"><div class="shape-demo rounded-lg"></div><p class="demo-label">RTL twin</p></div>' +
    '<img class="shape-star" src="a.png" alt=""><div class="aura aura-dual">Glow</div><div class="demo-tile w-24">tile</div></div>';
  it('galleryItems: a captioned item by its caption, an uncaptioned one by its shapes classes; the same content twice and demo tiles are no items', () => {
    const { document } = parseHTML(`<!doctype html><html><body>${gallery}</body></html>`);
    expect(galleryItems(document.body, roots, shapes).map((i) => i.name)).toEqual(['rounded-lg', 'shape-star', 'aura aura-dual']);
  });
  it('a guide owes each item a part fence labelled by its name, before its first example; a template page owes nothing', () => {
    const composite = fence(gallery, 'Gallery');
    const parts =
      '```html example part label="rounded-lg"\n<div class="shape-demo rounded-lg"></div>\n```\n' +
      '```html example part label="shape-star"\n<img class="shape-star" src="a.png" alt="">\n```\n';
    expect(exampleParts([{ slug: 'shapes', own: null, mdx: parts + composite }], roots, shapes).get('shapes')).toEqual({
      late: [],
      duplicates: [],
      missing: ['caption:shapes:aura aura-dual'],
    });
    expect(exampleParts([{ slug: 'paper-figures', own: null, type: 'TPL', mdx: composite }], roots, shapes).size).toBe(0);
  });
});
