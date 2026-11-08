import { describe, expect, test } from 'vitest';
import { waitFor } from './helpers';

/**
 * Why: the Graph Explorer's promise is the drill-down - a link's details from the worker, a node's and a link's whole
 * page, a name on a page opening the next page - and details a page composes from library components that survive
 * the explorer's re-renders (islands). tests/e2e/graphs/graph-explorer.e2e.ts proves it in plain Playwright; this
 * drives the same public behaviors in the unit suite on the component's e2e fixture (its application: a Border Layout
 * of Panels with every outlet), through the State API and the df$.shadcn.graphExplorer namespace only.
 */

type Api = {
  setState(name: string, config?: Record<string, unknown>): unknown;
  getState(): { name: string; config: { focus: string | null; selected: string[]; expanded: boolean; edge: string | null } };
  settled(): Promise<void>;
};
type Win = Window & { df$: { shadcn: { graphExplorer: Record<string, (...a: any[]) => any> } } };

async function openApp(): Promise<{ win: Win; doc: Document; el: HTMLElement & { api: Api } }> {
  document.body.innerHTML = '';
  const frame = document.createElement('iframe');
  frame.setAttribute('style', 'position:fixed;inset:0;width:1280px;height:900px;border:0;background:#fff');
  frame.src = '/tests/e2e/graphs/graph-explorer.e2e-fixture.html';
  document.body.appendChild(frame);
  await waitFor(() => frame.contentDocument?.readyState === 'complete' && !!(frame.contentWindow as Win | null)?.df$?.shadcn, 'the fixture', 15000);
  const doc = frame.contentDocument!;
  const el = doc.getElementById('ge-app') as HTMLElement & { api: Api };
  await waitFor(() => el.getAttribute('data-graph-status') === 'ready', 'the graph', 30000);
  await el.api.settled();
  return { win: frame.contentWindow as Win, doc, el };
}

const details = (doc: Document) => doc.querySelector('[data-graph-explorer-for="ge-app"][data-graph-explorer-outlet="details"]')!;

