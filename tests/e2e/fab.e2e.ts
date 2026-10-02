import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: FAB is CSS-only - the native popover is its state. Verify the fixed
 * corner geometry, that a click opens the dial and Escape / outside clicks
 * close it, and that the anchored menu stacks actions away from the trigger
 * in every direction, the flower arc, the main action overlay, text pills,
 * sizes, the container attachment, the backdrop and the scroll-shrinking
 * extended FAB - on the real dist/ files.
 */
type R = { x: number; y: number; w: number; h: number; cx: number; cy: number; r: number; b: number };
const box = (page: import('playwright').Page, sel: string) =>
  page.$eval(sel, (e) => { const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, cx: b.left + b.width / 2, cy: b.top + b.height / 2, r: b.right, b: b.bottom }; }) as Promise<R>;
const isOpen = (page: import('playwright').Page, id: string) => page.$eval(`#${id}`, (m) => m.matches(':popover-open'));
const settle = (page: import('playwright').Page) => page.waitForTimeout(450);

await cssSmoke('fab', [
  {
    label: 'fixed in the bottom-end corner, 24px from the edges; a 56px round trigger',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const f = document.getElementById('f-dial')!, t = document.getElementById('f-dial-t')!.getBoundingClientRect();
        return { pos: getComputedStyle(f).position, right: Math.round(innerWidth - t.right), bottom: Math.round(innerHeight - t.bottom), w: t.width, h: t.height, radius: getComputedStyle(document.getElementById('f-dial-t')!).borderTopLeftRadius };
      });
      assert.deepEqual(r, { pos: 'fixed', right: 24, bottom: 24, w: 56, h: 56, radius: '9999px' });
    },
  },
  {
    label: 'click opens the dial: actions stacked above, first nearest, centered; + turns 45°',
    run: async (page) => {
      await page.click('#f-dial-t');
      await settle(page);
      assert.ok(await isOpen(page, 'm-dial'));
      const [t, a1, a2, a3] = await Promise.all(['#f-dial-t', '#a1', '#a2', '#a3'].map((s) => box(page, s)));
      assert.ok(a1.b <= t.y && a2.b <= a1.y && a3.b <= a2.y, 'stacked upward in order');
      assert.ok([a1, a2, a3].every((a) => Math.abs(a.cx - t.cx) < 1), 'centered on the trigger');
      assert.equal(Math.round(t.y - a1.b), 12, 'md gap 12px');
      assert.equal(await page.$eval('#f-dial-t .fab-icon', (e) => getComputedStyle(e).rotate), '45deg');
    },
  },
  {
    label: 'labels sit to the inline-start of their actions',
    run: async (page) => {
      const [a, l] = await Promise.all([box(page, '#a1'), box(page, '#a1 .fab-label')]);
      assert.ok(l.r <= a.x - 8 && Math.abs(l.cy - a.cy) < 1, JSON.stringify({ a, l }));
    },
  },
  {
    label: 'Escape closes (focus back on the trigger); an outside click closes too',
    run: async (page) => {
      await page.keyboard.press('Escape');
      assert.ok(!(await isOpen(page, 'm-dial')));
      await page.click('#f-dial-t');
      assert.ok(await isOpen(page, 'm-dial'));
      await page.mouse.click(300, 300);
      assert.ok(!(await isOpen(page, 'm-dial')));
    },
  },
  {
    label: 'a second click on the trigger (the ×) closes the dial - the open menu never covers it',
    run: async (page) => {
      await page.click('#f-dial-t');
      await settle(page);
      assert.ok(await isOpen(page, 'm-dial'));
      const hit = await page.evaluate(() => { const b = document.getElementById('f-dial-t')!.getBoundingClientRect(); return document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)?.closest('.fab-trigger')?.id; });
      assert.equal(hit, 'f-dial-t', 'the trigger is the hit target while open');
      await page.click('#f-dial-t');
      assert.ok(!(await isOpen(page, 'm-dial')), 'closed');
    },
  },
  {
    label: 'picking an action closes the dial (popovertargetaction="hide"), its click still runs',
    run: async (page) => {
      await page.$eval('#a2', (b) => b.addEventListener('click', () => ((globalThis as unknown as { __a: number }).__a = 1)));
      await page.click('#f-dial-t');
      await settle(page);
      await page.click('#a2');
      assert.ok(!(await isOpen(page, 'm-dial')), 'closed');
      assert.equal(await page.evaluate(() => (globalThis as unknown as { __a: number }).__a), 1);
    },
  },
  {
    label: 'main action takes the trigger\'s place; icon swap; labels flip for a start corner; backdrop',
    run: async (page) => {
      await page.click('#f-main-t');
      await settle(page);
      const [t, m, b1, l] = await Promise.all([box(page, '#f-main-t'), box(page, '#main'), box(page, '#b1'), box(page, '#b1 .fab-label')]);
      assert.ok(Math.abs(m.cx - t.cx) < 1 && Math.abs(m.cy - t.cy) < 1 && Math.round(m.w) === Math.round(t.w), 'main action over the trigger');
      assert.ok(b1.b <= m.y, 'the others above it');
      assert.ok(l.x >= b1.r + 8, 'bottom-start: label to the right');
      const icons = await page.evaluate(() => [...document.querySelectorAll('#f-main-t .fab-icon')].map((i) => getComputedStyle(i).display));
      assert.deepEqual(icons, ['none', 'grid'], 'closed icon hidden, open icon shown (a flex item: grid)');
      const bd = await page.$eval('#m-main', (m) => getComputedStyle(m, '::backdrop').backgroundColor);
      assert.notEqual(bd, 'rgba(0, 0, 0, 0)');
      await page.keyboard.press('Escape');
    },
  },
  {
    label: 'flower: the actions on a quarter circle, opening away from the top-end corner',
    run: async (page) => {
      await page.click('#f-flower-t');
      await settle(page);
      const t = await box(page, '#f-flower-t');
      const ps = await Promise.all(['#p1', '#p2', '#p3'].map((s) => box(page, s)));
      const d = ps.map((p) => Math.hypot(p.cx - t.cx, p.cy - t.cy));
      assert.ok(d.every((x) => Math.abs(x - d[0]) < 1.5), `one radius (${d.map(Math.round)})`);
      assert.ok(Math.abs(ps[0].cy - t.cy) < 1 && ps[0].cx < t.cx, 'first: level, to the left');
      assert.ok(Math.abs(ps[2].cx - t.cx) < 1 && ps[2].cy > t.cy, 'last: straight below (top corner)');
      assert.equal(t.w, 68, 'lg trigger');
      assert.equal(await page.$eval('#p1 .fab-label', (l) => l.getBoundingClientRect().width), 1, 'labels visually hidden');
      await page.keyboard.press('Escape');
    },
  },
  {
    label: 'directions: down (top-start, sm), left (labels above), right',
    run: async (page) => {
      await page.click('#f-down-t'); await settle(page);
      let [t, a] = await Promise.all([box(page, '#f-down-t'), box(page, '#d1')]);
      assert.ok(a.y >= t.b && Math.abs(a.cx - t.cx) < 1 && t.w === 44, 'down, sm 44px');
      await page.keyboard.press('Escape');
      await page.click('#f-left-t'); await settle(page);
      [t, a] = await Promise.all([box(page, '#f-left-t'), box(page, '#l1')]);
      const l = await box(page, '#l1 .fab-label');
      assert.ok(a.r <= t.x && Math.abs(a.cy - t.cy) < 1, 'left');
      assert.ok(l.b <= a.y && Math.abs(l.cx - a.cx) < 1, 'label above');
      await page.keyboard.press('Escape');
      await page.click('#f-right-t'); await settle(page);
      [t, a] = await Promise.all([box(page, '#f-right-t'), box(page, '#r1')]);
      assert.ok(a.x >= t.r && Math.abs(a.cy - t.cy) < 1, 'right');
      await page.keyboard.press('Escape');
    },
  },
  {
    label: 'text actions: a pill aligned to the trigger\'s outer edge; tone on the trigger',
    run: async (page) => {
      await page.click('#f-md-t'); await settle(page);
      const [t, a] = await Promise.all([box(page, '#f-md-t'), box(page, '#tx1')]);
      assert.ok(a.w > 150 && Math.abs(a.r - t.r) < 1, JSON.stringify({ t, a }));
      assert.equal(await page.$eval('#tx1', (e) => getComputedStyle(e).display), 'flex', 'a flex pill (blockified in the menu)');
      await page.keyboard.press('Escape');
    },
  },
  {
    label: 'data-attach="container" pins it inside the box; RTL bottom-end is the left corner',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const b = document.getElementById('box')!.getBoundingClientRect(), f = document.querySelector('#f-box .fab-trigger')!.getBoundingClientRect();
        const rt = document.querySelector('#f-rtl .fab-trigger')!.getBoundingClientRect();
        return { pos: getComputedStyle(document.getElementById('f-box')!).position, right: Math.round(b.right - f.right - 1), bottom: Math.round(b.bottom - f.bottom - 1), rtlLeft: Math.round(rt.left) };
      });
      assert.deepEqual(r, { pos: 'absolute', right: 24, bottom: 24, rtlLeft: 24 });
    },
  },
  {
    label: 'extended FAB: a pill with its label; scrolling the named timeline folds it to a 56px circle',
    run: async (page) => {
      const w0 = (await box(page, '#f-ext-t')).w;
      await page.$eval('#scroller', (s) => (s.scrollTop = 400));
      await page.waitForTimeout(200);
      const w1 = (await box(page, '#f-ext-t')).w;
      assert.ok(w0 > 100, `wide at first (${w0})`);
      assert.equal(Math.round(w1), 56, 'a circle after scrolling');
    },
  },
  {
    label: 'back to top: hidden (and unfocusable) at the start, shown after scrolling; the link targets the start',
    run: async (page) => {
      const scroller = '#f-top';
      const read = () => page.$eval('#f-top .fab-trigger', (t) => ({ o: parseFloat(getComputedStyle(t).opacity), v: getComputedStyle(t).visibility }));
      await page.$eval(scroller, (f) => { (f.previousElementSibling as HTMLElement).scrollTop = 0; });
      await page.waitForTimeout(200);
      const top = await read();
      await page.$eval(scroller, (f) => { (f.previousElementSibling as HTMLElement).scrollTop = 600; });
      await page.waitForTimeout(200);
      const down = await read();
      const href = await page.$eval('#f-top .fab-trigger', (a) => a.getAttribute('href'));
      assert.ok(top.o < 0.05 && top.v === 'hidden', `hidden at the top ${JSON.stringify(top)}`);
      assert.ok(down.o > 0.95 && down.v === 'visible', `shown after scrolling ${JSON.stringify(down)}`);
      assert.equal(href, '#top-top');
    },
  },
]);
