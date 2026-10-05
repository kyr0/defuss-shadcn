import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: E2E smoke test for the shipped number-input component. Loads the
 * fixture (integer + decimal steppers with min/max, mirroring the doc page)
 * over HTTP in a real browser, then verifies increment/decrement, boundary
 * clamping, dispatched events, styling, and the named State API ({ value }
 * preset + live value reporting) - the same files consumers copy from dist/,
 * unmodified.
 */

const FIXTURE = '/tests/e2e/number-input.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const value = (page: Page, id: string) =>
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

  // listen before interacting so the dispatched-event assertions are reliable
  await page.evaluate(() => {
    (window as unknown as { __events: string[] }).__events = [];
    document.querySelector('#d-qty')!.addEventListener('input', () => {
      (window as unknown as { __events: string[] }).__events.push('input');
    });
    document.querySelector('#d-qty')!.addEventListener('change', () => {
      (window as unknown as { __events: string[] }).__events.push('change');
    });
  });

  await check('number-input.js initialized wrappers (data-init)', async () => {
    await page.waitForFunction(
      () => document.querySelectorAll('.number-input:not([data-init])').length === 0,
    );
  });

  await check('number-input.css applied (bordered wrapper)', async () => {
    const style = await page.$eval('#ni-qty', (el) => {
      const cs = getComputedStyle(el);
      return { border: cs.borderTopWidth, radius: cs.borderTopLeftRadius };
    });
    assert.notEqual(style.border, '0px', 'bordered control');
    assert.notEqual(style.radius, '0px', 'rounded');
  });

  await check('increment/decrement step by 1 and dispatch input+change', async () => {
    await page.click('#ni-qty [data-action="increment"]');
    assert.equal(await value(page, 'ni-qty'), '2');
    await page.click('#ni-qty [data-action="decrement"]');
    assert.equal(await value(page, 'ni-qty'), '1');
    const events = await page.evaluate(() => (window as any).__events);
    assert.ok(events.includes('input') && events.includes('change'), `events fired: ${events}`);
  });

  await check('min/max boundaries clamp (stepUp past max is a no-op)', async () => {
    await page.fill('#d-qty', '99');
    await page.click('#ni-qty [data-action="increment"]');
    assert.equal(await value(page, 'ni-qty'), '99', 'stays at max');
    await page.fill('#d-qty', '0');
    await page.click('#ni-qty [data-action="decrement"]');
    assert.equal(await value(page, 'ni-qty'), '0', 'stays at min');
  });

  await check('decimal stepper honours step="0.5"', async () => {
    await page.click('#ni-decimal [data-action="increment"]');
    assert.equal(await value(page, 'ni-decimal'), '2');
    await page.click('#ni-decimal [data-action="decrement"]');
    await page.click('#ni-decimal [data-action="decrement"]');
    assert.equal(await value(page, 'ni-decimal'), '1');
  });

  // -- State API (AGENTS.md "State API") -------------------------------------
  const setState = (page: Page, id: string, state: string, config?: Record<string, unknown>) =>
    page.$eval(
      `#${id}`,
      (el, args) => (el as HTMLElement).api!.setState(args[0], args[1]),
      [state, config] as const,
    );

  await check("state API: setState('default', { value }) presets the number", async () => {
    await setState(page, 'ni-qty', 'default', { value: 42 });
    assert.equal(await value(page, 'ni-qty'), '42');
  });

  await check('state API: getState reports the live value (typing included)', async () => {
    await page.fill('#d-qty', '7');
    const state = await page.$eval('#ni-qty', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'default');
    assert.equal(state.config.value, '7', 'reflects the typed value, not just setState');
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#ni-qty') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: registry globals expose api + declared states (camelCase)', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.numberInputApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.numberInputStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#ni-qty'),
    }));
    assert.ok(reg.hasApi, 'df$.numberInputApi.setState missing');
    assert.deepEqual(reg.states, ['default']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });

  await check('number-input: data-size="xs" → height 28px', async () => {
    const val = await page.$eval('#z-numberinput-xs', (el) => String(el.getBoundingClientRect().height) + 'px');
    assert.equal(val, '28px');
  });
  await check('number-input: data-size="sm" → height 32px', async () => {
    const val = await page.$eval('#z-numberinput-sm', (el) => String(el.getBoundingClientRect().height) + 'px');
    assert.equal(val, '32px');
  });
  await check('number-input: data-size="md" → height 36px', async () => {
    const val = await page.$eval('#z-numberinput-md', (el) => String(el.getBoundingClientRect().height) + 'px');
    assert.equal(val, '36px');
  });
  await check('number-input: data-size="lg" → height 44px', async () => {
    const val = await page.$eval('#z-numberinput-lg', (el) => String(el.getBoundingClientRect().height) + 'px');
    assert.equal(val, '44px');
  });
  await check('number-input: data-size="xl" → height 52px', async () => {
    const val = await page.$eval('#z-numberinput-xl', (el) => String(el.getBoundingClientRect().height) + 'px');
    assert.equal(val, '52px');
  });

  const val = (id: string) => page.$eval('#' + id, (el) => (el as HTMLInputElement).value);

  await check('data-decimals formats on init (19 → 19.0, 24.9 → 24.90, 25 → 25.00)', async () => {
    assert.equal(await val('ni-temp-input'), '19.0');
    assert.equal(await val('ni-price-input'), '24.90');
    assert.equal(await val('ni-donation-input'), '25.00');
  });

  await check('data-decimals survives stepping (19.0 → 19.5 → 20.0, not "20")', async () => {
    await page.click('#ni-temp [data-action="increment"]');
    assert.equal(await val('ni-temp-input'), '19.5');
    await page.click('#ni-temp [data-action="increment"]');
    assert.equal(await val('ni-temp-input'), '20.0');
    await page.click('#ni-donation [data-action="increment"]');
    assert.equal(await val('ni-donation-input'), '30.00');
  });

  await check('data-decimals re-applies on commit, never mid-typing', async () => {
    await page.fill('#ni-temp-input', '21');
    assert.equal(await val('ni-temp-input'), '21', 'untouched while typing');
    await page.press('#ni-temp-input', 'Tab'); // blur → change
    assert.equal(await val('ni-temp-input'), '21.0');
  });

  await check("data-decimals applies to setState('default', { value }) presets", async () => {
    await page.evaluate(() => (document.getElementById('ni-price') as any).api.setState('default', { value: 7 }));
    assert.equal(await val('ni-price-input'), '7.00');
    assert.equal(await page.evaluate(() => (document.getElementById('ni-price') as any).api.getState().config.value), '7.00');
  });

  await check('unit label: part of the accessible name and focuses the field on click', async () => {
    const labels = await page.$eval('#ni-temp-input', (el) => Array.from((el as HTMLInputElement).labels ?? []).map((l) => l.textContent?.trim()));
    assert.deepEqual(labels, ['Temperature', '°C']);
    await page.click('#ni-temp-unit');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'ni-temp-input');
  });

  await check('unit label: muted affix, value aligns toward it (suffix → end, prefix → start)', async () => {
    const r = await page.evaluate(() => {
      const cs = (sel: string) => getComputedStyle(document.querySelector(sel)!);
      return {
        unitColor: cs('#ni-temp-unit').color,
        inputColor: cs('#ni-temp-input').color,
        suffixAlign: cs('#ni-temp-input').textAlign,
        prefixAlign: cs('#ni-price-input').textAlign,
      };
    });
    assert.notEqual(r.unitColor, r.inputColor, 'unit is muted against the value');
    assert.equal(r.suffixAlign, 'end');
    assert.equal(r.prefixAlign, 'start');
  });

  await check('stepper-less field pads the input at the box edge; prefix unit gets the edge padding', async () => {
    const r = await page.evaluate(() => ({
      inputEnd: getComputedStyle(document.getElementById('ni-price-input')!).paddingInlineEnd,
      unitStart: getComputedStyle(document.getElementById('ni-price-unit')!).paddingInlineStart,
    }));
    assert.equal(r.inputEnd, '12px');
    assert.equal(r.unitStart, '12px');
  });

  await check('field width is 4rem regardless of max (Chrome would size by max digits)', async () => {
    // content width (computed width, content-box): the stepper-less field adds edge padding on top
    const widths = await page.evaluate(() => ['#ni-price-input', '#ni-donation-input', '#ni-temp-input'].map((s) => getComputedStyle(document.querySelector(s)!).width));
    for (const w of widths) assert.equal(w, '64px');
  });

  // -- currency mask ----------------------------------------------------
  const field = (id: string) =>
    page.$eval('#' + id, (w) => {
      const input = w.querySelector('input:not([type="hidden"])') as HTMLInputElement;
      const unit = w.querySelector('.number-input-unit')!;
      return {
        value: input.value,
        unit: unit.textContent,
        prefix: unit.compareDocumentPosition(input) === Node.DOCUMENT_POSITION_FOLLOWING,
        number: (w as HTMLElement).dataset.value,
      };
    });

  await check('currency: each locale renders its own separators, symbol, symbol side and fraction digits', async () => {
    assert.deepEqual(await field('m-de'), { value: '1.234,50', unit: '€', prefix: false, number: '1234.5' });
    assert.deepEqual(await field('m-us'), { value: '1,234.50', unit: '$', prefix: true, number: '1234.5' });
    const jp = await field('m-jp');
    assert.equal(jp.value, '1,235', 'JPY has no minor unit');
    assert.ok(jp.prefix);
    const ch = await field('m-ch');
    assert.equal(ch.unit, 'CHF');
    assert.match(ch.value, /^1.234\.50$/, 'de-CH groups with an apostrophe-like sign');
    const fr = await field('m-fr');
    assert.match(fr.value, /^1\s234,50$/u, 'fr-FR groups with a (narrow) space');
    assert.equal(fr.prefix, false);
  });

  await check('currency: typing is masked live (grouping + locale decimal), blur pads the cents', async () => {
    await page.fill('#m-de-input', '');
    await page.type('#m-de-input', '1234567,8');
    assert.equal((await field('m-de')).value, '1.234.567,8');
    assert.equal(await page.$eval('#m-de-out', (el) => (el as HTMLInputElement).value), '1234567.8', 'form gets the machine value');
    await page.press('#m-de-input', 'Tab');
    assert.equal((await field('m-de')).value, '1.234.567,80');
  });

  await check('currency: letters are ignored, extra fraction digits are cut', async () => {
    await page.fill('#m-us-input', '');
    await page.type('#m-us-input', '12ab3.456');
    assert.equal((await field('m-us')).value, '123.45');
  });

  await check('currency: a numpad "." acts as the decimal in a comma locale (de-DE)', async () => {
    await page.fill('#m-de-input', '');
    await page.type('#m-de-input', '12.');
    assert.equal((await field('m-de')).value, '12,');
    await page.type('#m-de-input', '5');
    assert.equal((await field('m-de')).value, '12,5');
  });

  await check('currency: the caret stays after the digit you typed while groups move', async () => {
    await page.fill('#m-de-input', '');
    await page.type('#m-de-input', '234567');
    await page.$eval('#m-de-input', (el) => (el as HTMLInputElement).setSelectionRange(0, 0));
    await page.keyboard.type('1');
    const r = await page.$eval('#m-de-input', (el) => [(el as HTMLInputElement).value, (el as HTMLInputElement).selectionStart]);
    assert.deepEqual(r, ['1.234.567', 1]);
  });

  await check('currency: JPY ignores a decimal separator entirely', async () => {
    await page.fill('#m-jp-input', '');
    await page.type('#m-jp-input', '1234.5');
    assert.equal((await field('m-jp')).value, '12,345');
  });

  await check('currency: steppers + ArrowUp/Down nudge by data-step, clamped at data-min', async () => {
    await page.$eval('#m-de', (w: any) => w.api.setState('default', { value: 7 }));
    await page.click('#m-de [data-action="decrement"]');
    assert.equal((await field('m-de')).value, '2,00');
    await page.click('#m-de [data-action="decrement"]');
    assert.equal((await field('m-de')).value, '0,00', 'clamped at data-min=0');
    await page.focus('#m-de-input');
    await page.keyboard.press('ArrowUp');
    assert.equal((await field('m-de')).value, '5,00');
  });

  await check('currency: switching data-locale re-renders the same amount (symbol moves sides)', async () => {
    await page.$eval('#m-de', (w: any) => w.api.setState('default', { value: 1234.5 }));
    await page.$eval('#m-de', (w) => w.setAttribute('data-locale', 'en-US'));
    await page.waitForFunction(() => (document.getElementById('m-de-input') as HTMLInputElement).value === '1,234.50');
    const f = await field('m-de');
    assert.deepEqual([f.value, f.unit, f.prefix, f.number], ['1,234.50', '€', true, '1234.5']);
    await page.$eval('#m-de', (w) => w.setAttribute('data-locale', 'de-DE'));
    await page.waitForFunction(() => (document.getElementById('m-de-input') as HTMLInputElement).value === '1.234,50');
  });

  await check('currency: a trip through JPY rounds the display, never the remembered amount', async () => {
    await page.$eval('#m-us', (w: any) => w.api.setState('default', { value: 1234567.8 }));
    await page.$eval('#m-us', (w) => { w.setAttribute('data-currency', 'JPY'); w.setAttribute('data-locale', 'ja-JP'); });
    await page.waitForFunction(() => (document.getElementById('m-us-input') as HTMLInputElement).value === '1,234,568');
    await page.$eval('#m-us', (w) => { w.setAttribute('data-currency', 'USD'); w.setAttribute('data-locale', 'en-US'); });
    await page.waitForFunction(() => (document.getElementById('m-us-input') as HTMLInputElement).value === '1,234,567.80');
  });

  await check("currency state API: setState takes the machine number, getState reports value + number + locale", async () => {
    const c = await page.$eval('#m-de', (w: any) => { w.api.setState('default', { value: 99.9 }); return w.api.getState().config; });
    assert.deepEqual([c.value, c.number, c.currency, c.locale], ['99,90', '99.9', 'EUR', 'de-DE']);
  });

  await check('currency: a hidden data-number-output next to the unit does not flip the alignment', async () => {
    // m-de: [−][text][€][hidden output][+] - the hidden input sits right after
    // the unit and must not count as a "prefix-unit + input" pair
    assert.equal(await page.$eval('#m-de-input', (el) => getComputedStyle(el).textAlign), 'end');
  });

  await check('units are part of the text (copy / reader / export), not user-select:none', async () => {
    const r = await page.evaluate(() => ({
      select: getComputedStyle(document.querySelector('#ni-temp-unit')!).userSelect,
      text: (document.getElementById('m-de') as HTMLElement).innerText.replace(/\s+/g, ' '),
    }));
    assert.notEqual(r.select, 'none');
    assert.match(r.text, /€/);
  });

  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await assertRenderContract(page, '.number-input[id]', ['default']);
  });

} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nnumber-input.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('number-input.e2e: all checks passed');
