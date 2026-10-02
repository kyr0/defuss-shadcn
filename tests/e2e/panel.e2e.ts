import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: a panel is a card with a title bar whose minimize / maximize tools are
 * Swaps. These checks drive the real dist/ files: the swaps and the State API
 * stay in step, minimized releases the space below the title bar, in a border
 * layout north / south fold to the bar and west / east turn it into a vertical
 * tab (the region shrinks with it, the divider rests), maximized fills the
 * layout / [data-panel-host] / viewport and Escape restores, and the
 * imperative API + panel-change event work.
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
  const page = await browser.newPage({ viewport: { width: 1100, height: 1800 } });
  page.on('pageerror', (e) => {
    failures++;
    console.error(`  ✗ page error: ${e.message}`);
  });
  await page.goto(`${server.url}/tests/e2e/panel.e2e-fixture.html`);
  await page.waitForSelector('#solo[data-init]');
  await page.waitForSelector('#bl[data-init] #r-w > .resizer-handle');
  await page.waitForTimeout(150);

  const rect = (sel: string) => page.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; });
  const state = (sel: string) => page.$eval(sel, (e) => (e as any).api.getState().name);
  const set = (sel: string, name: string) => page.$eval(sel, (e, n) => (e as any).api.setState(n), name);
  const checked = (sel: string) => page.$eval(sel, (e) => (e as HTMLInputElement).checked);

  await check('init: the panel is a card with a title bar; regions are found (data-region); the minimize tool controls the body', async () => {
    const r = await page.evaluate(() => ({
      card: getComputedStyle(document.getElementById('solo')!).borderTopWidth,
      bar: getComputedStyle(document.querySelector('#solo > .panel-header')!).display,
      regions: ['solo', 'p-n', 'p-w', 'p-c', 'p-e', 'p-s'].map((id) => document.getElementById(id)!.dataset.region ?? null),
      controls: document.querySelector('#solo .panel-minimize input')!.getAttribute('aria-controls') === document.querySelector('#solo > .panel-body')!.id,
      states: (globalThis as any).df$.shadcn.panelStates,
    }));
    assert.equal(r.card, '1px');
    assert.equal(r.bar, 'flex');
    assert.deepEqual(r.regions, [null, 'north', 'west', 'center', 'east', 'south']);
    assert.ok(r.controls);
    assert.deepEqual(r.states, ['default', 'minimized', 'maximized']);
  });

  await check('state "default": title bar + body at the authored height, both swaps off', async () => {
    assert.equal(await state('#solo'), 'default');
    assert.equal((await rect('#solo')).h, 200);
    assert.equal(await checked('#solo .panel-minimize input'), false);
    assert.equal(await checked('#solo .panel-maximize input'), false);
  });

  await check('state "minimized" via the swap: the body goes, the panel is the title bar, the swap shows its on face', async () => {
    await page.click('#solo .panel-minimize');
    assert.equal(await state('#solo'), 'minimized');
    const r = await page.evaluate(() => {
      const p = document.getElementById('solo')!;
      return {
        h: p.getBoundingClientRect().height,
        bar: p.querySelector('.panel-header')!.getBoundingClientRect().height,
        body: getComputedStyle(p.querySelector('.panel-body')!).display,
        footer: getComputedStyle(p.querySelector('.panel-footer')!).display,
        inert: (p.querySelector('.panel-body') as HTMLElement).inert,
        on: getComputedStyle(p.querySelector('.panel-minimize .swap-on')!).opacity,
      };
    });
    assert.equal(r.body, 'none');
    assert.equal(r.footer, 'none');
    assert.ok(r.inert);
    assert.ok(Math.abs(r.h - r.bar - 2) <= 1, `panel ${r.h} vs bar ${r.bar} + borders`);
    await page.waitForTimeout(350);
    assert.equal(await page.$eval('#solo .panel-minimize .swap-on', (e) => getComputedStyle(e).opacity), '1');
    await page.click('#solo .panel-minimize');
    assert.equal(await state('#solo'), 'default');
    assert.equal((await rect('#solo')).h, 200);
  });

  await check('double-click on the title folds and restores; data-title-collapse="false" opts out', async () => {
    await page.dblclick('#solo .panel-title');
    assert.equal(await state('#solo'), 'minimized');
    assert.equal(await checked('#solo .panel-minimize input'), true);
    await page.dblclick('#solo .panel-title');
    assert.equal(await state('#solo'), 'default');
    await page.dblclick('#hosted .panel-title');
    assert.equal(await state('#hosted'), 'default');
  });

  await check('setState("minimized") checks the swap; Space on the focused tool toggles', async () => {
    await set('#solo', 'minimized');
    assert.equal(await checked('#solo .panel-minimize input'), true);
    await page.focus('#solo .panel-minimize input');
    await page.keyboard.press('Space');
    assert.equal(await state('#solo'), 'default');
    const err = await page.$eval('#solo', (e) => { try { (e as any).api.setState('folded'); return ''; } catch (x) { return String(x); } });
    assert.match(err, /unknown state "folded"/);
  });

  await check('state "maximized" outside a layout: fills the viewport; Escape restores and refocuses the tool', async () => {
    await page.click('#solo .panel-maximize');
    assert.equal(await state('#solo'), 'maximized');
    const r = await page.$eval('#solo', (e) => ({ pos: getComputedStyle(e).position, w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height }));
    assert.equal(r.pos, 'fixed');
    assert.equal(r.w, 1100);
    assert.equal(r.h, 1800);
    await page.focus('#solo .panel-body .btn');
    await page.keyboard.press('Escape');
    assert.equal(await state('#solo'), 'default');
    assert.equal(await page.evaluate(() => document.activeElement?.closest('.panel-maximize') !== null), true);
    assert.equal((await rect('#solo')).w, 360);
  });

  await check('minimized and maximized exclude each other', async () => {
    await set('#solo', 'minimized');
    await set('#solo', 'maximized');
    assert.equal(await checked('#solo .panel-minimize input'), false);
    assert.equal(await page.$eval('#solo', (e) => e.hasAttribute('data-minimized')), false);
    await set('#solo', 'default');
  });

  await check('border layout south: minimized, the region shrinks to the title bar; the divider rests; restore brings 110px back', async () => {
    const before = await rect('#r-s');
    const centerBefore = await rect('#center');
    await page.click('#p-s .panel-minimize');
    const after = await rect('#r-s');
    const bar = await rect('#p-s > .panel-header');
    assert.equal(before.h, 110);
    assert.equal(after.h, bar.h);
    assert.equal((await rect('#center')).h, centerBefore.h + (before.h - after.h));
    const r = await page.$eval('#r-s', (e) => ({ hook: e.hasAttribute('data-panel-minimized'), inert: (e.querySelector(':scope > .resizer-handle') as HTMLElement).inert }));
    assert.deepEqual(r, { hook: true, inert: true });
    // the chevron points down: south folds downward
    assert.equal(await page.$eval('#p-s .panel-minimize', (e) => getComputedStyle(e).rotate), '180deg');
    await page.click('#p-s .panel-minimize');
    assert.equal((await rect('#r-s')).h, 110);
    assert.equal(await page.$eval('#r-s > .resizer-handle', (e) => (e as HTMLElement).inert), false);
  });

  await check('border layout north: minimized, the region is the title bar', async () => {
    await set('#p-n', 'minimized');
    assert.equal((await rect('#r-n')).h, (await rect('#p-n > .panel-header')).h);
    await set('#p-n', 'default');
    assert.equal((await rect('#r-n')).h, 96);
  });

  await check('border layout west: minimized, the title bar turns into a vertical tab and the region shrinks to its width', async () => {
    await page.click('#p-w .panel-minimize');
    const r = await page.evaluate(() => {
      const p = document.getElementById('p-w')!;
      const header = p.querySelector('.panel-header')!;
      const region = document.getElementById('r-w')!.getBoundingClientRect();
      const tools = p.querySelector('.panel-tools')!.getBoundingClientRect();
      const title = p.querySelector('.panel-title')!.getBoundingClientRect();
      return {
        mode: getComputedStyle(header).writingMode,
        w: Math.round(region.width), h: Math.round(region.height),
        headerH: Math.round(header.getBoundingClientRect().height),
        titleVisible: title.height > 20 && title.width > 0,
        toolsFirst: tools.top < title.top,
        max: getComputedStyle(p.querySelector('.panel-maximize')!).display,
        rotate: getComputedStyle(p.querySelector('.panel-minimize')!).rotate,
      };
    });
    assert.equal(r.mode, 'vertical-rl');
    assert.ok(r.w >= 30 && r.w <= 48, `tab width ${r.w}`);
    assert.equal(r.headerH, r.h, 'the tab runs the full height');
    assert.ok(r.titleVisible);
    assert.ok(r.toolsFirst, 'the restore tool leads');
    assert.equal(r.max, 'none');
    assert.equal(r.rotate, '-90deg');
    // restored from the tab: the authored width comes back
    await page.click('#p-w .panel-minimize');
    assert.equal((await rect('#r-w')).w, 200);
  });

  await check('border layout east: same vertical tab, chevron turned to the right', async () => {
    await set('#p-e', 'minimized');
    const w = (await rect('#r-e')).w;
    assert.ok(w >= 30 && w <= 48, `tab width ${w}`);
    assert.equal(await page.$eval('#p-e .panel-minimize', (e) => getComputedStyle(e).rotate), '90deg');
    await set('#p-e', 'default');
    assert.equal((await rect('#r-e')).w, 180);
  });

  await check('a dragged size survives a fold: drag west to 260, minimize, restore → 260', async () => {
    const h = (await page.locator('#r-w > .resizer-handle').boundingBox())!;
    await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
    await page.mouse.down();
    await page.mouse.move(h.x + h.width / 2 + 60, h.y + h.height / 2, { steps: 6 });
    await page.mouse.up();
    assert.equal((await rect('#r-w')).w, 260);
    await set('#p-w', 'minimized');
    await set('#p-w', 'default');
    assert.equal((await rect('#r-w')).w, 260);
  });

  await check('maximized in a border layout: fills the layout, the dividers rest; Escape restores', async () => {
    await set('#p-c', 'maximized');
    const layout = await rect('#bl');
    const p = await rect('#p-c');
    assert.ok(Math.abs(p.x - layout.x - 1) <= 1 && Math.abs(p.w - layout.w + 2) <= 1, `panel ${JSON.stringify(p)} in ${JSON.stringify(layout)}`);
    assert.ok(Math.abs(p.h - layout.h + 2) <= 1);
    assert.equal(await page.$eval('#bl', (e) => e.hasAttribute('data-panel-maximized')), true);
    assert.equal(await page.$eval('#r-w > .resizer-handle', (e) => getComputedStyle(e).visibility), 'hidden');
    // on top even though its region (a <main> with a view-transition-name) is a stacking context
    const top = await page.evaluate(() => ['#p-e .panel-minimize', '#p-s .panel-title', '#p-w .panel-title'].map((s) => { const b = document.querySelector(s)!.getBoundingClientRect(); return document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)?.closest('.panel')?.id; }));
    assert.deepEqual(top, ['p-c', 'p-c', 'p-c']);
    await page.focus('#p-c .panel-maximize input');
    await page.keyboard.press('Escape');
    assert.equal(await state('#p-c'), 'default');
    assert.equal(await page.$eval('#bl', (e) => e.hasAttribute('data-panel-maximized')), false);
    assert.equal(await page.$eval('#r-w > .resizer-handle', (e) => getComputedStyle(e).visibility), 'visible');
  });

  await check('maximized in a [data-panel-host]: fills the host', async () => {
    await set('#hosted', 'maximized');
    const host = await rect('#host');
    const p = await rect('#hosted');
    assert.ok(Math.abs(p.w - (host.w - 2)) <= 1 && Math.abs(p.h - (host.h - 2)) <= 1, `${JSON.stringify(p)} in ${JSON.stringify(host)}`);
    await set('#hosted', 'default');
  });

  await check('in a layout the panel drops its card border; a gap layout cards it again', async () => {
    const r = await page.evaluate(() => ({
      plain: getComputedStyle(document.getElementById('p-w')!).borderTopWidth,
      center: getComputedStyle(document.getElementById('p-c')!).borderTopWidth,
      gap: getComputedStyle(document.getElementById('g-w')!).borderTopWidth,
      gapRegion: document.getElementById('g-w')!.dataset.region,
    }));
    assert.deepEqual(r, { plain: '0px', center: '0px', gap: '1px', gapRegion: 'west' });
  });

  await check('data-minimized in markup starts folded: the east inspector is a vertical tab from the first paint', async () => {
    assert.equal(await state('#p-start'), 'minimized');
    assert.equal(await checked('#p-start .panel-minimize input'), true);
    const w = (await rect('#r-start')).w;
    assert.ok(w >= 30 && w <= 48, `tab width ${w}`);
    await page.click('#p-start .panel-minimize');
    assert.equal((await rect('#r-start')).w, 200);
  });

  await check('a panel without tools: no minimize on double-click, the API still works', async () => {
    await page.dblclick('#bare .panel-title');
    assert.equal(await state('#bare'), 'default');
    await set('#bare', 'minimized');
    assert.equal(await page.$eval('#bare .panel-body', (e) => getComputedStyle(e).display), 'none');
    await set('#bare', 'default');
  });

  await check('df$.shadcn.panel: minimize / maximize / restore / toggle by id; panel-change carries state, previous, region', async () => {
    const r = await page.evaluate(() => {
      const api = (globalThis as any).df$.shadcn.panel;
      const log: string[] = [];
      document.getElementById('p-s')!.addEventListener('panel-change', (e: any) => log.push(`${e.detail.region}:${e.detail.previous}>${e.detail.state}`));
      const toggled = api.toggle('p-s');
      api.restore('#p-s');
      api.maximize('p-s');
      api.restore('p-s');
      const back = api.toggle('p-s');
      api.minimize('p-s');
      api.minimize('p-s'); // no change, no event
      api.restore('p-s');
      return { toggled, back, log };
    });
    assert.equal(r.toggled, true);
    assert.equal(r.back, true);
    assert.deepEqual(r.log, [
      'south:default>minimized', 'south:minimized>default', 'south:default>maximized', 'south:maximized>default',
      'south:default>minimized', 'south:minimized>default',
    ]);
  });
} finally {
  await browser.close();
  server.stop?.();
}

if (failures) {
  console.error(`\npanel e2e: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\npanel e2e: all checks passed');
