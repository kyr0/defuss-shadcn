import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: address-form is a CSS-only website block (Shop) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('address-form', [
  { label: 'grid: 6 columns, spans per field', run: async (page) => {
    const r = await page.evaluate(() => { const g = document.querySelector('.mk-address-form-grid')!; return { cols: getComputedStyle(g).gridTemplateColumns.split(' ').length, zip: getComputedStyle(g.querySelector('[data-span="2"]')!).gridColumnStart }; });
    if (r.cols !== 6 || r.zip !== 'span 2') throw new Error(JSON.stringify(r));
  } },
  { label: 'every field has an autocomplete token and a label', run: async (page) => {
    const n = await page.evaluate(() => [...document.querySelectorAll('.mk-address-form-grid :is(input, select)')].filter((e) => !e.getAttribute('autocomplete') || !(e as HTMLInputElement).labels?.length).length);
    if (n) throw new Error(`${n} without token/label`);
  } },
  { label: 'saved: the checked card is outlined', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-address-form-option:has(input:checked)')!).boxShadow !== 'none');
    if (!r) throw new Error('not outlined');
  } },
]);
