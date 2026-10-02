import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: about-intro is a CSS-only website block (Company) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('about-intro', [
  { label: 'default: copy beside the photos, the facts as a dl', run: async (page) => {
    const r = await page.evaluate(() => { const l = document.querySelector('.mk-about-intro-layout')!; return { cols: getComputedStyle(l).gridTemplateColumns.split(' ').length, dd: getComputedStyle(document.querySelector('.mk-about-intro-facts dd')!).fontSize, facts: document.querySelectorAll('.mk-about-intro-facts dt').length }; });
    if (r.cols !== 2 || r.dd !== '30px' || r.facts !== 4) throw new Error(JSON.stringify(r));
  } },
  { label: 'statement: centered serif sentence', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-about-intro[data-variant="statement"] .mk-about-intro-copy')!; return { align: getComputedStyle(c).textAlign, serif: getComputedStyle(c.querySelector('.mk-about-intro-title')!).fontFamily !== getComputedStyle(document.querySelector('.mk-about-intro-lead')!).fontFamily }; });
    if (r.align !== 'center' || !r.serif) throw new Error(JSON.stringify(r));
  } },
  { label: 'values: four cards on one row', run: async (page) => {
    const tops = await page.evaluate(() => [...document.querySelectorAll('.mk-about-intro-values li')].map((e) => Math.round(e.getBoundingClientRect().top)));
    if (tops.length !== 4 || new Set(tops).size !== 1) throw new Error(JSON.stringify(tops));
  } },
]);
