import { describe, expect, it } from 'vitest';
import { appResolver, initHooks, stylesPage, topLevelAttrs, topLevelClasses, usedClasses } from '../scripts/lib/apps.ts';

/**
 * Why: scripts/lib/apps.ts decides which components a scaffold's own bundle
 * (dist/apps/{app}.*) carries - a missed component is a broken app, an
 * extra one inflates the published size. Pins the ownership rules; the
 * scaffold-lean e2e proves the real answers in a browser.
 */

const comp = (name: string, css = '', ts = '') => ({ name, css, ts });

describe('topLevelClasses', () => {
  it('takes the class a top-level rule is FOR - inside @layer / @media too', () => {
    const css = `@layer components { .btn { color: red; & .icon { x: 1 } } @media (x) { .btn-row { y: 1 } } }`;
    expect([...topLevelClasses(css)].sort()).toEqual(['btn', 'btn-row']);
  });
  it('skips rules that style another component (two classes) and :is() lists', () => {
    const css = `@layer components { .toolbar .btn { x: 1 } :where(.card :is(.btn, a)) { y: 1 } .dark .badge { z: 1 } }`;
    expect([...topLevelClasses(css)]).toEqual([]);
  });
});

describe('topLevelAttrs', () => {
  it('takes attributes a top-level rule styles on their own - never next to a class', () => {
    expect([...topLevelAttrs('@layer components { [data-lucide] { x: 1 } .btn[data-size] { y: 1 } }')]).toEqual(['data-lucide']);
  });
});

describe('initHooks', () => {
  it('collects the attribute / tag hooks of :not([data-init]) init selectors', () => {
    const ts = `dfDollar('[data-context-menu]:not([data-init])'); dfDollar('dialog:not(.sheet):not([data-init])'); dfDollar('.x:not([data-init])');`;
    expect(initHooks(ts)).toEqual({ attrs: ['data-context-menu'], tags: ['dialog'] });
  });
  it('sees a typed query the same (a type argument once hid dialog.js from the Notes app bundle)', () => {
    const ts = `dfDollar<HTMLDialogElement>('dialog:not(.sheet):not([data-init])'); dfDollar<HTMLElement>('[data-context-menu]:not([data-init])');`;
    expect(initHooks(ts)).toEqual({ attrs: ['data-context-menu'], tags: ['dialog'] });
  });
});

describe('usedClasses', () => {
  it('reads class attributes, template strings and classList calls', () => {
    const text = `<div class="card p-4"></div><script>el.classList.add('toast'); q.html(\`<b class="badge">\`)</script>`;
    expect([...usedClasses(text)].sort()).toEqual(['badge', 'card', 'p-4', 'toast']);
  });
});

describe('appResolver', () => {
  const resolve = appResolver([
    comp('button', '@layer components { .btn { x: 1 } }'),
    comp('dropdown', '@layer components { .dropdown-item { x: 1 } }', `dfDollar('[data-dropdown-trigger]:not([data-init])')`),
    comp('hero', '@layer components { .mk-hero { x: 1 } .mk-hero .btn { y: 1 } }'),
    comp('toast', '@layer components { .toast { x: 1 } }', `df$.toast = {}`),
    comp('data-grid', '.data-grid { x: 1 }', `// <span class="hero">\nq.html('<input class="btn">');\nthrow new Error('<i class="toast">')`),
  ]);
  it('owns classes by name prefix (website blocks: mk-<name>), else by the top-level definer', () => {
    expect(resolve('<a class="btn"></a><ul><li class="dropdown-item"></li></ul>')).toEqual(['button', 'dropdown']);
    expect(resolve('<section class="mk-hero"></section>')).toEqual(['hero']);
  });
  it('finds JS init hooks and namespaces', () => {
    expect(resolve('<button data-dropdown-trigger>')).toEqual(['dropdown']);
    expect(resolve('<script>df$.shadcn.toast.show("x")</script>')).toEqual(['toast']);
  });
  it('follows the markup a component writes - never its comments or error messages', () => {
    expect(resolve('<div class="data-grid"></div>')).toEqual(['button', 'data-grid']);
  });
});

describe('stylesPage', () => {
  it('is true for a top-level body / html rule only', () => {
    expect(stylesPage('@layer base { body { font-size: 14px } }')).toBe(true);
    expect(stylesPage('@layer components { html:has(dialog:modal) { overflow: hidden } :root { --x: 1 } }')).toBe(false);
  });
});
