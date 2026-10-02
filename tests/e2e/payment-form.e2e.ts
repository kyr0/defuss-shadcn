import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: payment-form is a CSS-only website block (Shop) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('payment-form', [
  { label: 'card is checked: only the card panel shows', run: async (page) => {
    const r = await page.evaluate(() => [...document.querySelectorAll('.mk-payment-form-panel')].map((p) => getComputedStyle(p).display).join());
    if (r !== 'grid,none,none') throw new Error(r);
  } },
  { label: 'choosing bank transfer swaps the panel (CSS-only)', run: async (page) => {
    await page.click('.mk-payment-form-methods label:has(input[value="bank"])');
    const r = await page.evaluate(() => [...document.querySelectorAll('.mk-payment-form-panel')].map((p) => getComputedStyle(p).display).join());
    if (r !== 'none,none,grid') throw new Error(r);
  } },
  { label: 'card fields: cc autocomplete and the numeric keyboard', run: async (page) => {
    const r = await page.evaluate(() => ['pf-num', 'pf-exp', 'pf-cvc'].map((id) => { const i = document.getElementById(id)!; return i.getAttribute('autocomplete') + '/' + i.getAttribute('inputmode'); }).join());
    if (r !== 'cc-number/numeric,cc-exp/numeric,cc-csc/numeric') throw new Error(r);
  } },
  { label: 'saved: the checked card is outlined', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-payment-form-saved label:has(:checked)')!).boxShadow !== 'none');
    if (!r) throw new Error('not outlined');
  } },
]);