describe('Graph Explorer: links, pages and the drill-down', () => {
  test('a link: the worker counts it both ways, its page and its relations; a node selection replaces it', async () => {
    const { win, doc, el } = await openApp();
    const ge = win.df$.shadcn.graphExplorer;
    const edges = ge.inspect(el, { children: true }).edges as { id: string; count: number; count2: number }[];
    expect(edges.length).toBeGreaterThan(0);
    const edge = edges[0];
    ge.selectEdge(el, edge.id);
    expect(el.api.getState()).toMatchObject({ name: 'selected', config: { edge: edge.id, selected: [] } });
    expect(el.getAttribute('data-selected-edge')).toBe(edge.id);
    await waitFor(() => details(doc).querySelector('.graph-explorer-stats'), 'the link details');
    const facts = Object.fromEntries(
      [...details(doc).querySelectorAll('.graph-explorer-stat')].map((s) => [s.querySelector('dt')!.textContent, s.querySelector('dd')!.textContent]),
    );
    expect([facts.Forward, facts.Back]).toEqual([edge.count.toLocaleString('en-US'), edge.count2.toLocaleString('en-US')]);
    // its whole page: KPIs, the relation shares, the single links
    el.api.setState('selected', { edge: edge.id, expanded: true });
    await el.api.settled();
    await waitFor(() => details(doc).querySelector('.graph-explorer-page .graph-explorer-kpis .statistic'), 'the link page');
    await waitFor(() => details(doc).querySelector('.graph-explorer-page .graph-explorer-rel-table tbody tr'), 'its single links');
    expect(el.hasAttribute('data-expanded')).toBe(true);
    // the relations outlet lists the link's single links too
    await waitFor(() => doc.querySelector('[data-graph-explorer-outlet="relations"] .graph-explorer-rel-table tbody tr'), 'the relations table');
    // nodes and a link are never selected together: the one a setState names wins
    el.api.setState('selected', { selected: ['c2'], expanded: false });
    await el.api.settled();
    expect(el.api.getState().config).toMatchObject({ selected: ['c2'], edge: null, expanded: false });
    expect(el.hasAttribute('data-selected-edge')).toBe(false);
    el.api.setState('default');
    await el.api.settled();
  });

  test('the drill-down: a name on a node page opens its page, which stays expanded; the trail goes back up', async () => {
    const { doc, el } = await openApp();
    el.api.setState('selected', { selected: ['c2'], expanded: true });
    await el.api.settled();
    // the first wide card holds the children - "Loading..." until they arrive; the next one the relations to sibling domains
    const link = () =>
      details(doc).querySelector('.graph-explorer-page .graph-explorer-page-card[data-wide]')?.querySelector<HTMLElement>('.graph-explorer-link');
    await waitFor(link, 'the systems of the domain page');
    const id = link()!.getAttribute('data-graph-explorer-goto')!;
    link()!.click();
    await waitFor(() => el.getAttribute('data-selected') === id, 'the next page');
    await el.api.settled();
    expect(el.api.getState()).toMatchObject({ name: 'focused', config: { focus: 'c2', selected: [id], expanded: true } });
    // the trail above the title names the page's cluster: it selects the cluster itself, one level up
    const crumb = () => details(doc).querySelector<HTMLElement>('.graph-explorer-page .graph-explorer-trail [data-graph-explorer-goto="c2"]');
    await waitFor(crumb, 'the trail');
    crumb()!.click();
    await waitFor(() => el.getAttribute('data-selected') === 'c2', 'back up');
    await el.api.settled();
    expect(el.api.getState().config).toMatchObject({ selected: ['c2'], expanded: true });
    el.api.setState('default');
    await el.api.settled();
  });

  test('an island keeps its element and what a script made in it across re-renders; unregister restores the page', async () => {
    const { win, doc, el } = await openApp();
    const ge = win.df$.shadcn.graphExplorer;
    const off = ge.register(el, {
      kind: 'detail',
      name: 'unit-island',
      match: (n: { id: string }) => (n.id === 'c3' ? 99 : false),
      render: (n: { id: string }, c: any) => {
        const late = c.request('late:' + n.id, () => new Promise((r) => setTimeout(() => r('ready'), 200)));
        return c.html`<p class="unit-state">${late ?? 'waiting'}</p>${c.island('unit:' + n.id, c.html`<div class="unit-island"></div>`)}`;
      },
    });
    try {
      el.api.setState('selected', { selected: ['c3'] });
      await el.api.settled();
      await waitFor(() => details(doc).querySelector('.unit-island'), 'the island');
      const island = details(doc).querySelector('.unit-island') as HTMLElement & { mine?: boolean };
      island.mine = true;
      island.append(doc.createElement('canvas'));
      // the request resolves and the details render again around the island
      await waitFor(() => details(doc).querySelector('.unit-state')?.textContent === 'ready', 'the late data');
      const now = details(doc).querySelector('.unit-island') as HTMLElement & { mine?: boolean };
      expect(now).toBe(island);
      expect(now.querySelector('canvas')).not.toBeNull();
    } finally {
      off();
    }
    el.api.setState('selected', { selected: ['c2'] });
    await el.api.settled();
    el.api.setState('selected', { selected: ['c3'] });
    await el.api.settled();
    await waitFor(() => details(doc).querySelector('.graph-explorer-stats'), 'the built-in details again');
    expect(details(doc).querySelector('.unit-island')).toBeNull();
  });

  test('a cluster page: every entity below it in a Data Grid, the shares follow its filters', async () => {
    const { win, doc, el } = await openApp();
    el.api.setState('selected', { selected: ['c2'], expanded: true });
    await el.api.settled();
    const grid = () => details(doc).querySelector('.graph-explorer-records .data-grid') as HTMLElement | null;
    await waitFor(() => grid()?.querySelector('.data-grid-row[data-index]'), 'the rows grid', 15000);
    const g = win.df$.shadcn as unknown as { dataGrid: { source(el: HTMLElement): { rows: unknown[] }; query(el: HTMLElement, q: unknown): void; rows(el: HTMLElement): unknown[] } };
    const members = (el as unknown as { _graphExplorer: { view: { children: { id: string; members: number }[] } } })._graphExplorer.view.children.find((n) => n.id === 'c2')!.members;
    expect(g.dataGrid.source(grid()!).rows.length).toBe(members);
    g.dataGrid.query(grid()!, { filters: [{ field: 'owner', op: 'eq', value: 'mira' }] });
    await waitFor(() => /match the filters/.test(details(doc).querySelector('.graph-explorer-records-count')?.textContent ?? ''), 'the shares follow');
    const shown = g.dataGrid.rows(grid()!).length;
    const owners = [...details(doc).querySelectorAll('.graph-explorer-records-share:nth-child(2) .graph-explorer-share-name')].map((n) => n.textContent);
    expect(owners).toEqual(['mira']);
    expect(details(doc).querySelector('.graph-explorer-records-count')!.textContent).toContain(shown.toLocaleString('en-US'));
    el.api.setState('default');
    await el.api.settled();
  });

  test('without a details outlet there is nothing to expand to: the state lands unexpanded', async () => {
    const { doc } = await openApp();
    const bare = doc.getElementById('ge-focused') as HTMLElement & { api: Api };
    await waitFor(() => bare.getAttribute('data-graph-status') === 'ready', 'the bare explorer', 30000);
    const child = (bare as unknown as { _graphExplorer: { view: { children: { id: string }[] } } })._graphExplorer.view.children[0].id;
    bare.api.setState('focused', { focus: bare.getAttribute('data-focus'), selected: [child], expanded: true });
    await bare.api.settled();
    expect(bare.api.getState().config).toMatchObject({ selected: [child], expanded: false });
  });
});
