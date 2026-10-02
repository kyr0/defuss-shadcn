import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: article-navigation is a CSS-only website block (Article) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('article-navigation', [
  { label: 'two columns: prev starts, next ends (end-aligned text)', run: async (page) => {
    const r = await page.evaluate(() => { const n = document.querySelector('.mk-article-nav')!; const [p, x] = [...n.children].map((e) => e.getBoundingClientRect()); return { beside: x.left > p.right, align: getComputedStyle(n.children[1]).textAlign, rel: [...n.children].map((e) => e.getAttribute('rel')).join() }; });
    if (!r.beside || r.align !== 'end' || r.rel !== 'prev,next') throw new Error(JSON.stringify(r));
  } },
  { label: 'a lone next link keeps the end side', run: async (page) => {
    const r = await page.evaluate(() => { const n = document.querySelectorAll('.mk-article-nav')[1]; const box = n.getBoundingClientRect(); const l = n.children[0].getBoundingClientRect(); return { right: Math.abs(l.right - box.right) < 2, half: l.left > box.left + box.width / 3 }; });
    if (!r.right || !r.half) throw new Error(JSON.stringify(r));
  } },
  { label: 'cards by default, plain links in minimal', distinct: [ { selector: '.mk-article-nav:not([data-variant]) .mk-article-nav-link', prop: 'border-top-width' }, { selector: '.mk-article-nav[data-variant="minimal"] .mk-article-nav-link', prop: 'border-top-width' } ] },

  { label: 'media: thumbnails on the outer sides', run: async (page) => {
    const r = await page.evaluate(() => { const [p, n] = document.querySelectorAll('.mk-article-nav[data-variant="media"] .mk-article-nav-link'); const pi = p.querySelector('img')!.getBoundingClientRect(); const pt = p.querySelector('.mk-article-nav-title')!.getBoundingClientRect(); const ni = n.querySelector('img')!.getBoundingClientRect(); const nt = n.querySelector('.mk-article-nav-title')!.getBoundingClientRect(); return { prev: pi.right <= pt.left, next: ni.left >= nt.right }; });
    if (!r.prev || !r.next) throw new Error(JSON.stringify(r));
  } },
  { label: 'compact: pills in one row, the direction words visually hidden', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-article-nav[data-variant="compact"]')!; return { d: getComputedStyle(c).display, w: c.querySelector('.mk-article-nav-dir span')!.getBoundingClientRect().width, r: parseFloat(getComputedStyle(c.querySelector('.mk-article-nav-link')!).borderTopLeftRadius) > 100 }; });
    if (r.d !== 'flex' || r.w > 1 || !r.r) throw new Error(JSON.stringify(r));
  } },

]);
