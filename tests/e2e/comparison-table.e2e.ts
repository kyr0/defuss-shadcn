import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: comparison-table is a CSS-only website block (Company) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('comparison-table', [
  { label: 'table: the criteria column sticks', selector: '.mk-comparison-table th[scope="row"]', css: { position: 'sticky', 'text-align': 'start' } },
  { label: 'table: the highlighted column has a top rule and a tint', run: async (page) => {
    const r = await page.evaluate(() => { const h = getComputedStyle(document.querySelector('.mk-comparison-table thead [data-highlight]')!); const c = getComputedStyle(document.querySelector('.mk-comparison-table tbody td[data-highlight]')!); const o = getComputedStyle(document.querySelector('.mk-comparison-table tbody td:not([data-highlight])')!); return { rule: h.boxShadow.includes('inset'), tint: c.backgroundColor !== o.backgroundColor }; });
    if (!r.rule || !r.tint) throw new Error(JSON.stringify(r));
  } },
  { label: 'icons are labelled images', run: async (page) => {
    const n = await page.evaluate(() => [...document.querySelectorAll('.mk-comparison-yes, .mk-comparison-no')].filter((s) => !s.getAttribute('aria-label')).length);
    if (n) throw new Error(`${n} unlabelled`);
  } },
  { label: 'versus: two sides on one row', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelectorAll('.mk-comparison-versus section'); return Math.round(s[0].getBoundingClientRect().top) === Math.round(s[1].getBoundingClientRect().top); });
    if (!r) throw new Error('stacked');
  } },
]);
