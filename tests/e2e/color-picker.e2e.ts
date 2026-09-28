import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped color-picker component. Loads the
 * fixture (two pickers, mirroring the doc page) over HTTP in a real browser,
 * then verifies the hex display stays in sync with the native input,
 * styling, and the named State API ({ value } preset + live value) - the
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

  const shown = (id: string) => page.$eval('#' + id + ' .color-picker-value', (el) => el.textContent);

  await check('data-format: the same colour in rgb / hsl / oklch (CSS Color 4 syntax)', async () => {
    assert.equal(await shown('cp-rgb'), 'rgb(99 102 241)');
    assert.equal(await shown('cp-hsl'), 'hsl(238.7 83.5% 66.7%)');
    assert.equal(await shown('cp-oklch'), 'oklch(0.5854 0.2041 277.12)');
    assert.equal(await shown('cp-switch'), 'oklch(0.1448 0 0)', 'achromatic → chroma and hue 0, like the system tokens');
  });

  await check('every notation round-trips to the exact picked colour (3,000+ random colours)', async () => {
    const r = await page.evaluate(() => {
      const p = document.getElementById('cp-rgb') as any;
      const cv = document.createElement('canvas').getContext('2d')!;
      // canvas quantises any CSS colour to 8-bit sRGB - the comparison target
      const to8 = (css: string) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = '#000'; cv.fillStyle = css; cv.fillRect(0, 0, 1, 1); return Array.from(cv.getImageData(0, 0, 1, 1).data.slice(0, 3)); };
      const hexes = ['#000000', '#ffffff', '#808080', '#ff0000', '#00ff00', '#0000ff', '#0a0a0a', '#fafafa', '#123456', '#6366f1'];
      for (let i = 0; i < 3000; i++) hexes.push('#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'));
      const worst: Record<string, number> = { hex: 0, rgb: 0, hsl: 0, oklch: 0 };
      const example: Record<string, string> = {};
      for (const format of Object.keys(worst)) {
        for (const hex of hexes) {
          p.api.setState('default', { value: hex, format });
          const text = p.querySelector('.color-picker-value').textContent;
          const want = to8(hex);
          const got = to8(text);
          const d = Math.max(...want.map((v, k) => Math.abs(v - got[k])));
          if (d > worst[format]) { worst[format] = d; example[format] = hex + ' → ' + text; }
        }
      }
      p.api.setState('default', { value: '#6366f1', format: 'rgb' });
      return { worst, example };
    });
    // measured bounds: hex / rgb / hsl (1 decimal) are exact; oklch
    // (L/C 4, H 2 decimals) lands within one 8-bit step
    assert.equal(r.worst.hex, 0, JSON.stringify(r.example));
    assert.equal(r.worst.rgb, 0, JSON.stringify(r.example));
    assert.equal(r.worst.hsl, 0, 'hsl drift ' + JSON.stringify(r.example));
    assert.ok(r.worst.oklch <= 1, 'oklch drift ' + JSON.stringify(r.example));
  });

  await check('format switcher: choosing a notation re-renders the value and the form output', async () => {
    await page.selectOption('#cp-switch-select', 'rgb');
    assert.equal(await shown('cp-switch'), 'rgb(10 10 10)');
    assert.equal(await page.$eval('#cp-switch-out', (el) => (el as HTMLInputElement).value), 'rgb(10 10 10)');
    assert.equal(await page.$eval('#cp-switch', (el) => el.getAttribute('data-format')), 'rgb');
  });

  await check('picking a colour updates value + form output in the chosen notation', async () => {
    await page.$eval('#cp-switch input[type="color"]', (el) => {
      (el as HTMLInputElement).value = '#ff0000';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    assert.equal(await shown('cp-switch'), 'rgb(255 0 0)');
    assert.equal(await page.$eval('#cp-switch-out', (el) => (el as HTMLInputElement).value), 'rgb(255 0 0)');
  });

  await check("state API: setState('default', { format }) switches notation; getState reports value + formatted", async () => {
    const r = await page.evaluate(() => {
      const p = document.getElementById('cp-switch') as any;
      p.api.setState('default', { format: 'hsl' });
      return [p.api.getState().config, (document.getElementById('cp-switch-select') as HTMLSelectElement).value];
    });
    assert.equal(r[0].value, '#ff0000');
    assert.equal(r[0].format, 'hsl');
    assert.equal(r[0].formatted, 'hsl(0 100% 50%)');
    assert.equal(r[1], 'hsl', 'the switcher follows');
  });

  await check('no data-format keeps hex (unchanged default)', async () => {
    assert.match((await shown('cp-default'))!, /^#[0-9a-f]{6}$/);
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
