import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: view-switcher is a CSS-only website block (Search & Navigation) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('view-switcher', [
  { label: 'grid by default', run: async (page) => {
    const n = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-view-switcher:not([data-variant]) .mk-view-switcher-collection')!).gridTemplateColumns.split(' ').filter((v) => v !== '0px').length);
    if (n < 3) throw new Error(String(n));
  } },
  { label: 'choosing list turns it into rows (CSS-only)', run: async (page) => {
    await page.click('.mk-view-switcher:not([data-variant]) label:has(input[value="list"])');
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-view-switcher:not([data-variant]) .mk-view-switcher-collection')!; return { cols: getComputedStyle(c).gridTemplateColumns.split(' ').length, li: getComputedStyle(c.querySelector('li')!).gridTemplateColumns.split(' ')[0] }; });
    if (r.cols !== 1 || r.li !== '72px') throw new Error(JSON.stringify(r));
  } },
  { label: 'labels: visible text, starts as a list', run: async (page) => {
    const n = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-view-switcher[data-variant="labels"] .mk-view-switcher-collection')!).gridTemplateColumns.split(' ').length);
    if (n !== 1) throw new Error(String(n));
  } },
]);
