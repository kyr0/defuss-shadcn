import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from './server.ts';

/**
 * Why: the issue-tracker scaffold is a clickdummy - its promise is that the
 * clicks work. This drives the generated full-screen page
 * (dist/documentation/app-issue-tracker.html, built from the scaffold page's
 * own example fence): list ⇄ board, scope chips, drag and drop, the context
 * menu, issue properties, comments, creating with C, J / K, the filter, the
 * ⌘K palette, the cycle stats, the inbox and the narrow layout - and that
 * one status change reaches the row, the card and the issue page alike.
 */
const PAGE = '/dist/documentation/app-issue-tracker.html';
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
  await page.goto(`${server.url}${PAGE}`);
  await page.waitForFunction(() => !!(globalThis as any).df$?.shadcn?.toast, undefined, { timeout: 10_000 });
  const shown = (sel: string) => page.$eval(sel, (e) => e.checkVisibility());
  const views = () => page.evaluate(() => [...document.querySelectorAll('.pm-view')].filter((v) => getComputedStyle(v).display !== 'none').map((v) => v.id));
  const groupOf = (id: string) => page.$eval(`.pm-list [data-issue="${id}"]`, (r) => (r.closest('.pm-group') as HTMLElement).dataset.status);
  const columnOf = (id: string) => page.$eval(`.pm-board [data-issue="${id}"]`, (r) => (r.closest('.pm-col') as HTMLElement).dataset.status);
  const count = (s: string) => page.$eval(`.pm-group[data-status="${s}"] .pm-count`, (c) => c.textContent);
  const statusEverywhere = (id: string) => page.$$eval(`[data-issue="${id}"]`, (els) => [...new Set(els.map((e) => (e as HTMLElement).dataset.status))]);

  await check('opens on the issues list, grouped by status; Issues is current', async () => {
    assert.deepEqual(await views(), ['issues']);
    assert.deepEqual(await page.$$eval('.pm-group', (g) => g.map((x) => (x as HTMLElement).dataset.status)), ['review', 'progress', 'todo', 'backlog', 'done']);
    assert.deepEqual([await count('progress'), await count('todo')], ['3', '4']);
    assert.equal(await page.getAttribute('#pm-sidebar .sidebar-link[href="#issues"]:not([data-alias])', 'aria-current'), 'page');
  });

  await check('status and priority icons are drawn from the attributes (inherited custom properties)', async () => {
    const icon = (id: string) => page.$eval(`.pm-list [data-issue="${id}"] .pm-status`, (e) => getComputedStyle(e).borderTopStyle + ' ' + getComputedStyle(e, '::after').opacity);
    assert.equal(await icon('ENG-133'), 'dashed 0', 'backlog: dashed ring');
    assert.equal(await icon('ENG-130'), 'solid 1', 'done: the check');
    const urgent = await page.$eval('.pm-list [data-issue="ENG-142"] .pm-prio', (e) => getComputedStyle(e, '::after').opacity);
    assert.equal(urgent, '1');
  });

  await check('the scope chips filter the groups (CSS :has)', async () => {
    await page.click('.pm-scope label:has(input[value="active"])');
    assert.deepEqual([await shown('.pm-group[data-status="backlog"]'), await shown('.pm-group[data-status="done"]'), await shown('.pm-group[data-status="todo"]')], [false, false, true]);
    await page.click('.pm-scope label:has(input[value="backlog"])');
    assert.deepEqual([await shown('.pm-group[data-status="backlog"]'), await shown('.pm-group[data-status="todo"]')], [true, false]);
    await page.click('.pm-scope label:has(input[value="all"])');
  });

  await check('the toggle group swaps the list for the board', async () => {
    await page.click('.pm-layout .toggle[value="board"]');
    assert.deepEqual([await shown('.pm-board'), await shown('.pm-list')], [true, false]);
    assert.equal(await page.$$eval('.pm-col', (c) => c.length), 5);
  });

  await check('dragging a card to another column changes its status everywhere', async () => {
    await page.dragAndDrop('.pm-board .pm-card[data-issue="ENG-137"]', '.pm-col[data-status="progress"] .pm-cards');
    assert.equal(await columnOf('ENG-137'), 'progress');
    assert.equal(await groupOf('ENG-137'), 'progress');
    assert.deepEqual(await statusEverywhere('ENG-137'), ['progress']);
    assert.equal(await page.$eval('#ENG-137 select[data-field="status"]', (s) => (s as HTMLSelectElement).value), 'progress');
    assert.equal(await page.$eval('.pm-col[data-status="progress"] .pm-count', (c) => c.textContent), '4');
    await page.click('.pm-layout .toggle[value="list"]');
  });

  await check('right-click a row → Done: it moves to Done and the cycle stats follow', async () => {
    await page.click('.pm-list .pm-row[data-issue="ENG-133"]', { button: 'right' });
    await page.waitForTimeout(150);
    assert.equal(await page.$eval('#pm-ctx', (m) => m.matches(':popover-open')), true);
    await page.click('#pm-ctx [data-set-status="done"]');
    assert.equal(await groupOf('ENG-133'), 'done');
    assert.equal(await count('done'), '4');
    assert.equal(await page.textContent('[data-pm-stat="done"]'), '4');
    assert.equal(await page.getAttribute('[data-pm-stat="ring"]', 'aria-valuenow'), '27');
  });

  await check('an issue page edits priority and assignee; the row and the activity follow', async () => {
    await page.click('.pm-list .pm-row-link[href="#ENG-136"]');
    await page.waitForTimeout(150);
    assert.deepEqual(await views(), ['ENG-136']);
    await page.selectOption('#ENG-136 select[data-field="priority"]', 'urgent');
    assert.equal(await page.getAttribute('.pm-list [data-issue="ENG-136"]', 'data-priority'), 'urgent');
    await page.selectOption('#ENG-136 select[data-field="assignee"]', 'hannah');
    assert.equal(await page.getAttribute('.pm-list [data-issue="ENG-136"] .pm-assignee img', 'alt'), 'Hannah Lee');
    const feed = await page.$$eval('#ENG-136 .pm-event', (e) => e.map((x) => x.textContent!.replace(/\s+/g, ' ').trim()));
    assert.ok(feed.some((t) => t.includes('set priority to Urgent')), feed.join(' | '));
    assert.ok(feed.some((t) => t.includes('assigned to Hannah Lee')), feed.join(' | '));
  });

  await check('a comment is added to the activity', async () => {
    await page.fill('#ENG-136 [data-pm-comment] textarea', 'On it after lunch');
    await page.click('#ENG-136 [data-pm-comment] button[type="submit"]');
    assert.equal(await page.$eval('#ENG-136 .pm-feed .pm-comment:last-child p:last-child', (p) => p.textContent), 'On it after lunch');
  });

  await check('Esc leaves the issue; sub-issue checkboxes count', async () => {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    assert.deepEqual(await views(), ['issues']);
    await page.goto(`${server.url}${PAGE}#ENG-142`);
    await page.check('#ENG-142 .pm-sub input >> nth=1');
    assert.equal(await page.textContent('#ENG-142 [data-pm-sub-count]'), '2/3');
  });

  await check('C opens the create dialog; the new issue lands in the list, the board and its own page', async () => {
    await page.goto(`${server.url}${PAGE}#issues`);
    await page.waitForTimeout(150);
    await page.keyboard.press('c');
    assert.equal(await page.$eval('#pm-create', (d) => (d as HTMLDialogElement).open), true);
    await page.fill('#pm-new-title', 'Changelog in dark mode');
    await page.selectOption('#pm-create select[name="status"]', 'progress');
    await page.selectOption('#pm-create select[name="assignee"]', 'aron');
    await page.selectOption('#pm-create select[name="label"]', 'design');
    await page.click('#pm-create button[type="submit"]');
    assert.equal(await page.$eval('#pm-create', (d) => (d as HTMLDialogElement).open), false);
    assert.equal(await groupOf('ENG-143'), 'progress');
    assert.equal(await columnOf('ENG-143'), 'progress');
    assert.equal(await page.textContent('.pm-list [data-issue="ENG-143"] .pm-title'), 'Changelog in dark mode');
    assert.equal(await page.textContent('.pm-list [data-issue="ENG-143"] .pm-label'), 'Design');
    assert.ok((await page.textContent('.toast-container .toast'))!.includes('ENG-143 created'));
    await page.click('.pm-list .pm-row-link[href="#ENG-143"]');
    await page.waitForTimeout(150);
    assert.deepEqual(await views(), ['ENG-143']);
    assert.equal(await page.textContent('#ENG-143 .pm-issue-title'), 'Changelog in dark mode');
    assert.equal(await page.$eval('#ENG-143 select[data-field="status"]', (s) => (s as HTMLSelectElement).value), 'progress');
  });

  await check('My issues lists your issues, including the new one', async () => {
    await page.click('#pm-sidebar .sidebar-link[href="#my-issues"]');
    await page.waitForTimeout(150);
    const ids = await page.$$eval('[data-pm-mine] [data-issue]', (r) => r.map((x) => (x as HTMLElement).dataset.issue));
    assert.ok(ids.includes('ENG-143') && ids.includes('ENG-142') && !ids.includes('ENG-136'), ids.join());
  });

  await check('J / K move through the issues', async () => {
    await page.click('#pm-sidebar .sidebar-link[href="#issues"]:not([data-alias])');
    await page.waitForTimeout(150);
    await page.keyboard.press('j');
    await page.keyboard.press('j');
    const at = await page.evaluate(() => document.activeElement!.getAttribute('href'));
    const second = await page.$$eval('.pm-list .pm-row-link', (a) => a[1].getAttribute('href'));
    assert.equal(at, second);
    await page.keyboard.press('k');
    assert.equal(await page.evaluate(() => document.activeElement!.getAttribute('href')), await page.$$eval('.pm-list .pm-row-link', (a) => a[0].getAttribute('href')));
  });

  await check('the filter narrows the rows', async () => {
    await page.fill('[data-pm-filter]', 'slack');
    const visible = await page.$$eval('.pm-list .pm-row', (r) => r.filter((x) => x.checkVisibility()).map((x) => (x as HTMLElement).dataset.issue));
    assert.deepEqual(visible, ['ENG-135']);
    await page.fill('[data-pm-filter]', '');
  });

  await check('⌘K opens the palette; an item jumps to the cycle', async () => {
    await page.keyboard.press('Meta+k');
    assert.equal(await page.$eval('#pm-cmd', (d) => (d as HTMLDialogElement).open), true);
    await page.click('#pm-cmd .command-item[data-go="cycles"]');
    await page.waitForTimeout(150);
    assert.deepEqual(await views(), ['cycles']);
    assert.equal(await page.textContent('[data-pm-stat="scope"]'), '16');
  });

  await check('the inbox: Mark all read clears the badge', async () => {
    await page.click('#pm-sidebar .sidebar-link[href="#inbox"]');
    assert.equal(await page.textContent('#pm-sidebar [data-pm-unread]'), '4');
    await page.click('[data-pm-read-all]');
    assert.equal(await page.$$eval('.pm-note[data-unread]', (n) => n.length), 0);
    assert.equal(await page.$eval('#pm-sidebar [data-pm-unread]', (b) => (b as HTMLElement).hidden), true);
  });

  await check('narrow: the sidebar becomes a drawer, the issue page stacks its properties first', async () => {
    await page.setViewportSize({ width: 420, height: 860 });
    await page.goto(`${server.url}${PAGE}#ENG-141`);
    await page.waitForTimeout(200);
    assert.deepEqual([await shown('#pm-sidebar'), await shown('#ENG-141 .pm-mobile-trigger')], [false, true]);
    const order = await page.evaluate(() => {
      const p = document.querySelector('#ENG-141 .pm-props')!.getBoundingClientRect(), m = document.querySelector('#ENG-141 .pm-issue-title')!.getBoundingClientRect();
      return p.height > 100 && p.bottom <= m.top;
    });
    assert.equal(order, true);
    await page.click('#ENG-141 .pm-mobile-trigger');
    assert.equal(await page.$eval('#pm-mobile-nav', (d) => (d as HTMLDialogElement).open), true);
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`scaffold-issue-tracker.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('scaffold-issue-tracker.e2e: all checks passed');
