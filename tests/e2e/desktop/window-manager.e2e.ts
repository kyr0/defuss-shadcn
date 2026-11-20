import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

/**
 * Why: the window manager is the model a taskbar renders - which windows are open, in what order, which is in
 * front. These checks drive real windows on the real dist/ files: the model and its change event follow opening,
 * closing, focusing, minimizing and renaming; toggle() is the taskbar rule; "show desktop" minimizes every window
 * and brings the same ones back; two managers on one page keep separate front windows; both states land.
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
  await page.goto(`${server.url}/tests/e2e/desktop/window-manager.e2e-fixture.html`);
  await page.waitForSelector('#wm1[data-init]');
  await page.waitForSelector('#w-notes[data-init]');
  // every change event the first manager sends, in order
  await page.evaluate(() => {
    (globalThis as any).changes = [];
    document.querySelector('#wm1')!.addEventListener('window-manager-change', (e) =>
      (globalThis as any).changes.push((e as CustomEvent).detail),
    );
  });
  const model = () => page.evaluate(() => (globalThis as any).df$.shadcn.windowManager.windows('#wm1'));
  const ids = async () => (await model()).map((w: any) => w.id);
  const last = () => page.evaluate(() => (globalThis as any).changes.at(-1));

  await check('the model: the open windows in their order, the last authored one in front', async () => {
    const m = await model();
    assert.deepEqual(m.map((w: any) => [w.id, w.title, w.icon, w.state, w.active]), [
      ['w-notes', 'Notes', 'notebook-pen', 'default', false],
      ['w-files', 'Files', 'folder', 'default', true],
    ]);
  });

  await check('opening a window adds it last; the change event carries the model and the front window', async () => {
    await page.evaluate(() => (globalThis as any).df$.shadcn.win.open('w-calc'));
    await page.waitForTimeout(50);
    assert.deepEqual(await ids(), ['w-notes', 'w-files', 'w-calc']);
    const e = await last();
    assert.equal(e.active, 'w-calc');
    assert.deepEqual(e.windows.map((w: any) => w.id), ['w-notes', 'w-files', 'w-calc']);
  });

  await check('a press brings a window to the front: the model follows', async () => {
    await page.click('#w-notes .window-body');
    await page.waitForTimeout(50);
    assert.equal((await last()).active, 'w-notes');
    assert.equal(await page.evaluate(() => (globalThis as any).df$.shadcn.windowManager.active('#wm1')?.id), 'w-notes');
  });

  await check('renaming a window (its title text) is a change', async () => {
    await page.evaluate(() => {
      document.querySelector('#w-files .window-title')!.textContent = 'Files - Documents';
    });
    await page.waitForTimeout(50);
    assert.equal((await last()).windows.find((w: any) => w.id === 'w-files').title, 'Files - Documents');
  });

  await check('toggle(): the window in front minimizes, a minimized one comes back, another comes to the front', async () => {
    const toggle = (id: string) => page.evaluate((i) => (globalThis as any).df$.shadcn.windowManager.toggle(i), id);
    assert.equal(await toggle('w-notes'), 'minimized');
    await page.waitForTimeout(50);
    assert.equal((await last()).windows.find((w: any) => w.id === 'w-notes').state, 'minimized');
    assert.equal(await toggle('w-files'), 'default');
    await page.waitForTimeout(50);
    assert.equal((await last()).active, 'w-files');
    assert.equal(await toggle('w-notes'), 'default');
    await page.waitForTimeout(50);
    assert.equal((await last()).active, 'w-notes');
  });

  await check('a maximized window minimized from the taskbar comes back maximized', async () => {
    await page.evaluate(() => (globalThis as any).df$.shadcn.win.maximize('w-calc'));
    const toggle = (id: string) => page.evaluate((i) => (globalThis as any).df$.shadcn.windowManager.toggle(i), id);
    assert.equal(await toggle('w-calc'), 'minimized');
    assert.equal(await toggle('w-calc'), 'maximized');
    await page.evaluate(() => (globalThis as any).df$.shadcn.win.restore('w-calc'));
  });

  await check('closing a window drops it from the model; reopened it goes last', async () => {
    await page.click('#w-notes .window-close');
    await page.waitForTimeout(80);
    assert.deepEqual(await ids(), ['w-files', 'w-calc']);
    await page.evaluate(() => (globalThis as any).df$.shadcn.win.open('w-notes'));
    await page.waitForTimeout(50);
    assert.deepEqual(await ids(), ['w-files', 'w-calc', 'w-notes']);
  });

  await check('each desktop keeps its own front window', async () => {
    await page.click('#w-other .window-body');
    await page.waitForTimeout(50);
    assert.equal(await page.getAttribute('#w-other', 'data-active'), '');
    assert.notEqual(await page.evaluate(() => (globalThis as any).df$.shadcn.windowManager.active('#wm1')?.id), undefined);
    assert.equal(await page.evaluate(() => (globalThis as any).df$.shadcn.windowManager.windows('#wm2').length), 1);
  });

  await check('show desktop: every window minimized, then the same ones back (setState desktop / default)', async () => {
    await page.evaluate(() => (globalThis as any).df$.shadcn.win.minimize('w-files'));
    const shown = await page.evaluate(() => (globalThis as any).df$.shadcn.windowManager.showDesktop('#wm1'));
    assert.equal(shown, true);
    assert.equal(await page.getAttribute('#wm1', 'data-desktop-shown'), '');
    assert.deepEqual((await model()).map((w: any) => w.state), ['minimized', 'minimized', 'minimized']);
    assert.equal(await page.evaluate(() => (document.querySelector('#wm1') as any).api.getState().name), 'desktop');
    await page.evaluate(() => (document.querySelector('#wm1') as any).api.setState('default'));
    // Files was minimized before: it stays minimized
    assert.deepEqual((await model()).map((w: any) => [w.id, w.state]), [
      ['w-files', 'minimized'],
      ['w-calc', 'default'],
      ['w-notes', 'default'],
    ]);
  });

  await check('a window that shows again ends the desktop state', async () => {
    await page.evaluate(() => (document.querySelector('#wm1') as any).api.setState('desktop'));
    await page.evaluate(() => (globalThis as any).df$.shadcn.windowManager.toggle('w-calc'));
    await page.waitForTimeout(80);
    assert.equal(await page.evaluate(() => (document.querySelector('#wm1') as any).api.getState().name), 'default');
  });

  await check('cascade and tile arrange this manager only', async () => {
    const other = await page.$eval('#w-other', (w) => (w as HTMLElement).style.getPropertyValue('--window-x'));
    await page.evaluate(() => (globalThis as any).df$.shadcn.windowManager.cascade('#wm1'));
    const xs = await page.$$eval('#wm1 .window[open]', (ws) => ws.map((w) => (w as HTMLElement).offsetLeft));
    assert.ok(new Set(xs).size === xs.length, 'stepped: ' + xs.join(' '));
    assert.equal(await page.$eval('#w-other', (w) => (w as HTMLElement).style.getPropertyValue('--window-x')), other);
  });

  await check('render() contract: both states', async () => {
    await assertRenderContract(page, '.window-manager[id]', ['default', 'desktop'], {
      runtimeOwned: '.window',
    });
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`window-manager.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('window-manager.e2e: all checks passed');
