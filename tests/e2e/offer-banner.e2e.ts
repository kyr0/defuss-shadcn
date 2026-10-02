import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: offer-banner is a CSS-only website block (Events & Promotions) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('offer-banner', [
  { label: 'default: discount, copy and action on one row', run: async (page) => {
    const n = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-offer-banner:not([data-variant]) .mk-offer-banner-inner')!).gridTemplateColumns.split(' ').length);
    if (n !== 3) throw new Error(String(n));
  } },
  { label: 'code: dashed mono chip, selectable at once', selector: '.mk-offer-banner-code', css: { 'border-top-style': 'dashed', 'user-select': 'all' } },
  { label: 'ribbon: a gradient strip', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-offer-banner[data-variant="ribbon"] .mk-offer-banner-inner')!).backgroundImage);
    if (!r.includes('linear-gradient')) throw new Error(r);
  } },
  { label: 'coupon: notched mask and a dashed tear line', run: async (page) => {
    const r = await page.evaluate(() => { const i = document.querySelector('.mk-offer-banner[data-variant="coupon"] .mk-offer-banner-inner')!; return { mask: getComputedStyle(i).maskImage.includes('radial-gradient'), tear: getComputedStyle(i.querySelector('.mk-offer-banner-discount')!).borderRightStyle }; });
    if (!r.mask || r.tear !== 'dashed') throw new Error(JSON.stringify(r));
  } },
]);
