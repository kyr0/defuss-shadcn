import { chromium, type Page } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from '../server.ts';
import { DESKTOP_LOOKS } from '../../../src/documentation/lib/page-dirs.ts';

/**
 * Why: every Desktop look is a whole desktop a reader uses - the maintainer asked for looks that switch "like back in
 * Windows times" (2026-11-20). Each full-screen look page is driven end to end on the built site: it starts at the
 * logon screen, a sign-in shows the desktop, an icon opens its window with a taskbar button, Start opens the menu and a
 * pick opens a program, the taskbar button minimizes and restores, the rubber band selects icons, Log off locks again;
 * the look itself is checked by its title bar. The Desktop page's Look select switches the variant of one desktop.
 */

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
const full = (slug: string) => `${server.url}/dist/documentation/desktop/full-${slug}.html`;
const VARIANT: Record<string, string | null> = {
  'desktop-modern': null,
  'desktop-windows-7': 'win7',
  'desktop-windows-xp': 'winxp',
  'desktop-windows-98': 'win98',
  'desktop-windows-95': 'win95',
};

async function signIn(page: Page) {
  await page.click('.logon-user[data-user="aron"]');
  await page.waitForFunction(() => (document.activeElement as HTMLInputElement)?.type === 'password');
  await page.keyboard.type('anything');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.logon')!.hasAttribute('data-signed-in'));
}

try {
  for (const slug of DESKTOP_LOOKS) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(full(slug));
    await page.waitForSelector('.logon[data-init]', { state: 'attached' });
    const k = await page.$eval('.desktop', (d) => d.id.split('-')[0]);

    await check(`${slug}: the look, the logon first`, async () => {
      assert.equal(await page.getAttribute('.desktop', 'data-variant'), VARIANT[slug]);
      assert.equal(await page.isVisible('.logon'), true);
      const box = (await page.locator('.desktop').boundingBox())!;
      assert.ok(Math.abs(box.height - 760) < 2, `full height: ${box.height}`);
    });

    await check(`${slug}: sign in shows the desktop with the About window and its taskbar button`, async () => {
      await signIn(page);
      assert.equal(await page.isVisible('.logon'), false);
      assert.equal(await page.isVisible(`#${k}-about`), true);
      assert.equal(await page.$$eval('.taskbar-window', (b) => b.length), 1);
    });

    await check(`${slug}: double-clicking an icon opens its window`, async () => {
      await page.dblclick(`.desktop-icon[data-value="${k}-notepad"]`);
      await page.waitForFunction((id) => (document.querySelector(id) as HTMLDialogElement).open, `#${k}-notepad`);
      assert.equal(await page.getAttribute(`.taskbar-window[data-window="${k}-notepad"]`, 'aria-pressed'), 'true');
    });

    await check(`${slug}: Start opens the menu; a program from a folder opens`, async () => {
      await page.click('.start-button');
      await page.waitForFunction((id) => document.querySelector(id)!.matches(':popover-open'), `#${k}-start`);
      await page.hover(`[aria-controls="${k}-programs"]`);
      await page.hover(`[aria-controls="${k}-accessories"]`);
      await page.click(`#${k}-accessories [data-value="${k}-calculator"]`);
      await page.waitForFunction((id) => (document.querySelector(id) as HTMLDialogElement).open, `#${k}-calculator`);
      assert.equal(await page.$eval(`#${k}-start`, (m) => m.matches(':popover-open')), false);
    });

    await check(`${slug}: the calculator computes`, async () => {
      for (const c of ['7', '*', '6', '=']) await page.click(`#${k}-calculator [data-calc="${c}"]`);
      assert.equal(await page.textContent(`#${k}-calculator [data-calc-display]`), '42');
    });

    await check(`${slug}: the taskbar button minimizes the window in front and brings it back`, async () => {
      const b = `.taskbar-window[data-window="${k}-calculator"]`;
      await page.click(b);
      await page.waitForFunction((id) => document.querySelector(id)!.hasAttribute('data-minimized'), `#${k}-calculator`);
      assert.equal(await page.isVisible(`#${k}-calculator`), false);
      await page.click(b);
      await page.waitForFunction((id) => !document.querySelector(id)!.hasAttribute('data-minimized'), `#${k}-calculator`);
    });

    await check(`${slug}: the rubber band selects desktop icons`, async () => {
      for (const id of ['notepad', 'calculator', 'about']) await page.evaluate((i) => (document.getElementById(i) as HTMLDialogElement).close(), `${k}-${id}`);
      const m = (await page.locator(':scope .window-manager > .desktop-manager').boundingBox())!;
      const docs = (await page.locator(`.desktop-icon[data-value="${k}-documents"]`).boundingBox())!;
      await page.mouse.move(m.x + 300, m.y + 6);
      await page.mouse.down();
      await page.mouse.move(docs.x + docs.width / 2, docs.y + docs.height / 2, { steps: 8 });
      await page.mouse.up();
      const sel = await page.$$eval('.window-manager > .desktop-manager [aria-selected="true"]', (i) => i.map((x) => (x as HTMLElement).dataset.value));
      assert.deepEqual(sel, [`${k}-computer`, `${k}-documents`]);
    });

    await check(`${slug}: Log off locks the screen`, async () => {
      await page.keyboard.press('Control+Escape');
      await page.waitForFunction((id) => document.querySelector(id)!.matches(':popover-open'), `#${k}-start`);
      await page.click(`#${k}-start [data-value="logoff"]`);
      await page.waitForFunction(() => !document.querySelector('.logon')!.hasAttribute('data-signed-in'));
      assert.equal(await page.isVisible('.logon-users'), true);
    });

    await check(`${slug}: no page errors`, async () => {
      assert.deepEqual(errors, []);
    });
    await page.close();
  }

  await check('the look itself: title bar of each look differs', async () => {
    const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
    const bars: string[] = [];
    for (const slug of DESKTOP_LOOKS) {
      await page.goto(full(slug));
      await page.waitForSelector('.window[data-init]', { state: 'attached' });
      bars.push(await page.$eval('.window[open] > .window-titlebar', (t) => getComputedStyle(t).backgroundImage + getComputedStyle(t).backgroundColor));
    }
    assert.equal(new Set(bars).size, DESKTOP_LOOKS.length, bars.join('\n'));
    await page.close();
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`desktop-looks.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('desktop-looks.e2e: all checks passed');
