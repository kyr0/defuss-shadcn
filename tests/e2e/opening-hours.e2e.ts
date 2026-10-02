import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: opening-hours is a CSS-only website block (Events & Promotions) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('opening-hours', [
  { label: 'today: aria-current="date", bold and tinted', run: async (page) => {
    const r = await page.evaluate(() => { const t = document.querySelector('.mk-opening-hours-days [aria-current="date"]')!; return { w: getComputedStyle(t).fontWeight, bg: getComputedStyle(t).backgroundColor !== 'rgba(0, 0, 0, 0)', day: t.querySelector('dt')!.textContent }; });
    if (r.w !== '600' || !r.bg || r.day !== 'Thursday') throw new Error(JSON.stringify(r));
  } },
  { label: 'status: a green dot', selector: '.mk-opening-hours-status', css: { color: 'rgb(21, 128, 61)' } },
  { label: 'exceptions: dated rows under a rule', run: async (page) => {
    const r = await page.evaluate(() => ({ n: document.querySelectorAll('.mk-opening-hours-exceptions time').length, rule: getComputedStyle(document.querySelector('.mk-opening-hours-exceptions')!).borderTopWidth }));
    if (r.n !== 3 || r.rule !== '1px') throw new Error(JSON.stringify(r));
  } },
  { label: 'compact: no card', selector: '.mk-opening-hours[data-variant="compact"]', css: { 'border-top-width': '0px', 'padding-top': '0px' } },
]);
