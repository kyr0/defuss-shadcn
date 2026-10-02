import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: quick-links is a CSS-only website block (Search & Navigation) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('quick-links', [
  { label: 'tiles: bordered links in a grid', run: async (page) => {
    const r = await page.evaluate(() => { const q = document.querySelector('.mk-quick-links:not([data-variant])')!; return { d: getComputedStyle(q.querySelector('ul')!).display, b: getComputedStyle(q.querySelector('a')!).borderTopWidth }; });
    if (r.d !== 'grid' || r.b !== '1px') throw new Error(JSON.stringify(r));
  } },
  { label: 'list: one column of rules', run: async (page) => {
    const r = await page.evaluate(() => { const q = document.querySelector('.mk-quick-links[data-variant="list"]')!; return { cols: getComputedStyle(q.querySelector('ul')!).gridTemplateColumns.split(' ').length, top: getComputedStyle(q.querySelector('a')!).borderTopWidth }; });
    if (r.cols !== 1 || r.top !== '0px') throw new Error(JSON.stringify(r));
  } },
  { label: 'chips: pills without descriptions', run: async (page) => {
    const r = await page.evaluate(() => { const a = document.querySelector('.mk-quick-links[data-variant="chips"] a')!; return { r: getComputedStyle(a).borderTopLeftRadius, s: getComputedStyle(a.querySelector('small')!).display }; });
    if (r.r !== '999px' || r.s !== 'none') throw new Error(JSON.stringify(r));
  } },
]);
