import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped command (palette) component. Loads the
 * fixture (trigger + palette, mirroring the doc page) over HTTP in a real
 * browser, then verifies trigger/shortcut opening, search filtering with
 * empty state, keyboard navigation (ArrowDown/Enter), item click dismissal,
 * and the named State API — the same files consumers copy from dist/,
 * unmodified.
 */

const FIXTURE = '/tests/e2e/command.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const isOpen = (page: Page) => page.$eval('#demo-cmd', (el) => (el as HTMLDialogElement).open);
const setState = (page: Page, state: string) =>
  page.$eval('#demo-cmd', (el, s) => (el as HTMLElement).api!.setState(s), state);
const visibleItems = (page: Page) =>
  page.$$eval('#demo-cmd .command-item:not([hidden])', (els) => els.map((el) => el.textContent!.trim()));

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

  await check('command.js initialized trigger + dialog (data-init)', async () => {
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-command-trigger]:not([data-init])').length === 0 &&
        document.querySelectorAll('dialog.command:not([data-init])').length === 0,
    );
  });

  await check('command.css applied (32rem modal)', async () => {
    await setState(page, 'open');
    const style = await page.$eval('#demo-cmd', (el) => getComputedStyle(el).maxWidth);
    assert.equal(style, '512px', 'max-width: 32rem');
    await setState(page, 'default');
  });

  await check('trigger opens with input focused', async () => {
    await page.click('[data-command-trigger="demo-cmd"]');
    assert.equal(await isOpen(page), true);
    const focused = await page.evaluate(() => document.activeElement?.className);
    assert.match(focused ?? '', /command-input/, 'search input must receive focus on open');
  });

  await check('typing filters items, groups and empty state', async () => {
    await page.keyboard.type('cal');
    assert.deepEqual(await visibleItems(page), ['Calendar', 'Calculator'], 'filter is substring-based');
    // regression: `.command-item { display: flex }` beat the UA [hidden] rule,
    // so filtered-out items stayed rendered; they must be display:none now
    const hiddenDisplay = await page.$eval('#demo-cmd .command-item[hidden]', (el) => getComputedStyle(el).display);
    assert.equal(hiddenDisplay, 'none', 'non-matching items must not render');
    await page.keyboard.type('xyz');
    assert.deepEqual(await visibleItems(page), [], 'no matches');
    const emptyHidden = await page.$eval('#demo-cmd .command-empty', (el) => (el as HTMLElement).hidden);
    assert.equal(emptyHidden, false, '.command-empty shows when nothing matches');
    // fill('') dispatches the input event the filter listens for
    await page.fill('#demo-cmd .command-input', '');
    assert.equal((await visibleItems(page)).length, 6, 'clearing restores all items');
  });

  await check('ArrowDown moves highlight; Enter activates and closes', async () => {
    const highlighted = () => page.$$eval('#demo-cmd .command-item[data-highlighted]', (els) => els.map((el) => el.textContent!.trim()));
    // filter() highlighted the first item already
    assert.deepEqual(await highlighted(), ['Calendar']);
    await page.keyboard.press('ArrowDown');
    assert.deepEqual(await highlighted(), ['Search Emoji']);
    await page.keyboard.press('Enter');
    assert.equal(await isOpen(page), false, 'activating an item closes the palette');
  });

  await check('Cmd/Ctrl+K toggles the palette', async () => {
    await page.keyboard.press('Control+k');
    assert.equal(await isOpen(page), true, 'Ctrl+K opens');
    await page.keyboard.press('Control+k');
    assert.equal(await isOpen(page), false, 'Ctrl+K closes again');
  });

  await check('item click closes the palette', async () => {
    await page.click('[data-command-trigger="demo-cmd"]');
    await page.click('#demo-cmd .command-item:has-text("Billing")');
    assert.equal(await isOpen(page), false);
  });

  // -- State API (AGENTS.md "State API") -------------------------------------
  await check("state API: setState('open') focuses input; getState reports", async () => {
    await setState(page, 'open');
    assert.equal(await isOpen(page), true);
    const focused = await page.evaluate(() => document.activeElement?.className);
    assert.match(focused ?? '', /command-input/);
    const state = await page.$eval('#demo-cmd', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'open');
  });

  await check("state API: setState('default') closes it", async () => {
    await setState(page, 'default');
    assert.equal(await isOpen(page), false);
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#demo-cmd') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis._defussShadcn?.commandApi?.setState === 'function',
      states: globalThis._defussShadcn?.commandStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#demo-cmd'),
    }));
    assert.ok(reg.hasApi, '_defussShadcn.commandApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'open']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });

  // -- Scroll lock (documented in skill Notes: page behind stays put) --------
  await check('page behind the modal palette stays put; position restored on close', async () => {
    await page.evaluate(() => window.scrollTo(0, 400));
    const before = await page.evaluate(() => document.scrollingElement!.scrollTop);
    assert.ok(before > 0, 'fixture page is scrollable');
    await setState(page, 'open');
    // wheel over the backdrop corner and over the palette (top: 15%)
    await page.mouse.move(2, 2);
    await page.mouse.wheel(0, 500);
    await page.mouse.move(640, 150);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(100);
    const during = await page.evaluate(() => document.scrollingElement!.scrollTop);
    assert.equal(during, before, 'page must not scroll while the palette is modal');
    await setState(page, 'default');
    const after = await page.evaluate(() => document.scrollingElement!.scrollTop);
    assert.equal(after, before, 'scroll position preserved after close');
    await page.evaluate(() => window.scrollTo(0, 0)); // leave a clean viewport
  });

  await check('command: density "compact" → padding-top 6px', async () => {
    const val = await page.$eval('#cmd-compact .command-item', (el) => getComputedStyle(el).paddingTop);
    assert.equal(val, '6px');
  });

  await check('command: density "comfortable" → padding-top 8px', async () => {
    const val = await page.$eval('#cmd-comfortable .command-item', (el) => getComputedStyle(el).paddingTop);
    assert.equal(val, '8px');
  });

  await check('command: density "spacious" → padding-top 10px', async () => {
    const val = await page.$eval('#cmd-spacious .command-item', (el) => getComputedStyle(el).paddingTop);
    assert.equal(val, '10px');
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\ncommand.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('command.e2e: all checks passed');
