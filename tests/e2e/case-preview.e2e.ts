import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: case-preview is a CSS-only website block (Company) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('case-preview', [
  { label: 'card: a picture on top and a stretched title link', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-case-preview:not([data-variant])')!; return { ar: getComputedStyle(c.querySelector('img')!).aspectRatio, link: getComputedStyle(c.querySelector('.mk-case-preview-title a')!, '::after').position, ov: getComputedStyle(c).overflow }; });
    if (r.ar !== '16 / 10' || r.link !== 'absolute' || r.ov !== 'hidden') throw new Error(JSON.stringify(r));
  } },
  { label: 'wide: picture beside the text', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-case-preview[data-variant="wide"]')!; return c.querySelector('.mk-case-preview-body')!.getBoundingClientRect().left > c.querySelector('.mk-case-preview-media')!.getBoundingClientRect().left + 10; });
    if (!r) throw new Error('not side by side');
  } },
  { label: 'metric: a 24px headline number', selector: '.mk-case-preview-metric strong', css: { 'font-size': '24px', 'font-weight': '700' } },
]);
