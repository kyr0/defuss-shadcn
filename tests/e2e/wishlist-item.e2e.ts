import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: wishlist-item is a CSS-only website block (Shop) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('wishlist-item', [
  { label: 'stock: green / amber / muted, always as text', run: async (page) => {
    const r = await page.evaluate(() => ['in', 'low', 'out'].map((s) => getComputedStyle(document.querySelector(`.mk-wishlist-item-stock[data-stock="${s}"]`)!).color));
    if (r[0] !== 'rgb(21, 128, 61)' || r[1] !== 'rgb(180, 83, 9)' || r[2] === r[0]) throw new Error(r.join());
  } },
  { label: 'out of stock fades the picture and offers "Notify me"', run: async (page) => {
    const r = await page.evaluate(() => { const i = document.querySelector('.mk-wishlist-item:has([data-stock="out"])')!; return { op: getComputedStyle(i.querySelector('img')!).opacity, link: i.querySelector('.mk-wishlist-item-actions a')!.textContent }; });
    if (r.op !== '0.5' || r.link !== 'Notify me') throw new Error(JSON.stringify(r));
  } },
  { label: 'card: a bordered card', selector: '.mk-wishlist-item[data-variant="card"]', css: { 'border-top-width': '1px', 'padding-top': '14px' } },
]);
