import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';
import { icbRect } from './lib/viewport.ts';

/**
 * Why: E2E smoke test for the shipped alert-dialog component. Loads the
 * fixture (trigger + destructive confirmation dialog, mirroring the doc page)
 * over HTTP in a real browser, then verifies the modal geometry, the
 * Escape/backdrop hardening that distinguishes alert dialogs, close-button
 * wiring, focus return, and the named State API — the same files consumers
 * copy from dist/, unmodified.
 */

const FIXTURE = '/tests/e2e/alert-dialog.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const isOpen = (page: Page) => page.$eval('#demo-alert-dialog-1', (el) => (el as HTMLDialogElement).open);
const setState = (page: Page, state: string) =>
  page.$eval('#demo-alert-dialog-1', (el, s) => (el as HTMLElement).api!.setState(s), state);

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
  const page = await browser.newPage();
  await page.goto(`${server.url}${FIXTURE}`);

  await check('alert-dialog.js initialized trigger + dialog (data-init)', async () => {
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-alert-dialog-trigger]:not([data-init])').length === 0 &&
        document.querySelectorAll('dialog.alert-dialog:not([data-init])').length === 0,
    );
  });

  await check('alert-dialog.css applied (centered modal, 28rem cap)', async () => {
    await page.click('[data-alert-dialog-trigger="demo-alert-dialog-1"]');
    await page.waitForFunction(() => (document.querySelector('#demo-alert-dialog-1') as HTMLDialogElement).open);
    // margin:auto centers within the fixed-element containing block, which the
    // scrollbar-gutter scroll lock shrinks by the classic scrollbar — measure
    // against the ICB sentinel, not innerWidth (see lib/viewport.ts).
    const geom = await page.evaluate((icb) => {
      const el = document.querySelector('#demo-alert-dialog-1') as HTMLDialogElement;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        position: cs.position,
        maxWidth: cs.maxWidth,
        role: el.getAttribute('role'),
        centered: Math.abs(r.x + r.width / 2 - icb.cx) < 2,
      };
    }, await page.evaluate(icbRect));
    assert.equal(geom.position, 'fixed');
    assert.equal(geom.maxWidth, '448px', 'max-width: 28rem');
    assert.equal(geom.role, 'alertdialog', 'alertdialog role present for AT');
    assert.ok(geom.centered, 'margin:auto centering');
  });

  await check('Escape is blocked (user must choose an action)', async () => {
    await page.keyboard.press('Escape');
    assert.equal(await isOpen(page), true, 'alert dialogs must not close on Escape');
  });

  await check('backdrop click does not close it', async () => {
    await page.mouse.click(2, 2); // corner = ::backdrop
    assert.equal(await isOpen(page), true, 'no backdrop dismiss');
  });

  await check('close button closes it and refocuses the trigger', async () => {
    await page.click('[data-alert-dialog-close]'); // first: Cancel
    assert.equal(await isOpen(page), false);
    await page.waitForTimeout(50);
    const focused = await page.evaluate(
      () => document.activeElement?.getAttribute('data-alert-dialog-trigger'),
    );
    assert.equal(focused, 'demo-alert-dialog-1', 'trigger must be refocused after close');
  });

  // -- Scroll lock (documented in skill Notes: page behind stays put) --------
  await check('page behind the modal stays put; position restored on close', async () => {
    // real user flow: trigger is clicked while visible, so the position it
    // leaves is the position close() must hand back (focus-restore then
    // needs no scroll — the lock means the page never moved in between)
    await page.click('[data-alert-dialog-trigger="demo-alert-dialog-1"]');
    await page.waitForFunction(() => (document.querySelector('#demo-alert-dialog-1') as HTMLDialogElement).open);
    const before = await page.evaluate(() => document.scrollingElement!.scrollTop);
    // wheel over the backdrop corner and over the (centered) dialog box
    await page.mouse.move(2, 2);
    await page.mouse.wheel(0, 500);
    await page.mouse.move(640, 300);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(100);
    const during = await page.evaluate(() => document.scrollingElement!.scrollTop);
    assert.equal(during, before, 'page must not scroll while the alert is modal');
    await page.click('[data-alert-dialog-close]'); // Cancel
    await page.waitForFunction(() => !(document.querySelector('#demo-alert-dialog-1') as HTMLDialogElement).open);
    await page.waitForTimeout(350); // exit transition (allow-discrete keeps it visible 200ms)
    const after = await page.evaluate(() => document.scrollingElement!.scrollTop);
    assert.equal(after, before, 'scroll position preserved after close');
    await page.mouse.move(640, 300);
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(100);
    const scrolled = await page.evaluate(() => document.scrollingElement!.scrollTop);
    assert.ok(scrolled > before, 'page is scrollable again after close');
  });

  // -- State API (AGENTS.md "State API") -------------------------------------
  await check("state API: setState('open') opens modally; getState reports it", async () => {
    const before = await page.$eval('#demo-alert-dialog-1', (el) => (el as HTMLElement).api!.getState());
    assert.equal(before.name, 'default');
    await setState(page, 'open');
    assert.equal(await isOpen(page), true);
    const state = await page.$eval('#demo-alert-dialog-1', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'open');
  });

  await check("state API: setState('default') closes it", async () => {
    await setState(page, 'default');
    assert.equal(await isOpen(page), false, 'back to default state = closed');
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#demo-alert-dialog-1') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  // -- Density: content padding 16/24/32px ----------------------------------
  await check('data-density scales .alert-dialog-content padding to 16/24/32px', async () => {
    const pads = await page.evaluate(() =>
      ['ad-den-compact', 'ad-den-comfortable', 'ad-den-spacious'].map((id) => {
        const d = document.getElementById(id) as HTMLDialogElement;
        d.showModal();
        const p = getComputedStyle(d.querySelector('.alert-dialog-content')!).padding;
        d.close();
        return p;
      }),
    );
    assert.deepEqual(pads, ['16px', '24px', '32px'], `density paddings, got ${pads.join(' / ')}`);
  });

  await check('state API: registry globals expose api + declared states (camelCase)', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.alertDialogApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.alertDialogStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#demo-alert-dialog-1'),
    }));
    assert.ok(reg.hasApi, 'df$.alertDialogApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'open']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nalert-dialog.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('alert-dialog.e2e: all checks passed');
