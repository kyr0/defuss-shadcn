import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

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

} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nnumber-input.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('number-input.e2e: all checks passed');
