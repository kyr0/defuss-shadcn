import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: registration-form is a CSS-only website block (Events & Promotions) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('registration-form', [
  { label: 'tickets: three cards in a row, the checked one outlined', run: async (page) => {
    const r = await page.evaluate(() => { const t = [...document.querySelectorAll('.mk-registration-form-ticket')]; const on = getComputedStyle(t.find((x) => (x.querySelector('input') as HTMLInputElement).checked)!); return { row: new Set(t.map((x) => Math.round(x.getBoundingClientRect().top))).size, ring: on.boxShadow !== 'none' }; });
    if (r.row !== 1 || !r.ring) throw new Error(JSON.stringify(r));
  } },
  { label: 'workshops: the checked card is highlighted', run: async (page) => {
    const r = await page.evaluate(() => { const on = getComputedStyle(document.querySelector('.mk-registration-form-choices .checkbox-item:has(:checked)')!); const off = getComputedStyle(document.querySelector('.mk-registration-form-choices .checkbox-item:not(:has(:checked))')!); return on.borderTopColor !== off.borderTopColor; });
    if (!r) throw new Error('not highlighted');
  } },
  { label: 'total: an output', run: async (page) => {
    const t = await page.evaluate(() => document.querySelector('.mk-registration-form-total output')!.tagName);
    if (t !== 'OUTPUT') throw new Error(t);
  } },
]);
