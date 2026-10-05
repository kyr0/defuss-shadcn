import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: E2E smoke test for the shipped image component. Loads the fixture
 * (loaded image, broken image with fallback, ratio + caption, preview
 * figure, progressive-sources figure - mirroring the doc page) over HTTP in
 * a real browser, then verifies the fallback logic for real network failures,
 * ratio CSS, the lightbox (open + toolbar transforms + close), the per-figure
 * named State API, and the progressive sources (low-res placeholder loads and
 * shows first, retina high-res swap at init, zoom-triggered high-res upgrade)
 * - the same files consumers copy from dist/, unmodified.
 */

const FIXTURE = '/tests/e2e/image.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

// 1×1 transparent PNG - route interception bypasses the filesystem, but the
// bytes must still decode as an image or the component's error fallback fires
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const imgRequested: string[] = [];
const imgFulfilled: string[] = [];

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
  // progressive sources: the fixture's /img/*.png files do not exist on disk —
  // intercept and fulfill the synthetic PNG, recording request/fulfillment
  // order. The lazy figure's standard source is delayed 500ms so the low-res
  // phase (placeholder under data-loading) is deterministically observable,
  // including the steady-state blur AFTER the 200ms filter transition.
  await page.route('**/img/*.png', async (route) => {
    const path = new URL(route.request().url()).pathname;
    imgRequested.push(path);
    if (path.endsWith('/lazy-standard.png')) await new Promise((r) => setTimeout(r, 500));
    // the lightbox original arrives late, so its pre-sized placeholder phase is observable
    if (path.endsWith('/full.png')) await new Promise((r) => setTimeout(r, 400));
    await route.fulfill({ body: TINY_PNG, contentType: 'image/png' });
    imgFulfilled.push(path);
  });
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
    // wheel over the fullscreen lightbox - must not scroll the page behind
    await page.mouse.move(640, 360);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(100);
    const during = await page.evaluate(() => document.scrollingElement!.scrollTop);
    // close FIRST (guarded) - a failed assert must not leave the modal open
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

  // -- Progressive sources (data-src-low / data-src-high) ----------------------
  // Chromium requests a markup-level src before deferred module JS can swap it
  // (the component tolerates this: "the swap is simply instant"), so literal
  // request order is not assertable - what IS deterministic: the placeholder
  // FULFILLS and shows first (the feature's promise), then the swap settles.

  await check('progressive: static figure settles on the standard source', async () => {
    await page.waitForFunction(() => {
      const img = document.querySelector('#im-progressive img')!;
      return !img.hasAttribute('data-loading') && (img as HTMLImageElement).currentSrc.endsWith('/img/standard.png');
    });
  });

  await check('progressive: low placeholder loads and shows first, then swaps to standard', async () => {
    // inserted lazily (after first paint) with unique URLs, so its requests
    // are isolated from the static figure's parse-time ones
    await page.evaluate(() => {
      const fig = document.createElement('figure');
      fig.className = 'image';
      fig.id = 'im-lazy';
      fig.style.maxWidth = '320px';
      const img = document.createElement('img');
      img.src = '/img/lazy-standard.png';
      img.dataset.srcLow = '/img/lazy-low.png';
      img.alt = 'Lazy progressive';
      fig.appendChild(img);
      document.body.appendChild(fig);
    });
    // low-res phase: placeholder showing under data-loading, CSS blur applied
    await page.waitForFunction(() => {
      const img = document.querySelector('#im-lazy img');
      return !!img && img.hasAttribute('data-loading') && (img as HTMLImageElement).currentSrc.endsWith('/img/lazy-low.png');
    });
    // poll the computed style: filter TRANSITIONS to blur(8px) over 200ms, so
    // a one-shot read right at the marker could catch a mid-transition value
    await page.waitForFunction(
      () => getComputedStyle(document.querySelector('#im-lazy img')!).filter === 'blur(8px)',
    );
    // settle: swapped to the standard source, marker + blur gone (the
    // out-transition needs another 200ms - poll it to completion too)
    await page.waitForFunction(() => {
      const img = document.querySelector('#im-lazy img');
      return !!img && !img.hasAttribute('data-loading') && (img as HTMLImageElement).currentSrc.endsWith('/img/lazy-standard.png');
    });
    await page.waitForFunction(
      () => getComputedStyle(document.querySelector('#im-lazy img')!).filter === 'none',
    );
    // fulfillment order: the placeholder LOADED first (the delayed standard
    // source only completes after the swap target is preloaded)
    const lowAt = imgFulfilled.indexOf('/img/lazy-low.png');
    const standardAt = imgFulfilled.indexOf('/img/lazy-standard.png');
    assert.ok(lowAt !== -1 && standardAt !== -1, `both lazy sources requested, got ${JSON.stringify(imgRequested)}`);
    assert.ok(lowAt < standardAt, 'low-res loaded before the standard source');
  });

  await check('progressive: high-res source is never requested on 1dppx displays', async () => {
    assert.equal(
      imgRequested.filter((p) => p === '/img/high.png').length,
      0,
      'no high-res request before any zoom',
    );
  });

  await check('progressive: first lightbox zoom-in upgrades to the high-res source', async () => {
    await page.click('#im-progressive img');
    await page.waitForFunction(() => document.querySelector('.image-lightbox')?.matches(':open'));
    const highReq = page.waitForRequest('**/img/high.png');
    await page.click('.image-lightbox [data-action="zoom-in"]');
    await highReq;
    await page.waitForFunction(
      () => (document.querySelector('.image-lightbox-content > img') as HTMLImageElement).currentSrc.endsWith('/img/high.png'),
    );
    assert.ok(
      await page.$eval('#im-progressive img', (el) => (el as HTMLImageElement).currentSrc.endsWith('/img/high.png')),
      'figure img upgraded too',
    );
    // a second zoom-in reuses the loaded source (no re-fetch)
    const highCount = imgRequested.filter((p) => p === '/img/high.png').length;
    await page.click('.image-lightbox [data-action="zoom-in"]');
    await page.waitForTimeout(150);
    assert.equal(imgRequested.filter((p) => p === '/img/high.png').length, highCount, 'no duplicate high-res request');
    // leave the lightbox closed behind us
    await page.click('.image-lightbox [data-action="close"]');
    await page.waitForFunction(() => !document.querySelector('.image-lightbox')!.matches(':open'));
  });

  await check('data-src-full: the lightbox loads the original; the page never does', async () => {
    assert.equal(imgRequested.includes('/img/full.png'), false, 'original not fetched before a preview');
    const inline = await page.$eval('#im-full img', (el) => (el as HTMLImageElement).src);
    await page.click('#im-full img');
    await page.waitForFunction(() => document.querySelector('.image-lightbox')?.matches(':open'));
    // opens at once with the cached inline image, pre-sized to the fitted frame
    const early = await page.$eval('.image-lightbox-content > img', (el) => ({ src: (el as HTMLImageElement).src, width: (el as HTMLElement).style.width }));
    assert.equal(early.src, inline, 'inline image shows while the original loads');
    assert.match(early.width, /^min\(90vw/, 'placeholder locked to the fitted frame');
    await page.waitForFunction(
      () => (document.querySelector('.image-lightbox-content > img') as HTMLImageElement).currentSrc.endsWith('/img/full.png'),
    );
    assert.equal(await page.$eval('.image-lightbox-content > img', (el) => (el as HTMLElement).style.width), '', 'width lock released on swap');
    assert.equal(await page.$eval('#im-full img', (el) => (el as HTMLImageElement).src), inline, 'figure keeps its own src');
    // zoom-in: the original already covers it - no data-src-high fetch
    await page.click('.image-lightbox [data-action="zoom-in"]');
    await page.waitForTimeout(150);
    assert.equal(imgRequested.includes('/img/full-high.png'), false, 'zoom-in skips the high-res upgrade');
    await page.click('.image-lightbox [data-action="close"]');
    await page.waitForFunction(() => !document.querySelector('.image-lightbox')!.matches(':open'));
    // a plain preview afterwards opens unlocked (no stale width from the original)
    await page.click('#im-preview img');
    await page.waitForFunction(() => document.querySelector('.image-lightbox')?.matches(':open'));
    assert.equal(await page.$eval('.image-lightbox-content > img', (el) => (el as HTMLElement).style.width), '', 'no width lock without data-src-full');
    await page.click('.image-lightbox [data-action="close"]');
    await page.waitForFunction(() => !document.querySelector('.image-lightbox')!.matches(':open'));
  });

  await check('progressive: ≥2dppx displays settle on the high-res source', async () => {
    const retina = await browser.newContext({ deviceScaleFactor: 2 });
    const page2 = await retina.newPage();
    try {
      const requested2: string[] = [];
      await page2.route((url) => url.hostname.endsWith('.invalid'), (route) => route.abort('failed'));
      await page2.route('**/img/*.png', async (route) => {
        requested2.push(new URL(route.request().url()).pathname);
        await route.fulfill({ body: TINY_PNG, contentType: 'image/png' });
      });
      await page2.goto(`${server.url}${FIXTURE}`);
      await page2.waitForFunction(() => {
        const img = document.querySelector('#im-progressive img');
        return !!img && !img.hasAttribute('data-loading') && (img as HTMLImageElement).currentSrc.endsWith('/img/high.png');
      });
      assert.ok(requested2.includes('/img/high.png'), 'high-res source was requested');
    } finally {
      await retina.close();
    }
  });
  const shown = (id: string) => page.$eval('#' + id, (g) => [...g.children].filter((c, i) => i === 0 ? ![...g.children].slice(1).some((o) => getComputedStyle(o).opacity === '1') : getComputedStyle(c).opacity === '1' && getComputedStyle(c).clipPath === 'none').map((c) => c.getAttribute('alt')).join());
  const at = async (id: string, fx: number, fy = 0.5) => { await page.$eval('#' + id, (g) => g.scrollIntoView({ block: 'center' })); const b = (await page.locator('#' + id).boundingBox())!; await page.mouse.move(b.x + b.width * fx, b.y + b.height * fy); await page.waitForTimeout(180); };

  await check('hover gallery: image.js preloads (eager) and decodes every image, then marks data-ready; the switch is instant (no transition)', async () => {
    // readiness is lazy: a gallery decodes when it nears the viewport
    for (const id of ['hg', 'hg-zoom', 'hg-v']) await page.$eval('#' + id, (g) => g.scrollIntoView({ block: 'center' }));
    await page.waitForFunction(() => document.querySelectorAll('.hover-gallery[data-ready]').length === 3, undefined, { timeout: 10000 });
    const r = await page.$eval('#hg', (g) => ({ lazy: [...g.querySelectorAll('img')].filter((i) => (i as HTMLImageElement).loading === 'lazy').length, t: getComputedStyle(g.children[2]).transitionDuration }));
    assert.deepEqual(r, { lazy: 0, t: '0s' });
  });

  await check('hover gallery: the first image shows; each fourth of the frame shows the next; back at the start the first returns', async () => {
    await page.mouse.move(1, 1);
    assert.equal(await shown('hg'), 'h1');
    const r = await page.$eval('#hg', (g) => [getComputedStyle(g).aspectRatio, getComputedStyle(g).getPropertyValue('--_n').trim()]);
    assert.deepEqual(r, ['4 / 3', '4']);
    for (const [fx, want] of [[0.1, 'h1'], [0.35, 'h2'], [0.6, 'h3'], [0.9, 'h4'], [0.4, 'h2'], [0.05, 'h1']] as const) {
      await at('hg', fx);
      assert.equal(await shown('hg'), want, `at ${fx}`);
    }
  });

  await check('hover gallery: the position bar shows on hover, its bright segment follows (--_cur)', async () => {
    await at('hg', 0.6);
    const r = await page.$eval('#hg', (g) => [getComputedStyle(g, '::after').opacity, getComputedStyle(g).getPropertyValue('--_cur').trim()]);
    assert.deepEqual(r, ['1', '3']);
    await page.mouse.move(1, 1);
    await page.waitForTimeout(200);
    assert.equal(await page.$eval('#hg', (g) => getComputedStyle(g, '::after').opacity), '0');
  });

  await check('hover gallery: data-effect="zoom" scales the image in view; vertical slices rows', async () => {
    await at('hg-zoom', 0.8);
    await page.waitForTimeout(450); // the 400ms ease
    assert.equal(await page.$eval('#hg-zoom img:nth-child(2)', (i) => getComputedStyle(i).scale), '1.04');
    await at('hg-v', 0.5, 0.9);
    assert.equal(await shown('hg-v'), 'h3');
    await at('hg-v', 0.5, 0.1);
    assert.equal(await shown('hg-v'), 'h1');
  });

  await check('hover gallery: without hover (touch) it is a swipeable scroll-snap strip', async () => {
    const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 420, height: 800 } });
    const p2 = await ctx.newPage();
    await p2.goto(page.url());
    const r = await p2.$eval('#hg', (g) => ({ d: getComputedStyle(g).display, snap: getComputedStyle(g).scrollSnapType, scroll: g.scrollWidth > g.clientWidth * 3, op: getComputedStyle(g.children[2]).opacity }));
    assert.deepEqual(r, { d: 'flex', snap: 'x mandatory', scroll: true, op: '1' });
    await ctx.close();
  });

  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await assertRenderContract(page, '.image[id]', ['default','error']);
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
