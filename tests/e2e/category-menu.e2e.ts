import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: category-menu is a CSS-only website block (Search & Navigation) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('category-menu', [
  { label: 'default: the current tab is underlined; the row scrolls', run: async (page) => {
    const r = await page.evaluate(() => { const n = document.querySelector('.mk-category-menu:not([data-variant])')!; return { u: getComputedStyle(n.querySelector('a[aria-current]')!).borderBottomWidth, o: getComputedStyle(n.querySelector('ul')!).overflowX }; });
    if (r.u !== '2px' || r.o !== 'auto') throw new Error(JSON.stringify(r));
  } },
  { label: 'pills: the current one filled', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-category-menu[data-variant="pills"] a[aria-current]')!).backgroundColor !== getComputedStyle(document.querySelector('.mk-category-menu[data-variant="pills"] a:not([aria-current])')!).backgroundColor);
    if (!r) throw new Error('not filled');
  } },
  { label: 'vertical: a column; tiles: a grid', run: async (page) => {
    const r = await page.evaluate(() => ({ v: getComputedStyle(document.querySelector('.mk-category-menu[data-variant="vertical"] ul')!).flexDirection, t: getComputedStyle(document.querySelector('.mk-category-menu[data-variant="tiles"] ul')!).display }));
    if (r.v !== 'column' || r.t !== 'grid') throw new Error(JSON.stringify(r));
  } },
]);
