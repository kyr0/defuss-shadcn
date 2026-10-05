import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: E2E smoke test for the shipped slider component. Loads the fixture
 * (default + custom-range + authored-disabled sliders, mirroring the doc
 * page) over HTTP in a real browser, then verifies the fill-track custom
 * property, keyboard stepping, native disabled behavior, and the named State
 * API ({ value } preset) and the CSS-only .slider-marks tick scale - the same files consumers copy from dist/,
 * unmodified.
 */

const FIXTURE = '/tests/e2e/slider.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const sliderValue = (page: Page, id = 's-default') =>
  page.$eval(`#${id}`, (el) => (el as HTMLInputElement).value);
const fillVar = (page: Page, id = 's-default') =>
  page.$eval(`#${id}`, (el) => el.style.getPropertyValue('--slider-value'));

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

  await check('slider.js initialized + painted the fill (data-init, --slider-value)', async () => {
    await page.waitForFunction(
      () => document.querySelectorAll('.slider:not([data-init])').length === 0,
    );
    assert.equal(await fillVar(page), '50%', 'value 50 of 0..100 -> 50%');
    // custom range maps min..max onto 0..100%
    assert.equal(await fillVar(page, 's-range'), '50%', 'value 15 of 10..20 -> 50%');
  });

  await check('slider.css paints a two-stop gradient driven by --slider-value', async () => {
    // Chromium can't compute styles for -webkit- pseudo-elements - read the
    // shipped rule straight from the CSSOM instead (exact string match).
    const rule = await page.evaluate(
      () =>
        [...document.styleSheets]
          .flatMap((s) => [...(s.cssRules ?? [])])
          .flatMap((r) => (r instanceof CSSNestedDeclarations ? [] : [...(r instanceof CSSGroupingRule ? r.cssRules : [r])]))
          .map((r) => r.cssText)
          .find((t) => t.includes('::-webkit-slider-runnable-track') && t.includes('linear-gradient')) ?? '',
    );
    assert.ok(rule, 'runnable-track gradient rule shipped');
    assert.match(rule, /var\(--_fill\)\s*var\(--slider-value\)/, 'fill stops at the value');
  });

  await check('keyboard arrows step the value and repaint the fill', async () => {
    await page.focus('#s-default');
    await page.keyboard.press('ArrowRight');
    assert.equal(await sliderValue(page), '51');
    assert.equal(await fillVar(page), '51%', 'fill follows the input event');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await sliderValue(page), '49');
  });

  await check('authored disabled slider is inert', async () => {
    const info = await page.$eval('#s-disabled', (el) => ({
      disabled: (el as HTMLInputElement).disabled,
      cursor: getComputedStyle(el).cursor,
    }));
    assert.equal(info.disabled, true);
    assert.equal(info.cursor, 'not-allowed', 'disabled styling applied');
  });

  // -- State API (AGENTS.md "State API") -------------------------------------
  const setState = (page: Page, id: string, state: string, config?: Record<string, unknown>) =>
    page.$eval(
      `#${id}`,
      (el, args) => (el as HTMLElement).api!.setState(args[0], args[1]),
      [state, config] as const,
    );

  await check("state API: setState('disabled') greys and inert the slider", async () => {
    await setState(page, 's-default', 'disabled');
    const state = await page.$eval('#s-default', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'disabled');
    await page.focus('#s-default');
    await page.keyboard.press('ArrowRight');
    assert.equal(await sliderValue(page), '49', 'no keyboard input while disabled');
  });

  await check("state API: setState('default') re-enables", async () => {
    await setState(page, 's-default', 'default');
    assert.equal(await page.$eval('#s-default', (el) => (el as HTMLInputElement).disabled), false);
    await page.focus('#s-default');
    await page.keyboard.press('ArrowRight');
    assert.equal(await sliderValue(page), '50', 'keyboard works again');
  });

  await check("state API: { value } config presets the position (and repaints)", async () => {
    await setState(page, 's-range', 'default', { value: 18 });
    assert.equal(await sliderValue(page, 's-range'), '18');
    assert.equal(await fillVar(page, 's-range'), '80%', 'fill recomputed for the preset');
  });

  await check('state API: getState reports the live value', async () => {
    const state = await page.$eval('#s-default', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'default');
    assert.equal(state.config.value, '50', 'live value mirrored into config');
  });

  await check("state API: authored disabled slider restores to 'disabled' (not enabled)", async () => {
    await setState(page, 's-disabled', 'default');
    assert.equal(
      await page.$eval('#s-disabled', (el) => (el as HTMLInputElement).disabled),
      true,
      'authored disabled state is the default for this instance',
    );
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#s-default') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.sliderApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.sliderStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#s-default'),
    }));
    assert.ok(reg.hasApi, 'df$.sliderApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'disabled']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });

  await check('slider: data-size="xs" → height 4px', async () => {
    const val = await page.$eval('#z-slider-xs', (el) => String(el.getBoundingClientRect().height) + 'px');
    assert.equal(val, '4px');
  });
  await check('slider: data-size="sm" → height 6px', async () => {
    const val = await page.$eval('#z-slider-sm', (el) => String(el.getBoundingClientRect().height) + 'px');
    assert.equal(val, '6px');
  });
  await check('slider: data-size="md" → height 8px', async () => {
    const val = await page.$eval('#z-slider-md', (el) => String(el.getBoundingClientRect().height) + 'px');
    assert.equal(val, '8px');
  });
  await check('slider: data-size="lg" → height 10px', async () => {
    const val = await page.$eval('#z-slider-lg', (el) => String(el.getBoundingClientRect().height) + 'px');
    assert.equal(val, '10px');
  });
  await check('slider: data-size="xl" → height 12px', async () => {
    const val = await page.$eval('#z-slider-xl', (el) => String(el.getBoundingClientRect().height) + 'px');
    assert.equal(val, '12px');
  });

  await check('tones + custom color: --_fill resolves to five distinct colors (custom = --slider-color)', async () => {
    const r = await page.evaluate(() => ['t-success', 't-warning', 't-info', 't-destructive', 't-custom'].map((id) => getComputedStyle(document.getElementById(id)!).accentColor));
    assert.equal(new Set(r).size, 5, r.join(' | '));
    assert.equal(r[4], 'rgb(120, 40, 200)');
  });

  await check('units: data-unit / data-currency format every output[for] and aria-valuetext (Intl)', async () => {
    const r = await page.evaluate(() => ({
      pct: [document.getElementById('u-pct-out')!.textContent, document.getElementById('u-pct')!.getAttribute('aria-valuetext')],
      temp: document.getElementById('u-temp-out')!.textContent,
      eur: document.getElementById('u-eur-out')!.textContent,
      plain: document.getElementById('s-default')!.getAttribute('aria-valuetext'),
    }));
    assert.deepEqual(r.pct, ['40%', '40%']);
    assert.equal(r.temp, '21.5°C');
    assert.equal(r.eur, '€5');
    assert.equal(r.plain, null, 'no unit, no valuetext override');
    await page.focus('#u-temp');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.textContent('#u-temp-out'), '22°C');
  });

  await check('field: icons at both ends, the slider flexes between them; scale spreads its labels', async () => {
    const r = await page.evaluate(() => {
      const icons = [...document.querySelectorAll('#sf .slider-icon')].map((e) => e.getBoundingClientRect());
      const s = document.getElementById('u-pct')!.getBoundingClientRect();
      const scale = [...document.querySelectorAll('#scale span')].map((e) => e.getBoundingClientRect());
      const sc = document.getElementById('scale')!.getBoundingClientRect();
      return { order: icons[0].right <= s.left && s.right <= icons[1].left, wide: s.width > 200, ends: Math.round(scale[0].left - sc.left) === 0 && Math.round(sc.right - scale[1].right) === 0 };
    });
    assert.ok(r.order && r.wide && r.ends, JSON.stringify(r));
  });

  await check('emoji thumb: data-thumb-emoji → data-thumb="emoji" + an SVG image that follows the value', async () => {
    const img = () => page.$eval('#emo', (e) => decodeURIComponent((e as HTMLElement).style.getPropertyValue('--slider-thumb-image')));
    assert.equal(await page.getAttribute('#emo', 'data-thumb'), 'emoji');
    assert.ok((await img()).includes('😫'), 'low value → first emoji');
    await page.$eval('#emo', (e) => (e as unknown as { api: { setState(n: string, c: object): void } }).api.setState('default', { value: 95 }));
    assert.ok((await img()).includes('😄'), 'high value → last emoji');
  });

  await check('range: two thumbs paint one span (--range-from/-to), sizes + tone inherited', async () => {
    const r = await page.evaluate(() => {
      const rg = document.getElementById('rg')!;
      return { from: rg.style.getPropertyValue('--range-from'), to: rg.style.getPropertyValue('--range-to'), h: rg.getBoundingClientRect().height,
        track: getComputedStyle(document.getElementById('rg-lo')!).height, pe: getComputedStyle(document.getElementById('rg-lo')!).pointerEvents,
        tone: getComputedStyle(document.getElementById('rg-lo')!).accentColor === getComputedStyle(document.getElementById('t-info')!).accentColor,
        out: document.getElementById('rg-out')!.textContent };
    });
    assert.equal(r.from, '20%'); assert.equal(r.to, '80%');
    assert.equal(r.h, 24, 'lg thumb height'); assert.equal(r.track, '10px', 'lg track inherited');
    assert.equal(r.pe, 'none', 'only thumbs take the pointer');
    assert.ok(r.tone, 'tone inherited');
    assert.equal(r.out, '€200 – €800', 'Intl formatRange');
  });

  await check('range: the low thumb cannot pass the high one (data-min-gap 50); the moved thumb stays on top', async () => {
    await page.$eval('#rg-lo', (e) => { (e as HTMLInputElement).value = '900'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    let r = await page.evaluate(() => ({ lo: (document.getElementById('rg-lo') as HTMLInputElement).value, active: document.getElementById('rg-lo')!.hasAttribute('data-active'), z: getComputedStyle(document.getElementById('rg-lo')!).zIndex }));
    assert.deepEqual(r, { lo: '750', active: true, z: '1' });
    await page.focus('#rg-hi');
    for (let i = 0; i < 30; i++) await page.keyboard.press('ArrowLeft');
    r = await page.evaluate(() => ({ lo: (document.getElementById('rg-hi') as HTMLInputElement).value, active: document.getElementById('rg-hi')!.hasAttribute('data-active'), z: '' }));
    assert.equal(r.lo, '800', 'high stops at low + gap');
    assert.equal(await page.textContent('#rg-out'), '€750 – €800');
  });

  await check('RTL: the fill runs right to left', async () => {
    const d = await page.$eval('#rtl', (e) => getComputedStyle(e).getPropertyValue('--_dir').trim());
    assert.equal(d, 'to left');
  });

  await check('slider-marks: one tick per step, centred on the thumb travel (default + lg via sibling / own data-size)', async () => {
    const r = await page.evaluate(() => {
      const ticks = (id: string) => [...document.getElementById(id)!.children].map((c) => { const b = c.getBoundingClientRect(); return Math.round(b.left + b.width / 2); });
      const input = (id: string) => document.getElementById(id)!.getBoundingClientRect();
      const pad = (id: string) => getComputedStyle(document.getElementById(id)!).paddingLeft;
      const mk = input('mk');
      return {
        first: ticks('mk-marks')[0] - Math.round(mk.left),
        last: Math.round(mk.right) - ticks('mk-marks')[4],
        even: ticks('mk-marks').map((v, i, a) => (i ? v - a[i - 1] : 0)).slice(1),
        pads: [pad('mk-marks'), pad('mk-lg-marks'), pad('mk-apart')],
        tick: getComputedStyle(document.getElementById('mk-marks')!.children[0], '::before').height,
        bare: getComputedStyle(document.getElementById('mk-lg-marks')!.children[1], '::before').height,
      };
    });
    // default thumb 20px -> ticks start / end 10px in from the track ends
    assert.equal(r.first, 10);
    assert.equal(r.last, 10);
    assert.ok(Math.max(...r.even) - Math.min(...r.even) <= 1, `evenly spaced: ${r.even}`);
    assert.deepEqual(r.pads, ['10px', '12px', '12px'], 'half a thumb: md, lg by sibling, lg by own data-size');
    assert.deepEqual([r.tick, r.bare], ['6px', '4px']);
  });

  // LAST (AGENTS.md "State API" → render): the contract reloads the page
  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await assertRenderContract(page, '.slider[id]', ['default','disabled'], { runtimeAttrs: ['style','aria-valuetext','data-thumb'] });
  });

} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nslider.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('slider.e2e: all checks passed');
