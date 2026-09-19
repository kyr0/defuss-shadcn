import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped carousel component. Loads the fixture
 * (default carousel with buttons + dots/counter composition, mirroring the
 * doc page) over HTTP in a real browser, then verifies ARIA wiring,
 * prev/next + dot + keyboard navigation, boundary button states, the
 * auto-generated dots, and the named State API (index preset + live index) —
 * the same files consumers copy from dist/, unmodified.
 */

const FIXTURE = '/tests/e2e/carousel.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

/** Wait until the IntersectionObserver has settled on `index`. */
async function waitForIndex(page: Page, id: string, index: number): Promise<void> {
  await page.waitForFunction(
    (args) => (document.querySelector(`#${args[0]}`) as HTMLElement).dataset.currentIndex === String(args[1]),
    [id, index] as const,
  );
}

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

  await check('carousel.js initialized + ARIA wiring (roledescription, focusable)', async () => {
    await page.waitForFunction(
      () => document.querySelectorAll('.carousel:not([data-init])').length === 0,
    );
    const aria = await page.evaluate(() => {
      const car = document.querySelector('#car-default')!;
      const slide = car.querySelector('.carousel-slide')!;
      return {
        rd: car.getAttribute('aria-roledescription'),
        tabindex: car.getAttribute('tabindex'),
        slideRd: slide.getAttribute('aria-roledescription'),
        slideLabel: slide.getAttribute('aria-label'),
      };
    });
    assert.equal(aria.rd, 'carousel');
    assert.equal(aria.tabindex, '0', 'region is focusable for keyboard nav');
    assert.equal(aria.slideRd, 'slide');
    assert.equal(aria.slideLabel, '1 of 3');
  });

  await check('initial state: first slide active, prev disabled (non-loop)', async () => {
    assert.equal(await page.$eval('#car-default .carousel-prev', (el) => (el as HTMLButtonElement).disabled), true);
    assert.equal(await page.$eval('#car-default .carousel-next', (el) => (el as HTMLButtonElement).disabled), false);
    assert.equal(await page.$eval('#car-default', (el) => el.dataset.currentIndex), '0');
  });

  await check('next button advances the slide and toggles button states', async () => {
    await page.click('#car-default .carousel-next');
    await waitForIndex(page, 'car-default', 1);
    assert.equal(await page.$eval('#car-default .carousel-prev', (el) => (el as HTMLButtonElement).disabled), false);
  });

  await check('last slide disables next', async () => {
    await page.click('#car-default .carousel-next');
    await waitForIndex(page, 'car-default', 2);
    assert.equal(await page.$eval('#car-default .carousel-next', (el) => (el as HTMLButtonElement).disabled), true);
  });

  await check('prev walks back to the first slide', async () => {
    await page.click('#car-default .carousel-prev');
    await waitForIndex(page, 'car-default', 1);
    await page.click('#car-default .carousel-prev');
    await waitForIndex(page, 'car-default', 0);
    assert.equal(await page.$eval('#car-default .carousel-prev', (el) => (el as HTMLButtonElement).disabled), true);
  });

  await check('arrow keys + Home/End navigate', async () => {
    await page.focus('#car-default');
    await page.keyboard.press('ArrowRight');
    await waitForIndex(page, 'car-default', 1);
    await page.keyboard.press('End');
    await waitForIndex(page, 'car-default', 2);
    await page.keyboard.press('Home');
    await waitForIndex(page, 'car-default', 0);
  });

  await check('dots are auto-generated, clickable, and track aria-current', async () => {
    const count = await page.$$eval('#car-dots .carousel-dot', (els) => els.length);
    assert.equal(count, 2, 'one dot per slide');
    await page.click('#car-dots .carousel-dot:nth-child(2)');
    await waitForIndex(page, 'car-dots', 1);
    const currents = await page.$$eval('#car-dots .carousel-dot', (els) =>
      els.map((el) => el.getAttribute('aria-current')),
    );
    assert.deepEqual(currents, ['false', 'true'], 'active dot marked');
    assert.equal(
      await page.$eval('#car-dots .carousel-counter', (el) => el.textContent),
      'Slide 2 of 2',
      'counter text updated',
    );
  });

  // -- State API (AGENTS.md "State API") -------------------------------------
  await check("state API: setState('default', { index }) scrolls to that slide", async () => {
    await page.$eval('#car-default', (el) =>
      (el as HTMLElement).api!.setState('default', { index: 2 }),
    );
    await waitForIndex(page, 'car-default', 2);
    const state = await page.$eval('#car-default', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'default');
    assert.equal(state.config.index, 2, 'live index mirrored into config');
  });

  await check("state API: setState('default') with no config returns to slide 0", async () => {
    await page.$eval('#car-default', (el) => (el as HTMLElement).api!.setState('default'));
    await waitForIndex(page, 'car-default', 0);
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#car-default') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.carouselApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.carouselStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#car-default'),
    }));
    assert.ok(reg.hasApi, 'df$.carouselApi.setState missing');
    assert.deepEqual(reg.states, ['default']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\ncarousel.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('carousel.e2e: all checks passed');
