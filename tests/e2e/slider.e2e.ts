import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped slider component. Loads the fixture
 * (default + custom-range + authored-disabled sliders, mirroring the doc
 * page) over HTTP in a real browser, then verifies the fill-track custom
 * property, keyboard stepping, native disabled behavior, and the named State
 * API ({ value } preset) - the same files consumers copy from dist/,
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
    assert.match(rule, /var\(--primary\)\s*var\(--slider-value\)/, 'fill stops at the value');
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

} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nslider.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('slider.e2e: all checks passed');
