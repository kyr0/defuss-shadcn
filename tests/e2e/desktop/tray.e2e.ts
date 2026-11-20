import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

/**
 * Why: the tray's clock is the runtime's and must read in the page's language; its show-desktop strip asks the
 * Window Manager of its taskbar; items open their popovers natively, carry badges and come and go through
 * df$.shadcn.tray. These checks drive the real dist/ files with a fixed clock.
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
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  page.on('pageerror', (e) => {
    failures++;
    console.error(`  ✗ page error: ${e.message}`);
  });
  await page.clock.install({ time: new Date('2026-11-20T14:05:09') });
  await page.goto(`${server.url}/tests/e2e/desktop/tray.e2e-fixture.html`);
  await page.waitForSelector('#tray1[data-init]');

  await check('the clock reads in the tray language: German time with seconds and the date; en-US plain', async () => {
    assert.equal(await page.textContent('#tray1 .tray-clock'), '14:05:09\n20.11.26');
    assert.equal(await page.textContent('#tray2 .tray-clock'), '2:05 PM');
    assert.match((await page.getAttribute('#tray1 .tray-clock', 'datetime'))!, /^2026-11-20T\d\d:05:09$/);
  });

  await check('the clock ticks on the full second', async () => {
    await page.clock.runFor(2000);
    assert.equal(await page.textContent('#tray1 .tray-clock'), '14:05:11\n20.11.26');
  });

  await check('an item opens its popover; a badge shows its text', async () => {
    await page.click('#tray-wifi');
    assert.equal(await page.$eval('#tray-net', (p) => p.matches(':popover-open')), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#tray-bell', (b) => getComputedStyle(b, '::after').content), '"3"');
  });

  await check('show desktop asks the taskbar\'s Window Manager', async () => {
    await page.click('#tray1 .tray-show-desktop');
    await page.clock.runFor(50);
    assert.equal(await page.getAttribute('#tray-win', 'data-minimized'), '');
    assert.equal(await page.getAttribute('#tray-desk', 'data-desktop-shown'), '');
    await page.click('#tray1 .tray-show-desktop');
    await page.clock.runFor(50);
    assert.equal(await page.getAttribute('#tray-win', 'data-minimized'), null);
  });

  await check('df$.shadcn.tray adds, badges and removes items (before the clock)', async () => {
    await page.evaluate(() =>
      (globalThis as any).df$.shadcn.tray.add('tray1', { id: 'mail', icon: 'mail', label: 'Mail', badge: 2 }),
    );
    assert.deepEqual(
      await page.$$eval('#tray1 > *', (c) => c.map((x) => x.className)),
      ['tray-item', 'tray-item', 'tray-item', 'tray-clock', 'tray-show-desktop'],
    );
    assert.equal(await page.getAttribute('#tray1 [data-id="mail"]', 'data-badge'), '2');
    await page.evaluate(() =>
      (globalThis as any).df$.shadcn.tray.badge(document.querySelector('#tray1 [data-id="mail"]'), 0),
    );
    assert.equal(await page.getAttribute('#tray1 [data-id="mail"]', 'data-badge'), null);
    assert.equal(await page.evaluate(() => (globalThis as any).df$.shadcn.tray.remove('tray1', 'mail')), true);
    assert.equal(await page.$$eval('#tray1 [data-id="mail"]', (x) => x.length), 0);
  });

  await check('setState sets how the clock reads', async () => {
    await page.evaluate(() => (document.querySelector('#tray1') as any).api.setState('default', { seconds: false, date: false }));
    assert.equal(await page.textContent('#tray1 .tray-clock'), '14:05');
    const st = await page.evaluate(() => (document.querySelector('#tray1') as any).api.getState());
    assert.deepEqual(st.config, { seconds: false, date: false });
    await page.evaluate(() => (document.querySelector('#tray1') as any).api.setState('default', { seconds: true, date: true }));
  });

  await check('render() contract: the state', async () => {
    await assertRenderContract(page, '.tray[id]', ['default'], { runtimeOwned: '.tray-clock' });
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`tray.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('tray.e2e: all checks passed');
