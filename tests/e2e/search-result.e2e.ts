import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: search-result is a CSS-only website block (Search & Navigation) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('search-result', [
  { label: 'title link stretched; snippet clamped to two lines', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-search-result')!; return { link: getComputedStyle(s.querySelector('.mk-search-result-title a')!, '::after').position, clamp: getComputedStyle(s.querySelector('.mk-search-result-snippet')!).webkitLineClamp }; });
    if (r.link !== 'absolute' || r.clamp !== '2') throw new Error(JSON.stringify(r));
  } },
  { label: 'media: thumbnail column', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-search-result[data-variant="media"]')!).gridTemplateColumns.split(' ')[0]);
    if (r !== '128px') throw new Error(r);
  } },
  { label: 'product: square picture', selector: '.mk-search-result[data-variant="product"] .mk-search-result-media', css: { 'aspect-ratio': '1 / 1' } },
]);
