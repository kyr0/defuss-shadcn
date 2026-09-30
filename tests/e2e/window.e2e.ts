import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: a window is a non-modal <dialog> the runtime makes movable. These
 * checks drive the real controls on the real dist/ files: dragging the bar
 * (and the arrow keys) moves it but never loses it, pressing raises it, the
 * × closes it natively and the state follows, maximize / minimize /
 * double-click work and restore a native resize, every State API state
 * lands, df$.shadcn.win creates and arranges windows, the four chromes
 * render - and dialog.js, loaded first, leaves .window dialogs alone.
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
  const page = await browser.newPage({ viewport: { width: 1000, height: 1300 } });
  page.on('pageerror', (e) => {
    failures++;
    console.error(`  ✗ page error: ${e.message}`);
  });
  await page.goto(`${server.url}/tests/e2e/window.e2e-fixture.html`);
  await page.waitForSelector('#w1[data-init]');

  const rect = (sel: string) => page.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const pos = (id: string) => page.$eval(`#${id}`, (e) => ({ x: (e as HTMLElement).offsetLeft, y: (e as HTMLElement).offsetTop }));
  const state = (id: string) => page.$eval(`#${id}`, (e) => (e as HTMLElement).dataset.stateName);
  const z = (id: string) => page.$eval(`#${id}`, (e) => Number((e as HTMLElement).style.zIndex));
  const api = (id: string, name: string, config: object = {}) =>
    page.evaluate(([i, n, c]) => (document.getElementById(i as string) as any).api.setState(n, c), [id, name, config] as const);

  await check('window.js owns its dialogs (dialog.js loaded first leaves them): api, labelled, focusable bar, initial states', async () => {
    const r = await page.evaluate(() => {
      const w = document.getElementById('w1')!;
      return {
        api: typeof (w as any).api?.setState,
        labelled: document.getElementById(w.getAttribute('aria-labelledby')!)?.textContent,
        tab: (w.querySelector('.window-titlebar') as HTMLElement).tabIndex,
        active: document.querySelectorAll('.window[data-active]').length,
        dialogs: Array.from(document.querySelectorAll('dialog.window')).every((d) => typeof (d as any).api?.setState === 'function'),
      };
    });
    assert.deepEqual(r, { api: 'function', labelled: 'Notes', tab: 0, active: 1, dialogs: true });
    assert.equal(await state('w1'), 'default');
    assert.equal(await state('w-closed'), 'closed');
    assert.equal(await state('w-max'), 'maximized');
    assert.equal(await page.$eval('#w-closed', (e) => getComputedStyle(e).display), 'none');
  });

  await check('pressing a window raises it: highest z-index, data-active moves, window-focus fires', async () => {
    await page.evaluate(() => {
      (globalThis as any).__focus = [];
      document.addEventListener('window-focus', (e: any) => (globalThis as any).__focus.push(e.detail.title));
    });
    await page.click('#w1-body');
    const zs = await Promise.all(['w1', 'w-mac', 'w-linux', 'w-retro'].map(z));
    assert.equal(zs[0], Math.max(...zs), `z ${zs}`);
    assert.equal(await page.$$eval('.window[data-active]', (l) => l.map((e) => e.id).join()), 'w1');
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__focus), ['Notes']);
    const inactive = await page.$eval('#w-mac > .window-titlebar', (e) => getComputedStyle(e).color);
    const active = await page.$eval('#w1 > .window-titlebar', (e) => getComputedStyle(e).color);
    assert.notEqual(inactive, active, 'inactive windows dim their title');
  });

  await check('dragging the title bar moves the window by the pointer delta; window-move reports it', async () => {
    const before = await pos('w1');
    const bar = await rect('#w1 .window-title');
    await page.evaluate(() => document.addEventListener('window-move', (e: any) => ((globalThis as any).__move = e.detail)));
    await page.mouse.move(bar.x + 10, bar.y + 5);
    await page.mouse.down();
    await page.mouse.move(bar.x + 60, bar.y + 35, { steps: 5 });
    await page.mouse.move(bar.x + 110, bar.y + 55, { steps: 5 });
    await page.mouse.up();
    const after = await pos('w1');
    assert.deepEqual([after.x - before.x, after.y - before.y], [100, 50]);
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__move), after);
  });

  await check('a window can never be dragged out of reach: its bar stays inside the desktop', async () => {
    const bar = await rect('#w1 .window-title');
    await page.mouse.move(bar.x + 10, bar.y + 5);
    await page.mouse.down();
    await page.mouse.move(bar.x - 2000, bar.y - 2000, { steps: 4 });
    await page.mouse.up();
    let p = await pos('w1');
    const ctl = await page.$eval('#w1 .window-controls', (e) => (e as HTMLElement).offsetWidth);
    assert.equal(p.y, 0, 'top clamps to 0');
    assert.equal(p.x, 48 + ctl - 300, 'keeps 48px of grabbable bar (plus the controls) on screen at the left');
    await page.mouse.move(0, 0);
    const bar2 = await rect('#w1 .window-controls');
    await page.mouse.move(bar2.x - 20, bar2.y + 5);
    await page.mouse.down();
    await page.mouse.move(3000, 3000, { steps: 4 });
    await page.mouse.up();
    p = await pos('w1');
    const bh = await page.$eval('#w1 .window-titlebar', (e) => (e as HTMLElement).offsetHeight);
    assert.deepEqual(p, { x: 800 - 48 - ctl, y: 480 - bh });
    await page.evaluate(() => (globalThis as any).df$.shadcn.win.move('w1', 20, 20));
  });

  await check('keyboard: title bar focused + arrows move 16px, Shift 64px', async () => {
    await page.evaluate(() => (globalThis as any).df$.shadcn.win.move('w1', 20, 20));
    await page.focus('#w1 .window-titlebar');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+ArrowDown');
    assert.deepEqual(await pos('w1'), { x: 36, y: 84 });
  });

  await check('□ maximizes to fill the desktop (label → Restore); double-clicking the bar restores', async () => {
    await page.click('#w1 .window-maximize');
    const w = await rect('#w1'), d = await rect('#desk');
    assert.deepEqual([Math.round(w.x), Math.round(w.y), Math.round(w.w), Math.round(w.h)], [Math.round(d.x), Math.round(d.y), Math.round(d.w), Math.round(d.h)]);
    assert.equal(await state('w1'), 'maximized');
    assert.equal(await page.$eval('#w1 .window-maximize', (e) => e.getAttribute('aria-label')), 'Restore');
    await page.dblclick('#w1 .window-title');
    assert.equal(await state('w1'), 'default');
    assert.deepEqual(await pos('w1'), { x: 36, y: 84 }, 'back where it was');
  });

  await check('− rolls the window up to its title bar; again restores', async () => {
    await page.click('#w1 .window-minimize');
    assert.equal(await state('w1'), 'minimized');
    const r = await page.evaluate(() => ({
      body: getComputedStyle(document.getElementById('w1-body')!).display,
      toolbar: getComputedStyle(document.getElementById('w1-toolbar')!).display,
      h: document.getElementById('w1')!.getBoundingClientRect().height,
      bar: (document.querySelector('#w1 .window-titlebar') as HTMLElement).offsetHeight,
    }));
    assert.equal(r.body, 'none');
    assert.equal(r.toolbar, 'none', 'the toolbar rolls up too');
    assert.ok(Math.abs(r.h - r.bar) <= 2, `height ${r.h} ≈ bar ${r.bar}`);
    await page.click('#w1 .window-minimize');
    assert.equal(await state('w1'), 'default');
  });

  await check('a native resize survives maximize / minimize and comes back on restore', async () => {
    await page.$eval('#w1', (e) => { (e as HTMLElement).style.width = '350px'; (e as HTMLElement).style.height = '200px'; });
    await api('w1', 'maximized');
    assert.equal(await page.$eval('#w1', (e) => (e as HTMLElement).style.width), '');
    await api('w1', 'default');
    const r = await rect('#w1');
    assert.deepEqual([Math.round(r.w), Math.round(r.h)], [350, 200]);
  });

  await check('× closes natively (form method="dialog") → closed; another window becomes active; default reopens', async () => {
    await page.click('#w1-body');
    await page.click('#w1 .window-close');
    assert.equal(await page.$eval('#w1', (e) => (e as HTMLDialogElement).open), false);
    assert.equal(await page.evaluate(() => (document.getElementById('w1') as any).api.getState().name), 'closed', 'getState knows at once');
    await page.waitForFunction(() => document.getElementById('w1')!.dataset.stateName === 'closed');
    assert.equal(await page.$$eval('.window[data-active]', (l) => l.length), 1, 'the next window took over');
    await api('w1', 'default');
    assert.equal(await page.$eval('#w1', (e) => (e as HTMLDialogElement).open), true);
    assert.equal(await page.$$eval('.window[data-active]', (l) => l.map((e) => e.id).join()), 'w1');
  });

  await check('State API: default { x, y } moves, maximized / minimized / closed land; getState; unknown throws', async () => {
    await api('w-closed', 'default', { x: 150, y: 120 });
    assert.equal(await page.$eval('#w-closed', (e) => (e as HTMLDialogElement).open), true);
    assert.deepEqual(await pos('w-closed'), { x: 150, y: 120 });
    for (const s of ['maximized', 'minimized', 'closed', 'default']) {
      await api('w-closed', s);
      assert.equal(await state('w-closed'), s);
    }
    assert.deepEqual(await page.evaluate(() => (document.getElementById('w-closed') as any).api.getState()), { name: 'default', config: {} });
    const threw = await page.evaluate(() => { try { (document.getElementById('w1') as any).api.setState('nope'); return false; } catch { return true; } });
    assert.equal(threw, true);
    await api('w-closed', 'closed');
  });

  await check('df$.shadcn.win: create (title, icon, content, statusbar, size, chrome) → open + active; move / resize / list / active / close', async () => {
    const r = await page.evaluate(() => {
      const win = (globalThis as any).df$.shadcn.win;
      const w = win.create({ parent: '#desk3', id: 'made', title: 'Made', icon: 'file', content: 'Hello', statusbar: 'ok', width: 200, x: 10, y: 10, chrome: 'linux' });
      const moved = win.move('made', 40, 30);
      win.resize(w, 220, 150);
      return {
        tag: w.tagName, open: w.open, active: win.active() === w, title: w.querySelector('.window-title').textContent,
        body: w.querySelector('.window-body').textContent, status: w.querySelector('.window-statusbar').textContent,
        icon: w.querySelector('.window-icon')?.getAttribute('data-lucide'), chrome: w.dataset.chrome, form: w.querySelector('form.window-controls')?.getAttribute('method'),
        moved, size: [w.offsetWidth, w.offsetHeight], listed: win.list('#desk3').length, api: typeof w.api?.setState,
      };
    });
    assert.deepEqual(r, {
      tag: 'DIALOG', open: true, active: true, title: 'Made', body: 'Hello', status: 'ok', icon: 'file', chrome: 'linux', form: 'dialog',
      moved: { x: 40, y: 30 }, size: [220, 150], listed: 1, api: 'function',
    });
    await page.click('#made .window-close');
    await page.waitForFunction(() => document.getElementById('made')!.dataset.stateName === 'closed', null, { timeout: 3000 });
  });

  await check('cascade steps the open windows diagonally; tile fills the desktop in a grid', async () => {
    const r = await page.evaluate(() => {
      const win = (globalThis as any).df$.shadcn.win;
      ['a', 'b', 'c'].forEach((t) => win.create({ parent: '#desk3', title: t, width: 150 }));
      win.cascade('#desk3');
      const cas = win.list('#desk3').map((w: HTMLElement) => [w.offsetLeft, w.offsetTop]);
      win.tile('#desk3');
      const til = win.list('#desk3').map((w: HTMLElement) => [w.offsetLeft, w.offsetTop, w.offsetWidth, w.offsetHeight]);
      return { cas, til };
    });
    assert.deepEqual(r.cas.map((p: number[]) => p[0] - p[1]), [0, 0, 0], 'diagonal');
    assert.equal(new Set(r.cas.map((p: number[]) => p[0])).size, 3);
    assert.deepEqual(r.til, [[0, 0, 300, 150], [300, 0, 300, 150], [0, 150, 300, 150]]);
  });

  await check('the × hovers red with a white glyph (never white on the light control tint); minimize keeps the tint', async () => {
    await page.evaluate(() => (globalThis as any).df$.shadcn.win.open('w1'));
    const hover = async (sel: string) => {
      await page.hover(sel);
      await page.waitForTimeout(200); // the 120ms colour transition
      return page.$eval(sel, (e) => ({ bg: getComputedStyle(e).backgroundColor, fg: getComputedStyle(e).color }));
    };
    const close = await hover('#w1 .window-close');
    const min = await hover('#w1 .window-minimize');
    assert.equal(close.bg, 'oklch(0.58 0.21 27)', 'the × hovers red');
    assert.equal(close.fg, 'oklch(0.99 0 0)', 'with a white glyph');
    assert.notEqual(min.bg, close.bg, 'minimize keeps the light tint');
    assert.notEqual(min.fg, close.fg, 'and a dark glyph');
    await page.mouse.move(0, 0);
  });

  await check('chrome: mac lights left of the title and round; linux round buttons; retro gradient bar; markup-maximized fills', async () => {
    const r = await page.evaluate(() => {
      const g = (s: string) => getComputedStyle(document.querySelector(s)!);
      const x = (s: string) => document.querySelector(s)!.getBoundingClientRect().x;
      return {
        macLeft: x('#w-mac .window-close') < x('#w-mac .window-title'),
        macOrder: x('#w-mac .window-close') < x('#w-mac .window-minimize') && x('#w-mac .window-minimize') < x('#w-mac .window-maximize'),
        macRound: parseFloat(g('#w-mac .window-close').borderTopLeftRadius) > 5,
        linuxRound: parseFloat(g('#w-linux .window-close').borderTopLeftRadius) > 5,
        winRight: x('#w1 .window-close') > x('#w1 .window-title'),
        retro: g('#w-retro > .window-titlebar').backgroundImage.includes('gradient'),
        max: (() => { const w = document.getElementById('w-max')!.getBoundingClientRect(), d = document.getElementById('desk2')!.getBoundingClientRect(); return Math.round(w.width) === Math.round(d.width) && Math.round(w.height) === Math.round(d.height); })(),
      };
    });
    assert.deepEqual(r, { macLeft: true, macOrder: true, macRound: true, linuxRound: true, winRight: true, retro: true, max: true });
  });
} finally {
  await browser.close();
  server.stop?.();
}

if (failures) {
  console.error(`\nwindow.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('window.e2e: all checks passed');
