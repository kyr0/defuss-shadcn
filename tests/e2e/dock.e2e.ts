import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: dock is CSS-only - verify the fixed bottom placement, the active item
 * from aria-current / aria-pressed / a checked radio (click AND arrow keys
 * switch it, no JavaScript), the bar / pill / dot indicators, label modes,
 * the size ladder, the surfaces, the floating pill in a container, badges,
 * the raised action (plain or a FAB semicircle), magnify, card views, side / top docks, autohide and RTL - on the real dist/ files.
 */
type Page = import('playwright').Page;
const cs = (page: Page, sel: string, prop: string, pseudo?: string) => page.$eval(sel, (e, [p, ps]) => getComputedStyle(e, ps || null).getPropertyValue(p as string), [prop, pseudo] as const);

await cssSmoke('dock', [
  {
    label: 'fixed to the viewport bottom, full width, 64px tall; items share the width',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const d = document.getElementById('d-fixed')!.getBoundingClientRect();
        const items = [...document.querySelectorAll('#d-fixed .dock-item')].map((i) => Math.round(i.getBoundingClientRect().width));
        return { pos: getComputedStyle(document.getElementById('d-fixed')!).position, bottom: Math.round(innerHeight - d.bottom), left: d.left, width: Math.round(d.width) === innerWidth, h: d.height, eq: new Set(items).size };
      });
      assert.deepEqual(r, { pos: 'fixed', bottom: 0, left: 0, width: true, h: 64, eq: 1 });
    },
  },
  {
    label: 'active: aria-current / aria-pressed take the accent color and the 36px bar; inactive items stay muted',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const g = (id: string, ps?: string) => getComputedStyle(document.getElementById(id)!, ps ?? null);
        return { home: g('l-home').color, pressed: g('b-pressed').color, inbox: g('l-inbox').color, barOn: g('l-home', '::before').width, barOff: g('l-inbox', '::before').width };
      });
      assert.equal(r.home, r.pressed);
      assert.notEqual(r.home, r.inbox);
      assert.deepEqual([r.barOn, r.barOff], ['36px', '0px']);
    },
  },
  {
    label: 'radio dock: a click and the arrow keys switch the active item - no JavaScript; pill behind the active icon',
    run: async (page) => {
      const pill = () => page.evaluate(() => ['r1', 'r2', 'r3'].map((id) => getComputedStyle(document.querySelector(`#${id} .dock-icon`)!).backgroundColor !== 'rgba(0, 0, 0, 0)'));
      assert.deepEqual(await pill(), [true, false, false]);
      await page.click('#r3');
      await page.waitForTimeout(250); // the pill fades (180ms)
      assert.deepEqual(await pill(), [false, false, true]);
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(250);
      assert.deepEqual(await pill(), [false, true, false], 'native radio arrow keys');
      assert.notEqual(await cs(page, '#r2', 'outline-style'), 'none', 'the focused radio item shows a ring');
    },
  },
  {
    label: 'dot indicator under the active item; data-labels none / active hide labels visually only',
    run: async (page) => {
      assert.deepEqual([await cs(page, '#dot1', 'scale', '::after'), await cs(page, '#dot2', 'scale', '::after')], ['1', '0']);
      const r = await page.evaluate(() => ['#dot1', '#al1', '#al2'].map((s) => { const l = document.querySelector(`${s} .dock-label`)!; return [Math.round(l.getBoundingClientRect().width), l.textContent]; }));
      assert.deepEqual(r, [[1, 'A'], [r[1][0], 'A'], [1, 'B']]);
      assert.ok(Number(r[1][0]) > 1, 'the active label shows');
    },
  },
  {
    label: 'sizes: 44 / 54 / 64 / 76 / 88px bars',
    run: async (page) => {
      const r = await page.evaluate(() => ['xs', 'sm', 'md', 'lg', 'xl'].map((s) => document.getElementById(`s-${s}`)!.getBoundingClientRect().height));
      assert.deepEqual(r, [44, 54, 64, 76, 88]);
    },
  },
  {
    label: 'surfaces: muted / primary / neutral / glass differ; on primary the active item uses the foreground color',
    run: async (page) => {
      const r = await page.evaluate(() => ({ bgs: ['v-muted', 'v-primary', 'v-neutral', 'v-glass'].map((id) => getComputedStyle(document.getElementById(id)!).backgroundColor), glass: getComputedStyle(document.getElementById('v-glass')!).backdropFilter, a: getComputedStyle(document.getElementById('vp-a')!).color, b: getComputedStyle(document.getElementById('vp-b')!).color }));
      assert.equal(new Set(r.bgs).size, 4, r.bgs.join(' | '));
      assert.ok(r.glass.includes('blur'));
      assert.notEqual(r.a, r.b);
    },
  },
  {
    label: 'floating in a container: a rounded pill 16px above the bottom; the raised action lifts out of the bar; a pinging dot',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const box = document.getElementById('phone')!.getBoundingClientRect();
        const f = document.getElementById('v-float')!;
        const fr = f.getBoundingClientRect();
        const ri = document.getElementById('raised-icon')!.getBoundingClientRect();
        return { pos: getComputedStyle(f).position, gap: Math.round(box.bottom - fr.bottom - 1), radius: getComputedStyle(f).borderTopLeftRadius, raisedAbove: ri.top < fr.top, ping: getComputedStyle(document.getElementById('dot-ping')!, '::after').animationName };
      });
      assert.deepEqual(r, { pos: 'absolute', gap: 16, radius: '9999px', raisedAbove: true, ping: 'dock-ping' });
    },
  },
  {
    label: 'badge sits on the icon corner, ringed by the background',
    run: async (page) => {
      const r = await page.evaluate(() => { const b = document.getElementById('badge')!.getBoundingClientRect(); const i = document.querySelector('#l-inbox .dock-icon')!.getBoundingClientRect(); return { right: b.left > i.left + i.width / 2, top: b.top < i.top, ring: getComputedStyle(document.getElementById('badge')!).boxShadow.includes('2px') }; });
      assert.deepEqual(r, { right: true, top: true, ring: true });
    },
  },
  {
    label: 'magnify: the hovered item grows 1.35, its neighbours 1.15',
    run: async (page) => {
      await page.hover('#m2');
      await page.waitForTimeout(250);
      const r = await page.evaluate(() => ['m1', 'm2', 'm3'].map((id) => getComputedStyle(document.getElementById(id)!).scale));
      assert.deepEqual(r, ['1.15', '1.35', '1.15']);
    },
  },
  {
    label: 'magnify: a shelf of icons - no border',
    run: async (page) => {
      assert.deepEqual([await cs(page, '#d-mag', 'border-top-width'), await cs(page, '#d-mag', 'border-left-width')], ['0px', '0px']);
    },
  },
  {
    label: 'views: the dock switches the card content - panel k shows while item k is checked (the raised slot keeps its place)',
    run: async (page) => {
      const shown = () => page.evaluate(() => [...document.querySelectorAll('#view .dock-panel')].filter((p) => getComputedStyle(p).display !== 'none').map((p) => p.id));
      assert.deepEqual(await shown(), ['p1']);
      await page.click('#pv2');
      assert.deepEqual(await shown(), ['p2']);
      await page.click('#pv4');
      assert.deepEqual(await shown(), ['p4']);
    },
  },
  {
    label: 'raised FAB: lifted by a margin, opens a semicircle of actions above the dock, the icon stays visible, an action closes it',
    run: async (page) => {
      const icon = () => page.evaluate(() => { const t = getComputedStyle(document.getElementById('fab-trigger')!); return [t.color, t.backgroundColor]; });
      const [c0, bg0] = await icon();
      assert.notEqual(c0, bg0);
      await page.click('#fab-trigger');
      await page.waitForTimeout(350);
      const r = await page.evaluate(() => {
        const t = document.getElementById('fab-trigger')!.getBoundingClientRect();
        const acts = [...document.querySelectorAll('#fab-menu .fab-action')].map((a) => a.getBoundingClientRect());
        return { open: document.getElementById('fab-menu')!.matches(':popover-open'), above: acts.every((a) => a.bottom < t.top + t.height / 2), left: acts[0].right < t.left, right: acts[3].left > t.right, close: acts.every((a) => Math.hypot(a.x + a.width / 2 - (t.x + t.width / 2), a.y + a.height / 2 - (t.y + t.height / 2)) < 110), lifted: parseFloat(getComputedStyle(document.getElementById('fab-trigger')!).marginTop) < 0 };
      });
      assert.deepEqual(r, { open: true, above: true, left: true, right: true, close: true, lifted: true });
      const [c1, bg1] = await icon();
      assert.notEqual(c1, bg1, 'the icon never takes its own background color');
      await page.click('#fa1');
      assert.equal(await page.evaluate(() => document.getElementById('fab-menu')!.matches(':popover-open')), false);
    },
  },
  {
    label: 'side docks: a full-height column on the left, a floating vertical pill on the right; the bar turns vertical (36px); a top dock',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const fr = document.getElementById('frame')!.getBoundingClientRect();
        const l = document.getElementById('d-left')!, rr = document.getElementById('d-right')!;
        const lb = l.getBoundingClientRect(), rb = rr.getBoundingClientRect(), tb = document.getElementById('d-top')!.getBoundingClientRect();
        const bar = getComputedStyle(document.getElementById('sl1')!, '::before');
        return { dir: getComputedStyle(l).flexDirection, left: Math.round(lb.left - fr.left - 1), fullH: Math.round(lb.height) === Math.round(fr.height - 2), rightGap: Math.round(fr.right - 1 - rb.right), centered: Math.abs((rb.top + rb.bottom) / 2 - (fr.top + fr.bottom) / 2) < 2, bar: [bar.width, bar.height], top: Math.round(tb.top - fr.top - 1) };
      });
      assert.deepEqual(r, { dir: 'column', left: 0, fullH: true, rightGap: 16, centered: true, bar: ['3px', '36px'], top: 0 });
      await page.click('#sl2');
      await page.waitForTimeout(250); // the bar grows (200ms)
      assert.equal(await cs(page, '#sl2', 'height', '::before'), '36px');
    },
  },
  {
    label: 'autohide: tucked below the edge, it slides in when the pointer comes close',
    run: async (page) => {
      const tr = () => page.evaluate(() => { const f = document.getElementById('frame2')!.getBoundingClientRect(); const d = document.getElementById('d-auto')!.getBoundingClientRect(); return Math.round(f.bottom - d.top); });
      assert.ok(await tr() <= 8, `only a peek shows (${await tr()}px)`);
      await page.evaluate(() => document.getElementById('frame2')!.scrollIntoView({ block: 'center' })); // clear of the fixed dock
      const f = (await page.locator('#frame2').boundingBox())!;
      await page.mouse.move(f.x + f.width / 2, f.y + f.height - 3);
      await page.waitForTimeout(400);
      assert.ok(await tr() > 40, `revealed (${await tr()}px)`);
      await page.mouse.move(f.x + f.width / 2, f.y + 10);
      await page.waitForTimeout(400);
      assert.ok(await tr() <= 8, 'tucks away again');
    },
  },
  {
    label: 'card dock-view: the card closes with its dock - the dock is its flush footer (top edge only, clipped by the rounded corners)',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const c = document.getElementById('cardview')!.getBoundingClientRect(), d = document.getElementById('d-card')!;
        const db = d.getBoundingClientRect(), s = getComputedStyle(d);
        return { flushBottom: Math.round(c.bottom - 1 - db.bottom), flushSides: [Math.round(db.left - c.left - 1), Math.round(c.right - 1 - db.right)], edges: [s.borderTopWidth, s.borderLeftWidth, s.borderRightWidth, s.borderBottomWidth], clip: getComputedStyle(document.getElementById('cardview')!).overflow };
      });
      assert.deepEqual(r, { flushBottom: 0, flushSides: [0, 0], edges: ['1px', '0px', '0px', '0px'], clip: 'hidden' });
    },
  },
  {
    label: 'RTL: the first item sits on the right',
    run: async (page) => {
      const r = await page.evaluate(() => document.getElementById('rtl1')!.getBoundingClientRect().left > document.getElementById('rtl2')!.getBoundingClientRect().left);
      assert.ok(r);
    },
  },
]);
