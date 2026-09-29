import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: navbar is CSS-only - the contract is layout + the native popover
 * collapse. Verifies the regions (a truly centered center), menu + submenu,
 * the variant / size / sticky surface, and the responsive collapse on both
 * sides of each breakpoint: inline menu + hidden toggle when wide; a toggle
 * that opens the SAME element as a popover anchored under it when narrow -
 * per navbar (anchor-scope), and data-collapse="always".
 */
const box = (page: Page, id: string) => page.$eval(`#${id}`, (el) => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; });
const display = (page: Page, id: string) => page.$eval(`#${id}`, (el) => getComputedStyle(el).display);

await cssSmoke('navbar', [
  {
    label: 'regions: start and end share the free space, the center sits in the middle of the bar',
    run: async (page) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      const bar = await box(page, 'nb'), mid = await box(page, 'nb-mid');
      assert.ok(Math.abs((mid.l + mid.r) / 2 - (bar.l + bar.r) / 2) < 1, 'centered');
      const s = await box(page, 'nb-start'), e = await box(page, 'nb-end');
      assert.ok(Math.abs(s.w - e.w) < 1, 'equal side regions');
      const btn = await box(page, 'nb-btn');
      assert.ok(bar.r - btn.r < 20, 'end content hugs the end');
    },
  },
  {
    label: 'menu: links muted at rest; aria-current="page" gets a tint; a submenu drops below its summary',
    run: async (page) => {
      const r = await page.evaluate(() => ({
        cur: getComputedStyle(document.getElementById('nb-current')!).backgroundColor,
        link: getComputedStyle(document.getElementById('nb-link')!).backgroundColor,
        linkColor: getComputedStyle(document.getElementById('nb-link')!).color,
        barColor: getComputedStyle(document.getElementById('nb-menu')!).color,
      }));
      assert.notEqual(r.cur, r.link, 'current link tinted');
      assert.notEqual(r.linkColor, r.barColor, 'rest links are a muted mix of the bar color');
      await page.click('#nb-summary');
      const s = await box(page, 'nb-summary'), sub = await box(page, 'nb-sub');
      assert.ok(sub.t >= s.b, 'below the summary');
      assert.equal(await page.$eval('#nb-sub', (el) => getComputedStyle(el).position), 'absolute');
      await page.click('#nb-summary');
    },
  },
  {
    label: 'variants: six distinct surfaces (+ the default); sizes 48 / 56 / 72px; sticky sticks',
    run: async (page) => {
      const looks = await page.evaluate(() => ['nb', 'nb-muted', 'nb-primary', 'nb-neutral', 'nb-ghost', 'nb-glass', 'nb-floating'].map((id) => {
        const cs = getComputedStyle(document.getElementById(id)!);
        return [cs.backgroundColor, cs.color, cs.borderBottomColor, cs.borderTopWidth, cs.boxShadow, cs.backdropFilter].join('|');
      }));
      assert.equal(new Set(looks).size, 7, looks.join('\n'));
      const link = await page.evaluate(() => [getComputedStyle(document.getElementById('nb-primary-link')!).color, getComputedStyle(document.getElementById('nb-primary')!).color]);
      assert.equal(link[0], link[1], 'a link button on a colored bar takes its text color');
      const h = await page.evaluate(() => ['nb-sm', 'nb-md', 'nb-lg'].map((id) => Math.round(document.getElementById(id)!.getBoundingClientRect().height)));
      assert.deepEqual(h, [48, 56, 72]);
      await page.$eval('#nb-scroller', (el) => { el.scrollTop = 300; });
      const st = await box(page, 'nb-sticky'), sc = await box(page, 'nb-scroller');
      assert.ok(Math.abs(st.t - sc.t) < 1, 'stuck to the top of its scroller');
    },
  },
  {
    label: 'collapse lg - wide: the menu is inline, the toggle hidden',
    run: async (page) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      assert.equal(await display(page, 'nb-resp-toggle'), 'none');
      assert.equal(await display(page, 'nb-resp-menu'), 'flex');
      assert.equal(await page.$eval('#nb-resp-menu', (el) => getComputedStyle(el).position), 'static');
      assert.ok((await box(page, 'nb-resp-list')).h > 0, 'links render');
    },
  },
  {
    label: 'collapse lg - narrow: toggle shown, menu closed; the toggle opens it as a popover under itself',
    run: async (page) => {
      await page.setViewportSize({ width: 800, height: 900 });
      assert.notEqual(await display(page, 'nb-resp-toggle'), 'none');
      assert.equal(await display(page, 'nb-resp-menu'), 'none');
      await page.click('#nb-resp-toggle');
      assert.equal(await page.$eval('#nb-resp-menu', (el) => el.matches(':popover-open')), true);
      const t = await box(page, 'nb-resp-toggle'), m = await box(page, 'nb-resp-menu');
      assert.ok(m.t >= t.b && m.t - t.b < 12, `under the toggle (${t.b} → ${m.t})`);
      assert.ok(Math.abs(m.l - t.l) < 1, 'aligned to its start edge');
      assert.equal(await page.$eval('#nb-resp-list', (el) => getComputedStyle(el).flexDirection), 'column', 'the menu turns vertical');
      await page.keyboard.press('Escape');
      assert.equal(await display(page, 'nb-resp-menu'), 'none', 'Escape closes it');
    },
  },
  {
    label: 'anchor-scope: a second collapsed navbar drops its menu under ITS toggle',
    run: async (page) => {
      await page.setViewportSize({ width: 800, height: 900 });
      await page.click('#nb-resp2-toggle');
      const t = await box(page, 'nb-resp2-toggle'), m = await box(page, 'nb-resp2-menu');
      assert.ok(Math.abs(m.l - t.l) < 1 && m.t >= t.b && m.t - t.b < 12, `anchored to its own toggle (${t.l},${t.b} vs ${m.l},${m.t})`);
      await page.keyboard.press('Escape');
    },
  },
  {
    label: 'collapse always / sm / md: always collapsed; sm and md follow 40 / 48rem',
    run: async (page) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      assert.notEqual(await display(page, 'nb-always-toggle'), 'none', 'always: toggle even when wide');
      assert.equal(await display(page, 'nb-always-menu'), 'none');
      assert.equal(await display(page, 'nb-sm-c-t'), 'none');
      assert.equal(await display(page, 'nb-md-c-t'), 'none');
      await page.setViewportSize({ width: 700, height: 900 });
      assert.equal(await display(page, 'nb-sm-c-t'), 'none', 'sm: still wide enough at 700px');
      assert.notEqual(await display(page, 'nb-md-c-t'), 'none', 'md: collapsed below 768px');
      await page.setViewportSize({ width: 600, height: 900 });
      assert.notEqual(await display(page, 'nb-sm-c-t'), 'none', 'sm: collapsed below 640px');
      await page.setViewportSize({ width: 1280, height: 900 });
    },
  },
]);
