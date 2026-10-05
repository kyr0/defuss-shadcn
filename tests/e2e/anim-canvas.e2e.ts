import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: E2E smoke test for the shipped anim-canvas component. Loads the fixture
 * (a 2×2 board with every direction wired + mixed df$.anim declarations, plus
 * a second minimal canvas for per-instance isolation) over HTTP in a real
 * browser, then verifies layout, keyboard navigation, the overview mode and
 * the State API - the same files consumers copy from dist/, unmodified.
 * Fixture animations run with 5ms durations so transitions settle fast.
 */

const FIXTURE = '/tests/e2e/anim-canvas.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

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

/** Waits until `id` carries (or loses) data-active. */
async function expectActive(page: Page, id: string, label: string): Promise<void> {
  await page.waitForFunction(
    (wanted) => document.getElementById(wanted)?.hasAttribute('data-active'),
    id,
    { timeout: 5000 },
  );
  const current = await page.$eval('#board', (el) => el.getAttribute('data-current-slide'));
  assert.equal(current, id, `${label}: data-current-slide should be "${id}"`);
  // mid-transition input is a spec'd no-op - let the (5ms-fixture) pan settle
  // before the next synthetic key, exactly like a human behind the animation
  await page.waitForTimeout(120);
}

try {
  const page = await browser.newPage();
  await page.goto(`${server.url}${FIXTURE}`);

  await check('anim-canvas.js initialized every canvas (data-init)', async () => {
    await page.waitForFunction(
      () => document.querySelectorAll('.anim-canvas:not([data-init])').length === 0,
    );
  });

  await check('board wrapper + absolute cell layout in board units', async () => {
    await page.waitForFunction(() => document.querySelector('#board > .anim-canvas-board'));
    const geo = await page.evaluate(() => {
      const read = (id: string) => {
        const el = document.getElementById(id) as HTMLElement;
        return { left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height };
      };
      return { s1: read('s1'), s2: read('s2'), s3: read('s3'), s4: read('s4') };
    });
    assert.deepEqual(geo.s1, { left: '0px', top: '0px', width: '640px', height: '360px' }, 's1 at (0,0)');
    assert.equal(geo.s2.left, '680px', 's2 sits east of s1, one 40-unit gap away');
    assert.equal(geo.s3.top, '400px', 's3 sits south of s1, one gap away');
    assert.equal(geo.s4.left, '680px', 's4 sits south-east');
    assert.equal(geo.s4.top, '400px', 's4 sits south-east');
    const overflow = await page.$eval('#board', (el) => getComputedStyle(el).overflow);
    assert.equal(overflow, 'hidden', 'the viewport clips the board');
  });

  await check('initial state: s1 active, siblings inert + aria-hidden', async () => {
    assert.equal(await page.$eval('#s1', (el) => el.hasAttribute('data-active')), true);
    assert.equal(await page.$eval('#board', (el) => el.getAttribute('data-current-slide')), 's1');
    assert.equal(await page.$eval('#s2', (el) => (el as HTMLElement).inert), true, 's2 inert');
    assert.equal(await page.$eval('#s2', (el) => el.getAttribute('aria-hidden')), 'true', 's2 aria-hidden');
  });

  // running animations on a slide (and its subtree) right now
  const running = (id: string) =>
    page.$eval(`#${id}`, (el) => el.getAnimations({ subtree: true }).filter((x) => x.playState === 'running').length);

  await check('ArrowRight arrives at s2: only the target animates, under the blocks curtain', async () => {
    await page.keyboard.press('ArrowRight');
    await expectActive(page, 's2', 'after ArrowRight');
    assert.equal(await running('s1'), 0, 'the slide we left never animates');
    // blocksIn declares an ARRIVAL curtain: the target lands covered, the
    // panels roll off it (the engine's blocksOut reveal) - never the old slide
    assert.equal(await page.$eval('#s1', (el) => !!el.querySelector('[data-df-anim-blocks]')), false, 'no curtain on the slide we left');
    // its content built in: the entrance replayed (arrival offset cached on the
    // element) and the counter re-ran up to its value
    assert.ok(await page.$eval('#s2 h2', (el) => (el as HTMLElement).dataset.animCanvasBaseDelay !== undefined), 'content entrance replayed on arrival');
    await page.waitForFunction(() => document.getElementById('s2-count')!.textContent === '42', null, { timeout: 5000 });
  });

  await check('ArrowLeft back to s1: s2 pans out still - no out-animation, no curtain residue', async () => {
    await page.$eval('#s2', (el) => globalThis.df$.anim.blocksOut.reset(el)); // start from idle
    await page.keyboard.press('ArrowLeft');
    await expectActive(page, 's1', 'after ArrowLeft');
    assert.equal(await running('s2'), 0, 'the slide we left never animates');
    assert.equal(await page.$eval('#s2', (el) => globalThis.df$.anim.blocksOut.state(el)), 'idle', 'no curtain replay on the old slide');
    assert.equal(await page.$eval('#s2', (el) => !!el.querySelector('[data-df-anim-blocks]')), false, 'no curtain residue on the old slide');
    assert.equal(await page.$eval('#s1', (el) => !!el.querySelector('[data-df-anim-blocks]')), false, 'no blocks on the arrival slide (slideIn reveals it)');
    assert.equal(await page.$eval('#s2', (el) => getComputedStyle(el).opacity), '1', 'old slide stays visible (out of frame), never self-hidden');
  });

  await check('ArrowDown moves south to s3 (iris transition)', async () => {
    await page.keyboard.press('ArrowDown');
    await expectActive(page, 's3', 'after ArrowDown');
  });

  await check('ArrowUp moves back north to s1', async () => {
    await page.keyboard.press('ArrowUp');
    await expectActive(page, 's1', 'after ArrowUp');
  });

  await check('a direction without a neighbor is never swallowed (s1 stays)', async () => {
    await page.keyboard.press('ArrowLeft'); // s1 has no west neighbor
    await page.waitForTimeout(150);
    await expectActive(page, 's1', 'no west neighbor');
  });

  await check('directional controls move the canvas (data-anim-canvas-go)', async () => {
    await page.click('#board [data-anim-canvas-go="east"]');
    await expectActive(page, 's2', 'control east');
    // the west control is enabled on s2, the east one stays enabled too (s2→s4 is south)
    await page.click('#board [data-anim-canvas-go="south"]');
    await expectActive(page, 's4', 'control south');
    // s4 has no east neighbor → its east control is disabled
    assert.equal(
      await page.$eval('#board [data-anim-canvas-go="east"]', (el) => (el as HTMLButtonElement).disabled),
      true,
      'east control disabled without a neighbor',
    );
    await page.click('#board [data-anim-canvas-go="west"]');
    await expectActive(page, 's3', 'control west');
    await page.click('#board [data-anim-canvas-go="north"]');
    await expectActive(page, 's1', 'control north');
  });

  await check("state API: setState('overview') zooms out (data-overview on the root)", async () => {
    await page.$eval('#board', (el) => (el as HTMLElement).api!.setState('overview'));
    await page.waitForFunction(() => document.getElementById('board')?.hasAttribute('data-overview'));
    await page.waitForTimeout(120); // let the overview pan settle (mid-transition input is a spec'd no-op)
    // every tile is interactive in overview (inert lifted)
    assert.equal(await page.$eval('#s3', (el) => (el as HTMLElement).inert), false, 'tiles not inert in overview');
    const state = await page.$eval('#board', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'overview');
    assert.equal(state.config.overview, true);
  });

  await check('clicking a tile in overview zooms into it and makes it active', async () => {
    await page.click('#s4');
    await page.waitForFunction(() => !document.getElementById('board')?.hasAttribute('data-overview'));
    await expectActive(page, 's4', 'clicked tile');
  });

  await check("state API: setState('default', { slide }) focuses that slide", async () => {
    await page.$eval('#board', (el) => (el as HTMLElement).api!.setState('default', { slide: 's2' }));
    await expectActive(page, 's2', "setState('default', { slide: 's2' })");
  });

  await check("keyboard: 'o' opens the overview, Escape closes it", async () => {
    await page.keyboard.press('o');
    await page.waitForFunction(() => document.getElementById('board')?.hasAttribute('data-overview'));
    await page.waitForTimeout(120); // overview pan settle (mid-transition input is a spec'd no-op)
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('board')?.hasAttribute('data-overview'));
    await expectActive(page, 's2', 'active slide survives the overview round-trip');
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#board') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.animCanvasApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.animCanvasStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#board'),
    }));
    assert.ok(reg.hasApi, 'df$.shadcn.animCanvasApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'overview']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });

  await check('per-instance isolation: #mini is unaffected by #board', async () => {
    assert.equal(await page.$eval('#mini', (el) => el.getAttribute('data-current-slide')), 'a', 'mini still on a');
    assert.equal(await page.$eval('#a', (el) => el.hasAttribute('data-active')), true);
    // driving #mini through its own api leaves #board alone
    await page.$eval('#mini', (el) => (el as HTMLElement).api!.setState('default', { slide: 'b' }));
    await page.waitForFunction(() => document.getElementById('b')?.hasAttribute('data-active'));
    assert.equal(await page.$eval('#board', (el) => el.getAttribute('data-current-slide')), 's2', 'board untouched');
  });
  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await assertRenderContract(page, '.anim-canvas[id]', ['default','overview'], { runtimeAttrs: ['style'] });
  });

} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nanim-canvas.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('anim-canvas.e2e: all checks passed');
