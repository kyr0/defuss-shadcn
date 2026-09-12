import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped context-menu component. Loads the
 * fixture (right-click trigger + menu popover, mirroring the doc page) over
 * HTTP in a real browser, then verifies the contextmenu open (pointer
 * positioning), item-click close, Escape close (with the named-state sync),
 * and the per-menu named State API ({ x, y } open preset) — the same files
 * consumers copy from dist/, unmodified.
 */

const FIXTURE = '/tests/e2e/context-menu.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const isOpen = (page: Page) => page.$eval('#demo-ctx', (el) => el.matches(':popover-open'));

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

  await check('context-menu.js initialized triggers (data-init)', async () => {
    await page.waitForFunction(() => document.querySelectorAll('[data-context-menu]:not([data-init])').length === 0);
  });

  await check('context-menu.css applied (popover surface + opacity transition)', async () => {
    const style = await page.$eval('#demo-ctx', (el) => {
      const cs = getComputedStyle(el);
      return { radius: cs.borderTopLeftRadius, bg: cs.backgroundColor };
    });
    assert.notEqual(style.radius, '0px', 'rounded menu');
    assert.notEqual(style.bg, 'rgba(0, 0, 0, 0)', 'opaque popover surface');
  });

  await check('menu opens only AFTER the right-button release (no light-dismiss on mouse-up)', async () => {
    // regression: opening during the hold made the platform light-dismiss the
    // auto popover the moment the button went up — the menu vanished on release
    // scoped to the original demo trigger — the density instances below add more
    const box = (await page.locator('[data-context-menu="demo-ctx"]').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down({ button: 'right' });
    await page.waitForTimeout(120);
    assert.equal(await isOpen(page), false, 'menu must NOT open while the button is held');
    await page.mouse.up({ button: 'right' });
    await page.waitForFunction(() => document.querySelector('#demo-ctx')!.matches(':popover-open'));
    assert.equal(await isOpen(page), true, 'menu survives the mouse-up');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#demo-ctx')!.matches(':popover-open'));
  });

  await check('right-click opens the menu at the pointer', async () => {
    await page.click('[data-context-menu="demo-ctx"]', { button: 'right' });
    await page.waitForFunction(() => document.querySelector('#demo-ctx')!.matches(':popover-open'));
    const pos = await page.$eval('#demo-ctx', (el) => ({
      top: el.style.top,
      left: el.style.left,
      position: el.style.position,
    }));
    assert.equal(pos.position, 'fixed', 'fixed-positioned at the pointer');
    assert.match(pos.top, /px$/, 'y coordinate set');
    assert.match(pos.left, /px$/, 'x coordinate set');
    const state = await page.$eval('#demo-ctx', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'open', 'right-click moved the named state');
  });

  await check('clicking a menu item runs it and closes the menu', async () => {
    await page.click('.context-menu-item');
    await page.waitForFunction(() => !document.querySelector('#demo-ctx')!.matches(':popover-open'));
    const state = await page.$eval('#demo-ctx', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'default', 'item click moved the state back');
  });

  await check('Escape closes and the toggle event keeps the state honest', async () => {
    await page.click('.context-menu-trigger', { button: 'right' });
    await page.waitForFunction(() => document.querySelector('#demo-ctx')!.matches(':popover-open'));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#demo-ctx')!.matches(':popover-open'));
    const state = await page.$eval('#demo-ctx', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'default', 'native light dismiss reflected in getState');
  });

  // -- State API (AGENTS.md "State API"), bound per menu popover --------------
  const setState = (page: Page, state: string, config?: Record<string, unknown>) =>
    page.$eval('#demo-ctx', (el, args) => (el as HTMLElement).api!.setState(args[0], args[1]), [
      state,
      config,
    ] as const);

  await check("state API: setState('open', { x, y }) shows the menu at the coordinates", async () => {
    await setState(page, 'open', { x: 120, y: 80 });
    // the deferred show waits out any running exit transition (≤500ms cap)
    await page.waitForFunction(() => document.querySelector('#demo-ctx')!.matches(':popover-open'));
    const pos = await page.$eval('#demo-ctx', (el) => ({ top: el.style.top, left: el.style.left }));
    assert.equal(pos.top, '80px');
    assert.equal(pos.left, '120px');
    const state = await page.$eval('#demo-ctx', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'open');
    assert.deepEqual({ x: state.config.x, y: state.config.y }, { x: 120, y: 80 });
  });

  await check("state API: setState('default') hides the menu", async () => {
    await setState(page, 'default');
    assert.equal(await isOpen(page), false);
  });

  await check("state API: open twice in a row (mid-exit) doesn't crash and re-opens", async () => {
    await setState(page, 'open', { x: 10, y: 10 });
    await setState(page, 'default');
    await setState(page, 'open', { x: 20, y: 20 }); // immediate re-show during exit
    await page.waitForFunction(() => document.querySelector('#demo-ctx')!.matches(':popover-open'));
    assert.equal(await isOpen(page), true);
    await setState(page, 'default');
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#demo-ctx') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: registry globals expose api + declared states (camelCase)', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis._defussShadcn?.contextMenuApi?.setState === 'function',
      states: globalThis._defussShadcn?.contextMenuStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#demo-ctx'),
    }));
    assert.ok(reg.hasApi, '_defussShadcn.contextMenuApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'open']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });

  await check('context-menu: density "compact" → padding-top 4px', async () => {
    const val = await page.$eval('#ctx-compact .context-menu-item', (el) => getComputedStyle(el).paddingTop);
    assert.equal(val, '4px');
  });

  await check('context-menu: density "comfortable" → padding-top 6px', async () => {
    const val = await page.$eval('#ctx-comfortable .context-menu-item', (el) => getComputedStyle(el).paddingTop);
    assert.equal(val, '6px');
  });

  await check('context-menu: density "spacious" → padding-top 8px', async () => {
    const val = await page.$eval('#ctx-spacious .context-menu-item', (el) => getComputedStyle(el).paddingTop);
    assert.equal(val, '8px');
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\ncontext-menu.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('context-menu.e2e: all checks passed');
