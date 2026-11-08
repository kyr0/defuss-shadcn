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
 * own app bundle: a 1,000,000-node graph, every outlet of its Border Layout of Panels, the Owners Node UI, an API
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

  await check('a 1,000,000-node graph; every outlet of the layout is filled; the Owners Node UI joins the switch', async () => {
    assert.equal(await page.evaluate(() => (globalThis as any).df$.shadcn.graphExplorer.inspect('#kg').graph.nodes), 1000000);
    for (const kind of ['breadcrumb', 'search', 'outline', 'details', 'relations', 'node-ui'])
      assert.ok(
        await page.evaluate((k) => !!document.querySelector(`[data-graph-explorer-for="kg"][data-graph-explorer-outlet="${k}"] > [data-ce-chrome]`), kind),
        kind,
      );
    await page.waitForSelector('[data-graph-explorer-node-ui="owners"]');
    await page.click('[data-graph-explorer-node-ui="owners"]');
    await page.evaluate(() => (document.getElementById('kg') as any).api.setState('focused', { focus: 'c26' }));
    await settled(page);
    await page.waitForFunction(() => document.querySelectorAll('#kg .graph-explorer-avatar').length > 0, null, { timeout: 10_000 });
    await page.click('[data-graph-explorer-node-ui="default"]');
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
    await page.evaluate(() => (document.getElementById('kg') as any).api.setState('focused', { focus: 'c1', selected: ['c26'], nodeUi: 'health' }));
    await settled(page);
    assert.ok(await island!.evaluate((el) => el.isConnected), 'the chart element survived');
    await page.evaluate(() => (document.getElementById('kg') as any).api.setState('focused', { focus: 'c1', selected: ['c26'], nodeUi: 'default' }));
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

  await check('a link between two domains: a click on its label shows its traffic (a Chart), E its page - a route', async () => {
    await page.evaluate(() => (document.getElementById('kg') as any).api.setState('default'));
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
