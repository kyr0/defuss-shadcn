import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: form-progress is a CSS-only website block (Account & States) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('form-progress', [
  { label: 'default: four steps, the current one bold', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-form-progress:not([data-variant]) [aria-current="step"]')!; return { w: getComputedStyle(c).fontWeight, n: document.querySelectorAll('.mk-form-progress:not([data-variant]) .mk-form-progress-steps li').length }; });
    if (r.w !== '600' || r.n !== 4) throw new Error(JSON.stringify(r));
  } },
  { label: 'numbered: 32px circles, done ones filled', run: async (page) => {
    const r = await page.evaluate(() => { const d = document.querySelector('.mk-form-progress[data-variant="numbered"] [data-done] .mk-form-progress-dot')!; return { w: Math.round(d.getBoundingClientRect().width), bg: getComputedStyle(d).backgroundColor !== getComputedStyle(document.querySelector('.mk-form-progress[data-variant="numbered"] li:not([data-done]) .mk-form-progress-dot')!).backgroundColor }; });
    if (r.w !== 32 || !r.bg) throw new Error(JSON.stringify(r));
  } },
  { label: 'segments: filled up to the current step', run: async (page) => {
    const r = await page.evaluate(() => [...document.querySelectorAll('.mk-form-progress[data-variant="segments"] li')].map((l) => getComputedStyle(l, '::before').backgroundColor));
    if (r[0] !== r[1] || r[1] === r[2]) throw new Error(r.join());
  } },
]);
