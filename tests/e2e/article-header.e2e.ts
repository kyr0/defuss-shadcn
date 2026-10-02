import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: article-header is a CSS-only website block (Article) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('article-header', [
  { label: 'title scales to 48px at fixture width; subtitle muted', run: async (page) => {
    const r = await page.evaluate(() => ({ t: getComputedStyle(document.querySelector('.mk-article-header-title')!).fontSize, s: getComputedStyle(document.querySelector('.mk-article-header-subtitle')!).color !== getComputedStyle(document.querySelector('.mk-article-header-title')!).color }));
    if (r.t !== '48px' || !r.s) throw new Error(JSON.stringify(r));
  } },
  { label: 'meta parts are separated by a dot', run: async (page) => {
    const c = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-article-header-meta > :nth-child(2)')!, '::before').content);
    if (c !== '"·"') throw new Error(c);
  } },
  { label: 'lead image is 16:9 with its caption below', selector: '.mk-article-header:not([data-variant]) .mk-article-header-media img', css: { 'aspect-ratio': '16 / 9', 'object-fit': 'cover' } },
  { label: 'centered', selector: '.mk-article-header[data-align="center"]', css: { 'text-align': 'center', 'align-items': 'center' } },
  { label: 'cover: the image fills the header, white copy above it', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-article-header[data-variant="cover"]')!; const h = c.getBoundingClientRect(); const m = c.querySelector('.mk-article-header-media')!.getBoundingClientRect(); return { fill: Math.abs(m.width - h.width) < 1 && Math.abs(m.height - h.height) < 1, tall: h.height >= 416, color: getComputedStyle(c.querySelector('.mk-article-header-title')!).color }; });
    if (!r.fill || !r.tall || r.color !== 'rgb(255, 255, 255)') throw new Error(JSON.stringify(r));
  } },

  { label: 'the actions sit at the end of the byline; the series carries a Progress bar', run: async (page) => {
    const r = await page.evaluate(() => { const b = document.querySelector('.mk-article-header-byline:has(.mk-article-header-actions)')!; const a = b.querySelector('.mk-article-header-actions')!.getBoundingClientRect(); return { end: Math.abs(a.right - b.getBoundingClientRect().right) < 2, prog: getComputedStyle(document.querySelector('.mk-article-header-series .progress')!).width }; });
    if (!r.end || r.prog !== '128px') throw new Error(JSON.stringify(r));
  } },
  { label: 'split: the image beside the title at fixture width', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-article-header[data-variant="split"]')!; const t = s.querySelector('.mk-article-header-title')!.getBoundingClientRect(); const m = s.querySelector('.mk-article-header-media')!.getBoundingClientRect(); return { beside: m.left >= t.right - 1, ar: getComputedStyle(s.querySelector('.mk-article-header-media img')!).aspectRatio }; });
    if (!r.beside || r.ar !== '4 / 5') throw new Error(JSON.stringify(r));
  } },
  { label: 'editorial: italic subtitle, ornaments around the byline', run: async (page) => {
    const r = await page.evaluate(() => { const e = document.querySelector('.mk-article-header[data-variant="editorial"]')!; return { it: getComputedStyle(e.querySelector('.mk-article-header-subtitle')!).fontStyle, orn: getComputedStyle(e.querySelector('.mk-article-header-byline')!, '::before').width }; });
    if (r.it !== 'italic' || r.orn !== '32px') throw new Error(JSON.stringify(r));
  } },

]);
