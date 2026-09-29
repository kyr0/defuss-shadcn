import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: indicator is CSS-only - the whole contract is where an item lands.
 * Every data-position is measured against the wrapped box (the item's
 * center sits on the anchor point), single words set one axis, the
 * responsive attribute switches at its breakpoint, start flips in RTL, and
 * the status dot's variants / sizes / animations apply (and stop under
 * reduced motion).
 */

const FIXTURE = '/tests/e2e/indicator.e2e-fixture.html';
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

/** where an item's center sits on its box: [h, v] in 0 / 0.5 / 1 */
const anchor = (page: Page, item: string, box: string) => page.evaluate(([i, b]) => {
  const r = document.getElementById(i)!.getBoundingClientRect();
  const x = document.getElementById(b)!.getBoundingClientRect();
  const round = (n: number) => Math.round(n * 2) / 2;
  return [round((r.left + r.width / 2 - x.left) / x.width), round((r.top + r.height / 2 - x.top) / x.height)];
}, [item, box]);

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${server.url}${FIXTURE}`);

  await check('all nine data-position values center the item on their anchor point', async () => {
    const want: Record<string, number[]> = {
      'top-start': [0, 0], 'top-center': [0.5, 0], 'top-end': [1, 0],
      'middle-start': [0, 0.5], 'middle-center': [0.5, 0.5], 'middle-end': [1, 0.5],
      'bottom-start': [0, 1], 'bottom-center': [0.5, 1], 'bottom-end': [1, 1],
    };
    for (const [p, w] of Object.entries(want)) assert.deepEqual(await anchor(page, `ind-${p}`, 'ind-box'), w, p);
  });

  await check('no data-position = top-end; a single word sets one axis', async () => {
    assert.deepEqual(await anchor(page, 'ind-default', 'ind-box'), [1, 0], 'default');
    assert.deepEqual(await anchor(page, 'ind-bottom', 'ind-box'), [1, 1], 'bottom = bottom-end');
    assert.deepEqual(await anchor(page, 'ind-center', 'ind-box'), [0.5, 0], 'center = top-center');
  });

  await check('responsive: data-position-md applies from 48rem up', async () => {
    assert.deepEqual(await anchor(page, 'ind-resp', 'ind-resp-box'), [1, 0], 'at 1280px: end');
    await page.setViewportSize({ width: 600, height: 900 });
    assert.deepEqual(await anchor(page, 'ind-resp', 'ind-resp-box'), [0, 0], 'at 600px: start');
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  await check('a wrapper given a width passes it on: a size container inside fills it', async () => {
    const w = await page.$eval('#ind-fill-box', (el) => Math.round(el.getBoundingClientRect().width));
    assert.equal(w, 300);
  });

  await check('data-inset pulls a corner item diagonally toward the center (8 / 12px), a centered item stays; RTL mirrors it', async () => {
    const r = await page.evaluate(() => {
      const c = (id: string) => { const b = document.getElementById(id)!.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; };
      const box = (id: string) => document.getElementById(id)!.parentElement!.querySelector('div')!.getBoundingClientRect();
      const rel = (id: string) => { const [x, y] = c(id); const b = box(id); return [Math.round(x - b.left), Math.round(y - b.top)]; };
      return { none: rel('ins-none'), md: rel('ins-md'), lg: rel('ins-lg'), center: rel('ins-center'), rtl: rel('ins-rtl') };
    });
    assert.deepEqual(r.none, [40, 0], 'no inset: on the corner');
    assert.deepEqual(r.md, [32, 8], 'data-inset: 8px in');
    assert.deepEqual(r.lg, [28, 12], 'data-inset="lg": 12px in');
    assert.deepEqual(r.center, [20, 20], 'middle-center: no pull');
    assert.deepEqual(r.rtl, [32, 8], 'RTL top-start = the right corner, pulled left + down');
  });

  await check('RTL: start is the right edge', async () => {
    assert.deepEqual(await anchor(page, 'ind-rtl', 'ind-rtl-box'), [1, 0]);
  });

  await check('items never take part in layout (absolute), the wrapper hugs its content', async () => {
    const r = await page.evaluate(() => ({
      pos: getComputedStyle(document.getElementById('ind-top-start')!).position,
      w: Math.round(document.getElementById('ind')!.getBoundingClientRect().width),
    }));
    assert.deepEqual(r, { pos: 'absolute', w: 200 });
  });

  await check('status dot: eight variants + the muted default are nine distinct colors', async () => {
    const colors = await page.evaluate(() => ['neutral', 'primary', 'secondary', 'accent', 'info', 'success', 'warning', 'destructive', 'default'].map((v) => getComputedStyle(document.getElementById(`dot-${v}`)!).backgroundColor));
    assert.equal(new Set(colors).size, 9, colors.join(' | '));
  });

  await check('status dot sizes xs..xl = 4 / 6 / 8 / 12 / 16px', async () => {
    const w = await page.evaluate(() => ['xs', 'sm', 'md', 'lg', 'xl'].map((z) => document.getElementById(`dot-${z}`)!.getBoundingClientRect().width));
    assert.deepEqual(w, [4, 6, 8, 12, 16]);
  });

  await check('animations: ping (a ::after ring), bounce, pulse; a pinned dot stays absolute and bounces by margin', async () => {
    const r = await page.evaluate(() => ({
      ping: getComputedStyle(document.getElementById('dot-ping')!, '::after').animationName,
      bounce: getComputedStyle(document.getElementById('dot-bounce')!).animationName,
      pulse: getComputedStyle(document.getElementById('dot-pulse')!).animationName,
      pinned: getComputedStyle(document.getElementById('dot-pinned')!).animationName,
      pinnedPos: getComputedStyle(document.getElementById('dot-pinned')!).position,
    }));
    assert.deepEqual(r, { ping: 'indicator-ping', bounce: 'indicator-bounce', pulse: 'indicator-pulse', pinned: 'indicator-bounce-margin', pinnedPos: 'absolute' });
  });

  await check('reduced motion: every animated dot stands still', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const r = await page.evaluate(() => [
      getComputedStyle(document.getElementById('dot-ping')!, '::after').animationName,
      getComputedStyle(document.getElementById('dot-bounce')!).animationName,
      getComputedStyle(document.getElementById('dot-pulse')!).animationName,
      getComputedStyle(document.getElementById('dot-pinned')!).animationName,
    ]);
    assert.deepEqual(r, ['none', 'none', 'none', 'none']);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nindicator.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('indicator.e2e: all checks passed');
