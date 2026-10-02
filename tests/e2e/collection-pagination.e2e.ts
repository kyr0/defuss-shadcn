import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: collection-pagination is a CSS-only website block (Search & Navigation) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('collection-pagination', [
  { label: 'range, pages and per-page on one row', run: async (page) => {
    const r = await page.evaluate(() => new Set([...document.querySelector('.mk-collection-pagination')!.children].map((c) => Math.round(c.getBoundingClientRect().top + c.getBoundingClientRect().height / 2))).size);
    if (r !== 1) throw new Error(String(r));
  } },
  { label: 'the current page is marked', run: async (page) => {
    const r = await page.evaluate(() => document.querySelector('.mk-collection-pagination [aria-current="page"]')!.textContent);
    if (r !== '2') throw new Error(String(r));
  } },
  { label: 'simple: prev / next with rel; centered: a column', run: async (page) => {
    const r = await page.evaluate(() => ({ rel: [...document.querySelectorAll('.mk-collection-pagination[data-variant="simple"] a')].map((a) => a.getAttribute('rel')).join(), dir: getComputedStyle(document.querySelector('.mk-collection-pagination[data-variant="centered"]')!).flexDirection }));
    if (r.rel !== 'prev,next' || r.dir !== 'column') throw new Error(JSON.stringify(r));
  } },
]);
