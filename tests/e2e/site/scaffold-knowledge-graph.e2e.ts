import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';
import { chooseLanguage, renderedLanguage, translationGaps } from '../lib/translation.ts';

/**
 * Why: the Knowledge Graph scaffold is the graph-explorer PoC's whole application composed from shipped components,
 * and its promise is the drill-down: from a domain to a system to a dataset, page by page, each page composed from
 * library components, every page an address. This drives the generated full-screen page
 * (dist/documentation/application/app-knowledge-graph.html, built from the scaffold page's own example fence) on its
 * own app bundle: a 1,000,000-node graph, every outlet of its Border Layout of Panels, the layer switch (Owners a layer
 * of the page), Back and Out in the graph's header, the Hierarchy Explorer, an API
 * system's details with a Chart (an island), its page with the Geo Map, the team and the endpoints, the drill-down
 * and Back, a link's traffic, a deep link, the Relations Panel, the translation - with no page errors.
 */

const PAGE = '/dist/documentation/application/app-knowledge-graph.html';
const server = startServer();
const browser = await chromium.launch();
let failures = 0;
async function check(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${label}\n    ${err instanceof Error ? err.message : err}`);
  }
}

async function open(hash = ''): Promise<{ page: Page; errors: string[] }> {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  await offlineJsdelivr(page);
  // the page draws its lucide icons from unpkg: not needed for these checks
  await page.route('https://unpkg.com/**', (route) => route.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.goto(`${server.url}${PAGE}${hash}`);
  await page.waitForFunction(() => document.getElementById('kg')?.getAttribute('data-graph-status') === 'ready', null, { timeout: 60_000 });
  return { page, errors };
}
const settled = (page: Page) => page.evaluate(() => (document.getElementById('kg') as any).api.settled());
const config = (page: Page) => page.evaluate(() => (document.getElementById('kg') as any).api.getState().config);
const hashOf = (page: Page) => page.evaluate(() => location.hash);

try {
  const { page, errors } = await open();

  await check('the page loads only its own app bundle (with the graph explorer and the geo map) and fills the window', async () => {
    const scripts = await page.evaluate(() => [...document.querySelectorAll('script[src]')].map((s) => s.getAttribute('src')));
    assert.ok(scripts.includes('../../apps/knowledge-graph/knowledge-graph.min.js'), JSON.stringify(scripts));
    assert.ok(!scripts.some((s) => /components\/(all|graphs|geo)\.js/.test(s ?? '')), 'no system bundle beside the app bundle');
    assert.equal(await page.evaluate(() => typeof (globalThis as any).df$.shadcn.graphExplorer), 'object');
    assert.equal(await page.evaluate(() => typeof (globalThis as any).df$.shadcn.geo), 'object');
    const h = await page.evaluate(() => document.getElementById('kg-app')!.getBoundingClientRect().height);
    assert.equal(Math.round(h), 900);
  });

  await check('a 1,000,000-node graph; every outlet is filled; the layer switch: Nodes and Relations shown, Owners a layer of the page', async () => {
    assert.equal(await page.evaluate(() => (globalThis as any).df$.shadcn.graphExplorer.inspect('#kg').graph.nodes), 1000000);
    for (const kind of ['breadcrumb', 'details', 'relations', 'layers'])
      assert.ok(
        await page.evaluate((k) => !!document.querySelector(`[data-graph-explorer-for="kg"][data-graph-explorer-outlet="${k}"] > [data-ce-chrome]`), kind),
        kind,
      );
    await page.waitForSelector('[data-graph-explorer-layer="owners"]');
    assert.deepEqual(
      await page.$$eval('#kg-graph [data-graph-explorer-layer]', (bs) => bs.map((b) => [b.getAttribute('data-graph-explorer-layer'), b.getAttribute('aria-pressed')])),
      [
        ['nodes', 'true'],
        ['relations', 'true'],
        ['labels', 'false'],
        ['health', 'false'],
        ['owners', 'false'],
      ],
    );
    // Owners: a part in its colour on every node
    await page.click('[data-graph-explorer-layer="owners"]');
    await page.evaluate(() => (document.getElementById('kg') as any).api.setState('focused', { focus: 'c26' }));
    await settled(page);
    await page.waitForFunction(() => document.querySelectorAll('#kg .graph-explorer-part[data-layer="owners"] .graph-explorer-avatar').length > 0, null, { timeout: 10_000 });
    await page.click('[data-graph-explorer-layer="owners"]');
    await page.waitForFunction(() => !document.querySelector('#kg .graph-explorer-part[data-layer="owners"]'));
  });

  await check('a card with every layer\'s part holds them: its box (the sizes the worker placed) fits its content', async () => {
    // a domain, zoomed until its systems are cards: the node, relations, labels, health and owners parts and the button
    await page.evaluate(() => (document.getElementById('kg') as any).api.setState('focused', { focus: 'c1', selected: [], layers: ['nodes', 'relations', 'labels', 'health', 'owners'] }));
    await settled(page);
    await page.evaluate(async () => {
      const ge = (globalThis as any).df$.shadcn.graphExplorer;
      const c = ge.inspect('#kg', { children: true }).children[0];
      await ge.flyTo('#kg', { cx: c.x, cy: c.y, z: 200 / c.r });
    });
    await page.waitForFunction(() => document.querySelector('#kg .graph-explorer-node:not([hidden]) > .graph-explorer-card .graph-explorer-part[data-layer="owners"]'), null, { timeout: 10_000 });
    const over = await page.$$eval('#kg .graph-explorer-node:not([hidden]) > .graph-explorer-card', (cards) =>
      cards.filter((c) => c.scrollHeight > c.clientHeight + 1).map((c) => `${c.querySelector('.graph-explorer-label')?.textContent}: ${c.scrollHeight} > ${c.clientHeight}`),
    );
    assert.deepEqual(over, []);
    assert.match(await page.locator('#kg .graph-explorer-card-enter').first().innerText(), /Zoom in/);
    await page.evaluate(() => (document.getElementById('kg') as any).api.setState('default', { layers: ['nodes', 'relations'] }));
    await settled(page);
  });

  await check('the graph\'s header: Back and Out before the title, a divider between; the details have no Back, the toolbar no Out', async () => {
    const order = await page.$$eval('#kg-graph > .panel-header > *', (els) => els.map((e) => e.className));
    assert.deepEqual(order.slice(0, 3), ['kg-graph-nav', 'panel-icon', 'panel-title'], JSON.stringify(order));
    assert.deepEqual(
      await page.$$eval('#kg-graph .kg-graph-nav > *', (els) => els.map((c) => (c.hasAttribute('data-kg-back') ? 'back' : c.getAttribute('data-graph-explorer-action') ?? c.className))),
      ['back', 'up', 'separator'],
    );
    assert.match(await page.locator('[data-kg-back]').innerText(), /Back/);
    assert.equal(await page.locator('#kg-details [data-kg-back]').count(), 0, 'no Back in the details');
    assert.equal(await page.locator('#kg-app > .border-layout-north [data-graph-explorer-action="up"]').count(), 0, 'Out left the toolbar');
  });

  // the Hierarchy Explorer: the graph to any depth, children loaded when a branch opens, one open branch per level
  const treeRows = () =>
    page.$$eval('#kg-tree .data-grid-body .data-grid-row', (rs) =>
      rs.map((r) => ({
        level: Number(r.getAttribute('aria-level')),
        open: r.getAttribute('aria-expanded'),
        text: [...r.children].map((c) => c.textContent!.trim()).join(' '),
      })),
    );
  const toggle = (level: number, nth = 0) =>
    page.locator(`#kg-tree .data-grid-body .data-grid-row[aria-level="${level}"][aria-expanded]`).nth(nth).locator('.data-grid-toggle').click();
  await check('the Hierarchy Explorer: any depth; opening a branch closes its open sibling and lets go of what was below it', async () => {
    await page.waitForSelector('#kg-tree .data-grid-row[aria-level]');
    assert.match(await page.locator('#kg-outline-title').innerText(), /Hierarchy Explorer/);
    assert.equal(await page.locator('[data-kg-tree-back], [data-kg-tree-root]').count(), 0, 'no Back, no root bar');
    let rows = await treeRows();
    assert.equal(rows[0]!.text, 'All domains 1,000,000');
    assert.deepEqual([...new Set(rows.map((r) => r.level))].sort(), [1, 2]);
    // a domain, then a system in it, then deeper: its entities on the fourth level
    await toggle(2, 0);
    await page.waitForFunction(() => document.querySelector('#kg-tree .data-grid-body .data-grid-row[aria-level="3"]'));
    await toggle(3, 0);
    await page.waitForFunction(() => document.querySelector('#kg-tree .data-grid-body .data-grid-row[aria-level="4"]'), null, { timeout: 10_000 });
    rows = await treeRows();
    const first = rows.find((r) => r.level === 2)!.text;
    // the second domain (scrolled out of the window by now - its toggle is the grid's expanded state): the first
    // closes, its systems and entities go
    await page.evaluate(async () => {
      const grid = document.getElementById('kg-tree') as any;
      const domains = (await (globalThis as any).df$.shadcn.graphExplorer.subtree('#kg', 'c0', 2)).filter((r: any) => r.level === 1);
      const expanded = grid.store.get().config.expanded as string[];
      const second = domains.find((d: any) => !expanded.includes(d.id));
      (globalThis as any).df$.shadcn.dataGrid.query(grid, { expanded: [...expanded, second.id] });
    });
    await page.waitForFunction(
      (first) => {
        const rs = [...document.querySelectorAll('#kg-tree .data-grid-body .data-grid-row')];
        const one = rs.find((r) => r.getAttribute('aria-level') === '2' && [...r.children].map((c) => c.textContent!.trim()).join(' ') === first);
        return one?.getAttribute('aria-expanded') === 'false' && !rs.some((r) => r.getAttribute('aria-level') === '4');
      },
      first,
      { timeout: 10_000 },
    );
    rows = await treeRows();
    assert.equal(rows.filter((r) => r.level === 2 && r.open === 'true').length, 1, 'one open branch on the level');
    assert.ok(rows.some((r) => r.level === 3), 'the second domain\'s systems show');
  });

  await check('the Hierarchy Explorer: the filter narrows the open branches; a row selects its node in the graph', async () => {
    const rows = await treeRows();
    const word = rows.find((r) => r.level === 3)!.text.split(/[\s-]/)[0]!;
    await page.fill('[data-kg-tree-filter]', word);
    await page.waitForFunction(
      (word) => [...document.querySelectorAll('#kg-tree .data-grid-body .data-grid-row[aria-level="3"]')].every((r) => r.textContent!.includes(word)),
      word,
    );
    await page.fill('[data-kg-tree-filter]', '');
    await page.locator('#kg-tree .data-grid-body .data-grid-row[aria-level="2"]').first().click();
    await page.waitForFunction(() => (document.getElementById('kg') as any).api.getState().config.selected[0] === 'c1', null, { timeout: 10_000 });
  });

  await check('Live mode: the west is a stack of the Hierarchy Explorer and Updates; changes arrive as rows, a deploy names who shipped it', async () => {
    assert.deepEqual(
      await page.$$eval('#kg-app > .border-layout-west > .border-layout-stack > .panel', (ps) => ps.map((p) => p.id)),
      ['kg-outline', 'kg-updates'],
    );
    assert.equal(await page.locator('#kg-app > .border-layout-west .border-layout-stack-divider').count(), 1, 'one divider between them');
    const live = page.locator('#kg-app [data-graph-explorer-action="live"]');
    assert.match(await live.innerText(), /Live mode/);
    await live.click();
    await page.waitForSelector('#kg-updates .graph-explorer-update', { timeout: 15_000 });
    await page.waitForSelector('#kg-updates .graph-explorer-update .kg-update-who', { timeout: 30_000 });
    await live.click();
    assert.equal(await live.getAttribute('aria-pressed'), 'false');
  });

  await check('Live mode: the selection\'s Details and Relations follow the updates in place - no loading state between two answers, no island built again (they flickered)', async () => {
    await page.evaluate(() => (document.getElementById('kg-relations') as any).api.setState('default'));
    await page.evaluate(() => (document.getElementById('kg') as any).api.setState('selected', { selected: ['c1'] }));
    await page.waitForFunction(() => document.querySelector('#kg-details .graph-explorer-island .chart[data-init]'), null, { timeout: 20_000 });
    await page.waitForFunction(() => document.querySelector('[data-graph-explorer-for="kg"][data-graph-explorer-outlet="relations"] .graph-explorer-rel-table'), null, { timeout: 10_000 });
    await page.evaluate(() => {
      const seen = { renders: 0, loading: 0, islands: 0 };
      for (const kind of ['details', 'relations']) {
        const outlet = document.querySelector(`[data-graph-explorer-for="kg"][data-graph-explorer-outlet="${kind}"]`)!;
        const before = new Set(outlet.querySelectorAll('.graph-explorer-island'));
        new MutationObserver((recs) => {
          seen.renders++;
          if (/Loading\.\.\./.test(outlet.textContent ?? '')) seen.loading++;
          for (const r of recs)
            for (const n of r.addedNodes)
              if (n instanceof Element && n.matches('.graph-explorer-island') && !before.has(n)) seen.islands++;
        }).observe(outlet, { childList: true, subtree: true });
      }
      (globalThis as any).__kgLive = seen;
    });
    const live = page.locator('#kg-app [data-graph-explorer-action="live"]');
    await live.click();
    await page.waitForFunction(() => (globalThis as any).__kgLive.renders >= 3, null, { timeout: 30_000 });
    await live.click();
    const seen = await page.evaluate(() => (globalThis as any).__kgLive);
    assert.equal(seen.loading, 0, 'no "Loading..." while the updates arrive');
    assert.equal(seen.islands, 0, 'the charts stay the same elements');
    await page.evaluate(() => (document.getElementById('kg-relations') as any).api.setState('minimized'));
  });

  await check('search: ⌘K opens the Command palette; the worker\'s hits are items; Enter flies there and opens the way to it in the Hierarchy Explorer', async () => {
    await page.click('#kg-app');
    await page.keyboard.press('ControlOrMeta+k');
    await page.waitForFunction(() => (document.getElementById('kg-palette') as HTMLDialogElement).open);
    await page.keyboard.type('ledger');
    await page.waitForFunction(() => document.querySelector('[data-kg-find-status]')!.textContent!.endsWith('nodes'), null, { timeout: 15_000 });
    const hits = await page.$$eval('#kg-palette [data-kg-hit]', (h) => h.map((x) => x.getAttribute('data-kg-hit')));
    const first = await page.$eval('#kg-palette [data-kg-hit] .kg-hit-label', (x) => x.textContent!);
    assert.ok(hits.length >= 3, JSON.stringify(hits));
    assert.equal(await page.$eval('#kg-palette .command-item[data-highlighted]', (x) => x.getAttribute('data-kg-hit')), hits[0]);
    assert.ok(await page.$eval('#kg-palette [data-graph-explorer-action="fit"]', (x) => (x as HTMLElement).hidden), 'the actions filter too');
    await page.keyboard.press('Enter');
    await page.waitForFunction((id) => (document.getElementById('kg') as any).api.getState().config.selected[0] === id, hits[0], { timeout: 15_000 });
    assert.equal(await page.evaluate(() => (document.getElementById('kg-palette') as HTMLDialogElement).open), false);
    // the tree opens on the hit and selects it
    await page.waitForFunction((label) => [...document.querySelectorAll('#kg-tree .data-grid-row[aria-selected="true"]')].some((r) => r.textContent!.includes(label)), first);
  });

  await check('an API system: its numbers, a latency Chart in an island, its endpoints and its team', async () => {
    await page.evaluate(() => (document.getElementById('kg') as any).api.setState('focused', { focus: 'c1', selected: ['c26'] }));
    await settled(page);
    await page.waitForFunction(() => (document.getElementById('kg-details-sub')!.textContent ?? '').endsWith(' (API)'));
    await page.waitForFunction(() => /\d+ ms/.test(document.querySelector('#kg-details .graph-explorer-stats')?.textContent ?? ''), null, { timeout: 5000 });
    // the Chart mounts inside its island and draws
    await page.waitForFunction(() => document.querySelector('#kg-details .graph-explorer-island .chart[data-init] :is(canvas, svg)'), null, { timeout: 20_000 });
    const island = await page.$('#kg-details .graph-explorer-island .chart');
    assert.equal(await page.$$eval('#kg-details .graph-explorer-details tbody tr', (r) => r.length), 6, 'six endpoints');
    assert.ok(await page.$('#kg-details .avatar-group .avatar'), 'the team as an Avatar group');
    // a re-render (the selection's data arriving again) keeps the island's element
    await page.evaluate(() => (document.getElementById('kg') as any).api.setState('focused', { focus: 'c1', selected: ['c26'], layers: ['nodes', 'relations', 'health'] }));
    await settled(page);
    assert.ok(await island!.evaluate((el) => el.isConnected), 'the chart element survived');
    await page.evaluate(() => (document.getElementById('kg') as any).api.setState('focused', { focus: 'c1', selected: ['c26'], layers: ['nodes', 'relations'] }));
    await settled(page);
  });

  await check('E expands its page - a route: KPIs, charts, the Geo Map of its regions, endpoints, deploys; Back returns to the graph', async () => {
    await page.locator('#kg').focus();
    await page.keyboard.press('e');
    await page.waitForFunction(() => document.getElementById('kg-details')!.hasAttribute('data-maximized'));
    await page.waitForFunction(() => location.hash === '#/node/c26');
    await page.waitForSelector('#kg-details .graph-explorer-page .graph-explorer-kpis .statistic');
    await page.waitForFunction(() => document.querySelectorAll('#kg-details .graph-explorer-page .chart[data-init]').length >= 2, null, { timeout: 20_000 });
    const map = await page.waitForSelector('#kg-details .graph-explorer-page .geo-map[data-init]', { timeout: 20_000 });
    assert.match((await map.getAttribute('data-selected')) ?? '', /^country:[A-Z]{3}( country:[A-Z]{3}){2,4}$/);
    // drawn from this build's data (the page's geo-map-data tag): the release's npm package exists only once it is published
    await page.waitForFunction(() => /^(ready|error)$/.test(document.querySelector('#kg-details .graph-explorer-page .geo-map')?.getAttribute('data-geo-status') ?? ''), null, { timeout: 20_000 });
    assert.equal(await map.getAttribute('data-geo-status'), 'ready', (await map.textContent()) ?? '');
    assert.ok((await page.$$('#kg-details .graph-explorer-page .timeline .timeline-item')).length >= 3, 'the deploys as a Timeline');
    await page.goBack();
    await page.waitForFunction(() => !document.getElementById('kg-details')!.hasAttribute('data-maximized'));
    assert.equal((await config(page)).expanded, false);
  });

  await check('the drill-down: a domain page, a system from its table, Back walks up to the domain again', async () => {
    await page.evaluate(() => (document.getElementById('kg') as any).api.setState('selected', { selected: ['c3'], expanded: true }));
    await settled(page);
    await page.waitForFunction(() => location.hash === '#/node/c3');
    await page.waitForSelector('#kg-details .graph-explorer-page .graph-explorer-page-card[data-wide] .graph-explorer-link');
    const sys = page.locator('#kg-details .graph-explorer-page .graph-explorer-page-card[data-wide] .graph-explorer-link').first();
    const id = await sys.getAttribute('data-graph-explorer-goto');
    await sys.click();
    await page.waitForFunction((id) => location.hash === '#/node/' + id, id);
    await settled(page);
    const c = await config(page);
    assert.deepEqual([c.focus, c.selected, c.expanded], ['c3', [id], true]);
    assert.ok(await page.locator('#kg-details').evaluate((el) => el.hasAttribute('data-maximized')), 'the page stayed');
    // a dataset further down: the system's entities table
    await page.waitForSelector('#kg-details .graph-explorer-page .graph-explorer-page-card[data-wide] .graph-explorer-link');
    await page.goBack();
    await page.waitForFunction(() => location.hash === '#/node/c3');
    await page.waitForFunction(() => document.getElementById('kg')!.getAttribute('data-selected') === 'c3');
    assert.equal((await config(page)).expanded, true);
    await page.goBack();
    await page.waitForFunction(() => !document.getElementById('kg')!.hasAttribute('data-expanded'));
  });

  await check('Back in the graph\'s header returns to the selection before; a page open over the graph shows no Back', async () => {
    const back = page.locator('[data-kg-back]');
    await page.evaluate(() => (document.getElementById('kg') as any).api.setState('focused', { focus: 'c1', selected: ['c26'] }));
    await settled(page);
    await page.evaluate(() => (document.getElementById('kg') as any).api.setState('focused', { focus: 'c1', selected: ['c27'] }));
    await settled(page);
    // its title names the step before, from the worker
    await page.waitForFunction(() => /^Back to \S/.test(document.querySelector('[data-kg-back]')!.getAttribute('title') ?? ''));
    await back.click();
    await page.waitForFunction(() => document.getElementById('kg')!.getAttribute('data-selected') === 'c26');
    // the page maximized over the graph: no Back to see - the address walks a drill-down back
    await page.locator('#kg').focus();
    await page.keyboard.press('e');
    await page.waitForFunction(() => location.hash === '#/node/c26');
    await page.waitForFunction(() => document.getElementById('kg-details')!.hasAttribute('data-maximized'));
    // the maximized page lies over the graph and its header: Back is not what the user sees there
    const covered = () =>
      back.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return !el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
      });
    assert.equal(await covered(), true, 'no Back on a page');
    await page.locator('#kg-details [data-graph-explorer-action="collapse"]').first().click();
    await page.waitForFunction(() => !document.getElementById('kg')!.hasAttribute('data-expanded'));
    assert.equal(await covered(), false, 'Back again over the graph');
  });

  await check('a link between two domains: a click on its label (the Labels layer) shows its traffic (a Chart), E its page - a route', async () => {
    await page.evaluate(() => (document.getElementById('kg') as any).api.setState('default', { layers: ['nodes', 'relations', 'labels'] }));
    await settled(page);
    await page.waitForFunction(() => document.querySelector('#kg .graph-explorer-edge-label:not([hidden])[data-graph-explorer-edge]'));
    const host = page.locator('#kg .graph-explorer-edge-label:not([hidden])[data-graph-explorer-edge]').first();
    const id = (await host.getAttribute('data-graph-explorer-edge'))!;
    // at this seed and size the first label sits over a domain's disk: the label, drawn on top, wins the click
    await host.click();
    await page.waitForFunction((id) => document.getElementById('kg')!.getAttribute('data-selected-edge') === id, id);
    await page.waitForSelector('#kg-details .graph-explorer-ends');
    await page.waitForFunction(() => document.querySelector('#kg-details .graph-explorer-island .chart[data-init]'), null, { timeout: 20_000 });
    await page.locator('#kg').focus();
    await page.keyboard.press('e');
    await page.waitForFunction((id) => location.hash === '#/link/' + id.replace('>', '/'), id);
    await page.waitForSelector('#kg-details .graph-explorer-page .graph-explorer-rel-table tbody tr');
    await page.goBack();
    await page.waitForFunction(() => !document.getElementById('kg')!.hasAttribute('data-expanded'));
  });

  await check('a dataset: a chart of its records in the sidebar; its page - a million records in a Data Grid, charts that follow its filters, a bar click that filters it', async () => {
    // a system that holds a dataset
    const target = await page.evaluate(async () => {
      const el = document.getElementById('kg') as any;
      for (const sys of ['c30', 'c31', 'c32', 'c33', 'c34', 'c35']) {
        el.api.setState('focused', { focus: sys });
        await el.api.settled();
        const ds = el._graphExplorer.view.children.find((n: any) => n.typeName === 'Dataset');
        if (ds) return { sys, id: ds.id, rows: ds.attrs.rows };
      }
      return null;
    });
    assert.ok(target, 'a system with a dataset');
    const records = Math.min(1_000_000, target!.rows * 1000);
    await page.evaluate(async (t) => {
      const el = document.getElementById('kg') as any;
      el.api.setState('focused', { focus: t.sys, selected: [t.id] });
      await el.api.settled();
    }, target);
    // the sidebar: every record grouped by day, drawn by a Chart bound to them
    await page.waitForFunction(() => document.querySelector('#kg-details .graph-explorer-island .chart[data-init] svg path'), null, { timeout: 20_000 });
    const days = await page.evaluate(() => {
      const el = document.querySelector('#kg-details .graph-explorer-island .chart') as HTMLElement;
      return (globalThis as any).df$.shadcn.chart.instance(el).getOption().dataset[0].source;
    });
    assert.equal(days.reduce((n: number, d: any) => n + d.count, 0), records, 'the day groups hold every record');
    // the page
    await page.evaluate(async (t) => {
      const el = document.getElementById('kg') as any;
      el.api.setState('focused', { focus: t.sys, selected: [t.id], expanded: true });
      await el.api.settled();
    }, target);
    const grid = '#kg-details .kg-records .data-grid';
    await page.waitForFunction(() => document.querySelectorAll('#kg-details .kg-records .chart[data-init] svg').length === 3, null, { timeout: 30_000 });
    await page.waitForSelector(grid + ' .data-grid-row[data-index]');
    assert.equal(await page.getAttribute(grid, 'aria-rowcount'), String(records + 2));
    assert.match((await page.textContent('#kg-details .kg-records-count')) ?? '', new RegExp(`^${records.toLocaleString('en-US')} of ${records.toLocaleString('en-US')} records`));
    // a grid filter: the count and the charts follow
    await page.selectOption(grid + ' .data-grid-filter[data-field="status"]', 'failed');
    await page.waitForFunction(() => /match the filters/.test(document.querySelector('#kg-details .kg-records-count')!.textContent ?? ''));
    const failed = await page.evaluate(() => (globalThis as any).df$.shadcn.dataGrid.rows(document.querySelector('#kg-details .kg-records .data-grid')).length);
    const status = await page.evaluate(() => (globalThis as any).df$.shadcn.chart.instance(document.querySelector('#kg-details [data-kg-chart="status"]')).getOption().series[0].data);
    assert.deepEqual(status, [{ name: 'failed', value: failed }]);
    // a click on the first country bar adds its filter to the grid
    const pt = await page.evaluate(() => {
      const el = document.querySelector('#kg-details [data-kg-chart="country"]') as HTMLElement;
      const chart = (globalThis as any).df$.shadcn.chart.instance(el);
      const opt = chart.getOption();
      const [x, y] = chart.convertToPixel({ seriesIndex: 0 }, [opt.series[0].data[0] / 2, 0]);
      const r = el.getBoundingClientRect();
      return { x: r.left + x, y: r.top + y, country: opt.yAxis[0].data[0] };
    });
    await page.mouse.click(pt.x, pt.y);
    await page.waitForFunction(
      (c) => ((document.querySelector('#kg-details .kg-records .data-grid') as any).store.value.config.filters ?? []).some((f: any) => f.field === 'country' && f.value === c),
      pt.country,
    );
    const both = await page.evaluate(() => (globalThis as any).df$.shadcn.dataGrid.rows(document.querySelector('#kg-details .kg-records .data-grid')));
    assert.ok(both.length > 0 && both.every((r: any) => r.status === 'failed' && r.country === pt.country), 'the grid shows the failed records of that country');
    await page.goBack();
    await page.waitForFunction(() => !document.getElementById('kg')!.hasAttribute('data-expanded'));
  });

  await check('the Relations Panel unfolds into the table of the selection\'s relations', async () => {
    await page.evaluate(() => (document.getElementById('kg') as any).api.setState('selected', { selected: ['c2'] }));
    await settled(page);
    await page.click('#kg-relations .panel-minimize');
    await page.waitForSelector('#kg-relations .graph-explorer-rel-table tbody tr', { timeout: 5000 });
    assert.match((await page.locator('#kg-relations-sub').textContent()) ?? '', / · \d+$/);
  });

  await check('every target and attribute in English and German; the switch translates the frame', async () => {
    assert.deepEqual(await translationGaps(page, '[data-kg]'), []);
    await chooseLanguage(page, 'de');
    assert.equal(await renderedLanguage(page, '[data-kg]'), 'de');
    assert.equal(await page.textContent('[data-i18n-target="kg-t-relations"]'), 'Beziehungen');
    await chooseLanguage(page, 'en');
    assert.equal(await page.textContent('[data-i18n-target="kg-t-relations"]'), 'Relations');
  });

  await check('the light / dark button switches the whole app - the tokens and the graph explorer\'s own palette', async () => {
    const seen = () =>
      page.evaluate(() => ({
        dark: document.documentElement.classList.contains('dark'),
        pressed: document.querySelector('[data-kg-theme]')!.getAttribute('aria-pressed'),
        background: getComputedStyle(document.getElementById('kg-outline')!).backgroundColor,
        explorer: (document.getElementById('kg') as any)._graphExplorer?.palette?.dark ?? null,
      }));
    const before = await seen();
    assert.equal(before.pressed, String(before.dark));
    await page.click('[data-kg-theme]');
    await page.waitForFunction((was) => document.documentElement.classList.contains('dark') !== was, before.dark);
    await page.waitForTimeout(200);
    const after = await seen();
    assert.equal(after.pressed, String(after.dark));
    assert.notEqual(after.background, before.background, 'the app takes the other palette');
    if (before.explorer !== null) assert.equal(after.explorer, after.dark, 'the explorer draws in the new palette');
    await page.click('[data-kg-theme]');
    await page.waitForFunction((was) => document.documentElement.classList.contains('dark') === was, before.dark);
  });

  await check('no page errors', async () => {
    assert.deepEqual(errors, []);
  });
  await page.close();

  await check('a deep link opens a node\'s page', async () => {
    const deep = await open('#/node/c26');
    await deep.page.waitForFunction(() => document.getElementById('kg-details')!.hasAttribute('data-maximized'), null, { timeout: 20_000 });
    await deep.page.waitForFunction(() => (document.getElementById('kg-details-sub')!.textContent ?? '').endsWith(' (API)'));
    assert.equal(await hashOf(deep.page), '#/node/c26');
    assert.deepEqual(deep.errors, []);
    await deep.page.close();
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nscaffold-knowledge-graph: all checks passed');
