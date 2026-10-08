import assert from 'node:assert/strict';
import { firefox, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: the windowed components (data grid, virtual list, data tree) recycle a
 * small pool of rows and move it inside a tall sizer. Firefox anchors scrolling
 * to a node by default (CSS scroll anchoring): when a render moved the pool, it
 * shifted scrollTop to keep its anchor row still, which fired the next scroll
 * event, the next render and the next shift - after a scroll to the middle and
 * back up, the grid and the list kept scrolling by themselves.
 * VERIFIED: (Firefox 155, 2026-10-08) idle drift of 25,920 px (grid) and
 * 88,042 px (list) in 3 s, 0 px with overflow-anchor: none.
 * The bug needs Firefox as a Mac runs it - a 2x display, smooth and async
 * (APZ) scrolling, small trackpad-like wheel steps; at 1x without smooth
 * scrolling it does not appear. So does this test.
 */

const CASES = [
  { name: 'data grid', fixture: '/tests/e2e/data-grid.e2e-fixture.html', scroller: '#dg-orders .data-grid-viewport', row: '.data-grid-row' },
  { name: 'virtual list', fixture: '/tests/e2e/virtual-list.e2e-fixture.html', scroller: '#vl-huge', row: '.virtual-list-row' },
  { name: 'data tree', fixture: '/tests/e2e/data-tree.e2e-fixture.html', scroller: '#dt-big', row: '.data-tree-item' },
];

const server = startServer();
const browser = await firefox.launch({
  timeout: 15_000,
  firefoxUserPrefs: { 'general.smoothScroll': true, 'layers.async-pan-zoom.enabled': true, 'apz.wr.activate_all_scroll_frames': true },
});
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

/** rows the viewport actually shows (below a sticky head, if any) */
const visibleRows = (page: Page, scroller: string, row: string) =>
  page.locator(scroller).evaluate((v, sel) => {
    const r = v.getBoundingClientRect();
    return [...v.querySelectorAll(sel)].filter((el) => {
      const b = el.getBoundingClientRect();
      return b.height > 0 && b.bottom > r.top + 40 && b.top < r.bottom;
    }).length;
  }, row);

try {
  for (const c of CASES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    page.on('pageerror', (e) => {
      failures++;
      console.error(`  ✗ ${c.name}: page error: ${e.message}`);
    });
    await page.goto(`${server.url}${c.fixture}`);
    await page.waitForFunction((s) => document.querySelectorAll(`${s.scroller} ${s.row}`).length > 3, c, { timeout: 15_000 });
    const vp = page.locator(c.scroller);

    await check(`${c.name}: the scroll container opts out of scroll anchoring (overflow-anchor: none)`, async () => {
      assert.equal(await vp.evaluate((v) => getComputedStyle(v).overflowAnchor), 'none');
    });

    await check(`${c.name}: scrolled to the middle and back up, it comes to rest and shows a full window of rows`, async () => {
      const box = (await vp.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 150));
      await vp.evaluate((v) => { v.scrollTop = v.scrollHeight / 2; }); // a scrollbar jump to the middle
      await page.waitForTimeout(400);
      for (let i = 0; i < 40; i++) {
        await page.mouse.wheel(0, -25); // trackpad-sized steps up
        await page.waitForTimeout(16);
      }
      await page.waitForTimeout(800); // the smooth-scroll tail
      const before = await vp.evaluate((v) => v.scrollTop);
      await page.waitForTimeout(2000);
      const after = await vp.evaluate((v) => v.scrollTop);
      assert.ok(Math.abs(after - before) < 2, `scrollTop moved ${Math.round(after - before)} px in 2 s without input`);
      const rows = await visibleRows(page, c.scroller, c.row);
      const expected = await vp.evaluate((v, sel) => {
        const h = v.querySelector(sel)?.getBoundingClientRect().height || 1;
        return Math.floor((v.clientHeight - 60) / h);
      }, c.row);
      assert.ok(rows >= expected, `${rows} rows visible, expected at least ${expected}`);
    });
    await page.close();
  }
} finally {
  await browser.close();
  server.stop?.();
}

if (failures) {
  console.error(`\nbig-data-firefox.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('big-data-firefox.e2e: all checks passed');
