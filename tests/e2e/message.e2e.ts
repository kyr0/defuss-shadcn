import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: message is CSS-only layout - verify the row (avatar column + content
 * column, received at the start / sent at the end), the avatar level with the
 * bubble's bottom even above a footer, the 80% column cap, header / footer
 * sides, status colors, groups (one avatar, one header, tightened corners),
 * hover-revealed actions, the full-width ghost reply, attachment cards,
 * sizes, no-avatar rows and RTL - on the real dist/ files.
 */
type Page = import('playwright').Page;
const box = (page: Page, id: string) => page.$eval(`#${id}`, (e) => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; });

await cssSmoke('message', [
  {
    label: 'received row: 32px avatar at the start, level with the bubble bottom; header above the bubble',
    run: async (page) => {
      const list = await box(page, 'list'), av = await box(page, 'm-recv-av'), b = await box(page, 'm-recv-b'), h = await box(page, 'm-recv-h');
      assert.equal(av.l, list.l);
      assert.equal(av.w, 32);
      assert.equal(av.b, b.b, 'avatar bottom = bubble bottom');
      assert.ok(b.l - av.r === 8, 'an 8px gap');
      assert.ok(h.b <= b.t, 'header above');
    },
  },
  {
    label: 'sent row: avatar at the end, the column capped at 80% and right-aligned; the avatar clears the footer',
    run: async (page) => {
      const list = await box(page, 'list'), av = await box(page, 'm-sent-av'), c = await box(page, 'm-sent-c'), b = await box(page, 'm-sent-b'), f = await box(page, 'm-sent-f');
      assert.equal(av.r, list.r);
      assert.ok(c.r < av.l, 'content before the avatar');
      assert.equal(c.w, Math.round(list.w * 0.8), "80% of the row");
      assert.equal(av.b, b.b, 'level with the bubble, not the footer');
      assert.ok(f.t >= b.b, 'footer below the bubble');
      assert.equal(f.r, c.r - 0, 'footer on the end side');
      assert.equal(f.h, 28);
    },
  },
  {
    label: 'status: read / failed colored, sent / delivered muted; sr-only labels stay hidden',
    run: async (page) => {
      const r = await page.evaluate(() => ['st-sent', 'st-delivered', 'st-read', 'st-failed'].map((id) => getComputedStyle(document.getElementById(id)!).color));
      assert.equal(r[0], r[1]);
      assert.equal(new Set([r[0], r[2], r[3]]).size, 3);
      assert.equal(await page.$eval('#st-read .sr-only', (e) => e.getBoundingClientRect().width), 1);
    },
  },
  {
    label: 'group: 3px apart, only the last avatar shows, only the first header, joined corners tighten (both sides)',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const cs = (id: string) => getComputedStyle(document.getElementById(id)!);
        const b = (id: string) => document.getElementById(id)!.getBoundingClientRect();
        return {
          gap: Math.round(b('g2-b').top - b('g1-b').bottom),
          av1: getComputedStyle(document.querySelector('#g1-av > .avatar')!).visibility,
          av3: getComputedStyle(document.querySelector('#g3-av > .avatar')!).visibility,
          h1: cs('g1-h').display, h2: cs('g2-h').display,
          c1: cs('g1-b').borderBottomLeftRadius, c2: [cs('g2-b').borderTopLeftRadius, cs('g2-b').borderBottomLeftRadius], c3: cs('g3-b').borderTopLeftRadius,
          e1: cs('ge1-b').borderBottomRightRadius, e2: cs('ge2-b').borderTopRightRadius,
          aligned: Math.round(b('g1-b').left) === Math.round(b('g3-b').left),
        };
      });
      assert.equal(r.gap, 3);
      assert.deepEqual([r.av1, r.av3], ['hidden', 'visible']);
      assert.deepEqual([r.h1, r.h2], ['flex', 'none']);
      assert.deepEqual([r.c1, r.c2, r.c3], ['5px', ['5px', '5px'], '5px']);
      assert.deepEqual([r.e1, r.e2], ['5px', '5px']);
      assert.ok(r.aligned, 'bubbles line up despite the hidden avatars');
    },
  },
  {
    label: 'ghost reply takes the full width; data-reveal="hover" actions appear on hover / focus',
    run: async (page) => {
      const list = await box(page, 'list'), c = await box(page, 'm-bot-c');
      assert.equal(c.r, list.r, 'full width');
      const op = () => page.$eval('#m-bot-f', (e) => getComputedStyle(e).opacity);
      await page.mouse.move(0, 0);
      await page.waitForTimeout(200);
      assert.equal(await op(), '0');
      await page.hover('#m-bot');
      await page.waitForTimeout(250);
      assert.equal(await op(), '1');
      await page.mouse.move(0, 0);
      await page.focus('#m-copy');
      await page.waitForTimeout(250);
      assert.equal(await op(), '1', 'keyboard focus reveals too');
    },
  },
  {
    label: 'attachment: a 16rem card, icon box + truncated name',
    run: async (page) => {
      const a = await box(page, 'att'), i = await box(page, 'att-i');
      assert.equal(a.w, 256);
      assert.deepEqual([i.w, i.h], [36, 36]);
      const n = await page.$eval('#att-n', (e) => [getComputedStyle(e).textOverflow, e.scrollWidth > e.clientWidth]);
      assert.deepEqual(n, ['ellipsis', true]);
    },
  },
  {
    label: 'sizes: 24 / 40px avatar columns; data-avatar="none" drops the column',
    run: async (page) => {
      assert.equal((await box(page, 's-sm-av')).w, 24);
      assert.equal((await box(page, 's-lg-av')).w, 40);
      const list = await box(page, 'list'), b = await box(page, 'm-noav-b');
      assert.equal(await page.$eval('#m-noav-av', (e) => getComputedStyle(e).display), 'none');
      assert.equal(b.l, list.l);
    },
  },
  {
    label: 'RTL: a received row puts its avatar on the right',
    run: async (page) => {
      const av = await box(page, 'rtl-av'), b = await box(page, 'rtl-b');
      assert.ok(av.l >= b.r);
    },
  },
]);
