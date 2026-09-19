import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped image component. Loads the fixture
 * (loaded image, broken image with fallback, ratio + caption, preview
 * figure — mirroring the doc page) over HTTP in a real browser, then
 * verifies the fallback logic for real network failures, ratio CSS, the
 * lightbox (open + toolbar transforms + close), and the per-figure named
 * State API — the same files consumers copy from dist/, unmodified.
 */

const FIXTURE = '/tests/e2e/image.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const fallbackShown = (page: Page, id: string) =>
  page.$eval(`#${id} .image-fallback`, (el) => getComputedStyle(el).display !== 'none');

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
  // deterministic network failure: abort .invalid-host requests instead of
  // waiting on real DNS (slow/flaky when 26 chromiums run in parallel)
  await page.route((url) => url.hostname.endsWith('.invalid'), (route) => route.abort('failed'));
  await page.goto(`${server.url}${FIXTURE}`);

  await check('image.js initialized figures (data-init)', async () => {
    await page.waitForFunction(() => document.querySelectorAll('.image:not([data-init])').length === 0);
  });

  await check('image.css applied (rounded figure + block image)', async () => {
    const style = await page.$eval('#im-loaded', (el) => {
      const cs = getComputedStyle(el);
      return { radius: cs.borderTopLeftRadius, overflow: cs.overflow };
    });
    assert.notEqual(style.radius, '0px', 'rounded corners');
    assert.equal(style.overflow, 'hidden', 'overflow clipped');
  });

  await check('data-ratio sets aspect-ratio (16/9)', async () => {
    assert.match(
      await page.$eval('#im-caption', (el) => getComputedStyle(el).aspectRatio),
      /^16\s*\/\s*9$|^1\.77\d+$/,
    );
  });

  await check('real network error reveals .image-fallback', async () => {
    await page.waitForFunction(() => document.querySelector('#im-broken img')!.hasAttribute('data-error'));
    assert.equal(await fallbackShown(page, 'im-broken'), true);
    const state = await page.$eval('#im-broken', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'error', 'the failed load moved the named state');
  });

  await check('loaded figure has no fallback visible (state default)', async () => {
    const state = await page.$eval('#im-loaded', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'default');
  });

  // -- State API (AGENTS.md "State API"), bound per figure --------------------
  const setState = (page: Page, id: string, state: string) =>
    page.$eval(`#${id}`, (el, s) => (el as HTMLElement).api!.setState(s), state);

  await check("state API: setState('error') reveals the fallback", async () => {
    await setState(page, 'im-loaded', 'error');
    assert.ok(
      await page.$eval('#im-loaded img', (el) => el.hasAttribute('data-error')),
      'error marker set on the img',
    );
    const state = await page.$eval('#im-loaded', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'error');
  });

  await check("state API: setState('default') clears the marker", async () => {
    await setState(page, 'im-loaded', 'default');
    assert.equal(await page.$eval('#im-loaded img', (el) => el.hasAttribute('data-error')), false);
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#im-loaded') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.imageApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.imageStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#im-loaded'),
    }));
    assert.ok(reg.hasApi, 'df$.imageApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'error']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });

  // -- Lightbox (documented data-preview axis) --------------------------------
  await check('clicking a [data-preview] figure opens the lightbox dialog', async () => {
    await page.click('#im-preview img');
    await page.waitForFunction(
      () => document.querySelector('.image-lightbox')?.matches(':open'),
    );
    assert.equal(
      await page.$eval('.image-lightbox img', (el) => (el as HTMLImageElement).alt),
      'Previewable',
      'lightbox shows the clicked image',
    );
  });

  await check('lightbox toolbar applies transforms (zoom + rotate)', async () => {
    await page.click('.image-lightbox [data-action="zoom-in"]');
    await page.click('.image-lightbox [data-action="rotate-right"]');
    const transform = await page.$eval('.image-lightbox-content img', (el) => el.style.transform);
    assert.match(transform, /scale\(1\.25\)/, 'zoom applied');
    assert.match(transform, /rotate\(90deg\)/, 'rotation applied');
    await page.click('.image-lightbox [data-action="reset"]');
    assert.equal(
      await page.$eval('.image-lightbox-content img', (el) => el.style.transform),
      'scale(1) rotate(0deg)',
      'reset restores',
    );
  });

  await check('lightbox close button closes the dialog', async () => {
    await page.click('.image-lightbox [data-action="close"]');
    await page.waitForFunction(() => !document.querySelector('.image-lightbox')!.matches(':open'));
  });

  // -- Scroll lock (documented in skill Notes: page behind stays put) --------
  await check('page behind the lightbox stays put; position restored on close', async () => {
    await page.evaluate(() => window.scrollTo(0, 400));
    const before = await page.evaluate(() => document.scrollingElement!.scrollTop);
    assert.ok(before > 0, 'fixture page is scrollable');
    await page.click('#im-preview img');
    await page.waitForFunction(() => document.querySelector('.image-lightbox')?.matches(':modal'));
    // wheel over the fullscreen lightbox — must not scroll the page behind
    await page.mouse.move(640, 360);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(100);
    const during = await page.evaluate(() => document.scrollingElement!.scrollTop);
    // close FIRST (guarded) — a failed assert must not leave the modal open
    // and cascade into the click-based checks below
    await page.click('.image-lightbox [data-action="close"]');
    await page.waitForFunction(() => !document.querySelector('.image-lightbox')!.matches(':open'));
    assert.equal(during, before, 'page must not scroll while the lightbox is modal');
    const after = await page.evaluate(() => document.scrollingElement!.scrollTop);
    assert.equal(after, before, 'scroll position preserved after close');
    await page.mouse.move(640, 360);
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(100);
    const scrolled = await page.evaluate(() => document.scrollingElement!.scrollTop);
    assert.ok(scrolled > before, 'page is scrollable again after close');
    await page.evaluate(() => window.scrollTo(0, 0)); // leave a clean viewport
  });

  await check('broken image cannot be previewed (error guard)', async () => {
    // #im-broken also has data-preview, but its errored <img> must block the
    // lightbox; click the figure itself (a broken img may be 0×0/unactionable)
    await page.click('#im-broken');
    assert.equal(
      await page.$eval('.image-lightbox', (el) => el.matches(':open')),
      false,
      'errored images are inert to preview',
    );
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nimage.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('image.e2e: all checks passed');
