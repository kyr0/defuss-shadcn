import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from './server.ts';

/**
 * Why: the status-page scaffold is a clickdummy - its promise is that the
 * clicks work and that the public page tells the truth about the console.
 * This drives the generated full-screen page
 * (dist/documentation/app-status-page.html, built from the scaffold page's
 * own example fence): the banner and levels, the uptime bars and their hover
 * card, groups, the incident report, the maintenance countdown, history,
 * subscribing - then the console: component levels, creating an incident,
 * posting an update, resolving - and the narrow layout.
 */
const PAGE = '/dist/documentation/app-status-page.html';
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
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${server.url}${PAGE}`);
  await page.waitForFunction(() => !!(globalThis as any).df$?.shadcn?.toast, undefined, { timeout: 10_000 });
  const shown = (sel: string) => page.$eval(sel, (e) => e.checkVisibility());
  const views = () => page.evaluate(() => [...document.querySelectorAll('.sp-view')].filter((v) => getComputedStyle(v).display !== 'none').map((v) => v.id));
  const banner = () => page.evaluate(() => [document.querySelector('.sp-banner')!.getAttribute('data-level'), document.querySelector('[data-sp-banner]')!.textContent]);
  const level = (id: string) => page.getAttribute(`#status .sp-comp[data-comp="${id}"]`, 'data-level');
  const clearToasts = () => page.evaluate(() => (globalThis as any).df$.shadcn.toast.dismiss());

  await check('opens on the status page: the banner and the rows show the worst level', async () => {
    assert.deepEqual(await views(), ['status']);
    assert.deepEqual(await banner(), ['degraded', 'Degraded Performance']);
    assert.equal(await level('rest'), 'degraded');
    assert.equal(await page.textContent('#status .sp-comp[data-comp="rest"] [data-f="level"]'), 'Degraded performance');
    assert.equal(await page.getAttribute('#status .sp-group-item[data-group="api"]', 'data-level'), 'degraded');
    assert.equal(await page.$$eval('#status .sp-active', (a) => a.length), 1);
  });

  await check('levels colour by inherited custom properties', async () => {
    const c = (sel: string) => page.$eval(sel, (e) => getComputedStyle(e).color);
    assert.notEqual(await c('#status .sp-comp[data-comp="rest"] .sp-state'), await c('#status .sp-comp[data-comp="graphql"] .sp-state'));
  });

  await check('90 uptime bars per component; hovering a day names its incident', async () => {
    assert.equal(await page.$$eval('[data-bars="dashboard"] i', (i) => i.length), 90);
    assert.equal(await page.getAttribute('[data-bars="dashboard"] i:nth-child(87)', 'data-l'), 'major');
    // scrolling hides the card (it would float over moving bars) - scroll first, then point
    await page.locator('[data-bars="dashboard"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.hover('[data-bars="dashboard"] i:nth-child(87)');
    assert.equal(await page.$eval('#sp-tip', (t) => t.matches(':popover-open')), true);
    const t = await page.textContent('#sp-tip');
    assert.ok(t!.includes('Sep 29, 2026') && t!.includes('Dashboard login failures') && t!.includes('42 min'), t!);
    await page.hover('[data-bars="dashboard"] i:nth-child(10)');
    assert.ok((await page.textContent('#sp-tip'))!.includes('No downtime recorded'));
    await page.mouse.move(5, 5);
    assert.equal(await page.$eval('#sp-tip', (t) => t.matches(':popover-open')), false);
  });

  await check('a closed group shows its own bars; opened, its components', async () => {
    const g = '#status .sp-group-item[data-group="data"]';
    assert.deepEqual([await shown(`${g} > .sp-group-bars`), await shown(`${g} .sp-comp[data-comp="search"]`)], [true, false]);
    await page.click(`${g} summary`);
    assert.deepEqual([await shown(`${g} > .sp-group-bars`), await shown(`${g} .sp-comp[data-comp="search"]`)], [false, true]);
  });

  await check('the maintenance counts down', async () => {
    await page.waitForTimeout(1200);
    assert.equal(await page.getAttribute('.sp-maint .countdown-group', 'data-state-name'), 'running');
    assert.equal(await page.textContent('.sp-maint [data-unit="days"]'), '5');
  });

  await check('the incident report: its timeline, and back', async () => {
    await page.click('#status .sp-active [data-f="title"]');
    assert.deepEqual(await views(), ['incident-i-api']);
    assert.deepEqual(await page.$$eval('#incident-i-api .sp-update strong', (s) => s.map((x) => x.textContent)), ['Monitoring', 'Identified', 'Investigating']);
    await page.click('#incident-i-api .sp-back');
    assert.deepEqual(await views(), ['status']);
  });

  await check('history filters by component', async () => {
    await page.click('.sp-top a[href="#history"]');
    await page.selectOption('[data-sp-filter]', 'search');
    const vis = await page.$$eval('#history .sp-past', (l) => l.filter((x) => x.checkVisibility()).map((x) => (x as HTMLElement).dataset.incident));
    assert.deepEqual(vis, ['i-search']);
    assert.equal(await shown('#history .sp-month:nth-of-type(3) .sp-none'), true, 'August shows its empty line');
    await page.selectOption('[data-sp-filter]', '');
  });

  await check('subscribe: tabs per channel; email subscribes with a toast', async () => {
    await page.click('[data-dialog-trigger="sp-subscribe"]');
    assert.equal(await page.$eval('#sp-subscribe', (d) => (d as HTMLDialogElement).open), true);
    await page.click('#sp-st-hook');
    assert.deepEqual([await shown('#sp-s-hook'), await shown('#sp-s-mail')], [true, false]);
    await page.click('#sp-st-mail');
    await page.fill('#sp-sub-mail', 'ops@example.com');
    await page.click('#sp-s-mail button[type="submit"]');
    assert.equal(await page.$eval('#sp-subscribe', (d) => (d as HTMLDialogElement).open), false);
    assert.ok((await page.textContent('.toast-container .toast'))!.includes('Subscribed'));
  });

  await check('console: a component level changes the public page; the day keeps its worst', async () => {
    await page.click('.sp-top a[href="#manage"]');
    await page.click('#sp-t-comp');
    await page.selectOption('select[data-sp-level="dashboard"]', 'major');
    assert.equal(await level('dashboard'), 'major');
    assert.deepEqual(await banner(), ['major', 'Major System Outage']);
    assert.equal(await page.getAttribute('[data-bars="dashboard"] i:last-child', 'data-l'), 'major');
    await page.selectOption('select[data-sp-level="dashboard"]', 'operational');
    assert.deepEqual(await banner(), ['degraded', 'Degraded Performance']);
    assert.equal(await page.getAttribute('[data-bars="dashboard"] i:last-child', 'data-l'), 'major');
  });

  await check('console: creating an incident puts it on the page, its report and the console', async () => {
    await clearToasts();
    await page.click('#sp-t-inc');
    await page.click('[data-sp-new]');
    await page.fill('#sp-c-title', 'Uploads failing in us-east');
    await page.fill('#sp-c-msg', 'Uploads fail for some customers. We are investigating.');
    await page.check('#sp-a-storage');
    await page.selectOption('#sp-create select[name="level-storage"]', 'partial');
    await page.click('#sp-create button[type="submit"]');
    assert.equal(await page.$eval('#sp-create', (d) => (d as HTMLDialogElement).open), false);
    assert.equal(await page.textContent('[data-sp-open-count]'), '2');
    assert.equal(await level('storage'), 'partial');
    assert.equal(await page.getAttribute('#status .sp-group-item[data-group="data"]', 'data-level'), 'partial');
    assert.deepEqual(await banner(), ['partial', 'Partial System Outage']);
    assert.equal(await page.textContent('#status .sp-active[data-incident="new-1"] [data-f="title"]'), 'Uploads failing in us-east');
    assert.equal(await page.getAttribute('#status .sp-active[data-incident="new-1"]', 'data-impact'), 'major');
    assert.equal(await page.textContent('#incident-new-1 h1'), 'Uploads failing in us-east');
    assert.ok((await page.textContent('.toast-container'))!.includes('Incident created'));
  });

  await check('console: an update reaches the card and the report', async () => {
    await page.click('[data-sp-update="new-1"]');
    await page.check('#sp-u-status-identified');
    await page.fill('#sp-u-msg', 'A failed storage node; traffic is moving to healthy nodes.');
    await page.click('#sp-update button[type="submit"]');
    assert.equal(await page.textContent('#status .sp-active[data-incident="new-1"] .sp-update:first-child strong'), 'Identified');
    assert.equal(await page.textContent('#incident-new-1 .sp-update:first-child strong'), 'Identified');
    assert.equal(await page.textContent('.sp-admin-row[data-incident="new-1"] [data-f="status"]'), 'Identified');
  });

  await check('console: resolving restores the components and files the incident under past incidents', async () => {
    await page.click('[data-sp-update="new-1"]');
    await page.check('#sp-u-status-resolved');
    assert.equal(await shown('#sp-update .sp-resolve-note'), true);
    await page.fill('#sp-u-msg', 'Uploads work again.');
    await page.click('#sp-update button[type="submit"]');
    assert.equal(await page.$$eval('#status .sp-active[data-incident="new-1"]', (a) => a.length), 0);
    assert.equal(await level('storage'), 'operational');
    assert.deepEqual(await banner(), ['degraded', 'Degraded Performance']);
    assert.equal(await page.textContent('[data-sp-today] .sp-past [data-f="title"]'), 'Uploads failing in us-east');
    assert.equal(await page.$$eval('[data-sp-month-now] .sp-past[data-incident="new-1"]', (l) => l.length), 1);
    await page.click('[data-sp-resolve="i-api"]');
    assert.deepEqual(await banner(), ['operational', 'All Systems Operational']);
    assert.equal(await page.textContent('[data-sp-open-count]'), '0');
    await page.click('.sp-top .sp-brand');
    assert.equal(await shown('[data-sp-active-section]'), false, 'no active incident, no section');
  });

  await check('narrow: 30 days of bars, nothing wider than the screen', async () => {
    await page.setViewportSize({ width: 420, height: 860 });
    await page.waitForTimeout(300);
    assert.equal(await page.$$eval('[data-bars="rest"] i', (i) => i.filter((x) => x.checkVisibility()).length), 30);
    const over = await page.$eval('.sp-scroll', (s) => s.scrollWidth - s.clientWidth);
    assert.ok(over <= 0, `overflows by ${over}px`);
  });

  await check('no script errors along the way', async () => {
    assert.deepEqual(errors, []);
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`scaffold-status-page.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('scaffold-status-page.e2e: all checks passed');
