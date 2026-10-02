import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: search-box is a CSS-only website block (Search & Navigation) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('search-box', [
  { label: 'a search landmark with a GET form and a hidden label', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-search-box')!; return { tag: s.tagName, m: (s.querySelector('form') as HTMLFormElement).method, label: (s.querySelector('input') as HTMLInputElement).labels!.length }; });
    if (r.tag !== 'SEARCH' || r.m !== 'get' || r.label !== 1) throw new Error(JSON.stringify(r));
  } },
  { label: 'large: the scope select, field and button share one center line', run: async (page) => {
    const r = await page.evaluate(() => { const f = document.querySelector('.mk-search-box[data-variant="large"] form')!; const mid = (s: string) => { const b = f.querySelector(s)!.getBoundingClientRect(); return Math.round(b.top + b.height / 2); }; return [mid('.select'), mid('.input'), mid('.btn')]; });
    if (new Set(r).size !== 1) throw new Error(r.join());
  } },
  { label: 'expand: widens on focus', run: async (page) => {
    const before = await page.$eval('#sb-4', (e) => Math.round(e.getBoundingClientRect().width));
    await page.focus('#sb-4');
    await page.waitForTimeout(400);
    const after = await page.$eval('#sb-4', (e) => Math.round(e.getBoundingClientRect().width));
    if (before !== 40 || after !== 288) throw new Error(JSON.stringify({ before, after }));
  } },
]);
