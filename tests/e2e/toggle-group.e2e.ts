import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped toggle-group component. Loads the
 * fixture (single/multiple types, outline + sizes + vertical, disabled group,
 * mirroring the doc page) over HTTP in a real browser, then verifies selection
 * semantics per type, roving tabindex + arrow keys, the documented
 * data-disabled behavior, and the named State API — the same files consumers
 * copy from dist/, unmodified.
 */

const FIXTURE = '/tests/e2e/toggle-group.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const pressedStates = (page: Page, id: string) =>
  page.$$eval(`#${id} .toggle`, (els) => els.map((el) => el.getAttribute('aria-pressed')));

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

  await check('toggle-group.js initialized groups (data-init)', async () => {
    await page.waitForFunction(
      () => document.querySelectorAll('.toggle-group:not([data-init])').length === 0,
    );
  });

  await check('roving tabindex: exactly one item tabbable per group', async () => {
    const tabbables = await page.$$eval('#group-single .toggle', (els) =>
      els.map((el) => el.getAttribute('tabindex')),
    );
    assert.equal(tabbables.filter((t) => t === '0').length, 1, 'one tabbable item');
    // the pressed item gets the roving stop
    assert.equal(tabbables[0], '0', 'pressed item is tabbable');
  });

  await check('single type: selection is exclusive and re-click deselects', async () => {
    await page.click('#group-single .toggle:nth-child(2)');
    assert.deepEqual(await pressedStates(page, 'group-single'), ['false', 'true', 'false']);
    await page.click('#group-single .toggle:nth-child(2)');
    assert.deepEqual(await pressedStates(page, 'group-single'), ['false', 'false', 'false'], 're-press deselects');
  });

  await check('multiple type: any combination can be pressed', async () => {
    await page.click('#group-multiple .toggle:nth-child(2)');
    assert.deepEqual(await pressedStates(page, 'group-multiple'), ['true', 'true', 'false']);
    await page.click('#group-multiple .toggle:nth-child(1)');
    assert.deepEqual(await pressedStates(page, 'group-multiple'), ['false', 'true', 'false'], 'toggle off works');
  });

  await check('arrow keys roam and move the roving stop', async () => {
    await page.focus('#group-single .toggle:nth-child(1)');
    await page.keyboard.press('ArrowRight');
    const focused = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#group-single .toggle')).indexOf(
        document.activeElement as Element,
      ),
    );
    assert.equal(focused, 1, 'focus moved right');
    await page.keyboard.press('End');
    assert.equal(
      await page.$eval('#group-single .toggle:nth-child(3)', (el) => el.getAttribute('tabindex')),
      '0',
      'End parked the roving stop on the last item',
    );
  });

  await check('vertical orientation uses Up/Down', async () => {
    await page.focus('#group-vertical .toggle:nth-child(1)');
    await page.keyboard.press('ArrowDown');
    assert.equal(
      await page.$eval('#group-vertical .toggle:nth-child(2)', (el) => el.getAttribute('tabindex')),
      '0',
      'ArrowDown moved the stop',
    );
  });

  await check('connected corners: middle items fully square, ends rounded outward (issue #12)', async () => {
    const radii = (sel: string) =>
      page.$eval(sel, (el) => {
        const s = getComputedStyle(el);
        return [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius];
      });
    // actual rounded radius (--radius-md as computed on this page) — no hardcoded px
    const R = (await radii('#group-vertical .toggle:first-child'))[0];
    assert.notEqual(R, '0px', 'first item keeps its outer radius');
    // horizontal middle: no rounded corners at all
    assert.deepEqual(await radii('#group-single .toggle:nth-child(2)'), ['0px', '0px', '0px', '0px']);
    // vertical middle: same — the old rules re-rounded its top-right corner (the notch)
    assert.deepEqual(await radii('#group-vertical .toggle:nth-child(2)'), ['0px', '0px', '0px', '0px']);
    // vertical ends: rounded on the outward side, square toward the neighbour
    assert.deepEqual(await radii('#group-vertical .toggle:first-child'), [R, R, '0px', '0px']);
    assert.deepEqual(await radii('#group-vertical .toggle:last-child'), ['0px', '0px', R, R]);
    // data-spacing keeps individual full radii — its later rule must still beat
    // the :where()-wrapped corner rules regardless of orientation
    assert.deepEqual(await radii('#group-spaced .toggle:nth-child(2)'), [R, R, R, R]);
  });

  await check('outline variant + full size scale propagate to children (css)', async () => {
    const heights = await page.evaluate(() =>
      ['xs', 'sm', 'md', 'lg', 'xl'].map(
        (s) => document.querySelector(`#group-outline-${s} .toggle`)!.getBoundingClientRect().height,
      ),
    );
    assert.deepEqual(heights, [28, 32, 36, 40, 48], 'group data-size drives every child .toggle');
    const border = await page.$eval('#group-outline-sm .toggle', (el) =>
      getComputedStyle(el).borderTopWidth,
    );
    assert.notEqual(border, '0px', 'outline variant is bordered');
  });

  await check('disabled group ignores clicks (data-disabled)', async () => {
    await page.click('#group-disabled .toggle', { force: true });
    assert.deepEqual(await pressedStates(page, 'group-disabled'), ['false']);
  });

  // -- State API (AGENTS.md "State API") -------------------------------------
  const setState = (page: Page, id: string, state: string) =>
    page.$eval(`#${id}`, (el, s) => (el as HTMLElement).api!.setState(s), state);

  await check("state API: setState('disabled') sets the documented data-disabled attribute", async () => {
    await setState(page, 'group-single', 'disabled');
    const flag = await page.$eval('#group-single', (el) => el.hasAttribute('data-disabled'));
    assert.equal(flag, true);
    const state = await page.$eval('#group-single', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'disabled');
    await page.click('#group-single .toggle:nth-child(1)', { force: true });
    assert.equal(
      await page.$eval('#group-single .toggle:nth-child(1)', (el) => el.getAttribute('aria-pressed')),
      'false',
      'disabled group stays inert',
    );
  });

  await check("state API: setState('default') re-enables the group", async () => {
    await setState(page, 'group-single', 'default');
    assert.equal(await page.$eval('#group-single', (el) => el.hasAttribute('data-disabled')), false);
    await page.click('#group-single .toggle:nth-child(1)');
    assert.equal(
      await page.$eval('#group-single .toggle:nth-child(1)', (el) => el.getAttribute('aria-pressed')),
      'true',
      'clicks work again',
    );
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#group-single') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: registry globals expose api + declared states (camelCase)', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis._defussShadcn?.toggleGroupApi?.setState === 'function',
      states: globalThis._defussShadcn?.toggleGroupStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#group-single'),
    }));
    assert.ok(reg.hasApi, '_defussShadcn.toggleGroupApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'disabled']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\ntoggle-group.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('toggle-group.e2e: all checks passed');
