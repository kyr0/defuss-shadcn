import assert from 'node:assert/strict';
import { chromium, type Locator, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped resizer component. Loads the fixture
 * (px / classes / controlled / axis-w / default-SE wrappers, mirroring the doc
 * page) over HTTP in a real browser, then verifies handle placement + ARIA,
 * pointer drags landing in px and in classes-mode tokens, keyboard parity,
 * clamps, the controlled mode's "writes nothing" contract, the data-width
 * observation loop, and the 'default' State API (restore + live getState) —
 * the same files consumers copy from dist/, unmodified.
 */

const FIXTURE = '/tests/e2e/resizer.e2e-fixture.html';
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

const boxOf = (page: Page, id: string) => page.locator(`#${id}`);
const sizeOf = async (loc: Locator): Promise<[number, number]> => {
  const b = await loc.boundingBox();
  return [Math.round(b!.width), Math.round(b!.height)];
};
/** Drag a handle by (dx, dy) from its center (mouse = trusted pointer events). */
async function drag(page: Page, handle: Locator, dx: number, dy = 0): Promise<void> {
  await handle.scrollIntoViewIfNeeded();
  const r = (await handle.boundingBox())!;
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width / 2 + dx, r.y + r.height / 2 + dy, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(80);
}

try {
  const page = await browser.newPage();
  await page.goto(`${server.url}${FIXTURE}`);

  await check('resizer.js initialized every wrapper (data-init + chrome-marked handles)', async () => {
    await page.waitForFunction(() => document.querySelectorAll('.resizer:not([data-init])').length === 0);
    assert.equal(
      await page.evaluate(() => document.querySelectorAll('.resizer-handle[data-ce-chrome]').length),
      await page.evaluate(() => document.querySelectorAll('.resizer-handle').length),
      'every runtime handle carries the sandbox chrome marker',
    );
  });

  await check('handle placement: all=8, default=1 (se), axis=w drops n/s', async () => {
    assert.deepEqual(
      await page.evaluate(() => [...document.querySelectorAll('#rz-px .resizer-handle')].map((h) => h.getAttribute('data-handle')).sort()),
      ['e', 'n', 'ne', 'nw', 's', 'se', 'sw', 'w'],
    );
    assert.deepEqual(
      await page.evaluate(() => [...document.querySelectorAll('#rz-se .resizer-handle')].map((h) => h.getAttribute('data-handle'))),
      ['se'],
    );
    assert.deepEqual(
      await page.evaluate(() => [...document.querySelectorAll('#rz-ax .resizer-handle')].map((h) => h.getAttribute('data-handle')).sort()),
      ['e', 'ne', 'nw', 'se', 'sw', 'w'],
      'axis="w" must not place the height-only handles',
    );
  });

  await check('ARIA: focusable separators with position labels + edge orientation', async () => {
    const a = await page.evaluate(() => {
      const h = document.querySelector('#rz-px .resizer-handle[data-handle="n"]')!;
      const c = document.querySelector('#rz-px .resizer-handle[data-handle="se"]')!;
      return {
        role: h.getAttribute('role'),
        tab: h.getAttribute('tabindex'),
        orient: h.getAttribute('aria-orientation'),
        label: h.getAttribute('aria-label'),
        corner: c.getAttribute('aria-label'),
        cornerOrient: c.getAttribute('aria-orientation'),
      };
    });
    assert.deepEqual(a, { role: 'separator', tab: '0', orient: 'horizontal', label: 'Resize top edge', corner: 'Resize bottom-right corner', cornerOrient: null });
  });

  await check('px drag on e handle grows width, mirrors data-width (120..600 clamp)', async () => {
    const before = await sizeOf(boxOf(page, 'rz-px-box'));
    assert.deepEqual(before, [240, 120]);
    await drag(page, page.locator('#rz-px .resizer-handle[data-handle="e"]'), 60);
    const after = await sizeOf(boxOf(page, 'rz-px-box'));
    assert.ok(Math.abs(after[0] - 300) <= 2, `width ~300, got ${after[0]}`);
    assert.equal(after[1], 120, 'the e handle never touches height');
    const mirror = await page.getAttribute('#rz-px', 'data-width');
    assert.ok(mirror && Math.abs(Number(mirror) - 300) <= 2, `data-width mirrors the box (${mirror})`);
  });

  await check('keyboard parity: ArrowRight +10, End=clamp max, Home=min', async () => {
    const h = page.locator('#rz-px .resizer-handle[data-handle="e"]');
    await h.focus();
    await page.keyboard.press('ArrowRight');
    let w = (await sizeOf(boxOf(page, 'rz-px-box')))[0];
    assert.ok(Math.abs(w - 310) <= 2, `ArrowRight grew width by 10 (${w})`);
    await page.keyboard.press('End');
    assert.deepEqual(await sizeOf(boxOf(page, 'rz-px-box')), [600, 120], 'End jumps to data-max');
    await page.keyboard.press('Home');
    assert.deepEqual(await sizeOf(boxOf(page, 'rz-px-box')), [120, 120], 'Home jumps to data-min');
  });

  await check('data-keys="edge": the arrow pointing away from the box grows it (w: ←, n: ↑), the other shrinks it', async () => {
    await page.locator('#rz-edge .resizer-handle[data-handle="w"]').focus();
    await page.keyboard.press('ArrowLeft');
    assert.equal((await sizeOf(boxOf(page, 'rz-edge-box')))[0], 210, 'ArrowLeft grows from the w edge');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    assert.equal((await sizeOf(boxOf(page, 'rz-edge-box')))[0], 190, 'ArrowRight shrinks it');
    await page.keyboard.press('ArrowUp');
    assert.equal((await sizeOf(boxOf(page, 'rz-edge-box')))[0], 190, 'ArrowUp does nothing on a w edge');
    await page.locator('#rz-edge .resizer-handle[data-handle="n"]').focus();
    await page.keyboard.press('ArrowUp');
    assert.equal((await sizeOf(boxOf(page, 'rz-edge-box')))[1], 110, 'ArrowUp grows from the n edge');
    // focusing scrolled the page - put it back for the pointer checks that follow
    await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); globalThis.scrollTo(0, 0); });
  });

  await check("a document 'pointercancel' (sandbox bridge relay) ends a live drag", async () => {
    const h = page.locator('#rz-px .resizer-handle[data-handle="e"]');
    const r = (await h.boundingBox())!;
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await page.mouse.down();
    await page.mouse.move(r.x + 30, r.y + r.height / 2, { steps: 3 });
    assert.equal(await page.getAttribute('#rz-px', 'data-resizing'), 'e', 'drag live');
    // EXACTLY what the sandbox bridge dispatches when the host reports the
    // release (a drag the document itself never saw end):
    await page.evaluate(() =>
      document.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, cancelable: true })),
    );
    assert.equal(await page.getAttribute('#rz-px', 'data-resizing'), null, 'drag ended via relayed cancel');
    const w0 = (await sizeOf(boxOf(page, 'rz-px-box')))[0];
    await page.mouse.move(r.x + 90, r.y + r.height / 2, { steps: 3 }); // re-entry move must NOT resize
    assert.equal((await sizeOf(boxOf(page, 'rz-px-box')))[0], w0, 'no stuck resize on re-entry');
    await page.mouse.up();
  });

  await check('a captured move with buttons === 0 ends the drag (lost release)', async () => {
    const h = page.locator('#rz-cl .resizer-handle[data-handle="e"]');
    const r = (await h.boundingBox())!;
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(40);
    // a move whose button is already up (release happened in another document
    // - trusted input can't fake buttons:0, so the guard is dispatched here)
    await page.evaluate(
      ([x, y]: number[]) => {
        const el = document.querySelector('#rz-cl .resizer-handle[data-handle="e"]') as HTMLElement;
        el.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, buttons: 0, bubbles: true, cancelable: true, pointerId: 1 }));
      },
      [r.x + 80, r.y + r.height / 2],
    );
    assert.equal(await page.getAttribute('#rz-cl', 'data-resizing'), null, 'buttons-0 move ended the drag');
    await page.mouse.up();
  });

  await check('drag suspends size transitions on the box (the box tracks the pointer)', async () => {
    // the sidebar rail's `transition: width 200ms` is exactly the "handle
    // lags behind the mouse" complaint: the box EASES toward the pointer.
    // [data-resizing] zeroes child transition-duration for the gesture only.
    // The test transition is a layered component rule (same layer, lower
    // specificity than the guard) - inline style would beat any CSS rule.
    await page.addStyleTag({ content: '@layer components { .rz-trans-test { transition: width 200ms ease; } }' });
    const box = page.locator('#rz-px-box');
    await box.evaluate((el) => el.classList.add('rz-trans-test'));
    const h = page.locator('#rz-px .resizer-handle[data-handle="e"]');
    const r = (await h.boundingBox())!;
    try {
      await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
      await page.mouse.down();
      await page.mouse.move(r.x + r.width / 2 + 40, r.y + r.height / 2, { steps: 3 });
      assert.equal(await box.evaluate((el) => getComputedStyle(el).transitionDuration), '0s', 'duration zeroed mid-drag');
      await page.mouse.up(); // release EARLY - the guard lifts with data-resizing
      assert.equal(await box.evaluate((el) => getComputedStyle(el).transitionDuration), '0.2s', 'authored transition restored after release');
    } finally {
      // cleanup: a leftover 200ms transition would make every LATER width
      // read race the ease-out (the 225 !== 320 cascade of failures)
      await page.mouse.up(); // idempotent; guards against a mid-check throw
      await box.evaluate((el) => el.classList.remove('rz-trans-test'));
      await page.waitForTimeout(260); // let the ease-out land
    }
  });

  await check('classes mode: drag swaps the w-* token (no inline styles)', async () => {
    const cls0 = await page.getAttribute('#rz-cl-box', 'class');
    assert.match(cls0!, /w-64/);
    await drag(page, page.locator('#rz-cl .resizer-handle[data-handle="e"]'), 60);
    const cls1 = (await page.getAttribute('#rz-cl-box', 'class'))!;
    assert.ok(!/\bw-64\b/.test(cls1), 'authored token replaced');
    const m = cls1.match(/\bw-(\d+(?:\.\d+)?)\b/);
    assert.ok(m && Number(m[1]) > 64, `bigger ladder token applied (${m?.[0]})`);
    const w = (await sizeOf(boxOf(page, 'rz-cl-box')))[0];
    assert.ok(w >= 308 && w <= 324, `snapped near 316px (${w})`);
    assert.ok(!(await page.evaluate(() => document.querySelector('#rz-cl-box')!.hasAttribute('style') && /width/.test((document.querySelector('#rz-cl-box') as HTMLElement).style.cssText))), 'size lives in the class, not inline');
  });

  await check('controlled mode: writes nothing, only dispatches resizer-resize', async () => {
    await page.evaluate(() => {
      (window as any).__rz = [];
      document.querySelector('#rz-ct')!.addEventListener('resizer-resize', (e: Event) => (window as any).__rz.push((e as CustomEvent).detail));
    });
    await drag(page, page.locator('#rz-ct .resizer-handle[data-handle="e"]'), 40);
    const events = await page.evaluate(() => (window as any).__rz);
    assert.ok(events.length > 0, 'resizer-resize fired');
    assert.equal(events[events.length - 1].width, 240, 'detail carries the requested px');
    assert.equal(await page.getAttribute('#rz-ct', 'data-width'), null, 'no observation mirror in controlled mode');
    assert.deepEqual(await sizeOf(boxOf(page, 'rz-ct-box')), [200, 100], 'box untouched - the consumer owns the size');
  });

  await check("State API: setState('default', { width }) applies; getState reports the live box", async () => {
    await page.evaluate(() => (document.querySelector('#rz-px') as any).api.setState('default', { width: 320 }));
    const w = (await sizeOf(boxOf(page, 'rz-px-box')))[0];
    assert.equal(w, 320);
    const state = await page.evaluate(() => (document.querySelector('#rz-px') as any).api.getState());
    assert.equal(state.name, 'default');
    assert.equal(state.config.width, 320);
    assert.equal(state.config.mode, 'px');
    assert.equal(await page.getAttribute('#rz-px', 'data-state-name'), 'default');
  });

  await check('observation loop: external data-width write resizes the box', async () => {
    await page.evaluate(() => ((document.querySelector('#rz-px') as HTMLElement).dataset.width = '420'));
    await page.waitForTimeout(80);
    assert.equal((await sizeOf(boxOf(page, 'rz-px-box')))[0], 420, 'panel-style write applied back');
  });

  await check('reset action restores the authored size', async () => {
    await page.evaluate(() => document.querySelector('#rz-px')!.dispatchEvent(new Event('resizer-reset')));
    await page.waitForTimeout(80);
    assert.deepEqual(await sizeOf(boxOf(page, 'rz-px-box')), [240, 120]);
  });

  await check('live handle set re-syncs on data-axis change (n/s come and go)', async () => {
    await page.evaluate(() => ((document.querySelector('#rz-ax') as HTMLElement).dataset.axis = 'both'));
    await page.waitForTimeout(80);
    assert.equal(await page.evaluate(() => document.querySelectorAll('#rz-ax .resizer-handle').length), 8);
    await page.evaluate(() => ((document.querySelector('#rz-ax') as HTMLElement).dataset.axis = 'h'));
    await page.waitForTimeout(80);
    assert.deepEqual(
      await page.evaluate(() => [...document.querySelectorAll('#rz-ax .resizer-handle')].map((h) => h.getAttribute('data-handle')).sort()),
      ['n', 'ne', 'nw', 's', 'se', 'sw'],
    );
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nresizer.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('resizer.e2e: all checks passed');
