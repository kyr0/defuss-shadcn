import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

/**
 * Why: E2E smoke test for the shipped carousel component. Loads the fixture
 * (default carousel with buttons + dots/counter composition, mirroring the
 * doc page) over HTTP in a real browser, then verifies ARIA wiring,
 * prev/next + dot + keyboard navigation, boundary button states, the
 * auto-generated dots, and the named State API (index preset + live index) —
 * the same files consumers copy from dist/, unmodified.
 */

const FIXTURE = '/tests/e2e/data-display/carousel.e2e-fixture.html';
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
    // §3: dots are morph-rendered with stable ids keyed on slide position
    const ids = await page.$$eval('#car-dots .carousel-dot', (els) => els.map((el) => el.id));
    assert.deepEqual(ids, ['car-dots-dot-0', 'car-dots-dot-1'], 'dots carry <carouselId>-dot-<i> ids');
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

  await check('several slides in view: the current slide is the first shown, Prev / Next move a page, Next stops at the end', async () => {
    const shown = () =>
      page.$eval('#car-multi', (car) => {
        const vp = car.querySelector('.carousel-viewport')!.getBoundingClientRect();
        return [...car.querySelectorAll('.carousel-slide')]
          .filter((s) => {
            const r = s.getBoundingClientRect();
            return r.left >= vp.left - 1 && r.right <= vp.right + 1;
          })
          .map((s) => s.textContent!.trim())
          .join(',');
      });
    const counter = () => page.$eval('#car-multi .carousel-counter', (el) => el.textContent);
    // the smooth scroll ends where it snapped: the slides wholly in view
    const settle = (want: string) =>
      page.waitForFunction(
        (want) => {
          const car = document.getElementById('car-multi')!;
          const vp = car.querySelector('.carousel-viewport')!.getBoundingClientRect();
          return (
            [...car.querySelectorAll('.carousel-slide')]
              .filter((s) => {
                const r = s.getBoundingClientRect();
                return r.left >= vp.left - 1 && r.right <= vp.right + 1;
              })
              .map((s) => s.textContent!.trim())
              .join(',') === want
          );
        },
        want,
        { timeout: 5000 },
      );
    const disabled = (b: string) => page.$eval(`#car-multi .carousel-${b}`, (el) => (el as HTMLButtonElement).disabled);
    await waitForIndex(page, 'car-multi', 0);
    assert.equal(await shown(), '1,2,3');
    assert.equal(await counter(), 'Slides 1-3 of 9');
    assert.equal(await disabled('prev'), true);
    await page.click('#car-multi .carousel-next');
    await waitForIndex(page, 'car-multi', 3);
    await settle('4,5,6');
    assert.equal(await counter(), 'Slides 4-6 of 9');
    await page.click('#car-multi .carousel-next');
    await waitForIndex(page, 'car-multi', 6);
    await settle('7,8,9');
    assert.equal(await disabled('next'), true, 'the last slide shows');
    await page.click('#car-multi .carousel-prev');
    await waitForIndex(page, 'car-multi', 3);
    await settle('4,5,6'); // Prev goes back a page, not one slide
    await page.click('#car-multi .carousel-prev');
    await waitForIndex(page, 'car-multi', 0);
    assert.equal(await disabled('prev'), true);
    await page.$eval('#car-multi', (el) => (el as HTMLElement).api!.setState('default', { index: 4 }));
    await waitForIndex(page, 'car-multi', 4);
    await settle('5,6,7');
    await page.$eval('#car-multi', (el) => (el as HTMLElement).api!.setState('default'));
    await waitForIndex(page, 'car-multi', 0);
  });

  // -- §3 Tier-1: dot structure morphs when slides change out of band -------
  await check('adding a slide morphs the dot structure (existing dots keep identity)', async () => {
    const res = await page.evaluate(async () => {
      const vp = document.querySelector('#car-dots .carousel-viewport')!;
      const dot2 = document.querySelector('#car-dots-dot-1') as HTMLElement;
      (dot2 as any).__dotSentinel = 1;
      const slide = document.createElement('div');
      slide.className = 'carousel-slide';
      slide.textContent = 'third';
      vp.appendChild(slide); // MutationObserver reconciles the dot list
      await new Promise((r) => setTimeout(r, 100));
      const dots = [...document.querySelectorAll('#car-dots .carousel-dot')] as HTMLElement[];
      // cleanup: drop the slide again (dots reconcile back down)
      slide.remove();
      await new Promise((r) => setTimeout(r, 100));
      const after = document.querySelectorAll('#car-dots .carousel-dot').length;
      return {
        grew: dots.length === 3,
        idsOk: dots.map((d) => d.id).join(',') === 'car-dots-dot-0,car-dots-dot-1,car-dots-dot-2',
        kept: (document.querySelector('#car-dots-dot-1') as any)?.__dotSentinel === 1,
        after,
      };
    });
    assert.ok(res.grew, 'third dot appears after a slide is added');
    assert.ok(res.idsOk, 'dot ids follow the keyed scheme');
    assert.ok(res.kept, 'retained dot node survives the keyed morph (moved, not replaced)');
    assert.equal(res.after, 2, 'dot list reconciles back when the slide is removed');
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
  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await assertRenderContract(page, '.carousel[id]', ['default'], { runtimeAttrs: ['aria-current','style'], runtimeOwned: '.carousel-dots > *' });
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
