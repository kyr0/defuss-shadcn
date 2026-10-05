import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from './server.ts';

/**
 * Why: the admin-dashboard scaffold is a clickdummy - its promise is that the
 * clicks work. This drives the generated full-screen page
 * (dist/documentation/app-admin-dashboard.html, built from the scaffold
 * page's own example fence) through the views, the command palette, the
 * sheet, the bulk bar and dark mode.
 */
const PAGE = '/dist/documentation/app-admin-dashboard.html';
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

try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(`${server.url}${PAGE}`);
  await page.waitForFunction(() => !!(globalThis as any).df$?.shadcn?.toast, undefined, { timeout: 10_000 });
  const visibleViews = () => page.evaluate(() => [...document.querySelectorAll('.dash-view')].filter((v) => getComputedStyle(v).display !== 'none').map((v) => v.id));
  const current = () => page.evaluate(() => document.querySelector('#dash-sidebar .sidebar-link[aria-current="page"]')?.getAttribute('href'));

  await check('opens on the overview: one view shown, Overview current', async () => {
    assert.deepEqual(await visibleViews(), ['overview']);
    assert.equal(await current(), '#overview');
  });

  await check('the sidebar switches views through the URL; the breadcrumb follows', async () => {
    await page.click('#dash-sidebar .sidebar-link[href="#orders"]');
    await page.waitForTimeout(150);
    assert.deepEqual(await visibleViews(), ['orders']);
    assert.equal(await current(), '#orders');
    assert.equal(await page.textContent('[data-dash-crumb]'), 'Orders');
    assert.equal(new URL(page.url()).hash, '#orders');
  });

  await check('back goes to the previous view', async () => {
    await page.goBack();
    await page.waitForTimeout(150);
    assert.deepEqual(await visibleViews(), ['overview']);
  });

  const grid = () => page.$eval('#dash-orders-grid', (g: any) => ({
    config: g.store.value.config,
    status: g.querySelector('.data-grid-status')?.textContent ?? '',
    first: [...(g.querySelector('.data-grid-rows > .data-grid-row')?.children ?? [])].map((c: any) => c.textContent.trim()),
  }));

  await check('the orders are a data grid: 1,284 orders, newest first, a page of 12', async () => {
    await page.click('#dash-sidebar .sidebar-link[href="#orders"]');
    await page.waitForFunction(() => (document.querySelector('#dash-orders-grid') as any)?.store?.value.name === 'default');
    const g = await grid();
    assert.deepEqual(g.config.sorters, [{ field: 'date', direction: 'desc' }]);
    assert.equal(g.status, '1–12 of 1,284 rows');
    assert.equal(g.first[0], '#A-20481');
    assert.match(g.first[1], /^Anna Silva/);
  });

  await check('filters and sorting run over every order; the view is kept in local storage under the app prefix', async () => {
    await page.selectOption('#dash-orders-grid .data-grid-filter[data-field="status"]', 'Pending');
    await page.waitForFunction(() => (document.querySelector('#dash-orders-grid') as any).store.value.config.filters.length === 1);
    const all = await page.$eval('#dash-orders-grid', (g) => (globalThis as any).df$.shadcn.dataGrid.rows(g).map((o: any) => o.status));
    assert.ok(all.length > 0 && all.every((x: string) => x === 'Pending'));
    await page.click('#dash-orders-grid .data-grid-header[data-field="total"]');
    const key = Object.keys(await page.evaluate(() => ({ ...localStorage }))).find((k) => k.startsWith('acme-admin:') && k.endsWith(':data-grid:dash-orders-grid'));
    assert.ok(key, 'a key under the acme-admin prefix');
    await page.reload();
    await page.waitForFunction(() => (document.querySelector('#dash-orders-grid') as any)?.store?.value.name === 'default');
    const g = await grid();
    assert.deepEqual(g.config.sorters, [{ field: 'total', direction: 'asc' }]);
    assert.deepEqual(g.config.filters, [{ field: 'status', op: 'eq', value: 'Pending' }]);
    await page.$eval('#dash-orders-grid', (el) => (globalThis as any).df$.shadcn.dataGrid.query(el, { filters: [], sorters: [{ field: 'date', direction: 'desc' }] }));
  });

  await check('selecting orders reveals the bulk bar with the count; Select all; Mark shipped edits the rows', async () => {
    await page.click('#dash-sidebar .sidebar-link[href="#orders"]');
    assert.equal(await page.$eval('.dash-bulk', (e) => getComputedStyle(e).display), 'none');
    await page.click('#dash-orders-grid .data-grid-rows > .data-grid-row:nth-child(2) .data-grid-cell:nth-child(3)');
    await page.click('#dash-orders-grid .data-grid-rows > .data-grid-row:nth-child(4) .data-grid-cell:nth-child(3)', { modifiers: ['ControlOrMeta'] });
    assert.equal(await page.$eval('.dash-bulk', (e) => getComputedStyle(e).display), 'flex');
    assert.equal(await page.textContent('.dash-bulk-count'), '2 orders selected');
    await page.click('[data-dash-bulk="ship"]');
    const shipped = await page.$eval('#dash-orders-grid', (g) => (globalThis as any).df$.shadcn.dataGrid.rows(g).slice(0, 4).map((o: any) => o.status));
    assert.equal(shipped[1], 'Shipped');
    assert.equal(shipped[3], 'Shipped');
    assert.equal(await page.$eval('.dash-bulk', (e) => getComputedStyle(e).display), 'none', 'the selection is cleared');
    await page.click('#dash-orders-grid .data-grid-rows > .data-grid-row:nth-child(1) .data-grid-cell:nth-child(3)');
    await page.click('[data-dash-bulk="all"]');
    assert.equal(await page.textContent('.dash-bulk-count'), '1,284 orders selected');
    await page.click('[data-dash-bulk="clear"]');
    assert.equal(await page.$eval('.dash-bulk', (e) => getComputedStyle(e).display), 'none');
    await page.evaluate(() => localStorage.clear());
  });

  await check('⌘K opens the command palette; an item jumps to its view', async () => {
    await page.keyboard.press('Meta+k');
    assert.equal(await page.evaluate(() => (document.getElementById('dash-cmd') as HTMLDialogElement).open), true);
    await page.click('#dash-cmd .command-item[data-go="customers"]');
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => (document.getElementById('dash-cmd') as HTMLDialogElement).open), false);
    assert.deepEqual(await visibleViews(), ['customers']);
  });

  await check('New order opens the sheet; creating it closes the sheet and shows a toast', async () => {
    await page.click('#dash-sidebar .sidebar-link[href="#overview"]');
    await page.click('#overview [data-sheet-trigger="dash-new-order"]');
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => (document.getElementById('dash-new-order') as HTMLDialogElement).open), true);
    await page.selectOption('#dash-no-cust', 'Marco Rossi');
    await page.click('#dash-new-order button[type="submit"]');
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => (document.getElementById('dash-new-order') as HTMLDialogElement).open), false);
    // the newest toast (earlier checks may have left one)
    const t = await page.$$eval('.toast-container .toast', (ts) => ts.map((x) => x.textContent ?? '').find((x) => x.includes('Order created')));
    assert.ok(t?.includes('Order created') && t.includes('Marco Rossi'), String(t));
  });

  await check('the moon toggles dark mode', async () => {
    const before = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    await page.click('.dash-topbar [data-dash-theme]');
    const after = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    assert.notEqual(before, after);
  });

  await check('the sidebar collapses to a rail; workspace and usage text step aside', async () => {
    await page.click('.dash-topbar [data-sidebar-trigger="dash-sidebar"]');
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({ state: document.getElementById('dash-sidebar')!.dataset.state, usage: getComputedStyle(document.querySelector('.dash-usage')!).display }));
    assert.deepEqual(r, { state: 'collapsed', usage: 'none' });
  });

  await check('narrow: the rail hides, a menu button opens the navigation drawer', async () => {
    await page.setViewportSize({ width: 600, height: 900 });
    await page.waitForTimeout(200);
    const r = await page.evaluate(() => ({ rail: getComputedStyle(document.getElementById('dash-sidebar')!).display, menu: getComputedStyle(document.querySelector('.dash-mobile-trigger')!).display }));
    assert.equal(r.rail, 'none');
    assert.ok(r.menu.endsWith('flex'), r.menu);
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`scaffold-admin-dashboard.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('scaffold-admin-dashboard.e2e: all checks passed');
