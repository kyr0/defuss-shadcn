import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped toolbar component. Loads the fixture
 * (formatting toolbar with nested toggle groups, actions toolbar with a
 * disabled button, vertical toolbar - mirroring the doc page) over HTTP in a
 * real browser, then verifies the roving tabindex, arrow/Home/End movement,
 * disabled-item skipping, vertical orientation, and the named State API
 * (getState().config.rovingIndex) - the same files consumers copy from
 * dist/, unmodified.
 */

const FIXTURE = '/tests/e2e/toolbar.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const tabbables = (page: Page, id: string) =>
  page.$$eval(`#${id} button:not([disabled])`, (els) => els.map((el) => el.getAttribute('tabindex')));

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

  await check('toolbar.js initialized toolbars (data-init)', async () => {
    await page.waitForFunction(
      () => document.querySelectorAll('.toolbar[role="toolbar"]:not([data-init])').length === 0,
    );
  });

  await check('toolbar.css applied (bordered fit-content bar)', async () => {
    const style = await page.$eval('#tb-actions', (el) => {
      const cs = getComputedStyle(el);
      return { border: cs.borderTopWidth, radius: cs.borderTopLeftRadius };
    });
    assert.notEqual(style.border, '0px', 'bordered');
    assert.notEqual(style.radius, '0px', 'rounded');
  });

  await check('roving tabindex: first item tabbable, rest -1', async () => {
    const t = await tabbables(page, 'tb-actions');
    assert.equal(t[0], '0', 'first enabled item is the roving stop');
    assert.ok(t.slice(1).every((v) => v === '-1'), 'others are -1');
  });

  await check('ArrowRight/ArrowLeft move focus between items', async () => {
    await page.focus('#tb-actions button:nth-child(1)');
    await page.keyboard.press('ArrowRight');
    assert.equal(
      await page.evaluate(() => document.activeElement?.getAttribute('aria-label')),
      'Redo',
    );
    await page.keyboard.press('ArrowLeft');
    assert.equal(
      await page.evaluate(() => document.activeElement?.getAttribute('aria-label')),
      'Undo',
    );
  });

  await check('disabled items are skipped by arrows', async () => {
    // Redo -> next enabled is Paste (Copy is disabled)
    await page.focus('#tb-actions button:nth-child(2)');
    await page.keyboard.press('ArrowRight');
    assert.equal(
      await page.evaluate(() => document.activeElement?.getAttribute('aria-label')),
      'Paste',
      'disabled Copy skipped',
    );
  });

  await check('Home/End jump to first/last item', async () => {
    await page.keyboard.press('Home');
    assert.equal(
      await page.evaluate(() => document.activeElement?.getAttribute('aria-label')),
      'Undo',
    );
    await page.keyboard.press('End');
    assert.equal(
      await page.evaluate(() => document.activeElement?.getAttribute('aria-label')),
      'Paste',
    );
  });

  await check('vertical orientation uses ArrowDown/ArrowUp', async () => {
    await page.focus('#tb-vertical button:nth-child(1)');
    await page.keyboard.press('ArrowDown');
    assert.equal(
      await page.evaluate(() => document.activeElement?.getAttribute('aria-label')),
      'Down',
    );
  });

  // -- State API (AGENTS.md "State API") -------------------------------------
  const rovingIndex = (page: Page, id: string) =>
    page.$eval(`#${id}`, (el) => (el as HTMLElement).api!.getState().config.rovingIndex);

  await check('state API: getState reports the live rovingIndex', async () => {
    // enabled items: Undo(0) Redo(1) Paste(2) - Copy is skipped entirely
    assert.equal(await rovingIndex(page, 'tb-actions'), 2, 'roving stop followed the End key');
  });

  await check("state API: setState('default') restores the roving stop to item 0", async () => {
    await page.$eval('#tb-actions', (el) => (el as HTMLElement).api!.setState('default'));
    assert.equal(await rovingIndex(page, 'tb-actions'), 0);
    assert.equal(
      await page.$eval('#tb-actions button:nth-child(1)', (el) => el.getAttribute('tabindex')),
      '0',
    );
  });

  await check('state API: { focus: n } config parks the roving stop on item n', async () => {
    await page.$eval('#tb-actions', (el) =>
      (el as HTMLElement).api!.setState('default', { focus: 2 }),
    );
    assert.equal(await rovingIndex(page, 'tb-actions'), 2);
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#tb-actions') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  // -- Sizes: the toolbar chrome and its controls scale together -------------
  await check('data-size scales chrome padding + control heights (28/32/36/44/52px)', async () => {
    const rows = await page.evaluate(() =>
      ['tb-xs', 'tb-sm', 'tb-md', 'tb-lg', 'tb-xl'].map((id) => {
        const tb = document.getElementById(id)!;
        return [
          getComputedStyle(tb).paddingTop,
          Math.round(tb.querySelector('.btn')!.getBoundingClientRect().height),
        ] as [string, number];
      }),
    );
    const pads = rows.map((r) => r[0]).join('/');
    const heights = rows.map((r) => r[1]).join('/');
    assert.equal(pads, ['2px', '3px', '4px', '6px', '8px'].join('/'), `chrome paddings, got ${pads}`);
    assert.equal(heights, [28, 32, 36, 44, 52].join('/'), `control heights, got ${heights}`);
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.toolbarApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.toolbarStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#tb-actions'),
    }));
    assert.ok(reg.hasApi, 'df$.toolbarApi.setState missing');
    assert.deepEqual(reg.states, ['default']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\ntoolbar.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('toolbar.e2e: all checks passed');
