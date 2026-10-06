import { describe, expect, it } from 'vitest';
import { apiGaps, apiMarkdown, apiSectionOf, parseArgs, parseDoc, readComponentApi, returnTypeAfter, sharedStateApi, signatureOf, withApiSection } from '../src/documentation/lib/component-api.ts';

/**
 * Why: every JS component's API section (the skill's ## API, the page's
 * <ApiSection>) is read from its source by this parser, and verify's `API
 * docs` gate trusts it - a member it misses is a member nobody documents, an
 * argument it mistypes is a wrong contract. These pin the source shapes the
 * components use: typed signatures, @param / @returns, typed event details
 * and the declared types they name.
 */
const SRC = `
const fooBarStates = ['default', 'open'];
/** setState() configs per state. */
interface FooBarStateConfigs {
  /** Closed. */
  default: {};
  /** Open on a day. */
  open: {
    /** the day to show, 1-31 */
    day?: number;
  };
}
const openOn = (el, config) => el.show(config.day);
export const fooBarApi = Object.assign(componentState({ component: 'foo-bar', states: fooBarStates }), {
  /**
   * Jump to a day.
   * @param el - the calendar element
   * @param day - the day, 1-31
   */
  setDay(el: HTMLElement, day: number): void {},
});

/** One row of the source. */
interface Row {
  /** its key */
  id: string;
  /** shown in the cell */
  label?: string;
}

/** What foo-open carries. */
interface FooOpenDetail {
  /** the item that opened */
  item: HTMLElement;
  /** its position in the list */
  index: number;
}

/**
 * Mounts it.
 * @param el - where
 * @param options - how
 * @returns the mounted element
 */
function mount(el: Element, options: { fast?: boolean } = {}): HTMLElement {}
/** The pinned URL. */
export const URL_X = 'https://example.com';

df$.fooBar = {
  /**
   * Hand it rows.
   * @param target - the grid or its selector
   * @param rows - the records
   * @param options - idField: the key field
   */
  setSource(target: string | Element, rows: Row[], { idField = 'id' }: { idField?: string } = {}): number { return 1; },
  /** Merge a query. */
  query: (target, patch) => run(target, patch),
  mount,
  url: URL_X,
  nothing: (t) => t,
};

function fire(el) {
  // Fires when it opens - the item.
  el.dispatchEvent(new CustomEvent<FooOpenDetail>('foo-open', { bubbles: true, detail: { item: el, index: 1 } }));
  el.dispatchEvent(
    new CustomEvent('foo-move', { detail: posOf(el) }),
  );
}
`;

describe('signature parsing', () => {
  it('parseArgs reads names, types, optional marks and defaults - destructuring kept whole', () => {
    expect(parseArgs("(target: string | Element, rows?: Row[], { idField = 'id' }: { idField?: string } = {}, ...rest: number[])")).toEqual([
      { name: 'target', type: 'string | Element', optional: false, default: '', doc: '' },
      { name: 'rows', type: 'Row[]', optional: true, default: '', doc: '' },
      { name: "{ idField = 'id' }", type: '{ idField?: string }', optional: true, default: '{}', doc: '' },
      { name: '...rest', type: 'number[]', optional: false, default: '', doc: '' },
    ]);
    expect(parseArgs('(a = 1, b)')).toEqual([
      { name: 'a', type: '', optional: true, default: '1', doc: '' },
      { name: 'b', type: '', optional: false, default: '', doc: '' },
    ]);
  });
  it('returnTypeAfter reads `): T {`, `): T =>`, an object type literal and none', () => {
    const at = (s: string) => returnTypeAfter(s, s.indexOf(')'));
    expect(at('f(a): Promise<Row[]> { body }')).toBe('Promise<Row[]>');
    expect(at('(a): { x: number } => ({ x: 1 })')).toBe('{ x: number }');
    expect(at('f(a): A | B;')).toBe('A | B');
    expect(at('f(a) { body }')).toBe('');
  });
  it('parseDoc splits prose, @param (with or without a type, continued lines) and @returns', () => {
    expect(parseDoc('/**\n * Does it.\n * @param {string} a - the a\n *   continued\n * @param b the b\n * @returns the result\n */')).toEqual({
      text: 'Does it.',
      params: [{ name: 'a', doc: 'the a continued' }, { name: 'b', doc: 'the b' }],
      returns: 'the result',
    });
  });
});

