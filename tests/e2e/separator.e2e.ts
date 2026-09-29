import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: separator is CSS-only - verify the 1px horizontal rule stretches
 * full width, the vertical orientation swaps the axis and stretches to the
 * flex row's height, and the labelled variant lays out label + rules.
 */
await cssSmoke('separator', [
  {
    label: 'horizontal <hr> is a borderless 1px bar spanning its container',
    selector: '#sep-horizontal',
    css: { height: '1px', 'border-top-width': '0px', 'flex-shrink': '0' },
  },
  {
    label: 'horizontal rule fills the available width (width >> height)',
    run: async (page) => {
      const box = await page.$eval('#sep-horizontal', (el) => el.getBoundingClientRect());
      assert.ok(box.width > box.height * 100, `expected a full-width 1px rule, got ${box.width}×${box.height}`);
    },
  },
  {
    label: 'vertical separator is 1px wide and stretches to the row height',
    selector: '#sep-vertical',
    css: { width: '1px', height: '48px', 'align-self': 'stretch' },
  },
  {
    label: 'labelled separator: flex row with 12px gaps, uppercase label',
    selector: '#sep-labelled',
    css: { display: 'flex', gap: '12px' },
  },
  {
    label: 'text on the line: two pseudo-element lines flank it, centered by default',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const el = document.getElementById('sep-text')!;
        const box = el.getBoundingClientRect();
        const range = document.createRange(); range.selectNodeContents(el);
        const t = range.getBoundingClientRect();
        const b = getComputedStyle(el, '::before'), a = getComputedStyle(el, '::after');
        return { left: t.left - box.left, right: box.right - t.right, before: b.height, after: a.height, bg: getComputedStyle(el).backgroundColor };
      });
      assert.ok(Math.abs(r.left - r.right) < 1, `centered: ${r.left} vs ${r.right}`);
      assert.deepEqual([r.before, r.after], ['1px', '1px']);
      assert.equal(r.bg, 'rgba(0, 0, 0, 0)', 'no background bar behind the text');
    },
  },
  {
    label: 'data-align start / end: the text sits at the start / end of the line',
    run: async (page) => {
      const r = await page.evaluate(() => ['sep-start', 'sep-end'].map((id) => {
        const el = document.getElementById(id)!;
        const box = el.getBoundingClientRect();
        const range = document.createRange(); range.selectNodeContents(el);
        const t = range.getBoundingClientRect();
        return [Math.round(t.left - box.left), Math.round(box.right - t.right)];
      }));
      assert.equal(r[0][0], 0, 'start: flush left');
      assert.ok(r[0][1] > 200, 'start: the line runs to the end');
      assert.equal(r[1][1], 0, 'end: flush right');
    },
  },
  {
    label: 'data-variant: eight colors + the default are nine distinct lines; error = destructive',
    run: async (page) => {
      const colors = await page.evaluate(() => ['text', 'c-neutral', 'c-primary', 'c-secondary', 'c-accent', 'c-info', 'c-success', 'c-warning', 'c-destructive', 'c-error']
        .map((id) => getComputedStyle(document.getElementById(`sep-${id}`)!, '::before').backgroundColor));
      assert.equal(new Set(colors.slice(0, 9)).size, 9, colors.join(' | '));
      assert.equal(colors[9], colors[8], 'error is an alias of destructive');
    },
  },
  {
    label: 'data-size: 1 / 2 / 4 / 8px lines, with text and on a plain <hr>',
    run: async (page) => {
      const r = await page.evaluate(() => ({
        text: ['sm', 'md', 'lg', 'xl'].map((z) => getComputedStyle(document.getElementById(`sep-s-${z}`)!, '::before').height),
        hr: getComputedStyle(document.getElementById('sep-hr-lg')!).height,
      }));
      assert.deepEqual(r, { text: ['1px', '2px', '4px', '8px'], hr: '4px' });
    },
  },
  {
    label: 'data-gap: 0 / 6 / 12 / 24 / 40px between text and lines',
    run: async (page) => {
      const gaps = await page.evaluate(() => ['none', 'sm', 'md', 'lg', 'xl'].map((g) => getComputedStyle(document.getElementById(`sep-g-${g}`)!).columnGap));
      assert.deepEqual(gaps, ['0px', '6px', '12px', '24px', '40px']);
    },
  },
  {
    label: 'vertical with text: lines above and below, start puts the text on top',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const el = document.getElementById('sep-vtext')!;
        const b = getComputedStyle(el, '::before');
        const s = document.getElementById('sep-vstart')!;
        const box = s.getBoundingClientRect();
        const range = document.createRange(); range.selectNodeContents(s);
        return { dir: getComputedStyle(el).flexDirection, w: b.width, h: parseFloat(b.height), top: Math.round(range.getBoundingClientRect().top - box.top) };
      });
      assert.equal(r.dir, 'column');
      assert.equal(r.w, '1px');
      assert.ok(r.h > 20, `line runs up (${r.h}px)`);
      assert.ok(r.top <= 4, `start = top (glyph box ${r.top}px inside its 20px line box)`);
    },
  },
  {
    label: 'responsive: data-orientation-lg="vertical" is vertical from 64rem, horizontal below',
    run: async (page) => {
      const dir = () => page.evaluate(() => getComputedStyle(document.getElementById('sep-resp')!).flexDirection);
      await page.setViewportSize({ width: 1280, height: 800 });
      assert.equal(await dir(), 'column');
      await page.setViewportSize({ width: 700, height: 800 });
      assert.equal(await dir(), 'row');
      await page.setViewportSize({ width: 1280, height: 800 });
    },
  },
  {
    label: 'label text is 12px/500 uppercase',
    selector: '#sep-labelled span',
    css: { 'font-size': '12px', 'font-weight': '500', 'text-transform': 'uppercase' },
  },
]);
