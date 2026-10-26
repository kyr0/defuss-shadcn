import { describe, expect, it } from 'vitest';
import { classifyFence, componentRoots, exampleParts, homePages, pagePartFences, strayParts, type PartComponent } from '../scripts/lib/example-parts.ts';
import { isPartMeta } from '../src/documentation/lib/mdx-example.ts';

/**
 * Why: the individual-examples contract (scripts/lib/example-parts.ts) decides what verify's `individual examples`,
 * `parts show their component` and `no part cards on pages` gates ask - which fence is an individual example, which
 * kinds a fence holds, what a page or a component's parts file owes, which parts are no instance of their component,
 * and which page still carries a part fence. Pinned on small components, pages and parts files; the gates run it over
 * the real docs.
 */

const fence = (body: string, label: string) => `\`\`\`html example label="${label}"\n${body}\n\`\`\`\n`;
const part = (body: string, label: string) => `\`\`\`html example part label="${label}"\n${body}\n\`\`\`\n`;
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
  it('a kind any fence holds is owed by its component\'s parts file unless a part or an individual example on a page shows it; a page owes its late examples, both their duplicates', () => {
    const debt = exampleParts(
      [
        {
          slug: 'button',
          own: 'button',
          mdx:
            fence('<button class="btn">Default</button>', 'Default') +
            fence('<div class="flex"><button class="btn">A</button><button class="btn" data-variant="ghost">B</button></div>', 'Row') +
            fence('<button class="btn" data-variant="outline">Outline</button>', 'Outline'),
        },
        { slug: 'card', own: 'card', mdx: fence('<div class="flex"><div class="card" data-variant="muted">A</div><div class="card">B</div></div>', 'Two') },
      ],
      [
        { component: 'button', md: part('<button class="btn" data-size="sm">Go</button>', 'Button (sm)') + part('<button class="btn">Default</button>', 'Again') },
        // a part's own instances are kinds too: the card holds a button with no example of its own
        { component: 'card', md: part('<div class="card"><button class="btn" data-variant="link">Go</button></div>', 'Card') },
      ],
      roots,
    );
    expect(Object.fromEntries(debt)).toEqual({
      'button.parts.md': { late: [], duplicates: [], missing: ['button:.btn|ghost||', 'button:.btn|link||'] },
      button: { late: ['Outline'], duplicates: ['Default'], missing: [] },
      'card.parts.md': { late: [], duplicates: [], missing: ['card:.card|muted||'] },
    });
  });
  it('a guide (no component) owes nothing of its own - its components\' kinds go to their parts files; a source that owes nothing is left out', () => {
    const guide = { slug: 'shapes', own: null, mdx: fence('<div class="grid"><div class="shape-demo rounded-lg"></div><i data-lucide="a"></i></div>', 'Gallery') };
    const debt = exampleParts([guide], [{ component: 'button', md: part('<button class="btn">Go</button>', 'Button') }], roots);
    expect([...debt.keys()]).toEqual(['icon.parts.md']);
    expect(debt.get('icon.parts.md')!.missing).toEqual(['icon:[data-lucide]|||']);
  });
  it('an individual example on a sub-page about the component counts as one, and it repeats a part of the same markup', () => {
    const sub = { slug: 'checkbox-states', own: 'checkbox', mdx: fence('<input type="checkbox" class="checkbox" checked>', 'Checked') };
    const composite = { slug: 'form', own: null, mdx: fence('<form><input type="checkbox" class="checkbox" checked><button class="btn">Go</button></form>', 'Form') };
    const parts = [
      { component: 'button', md: part('<button class="btn">Go</button>', 'Button') },
      { component: 'checkbox', md: part('<input type="checkbox" class="checkbox" checked>', 'Checkbox (checked)') },
    ];
    expect(Object.fromEntries(exampleParts([sub, composite], parts, roots))).toEqual({ 'checkbox-states': { late: [], duplicates: ['Checked'], missing: [] } });
  });
});

describe('isPartMeta', () => {
  it('the part flag is a word outside the attribute values - a hint that says "part of" is no part fence', () => {
    expect(isPartMeta('html example part label="Outline"')).toBe(true);
    expect(isPartMeta('html example label="Text addons" hint="the prefix is part of the field"')).toBe(false);
    expect(isPartMeta('html part label="Not an example"')).toBe(false);
  });
});

describe('strayParts', () => {
  it('every fence of a parts file must be one instance of its component - a composite or another component\'s instance is a stray', () => {
    const { roots } = componentRoots(components);
    const md =
      part('<button class="btn" data-variant="outline">Go</button>', 'Outline') +
      part('<button class="btn">A</button><button class="btn">B</button>', 'Row') +
      part('<div class="card">C</div>', 'Card');
    expect(strayParts([{ component: 'button', md }], roots)).toEqual(['button.parts.md line 4 "Row"', 'button.parts.md line 7 "Card"']);
  });
});

describe('pagePartFences', () => {
  it('a part fence on any docs page is reported - a full example and a hint about parts are not', () => {
    const mdx = fence('<button class="btn">Go</button>', 'Full') + part('<button class="btn">Go</button>', 'Part') + '```html example label="Addons" hint="part of the field"\n<p>x</p>\n```\n';
    expect(pagePartFences([{ slug: 'button', mdx }, { slug: 'shapes', mdx: fence('<p>x</p>', 'Gallery') }])).toEqual(['button line 4 "Part"']);
  });
});

describe('homePages', () => {
  it('a component\'s parts are listed on the page named after it, else on the first page about it; a guide is no home', () => {
    const home = homePages([
      { slug: 'comparison', own: 'chart', mdx: '' },
      { slug: 'chart', own: 'chart', mdx: '' },
      { slug: 'tree-grid', own: 'data-grid', mdx: '' },
      { slug: 'shapes', own: null, mdx: '' },
    ]);
    expect(Object.fromEntries(home)).toEqual({ chart: 'chart', 'data-grid': 'tree-grid' });
  });
});
