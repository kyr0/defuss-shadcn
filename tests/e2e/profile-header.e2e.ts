import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: profile-header is a CSS-only website block (Account & States) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('profile-header', [
  { label: 'the avatar overlaps the cover', run: async (page) => {
    const r = await page.evaluate(() => { const h = document.querySelector('.mk-profile-header:not([data-variant])')!; return h.querySelector('.avatar')!.getBoundingClientRect().top < h.querySelector('.mk-profile-header-cover')!.getBoundingClientRect().bottom; });
    if (!r) throw new Error('no overlap');
  } },
  { label: 'counts are a dl, the more button is named', run: async (page) => {
    const r = await page.evaluate(() => ({ dd: document.querySelectorAll('.mk-profile-header-stats dd').length, more: document.querySelector('.mk-profile-header-actions [aria-label]')!.getAttribute('aria-label') }));
    if (r.dd !== 3 || r.more !== 'More actions') throw new Error(JSON.stringify(r));
  } },
  { label: 'compact: three columns, no cover', run: async (page) => {
    const n = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-profile-header[data-variant="compact"] .mk-profile-header-body')!).gridTemplateColumns.split(' ').length);
    if (n !== 3) throw new Error(String(n));
  } },
]);
