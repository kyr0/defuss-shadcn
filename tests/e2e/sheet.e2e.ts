import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';
import { icbRect } from './lib/viewport.ts';

/**
 * Why: E2E smoke test for the shipped sheet component. Loads the fixture
 * (one sheet per documented side, mirroring the doc page) over HTTP in a real
 * browser, then verifies the slide-out geometry per side, trigger/close
 * wiring, Escape-to-close, and the named State API - the same files consumers
 * copy from dist/, unmodified.
 */

const FIXTURE = '/tests/e2e/sheet.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();

const isOpen = (page: Page, id: string) => page.$eval(`#${id}`, (el) => (el as HTMLDialogElement).open);
const setState = (page: Page, id: string, state: string) =>
  page.$eval(`#${id}`, (el, s) => (el as HTMLElement).api!.setState(s), state);

/** Open a sheet via setState and wait for the 300ms slide-in to settle. */
async function open(page: Page, id: string): Promise<void> {
  await setState(page, id, 'open');
  await page.$eval(
    `#${id}`,
    (el) =>
      new Promise<void>((resolve) => {
        // transitionend fires per property (opacity + transform) - wait for transform
        if (!el.classList.contains('sheet')) return resolve();
        const done = (ev: Event) => {
          if (!(ev instanceof TransitionEvent)) return;
          if (ev.propertyName === 'transform') {
            el.removeEventListener('transitionend', done);
            resolve();
          }
        };
        el.addEventListener('transitionend', done);
        setTimeout(resolve, 600); // safety net: transition may already be done
      }),
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

  await check('sheet.js initialized triggers + sheets (data-init)', async () => {
    await page.waitForFunction(
      () =>
        document.querySelectorAll('[data-sheet-trigger]:not([data-init])').length === 0 &&
        document.querySelectorAll('dialog.sheet:not([data-init])').length === 0,
    );
  });

  // The modal scroll lock (scrollbar-gutter:stable) shrinks the fixed-element
  // containing block by the classic scrollbar while clientWidth keeps
  // reporting the full viewport - dock against the ICB sentinel
  // (tests/e2e/lib/viewport.ts), the block fixed elements actually get.
  await check('right sheet: docked right, 24rem wide, full height', async () => {
    await open(page, 'sheet-right');
    const geom = await page.evaluate((icb) => {
      const el = document.querySelector('#sheet-right')!;
      const r = el.getBoundingClientRect();
      return {
        right: r.right,
        cssWidth: getComputedStyle(el).width,
        height: r.height,
        viewportH: document.documentElement.clientHeight,
        opacity: getComputedStyle(el).opacity,
        icbRight: icb.right,
      };
    }, await page.evaluate(icbRect));
    assert.equal(geom.cssWidth, '384px', 'width: 24rem');
    assert.ok(Math.abs(geom.right - geom.icbRight) < 2, 'docked to the right edge');
    assert.equal(Math.round(geom.height), geom.viewportH, 'full height');
    assert.equal(geom.opacity, '1', 'slid in (opacity 1)');
  });

  await check('left sheet: docked left edge', async () => {
    await setState(page, 'sheet-right', 'default');
    await open(page, 'sheet-left');
    const geom = await page.evaluate(() => {
      const r = document.querySelector('#sheet-left')!.getBoundingClientRect();
      return { x: r.x, cssWidth: getComputedStyle(document.querySelector('#sheet-left')!).width };
    });
    assert.equal(Math.round(geom.x), 0, 'flush with left edge');
    assert.equal(geom.cssWidth, '384px', 'width: 24rem');
  });

  await check('top sheet: docked top, full width', async () => {
    await setState(page, 'sheet-left', 'default');
    await open(page, 'sheet-top');
    const geom = await page.evaluate((icb) => {
      const r = document.querySelector('#sheet-top')!.getBoundingClientRect();
      return { y: r.y, width: r.width, icbWidth: icb.width };
    }, await page.evaluate(icbRect));
    assert.equal(Math.round(geom.y), 0, 'flush with top edge');
    assert.ok(Math.abs(geom.width - geom.icbWidth) < 2, 'full width of the fixed-element containing block');
  });

  await check('top/bottom sheets center their content column', async () => {
    // regression: these sides span the full viewport, so unstretched content
    // rendered glued to the edges; the content column caps at 48rem, centered
    await open(page, 'sheet-top');
    const col = await page.evaluate(() => {
      const content = document.querySelector('#sheet-top .sheet-content')!.getBoundingClientRect();
      const sheet = document.querySelector('#sheet-top')!.getBoundingClientRect();
      return {
        width: content.width,
        gapL: content.x - sheet.x,
        gapR: sheet.x + sheet.width - (content.x + content.width),
      };
    });
    assert.ok(col.width <= 768, `content column <= 48rem (got ${Math.round(col.width)}px)`);
    assert.ok(Math.abs(col.gapL - col.gapR) < 2, `centered (${col.gapL.toFixed(0)} vs ${col.gapR.toFixed(0)})`);
  });

  await check('bottom sheet: docked bottom, full width', async () => {
    await setState(page, 'sheet-top', 'default');
    await open(page, 'sheet-bottom');
    const geom = await page.evaluate((icb) => {
      const r = document.querySelector('#sheet-bottom')!.getBoundingClientRect();
      return {
        bottom: r.bottom,
        width: r.width,
        icbWidth: icb.width,
        icbBottom: icb.bottom,
      };
    }, await page.evaluate(icbRect));
    assert.ok(Math.abs(geom.bottom - geom.icbBottom) < 2, 'flush with bottom edge');
    assert.ok(Math.abs(geom.width - geom.icbWidth) < 2, 'full width of the fixed-element containing block');
    await setState(page, 'sheet-bottom', 'default');
  });

  await check('bottom sheet embeds the .checkbox component (not a raw UA input)', async () => {
    // doc-page parity: cookie-preference rows use class="checkbox"
    await open(page, 'sheet-bottom');
    const info = await page.evaluate(() => {
      const cb = document.querySelector('#sheet-bottom .checkbox') as HTMLInputElement;
      const content = document.querySelector('#sheet-bottom .sheet-content')!.getBoundingClientRect();
      const sheet = document.querySelector('#sheet-bottom')!.getBoundingClientRect();
      return {
        appearance: getComputedStyle(cb).appearance,
        w: cb.getBoundingClientRect().width,
        centered: Math.abs(content.x - sheet.x - (sheet.x + sheet.width - (content.x + content.width))) < 2,
      };
    });
    assert.equal(info.appearance, 'none', 'styled .checkbox, not the raw UA control');
    assert.ok(Math.abs(info.w - 18) < 1, `1.125rem checkbox (got ${info.w}px)`);
    assert.ok(info.centered, 'bottom sheet content column centered like top');
    await setState(page, 'sheet-bottom', 'default');
  });

  await check('trigger button opens; data-sheet-close closes', async () => {
    await page.click('[data-sheet-trigger="sheet-right"]');
    assert.equal(await isOpen(page, 'sheet-right'), true);
    await page.click('#sheet-right [data-sheet-close]');
    assert.equal(await isOpen(page, 'sheet-right'), false);
  });

  await check('Escape closes (native dialog behavior preserved)', async () => {
    await setState(page, 'sheet-right', 'open');
    await page.keyboard.press('Escape');
    assert.equal(await isOpen(page, 'sheet-right'), false, 'native Escape-to-close must still work');
  });

  await check('focus returns to trigger on close', async () => {
    await page.click('[data-sheet-trigger="sheet-left"]');
    await page.waitForFunction(() => document.querySelector('#sheet-left')!.matches(':open'));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(50);
    const focused = await page.evaluate(
      () => document.activeElement?.getAttribute('data-sheet-trigger'),
    );
    assert.equal(focused, 'sheet-left', 'trigger must be refocused after close');
  });

  // -- State API (AGENTS.md "State API") -------------------------------------
  await check('state API: default state reported, setState(open)/getState work', async () => {
    const before = await page.$eval('#sheet-right', (el) => (el as HTMLElement).api!.getState());
    assert.equal(before.name, 'default');
    await setState(page, 'sheet-right', 'open');
    assert.equal(await isOpen(page, 'sheet-right'), true);
    const state = await page.$eval('#sheet-right', (el) => (el as HTMLElement).api!.getState());
    assert.equal(state.name, 'open');
    await setState(page, 'sheet-right', 'default');
    assert.equal(await isOpen(page, 'sheet-right'), false);
  });

  await check('state API: unknown state names throw', async () => {
    const err = await page.evaluate(() => {
      try {
        (document.querySelector('#sheet-right') as HTMLElement).api!.setState('nope');
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    });
    assert.ok(err && err.includes('unknown state'), `expected throw, got ${err}`);
  });

  // -- Density: content padding 16/24/32px ----------------------------------
  await check('data-density scales .sheet-content padding to 16/24/32px', async () => {
    const pads = await page.evaluate(() =>
      ['sh-den-compact', 'sh-den-comfortable', 'sh-den-spacious'].map((id) => {
        const d = document.getElementById(id) as HTMLDialogElement;
        d.showModal();
        const p = getComputedStyle(d.querySelector('.sheet-content')!).padding;
        d.close();
        return p;
      }),
    );
    assert.deepEqual(pads, ['16px', '24px', '32px'], `density paddings, got ${pads.join(' / ')}`);
  });

  await check('state API: registry globals expose api + declared states', async () => {
    const reg = await page.evaluate(() => ({
      hasApi: typeof globalThis.df$?.shadcn?.sheetApi?.setState === 'function',
      states: globalThis.df$?.shadcn?.sheetStates,
      dollarWorks: typeof globalThis.$ === 'function' && !!globalThis.$('#sheet-right'),
    }));
    assert.ok(reg.hasApi, 'df$.sheetApi.setState missing');
    assert.deepEqual(reg.states, ['default', 'open']);
    assert.ok(reg.dollarWorks, 'globalThis.$ query alias missing');
  });

  // -- Scroll lock (documented in skill Notes: page behind stays put) --------
  await check('page behind the modal sheet stays put; position restored on close', async () => {
    await page.evaluate(() => {
      // blur the trigger still focused from the previous check - its
      // async focus-restore scroll-into-view would race our measurement
      (document.activeElement as HTMLElement | null)?.blur();
      window.scrollTo(0, 400);
    });
    const before = await page.evaluate(() => document.scrollingElement!.scrollTop);
    assert.ok(before > 0, 'fixture page is scrollable');
    // setState + fixed settle (not the open() transition-dance: resolving it
    // mid-transition raced with the wheel and reset the scroll read)
    await setState(page, 'sheet-right', 'open');
    await page.waitForTimeout(450);
    // wheel over the backdrop and over the docked sheet itself
    await page.mouse.move(2, 2);
    await page.mouse.wheel(0, 500);
    await page.mouse.move(1000, 360);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(100);
    const during = await page.evaluate(() => document.scrollingElement!.scrollTop);
    assert.equal(during, before, 'page must not scroll while the sheet is modal');
    await setState(page, 'sheet-right', 'default');
    const after = await page.evaluate(() => document.scrollingElement!.scrollTop);
    assert.equal(after, before, 'scroll position preserved after close');
    await page.waitForTimeout(350); // exit transition (allow-discrete keeps it visible 300ms)
    await page.mouse.move(400, 360); // left of the docked sheet's column
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(100);
    const scrolled = await page.evaluate(() => document.scrollingElement!.scrollTop);
    assert.ok(scrolled > before, 'page is scrollable again after close');
    await page.evaluate(() => window.scrollTo(0, 0)); // leave a clean viewport
  });
  // LAST (AGENTS.md "State API" → render): the contract reloads the page
  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await assertRenderContract(page, 'dialog.sheet[id]', ['default','open']);
  });

} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nsheet.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('sheet.e2e: all checks passed');
