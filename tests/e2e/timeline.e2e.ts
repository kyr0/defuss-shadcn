import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: timeline is CSS-only - the 10px dot, the 1px rail each item draws via
 * ::before (suppressed on the last item), and the active-dot recolor.
 */
await cssSmoke('timeline', [
  {
    label: '.timeline is a marker-free positioned list',
    selector: '#tl-demo',
    css: { 'list-style-type': 'none', position: 'relative', padding: '0px', margin: '0px' },
  },
  {
    label: 'items are 16px-gap rows with 24px trailing space',
    selector: '#tl-item-1',
    css: { display: 'flex', gap: '16px', 'padding-bottom': '24px' },
  },
  {
    label: 'dot is a 10px circle; active variant recolors it',
    distinct: [
      { selector: '#tl-item-1 .timeline-dot', prop: 'background-color' },
      { selector: '#tl-item-2 .timeline-dot', prop: 'background-color' },
    ],
  },
  {
    label: 'each item draws a 1px rail but the last one does not',
    run: async (page) => {
      const rails = await page.evaluate(() => ({
        first: getComputedStyle(document.querySelector('#tl-item-1')!, '::before').display,
        last: getComputedStyle(document.querySelector('#tl-item-2')!, '::before').display,
        width: getComputedStyle(document.querySelector('#tl-item-1')!, '::before').width,
      }));
      assert.notEqual(rails.first, 'none', 'non-final items show the connector');
      assert.equal(rails.last, 'none', 'the last item hides its connector');
      assert.equal(rails.width, '1px');
    },
  },
  {
    label: 'horizontal: one row, every dot on one line, connector from dot to 6px before the next dot',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const box = (sel: string) => document.querySelector(sel)!.getBoundingClientRect();
        const d1 = box('#tlh-1 .timeline-dot'), d2 = box('#tlh-2 .timeline-dot'), d3 = box('#tlh-3 .timeline-dot');
        const c1 = box('#tlh-1 .timeline-content');
        const it = document.getElementById('tlh-1')!;
        const cs = getComputedStyle(it, '::before');
        const itBox = it.getBoundingClientRect();
        // the ::before grid item: left = content-box start + margin-start, right = content end - margin-end
        const pad = parseFloat(getComputedStyle(it).paddingRight);
        const lineStart = itBox.left + parseFloat(cs.marginLeft);
        const lineEnd = itBox.right - pad - parseFloat(cs.marginRight);
        return {
          sameLine: Math.round(d1.top) === Math.round(d2.top) && Math.round(d2.top) === Math.round(d3.top),
          contentBelow: c1.top > d1.bottom,
          startGap: Math.round(lineStart - d1.right), endGap: Math.round(d2.left - lineEnd),
          lastHidden: getComputedStyle(document.getElementById('tlh-3')!, '::before').display,
          display: getComputedStyle(document.getElementById('tlh')!).display,
        };
      });
      assert.deepEqual(r, { sameLine: true, contentBelow: true, startGap: 6, endGap: 6, lastHidden: 'none', display: 'grid' });
    },
  },
  {
    label: 'horizontal + data-align="center" + data-alternate: dots centered on one line, every second content above it',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const box = (sel: string) => document.querySelector(sel)!.getBoundingClientRect();
        const it = box('#tlc-1'), d1 = box('#tlc-1 .timeline-dot'), d2 = box('#tlc-2 .timeline-dot'), d3 = box('#tlc-3 .timeline-dot');
        const pad = parseFloat(getComputedStyle(document.getElementById('tlc-1')!).paddingRight);
        return {
          centered: Math.abs((d1.left + d1.right) / 2 - (it.left + (it.width - pad) / 2)) < 1,
          sameLine: Math.round(d1.top) === Math.round(d2.top) && Math.round(d2.top) === Math.round(d3.top),
          above: box('#tlc-2 .timeline-content').bottom <= d2.top,
          below: box('#tlc-1 .timeline-content').top >= d1.bottom,
        };
      });
      assert.deepEqual(r, { centered: true, sameLine: true, above: true, below: true });
    },
  },
  {
    label: 'horizontal: columns keep 10rem and the row scrolls sideways with snapping',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const ol = document.getElementById('tls')!;
        return { scrolls: ol.scrollWidth > ol.clientWidth, overflow: getComputedStyle(ol).overflowX, snap: getComputedStyle(ol).scrollSnapType, col: Math.round(document.getElementById('tls-a')!.getBoundingClientRect().width) };
      });
      assert.equal(r.scrolls, true);
      assert.equal(r.overflow, 'auto');
      assert.match(r.snap, /^x/);
      assert.ok(r.col >= 160, `column ${r.col}px >= 10rem`);
    },
  },
  {
    label: 'dot variants: active / outline / destructive are distinct',
    distinct: [
      { selector: '#tlh-1 .timeline-dot', prop: 'background-color' },
      { selector: '#tlh-2 .timeline-dot', prop: 'background-color' },
      { selector: '#tlh-3 .timeline-dot', prop: 'background-color' },
    ],
  },
  { label: 'outline dot is a 2px ring', selector: '#tlh-2 .timeline-dot', css: { 'box-shadow': /0px 0px 0px 2px inset$/ } },
  {
    label: 'icon dots: a 24px badge, and the connector re-centers on it (vertical + horizontal)',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const dot = document.querySelector('#tli-1 .timeline-dot')!.getBoundingClientRect();
        const it = document.getElementById('tli-1')!;
        const rail = getComputedStyle(it, '::before');
        const railX = it.getBoundingClientRect().left + parseFloat(rail.left) + 0.5;
        const h1 = document.querySelector('#tlhi-1 .timeline-dot')!.getBoundingClientRect();
        const h2 = document.querySelector('#tlhi-2 .timeline-dot')!.getBoundingClientRect();
        const hit = document.getElementById('tlhi-1')!;
        const hcs = getComputedStyle(hit, '::before');
        const hb = hit.getBoundingClientRect();
        const pad = parseFloat(getComputedStyle(hit).paddingRight);
        return {
          size: Math.round(dot.width), centered: Math.abs(railX - (dot.left + dot.width / 2)) < 1,
          hStart: Math.round(hb.left + parseFloat(hcs.marginLeft) - h1.right), hEnd: Math.round(h2.left - (hb.right - pad - parseFloat(hcs.marginRight))),
        };
      });
      assert.deepEqual(r, { size: 24, centered: true, hStart: 6, hEnd: 6 });
    },
  },
  { label: 'timeline: density "compact" → padding-bottom 18px', selector: '#tld-compact .timeline-item', css: { 'padding-bottom': '18px' } },
  { label: 'timeline: density "compact" → column-gap 12px', selector: '#tld-compact .timeline-item', css: { 'column-gap': '12px' } },
  { label: 'timeline: density "comfortable" → padding-bottom 24px', selector: '#tld-comfortable .timeline-item', css: { 'padding-bottom': '24px' } },
  { label: 'timeline: density "comfortable" → column-gap 16px', selector: '#tld-comfortable .timeline-item', css: { 'column-gap': '16px' } },
  { label: 'timeline: density "spacious" → padding-bottom 30px', selector: '#tld-spacious .timeline-item', css: { 'padding-bottom': '30px' } },
  { label: 'timeline: density "spacious" → column-gap 20px', selector: '#tld-spacious .timeline-item', css: { 'column-gap': '20px' } },
]);
