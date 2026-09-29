import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: bubble is CSS-only - verify the fit-content sizing with the 80% cap,
 * start / end alignment, the seven variant surfaces, group corner
 * tightening + tails (and their RTL mirror), action bubbles, reaction
 * placement, the <details> Show more, media, typing dots and sizes - on the
 * real dist/ files.
 */
type Page = import('playwright').Page;
const box = (page: Page, id: string) => page.$eval(`#${id}`, (e) => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; });
const thread = (page: Page) => box(page, 'thread');

await cssSmoke('bubble', [
  {
    label: 'bubbles fit their content, start-aligned by default, pushed to the end with data-align="end"',
    run: async (page) => {
      const t = await thread(page);
      const s = await box(page, 'b-secondary'), d = await box(page, 'b-default');
      assert.equal(s.l, t.l, 'received at the start');
      assert.equal(d.r, t.r, 'sent at the end');
      assert.ok(s.w < 150, `fits content (${s.w}px)`);
    },
  },
  {
    label: 'a long bubble caps at 80% of the thread and wraps; ghost runs the full width with no side padding',
    run: async (page) => {
      const t = await thread(page);
      const l = await box(page, 'b-long'), g = await box(page, 'b-ghost');
      assert.equal(l.w, Math.round(t.w * 0.8));
      assert.ok(l.h > 40, 'wrapped');
      assert.equal(g.w, t.w);
      assert.equal(await page.$eval('#b-ghost > .bubble-content', (e) => getComputedStyle(e).paddingLeft), '0px');
    },
  },
  {
    label: 'variants: seven distinct surfaces; outline + destructive carry a border, ghost none',
    run: async (page) => {
      const r = await page.evaluate(() => ['default', 'secondary', 'muted', 'tinted', 'outline', 'ghost', 'destructive'].map((v) => {
        const s = getComputedStyle(document.querySelector(`#b-${v} > .bubble-content`)!);
        return { bg: s.backgroundColor, fg: s.color, bd: s.borderTopColor };
      }));
      assert.equal(new Set(r.map((x) => `${x.bg}|${x.fg}`)).size, 7, JSON.stringify(r));
      assert.equal(r[5].bg, 'rgba(0, 0, 0, 0)', 'ghost has no surface');
      assert.notEqual(r[4].bd, 'rgba(0, 0, 0, 0)', 'outline border');
      assert.notEqual(r[6].bd, 'rgba(0, 0, 0, 0)', 'destructive border');
      assert.equal(r[1].bd, 'rgba(0, 0, 0, 0)');
    },
  },
  {
    label: 'group: 3px apart, the corners where neighbours meet tighten on the sender side; the last bubble gets a tail',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const cs = (id: string) => getComputedStyle(document.getElementById(id)!);
        const b = (id: string) => document.getElementById(id)!.getBoundingClientRect();
        return {
          gap: Math.round(b('gs-2').top - b('gs-1').bottom),
          first: [cs('gs-1').borderTopLeftRadius, cs('gs-1').borderBottomLeftRadius],
          mid: [cs('gs-2').borderTopLeftRadius, cs('gs-2').borderBottomLeftRadius, cs('gs-2').borderTopRightRadius],
          endFirst: [cs('ge-1').borderBottomRightRadius, cs('ge-1').borderBottomLeftRadius],
          tailStart: getComputedStyle(document.getElementById('gs-3')!, '::before').content,
          noTailMid: getComputedStyle(document.getElementById('gs-2')!, '::before').content,
          tailEndSide: getComputedStyle(document.getElementById('ge-2')!, '::before').right,
        };
      });
      assert.equal(r.gap, 3);
      assert.deepEqual(r.first, ['18px', '5px']);
      assert.deepEqual(r.mid, ['5px', '5px', '18px']);
      assert.deepEqual(r.endFirst, ['5px', '18px']);
      assert.equal(r.tailStart, '""');
      assert.equal(r.noTailMid, 'none');
      assert.equal(r.tailEndSide, '-12px', 'the sent tail hangs off the end side');
    },
  },
  {
    label: 'action bubbles: a real <button> / <a> with the bubble surface, pointer cursor and a focus ring',
    run: async (page) => {
      const r = await page.evaluate(() => ['b-button', 'b-link'].map((id) => { const s = getComputedStyle(document.getElementById(id)!); return [s.cursor, s.textDecorationLine, s.borderTopLeftRadius]; }));
      assert.deepEqual(r, [['pointer', 'none', '18px'], ['pointer', 'none', '18px']]);
      await page.focus('#b-button');
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      assert.equal(await page.$eval('#b-button', (e) => getComputedStyle(e).outlineStyle), 'solid');
    },
  },
  {
    label: 'reactions: overlap the bubble edge - bottom end by default, top start via data-side / data-align; emoji overlap',
    run: async (page) => {
      const c = await box(page, 'r-bottom-c'), r = await box(page, 'r-bottom-r');
      assert.ok(r.t < c.b && r.b > c.b, 'straddles the bottom edge');
      assert.ok(r.r <= c.r && r.r > c.r - 20, 'at the end');
      const e1 = await box(page, 'r-e1'), e2 = await box(page, 'r-e2');
      assert.ok(e2.l < e1.r, 'overlapped emoji');
      const tc = await box(page, 'r-top-c'), tr = await box(page, 'r-top-r');
      assert.ok(tr.t < tc.t && tr.b > tc.t, 'straddles the top edge');
      assert.ok(tr.l >= tc.l && tr.l < tc.l + 20, 'at the start');
    },
  },
  {
    label: 'collapsible: the rest hides behind Show more; opening shows it and flips the summary to Show less',
    run: async (page) => {
      const vis = () => page.evaluate(() => [document.getElementById('more-rest')!.checkVisibility(), document.getElementById('more-s')!.innerText.trim()]);
      assert.deepEqual(await vis(), [false, 'Show more']);
      await page.click('#more-s');
      await page.waitForTimeout(300);
      assert.deepEqual(await vis(), [true, 'Show less']);
      const rest = await box(page, 'more-rest'), sum = await box(page, 'more-s');
      assert.ok(sum.t > rest.t, 'the toggle sits after the revealed text');
    },
  },
  {
    label: 'media: the image runs edge to edge (no padding), the caption keeps it',
    run: async (page) => {
      const m = await box(page, 'media'), i = await box(page, 'media-img');
      assert.equal(i.l, m.l + 1);
      assert.equal(i.w, m.w - 2);
      assert.equal(await page.$eval('#media-cap', (e) => getComputedStyle(e).paddingLeft), '14px');
    },
  },
  {
    label: 'typing: three dots bouncing out of phase',
    run: async (page) => {
      const r = await page.$$eval('#typing > span', (els) => els.map((e) => [getComputedStyle(e).animationName, getComputedStyle(e).animationDelay]));
      assert.deepEqual(r, [['bubble-typing', '0s'], ['bubble-typing', '0.15s'], ['bubble-typing', '0.3s']]);
    },
  },
  {
    label: 'sizes: sm / default / lg scale text and radius',
    run: async (page) => {
      const r = await page.evaluate(() => ['s-sm', 's-md', 's-lg'].map((id) => { const s = getComputedStyle(document.querySelector(`#${id} > .bubble-content`)!); return [s.fontSize, s.borderTopLeftRadius]; }));
      assert.deepEqual(r, [['13px', '14px'], ['14px', '18px'], ['16px', '22px']]);
    },
  },
  {
    label: 'RTL: received on the right, sent on the left; group corners and the tail mirror',
    run: async (page) => {
      const s = await box(page, 'rtl-start'), e = await box(page, 'rtl-end');
      assert.ok(s.l > e.l, 'received on the right');
      const r = await page.evaluate(() => {
        const cs = (id: string) => getComputedStyle(document.getElementById(id)!);
        return { g1: [cs('rtl-g1').borderBottomRightRadius, cs('rtl-g1').borderBottomLeftRadius], tail: getComputedStyle(document.getElementById('rtl-g2')!, '::before').right };
      });
      assert.deepEqual(r.g1, ['5px', '18px']);
      assert.equal(r.tail, '-12px', 'the tail hangs off the right (start) side');
    },
  },
]);
