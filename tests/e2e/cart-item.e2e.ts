import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: cart-item is a CSS-only website block (Shop) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('cart-item', [
  { label: 'row: picture, info, quantity, total', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-cart-item:not([data-variant])')!).gridTemplateColumns.split(' ').length);
    if (r !== 4) throw new Error(String(r));
  } },
  { label: 'every stepper and remove button names its product', run: async (page) => {
    const r = await page.evaluate(() => ({ labels: [...document.querySelectorAll('.mk-cart-item .number-input input')].every((i) => (i as HTMLInputElement).labels!.length === 1), remove: [...document.querySelectorAll('.mk-cart-item-remove')].every((b) => /Remove .+ from cart/.test(b.getAttribute('aria-label') ?? '')) }));
    if (!r.labels || !r.remove) throw new Error(JSON.stringify(r));
  } },
  { label: 'total: an output tied to the quantity', run: async (page) => {
    const r = await page.evaluate(() => { const o = document.querySelector('.mk-cart-item-total') as HTMLOutputElement; return o.tagName + ':' + o.htmlFor.value; });
    if (r !== 'OUTPUT:ci-1-qty') throw new Error(r);
  } },
  { label: 'compact: three columns, a 56px picture', selector: '.mk-cart-item[data-variant="compact"] .mk-cart-item-image', css: { width: '56px' } },
]);
