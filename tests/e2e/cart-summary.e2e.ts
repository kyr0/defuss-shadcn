import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: cart-summary is a CSS-only website block (Shop) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('cart-summary', [
  { label: 'free shipping: a labelled native progress', run: async (page) => {
    const r = await page.evaluate(() => { const p = document.querySelector('.mk-cart-summary-shipping progress') as HTMLProgressElement; return { v: p.value, label: p.labels.length }; });
    if (r.v !== 84 || r.label !== 1) throw new Error(JSON.stringify(r));
  } },
  { label: 'discount line is green and keeps its minus sign', run: async (page) => {
    const r = await page.evaluate(() => { const d = document.querySelector('.mk-cart-summary-lines [data-discount] dd')!; return { color: getComputedStyle(d).color, text: d.textContent }; });
    if (r.color !== 'rgb(21, 128, 61)' || !r.text!.startsWith('−')) throw new Error(JSON.stringify(r));
  } },
  { label: 'total: a polite live output, 24px', run: async (page) => {
    const r = await page.evaluate(() => { const o = document.querySelector('.mk-cart-summary:not([data-variant]) .mk-cart-summary-total output')!; return o.getAttribute('aria-live') + getComputedStyle(o).fontSize; });
    if (r !== 'polite24px') throw new Error(r);
  } },
  { label: 'checkout spans the card', run: async (page) => {
    const r = await page.evaluate(() => { const b = document.querySelector('.mk-cart-summary-checkout')!; return Math.round(b.getBoundingClientRect().width) === Math.round(b.parentElement!.getBoundingClientRect().width - 50); });
    if (!r) throw new Error('not full width');
  } },
]);
