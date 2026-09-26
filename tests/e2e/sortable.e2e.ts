import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped sortable component. Loads the fixture
 * (vertical list + horizontal list with a locked item, mirroring the doc
 * page) over HTTP in a real browser, then verifies roving focus, Alt+Arrow
 * reordering, the live-region announcements, the change event, locked items,
 * and the named State API (order restore + live order/activeIndex) - the same
 * files consumers copy from dist/, unmodified.
 */

const FIXTURE = '/tests/e2e/sortable.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const order = (page: Page, id: string) =>
  page.$$eval(`#${id} .sortable-item`, (els) =>
    els.map((el) => el.querySelector('span:not(.sortable-handle)')!.textContent!.trim()),
  );
const focusLabel = (page: Page) =>
  page.evaluate(() => document.activeElement?.querySelector('span:last-child')?.textContent?.trim());

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

  await check('sortable.js initialized lists + live region (data-init)', async () => {
    await page.waitForFunction(
      () => document.querySelectorAll('.sortable:not([data-init])').length === 0,
    );
    // count against the live DOM (the density instances add lists)
    const live = await page.$$eval('.sortable-live', (els) => ({
      count: els.length,
      lists: document.querySelectorAll('.sortable').length,
      allAssertive: els.every((el) => el.getAttribute('aria-live') === 'assertive'),
    }));
    assert.equal(live.count, live.lists, 'one live region per list');
    assert.ok(live.allAssertive, 'every live region is assertive');
  });

  await check('roving tabindex: first item tabbable', async () => {
    const t = await page.$$eval('#sb-vertical .sortable-item', (els) =>
      els.map((el) => el.getAttribute('tabindex')),
    );
    assert.deepEqual(t, ['0', '-1', '-1']);
  });

  await check('ArrowDown moves the active item; Home/End jump', async () => {
    await page.focus('#sb-vertical .sortable-item:nth-child(1)');
    await page.keyboard.press('ArrowDown');
    assert.equal(await focusLabel(page), 'Write documentation');
    await page.keyboard.press('End');
    assert.equal(await focusLabel(page), 'Deploy to production');
    await page.keyboard.press('Home');
    assert.equal(await focusLabel(page), 'Build components');
  });

  await check('Alt+ArrowDown reorders the item and announces the move', async () => {
    await page.focus('#sb-vertical .sortable-item:nth-child(1)');
    await page.keyboard.press('Alt+ArrowDown');
    assert.deepEqual(await order(page, 'sb-vertical'), [
      'Write documentation',
      'Build components',
      'Deploy to production',
    ]);
    // live region announces asynchronously (double rAF in the component)
    await page.waitForFunction(
      () => document.querySelector('.sortable-live')!.textContent!.includes('position 2'),
    );
    const text = await page.$eval('.sortable-live', (el) => el.textContent);
    assert.match(text!, /Build components, moved to position 2 of 3/);
  });

  await check('reorder dispatches sortable-change (order-independent)', async () => {
    // whatever the current order, Alt+ArrowDown moves the active item one down
    const before = await order(page, 'sb-vertical');
    const detail = await page.evaluate(
      () =>
        new Promise<{ index: number; label: string }>((resolve) => {
          document.querySelector('#sb-vertical')!.addEventListener(
            'sortable-change',
            (e) => {
              const d = e as CustomEvent;
              const src = (d.detail.item ?? document.activeElement) as HTMLElement;
              resolve({
                index: d.detail.index,
                label: src.querySelector('span:last-child')?.textContent?.trim() ?? '',
              });
            },
            { once: true },
          );
          const target = document.querySelector('#sb-vertical [data-active]') as HTMLElement;
          target.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }),
          );
        }),
    );
    const after = await order(page, 'sb-vertical');
    assert.notDeepEqual(after, before, 'the list actually changed');
    assert.equal(after[detail.index], detail.label, 'event reports the moved item at its new index');
  });

  await check('Alt+Arrow reverts on the locked item (keyboard skips it)', async () => {
    // horizontal list: focus beta (index 1), Alt+Right would swap with locked
    await page.focus('#sb-horizontal .sortable-item:nth-child(2)');
    await page.keyboard.press('Alt+ArrowRight');
    assert.deepEqual(await order(page, 'sb-horizontal'), ['alpha', 'beta', 'locked'], 'locked stays last');
    // plain arrow also skips it
    await page.keyboard.press('ArrowRight');
    assert.equal(await focusLabel(page), 'beta', 'ArrowRight stops before the locked item');
    await page.focus('#sb-horizontal .sortable-item:nth-child(1)');
    await page.keyboard.press('End');
    assert.equal(await focusLabel(page), 'beta', 'End lands on the last *enabled* item');
    assert.equal(
      await page.$eval('#sb-horizontal .sortable-item:nth-child(3)', (el) => el.getAttribute('tabindex')),
      '-1',
      'locked item never gets the roving stop',
    );
  });

  await check('horizontal orientation uses Left/Right', async () => {
    await page.focus('#sb-horizontal .sortable-item:nth-child(1)');
    await page.keyboard.press('ArrowRight');
    assert.equal(await focusLabel(page), 'beta');
  });

  // -- State API (AGENTS.md "State API") -------------------------------------
  await check("state API: setState('default') restores the authored order", async () => {
    await page.$eval('#sb-vertical', (el) => (el as HTMLElement).api!.setState('default'));
    assert.deepEqual(await order(page, 'sb-vertical'), [
      'Build components',
      'Write documentation',
      'Deploy to production',
    ]);
  });

  await check("state API: { index } activates an item; getState reports it", async () => {
    await page.$eval('#sb-vertical', (el) =>
      (el as HTMLElement).api!.setState('default', { index: 2 }),
    );
    const state = await page.$eval('#sb-vertical', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'default');
    assert.equal(state.config.activeIndex, 2, 'active item tracked');
    assert.deepEqual(state.config.order, [
      'Build components',
      'Write documentation',
      'Deploy to production',
    ]);
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#sb-vertical') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.sortableApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.sortableStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#sb-vertical'),
    }));
    assert.ok(reg.hasApi, 'df$.sortableApi.setState missing');
    assert.deepEqual(reg.states, ['default']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });

  await check('sortable: density "compact" → padding-top 6px', async () => {
    const val = await page.$eval('#srt-compact .sortable-item', (el) => getComputedStyle(el).paddingTop);
    assert.equal(val, '6px');
  });

  await check('sortable: density "compact" → padding-left 8px', async () => {
    const val = await page.$eval('#srt-compact .sortable-item', (el) => getComputedStyle(el).paddingLeft);
    assert.equal(val, '8px');
  });

  await check('sortable: density "comfortable" → padding-top 8px', async () => {
    const val = await page.$eval('#srt-comfortable .sortable-item', (el) => getComputedStyle(el).paddingTop);
    assert.equal(val, '8px');
  });

  await check('sortable: density "comfortable" → padding-left 12px', async () => {
    const val = await page.$eval('#srt-comfortable .sortable-item', (el) => getComputedStyle(el).paddingLeft);
    assert.equal(val, '12px');
  });

  await check('sortable: density "spacious" → padding-top 10px', async () => {
    const val = await page.$eval('#srt-spacious .sortable-item', (el) => getComputedStyle(el).paddingTop);
    assert.equal(val, '10px');
  });

  await check('sortable: density "spacious" → padding-left 16px', async () => {
    const val = await page.$eval('#srt-spacious .sortable-item', (el) => getComputedStyle(el).paddingLeft);
    assert.equal(val, '16px');
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nsortable.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('sortable.e2e: all checks passed');
