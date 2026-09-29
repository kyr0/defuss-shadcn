import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: collapsible is a CSS-only native <details> disclosure - verify the
 * trigger geometry, the bordered clipped surface, and that the chevron's
 * 180° rotation tracks the [open] state (the only state signal here).
 */
await cssSmoke('collapsible', [
  {
    label: 'surface is a bordered, clipped block',
    selector: '#cl-closed',
    css: { border: /^1px solid /, 'border-top-width': '1px', overflow: 'hidden' },
  },
  {
    label: '.collapsible-trigger: full-width flex row, 12px/16px padding',
    selector: '#cl-closed .collapsible-trigger',
    css: { display: 'flex', 'column-gap': '8px', padding: '12px 16px', 'font-size': '14px', 'font-weight': '500' },
  },
  {
    label: 'chevron rotates 180° only when [open]',
    run: async (page) => {
      const [closed, open] = await page.evaluate(() => [
        getComputedStyle(document.querySelector('#cl-closed .collapsible-chevron')!).transform,
        getComputedStyle(document.querySelector('#cl-open .collapsible-chevron')!).transform,
      ]);
      assert.ok(closed === 'none' || closed === 'matrix(1, 0, 0, 1, 0, 0)', `closed chevron untransformed, got ${closed}`);
      assert.equal(open, 'matrix(-1, 0, 0, -1, 0, 0)', 'open chevron is rotate(180deg)');
    },
  },
  {
    label: '.collapsible-content is muted body text with asymmetric padding',
    selector: '#cl-open .collapsible-content',
    css: { padding: '0px 16px 12px', 'font-size': '14px', 'line-height': '22.4px' },
  },
  {
    label: 'density compact → trigger 8px block padding',
    selector: '#cl-compact .collapsible-trigger',
    css: { padding: '8px 12px' },
  },
  {
    label: 'density comfortable keeps the 12px 16px trigger default',
    selector: '#cl-comfortable .collapsible-trigger',
    css: { padding: '12px 16px' },
  },
  {
    label: 'density spacious → trigger 16px block padding',
    selector: '#cl-spacious .collapsible-trigger',
    css: { padding: '16px 20px' },
  },
  {
    label: 'variants: muted / primary / neutral surfaces differ; ghost drops the border; content follows the text color',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const cs = (s: string) => getComputedStyle(document.querySelector(s)!);
        return {
          bgs: ['#cl-muted', '#cl-primary', '#cl-neutral'].map((s) => cs(s).backgroundColor),
          ghost: cs('#cl-ghost').borderTopColor,
          primaryText: cs('#cl-primary .collapsible-trigger').color,
          primaryFg: cs('#cl-primary').color,
          customTrigger: cs('#cl-custom .collapsible-trigger').color,
          customContent: cs('#cl-custom .collapsible-content').color,
        };
      });
      assert.equal(new Set(r.bgs).size, 3, r.bgs.join(' | '));
      assert.equal(r.ghost, 'rgba(0, 0, 0, 0)');
      assert.equal(r.primaryText, r.primaryFg, 'trigger inherits the surface text color');
      assert.equal(r.customTrigger, 'rgb(200, 220, 240)', 'custom colors reach the heading');
      assert.notEqual(r.customContent, r.customTrigger, `content is a softened mix of the text color (${r.customContent})`);
    },
  },
  {
    label: 'highlight: plain while closed, the primary surface once open',
    run: async (page) => {
      const bg = () => page.$eval('#cl-hl', (el) => getComputedStyle(el).backgroundColor);
      const primary = await page.$eval('#cl-primary', (el) => getComputedStyle(el).backgroundColor);
      assert.equal(await bg(), 'rgba(0, 0, 0, 0)');
      await page.click('#cl-hl .collapsible-trigger');
      await page.waitForTimeout(300);
      assert.equal(await bg(), primary);
    },
  },
  {
    label: 'sizes: heading 13 / 14 / 16 semibold / 18px bold',
    run: async (page) => {
      const r = await page.evaluate(() => ['#cl-sm', '#cl-md', '#cl-lg', '#cl-xl'].map((s) => { const c = getComputedStyle(document.querySelector(`${s} .collapsible-trigger`)!); return `${c.fontSize}/${c.fontWeight}`; }));
      assert.deepEqual(r, ['13px/500', '14px/500', '16px/600', '18px/700']);
    },
  },
  {
    label: 'icon: a square box in front of the heading, 8px before the text',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const i = document.querySelector('#cl-icon .collapsible-icon')!.getBoundingClientRect();
        const t = document.querySelector('#cl-icon .t')!.getBoundingClientRect();
        return { w: i.width, h: i.height, gap: Math.round(t.left - i.right) };
      });
      assert.ok(Math.abs(r.w - r.h) < 0.5 && r.w > 14, `square (${r.w}x${r.h})`);
      assert.equal(r.gap, 8);
    },
  },
  {
    label: 'markers: arrow turns (45° → -135°), plus loses its vertical bar when open; at the row end',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const a = (s: string) => getComputedStyle(document.querySelector(`${s} .collapsible-trigger`)!, '::after');
        return { arrow: a('#cl-arrow').rotate, arrowOpen: a('#cl-arrow-open').rotate, plus: a('#cl-plus').backgroundSize, plusOpen: a('#cl-plus-open').backgroundSize, ml: a('#cl-arrow').marginInlineStart, content: a('#cl-arrow').content };
      });
      assert.equal(r.content, '""');
      assert.equal(r.arrow, '45deg'); assert.equal(r.arrowOpen, '-135deg');
      assert.ok(r.plus.endsWith('2px 100%'), `plus has both bars (${r.plus})`);
      assert.ok(r.plusOpen.endsWith('2px 0px'), `open plus drops the vertical bar (${r.plusOpen})`);
      assert.notEqual(r.ml, '0px', 'pushed to the end (auto margin)');
    },
  },
  {
    label: 'marker at the start sits before the heading; RTL puts icon right, marker left',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const trig = (s: string) => document.querySelector(`${s} .collapsible-trigger`)!;
        const t = document.querySelector('#cl-start .t')!.getBoundingClientRect();
        const order = getComputedStyle(trig('#cl-start'), '::after').order;
        const rtlIcon = document.querySelector('#cl-rtl .collapsible-icon')!.getBoundingClientRect();
        const rtlText = document.querySelector('#cl-rtl .t')!.getBoundingClientRect();
        return { order, textLeft: t.left - trig('#cl-start').getBoundingClientRect().left, rtlIconRight: rtlIcon.left > rtlText.left };
      });
      assert.equal(r.order, '-1');
      assert.ok(r.textLeft > 24, `text follows the marker (${r.textLeft})`);
      assert.ok(r.rtlIconRight, 'RTL: the icon leads on the right');
    },
  },
  {
    label: 'custom glyphs: quarter turn 90° (mirrored in RTL); when-open / when-closed swap',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const cs = (s: string) => getComputedStyle(document.querySelector(s)!);
        return { q: cs('#cl-quarter .collapsible-chevron').transform, qr: [cs('#cl-quarter-rtl .collapsible-chevron').transform, cs('#cl-quarter-rtl .collapsible-chevron').scale],
          closedShow: cs('#cl-swap .collapsible-when-closed').display, closedHide: cs('#cl-swap .collapsible-when-open').display };
      });
      assert.equal(r.q, 'matrix(0, 1, -1, 0, 0, 0)', 'rotate(90deg)');
      assert.deepEqual(r.qr, ['matrix(0, -1, 1, 0, 0, 0)', '-1 1']);
      assert.notEqual(r.closedShow, 'none'); assert.equal(r.closedHide, 'none');
      await page.click('#cl-swap .collapsible-trigger');
      const after = await page.evaluate(() => [getComputedStyle(document.querySelector('#cl-swap .collapsible-when-closed')!).display, getComputedStyle(document.querySelector('#cl-swap .collapsible-when-open')!).display]);
      assert.equal(after[0], 'none'); assert.notEqual(after[1], 'none');
    },
  },
]);
