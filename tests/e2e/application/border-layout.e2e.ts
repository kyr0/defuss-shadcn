import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

/**
 * Why: a border layout is five grid regions whose sides are Resizers. These
 * checks drive the real dist/ files: the grid places the regions (north/south or
 * west/east dominant, left-out regions take no room), each divider is a window
 * splitter that drags and moves with the arrows, the center keeps its minimum
 * even while the frame shrinks, regions fold and come back, sizes survive a
 * reload, and the divider styles, grips and gap render. A stack holds several
 * Panels on one side: dividers share the room, a minimized panel keeps its bar,
 * all minimized fold the region, all closed take it away.
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
  const url = `${server.url}/tests/e2e/application/border-layout.e2e-fixture.html`;
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

  await check('data-fit: a fixed region takes its content\'s size between its bounds (half the layout by default) and scrolls past them', async () => {
    const box = () =>
      page.evaluate(() => {
        const h = (id: string) => (document.getElementById(id) as HTMLElement).clientHeight;
        const s = document.getElementById('fit-s')!;
        return { layout: h('fit'), n: h('fit-n'), s: h('fit-s'), c: h('fit-c'), scrolls: s.scrollHeight > s.clientHeight };
      });
    const near = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) <= 2, `${what}: ${a} vs ${b}`);
    let r = await box();
    near(r.s, 40, 'two 20px rows: the south is as high as its content');
    near(r.n, r.layout * 0.2, 'one line: the north keeps its minimum (20cqh)');
    assert.equal(r.scrolls, false);
    await page.evaluate(() => {
      const s = document.getElementById('fit-s')!;
      for (let i = 3; i <= 30; i++) s.insertAdjacentHTML('beforeend', `<li style="height:20px">${i}</li>`);
      document.getElementById('fit-n-text')!.style.height = '400px';
    });
    r = await box();
    near(r.s, r.layout * 0.5, 'thirty rows: the south stops at half the layout (the default maximum)');
    near(r.n, r.layout * 0.4, 'a tall north stops at its maximum (40cqh)');
    assert.equal(r.scrolls, true, 'its content scrolls');
    assert.ok(r.c > 0, 'the center keeps the rest');
  });

  await check('stacks: a divider between every two panels shares the room; arrows and a drag move it, within each panel\'s minimum', async () => {
    await page.waitForFunction(() => document.querySelectorAll('#stk-w-stack > .border-layout-stack-divider').length === 2);
    const kids = await page.$$eval('#stk-w-stack > *', (els) => els.map((e) => e.className.split(' ').pop()));
    assert.deepEqual(kids, ['panel', 'border-layout-stack-divider', 'panel', 'border-layout-stack-divider', 'panel']);
    const d = await page.$eval('#stk-w-stack > .border-layout-stack-divider', (e) => ({ role: e.getAttribute('role'), o: e.getAttribute('aria-orientation'), label: e.getAttribute('aria-label'), ctl: e.getAttribute('aria-controls'), tab: (e as HTMLElement).tabIndex }));
    assert.deepEqual(d, { role: 'separator', o: 'horizontal', label: 'Resize Tree', ctl: 'sp1', tab: 0 });
    const [a0, b0, c0] = [await rect('#sp1'), await rect('#sp2'), await rect('#sp3')];
    assert.ok(Math.abs(a0.h - b0.h) <= 1 && Math.abs(b0.h - c0.h) <= 1, `equal shares at first: ${a0.h} ${b0.h} ${c0.h}`);
    await page.focus('#stk-w-stack > .border-layout-stack-divider');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    const [a1, b1, c1] = [await rect('#sp1'), await rect('#sp2'), await rect('#sp3')];
    assert.equal(a1.h - a0.h, 20, 'ArrowDown moves 10 px');
    assert.equal(b0.h - b1.h, 20, 'the next panel gives the room');
    assert.equal(c1.h, c0.h, 'the third keeps its share');
    await page.keyboard.press('End');
    const b2 = await rect('#sp2');
    const min = await page.$eval('#sp2 > .panel-header', (h) => Math.round(h.getBoundingClientRect().height + 32));
    assert.ok(Math.abs(b2.h - min) <= 1, `End stops at the next panel's minimum (${b2.h} vs ${min})`);
    await page.keyboard.press('Home');
    await drag('#stk-w-stack > .border-layout-stack-divider:nth-of-type(1)', 0, 40);
    assert.equal(await page.$eval('#stk-w-stack > .border-layout-stack-divider', (e) => e.getAttribute('aria-valuenow')), String((await rect('#sp1')).h));
    // the south stack runs side by side, its divider a vertical line
    const s = await page.$eval('#stk-s-stack > .border-layout-stack-divider', (e) => e.getAttribute('aria-orientation'));
    assert.equal(s, 'vertical');
    const [q1, q2] = [await rect('#sq1'), await rect('#sq2')];
    assert.ok(q1.y === q2.y && q2.x > q1.r - 8, 'south panels side by side');
  });

  await check('stacks: a minimized panel keeps its bar and leaves its room; all minimized fold the region; all closed take it away', async () => {
    const total = (await rect('#stk-w-stack')).h;
    await page.evaluate(() => (document.getElementById('sp2') as any).api.setState('minimized'));
    await page.waitForTimeout(50);
    const bar = await page.$eval('#sp2 > .panel-header', (h) => Math.round(h.getBoundingClientRect().height));
    assert.ok(Math.abs((await rect('#sp2')).h - bar) <= 1, 'the minimized panel is its title bar');
    const [a, c] = [await rect('#sp1'), await rect('#sp3')];
    assert.ok(Math.abs(a.h + c.h + bar - total) <= 3, `the others take the room: ${a.h} + ${c.h} + ${bar} vs ${total}`);
    const dis = await page.$$eval('#stk-w-stack > .border-layout-stack-divider', (ds) => ds.map((x) => x.getAttribute('aria-disabled')));
    assert.deepEqual(dis, ['true', 'true'], 'both dividers touch the minimized panel');
    assert.equal(await page.$eval('#stk-w', (r) => r.hasAttribute('data-panel-minimized')), false);
    await page.evaluate(() => ['sp1', 'sp3'].forEach((id) => (document.getElementById(id) as any).api.setState('minimized')));
    await page.waitForTimeout(50);
    assert.equal(await page.$eval('#stk-w', (r) => r.hasAttribute('data-panel-minimized')), true, 'all minimized fold the region');
    assert.equal(await page.$eval('#stk-w > .resizer-handle', (h) => (h as HTMLElement).inert), true, 'its divider rests');
    assert.ok((await rect('#stk-w-stack')).w < 60, 'west folds to a column of vertical tabs');
    assert.equal(await page.$eval('#sp1 > .panel-header', (h) => getComputedStyle(h).writingMode), 'vertical-rl');
    await page.evaluate(() => ['sp1', 'sp2', 'sp3'].forEach((id) => (document.getElementById(id) as any).api.setState('default')));
    await page.waitForTimeout(50);
    assert.equal(await page.$eval('#stk-w', (r) => r.hasAttribute('data-panel-minimized')), false);
    assert.equal((await rect('#stk-w-stack')).w, 220, 'the region comes back at its width');
    // closing the middle panel: one divider joins the other two
    await page.evaluate(() => (document.getElementById('sp2') as any).api.setState('closed'));
    await page.waitForTimeout(50);
    const shown = await page.$$eval('#stk-w-stack > .border-layout-stack-divider', (ds) => ds.map((x) => !(x as HTMLElement).hidden));
    assert.deepEqual(shown, [true, false]);
    assert.equal(await page.$eval('#stk-w-stack > .border-layout-stack-divider', (e) => e.getAttribute('aria-disabled')), 'false', 'Tree and Notes share it');
    await page.evaluate(() => ['sp1', 'sp3'].forEach((id) => (document.getElementById(id) as any).api.setState('closed')));
    await page.waitForTimeout(50);
    assert.equal(await page.$eval('#stk-w', (r) => getComputedStyle(r).display), 'none', 'all closed take the region away');
    await page.evaluate(() => ['sp1', 'sp2', 'sp3'].forEach((id) => (document.getElementById(id) as any).api.setState('default')));
    await page.waitForTimeout(50);
    assert.notEqual(await page.$eval('#stk-w', (r) => getComputedStyle(r).display), 'none');
  });

  await check('stacks: data-exclusive keeps one panel open; data-direction="row" lays them side by side, a minimized one a vertical tab', async () => {
    const minimized = (ids: string[]) =>
      page.evaluate((list) => list.map((id) => document.getElementById(id)!.hasAttribute('data-minimized')), ids);
    // both authored minimized: the region is folded to its tabs
    assert.equal(await page.$eval('#exc-e', (r) => r.hasAttribute('data-panel-minimized')), true, 'starts folded');
    await page.evaluate(() => (document.getElementById('ex1') as any).api.setState('default'));
    await page.waitForTimeout(80);
    assert.deepEqual(await minimized(['ex1', 'ex2']), [false, true], 'one opened, the other stays minimized');
    assert.equal(await page.$eval('#exc-e', (r) => r.hasAttribute('data-panel-minimized')), false, 'the region unfolds');
    // opening the other through its own swap minimizes the first
    await page.click('#ex2 .panel-minimize');
    await page.waitForTimeout(80);
    assert.deepEqual(await minimized(['ex1', 'ex2']), [true, false], 'opening one minimizes the open one');
    await page.click('#ex2 .panel-minimize');
    await page.waitForTimeout(80);
    assert.equal(await page.$eval('#exc-e', (r) => r.hasAttribute('data-panel-minimized')), true, 'none open: folded again');

    // a row: of the two authored open, the last stays; the others are vertical tabs beside it
    assert.deepEqual(await minimized(['rw1', 'rw2', 'rw3']), [true, false, true], 'the last authored open stays open');
    const [r1, r2, r3] = [await rect('#rw1'), await rect('#rw2'), await rect('#rw3')];
    assert.ok(r1.x < r2.x && r2.x < r3.x, 'side by side');
    assert.ok(Math.abs(r1.h - r2.h) <= 1 && Math.abs(r3.h - r2.h) <= 1, 'the tabs run the full height');
    assert.ok(r1.w < 60 && r3.w < 60 && r2.w > 200, `the open one takes the room: ${r1.w} / ${r2.w} / ${r3.w}`);
    assert.equal(await page.$eval('#rw1 > .panel-header', (h) => getComputedStyle(h).writingMode), 'vertical-rl');
    assert.equal(await page.$eval('#row-stack > .border-layout-stack-divider', (d) => d.getAttribute('aria-orientation')), 'vertical');
    await page.click('#rw3 .panel-minimize');
    await page.waitForTimeout(80);
    assert.deepEqual(await minimized(['rw1', 'rw2', 'rw3']), [true, true, false], 'opening the third minimizes the second');
  });

  await check('deep navigation: data-levels - each level its own width, the region their sum; push folds the earlier ones (data-keep), the room goes to the center', async () => {
    const minimized = (ids: string[]) =>
      page.evaluate((list) => list.map((id) => document.getElementById(id)!.hasAttribute('data-minimized')), ids);
    await page.evaluate(() => {
      (globalThis as any).__lv = [];
      document.getElementById('lv-stack')!.addEventListener('border-layout-stack-change', (e: any) =>
        (globalThis as any).__lv.push([e.detail.panels.map((p: HTMLElement) => p.id).join(), e.detail.open.map((p: HTMLElement) => p.id).join()]));
    });
    const [w1, w2, west, c] = [await rect('#lv1'), await rect('#lv2'), await rect('#lv-stack'), await rect('#lv-c')];
    assert.deepEqual([w1.w, w2.w], [150, 160], 'each level keeps its --panel-size');
    assert.ok(Math.abs(west.w - (150 + 160 + 1)) <= 2, `the region is their sum: ${west.w}`);
    assert.ok(Math.abs(c.w + west.w - 900) <= 3, 'the center takes the rest');
    await page.evaluate(() =>
      (globalThis as any).df$.shadcn.borderLayout.push(
        'lv-stack',
        '<section class="card panel" id="lv3" style="--panel-size:170px" aria-labelledby="lv3-t"><header class="panel-header"><h3 class="panel-title" id="lv3-t">Details</h3></header><div class="panel-body">details</div></section>',
      ),
    );
    await page.waitForFunction(() => document.getElementById('lv1')!.hasAttribute('data-minimized'));
    assert.deepEqual(await minimized(['lv1', 'lv2', 'lv3']), [true, false, false], 'keep 2: the outermost folds to its bar');
    const [b1, w3, west2] = [await rect('#lv1'), await rect('#lv3'), await rect('#lv-stack')];
    assert.ok(b1.w < 60, `a bar: ${b1.w}`);
    assert.equal(w3.w, 170);
    assert.ok(west2.w < 150 + 160 + 170, 'the folded level gave its room to the center');
    assert.equal(await page.$eval('#lv1 > .panel-header', (h) => getComputedStyle(h).writingMode), 'vertical-rl');
    await page.waitForFunction(() => (globalThis as any).__lv.some((r: string[]) => r[0] === 'lv1,lv2,lv3' && r[1] === 'lv2,lv3'));
    assert.deepEqual(
      await page.evaluate(() => (globalThis as any).df$.shadcn.borderLayout.levels('lv-stack').open.map((p: HTMLElement) => p.id)),
      ['lv2', 'lv3'],
    );
  });

  await check('deep navigation: data-drill - a folded level is a breadcrumb: a click on its bar or Enter on it drops the deeper levels; pop() goes back by index or id', async () => {
    const ids = () => page.$$eval('#lv-stack > .panel', (p) => p.map((x) => x.id));
    assert.deepEqual(
      await page.$eval('#lv1 > .panel-header', (h) => [h.getAttribute('role'), h.getAttribute('aria-label'), (h as HTMLElement).tabIndex]),
      ['button', 'Back to Sections', 0],
    );
    await page.click('#lv1-t');
    await page.waitForFunction(() => document.querySelectorAll('#lv-stack > .panel').length === 1);
    assert.deepEqual(await ids(), ['lv1']);
    assert.equal(await page.$eval('#lv1', (p) => p.hasAttribute('data-minimized')), false, 'the level opens');
    assert.equal(await page.$$eval('#lv-stack > .border-layout-stack-divider', (d) => d.length), 0, 'its dividers go with them');
    assert.equal(await page.$eval('#lv1 > .panel-header', (h) => h.getAttribute('role')), null, 'an open level is no breadcrumb');
    // push two, then Enter on the folded first one
    await page.evaluate(() => {
      const bl = (globalThis as any).df$.shadcn.borderLayout;
      const make = (id: string, t: string) =>
        `<section class="card panel" id="${id}" style="--panel-size:140px" aria-labelledby="${id}-t"><header class="panel-header"><h3 class="panel-title" id="${id}-t">${t}</h3></header><div class="panel-body">${t}</div></section>`;
      bl.push('lv-stack', make('x2', 'Two'));
      bl.push('lv-stack', make('x3', 'Three'));
    });
    await page.waitForFunction(() => document.getElementById('lv1')!.hasAttribute('data-minimized'));
    await page.focus('#lv1 > .panel-header');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('#lv-stack > .panel').length === 1);
    assert.deepEqual(await ids(), ['lv1']);
    // pop by id: back to the second level, the third goes
    const popped = await page.evaluate(() => {
      const bl = (globalThis as any).df$.shadcn.borderLayout;
      const make = (id: string) =>
        `<section class="card panel" id="${id}" style="--panel-size:140px" aria-labelledby="${id}-t"><header class="panel-header"><h3 class="panel-title" id="${id}-t">${id}</h3></header><div class="panel-body">${id}</div></section>`;
      bl.push('lv-stack', make('y2'));
      bl.push('lv-stack', make('y3'));
      return [bl.pop('lv-stack', 'y2')?.id, bl.pop('lv-stack', 'nope'), bl.pop('nope', 0)];
    });
    assert.deepEqual(popped, ['y2', null, null]);
    await page.waitForFunction(() => document.querySelectorAll('#lv-stack > .panel').length === 2);
    assert.deepEqual(await ids(), ['lv1', 'y2']);
    await page.evaluate(() => (globalThis as any).df$.shadcn.borderLayout.pop('lv-stack', 0));
    await page.waitForFunction(() => document.querySelectorAll('#lv-stack > .panel').length === 1);
  });

  await check('deep navigation: the divider after a level resizes that level alone - the region grows, the center gives way', async () => {
    await page.evaluate(() => {
      const make = (id: string) =>
        `<section class="card panel" id="${id}" style="--panel-size:140px" aria-labelledby="${id}-t"><header class="panel-header"><h3 class="panel-title" id="${id}-t">${id}</h3></header><div class="panel-body">${id}</div></section>`;
      (globalThis as any).df$.shadcn.borderLayout.push('lv-stack', make('z2'));
    });
    await page.waitForSelector('#lv-stack > .border-layout-stack-divider:not([aria-disabled="true"])');
    const before = [(await rect('#lv1')).w, (await rect('#z2')).w, (await rect('#lv-stack')).w];
    await page.focus('#lv-stack > .border-layout-stack-divider');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    const after = [(await rect('#lv1')).w, (await rect('#z2')).w, (await rect('#lv-stack')).w];
    assert.equal(after[0], before[0] + 20, 'the level grows');
    assert.equal(after[1], before[1], 'the next level keeps its width');
    assert.equal(after[2], before[2] + 20, 'the region grows with it');
    assert.equal(await page.$eval('#lv-stack > .border-layout-stack-divider', (d) => d.getAttribute('aria-valuenow')), String(after[0]));
  });

  await check('deep navigation on the east side: the levels run from the edge toward the center; ArrowLeft widens a level', async () => {
    assert.deepEqual(
      await page.evaluate(() => ['le1', 'le2', 'le3'].map((id) => document.getElementById(id)!.hasAttribute('data-minimized'))),
      [true, false, false],
      'three authored open with keep 2: the outermost folds',
    );
    const [e1, e2, e3, c] = [await rect('#le1'), await rect('#le2'), await rect('#le3'), await rect('#lve-c')];
    assert.ok(e1.x > e2.x && e2.x > e3.x && e3.x > c.x, `edge to center: ${e1.x} ${e2.x} ${e3.x}`);
    assert.deepEqual([e2.w, e3.w], [130, 140]);
    // the divider after the second level (between it and the third, nearer the center)
    await page.focus('#lve-stack > .border-layout-stack-divider:nth-of-type(2)');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(50);
    assert.equal((await rect('#le2')).w, 140, 'the second level grows toward the center');
    assert.equal((await rect('#le3')).w, 140, 'the third keeps its width');
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
    await assertRenderContract(page, '.border-layout[id]', ['default','collapsed'], { runtimeAttrs: ['style','data-max-w','data-max-h','data-width','data-height'], runtimeOwned: '.resizer-handle, .border-layout-stack-divider' });
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
