import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: E2E smoke test for the shipped tooltip component. Loads the fixture
 * (zero/default delay, every documented side + align, scroll spacer) over
 * HTTP in a real browser, then verifies hover show/hide, ARIA wiring, side
 * offsets, scroll dismiss, and the named State API - the same files consumers
 * copy from dist/, unmodified.
 */

const FIXTURE = '/tests/e2e/tooltip.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

/** :popover-open match state of a tooltip. */
const isOpen = (page: Page, id: string) =>
  page.$eval(`#${id}`, (el) => el.matches(':popover-open'));

/** Move the pointer far away from any trigger (mouseleave without new mouseenter). */
const parkPointer = (page: Page) => page.mouse.move(5, 5);

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

  await check('tooltip.js initialized triggers + tips (data-init)', async () => {
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-tooltip-trigger]:not([data-init])').length === 0 &&
        document.querySelectorAll('.tooltip[popover]:not([data-init])').length === 0,
    );
  });

  await check('tooltip.css applied (primary surface)', async () => {
    const style = await page.$eval('#tip-instant', (el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, color: cs.color, radius: cs.borderTopLeftRadius };
    });
    assert.notEqual(style.bg, 'rgba(0, 0, 0, 0)', 'tooltip must use the primary surface');
    assert.notEqual(style.color, 'rgba(0, 0, 0, 0)', 'text color from primary-foreground');
    assert.notEqual(style.radius, '0px', 'rounded corners');
  });

  await check('aria-describedby links trigger to tooltip', async () => {
    const linked = await page.$eval('[data-tooltip-trigger="tip-instant"]', (el) =>
      el.getAttribute('aria-describedby'),
    );
    assert.equal(linked, 'tip-instant');
  });

  await check('anchor positioning wired', async () => {
    const pair = await page.evaluate(() => {
      const trigger = document.querySelector('[data-tooltip-trigger="tip-instant"]') as HTMLElement;
      const tip = document.querySelector('#tip-instant') as HTMLElement;
      return { anchor: trigger.style.anchorName, uses: tip.style.positionAnchor };
    });
    assert.ok(pair.anchor.startsWith('--tooltip-'), 'trigger needs an anchor name');
    assert.equal(pair.uses, pair.anchor);
  });

  await check('hover shows the zero-delay tooltip; leaving hides it', async () => {
    await page.hover('[data-tooltip-trigger="tip-instant"]');
    await page.waitForFunction(() => document.querySelector('#tip-instant')!.matches(':popover-open'));
    await parkPointer(page);
    await page.waitForFunction(() => !document.querySelector('#tip-instant')!.matches(':popover-open'));
  });

  // side variants: each documented side gets its 6px offset margin (tooltip.css)
  await check('side variants apply their offset margins', async () => {
    const margins = await page.evaluate(() => {
      const m = (id: string) => {
        const cs = getComputedStyle(document.querySelector(id) as HTMLElement);
        return [cs.marginTop, cs.marginBottom, cs.marginLeft, cs.marginRight];
      };
      return { top: m('#tip-top'), bottom: m('#tip-bottom'), left: m('#tip-left'), right: m('#tip-right') };
    });
    assert.deepEqual(margins.top, ['0px', '6px', '0px', '0px'], 'top (default): margin-bottom 6px');
    assert.deepEqual(margins.bottom, ['6px', '0px', '0px', '0px'], 'bottom: margin-top 6px');
    assert.deepEqual(margins.left, ['0px', '0px', '0px', '6px'], 'left: margin-right 6px');
    assert.deepEqual(margins.right, ['0px', '0px', '6px', '0px'], 'right: margin-left 6px');
  });

  await check('arrow caret shows outside the box without a scrollbar', async () => {
    // regression: the UA popover stylesheet sets overflow:auto - the [data-arrow]
    // caret sits 4px outside the border box, so it was clipped to a sliver and
    // the text overflow produced a scrollbar inside the tooltip
    await page.evaluate(() => (document.querySelector('#tip-arrow') as HTMLElement).api!.setState('visible'));
    // safeShowPopover defers a frame - measure only once actually open
    await page.waitForFunction(() => document.querySelector('#tip-arrow')!.matches(':popover-open'));
    const geo = await page.evaluate(() => {
      const tip = document.querySelector('#tip-arrow') as HTMLElement;
      const cs = getComputedStyle(tip);
      const arrow = tip.querySelector('[data-arrow]') as HTMLElement;
      const ar = arrow.getBoundingClientRect();
      const tr = tip.getBoundingClientRect();
      const res = {
        overflow: cs.overflow,
        pokesOut: ar.bottom > tr.bottom + 2 || ar.top < tr.top - 2 || ar.left < tr.left - 2 || ar.right > tr.right + 2,
      };
      tip.api!.setState('default');
      return res;
    });
    // only auto/scroll render scrollbars; 'visible' (our override of the UA's
    // auto) can never scroll, which is what removed the bogus scrollbar.
    // (scrollWidth would still count the caret's ink overflow - a measurement
    // quirk, not a scrollbar - so don't assert on it.)
    assert.equal(geo.overflow, 'visible', 'overflow:auto (UA) would clip the caret');
    assert.equal(geo.pokesOut, true, 'caret protrudes from the box edge');
  });

  await check('scroll dismisses an open tooltip', async () => {
    await page.hover('[data-tooltip-trigger="tip-instant"]');
    await page.waitForFunction(() => document.querySelector('#tip-instant')!.matches(':popover-open'));
    await page.evaluate(() => window.scrollTo(0, 100));
    await page.waitForFunction(() => !document.querySelector('#tip-instant')!.matches(':popover-open'));
    await page.evaluate(() => window.scrollTo(0, 0));
  });

  // -- State API (AGENTS.md "State API") -------------------------------------
  const setState = (page: Page, id: string, state: string) =>
    page.$eval(`#${id}`, (el, s) => (el as HTMLElement).api!.setState(s), state);

  await check("state API: setState('visible') shows immediately (no delay)", async () => {
    await setState(page, 'tip-default', 'visible');
    assert.equal(await isOpen(page, 'tip-default'), true, 'visible state must show the tooltip');
    const state = await page.$eval('#tip-default', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'visible');
  });

  await check("state API: setState('default') hides it", async () => {
    await setState(page, 'tip-default', 'default');
    assert.equal(await isOpen(page, 'tip-default'), false, 'default state = hidden');
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#tip-default') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.tooltipApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.tooltipStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#tip-default'),
    }));
    assert.ok(reg.hasApi, 'df$.tooltipApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'visible']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });
  await check('data-align start / end: the tooltip shares the trigger\'s start / end edge, above it', async () => {
    for (const [id, edge] of [['tt-align-start', 'left'], ['tt-align-end', 'right']] as const) {
      await page.hover('#' + id + '-btn'); // like a user: the trigger anchors its tooltip
      await page.waitForFunction((id) => document.getElementById(id)!.matches(':popover-open'), id, { timeout: 3000 });
      await page.waitForTimeout(250);
      const r = await page.evaluate(([id, edge]) => {
        const trigger = document.getElementById(id + '-btn')!.getBoundingClientRect();
        const tip = document.getElementById(id)!.getBoundingClientRect();
        return { diff: Math.round(Math.abs(tip[edge as 'left' | 'right'] - trigger[edge as 'left' | 'right'])), above: tip.bottom <= trigger.top + 1 };
      }, [id, edge]);
      assert.deepEqual(r, { diff: 0, above: true }, id);
      await page.mouse.move(0, 0);
      await page.waitForTimeout(300);
    }
  });

  // LAST (AGENTS.md "State API" → render): the contract reloads the page
  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await assertRenderContract(page, '.tooltip[popover][id]', ['default','visible'], { runtimeAttrs: ['style'] });
  });

} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\ntooltip.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('tooltip.e2e: all checks passed');
