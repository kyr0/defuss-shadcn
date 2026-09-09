import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped slider component. Loads the fixture
 * (default + custom-range + authored-disabled sliders, mirroring the doc
 * page) over HTTP in a real browser, then verifies the fill-track custom
 * property, keyboard stepping, native disabled behavior, the data-size /
 * data-variant axes, the CSS-only .slider-marks tick scale, and the named
 * State API ({ value } preset) — the same files consumers copy from dist/,
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
    // Chromium can't compute styles for -webkit- pseudo-elements — read the
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
    assert.match(rule, /var\(--slider-fill\)\s*var\(--slider-value\)/, 'fill stops at the value');
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

  // -- Sizes / variants / marks (daisyUI "range" feature parity) -------------
  const cssVar = (page: Page, id: string, prop: string) =>
    page.$eval(`#${id}`, (el, p) => getComputedStyle(el).getPropertyValue(p).trim(), prop);

  await check('data-size scales the track (sm < default < lg) — computed height', async () => {
    const h = async (id: string) =>
      parseFloat(await page.$eval(`#${id}`, (el) => getComputedStyle(el).height));
    const [sm, md, lg] = [await h('s-sm'), await h('s-default'), await h('s-lg')];
    assert.equal(sm, 4, 'data-size="sm" -> 0.25rem track');
    assert.equal(md, 8, 'default -> 0.5rem track');
    assert.equal(lg, 12, 'data-size="lg" -> 0.75rem track');
    assert.ok(sm < md && md < lg, `expected sm < default < lg, got ${sm}/${md}/${lg}`);
  });

  await check('data-size drives the thumb size knob and keeps the thumb centred', async () => {
    for (const [id, track, thumb] of [
      ['s-sm', '0.25rem', '0.875rem'],
      ['s-default', '0.5rem', '1.25rem'],
      ['s-lg', '0.75rem', '1.625rem'],
    ] as const) {
      assert.equal(await cssVar(page, id, '--slider-track-size'), track, `${id} track knob`);
      assert.equal(await cssVar(page, id, '--slider-thumb-size'), thumb, `${id} thumb knob`);
    }
  });

  await check('data-variant repaints the fill from theme tokens (pairwise distinct)', async () => {
    const fill = (id: string) => cssVar(page, id, '--slider-fill');
    const base = await fill('s-default');
    const dflt = await fill('s-v-default');
    const secondary = await fill('s-v-secondary');
    const destructive = await fill('s-v-destructive');
    assert.ok(dflt, 'variant fill resolves to a real color');
    assert.equal(dflt, base, 'data-variant="default" matches the un-attributed slider');
    assert.notEqual(secondary, dflt, 'secondary differs from default');
    assert.notEqual(destructive, dflt, 'destructive differs from default');
    assert.notEqual(destructive, secondary, 'destructive differs from secondary');
    // accent-color (the no-pseudo-element fallback) follows the variant too
    const accent = (id: string) => page.$eval(`#${id}`, (el) => getComputedStyle(el).accentColor);
    assert.notEqual(await accent('s-v-destructive'), await accent('s-v-default'));
  });

  await check('.slider-marks renders a CSS-only tick per step, inset by half a thumb', async () => {
    const marks = await page.$eval('#s-marks', (el) => ({
      children: el.children.length,
      padLeft: getComputedStyle(el).paddingLeft,
      padRight: getComputedStyle(el).paddingRight,
      tick: getComputedStyle(el.firstElementChild!, '::before').height,
      display: getComputedStyle(el).display,
      justify: getComputedStyle(el).justifyContent,
    }));
    assert.equal(marks.children, 5, 'one mark per step stop (0,25,50,75,100)');
    assert.equal(marks.display, 'flex');
    assert.equal(marks.justify, 'space-between');
    assert.equal(marks.padLeft, '10px', 'half of the 1.25rem default thumb');
    assert.equal(marks.padRight, '10px');
    assert.equal(marks.tick, '6px', 'generated tick line is drawn');
  });

  await check('.slider-marks[data-size] realigns with the larger thumb', async () => {
    const pad = await page.$eval('#s-marks-lg', (el) => getComputedStyle(el).paddingLeft);
    assert.equal(pad, '13px', 'half of the 1.625rem lg thumb');
  });

  await check('mark centres line up with the thumb travel (first/last on the ends)', async () => {
    const geo = await page.$eval('#s-marks', (el) => {
      const box = el.getBoundingClientRect();
      const kids = [...el.children].map((k) => {
        const r = k.getBoundingClientRect();
        return r.left + r.width / 2;
      });
      return { first: kids[0] - box.left, last: box.right - kids[kids.length - 1], width: box.width };
    });
    // zero-width flex items under space-between sit exactly on the padding edges
    assert.ok(Math.abs(geo.first - 10) < 0.6, `first tick at half-thumb inset, got ${geo.first}`);
    assert.ok(Math.abs(geo.last - 10) < 0.6, `last tick at half-thumb inset, got ${geo.last}`);
  });

  await check('stepped slider snaps to the step and repaints the fill', async () => {
    await page.focus('#s-steps');
    await page.keyboard.press('ArrowRight');
    assert.equal(await sliderValue(page, 's-steps'), '75', 'step=25 -> one arrow moves a quarter');
    assert.equal(await fillVar(page, 's-steps'), '75%');
  });

  await check('vertical orientation still works with data-size', async () => {
    const geo = async (id: string) =>
      page.$eval(`#${id}`, (el) => {
        const cs = getComputedStyle(el);
        return { width: cs.width, writingMode: cs.writingMode, thumb: cs.getPropertyValue('--slider-thumb-size').trim() };
      });
    const md = await geo('s-vertical');
    const lg = await geo('s-vertical-lg');
    assert.equal(md.writingMode, 'vertical-lr', 'vertical uses writing-mode, not a JS rotation');
    assert.equal(md.width, '8px', 'vertical default track thickness');
    assert.equal(lg.width, '12px', 'vertical lg track thickness');
    assert.equal(lg.thumb, '1.625rem');
    assert.equal(await fillVar(page, 's-vertical'), '60%', 'vertical fill painted by slider.js');
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
      hasApi: typeof globalThis._defussShadcn?.sliderApi?.setState === 'function',
      states: globalThis._defussShadcn?.sliderStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#s-default'),
    }));
    assert.ok(reg.hasApi, '_defussShadcn.sliderApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'disabled']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
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
