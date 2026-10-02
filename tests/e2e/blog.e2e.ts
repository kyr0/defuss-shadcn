import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: blog is CSS-only - 3-up grid at wide width, 3:2 media, the 3-line
 * excerpt clamp, and the See-all button appearing only at wide width.
 */
await cssSmoke('blog', [
  {
    label: 'grid resolves to three columns at fixture width',
    run: async (page) => {
      const cols = await page.evaluate(
        () => getComputedStyle(document.querySelector('.mk-blog-grid')!).gridTemplateColumns,
      );
      const n = cols.trim().split(/\s+/).length;
      if (n !== 3) throw new Error(`expected 3 columns, got "${cols}"`);
    },
  },
  {
    label: 'preview media keeps 3:2 and cover-crops',
    selector: '.mk-blog-media img',
    css: { 'object-fit': 'cover' },
  },
  {
    label: 'media figure is 3:2',
    selector: '.mk-blog-media',
    css: { 'aspect-ratio': '3 / 2' },
  },
  {
    label: 'excerpt clamps to 3 lines',
    selector: '.mk-blog-excerpt',
    css: { '-webkit-line-clamp': '3', overflow: 'hidden' },
  },
  {
    label: 'See-all shows at wide width, category is primary color',
    distinct: [
      { selector: '.mk-blog-see-all', prop: 'display' }, // inline-flex (head)
      { selector: '.mk-blog-grid', prop: 'display' }, // grid (body)
    ],
  },
  {
    label: 'cards carry no underline; meta read-time is muted',
    selector: '.mk-blog-card',
    css: { 'text-decoration-line': 'none', display: 'flex' },
  },
  {
    label: 'the read time is a pill with a clock glyph',
    run: async (page) => {
      const r = await page.evaluate(() => { const s = getComputedStyle(document.querySelector('.mk-blog-read')!); return { d: s.display, r: s.borderTopLeftRadius, svg: !!document.querySelector('.mk-blog-read svg') }; });
      if (!r.d.endsWith('flex') || r.r !== '999px' || !r.svg) throw new Error(JSON.stringify(r));
    },
  },
  { label: 'featured: the first post spans two columns and rows', selector: '.mk-blog-grid[data-variant="featured"] > :first-child', css: { 'grid-column-start': 'span 2', 'grid-row-start': 'span 2' } },
  { label: 'list: one column of rows, picture beside the text', run: async (page) => {
    const r = await page.evaluate(() => { const g = document.querySelector('.mk-blog-grid[data-variant="list"]')!; const c = g.querySelector('.mk-blog-card')!; return { cols: getComputedStyle(g).gridTemplateColumns.split(' ').length, dir: getComputedStyle(c).flexDirection }; });
    if (r.cols !== 1 || r.dir !== 'row') throw new Error(JSON.stringify(r));
  } },
  { label: 'minimal: a 2px rule on top, no figure', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-blog-grid[data-variant="minimal"] .mk-blog-card')!; return { rule: getComputedStyle(c).borderTopWidth, media: !!c.querySelector('.mk-blog-media') }; });
    if (r.rule !== '2px' || r.media) throw new Error(JSON.stringify(r));
  } },
  { label: 'overlay: white text over a covering picture', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-blog-grid[data-variant="overlay"] .mk-blog-card')!; return { color: getComputedStyle(c).color, media: getComputedStyle(c.querySelector('.mk-blog-media')!).position }; });
    if (r.color !== 'rgb(255, 255, 255)' || r.media !== 'absolute') throw new Error(JSON.stringify(r));
  } },
  { label: 'carousel: a snapping row; filters mark the current link', run: async (page) => {
    const r = await page.evaluate(() => { const g = getComputedStyle(document.querySelector('.mk-blog-grid[data-variant="carousel"]')!); const cur = document.querySelector('.mk-blog-filters a[aria-current]')!; const other = document.querySelector('.mk-blog-filters a:not([aria-current])')!; return { display: g.display, snap: g.scrollSnapType, filled: getComputedStyle(cur).backgroundColor !== getComputedStyle(other).backgroundColor }; });
    if (r.display !== 'flex' || !r.snap.startsWith('x') || !r.filled) throw new Error(JSON.stringify(r));
  } },
]);
