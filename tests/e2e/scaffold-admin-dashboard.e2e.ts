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

  await check('checking orders reveals the bulk bar (CSS :has)', async () => {
    await page.click('#dash-sidebar .sidebar-link[href="#orders"]');
    const before = await page.$eval('.dash-bulk', (e) => getComputedStyle(e).display);
    await page.check('#orders tbody .checkbox >> nth=1');
    const after = await page.$eval('.dash-bulk', (e) => getComputedStyle(e).display);
    assert.deepEqual([before, after], ['none', 'flex']);
    await page.check('#orders tbody .checkbox >> nth=3');
    assert.equal(await page.textContent('.dash-bulk-count'), '2 orders selected');
    const indeterminate = await page.$eval('[data-dash-all]', (e) => (e as HTMLInputElement).indeterminate);
    assert.equal(indeterminate, true);
  });

  await check('select all checks every order', async () => {
    await page.check('[data-dash-all]');
    const n = await page.evaluate(() => [...document.querySelectorAll('#orders tbody .checkbox')].filter((c) => !(c as HTMLInputElement).checked).length);
    assert.equal(n, 0);
    await page.uncheck('[data-dash-all]');
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
    const t = await page.textContent('.toast-container .toast');
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
