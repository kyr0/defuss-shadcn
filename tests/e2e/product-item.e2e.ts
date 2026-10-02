import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: product-item is a CSS-only website block (Shop) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('product-item', [
  { label: 'hover crossfades to the second picture', run: async (page) => {
    const sel = '.mk-product-item:not([data-variant])';
    const before = await page.$eval(`${sel} [data-hover]`, (e) => getComputedStyle(e).opacity);
    await page.hover(sel);
    await page.waitForTimeout(500);
    const after = await page.$eval(`${sel} [data-hover]`, (e) => getComputedStyle(e).opacity);
    if (before !== '0' || after !== '1') throw new Error(JSON.stringify({ before, after }));
  } },
  { label: 'wishlist: a checkbox; checking fills the heart', run: async (page) => {
    const sel = '.mk-product-item:not([data-variant]) .mk-product-item-wish';
    await page.click(sel);
    const r = await page.evaluate((s) => { const w = document.querySelector(s)!; const other = document.querySelectorAll('.mk-product-item-wish')[1]; return { checked: (w.querySelector('input') as HTMLInputElement).checked, red: getComputedStyle(w).color !== getComputedStyle(other).color }; }, sel);
    if (!r.checked || !r.red) throw new Error(JSON.stringify(r));
  } },
  { label: 'stars: filled to --mk-rating, labelled once', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-product-item-stars')!; return { bg: getComputedStyle(s).backgroundImage.includes('90%'), label: s.getAttribute('aria-label') }; });
    if (!r.bg || r.label !== '4.5 out of 5 stars') throw new Error(JSON.stringify(r));
  } },
  { label: 'sale: the price turns destructive, the old price is <del>', run: async (page) => {
    const r = await page.evaluate(() => { const p = document.querySelector('.mk-product-item-price:has(del)')!; return { del: !!p.querySelector('del .sr-only'), color: getComputedStyle(p.querySelector('strong')!).color !== getComputedStyle(document.querySelector('.mk-product-item-price:not(:has(del)) strong')!).color }; });
    if (!r.del || !r.color) throw new Error(JSON.stringify(r));
  } },
  { label: 'horizontal: picture beside; minimal: centered, no button', run: async (page) => {
    const r = await page.evaluate(() => ({ cols: getComputedStyle(document.querySelector('.mk-product-item[data-variant="horizontal"]')!).gridTemplateColumns.split(' ').length, btn: getComputedStyle(document.querySelector('.mk-product-item[data-variant="minimal"] .mk-product-item-add')!).display, align: getComputedStyle(document.querySelector('.mk-product-item[data-variant="minimal"]')!).textAlign }));
    if (r.cols !== 2 || r.btn !== 'none' || r.align !== 'center') throw new Error(JSON.stringify(r));
  } },
]);
