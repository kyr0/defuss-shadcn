import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: feedback-form is a CSS-only website block (Account & States) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('feedback-form', [
  { label: 'faces: named radios; the checked one is lifted', run: async (page) => {
    const r = await page.evaluate(() => { const on = document.querySelector('.mk-feedback-form-faces label:has(:checked)')!; return { label: on.querySelector('input')!.getAttribute('aria-label'), scale: getComputedStyle(on).scale }; });
    if (r.label !== 'Good' || r.scale !== '1.15') throw new Error(JSON.stringify(r));
  } },
  { label: 'nps: eleven options on one row', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-feedback-form-scale')!).gridTemplateColumns.split(' ').length);
    if (r !== 11) throw new Error(String(r));
  } },
  { label: 'inline: answering swaps in the thank-you (CSS-only)', run: async (page) => {
    await page.click('.mk-feedback-form-yesno label:first-child');
    const r = await page.evaluate(() => { const f = document.querySelector('.mk-feedback-form[data-variant="inline"]')!; return { q: getComputedStyle(f.querySelector('fieldset')!).display, t: getComputedStyle(f.querySelector('.mk-feedback-form-thanks')!).display }; });
    if (r.q !== 'none' || r.t !== 'block') throw new Error(JSON.stringify(r));
  } },
]);
