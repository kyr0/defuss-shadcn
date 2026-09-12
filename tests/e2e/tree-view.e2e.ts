import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped tree-view component. Loads the fixture
 * (nested branches + leaves, mirroring the doc page) over HTTP in a real
 * browser, then verifies <details>-driven expand/collapse, the aria-expanded
 * sync, keyboard navigation (arrows, Right/Left open/close, Home/End), and
 * the per-branch named State API — the same files consumers copy from dist/,
 * unmodified.
 */

const FIXTURE = '/tests/e2e/tree-view.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const branchOpen = (page: Page, id: string) => page.$eval(`#${id}`, (el) => (el as HTMLDetailsElement).open);
/**
 * Why: checkVisibility() on content inside <details> can return the stale
 * ::details-content content-visibility for a frame after the open flip —
 * observable as a flake when 26 chromiums load at once. Poll with a short
 * bound: the assertion stays exact (visible must become `want`), the wait
 * just absorbs Chromium's invalidation latency.
 */
const leafVisible = (page: Page, want: boolean) =>
  page.waitForFunction(
    (v) => document.querySelector('#tv-demo .tree-leaf')!.checkVisibility() === v,
    want,
    { timeout: 2000 },
  );
const expandedOf = (page: Page, id: string) =>
  page.$eval(`#${id}`, (el) => el.closest('[role="treeitem"]')!.getAttribute('aria-expanded'));
