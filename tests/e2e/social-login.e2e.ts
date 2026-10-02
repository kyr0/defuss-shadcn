import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: social-login is a CSS-only website block (Account & States) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('social-login', [
  { label: 'default: stacked full-width buttons with visible names', run: async (page) => {
    const r = await page.evaluate(() => { const g = document.querySelector('.mk-social-login:not([data-variant])')!; const b = [...g.querySelectorAll('.btn')]; return { n: b.length, named: b.every((x) => x.textContent!.includes('Continue with')), full: Math.round(b[0].getBoundingClientRect().width) === Math.round(g.getBoundingClientRect().width) }; });
    if (r.n !== 4 || !r.named || !r.full) throw new Error(JSON.stringify(r));
  } },
  { label: 'icons: one row, each with an aria-label', run: async (page) => {
    const r = await page.evaluate(() => { const b = [...document.querySelectorAll('.mk-social-login[data-variant="icons"] .btn')]; return { row: new Set(b.map((x) => Math.round(x.getBoundingClientRect().top))).size, labels: b.every((x) => x.getAttribute('aria-label')?.startsWith('Continue with')) }; });
    if (r.row !== 1 || !r.labels) throw new Error(JSON.stringify(r));
  } },
  { label: 'divider: rules on both sides', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-social-login-divider')!, '::before').height);
    if (r !== '1px') throw new Error(r);
  } },
]);
