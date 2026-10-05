import { describe, expect, it } from 'vitest';
import { apiGaps, apiMarkdown, apiSectionOf, readComponentApi, withApiSection } from '../src/documentation/lib/component-api.ts';

/**
 * Why: every JS component's API section (the skill's ## API, the page's
 * <ApiSection>) is read from its source by this parser, and verify's `API
 * docs` gate trusts it - a member it misses is a member nobody documents.
 * These pin the source shapes the components actually use.
 */
const SRC = `
const fooBarStates = ['default', 'open'];
export const fooBarApi = Object.assign(componentState({ component: 'foo-bar', states: fooBarStates }), {
  /** Jump to a day. */
  setDay(el, day) {},
});

/** Mounts it. */
function mount(el, options = {}) {}
/** The pinned URL. */
export const URL_X = 'https://example.com';

df$.fooBar = {
  /** Hand it rows. */
  setSource(target, rows: Row[], { idField = 'id' }: { idField?: string } = {}) {},
  /** Merge a query. */
  query: (target, patch) => run(target, patch),
  mount,
  url: URL_X,
  nothing: (t) => t,
};

function fire(el) {
  // Fires when it opens - the item.
  el.dispatchEvent(new CustomEvent('foo-open', { bubbles: true, detail: { item: el, index: 1 } }));
  el.dispatchEvent(
    new CustomEvent('foo-move', { detail: posOf(el) }),
  );
}
`;

describe('readComponentApi()', () => {
  const api = readComponentApi('foo-bar', SRC);

  it('reads the states, the namespace members with their JSDoc and signatures', () => {
    expect(api.states).toEqual(['default', 'open']);
    expect(api.namespaces.map((n) => n.name)).toEqual(['fooBar']);
    const m = Object.fromEntries(api.namespaces[0].members.map((x) => [x.name, x]));
    expect(m.setSource).toMatchObject({ params: "(target, rows, { idField = 'id' } = {})", kind: 'method', doc: 'Hand it rows.' });
    expect(m.query).toMatchObject({ params: '(target, patch)', doc: 'Merge a query.' });
    expect(m.mount).toMatchObject({ params: '(el, options = {})', kind: 'method', doc: 'Mounts it.' }); // a shorthand resolves its function
    expect(m.url).toMatchObject({ kind: 'value', doc: 'The pinned URL.' }); // a reference resolves its constant
    expect(m.nothing.doc).toBe('');
  });

  it('reads methods merged onto the registry Api', () => {
    expect(api.registryExtras).toEqual([{ name: 'setDay', params: '(el, day)', kind: 'method', doc: 'Jump to a day.' }]);
  });

  it('reads events: detail keys or the detail expression, the comment above the line (or the statement)', () => {
    expect(api.events).toEqual([
      { name: 'foo-move', detail: ['posOf(el)'], doc: '' },
      { name: 'foo-open', detail: ['item', 'index'], doc: 'Fires when it opens - the item.' },
    ]);
  });

  it('apiGaps() names every undocumented member and event', () => {
    expect(apiGaps(api)).toEqual(['df$.shadcn.fooBar.nothing: no JSDoc', 'event "foo-move": no comment above the line that creates it']);
  });

  it('an instance interface documents el.api when the component replaces it', () => {
    const inst = readComponentApi('x', `
export interface XInstance {
  /** Open it. */
  open(): void;
  /** Close it. */
  close(force?: boolean): void;
}
root.api = this;`);
    expect(inst.instance).toEqual({ name: 'XInstance', members: [
      { name: 'open', params: '()', kind: 'method', doc: 'Open it.' },
      { name: 'close', params: '(force?)', kind: 'method', doc: 'Close it.' },
    ] });
  });
});

describe('the ## API section', () => {
  const api = readComponentApi('foo-bar', SRC);
  const section = apiMarkdown(api);
  const skill = '# Foo\n\n## States\n\nstates text\n\n---\n\n## ARIA\n\naria\n';

  it('goes right after ## States (before the separator of the next section)', () => {
    const out = withApiSection(skill, section);
    expect(out.indexOf('## API')).toBeGreaterThan(out.indexOf('## States'));
    expect(out.indexOf('## API')).toBeLessThan(out.indexOf('## ARIA'));
    expect(apiSectionOf(out)).toBe(section);
  });

  it('replaces itself in place (writing twice changes nothing)', () => {
    const once = withApiSection(skill, section);
    expect(withApiSection(once, section)).toBe(once);
  });

  it('lists the registry, the namespace and the events', () => {
    expect(section).toContain('`df$.shadcn.fooBarApi`');
    expect(section).toContain('`setDay(el, day)`');
    expect(section).toContain('### `df$.shadcn.fooBar`');
    expect(section).toContain("| `setSource(target, rows, { idField = 'id' } = {})` | Hand it rows. |");
    expect(section).toContain('| `foo-open` | `item`, `index` | Fires when it opens - the item. |');
  });
});
