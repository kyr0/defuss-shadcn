import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: blog-header is a CSS-only website block (Blog) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('blog-header', [
  { label: 'title scales to 48px at fixture width', selector: '.mk-blog-header-title', css: { 'font-size': '48px' } },
  { label: 'the current category chip is filled, the others outlined', distinct: [ { selector: '.mk-blog-header-categories a[aria-current]', prop: 'background-color' }, { selector: '.mk-blog-header-categories a:not([aria-current])', prop: 'background-color' } ] },
  { label: 'chips are pills', selector: '.mk-blog-header-categories a', css: { 'border-top-left-radius': '999px' } },
  { label: 'banner: on a surface, centered', run: async (page) => {
    const r = await page.evaluate(() => { const b = document.querySelector('.mk-blog-header[data-variant="banner"]')!; const s = getComputedStyle(b); return { bg: s.backgroundImage.includes('radial-gradient'), pad: s.paddingTop, align: s.alignItems }; });
    if (!r.bg || r.pad !== '40px' || r.align !== 'center') throw new Error(JSON.stringify(r));
  } },

  { label: 'split: copy and image side by side at fixture width; the image tilts', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-blog-header[data-variant="split"]')!; const c = s.querySelector('.mk-blog-header-copy')!.getBoundingClientRect(); const m = s.querySelector('.mk-blog-header-media')!; return { beside: m.getBoundingClientRect().left > c.left + 100, rot: getComputedStyle(m).rotate }; });
    if (!r.beside || r.rot !== '1.5deg') throw new Error(JSON.stringify(r));
  } },
  { label: 'the subscribe form is a row; chips carry counts', run: async (page) => {
    const r = await page.evaluate(() => ({ form: getComputedStyle(document.querySelector('.mk-blog-header-subscribe')!).flexDirection, count: document.querySelectorAll('.mk-blog-header-count').length }));
    if (r.form !== 'row' || r.count !== 5) throw new Error(JSON.stringify(r));
  } },
  { label: 'editorial: serif italic title, ornament rules around the eyebrow', run: async (page) => {
    const r = await page.evaluate(() => { const e = document.querySelector('.mk-blog-header[data-variant="editorial"]')!; return { italic: getComputedStyle(e.querySelector('.mk-blog-header-title')!).fontStyle, rule: getComputedStyle(e.querySelector('.mk-blog-header-eyebrow')!, '::before').width }; });
    if (r.italic !== 'italic' || r.rule !== '40px') throw new Error(JSON.stringify(r));
  } },

]);
