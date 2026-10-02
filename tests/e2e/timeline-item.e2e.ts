import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: timeline-item is a CSS-only website block (Company) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('timeline-item', [
  { label: 'a line and a dot per item', run: async (page) => {
    const r = await page.evaluate(() => { const i = document.querySelector('.mk-timeline-item')!; return { line: getComputedStyle(i, '::before').width, dot: getComputedStyle(i, '::after').width }; });
    if (r.line !== '2px' || r.dot !== '12px') throw new Error(JSON.stringify(r));
  } },
  { label: 'wide: dates in their own column', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-timeline-item')!).gridTemplateColumns.split(' ')[0]);
    if (r !== '112px') throw new Error(r);
  } },
  { label: 'milestone: a filled 16px dot and a highlighted card', run: async (page) => {
    const r = await page.evaluate(() => { const m = document.querySelector('.mk-timeline-item[data-variant="milestone"]')!; return { dot: getComputedStyle(m, '::after').width, border: getComputedStyle(m.querySelector('.mk-timeline-item-body')!).borderTopWidth }; });
    if (r.dot !== '16px' || r.border !== '1px') throw new Error(JSON.stringify(r));
  } },
]);
