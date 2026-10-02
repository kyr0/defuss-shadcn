import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: search-summary is a CSS-only website block (Search & Navigation) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('search-summary', [
  { label: 'a status with the count and the quoted query', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-search-summary')!; return [s.getAttribute('role'), s.querySelector('strong')!.textContent, s.querySelector('q')!.textContent].join('|'); });
    if (r !== 'status|248 results|calm sofware') throw new Error(r);
  } },
  { label: 'compact: small, no rule', selector: '.mk-search-summary[data-variant="compact"]', css: { 'font-size': '13px', 'border-bottom-width': '0px' } },
]);
