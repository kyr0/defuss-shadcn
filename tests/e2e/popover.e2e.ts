import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped popover component. Loads the fixture
 * (default + side + align variants, mirroring the doc page) over HTTP in a
 * real browser, then verifies CSS anchor wiring, popovertarget toggling, the
 * side-variant offsets, and the named State API — the same files consumers
 * copy from dist/, unmodified.
 */

const FIXTURE = '/tests/e2e/popover.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

/** :popover-open match state of an element. */
const isOpen = (page: Page, id: string) =>
  page.$eval(`#${id}`, (el) => el.matches(':popover-open'));

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

  await check('popover.js initialized triggers + popovers (data-init)', async () => {
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[popovertarget]:not([data-init])').length === 0 &&
        document.querySelectorAll('.popover[popover]:not([data-init])').length === 0,
    );
  });

  await check('popover.css applied (surface + width)', async () => {
    const style = await page.$eval('#pop-default', (el) => {
      const cs = getComputedStyle(el);
      return {
        width: cs.width,
        padding: cs.paddingInlineStart,
        bg: cs.backgroundColor,
        radius: cs.borderRadius,
      };
    });
    assert.equal(style.width, '320px', 'width: 20rem');
    assert.equal(style.padding, '16px', 'padding: 1rem');
    assert.notEqual(style.bg, 'rgba(0, 0, 0, 0)', 'popover surface must be opaque');
    // --radius-xl = calc(0.625rem + 4px) = 14px (default-semantic-tokens.css)
    assert.equal(style.radius, '14px', 'radius: var(--radius-xl)');
  });

  await check('anchor positioning wired (unique anchor per trigger/popover)', async () => {
    const pair = await page.evaluate(() => {
      const trigger = document.querySelector('[popovertarget="pop-default"]') as HTMLElement;
      const popover = document.querySelector('#pop-default') as HTMLElement;
      return { anchor: trigger.style.anchorName, uses: popover.style.positionAnchor };
    });
    assert.ok(pair.anchor.startsWith('--popover-'), 'trigger needs an anchor name');
    assert.equal(pair.uses, pair.anchor, 'popover must use its trigger anchor');
  });

  await check('popovertarget opens and closes the popover', async () => {
    await page.click('[popovertarget="pop-default"]');
    assert.equal(await isOpen(page, 'pop-default'), true);
    await page.click('[popovertarget="pop-default"]');
    assert.equal(await isOpen(page, 'pop-default'), false);
  });

  // side variants: the CSS gives each side a 4px offset margin (popover.css)
  await check('side variants apply their offset margins', async () => {
    const margins = await page.evaluate(() => {
      const m = (id: string) => {
        const cs = getComputedStyle(document.querySelector(id) as HTMLElement);
        return [cs.marginTop, cs.marginBottom, cs.marginLeft, cs.marginRight];
      };
      return { default: m('#pop-default'), top: m('#pop-top'), left: m('#pop-left'), right: m('#pop-right') };
    });
    assert.deepEqual(margins.default, ['4px', '0px', '0px', '0px'], 'bottom (default): margin-top 4px');
    assert.deepEqual(margins.top, ['0px', '4px', '0px', '0px'], 'top: margin-bottom 4px');
    assert.deepEqual(margins.left, ['0px', '0px', '0px', '4px'], 'left: margin-right 4px');
    assert.deepEqual(margins.right, ['0px', '0px', '4px', '0px'], 'right: margin-left 4px');
  });

  // -- State API (AGENTS.md "State API") -------------------------------------
  const setState = (page: Page, id: string, state: string) =>
    page.$eval(`#${id}`, (el, s) => (el as HTMLElement).api!.setState(s), state);

  await check("state API: setState('open') shows it, getState reports it", async () => {
    await setState(page, 'pop-default', 'open');
    // the deferred show waits out any running exit transition (≤500ms cap)
    await page.waitForFunction(() => document.querySelector('#pop-default')!.matches(':popover-open'));
    const state = await page.$eval('#pop-default', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'open');
  });

  await check("state API: setState('default') hides it", async () => {
    await setState(page, 'pop-default', 'default');
    assert.equal(await isOpen(page, 'pop-default'), false, 'default state = hidden');
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#pop-default') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  // -- Density: content padding 12/16/20px ----------------------------------
  await check('data-density scales .popover padding to 12/16/20px', async () => {
    const pads = await page.evaluate(() =>
      ['pop-den-compact', 'pop-den-comfortable', 'pop-den-spacious'].map(
        (id) => getComputedStyle(document.getElementById(id)!).padding,
      ),
    );
    assert.deepEqual(pads, ['12px', '16px', '20px'], `density paddings, got ${pads.join(' / ')}`);
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis._defussShadcn?.popoverApi?.setState === 'function',
      states: globalThis._defussShadcn?.popoverStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#pop-default'),
    }));
    assert.ok(reg.hasApi, '_defussShadcn.popoverApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'open']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\npopover.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('popover.e2e: all checks passed');
