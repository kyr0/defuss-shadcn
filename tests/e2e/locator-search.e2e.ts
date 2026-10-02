import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: locator-search is a CSS-only website block (Events & Promotions) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('locator-search', [
  { label: 'a search landmark with a GET form', run: async (page) => {
    const r = await page.evaluate(() => ({ s: document.querySelector('.mk-locator-search search') !== null, m: (document.querySelector('.mk-locator-search-form') as HTMLFormElement).method }));
    if (!r.s || r.m !== 'get') throw new Error(JSON.stringify(r));
  } },
  { label: 'summary: a polite live output', run: async (page) => {
    const r = await page.evaluate(() => { const o = document.querySelector('.mk-locator-search-summary')!; return o.tagName + o.getAttribute('aria-live'); });
    if (r !== 'OUTPUTpolite') throw new Error(r);
  } },
  { label: 'results reuse compact location items', run: async (page) => {
    const n = await page.evaluate(() => document.querySelectorAll('.mk-locator-search-results .mk-location-item[data-variant="compact"]').length);
    if (n !== 2) throw new Error(String(n));
  } },
  { label: 'inline: a pill row', selector: '.mk-locator-search[data-variant="inline"] .mk-locator-search-form', css: { 'border-top-left-radius': '999px' } },
]);
