import assert from 'node:assert/strict';
import { chromium, type Frame, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';

/**
 * Why: the Desktop section's examples run in docs cards, where the component bundles install df$.shadcn.* after the
 * example's own markup. VERIFIED (2026-11-20, the maintainer): the Window Manager's first example called
 * df$.shadcn.windowManager at once, threw, and none of its buttons worked. Each component page's first example is
 * driven here as a reader would: it works, and its Look select gives the frame the period's look.
 */

const { url, stop } = startServer();
const browser = await chromium.launch();
let failed = 0;
async function check(label: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${label}\n    ${err instanceof Error ? err.message : err}`);
  }
}

/** the sandbox frame of the example labelled `label`, booted */
async function example(page: Page, label: string): Promise<Frame> {
  const card = page.locator('.code-example', { has: page.locator(`p:has-text("${label}")`) }).first();
  await card.scrollIntoViewIfNeeded();
  await page.waitForFunction(
    (l) =>
      [...document.querySelectorAll('.code-example')].some(
        (c) => c.querySelector('p')?.textContent?.endsWith(l) && (c as HTMLElement & { preview?: unknown }).preview,
      ),
    label,
    { timeout: 30_000 },
  );
  const frame = await (await card.locator('.code-example-frame').elementHandle())!.contentFrame();
  assert.ok(frame, `${label}: no preview frame`);
  await frame.waitForFunction(() => document.readyState === 'complete' && !!(globalThis as any).df$?.shadcn?.windowManager);
  return frame;
}
async function open(slug: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await offlineJsdelivr(page);
  await page.route('https://api.github.com/**', (r) => r.abort());
  await page.goto(`${url}/dist/documentation/desktop/${slug}.html`, { waitUntil: 'domcontentloaded' });
  return page;
}
/** picks a look in the example's Look select; the frame's .desktop takes it */
async function look(f: Frame, value: string, desk = '.desktop') {
  await f.selectOption('[data-look]', value);
  assert.equal(await f.getAttribute(desk, 'data-variant'), value || null);
}

try {
  await check('Window Manager: the model lists the windows; Open, Show desktop and a row button work; the Look select styles it', async () => {
    const page = await open('window-manager');
    const f = await example(page, "A desktop's model");
    const rows = () => f.$$eval('#wm-model li', (l) => l.map((x) => x.textContent!.trim()));
    assert.deepEqual(await rows(), ['Notes - default', 'Files - default, in front']);
    await f.click('#wm-open');
    await f.waitForFunction(() => document.querySelectorAll('#wm-model li').length === 3);
    assert.match((await rows())[2], /^Calculator - default, in front/);
    await f.click('#wm-show');
    await f.waitForFunction(() => [...document.querySelectorAll('#wm-model li')].every((l) => l.textContent!.includes('minimized')));
    await f.click('#wm-model li:first-child button');
    await f.waitForFunction(() => document.querySelector('#wm-model li')!.textContent!.includes('in front'));
    await look(f, 'win98');
    await page.close();
  });

  await check('Desktop Manager: a click selects an icon on the desktop frame; the look follows', async () => {
    const page = await open('desktop-manager');
    const f = await example(page, 'Select like a desktop');
    await f.click('#dm-demo .desktop-icon >> nth=0');
    assert.equal(await f.getAttribute('#dm-demo .desktop-icon >> nth=0', 'aria-selected'), 'true');
    await look(f, 'winxp');
    await page.close();
  });

  await check('Start Button and Start Menu: the button opens its menu above it in the frame; a pick names itself', async () => {
    const page = await open('start-menu');
    const f = await example(page, 'A start menu');
    await look(f, 'win98');
    await f.click('.start-button');
    await f.waitForFunction(() => document.querySelector('#sm-demo')!.matches(':popover-open'));
    await f.waitForTimeout(250); // the menu's entry transition
    const [b, m] = [(await f.locator('.start-button').boundingBox())!, (await f.locator('#sm-demo').boundingBox())!];
    assert.ok(m.y + m.height <= b.y + 1, 'the menu sits above the button, inside the frame');
    assert.ok(m.y >= 0, 'the frame has room for the menu');
    // the docs page's fixed header may lie over the top of the frame: the item is clicked from inside
    await f.$eval('#sm-demo [data-value="notes"]', (b) => (b as HTMLElement).click());
    await f.waitForFunction(() => document.querySelector('#sm-log')!.textContent === 'Picked: Notepad');
    await page.close();
    const p2 = await open('start-button');
    const g = await example(p2, 'In a taskbar, in every look');
    await look(g, 'winxp');
    await g.click('.start-button');
    await g.waitForFunction(() => document.querySelector('#sb-menu')!.matches(':popover-open'));
    // aria-expanded follows the toggle event, a task after the popover opened
    await g.waitForFunction(() => document.querySelector('.start-button')!.getAttribute('aria-expanded') === 'true');
    await p2.close();
  });

  await check('Taskbar, Tray and Logon: they work in their desktop frame, in a period look', async () => {
    const page = await open('taskbar');
    const f = await example(page, 'A desktop');
    await look(f, 'win95');
    assert.ok((await f.$$('.taskbar-window')).length >= 1, 'a button per open window');
    await page.close();
    const p2 = await open('tray');
    const g = await example(p2, 'Items, badge and clock');
    await look(g, 'win7');
    assert.match((await g.textContent('.tray-clock'))!, /\d{1,2}:\d{2}:\d{2}/);
    await p2.close();
    const p3 = await open('logon');
    const h = await example(p3, 'Sign in and lock');
    await look(h, 'winxp');
    await h.click('.logon-user[data-user="guest"]');
    await h.waitForFunction(() => document.querySelector('#logon-demo')!.hasAttribute('data-signed-in'));
    await p3.close();
  });
} finally {
  await browser.close();
  stop();
}

if (failed) {
  console.error(`desktop-docs.e2e: ${failed} check(s) failed`);
  process.exit(1);
}
console.log('desktop-docs.e2e: all checks passed');
