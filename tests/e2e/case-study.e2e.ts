import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: case-study is a CSS-only website block (Company) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('case-study', [
  { label: 'results: a band of metrics separated by hairlines', run: async (page) => {
    const r = await page.evaluate(() => { const d = document.querySelector('.mk-case-study-results')!; return { gap: getComputedStyle(d).columnGap, dd: getComputedStyle(d.querySelector('dd')!).fontSize, n: d.querySelectorAll('dd').length }; });
    if (r.gap !== '1px' || r.dd !== '36px' || r.n !== 3) throw new Error(JSON.stringify(r));
  } },
  { label: 'approach: counted steps', run: async (page) => {
    const c = await page.$eval('.mk-case-study-steps li', (e) => getComputedStyle(e, '::before').content);
    if (c !== 'counter(mk-case-step)') throw new Error(c);
  } },
  { label: 'facts: a sticky 16rem side column', run: async (page) => {
    const r = await page.evaluate(() => { const f = document.querySelector('.mk-case-study-facts')!; return { pos: getComputedStyle(f).position, w: Math.round(f.getBoundingClientRect().width) }; });
    if (r.pos !== 'sticky' || r.w !== 256) throw new Error(JSON.stringify(r));
  } },
  { label: 'cover: a 21:9 picture', selector: '.mk-case-study-cover img', css: { 'aspect-ratio': '21 / 9' } },
]);
