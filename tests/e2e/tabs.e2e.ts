import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped tabs component. Loads the fixture
 * (pill + line variants, a disabled tab, mirroring the doc page) over HTTP in
 * a real browser, then verifies click activation, ARIA/panel wiring, keyboard
 * navigation (arrows skip disabled, Home/End), roving tabindex, and the
 * per-tab named State API - the same files consumers copy from dist/,
 * unmodified.
 */

const FIXTURE = '/tests/e2e/tabs.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const selected = (page: Page, id: string) =>
  page.$eval(`#${id}`, (el) => el.getAttribute('aria-selected'));
const panelHidden = (page: Page, id: string) =>
  page.$eval(`#${id}`, (el) => (el as HTMLElement).hidden);

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

  await check('tabs.js initialized tablists (data-init)', async () => {
    await page.waitForFunction(
      () => document.querySelectorAll('[role="tablist"]:not([data-init])').length === 0,
    );
  });

  await check('click activates a tab and swaps panels', async () => {
    await page.click('#tab-password');
    assert.equal(await selected(page, 'tab-password'), 'true');
    assert.equal(await selected(page, 'tab-account'), 'false', 'selection is exclusive');
    assert.equal(await panelHidden(page, 'panel-password'), false);
    assert.equal(await panelHidden(page, 'panel-account'), true);
  });

  await check('roving tabindex follows selection', async () => {
    const t = await page.$eval('#tab-password', (el) => el.getAttribute('tabindex'));
    assert.equal(t, null, 'selected tab is tabbable (tabindex removed)');
    const t2 = await page.$eval('#tab-account', (el) => el.getAttribute('tabindex'));
    assert.equal(t2, '-1', 'inactive tabs are -1');
  });

  await check('ArrowRight/ArrowLeft move selection; ArrowRight skips disabled', async () => {
    await page.focus('#line-tab-overview');
    await page.keyboard.press('ArrowRight'); // -> Reports (disabled) must be skipped
    assert.equal(await selected(page, 'line-tab-downloads'), 'true', 'disabled tab skipped');
    await page.keyboard.press('ArrowLeft'); // -> back to Overview
    assert.equal(await selected(page, 'line-tab-overview'), 'true');
  });

  await check('Home/End jump to first/last enabled tab', async () => {
    await page.focus('#line-tab-overview');
    await page.keyboard.press('End');
    assert.equal(await selected(page, 'line-tab-downloads'), 'true');
    await page.keyboard.press('Home');
    assert.equal(await selected(page, 'line-tab-overview'), 'true');
  });

  await check('line variant styles selection with an underline (tabs.css)', async () => {
    // the underline is a 2px border whose color flips transparent -> primary.
    // .tab-trigger has `transition: all 150ms` - the previous check just
    // toggled the selection via Home, so settle before reading the color
    // (measured mid-fade it's a blend, matching neither endpoint).
    await page.waitForTimeout(250);
    // the underline is a 2px border whose color flips transparent -> primary
    const [on, off] = await page.evaluate(() => {
      const pick = (id: string) => {
        const el = document.querySelector(id)!;
        const cs = getComputedStyle(el);
        return cs.borderBottomWidth + '|' + cs.borderBottomColor;
      };
      return [pick('#line-tab-overview'), pick('#line-tab-downloads')];
    });
    assert.match(on, /^2px/, 'selected tab has the 2px underline');
    assert.match(off, /^2px transparent|rgba\(0, 0, 0, 0\)/, 'unselected underline is transparent');
    assert.notEqual(on, off, 'selected line tab is visually distinct');
  });

  // -- State API (AGENTS.md "State API"), bound per tab ----------------------
  await check("state API: setState('active') selects the tab", async () => {
    await page.$eval('#tab-account', (el) => (el as HTMLElement).api!.setState('active'));
    assert.equal(await selected(page, 'tab-account'), 'true');
    const state = await page.$eval('#tab-account', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'active');
    const other = await page.$eval('#tab-password', (el) => (el as HTMLElement).api!.getState());
    assert.equal(other.name, 'default', 'exclusive: the sibling reports default');
  });

  await check("state API: setState('default') restores the authored selection", async () => {
    await page.$eval('#tab-account', (el) => (el as HTMLElement).api!.setState('default'));
    // authored selection for this tablist is Account
    assert.equal(await selected(page, 'tab-account'), 'true');
  });

  await check("state API: 'active' on a disabled tab is a no-op (cannot select)", async () => {
    await page.$eval('#line-tab-reports', (el) => (el as HTMLElement).api!.setState('active'));
    assert.equal(await selected(page, 'line-tab-reports'), 'false', 'disabled tab stays unselected');
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#tab-account') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.tabsApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.tabsStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#tab-account'),
    }));
    assert.ok(reg.hasApi, 'df$.tabsApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'active']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });

  await check('tabs: data-size="xs" → font-size 12px', async () => {
    const val = await page.$eval('#z-tabs-xs .tab-trigger', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '12px');
  });
  await check('tabs: data-size="sm" → font-size 13px', async () => {
    const val = await page.$eval('#z-tabs-sm .tab-trigger', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '13px');
  });
  await check('tabs: data-size="md" → font-size 14px', async () => {
    const val = await page.$eval('#z-tabs-md .tab-trigger', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '14px');
  });
  await check('tabs: data-size="lg" → font-size 16px', async () => {
    const val = await page.$eval('#z-tabs-lg .tab-trigger', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '16px');
  });
  await check('tabs: data-size="xl" → font-size 18px', async () => {
    const val = await page.$eval('#z-tabs-xl .tab-trigger', (el) => getComputedStyle(el).fontSize);
    assert.equal(val, '18px');
  });

} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\ntabs.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('tabs.e2e: all checks passed');