const focusText = (page: Page) =>
  page.evaluate(() => document.activeElement?.textContent?.trim());

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

  await check('tree-view.js initialized the tree (data-init)', async () => {
    await page.waitForFunction(() => document.querySelectorAll('.tree[role="tree"]:not([data-init])').length === 0);
  });

  await check('tree-view.css applied (indent guide + trigger layout)', async () => {
    const style = await page.$eval('#tv-demo .tree-group', (el) => {
      const cs = getComputedStyle(el);
      return { padding: cs.paddingInlineStart, border: cs.borderInlineStartWidth };
    });
    assert.notEqual(style.padding, '0px', 'nested groups are indented');
  });

  await check('authored states respected: outer open, inner closed', async () => {
    assert.equal(await branchOpen(page, 'tv-src'), true);
    assert.equal(await branchOpen(page, 'tv-components'), false);
    assert.equal(await expandedOf(page, 'tv-src'), 'true');
    assert.equal(await expandedOf(page, 'tv-components'), 'false');
  });

  await check('leaf hidden inside the closed branch becomes visible on expand', async () => {
    await leafVisible(page, false); // hidden while its branch is closed
    await page.click('#tv-components > .tree-branch-trigger');
    // <details> fires `toggle` asynchronously — wait for the (slower) ARIA
    // sync rather than the synchronous `open` flip
    await page.waitForFunction(
      () =>
        document
          .querySelector('#tv-components')!
          .closest('[role="treeitem"]')!
          .getAttribute('aria-expanded') === 'true',
    );
    assert.equal(await branchOpen(page, 'tv-components'), true);
    await leafVisible(page, true);
  });

  await check('ArrowRight expands / ArrowLeft collapses the focused branch', async () => {
    await page.click('#tv-components > .tree-branch-trigger'); // collapse (native summary click)
    await page.waitForFunction(() => !(document.querySelector('#tv-components') as HTMLDetailsElement).open);
    await page.focus('#tv-components > .tree-branch-trigger');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => (document.querySelector('#tv-components') as HTMLDetailsElement).open);
    assert.equal(await branchOpen(page, 'tv-components'), true);
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(() => !(document.querySelector('#tv-components') as HTMLDetailsElement).open);
    assert.equal(await branchOpen(page, 'tv-components'), false);
  });

  await check('ArrowDown/ArrowUp move focus between visible items', async () => {
    await page.focus('#tv-src > .tree-branch-trigger');
    await page.keyboard.press('ArrowDown');
    assert.equal(await focusText(page), 'components');
    await page.keyboard.press('ArrowUp');
    assert.equal(await focusText(page), 'src');
  });

  await check('ArrowLeft collapses an open branch (and aria-expanded follows)', async () => {
    await page.focus('#tv-src > .tree-branch-trigger');
    await page.keyboard.press('ArrowLeft');
    // wait on the async toggle event's ARIA sync (implies the open flip)
    await page.waitForFunction(
      () =>
        document
          .querySelector('#tv-src')!
          .closest('[role="treeitem"]')!
          .getAttribute('aria-expanded') === 'false',
    );
    assert.equal(await branchOpen(page, 'tv-src'), false);
    assert.equal(await expandedOf(page, 'tv-src'), 'false');
    await page.keyboard.press('ArrowRight'); // restore for later checks
    await page.waitForFunction(
      () =>
        document
          .querySelector('#tv-src')!
          .closest('[role="treeitem"]')!
          .getAttribute('aria-expanded') === 'true',
    );
    assert.equal(await branchOpen(page, 'tv-src'), true);
  });

  await check('Home/End jump to first/last visible item', async () => {
    // focus the visible index.ts leaf (button.tsx/dialog.tsx sit in the closed branch)
    await page.evaluate(() => {
      const leaves = Array.from(document.querySelectorAll<HTMLElement>('#tv-demo .tree-leaf'));
      leaves.find((l) => l.checkVisibility())!.focus();
    });
    await page.keyboard.press('Home');
    assert.equal(await focusText(page), 'src');
    await page.keyboard.press('End');
    assert.equal(await focusText(page), 'index.ts', 'End lands on the last visible item');
  });

  // -- State API (AGENTS.md "State API"), bound per branch --------------------
  const setState = (page: Page, id: string, state: string) =>
    page.$eval(`#${id}`, (el, s) => (el as HTMLElement).api!.setState(s), state);

  await check("state API: setState('expanded') opens a closed branch", async () => {
    assert.equal(await branchOpen(page, 'tv-components'), false, 'starts closed (authored)');
    await setState(page, 'tv-components', 'expanded');
    await page.waitForFunction(() => (document.querySelector('#tv-components') as HTMLDetailsElement).open);
    // the toggle event lands async — wait for the ARIA sync before asserting
    await page.waitForFunction(
      () =>
        document
          .querySelector('#tv-components')!
          .closest('[role="treeitem"]')!
          .getAttribute('aria-expanded') === 'true',
    );
    assert.equal(await expandedOf(page, 'tv-components'), 'true', 'aria-expanded followed via toggle');
    const state = await page.$eval('#tv-components', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'expanded');
  });

  await check("state API: setState('default') restores the authored (closed) state", async () => {
    await setState(page, 'tv-components', 'default');
    assert.equal(await branchOpen(page, 'tv-components'), false, 'authored closed state restored');
  });

  await check("state API: getState reflects summary clicks (no setState involved)", async () => {
    await page.click('#tv-components > .tree-branch-trigger');
    const state = await page.$eval('#tv-components', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'expanded', 'toggle moved the named state');
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#tv-src') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: registry globals expose api + declared states (camelCase)', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis._defussShadcn?.treeViewApi?.setState === 'function',
      states: globalThis._defussShadcn?.treeViewStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#tv-src'),
    }));
    assert.ok(reg.hasApi, '_defussShadcn.treeViewApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'expanded']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });

  await check('tree-view: density "compact" → padding-top 2px', async () => {
    const val = await page.$eval('#tvd-compact .tree-leaf', (el) => getComputedStyle(el).paddingTop);
    assert.equal(val, '2px');
  });

  await check('tree-view: density "comfortable" → padding-top 4px', async () => {
    const val = await page.$eval('#tvd-comfortable .tree-leaf', (el) => getComputedStyle(el).paddingTop);
    assert.equal(val, '4px');
  });

  await check('tree-view: density "spacious" → padding-top 6px', async () => {
    const val = await page.$eval('#tvd-spacious .tree-leaf', (el) => getComputedStyle(el).paddingTop);
    assert.equal(val, '6px');
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\ntree-view.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('tree-view.e2e: all checks passed');
