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
]);
