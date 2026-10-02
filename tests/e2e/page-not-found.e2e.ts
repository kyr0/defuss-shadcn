import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: page-not-found is a CSS-only website block (Account & States) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('page-not-found', [
  { label: 'the number is decorative; the h1 says it', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-page-not-found:not([data-variant])')!; return { hidden: s.querySelector('.mk-page-not-found-code')!.getAttribute('aria-hidden'), h1: s.querySelector('h1')!.textContent }; });
    if (r.hidden !== 'true' || r.h1 !== 'Page not found') throw new Error(JSON.stringify(r));
  } },
  { label: 'a search landmark with a GET form', run: async (page) => {
    const m = await page.evaluate(() => (document.querySelector('.mk-page-not-found search form') as HTMLFormElement).method);
    if (m !== 'get') throw new Error(m);
  } },
  { label: 'illustrated: the number sits behind the copy', selector: '.mk-page-not-found[data-variant="illustrated"] .mk-page-not-found-code', css: { position: 'absolute', 'z-index': '-1' } },
  { label: 'minimal: a 64px muted number', selector: '.mk-page-not-found[data-variant="minimal"] .mk-page-not-found-code', css: { 'font-size': '64px' } },
]);
