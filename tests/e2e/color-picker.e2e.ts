import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped color-picker component. Loads the
 * fixture (two pickers, mirroring the doc page) over HTTP in a real browser,
 * then verifies the hex display stays in sync with the native input,
 * styling, and the named State API ({ value } preset + live value) — the
 * same files consumers copy from dist/, unmodified.
 */

const FIXTURE = '/tests/e2e/color-picker.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const display = (page: Page, id: string) => page.$eval(`#${id} .color-picker-value`, (el) => el.textContent);
const inputValue = (page: Page, id: string) =>
  page.$eval(`#${id} input`, (el) => (el as HTMLInputElement).value);

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

  await check('color-picker.js initialized + synced the authored value', async () => {
    await page.waitForFunction(
      () => document.querySelectorAll('.color-picker:not([data-init])').length === 0,
    );
    assert.equal(await display(page, 'cp-default'), '#6366f1');
    assert.equal(await display(page, 'cp-second'), '#10b981');
  });

  await check('color-picker.css applied (swatch + layout)', async () => {
    const style = await page.$eval('#cp-default input', (el) => {
      const cs = getComputedStyle(el);
      return { radius: cs.borderTopLeftRadius, size: cs.width };
    });
    assert.notEqual(style.radius, '0px', 'rounded swatch');
    assert.notEqual(style.size, 'auto', 'fixed swatch size');
  });

  await check('changing the input updates the display (input event)', async () => {
    // programmatic set + dispatched event mirrors what a picker interaction does
    await page.$eval('#d-color', (el) => {
      (el as HTMLInputElement).value = '#ff0000';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    assert.equal(await display(page, 'cp-default'), '#ff0000');
    assert.equal(await display(page, 'cp-second'), '#10b981', 'the other picker is untouched');
  });

  // -- State API (AGENTS.md "State API") -------------------------------------
  await check("state API: setState('default', { value }) presets the color", async () => {
    await page.$eval('#cp-second', (el) =>
      (el as HTMLElement).api!.setState('default', { value: '#00ff00' }),
    );
    assert.equal(await inputValue(page, 'cp-second'), '#00ff00');
    assert.equal(await display(page, 'cp-second'), '#00ff00', 'display synced via the dispatched event');
  });

  await check('state API: getState reports the live value', async () => {
    await page.$eval('#d-color', (el) => {
      (el as HTMLInputElement).value = '#123456';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const state = await page.$eval('#cp-default', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'default');
    assert.equal(state.config.value, '#123456', 'reflects the picked value, not just setState');
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#cp-default') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: registry globals expose api + declared states (camelCase)', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.colorPickerApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.colorPickerStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#cp-default'),
    }));
    assert.ok(reg.hasApi, 'df$.colorPickerApi.setState missing');
    assert.deepEqual(reg.states, ['default']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });

  await check('color-picker: data-size="xs" → height 28px', async () => {
    const val = await page.$eval('#z-colorpicker-xs', (el) => String(el.getBoundingClientRect().height) + 'px');
    assert.equal(val, '28px');
  });
  await check('color-picker: data-size="sm" → height 32px', async () => {
    const val = await page.$eval('#z-colorpicker-sm', (el) => String(el.getBoundingClientRect().height) + 'px');
    assert.equal(val, '32px');
  });
  await check('color-picker: data-size="md" → height 36px', async () => {
    const val = await page.$eval('#z-colorpicker-md', (el) => String(el.getBoundingClientRect().height) + 'px');
    assert.equal(val, '36px');
  });
  await check('color-picker: data-size="lg" → height 44px', async () => {
    const val = await page.$eval('#z-colorpicker-lg', (el) => String(el.getBoundingClientRect().height) + 'px');
    assert.equal(val, '44px');
  });
  await check('color-picker: data-size="xl" → height 52px', async () => {
    const val = await page.$eval('#z-colorpicker-xl', (el) => String(el.getBoundingClientRect().height) + 'px');
    assert.equal(val, '52px');
  });

} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\ncolor-picker.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('color-picker.e2e: all checks passed');
