import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: product-showcase swaps a poster frame for the native <video> on a
 * play-button click - the visible contract is the State API's two states
 * ('default' poster, 'playing' video) and CSS keying every layer off
 * [data-state]. This drives the real shipped files through both states and
 * the click itself. AGENTS.md "State API" + "Docs ↔ E2E parity".
 */
const PAGE = '/tests/e2e/product-showcase.e2e-fixture.html';

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

try {
  const page = await browser.newPage();
  await page.goto(`${server.url}${PAGE}`);
  await page.waitForFunction(
    () => !!(document.querySelector('.mk-showcase') as any)?.api,
    undefined, { timeout: 5_000 },
  );

  await check('frame is a 5:3 overflow-hidden rounded box', async () => {
    const css = await page.$eval('.mk-showcase', (el) => {
      const cs = getComputedStyle(el);
      return { ar: cs.aspectRatio, of: cs.overflow, pos: cs.position };
    });
    assert.equal(css.ar, '5 / 3');
    assert.equal(css.of, 'hidden');
    assert.equal(css.pos, 'relative', 'poster/video/button layers anchor to the frame');
  });

  await check('init binds the State API and starts in default (poster visible)', async () => {
    const r = await page.evaluate(() => {
      const el = document.querySelector('.mk-showcase') as any;
      const poster = document.querySelector('.mk-showcase-poster')!;
      const video = document.querySelector('.mk-showcase video')!;
      return {
        state: el.api.getState().name,
        dataState: el.dataset.state,
        posterOpacity: getComputedStyle(poster).opacity,
        videoOpacity: getComputedStyle(video).opacity,
        btnVisible: getComputedStyle(document.querySelector('.mk-showcase-play')!).visibility,
      };
    });
    assert.equal(r.state, 'default');
    assert.equal(r.dataState, 'default');
    assert.equal(r.posterOpacity, '1', 'poster must show in default');
    assert.equal(r.videoOpacity, '0', 'video must hide in default');
    assert.equal(r.btnVisible, 'visible');
  });

  await check("setState('playing') swaps to the video and plays it", async () => {
    await page.evaluate(() => {
      (document.querySelector('.mk-showcase') as any).api.setState('playing');
    });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const el = document.querySelector('.mk-showcase') as any;
      const v = document.querySelector('.mk-showcase video') as HTMLVideoElement;
      return {
        dataState: el.dataset.state,
        videoOpacity: getComputedStyle(document.querySelector('.mk-showcase video')!).opacity,
        posterOpacity: getComputedStyle(document.querySelector('.mk-showcase-poster')!).opacity,
        btnHidden: getComputedStyle(document.querySelector('.mk-showcase-play')!).visibility,
        paused: v.paused,
        muted: v.muted,
        nativeControls: v.controls,
      };
    });
    assert.equal(r.dataState, 'playing');
    assert.equal(r.videoOpacity, '1', 'video must show in playing');
    assert.equal(r.posterOpacity, '0', 'poster must hide in playing');
    assert.equal(r.btnHidden, 'hidden');
    assert.equal(r.paused, false, 'setState("playing") must start playback');
    assert.equal(r.muted, true, 'programmatic play must stay muted (autoplay policy)');
    assert.equal(r.nativeControls, true, 'the browser draws playback UI - no custom chrome');
  });

  await check("setState('default') pauses, rewinds, and restores the poster", async () => {
    const r = await page.evaluate(() => {
      const el = document.querySelector('.mk-showcase') as any;
      el.api.setState('default');
      const v = document.querySelector('.mk-showcase video') as HTMLVideoElement;
      return {
        state: el.api.getState().name,
        dataState: el.dataset.state,
        paused: v.paused,
        t: v.currentTime,
        posterOpacity: getComputedStyle(document.querySelector('.mk-showcase-poster')!).opacity,
      };
    });
    assert.equal(r.state, 'default');
    assert.equal(r.dataState, 'default');
    assert.equal(r.paused, true);
    assert.equal(r.t, 0, 'rewound to the poster frame');
    assert.equal(r.posterOpacity, '1');
  });

  await check('clicking the play button enters playing; native pause returns to the poster', async () => {
    await page.click('.mk-showcase-play');
    await page.waitForTimeout(400);
    let s = await page.evaluate(() => (document.querySelector('.mk-showcase') as any).api.getState().name);
    assert.equal(s, 'playing', 'play button click did not enter playing');

    // the user hits the native pause control → poster comes back (state stays honest)
    await page.evaluate(() => (document.querySelector('.mk-showcase video') as HTMLVideoElement).pause());
    await page.waitForTimeout(150);
    s = await page.evaluate(() => {
      const el = document.querySelector('.mk-showcase') as any;
      return el.api.getState().name + '|' + el.dataset.state;
    });
    assert.equal(s, 'default|default', 'pause did not reflect back into the state');
  });

  await check('play button is a real focusable button (keyboard path)', async () => {
    const r = await page.evaluate(() => {
      const b = document.querySelector('.mk-showcase-play')!;
      return { tag: b.tagName, label: b.getAttribute('aria-label'), circle: getComputedStyle(b).borderRadius };
    });
    assert.equal(r.tag, 'BUTTON');
    assert.match(r.label ?? '', /play/i);
    assert.match(r.circle, /9999|50%|\d+px/, 'circular');
    await page.focus('.mk-showcase-play');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    const s = await page.evaluate(() => (document.querySelector('.mk-showcase') as any).api.getState().name);
    assert.equal(s, 'playing', 'Enter on the focused button must play');
    await page.evaluate(() => (document.querySelector('.mk-showcase') as any).api.setState('default'));
  });

  await check('an embed takes the video layer: hidden and click-through until playing, then shown', async () => {
    const look = () => page.$eval('#ps-embed iframe', (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); const f = el.parentElement!.getBoundingClientRect(); return [s.opacity, s.pointerEvents, s.position, Math.round(r.width) === Math.round(f.width)]; });
    assert.deepEqual(await look(), ['0', 'none', 'absolute', true]);
    await page.click('#ps-embed .mk-showcase-play');
    await page.waitForTimeout(250);
    assert.deepEqual(await look(), ['1', 'auto', 'absolute', true]);
  });

  await check('browser: a window bar on top, the layers below it', async () => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-showcase[data-variant="browser"]')!; return { bar: getComputedStyle(s, '::before').height, top: getComputedStyle(s.querySelector('.mk-showcase-poster')!).top }; });
    assert.deepEqual(r, { bar: '36px', top: '36px' });
  });
  
  await check('ratios: wide 16:9, square 1:1', async () => {
    const r = await page.evaluate(() => ['wide', 'square'].map((v) => getComputedStyle(document.querySelector(`.mk-showcase[data-ratio="${v}"]`)!).aspectRatio));
    assert.deepEqual(r, ['16 / 9', '1 / 1']);
  });
  
  await check('callouts: positioned cards over the stage corners', async () => {
    const r = await page.evaluate(() => [...document.querySelectorAll('.mk-showcase-callout')].map((c) => ({ pos: getComputedStyle(c).position, z: getComputedStyle(c).zIndex })));
    assert.equal(r.length >= 2, true);
    assert.deepEqual(r[0], { pos: 'absolute', z: '12' });
  });
  
  await check('tilt: a scroll-driven animation on the frame; reduced motion stops it', async () => {
    const name = await page.$eval('.mk-showcase-stage[data-tilt] .mk-showcase', (e) => getComputedStyle(e).animationName);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const still = await page.$eval('.mk-showcase-stage[data-tilt] .mk-showcase', (e) => getComputedStyle(e).animationName);
    await page.emulateMedia({ reducedMotion: null });
    assert.deepEqual([name, still], ['mk-showcase-untilt', 'none']);
  });
  
  await check('tour: tabs over browser frames', async () => {
    const n = await page.evaluate(() => document.querySelectorAll('.mk-showcase-tour .tab-content .mk-showcase[data-variant="browser"]').length);
    assert.equal(n, 3);
  });

  await check('unknown state names throw', async () => {
    const threw = await page.evaluate(() => {
      try {
        (document.querySelector('.mk-showcase') as any).api.setState('buffering');
        return false;
      } catch {
        return true;
      }
    });
    assert.ok(threw);
  });
  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await assertRenderContract(page, '.mk-showcase[id]', ['default','playing']);
  });

} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`product-showcase.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('product-showcase.e2e: all checks passed');
