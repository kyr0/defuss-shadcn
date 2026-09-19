import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped accordion component. Loads the fixture
 * (every accordion configuration at once) over HTTP in a real browser, then
 * verifies component CSS was applied and accordion.js wiring works — the same
 * files consumers copy from dist/, unmodified.
 */

const FIXTURE = '/tests/e2e/accordion.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

/** Polls the open[] flags of an accordion's items until they match `expected`. */
async function expectOpen(page: Page, id: string, expected: boolean[], label: string): Promise<void> {
  let actual: boolean[] = [];
  for (let i = 0; i < 100; i++) {
    // selector targets <details class="accordion-item"> — Playwright can't infer
    // that from the string, so annotate for `.open`
    actual = await page.$$eval(`#${id} .accordion-item`, (els: HTMLDetailsElement[]) => els.map((el) => el.open));
    if (actual.join(',') === expected.join(',')) return;
    await page.waitForTimeout(20);
  }
  assert.fail(`${label}: #${id} expected [${expected}] but got [${actual}]`);
}

const clickItem = (page: Page, id: string, n: number) =>
  page.click(`#${id} .accordion-item[data-item="${n}"] > summary`);

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

  await check('accordion.js initialized every single-open accordion (data-init)', async () => {
    // multi-open accordions need no JS, so only data-type="single" wrappers get tagged
    await page.waitForFunction(
      () =>
        document.querySelectorAll('.accordion[data-type="single"]:not([data-init])').length === 0,
    );
  });

  await check('initial open state matches each configuration', async () => {
    await expectOpen(page, 'multi', [true, false, false], 'initial');
    await expectOpen(page, 'single', [true, false, false], 'initial');
    await expectOpen(page, 'collapsible', [true, false, false], 'initial');
    await expectOpen(page, 'bordered', [false, false], 'initial');
    await expectOpen(page, 'card', [true, false], 'initial');
  });

  await check('accordion.css applied (wrapper flex, open chevron rotated)', async () => {
    const styles = await page.$eval('#multi', (el) => getComputedStyle(el).display);
    assert.equal(styles, 'flex', 'accordion wrapper should be display:flex');
    const chevron = await page.$eval(
      '#multi .accordion-item[data-item="1"] .accordion-chevron',
      (el) => getComputedStyle(el).transform,
    );
    assert.match(chevron, /matrix\(\s*-1/, 'open item chevron should be rotated 180deg');
  });

  await check('multi-open: several items can stay open', async () => {
    await clickItem(page, 'multi', 2);
    await clickItem(page, 'multi', 3);
    await expectOpen(page, 'multi', [true, true, true], 'multi-open');
  });

  await check('single-open: opening an item closes its siblings', async () => {
    await clickItem(page, 'single', 2);
    await expectOpen(page, 'single', [false, true, false], 'after opening 2');
    await clickItem(page, 'single', 3);
    await expectOpen(page, 'single', [false, false, true], 'after opening 3');
  });

  await check('single-open (not collapsible): clicking the last open item is a no-op (no flicker)', async () => {
    // Regression guard: the close is denied in the cancellable beforetoggle
    // event, so `open` must stay true the WHOLE time. Reopening in `toggle`
    // (the old way) flickers visibly now that the panel animates.
    await page.click('#single .accordion-item[data-item="3"] > summary');
    await page.waitForTimeout(250);
    await expectOpen(page, 'single', [false, false, true], 'stays open, never flipped');
    // ...and it never even *started* closing: arm a toggle recorder on the
    // open item, click it with real input, then read what was recorded.
    await page.evaluate(() => {
      const d = document.querySelector('#single .accordion-item[data-item="3"]') as HTMLDetailsElement;
      d.dataset.sawClose = 'false';
      d.addEventListener('toggle', () => {
        if (!d.open) d.dataset.sawClose = 'true';
      });
    });
    await clickItem(page, 'single', 3);
    await page.waitForTimeout(250);
    const sawClose = await page.$eval('#single .accordion-item[data-item="3"]', (el) => el.dataset.sawClose);
    assert.equal(sawClose, 'false', 'open item fired a closing toggle — the beforetoggle deny did not take effect');
    await expectOpen(page, 'single', [false, false, true], 'still open after click');
  });

  await check('collapsible single: allows all items closed', async () => {
    await clickItem(page, 'collapsible', 1);
    await expectOpen(page, 'collapsible', [false, false, false], 'all closed');
    await clickItem(page, 'collapsible', 2);
    await expectOpen(page, 'collapsible', [false, true, false], 're-opened one');
  });

  await check('bordered variant toggles independently (multi-open)', async () => {
    await clickItem(page, 'bordered', 1);
    await clickItem(page, 'bordered', 2);
    await expectOpen(page, 'bordered', [true, true], 'both open');
  });

  await check('card-wrapped single-open works inside a card', async () => {
    await clickItem(page, 'card', 2);
    await expectOpen(page, 'card', [false, true], 'card 2 open');
  });

  await check('panel animates open (block-size interpolates 0 → auto, no snap)', async () => {
    // Regression guard: the ::details-content transition needs BOTH the
    // compound selector (`&::details-content`) and `interpolate-size:
    // allow-keywords`; with either missing, block-size jumps 0 → final in one
    // frame and mid-transition samples are all-or-nothing.
    const samples = await page.evaluate(async () => {
      const d = document.querySelector('#multi .accordion-item[data-item="1"]') as HTMLDetailsElement;
      const size = () => parseFloat(getComputedStyle(d, '::details-content').blockSize);
      d.open = true;
      await new Promise((r) => setTimeout(r, 250));
      const full = size();
      d.open = false;
      await new Promise((r) => setTimeout(r, 250));
      d.open = true;
      const out: number[] = [];
      for (let i = 0; i < 5; i++) {
        out.push(size());
        await new Promise((r) => setTimeout(r, 25));
      }
      return { full, out };
    });
    assert.ok(samples.full > 0, 'open panel should have height');
    const mid = samples.out.some((s) => s > 0 && s < samples.full - 1);
    assert.ok(mid, `expected an intermediate height during opening, got [${samples.out}] of ${samples.full}`);
  });

  await check('keyboard: Enter toggles the focused summary (native)', async () => {
    await page.focus('#multi .accordion-item[data-item="1"] > summary');
    await page.keyboard.press('Enter');
    await expectOpen(page, 'multi', [false, true, true], 'after Enter');
    await page.keyboard.press('Enter');
    await expectOpen(page, 'multi', [true, true, true], 'after second Enter');
  });

  // -- State API (AGENTS.md "State API"): agents drive states by name --------
  const setState = (id: string, state: string) =>
    page.$eval(`#${id}`, (el, s) => (el as HTMLElement).api!.setState(s), state);

  await check('state API: default state reported for bound instances', async () => {
    const state = await page.$eval('#single', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'default');
    assert.deepEqual(state.config, {});
  });

  await check('state API: setState("all-open") opens every item', async () => {
    await setState('single', 'all-open');
    await expectOpen(page, 'single', [true, true, true], 'all-open');
    const state = await page.$eval('#single', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'all-open');
  });

  await check('state API: setState("all-closed") even on non-collapsible', async () => {
    await setState('single', 'all-closed');
    await expectOpen(page, 'single', [false, false, false], 'all-closed');
  });

  await check('state API: setState("default") restores the authored markup', async () => {
    await setState('single', 'default');
    await expectOpen(page, 'single', [true, false, false], 'back to default');
    const state = await page.$eval('#single', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'default');
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#single') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: per-instance isolation (sibling unaffected)', async () => {
    // read the sibling first — earlier tests clicked it, its pattern is whatever it is
    const before = await page.$$eval('#collapsible .accordion-item', (els: HTMLDetailsElement[]) => els.map((el) => el.open));
    await setState('single', 'all-open');
    await expectOpen(page, 'single', [true, true, true], 'single all-open');
    await expectOpen(page, 'collapsible', before, 'collapsible untouched');
    await setState('single', 'default');
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.accordionApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.accordionStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#single'),
    }));
    assert.ok(reg.hasApi, 'df$.accordionApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'all-open', 'all-closed']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });

  await check('accordion: density "compact" → padding-top 12px', async () => {
    const val = await page.$eval('#acc-compact .accordion-trigger', (el) => getComputedStyle(el).paddingTop);
    assert.equal(val, '12px');
  });

  await check('accordion: density "comfortable" → padding-top 16px', async () => {
    const val = await page.$eval('#acc-comfortable .accordion-trigger', (el) => getComputedStyle(el).paddingTop);
    assert.equal(val, '16px');
  });

  await check('accordion: density "spacious" → padding-top 20px', async () => {
    const val = await page.$eval('#acc-spacious .accordion-trigger', (el) => getComputedStyle(el).paddingTop);
    assert.equal(val, '20px');
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\naccordion.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('accordion.e2e: all checks passed');
