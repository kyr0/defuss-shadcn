import assert from 'node:assert/strict';
import { firefox } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: every live docs example is a code-example card - a sandboxed srcdoc
 * iframe sized to its content, with drag handles that resize the preview. A
 * report from Firefox (2026-10-08): a card showed an error message and its
 * frame sometimes did not resize. These checks hold those behaviors in Firefox
 * as a Mac runs it (2x display, smooth and async scrolling), on the big-data
 * page whose grid the same report concerned: every card boots without an
 * error, its frame height settles, a scroll inside a card leaves both intact,
 * and a resize drag follows the pointer in over the preview and back out.
 * UNKNOWN: the reported error and failed resize were not reproduced in
 * headless Firefox 155 (2026-10-08); these checks pass there and guard the
 * behavior the report describes.
 */

const PAGE = '/dist/documentation/data-grid.html';
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

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => {
    failures++;
    console.error(`  ✗ page error: ${e.message}`);
  });
  await page.goto(`${server.url}${PAGE}`, { waitUntil: 'load' });

  /** every card: its frame height and the text of a shown error, if any */
  const cards = () => page.evaluate(() => [...document.querySelectorAll('.code-example')].map((c) => {
    const error = c.querySelector('.code-example-error') as HTMLElement | null;
    return {
      height: Math.round(c.querySelector('iframe')?.getBoundingClientRect().height ?? 0),
      error: error && !error.hidden ? (error.textContent ?? '').trim() : '',
    };
  }));

  await check('every card boots its preview without an error', async () => {
    // booted = the preview reported 'ready' and the card sized its frame: an unsized
    // frame stands at the UA default of 150px, which a bare height test took for booted
    // (under a full e2e run three cards were still at 150 when the settle check began)
    await page.waitForFunction(() => {
      const all = [...document.querySelectorAll<HTMLElement & { _ce?: { ready?: boolean } }>('.code-example')];
      return all.length > 0 && all.every((c) => c._ce?.ready === true && !!c.querySelector('iframe')?.style.height);
    }, null, { timeout: 30_000 });
    const shown = (await cards()).filter((c) => c.error);
    assert.equal(shown.length, 0, `errors: ${shown.map((c) => c.error).join(' | ')}`);
  });

  await check('every frame height settles (no resize loop)', async () => {
    await page.waitForTimeout(1000);
    const a = (await cards()).map((c) => c.height);
    await page.waitForTimeout(1500);
    const b = (await cards()).map((c) => c.height);
    assert.deepEqual(b, a, 'frame heights changed while nothing happened');
  });

  const frameEl = page.locator('.code-example iframe').first();
  await frameEl.scrollIntoViewIfNeeded();
  const frame = (await (await frameEl.elementHandle())!.contentFrame())!;

  await check('a scroll to the middle and back up inside a card leaves the card intact', async () => {
    const vp = frame.locator('.data-grid-viewport').first();
    await vp.waitFor({ timeout: 10_000 });
    const before = await frameEl.evaluate((f) => Math.round(f.getBoundingClientRect().height));
    const box = (await vp.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 150));
    await vp.evaluate((v) => { v.scrollTop = v.scrollHeight / 2; });
    await page.waitForTimeout(300);
    for (let i = 0; i < 40; i++) {
      await page.mouse.wheel(0, -25);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(800);
    const top = await vp.evaluate((v) => v.scrollTop);
    await page.waitForTimeout(1500);
    assert.ok(Math.abs((await vp.evaluate((v) => v.scrollTop)) - top) < 2, 'the grid kept scrolling without input');
    assert.equal(await frameEl.evaluate((f) => Math.round(f.getBoundingClientRect().height)), before, 'the frame height changed');
    assert.equal((await cards())[0].error, '', 'the card shows an error');
  });

  await check('a resize drag follows the pointer in over the preview and back out', async () => {
    const card = page.locator('.code-example').first();
    const resizer = card.locator('.code-example-resizer');
    const east = resizer.locator(':scope > .resizer-handle[data-handle="e"]');
    await east.waitFor({ timeout: 10_000 });
    const width = () => resizer.evaluate((r) => r.getBoundingClientRect().width);
    const hb = (await east.boundingBox())!;
    const x0 = hb.x + hb.width / 2;
    const y0 = hb.y + hb.height / 2;
    const w0 = await width();
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    for (const dx of [-60, -200, -320, -120, 0]) {
      await page.mouse.move(x0 + dx, y0, { steps: 6 });
      await page.waitForTimeout(60);
      const w = await width();
      assert.ok(Math.abs(w - (w0 + dx)) <= 2, `pointer moved ${dx} px, the preview is ${Math.round(w - w0)} px wider`);
    }
    await page.mouse.up();
    await page.waitForTimeout(150);
    assert.equal(await resizer.evaluate((r) => (r as HTMLElement).dataset.resizing ?? ''), '', 'the drag did not end on release');
    await page.mouse.move(x0 - 150, y0, { steps: 4 });
    assert.ok(Math.abs((await width()) - w0) <= 2, 'the preview kept resizing after the release');
  });
} finally {
  await browser.close();
  server.stop?.();
}

if (failures) {
  console.error(`\ncode-example-firefox.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('code-example-firefox.e2e: all checks passed');
