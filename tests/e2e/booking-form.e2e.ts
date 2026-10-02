import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: booking-form is a CSS-only website block (Events & Promotions) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('booking-form', [
  { label: 'the checked service card is highlighted', run: async (page) => {
    const r = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('.mk-booking-form-option:has(input:checked)')!); const o = getComputedStyle(document.querySelector('.mk-booking-form-option:not(:has(input:checked))')!); return c.borderTopColor !== o.borderTopColor && c.boxShadow !== 'none'; });
    if (!r) throw new Error('not highlighted');
  } },
  { label: 'slots: the chosen one fills, booked ones are struck through', run: async (page) => {
    const r = await page.evaluate(() => { const on = getComputedStyle(document.querySelector('.mk-booking-form-slot input:checked + span')!); const off = getComputedStyle(document.querySelector('.mk-booking-form-slot input:disabled + span')!); return { filled: on.backgroundColor !== 'rgba(0, 0, 0, 0)', struck: off.textDecorationLine }; });
    if (!r.filled || r.struck !== 'line-through') throw new Error(JSON.stringify(r));
  } },
  { label: 'clicking a free slot selects it', run: async (page) => {
    await page.click('.mk-booking-form-slot:has(input[value="14:30"])');
    const v = await page.evaluate(() => (document.querySelector('.mk-booking-form input[name="slot"]:checked') as HTMLInputElement).value);
    if (v !== '14:30') throw new Error(v);
  } },
  { label: 'default: two columns from 52rem; compact: a card', run: async (page) => {
    const r = await page.evaluate(() => ({ cols: getComputedStyle(document.querySelector('.mk-booking-form-layout')!).gridTemplateColumns.split(' ').length, card: getComputedStyle(document.querySelector('.mk-booking-form[data-variant="compact"]')!).borderTopWidth }));
    if (r.cols !== 2 || r.card !== '1px') throw new Error(JSON.stringify(r));
  } },
]);
