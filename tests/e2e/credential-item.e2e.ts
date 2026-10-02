import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: credential-item is a CSS-only website block (Company) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('credential-item', [
  { label: 'seal: a 48px round badge', selector: '.mk-credential-item:not([data-variant]) .mk-credential-item-seal', css: { width: '48px', 'border-top-left-radius': '50%' } },
  { label: 'verify opens a new tab safely, with context', run: async (page) => {
    const r = await page.evaluate(() => { const a = document.querySelector('.mk-credential-item-verify')!; return { t: a.getAttribute('target'), rel: a.getAttribute('rel'), sr: !!a.querySelector('.sr-only') }; });
    if (r.t !== '_blank' || r.rel !== 'noopener' || !r.sr) throw new Error(JSON.stringify(r));
  } },
  { label: 'compact: dates hidden, three columns', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-credential-item[data-variant="compact"]')!; return { cols: getComputedStyle(c).gridTemplateColumns.split(' ').length, dates: getComputedStyle(c.querySelector('.mk-credential-item-dates')!).display }; });
    if (r.cols !== 3 || r.dates !== 'none') throw new Error(JSON.stringify(r));
  } },
]);
