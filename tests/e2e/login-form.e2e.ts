import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: login-form is a CSS-only website block (Account & States) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('login-form', [
  { label: 'fields carry username / current-password autocomplete', run: async (page) => {
    const r = await page.evaluate(() => [document.getElementById('lf-email')!.getAttribute('autocomplete'), document.getElementById('lf-pass')!.getAttribute('autocomplete')].join());
    if (r !== 'username,current-password') throw new Error(r);
  } },
  { label: 'default: a centered 24rem card, full-width submit', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-login-form:not([data-variant])')!; const b = c.querySelector('.btn[type="submit"]')!; return { w: Math.round(c.getBoundingClientRect().width), full: Math.round(b.getBoundingClientRect().width) === Math.round(c.querySelector('form')!.getBoundingClientRect().width) }; });
    if (r.w !== 384 || !r.full) throw new Error(JSON.stringify(r));
  } },
  { label: 'split: form beside the picture', run: async (page) => {
    const n = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-login-form-split')!).gridTemplateColumns.split(' ').length);
    if (n !== 2) throw new Error(String(n));
  } },
  { label: 'minimal: no card', selector: '.mk-login-form[data-variant="minimal"]', css: { 'border-top-width': '0px', 'padding-top': '0px' } },
]);
