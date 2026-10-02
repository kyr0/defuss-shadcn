import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: social-post is a CSS-only website block (Media) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('social-post', [
  { label: 'counts carry screen-reader labels; the verified mark is named', run: async (page) => {
    const r = await page.evaluate(() => { const p = document.querySelector('.mk-social-post:not([data-variant])')!; return { labels: p.querySelectorAll('.mk-social-post-stats .sr-only').length, verified: p.querySelector('.mk-social-post-verified')!.getAttribute('aria-label') }; });
    if (r.labels !== 3 || r.verified !== 'Verified account') throw new Error(JSON.stringify(r));
  } },
  { label: 'the time is the permalink', run: async (page) => {
    const t = await page.evaluate(() => document.querySelector('.mk-social-post-time')!.firstElementChild!.tagName);
    if (t !== 'TIME') throw new Error(t);
  } },
  { label: 'photo: a square picture bleeding to the edges', selector: '.mk-social-post[data-variant="photo"] > .mk-social-post-media', css: { 'aspect-ratio': '1 / 1', 'border-top-left-radius': '0px' } },
  { label: 'quote: larger text before the author', run: async (page) => {
    const r = await page.evaluate(() => { const q = document.querySelector('.mk-social-post[data-variant="quote"]')!; return { size: getComputedStyle(q.querySelector('.mk-social-post-text p')!).fontSize, first: q.querySelector('.mk-social-post-text')!.getBoundingClientRect().top < q.querySelector('.mk-social-post-head')!.getBoundingClientRect().top }; });
    if (r.size !== '19px' || !r.first) throw new Error(JSON.stringify(r));
  } },
]);