describe('readComponentApi()', () => {
  const api = readComponentApi('foo-bar', SRC);
  const m = Object.fromEntries(api.namespaces[0].members.map((x) => [x.name, x]));

  it('reads the states and the namespace members with their prose, typed arguments and return types', () => {
    expect(api.states).toEqual(['default', 'open']);
    expect(api.namespaces.map((n) => n.name)).toEqual(['fooBar']);
    expect(m.setSource.doc).toBe('Hand it rows.');
    expect(m.setSource.args.map((a) => [a.name, a.type, a.doc])).toEqual([
      ['target', 'string | Element', 'the grid or its selector'],
      ['rows', 'Row[]', 'the records'],
      ["{ idField = 'id' }", '{ idField?: string }', 'idField: the key field'],
    ]);
    expect(signatureOf(m.setSource)).toBe("setSource(target: string | Element, rows: Row[], { idField = 'id' }?: { idField?: string } = {}): number".replace('}?:', '}:'));
    expect(m.mount).toMatchObject({ kind: 'method', doc: 'Mounts it.', returns: { type: 'HTMLElement', doc: 'the mounted element' } }); // a shorthand resolves its function
    expect(m.url).toMatchObject({ kind: 'value', doc: 'The pinned URL.', returns: { type: 'string' } }); // a reference resolves its constant's literal type
    expect(m.nothing.doc).toBe('');
  });

  it('reads methods merged onto the registry Api, typed', () => {
    expect(api.registryExtras.map(signatureOf)).toEqual(['setDay(el: HTMLElement, day: number): void']);
  });

  it('reads events: the detail type, its declared fields, the comment above the line (or the statement)', () => {
    const open = api.events.find((e) => e.name === 'foo-open')!;
    expect(open).toMatchObject({ detail: ['item', 'index'], doc: 'Fires when it opens - the item.', type: 'FooOpenDetail' });
    expect(open.fields).toEqual([
      { name: 'item', type: 'HTMLElement', optional: false, doc: 'the item that opened' },
      { name: 'index', type: 'number', optional: false, doc: 'its position in the list' },
    ]);
    expect(api.events.find((e) => e.name === 'foo-move')).toMatchObject({ detail: ['posOf(el)'], doc: '', type: '' });
  });

  it('collects the declared types the API names', () => {
    expect(api.types.map((t) => t.name)).toEqual(['FooOpenDetail', 'Row']);
    expect(api.types.find((t) => t.name === 'Row')).toMatchObject({ doc: 'One row of the source.', fields: [
      { name: 'id', type: 'string', optional: false, doc: 'its key' },
      { name: 'label', type: 'string', optional: true, doc: 'shown in the cell' },
    ] });
  });

  it('apiGaps() names every missing description and type', () => {
    expect(apiGaps(api)).toEqual([
      'df$.shadcn.fooBar.setSource: returns `number` without an @returns description',
      'df$.shadcn.fooBar.query: argument `target` has no TypeScript type',
      'df$.shadcn.fooBar.query: argument `target` has no @param description (position 1)',
      'df$.shadcn.fooBar.query: argument `patch` has no TypeScript type',
      'df$.shadcn.fooBar.query: argument `patch` has no @param description (position 2)',
      'df$.shadcn.fooBar.query: no return type',
      'df$.shadcn.fooBar.nothing: no JSDoc',
      'df$.shadcn.fooBar.nothing: argument `t` has no TypeScript type',
      'df$.shadcn.fooBar.nothing: argument `t` has no @param description (position 1)',
      'df$.shadcn.fooBar.nothing: no return type',
      'event "foo-move": no comment above the line that creates it',
      'event "foo-move": its detail is untyped - new CustomEvent<Detail>(\'foo-move\', …) with a declared Detail type',
    ]);
  });

  it('a comma inside a generic (Record<K, V>) does not split a member', () => {
    const g = readComponentApi('g', `
df$.g = {
  /**
   * Sizes.
   * @param target - the layout
   * @returns px per side
   */
  sizes: (target: string): Partial<Record<Side, number>> => ({}),
  /** Next. */
  next: (): void => {},
};`);
    expect(g.namespaces[0].members.map(signatureOf)).toEqual(['sizes(target: string): Partial<Record<Side, number>>', 'next(): void']);
  });

  it('reads the state contract: each state, its description and its config fields', () => {
    expect(api.stateConfigs).toEqual([
      { name: 'default', doc: 'Closed.', type: '{}', fields: [] },
      { name: 'open', doc: 'Open on a day.', type: '{ day?: number; }', fields: [{ name: 'day', type: 'number', optional: true, doc: 'the day to show, 1-31' }] },
    ]);
  });

  it('flags a missing state contract, a state it lacks or adds, an undescribed state and a field the code never names', () => {
    expect(apiGaps(readComponentApi('x', `const xStates = ['default'];`))).toContain('no interface XStateConfigs - declare each state (its JSDoc: what it means) with the config setState() takes for it ({} for none)');
    const bad = readComponentApi('y', `const yStates = ['default', 'open'];
/** c */
interface YStateConfigs {
  default: { /** never read */ ghost?: number };
  /** extra */
  'all-open': {};
}`);
    expect(apiGaps(bad)).toEqual([
      'YStateConfigs lacks the state(s) open',
      'YStateConfigs declares all-open, which yStates does not',
      'state "default": config field `ghost` is never named in the code',
      'state "default": no description (/** … */ on its key in YStateConfigs)',
    ]);
  });

  it('specializes the shared State API to the component: its state union and its config map', () => {
    const shared = `
export interface ElementStateApi {
  /**
   * Enter a state.
   * @param name - a declared state
   * @param config - its config
   * @returns what the DOM work returned
   */
  setState: (name: string, config?: Record<string, unknown>) => unknown;
}
export interface ComponentApi<E extends HTMLElement = HTMLElement> {
  /**
   * The state now.
   * @param el - the element
   * @returns the state
   */
  getState(el: E): ComponentState & { model?: ElementModel };
}`;
    expect(sharedStateApi(shared).element[0].args.map((a) => a.doc)).toEqual(['a declared state', 'its config']);
    const typed = readComponentApi('foo-bar', SRC, shared);
    expect(typed.stateApi.element.map(signatureOf)).toEqual(['setState<S extends FooBarState>(name: S, config?: FooBarStateConfigs[S]): unknown']);
    expect(typed.stateApi.registry.map(signatureOf)).toEqual(['getState(el: HTMLElement): { name: FooBarState; config: FooBarStateConfigs[FooBarState]; model?: ElementModel }']);
  });

  it('flags a vague type and a detail key the declared type lacks', () => {
    const vague = readComponentApi('v', `
/** D. */
interface D {
  /** a */
  a: string;
}
df$.v = {
  /**
   * Do.
   * @param x - it
   */
  run(x: any): void {},
};
// Fires.
el.dispatchEvent(new CustomEvent<D>('v-x', { detail: { a: '', b: 1 } }));`);
    expect(apiGaps(vague).filter((g) => !g.includes('StateConfigs'))).toEqual([
      'df$.shadcn.v.run: argument `x` is typed `any` - name the real type',
      'event "v-x": detail key `b` is not a field of `D`',
    ]);
  });

  it('an instance interface documents el.api when the component replaces it - typed', () => {
    const inst = readComponentApi('x', `
export interface XInstance {
  /** Open it. */
  open(): void;
  /**
   * Close it.
   * @param force - skip the animation
   */
  close(force?: boolean): void;
  /** Whether it is open. */
  readonly isOpen: boolean;
}
root.api = this;`);
    expect(inst.instance!.name).toBe('XInstance');
    expect(inst.instance!.members.map(signatureOf)).toEqual(['open(): void', 'close(force?: boolean): void', 'isOpen: boolean']);
    expect(apiGaps(inst).filter((g) => !g.includes('StateConfigs'))).toEqual([]);
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

  it('lists TS signatures with a nested argument table, typed event details and the declared types', () => {
    expect(section).toContain('### States');
    expect(section).toContain("<code>type FooBarState = 'default' | 'open'</code>");
    expect(section).toContain('| `open` | Open on a day. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>day?</code></td><td><code>number</code></td><td>the day to show, 1-31</td></tr></table> |');
    expect(section).toContain('| `default` | Closed. No config. |');
    expect(section).toContain('<code>df$.shadcn.fooBarApi.setDay(el: HTMLElement, day: number): void</code>');
    expect(section).toContain('### `df$.shadcn.fooBar`');
    expect(section).toContain('| <code>setSource(target: string \\| Element, rows: Row[], { idField = &#39;id&#39; }: { idField?: string } = {}): number</code> |'.replace(/&#39;/g, "'"));
    expect(section).toContain('<table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \\| Element</code></td><td>the grid or its selector</td></tr>');
    expect(section).toContain('<code>detail</code>: <code>FooOpenDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>item</code></td><td><code>HTMLElement</code></td><td>the item that opened</td></tr>');
    expect(section).toContain('### Types');
    expect(section).toContain('| `Row` | One row of the source. <table>');
  });
});
