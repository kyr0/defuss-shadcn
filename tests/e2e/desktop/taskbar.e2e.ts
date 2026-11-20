import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

/**
 * Why: the taskbar's window buttons are the Window Manager's model. These checks drive the real dist/ files: one
 * button per open window in the manager's order, pressed for the window in front; a click minimizes the front
 * window and brings a minimized one back (which the bound manager hides from the desktop); closing removes the
 * button, a title change renames it; the Start Button opens its menu anchored to the bar; positions and centring;
 * arrows move between the buttons; the state and the render() contract.
 */

const server = startServer();
const browser = await chromium.launch();
let failures = 0;
const check = async (label: string, fn: () => Promise<void>): Promise<void> => {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${label}\n    ${err instanceof Error ? err.message : err}`);
  }
};

try {
  const page = await browser.newPage({ viewport: { width: 900, height: 800 } });
  page.on('pageerror', (e) => {
    failures++;
    console.error(`  ✗ page error: ${e.message}`);
  });
  await page.goto(`${server.url}/tests/e2e/desktop/taskbar.e2e-fixture.html`);
  await page.waitForSelector('#bar[data-init]');
  await page.waitForSelector('#bar .taskbar-window');
  const buttons = () =>
    page.$$eval('#bar .taskbar-window', (bs) =>
      bs.map((b) => [(b as HTMLElement).dataset.window, b.textContent?.trim(), b.getAttribute('aria-pressed')]),
    );

  await check('a button per open window, in order, the front one pressed', async () => {
    assert.deepEqual(await buttons(), [
      ['t-notes', 'Notes', 'false'],
      ['t-files', 'Files', 'true'],
    ]);
    assert.equal(await page.getAttribute('#desk', 'data-taskbar'), '', 'the manager knows its taskbar');
  });

  await check('a click on the front window minimizes it - it leaves the desktop for its button', async () => {
    await page.click('#bar [data-window="t-files"]');
    await page.waitForTimeout(80);
    assert.equal(await page.getAttribute('#t-files', 'data-minimized'), '');
    assert.equal(await page.$eval('#t-files', (w) => getComputedStyle(w).display), 'none');
    assert.equal(await page.getAttribute('#bar [data-window="t-files"]', 'data-minimized'), '');
    assert.equal(await page.getAttribute('#bar [data-window="t-files"]', 'aria-pressed'), 'false');
  });

  await check('a click on a minimized window brings it back to the front', async () => {
    await page.click('#bar [data-window="t-files"]');
    await page.waitForTimeout(80);
    assert.equal(await page.getAttribute('#t-files', 'data-minimized'), null);
    assert.equal(await page.getAttribute('#bar [data-window="t-files"]', 'aria-pressed'), 'true');
  });

  await check('a click on a window behind brings it to the front', async () => {
    await page.click('#bar [data-window="t-notes"]');
    await page.waitForTimeout(80);
    assert.equal(await page.getAttribute('#t-notes', 'data-active'), '');
    assert.equal(await page.getAttribute('#bar [data-window="t-notes"]', 'aria-pressed'), 'true');
  });

  await check('a renamed window renames its button; a closed one loses it', async () => {
    await page.evaluate(() => {
      document.querySelector('#t-notes .window-title')!.textContent = 'Notes - draft';
    });
    await page.waitForTimeout(80);
    assert.equal(await page.textContent('#bar [data-window="t-notes"] .taskbar-window-title'), 'Notes - draft');
    await page.click('#t-files .window-close');
    await page.waitForTimeout(80);
    assert.deepEqual((await buttons()).map((b) => b[0]), ['t-notes']);
  });

  await check('show desktop in the tray minimizes every window, a second press brings them back', async () => {
    await page.click('#bar .tray-show-desktop');
    await page.waitForTimeout(80);
    assert.equal(await page.getAttribute('#t-notes', 'data-minimized'), '');
    await page.click('#bar .tray-show-desktop');
    await page.waitForTimeout(80);
    assert.equal(await page.getAttribute('#t-notes', 'data-minimized'), null);
  });

  await check('the Start Button opens its menu right above it', async () => {
    await page.click('#bar .start-button');
    assert.equal(await page.$eval('#tb-start', (m) => m.matches(':popover-open')), true);
    // the toggle event (which sets aria-expanded) arrives a task after the click
    await page.waitForFunction(() => document.querySelector('#bar .start-button')!.getAttribute('aria-expanded') === 'true');
    const menu = (await page.locator('#tb-start').boundingBox())!;
    const btn = (await page.locator('#bar .start-button').boundingBox())!;
    assert.ok(Math.abs(menu.y + menu.height - btn.y) < 1, `menu bottom on the button: ${menu.y + menu.height} ~ ${btn.y}`);
    assert.ok(Math.abs(menu.x - btn.x) < 1, 'aligned with its start edge');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('#bar .start-button')!.getAttribute('aria-expanded') === 'false');
  });

  await check('arrows move between the window buttons', async () => {
    await page.evaluate(() => (globalThis as any).df$.shadcn.win.open('t-files'));
    await page.waitForTimeout(80);
    await page.focus('#bar [data-window="t-notes"]');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.window), 't-files');
    await page.keyboard.press('Home');
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.window), 't-notes');
  });

  await check('a bar on the left edge is a column beside the desktop; centred keeps the buttons together', async () => {
    assert.equal(await page.$eval('#bar2', (b) => getComputedStyle(b).flexDirection), 'column');
    const d = (await page.locator('#d2').boundingBox())!,
      b = (await page.locator('#bar2').boundingBox())!;
    assert.ok(Math.abs(b.x - d.x) < 1, 'at the left edge');
    assert.ok(b.height > b.width, 'a column');
  });

  await check('setState moves the bar; getState reads position and align', async () => {
    await page.evaluate(() => (document.querySelector('#bar') as any).api.setState('default', { position: 'top', align: 'center' }));
    assert.equal(await page.getAttribute('#bar', 'data-position'), 'top');
    const d = (await page.locator('#d1').boundingBox())!,
      b = (await page.locator('#bar').boundingBox())!;
    assert.ok(Math.abs(b.y - d.y) < 1, 'at the top of the desktop');
    const st = await page.evaluate(() => (document.querySelector('#bar') as any).api.getState());
    assert.deepEqual(st.config, { position: 'top', align: 'center' });
    await page.evaluate(() => (document.querySelector('#bar') as any).api.setState('default', { position: 'bottom', align: 'start' }));
    assert.equal(await page.getAttribute('#bar', 'data-position'), null);
    assert.equal(await page.evaluate(() => (globalThis as any).df$.shadcn.taskbar.manager('bar')?.id), 'desk');
  });

  await check('render() contract: the state', async () => {
    await assertRenderContract(page, '.taskbar[id]', ['default'], {
      runtimeOwned: '.taskbar-windows, .tray',
      runtimeAttrs: ['aria-expanded', 'style'],
    });
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`taskbar.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('taskbar.e2e: all checks passed');
