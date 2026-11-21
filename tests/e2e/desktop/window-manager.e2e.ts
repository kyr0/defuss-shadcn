import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

/**
 * Why: the window manager is the model a taskbar renders - which windows are open, in what order, which is in
 * front. These checks drive real windows on the real dist/ files: the model and its change event follow opening,
 * closing, focusing, minimizing and renaming; toggle() is the taskbar rule; "show desktop" minimizes every window
 * and brings the same ones back; two managers on one page keep separate front windows; both states land; with
 * data-share two real browser windows side by side hand a window over (it shows in both while it moves, the one it is
 * dropped on takes it with its text) and a window dropped outside every browser window comes back; with
 * data-scrollbars="virtual" a drawn bar replaces the native one and its buttons, track and thumb drive the scroll.
 */

const server = startServer();
const browser = await chromium.launch();
let failures = 0;
const check = async (label: string, fn: () => Promise<void>): Promise<void> => {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${label}\n    ${err instanceof Error ? err.message : err}`);
  }
};

try {
  const page = await browser.newPage({ viewport: { width: 900, height: 800 } });
  page.on('pageerror', (e) => {
    failures++;
    console.error(`  ✗ page error: ${e.message}`);
  });
  await page.goto(`${server.url}/tests/e2e/desktop/window-manager.e2e-fixture.html`);
  await page.waitForSelector('#wm1[data-init]');
  await page.waitForSelector('#w-notes[data-init]');
  // every change event the first manager sends, in order
  await page.evaluate(() => {
    (globalThis as any).changes = [];
    document
      .querySelector('#wm1')!
      .addEventListener('window-manager-change', (e) => (globalThis as any).changes.push((e as CustomEvent).detail));
  });
  const model = () => page.evaluate(() => (globalThis as any).df$.shadcn.windowManager.windows('#wm1'));
  const ids = async () => (await model()).map((w: any) => w.id);
  const last = () => page.evaluate(() => (globalThis as any).changes.at(-1));

  await check('the model: the open windows in their order, the last authored one in front', async () => {
    const m = await model();
    assert.deepEqual(
      m.map((w: any) => [w.id, w.title, w.icon, w.state, w.active]),
      [
        ['w-notes', 'Notes', 'notebook-pen', 'default', false],
        ['w-files', 'Files', 'folder', 'default', true],
      ],
    );
  });

  await check('opening a window adds it last; the change event carries the model and the front window', async () => {
    await page.evaluate(() => (globalThis as any).df$.shadcn.win.open('w-calc'));
    await page.waitForTimeout(50);
    assert.deepEqual(await ids(), ['w-notes', 'w-files', 'w-calc']);
    const e = await last();
    assert.equal(e.active, 'w-calc');
    assert.deepEqual(
      e.windows.map((w: any) => w.id),
      ['w-notes', 'w-files', 'w-calc'],
    );
  });

  await check('a press brings a window to the front: the model follows', async () => {
    await page.click('#w-notes .window-body');
    await page.waitForTimeout(50);
    assert.equal((await last()).active, 'w-notes');
    assert.equal(await page.evaluate(() => (globalThis as any).df$.shadcn.windowManager.active('#wm1')?.id), 'w-notes');
  });

  await check('renaming a window (its title text) is a change', async () => {
    await page.evaluate(() => {
      document.querySelector('#w-files .window-title')!.textContent = 'Files - Documents';
    });
    await page.waitForTimeout(50);
    assert.equal((await last()).windows.find((w: any) => w.id === 'w-files').title, 'Files - Documents');
  });

  await check(
    'toggle(): the window in front minimizes, a minimized one comes back, another comes to the front',
    async () => {
      const toggle = (id: string) => page.evaluate((i) => (globalThis as any).df$.shadcn.windowManager.toggle(i), id);
      assert.equal(await toggle('w-notes'), 'minimized');
      await page.waitForTimeout(50);
      assert.equal((await last()).windows.find((w: any) => w.id === 'w-notes').state, 'minimized');
      assert.equal(await toggle('w-files'), 'default');
      await page.waitForTimeout(50);
      assert.equal((await last()).active, 'w-files');
      assert.equal(await toggle('w-notes'), 'default');
      await page.waitForTimeout(50);
      assert.equal((await last()).active, 'w-notes');
    },
  );

  await check('a maximized window minimized from the taskbar comes back maximized', async () => {
    await page.evaluate(() => (globalThis as any).df$.shadcn.win.maximize('w-calc'));
    const toggle = (id: string) => page.evaluate((i) => (globalThis as any).df$.shadcn.windowManager.toggle(i), id);
    assert.equal(await toggle('w-calc'), 'minimized');
    assert.equal(await toggle('w-calc'), 'maximized');
    await page.evaluate(() => (globalThis as any).df$.shadcn.win.restore('w-calc'));
  });

  await check('closing a window drops it from the model; reopened it goes last', async () => {
    await page.click('#w-notes .window-close');
    await page.waitForTimeout(80);
    assert.deepEqual(await ids(), ['w-files', 'w-calc']);
    await page.evaluate(() => (globalThis as any).df$.shadcn.win.open('w-notes'));
    await page.waitForTimeout(50);
    assert.deepEqual(await ids(), ['w-files', 'w-calc', 'w-notes']);
  });

  await check('each desktop keeps its own front window', async () => {
    await page.click('#w-other .window-body');
    await page.waitForTimeout(50);
    assert.equal(await page.getAttribute('#w-other', 'data-active'), '');
    assert.notEqual(
      await page.evaluate(() => (globalThis as any).df$.shadcn.windowManager.active('#wm1')?.id),
      undefined,
    );
    assert.equal(await page.evaluate(() => (globalThis as any).df$.shadcn.windowManager.windows('#wm2').length), 1);
  });

  await check(
    'show desktop: every window minimized, then the same ones back (setState desktop / default)',
    async () => {
      await page.evaluate(() => (globalThis as any).df$.shadcn.win.minimize('w-files'));
      const shown = await page.evaluate(() => (globalThis as any).df$.shadcn.windowManager.showDesktop('#wm1'));
      assert.equal(shown, true);
      assert.equal(await page.getAttribute('#wm1', 'data-desktop-shown'), '');
      assert.deepEqual(
        (await model()).map((w: any) => w.state),
        ['minimized', 'minimized', 'minimized'],
      );
      assert.equal(await page.evaluate(() => (document.querySelector('#wm1') as any).api.getState().name), 'desktop');
      await page.evaluate(() => (document.querySelector('#wm1') as any).api.setState('default'));
      // Files was minimized before: it stays minimized
      assert.deepEqual(
        (await model()).map((w: any) => [w.id, w.state]),
        [
          ['w-files', 'minimized'],
          ['w-calc', 'default'],
          ['w-notes', 'default'],
        ],
      );
    },
  );

  await check('a window that shows again ends the desktop state', async () => {
    await page.evaluate(() => (document.querySelector('#wm1') as any).api.setState('desktop'));
    await page.evaluate(() => (globalThis as any).df$.shadcn.windowManager.toggle('w-calc'));
    await page.waitForTimeout(80);
    assert.equal(await page.evaluate(() => (document.querySelector('#wm1') as any).api.getState().name), 'default');
  });

  await check('cascade and tile arrange this manager only', async () => {
    const other = await page.$eval('#w-other', (w) => (w as HTMLElement).style.getPropertyValue('--window-x'));
    await page.evaluate(() => (globalThis as any).df$.shadcn.windowManager.cascade('#wm1'));
    const xs = await page.$$eval('#wm1 .window[open]', (ws) => ws.map((w) => (w as HTMLElement).offsetLeft));
    assert.ok(new Set(xs).size === xs.length, 'stepped: ' + xs.join(' '));
    assert.equal(await page.$eval('#w-other', (w) => (w as HTMLElement).style.getPropertyValue('--window-x')), other);
  });

  await check('drawn scroll bars (data-scrollbars="virtual"): the bar follows and drives the scroll', async () => {
    await page.fill('#w-share textarea', Array.from({ length: 40 }, (_, i) => 'line ' + (i + 1)).join('\n'));
    await page.waitForSelector('#w-share .window-manager-scrollbar[data-axis="y"]:not([hidden])');
    const state = () =>
      page.evaluate(() => {
        const t = document.querySelector('#w-share textarea') as HTMLTextAreaElement;
        const thumb = document.querySelector(
          '#w-share [data-axis="y"]:not([hidden]) .window-manager-scrollbar-thumb',
        ) as HTMLElement;
        return {
          top: t.scrollTop,
          max: t.scrollHeight - t.clientHeight,
          thumb: thumb.offsetTop,
          native: t.offsetWidth - t.clientWidth - t.clientLeft * 2,
        };
      });
    // filling put the caret at the end (scrolled down): start from the top
    await page.evaluate(() => ((document.querySelector('#w-share textarea') as HTMLElement).scrollTop = 0));
    await page.waitForFunction(
      () =>
        (
          document.querySelector(
            '#w-share [data-axis="y"]:not([hidden]) .window-manager-scrollbar-thumb',
          ) as HTMLElement
        ).offsetTop === 0,
    );
    const s0 = await state();
    assert.equal(s0.top, 0);
    assert.equal(s0.thumb, 0);
    assert.equal(s0.native, 0, 'the native bar is hidden');
    assert.ok(s0.max > 50, 'the text overflows');
    // a button steps 16px
    await page.click('#w-share [data-axis="y"]:not([hidden]) .window-manager-scrollbar-button[data-step="1"]');
    await page.waitForFunction(() => (document.querySelector('#w-share textarea') as HTMLElement).scrollTop >= 16);
    // scrolled to the end, the thumb sits at the track's end
    await page.evaluate(() => {
      const t = document.querySelector('#w-share textarea') as HTMLElement;
      t.scrollTop = t.scrollHeight;
    });
    await page.waitForFunction(() => {
      const thumb = document.querySelector(
        '#w-share [data-axis="y"]:not([hidden]) .window-manager-scrollbar-thumb',
      ) as HTMLElement;
      return thumb.offsetTop + thumb.offsetHeight >= (thumb.parentElement as HTMLElement).clientHeight - 1;
    });
    // the thumb dragged back to the top scrolls to the top
    const thumb = (await page
      .locator('#w-share [data-axis="y"]:not([hidden]) .window-manager-scrollbar-thumb')
      .boundingBox())!;
    await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2);
    await page.mouse.down();
    await page.mouse.move(thumb.x + thumb.width / 2, thumb.y - 400, { steps: 4 });
    await page.mouse.up();
    assert.equal((await state()).top, 0);
    // a press on the track below the thumb pages down
    const track = (await page
      .locator('#w-share [data-axis="y"]:not([hidden]) .window-manager-scrollbar-track')
      .boundingBox())!;
    await page.mouse.click(track.x + track.width / 2, track.y + track.height - 2);
    assert.ok((await state()).top > 16, 'the track paged');
  });

  await check(
    'across browser windows (data-share): a window dragged onto the browser window beside moves there',
    async () => {
      // two browser windows side by side on one screen, the same page in each
      const ctx = await browser.newContext({ viewport: null });
      try {
        const [a, b] = [await ctx.newPage(), await ctx.newPage()];
        for (const [p, left] of [
          [a, 0],
          [b, 900],
        ] as const) {
          const cdp = await ctx.newCDPSession(p);
          const { windowId } = await cdp.send('Browser.getWindowForTarget');
          await cdp.send('Browser.setWindowBounds', { windowId, bounds: { left, top: 0, width: 900, height: 820 } });
          await p.goto(`${server.url}/tests/e2e/desktop/window-manager.e2e-fixture.html`);
          await p.waitForSelector('#wm-share[data-init]');
        }
        await b.evaluate(() => (document.querySelector('#w-share') as HTMLDialogElement).close());
        await a.fill('#w-share textarea', 'travels along');
        const bar = (await a.locator('#w-share .window-title').boundingBox())!;
        const [x0, y0] = [bar.x + 20, bar.y + bar.height / 2];
        await a.mouse.move(x0, y0);
        await a.mouse.down();
        for (let dx = 60; dx <= 900; dx += 60) await a.mouse.move(x0 + dx, y0);
        // while it moves, the browser window beside shows it - not as one of its own windows yet
        await b.waitForSelector('#w-share[open][data-share-remote]');
        assert.deepEqual(
          await b.evaluate(() =>
            (globalThis as any).df$.shadcn.windowManager.windows('#wm-share').map((w: any) => w.id),
          ),
          [],
        );
        await a.mouse.up();
        await b.waitForSelector('#w-share[open]:not([data-share-remote])');
        await a.waitForFunction(() => !(document.querySelector('#w-share') as HTMLDialogElement).open);
        assert.equal(await b.inputValue('#w-share textarea'), 'travels along');
        // the same place on the screen: dragged 900px right from x 40, the browser window beside starts 900px right
        const left = await b.evaluate(() => (document.querySelector('#w-share') as HTMLElement).offsetLeft);
        assert.ok(Math.abs(left - 40) < 30, `placed at ${left}`);
        assert.deepEqual(
          await b.evaluate(() =>
            (globalThis as any).df$.shadcn.windowManager.windows('#wm-share').map((w: any) => w.id),
          ),
          ['w-share'],
        );
        // dropped where no browser window is (below both), it comes back inside its own desktop
        const bar2 = (await b.locator('#w-share .window-title').boundingBox())!;
        await b.mouse.move(bar2.x + 20, bar2.y + 5);
        await b.mouse.down();
        for (let dy = 100; dy <= 1000; dy += 100) await b.mouse.move(bar2.x + 20, bar2.y + 5 + dy);
        await b.mouse.up();
        await b.waitForFunction(() => {
          const w = document.querySelector('#w-share') as HTMLElement;
          const m = document.querySelector('#wm-share') as HTMLElement;
          return (w as HTMLDialogElement).open && w.offsetTop < m.clientHeight;
        });
        assert.equal(await a.evaluate(() => (document.querySelector('#w-share') as HTMLDialogElement).open), false);
      } finally {
        await ctx.close();
      }
    },
  );

  await check('render() contract: both states', async () => {
    await assertRenderContract(page, '.window-manager[id]', ['default', 'desktop'], {
      runtimeOwned: '.window',
    });
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`window-manager.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('window-manager.e2e: all checks passed');
