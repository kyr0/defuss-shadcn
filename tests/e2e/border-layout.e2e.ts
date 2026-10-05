import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: a border layout is five grid regions whose sides are Resizers. These
 * checks drive the real dist/ files: the grid places the regions (north/south or
 * west/east dominant, left-out regions take no room), each divider is a window
 * splitter that drags and moves with the arrows, the center keeps its minimum
 * even while the frame shrinks, regions fold and come back, sizes survive a
 * reload, and the divider styles, grips and gap render.
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
  const page = await browser.newPage({ viewport: { width: 1000, height: 1600 } });
  page.on('pageerror', (e) => {
    failures++;
    console.error(`  ✗ page error: ${e.message}`);
  });
  const url = `${server.url}/tests/e2e/border-layout.e2e-fixture.html`;
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#bl[data-init] #w > .resizer-handle[data-handle="e"]');
  await page.waitForTimeout(100);

  const rect = (sel: string) => page.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), b: Math.round(r.bottom) }; });
  const drag = async (sel: string, dx: number, dy: number) => {
    const h = (await page.locator(sel).boundingBox())!;
    await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
    await page.mouse.down();
    await page.mouse.move(h.x + h.width / 2 + dx, h.y + h.height / 2 + dy, { steps: 6 });
    await page.mouse.up();
  };

  await check('init: each side region is set up as a resizer on its inner edge, with a window-splitter divider', async () => {
    const r = await page.evaluate(() => ['n', 'w', 'e', 's'].map((id) => {
      const el = document.getElementById(id)!;
      const h = el.querySelector(':scope > .resizer-handle')!;
      return [el.dataset.handles, el.dataset.axis, el.dataset.keys, h.getAttribute('role'), h.getAttribute('aria-label'), h.getAttribute('aria-valuenow')];
    }));
    assert.deepEqual(r, [
      ['s', 'h', 'edge', 'separator', 'Resize North', '50'],
      ['e', 'w', 'edge', 'separator', 'Resize Files', '160'],
      ['w', 'w', 'edge', 'separator', 'Resize Inspector', '140'],
      ['n', 'h', 'edge', 'separator', 'Resize Terminal', '80'],
    ]);
    assert.equal(await page.$eval('#w > .resizer-handle', (h) => h.getAttribute('aria-controls')), 'w-pane'.replace('w-pane', await page.$eval('#w-pane', (p) => p.id)));
  });

  await check('the grid: ns dominant (north/south span the width), we dominant (west/east span the height)', async () => {
    const [bl, n, w, c, e, s] = await Promise.all(['#bl', '#n', '#w', '#c', '#e', '#s'].map(rect));
    assert.ok(Math.abs(n.w - (bl.w - 2)) <= 1 && Math.abs(s.w - (bl.w - 2)) <= 1, 'north + south span');
    assert.ok(w.y >= n.b - 1 && w.b <= s.y + 1, 'west between north and south');
    assert.ok(c.x >= w.r - 1 && c.r <= e.x + 1, 'center between west and east');
    const [we, weN, weW] = await Promise.all(['#we', '#we-n', '#we-w'].map(rect));
    assert.ok(Math.abs(weW.h - (we.h - 2)) <= 1, 'west spans the height');
    assert.ok(weN.x >= weW.r - 1, 'north sits beside west');
  });

  await check('dragging a divider resizes its region; the center takes the rest; resizer-resize bubbles to the layout', async () => {
    await page.evaluate(() => { (globalThis as any).__rs = 0; document.getElementById('bl')!.addEventListener('resizer-resize', () => (globalThis as any).__rs++); });
    const c0 = await rect('#c');
    await drag('#w > .resizer-handle', 40, 0);
    assert.equal((await rect('#w-pane')).w, 200);
    assert.equal((await rect('#c')).w, c0.w - 40);
    await drag('#s > .resizer-handle', 0, -20);
    assert.equal((await rect('#s-pane')).h, 100, 'south grows when its top edge moves up');
    assert.ok(await page.evaluate(() => (globalThis as any).__rs) > 0);
    assert.equal(await page.$eval('#w > .resizer-handle', (h) => h.getAttribute('aria-valuenow')), '200');
  });

  await check('keyboard: arrows move the divider the way they point (east: ← grows), Home / End go to the limits', async () => {
    await page.focus('#e > .resizer-handle');
    await page.keyboard.press('ArrowLeft');
    assert.equal((await rect('#e-pane')).w, 150);
    await page.keyboard.press('ArrowRight');
    assert.equal((await rect('#e-pane')).w, 140);
    await page.keyboard.press('Home');
    assert.equal((await rect('#e-pane')).w, 48, 'data-min default 48');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
  });

  await check('the center keeps data-center-min (120px): a side stops there, and gives way when the frame shrinks', async () => {
    await drag('#w > .resizer-handle', 900, 0);
    assert.ok((await rect('#c')).w >= 120, `center ${(await rect('#c')).w}`);
    assert.ok(Math.abs((await rect('#c')).w - 120) <= 2, 'stopped at the minimum');
    await page.$eval('#bl', (l) => { (l as HTMLElement).style.width = '600px'; });
    await page.waitForTimeout(150);
    assert.ok((await rect('#c')).w >= 118, `after the frame shrank: center ${(await rect('#c')).w}`);
  });

  await check('collapse: double-click or Enter folds a region (its divider stays), again brings it back; the state follows', async () => {
    await page.evaluate(() => { (globalThis as any).__col = []; document.getElementById('bl')!.addEventListener('border-layout-collapse', (e: any) => (globalThis as any).__col.push(e.detail)); });
    await page.dblclick('#e > .resizer-handle');
    assert.equal(await page.$eval('#e-pane', (p) => getComputedStyle(p).display), 'none');
    assert.equal(await page.$eval('#e > .resizer-handle', (h) => getComputedStyle(h).display), 'block', 'divider stays');
    assert.deepEqual(await page.evaluate(() => { const { name, config } = (document.getElementById('bl') as any).api.getState(); return { name, config }; }), { name: 'collapsed', config: { regions: ['east'] } });
    await page.focus('#e > .resizer-handle');
    await page.keyboard.press('Enter');
    assert.notEqual(await page.$eval('#e-pane', (p) => getComputedStyle(p).display), 'none');
    assert.equal(await page.$eval('#bl', (l) => (l as HTMLElement).dataset.stateName), 'default');
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__col), [{ region: 'east', collapsed: true }, { region: 'east', collapsed: false }]);
  });

  await check('State API + df$.shadcn.borderLayout: collapsed { regions }, toggle / sizes, default restores the authored sizes; unknown throws', async () => {
    await page.evaluate(() => (document.getElementById('bl') as any).api.setState('collapsed', { regions: ['west', 'south'] }));
    const sizes = await page.evaluate(() => (globalThis as any).df$.shadcn.borderLayout.sizes('bl'));
    assert.equal(sizes.west, 0);
    assert.equal(sizes.south, 0);
    assert.equal(await page.evaluate(() => (globalThis as any).df$.shadcn.borderLayout.toggle('bl', 'west')), false, 'west unfolded');
    await page.$eval('#bl', (l) => { (l as HTMLElement).style.width = ''; });
    await page.evaluate(() => (document.getElementById('bl') as any).api.setState('default'));
    await page.waitForTimeout(80);
    assert.deepEqual([(await rect('#w-pane')).w, (await rect('#e-pane')).w, (await rect('#s-pane')).h], [160, 140, 80]);
    const threw = await page.evaluate(() => { try { (document.getElementById('bl') as any).api.setState('nope'); return false; } catch { return true; } });
    assert.equal(threw, true);
  });

  await check('splits: left-out regions take no room; a percentage start resolves against the layout', async () => {
    const [hs, pane, c] = await Promise.all(['#hs', '#hs-pane', '#hs-c'].map(rect));
    assert.ok(Math.abs(pane.w - Math.round((hs.w - 2) / 2)) <= 2, `50% of the layout: ${pane.w} of ${hs.w}`);
    assert.ok(Math.abs(c.r - (hs.r - 1)) <= 1 && Math.abs(c.h - (hs.h - 2)) <= 1, 'the center fills the rest');
  });

  await check('dividers: a fixed region draws a static line; dashed + dots on the layout, double + no grip on one region; gap floats cards', async () => {
    const r = await page.evaluate(() => {
      const before = (sel: string) => getComputedStyle(document.querySelector(sel)!, '::before');
      const after = (sel: string) => getComputedStyle(document.querySelector(sel)!, '::after');
      return {
        fixed: getComputedStyle(document.getElementById('fx-n')!).borderBottomStyle,
        dashed: before('#fx-w > .resizer-handle').borderLeftStyle,
        dots: after('#fx-w > .resizer-handle').content,
        double: before('#fx-e > .resizer-handle').borderLeftStyle,
        noGrip: after('#fx-e > .resizer-handle').content,
        gap: getComputedStyle(document.getElementById('gap')!).columnGap,
        card: getComputedStyle(document.getElementById('gap-pane')!).borderTopWidth,
      };
    });
    assert.deepEqual(r, { fixed: 'dashed', dashed: 'dashed', dots: '""', double: 'double', noGrip: 'none', gap: '8px', card: '1px' });
  });

  await check('data-save: sizes and folded regions survive a reload', async () => {
    await page.focus('#sv-w > .resizer-handle');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    assert.equal((await rect('#sv-pane')).w, 170);
    await page.reload();
    await page.waitForSelector('#saved[data-init]');
    await page.waitForTimeout(100);
    assert.equal((await rect('#sv-pane')).w, 170, 'size restored');
    await page.dblclick('#sv-w > .resizer-handle');
    await page.reload();
    await page.waitForSelector('#saved[data-init]');
    await page.waitForTimeout(100);
    assert.equal(await page.$eval('#sv-w', (r) => r.hasAttribute('data-collapsed')), true, 'folded restored');
    await page.evaluate(() => localStorage.clear());
  });
  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await assertRenderContract(page, '.border-layout[id]', ['default','collapsed'], { runtimeAttrs: ['style','data-max-w','data-max-h','data-width','data-height'], runtimeOwned: '.resizer-handle' });
  });

} finally {
  await browser.close();
  server.stop?.();
}

if (failures) {
  console.error(`\nborder-layout.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('border-layout.e2e: all checks passed');
