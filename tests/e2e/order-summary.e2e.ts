import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: order-summary is a CSS-only website block (Shop) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('order-summary', [
  { label: 'thumbnails carry a named quantity badge', run: async (page) => {
    const r = await page.evaluate(() => [...document.querySelectorAll('.mk-order-summary-thumb b')].map((b) => b.getAttribute('aria-label')).join());
    if (!r.startsWith('Quantity 1,Quantity 2')) throw new Error(r);
  } },
  { label: 'total: separated by a rule, 22px', selector: '.mk-order-summary-totals [data-total] dd', css: { 'font-size': '22px', 'font-weight': '700' } },
  { label: 'collapsible: closed details, opens to the items', run: async (page) => {
    const before = await page.evaluate(() => (document.querySelector('details.mk-order-summary') as HTMLDetailsElement).open);
    await page.click('details.mk-order-summary > summary');
    const after = await page.evaluate(() => getComputedStyle(document.querySelector('details.mk-order-summary .mk-order-summary-items')!).display);
    if (before || after !== 'grid') throw new Error(JSON.stringify({ before, after }));
  } },
]);
