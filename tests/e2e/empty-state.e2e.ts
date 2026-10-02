import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: empty-state is a CSS-only website block (Account & States) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('empty-state', [
  { label: 'default: centered with an icon in rings', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-empty-state:not([data-variant])')!; return { align: getComputedStyle(s).textAlign, rings: getComputedStyle(s.querySelector('.mk-empty-state-icon')!).boxShadow.split('px 0px').length > 2 }; });
    if (r.align !== 'center' || !r.rings) throw new Error(JSON.stringify(r));
  } },
  { label: 'dashed: a dashed area', selector: '.mk-empty-state[data-variant="dashed"]', css: { 'border-top-style': 'dashed', 'border-top-width': '2px' } },
  { label: 'compact: one row, start-aligned', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-empty-state[data-variant="compact"]')!; return { cols: getComputedStyle(s).gridTemplateColumns.split(' ').length, align: getComputedStyle(s).textAlign }; });
    if (r.cols !== 3 || r.align !== 'start') throw new Error(JSON.stringify(r));
  } },
]);
