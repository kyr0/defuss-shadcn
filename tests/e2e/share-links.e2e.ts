import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: share-links is a CSS-only website block (Article) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('share-links', [
  { label: 'a row of square icon buttons with an accessible name each', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-share-links:not([data-variant])')!; const btns = [...s.querySelectorAll('.btn')]; return { n: btns.length, named: btns.every((b) => b.getAttribute('aria-label')), h: Math.round(btns[0].getBoundingClientRect().height), w: Math.round(btns[0].getBoundingClientRect().width), row: getComputedStyle(s.querySelector('.mk-share-links-list')!).flexDirection }; });
    if (r.n !== 4 || !r.named || r.h < 32 || r.w !== r.h || r.row !== 'row') throw new Error(JSON.stringify(r));
  } },
  { label: 'intent links open in a new tab without an opener; email stays in the tab', run: async (page) => {
    const r = await page.evaluate(() => [...document.querySelector('.mk-share-links:not([data-variant])')!.querySelectorAll('a')].map((a) => `${a.getAttribute('target')}:${a.getAttribute('rel')}`));
    if (r.join() !== '_blank:noopener,_blank:noopener,null:null') throw new Error(`got ${r}`);
  } },
  { label: 'the empty status takes no room', selector: '.mk-share-links-status', css: { display: 'none' } },
  { label: 'labeled: buttons with text', run: async (page) => {
    const t = await page.evaluate(() => document.querySelector('.mk-share-links[data-variant="labeled"] .btn')!.textContent!.trim());
    if (t !== 'Post') throw new Error(t);
  } },
  { label: 'vertical: a column, the label turned', run: async (page) => {
    const r = await page.evaluate(() => { const v = document.querySelector('.mk-share-links[data-variant="vertical"]')!; return { dir: getComputedStyle(v.querySelector('.mk-share-links-list')!).flexDirection, mode: getComputedStyle(v.querySelector('.mk-share-links-label')!).writingMode }; });
    if (r.dir !== 'column' || r.mode !== 'vertical-rl') throw new Error(JSON.stringify(r));
  } },

  { label: 'brand: X black, LinkedIn blue, white glyphs', run: async (page) => {
    const r = await page.evaluate(() => { const b = (n: string) => getComputedStyle(document.querySelector(`.mk-share-links[data-variant="brand"] [data-network="${n}"]`)!); return [b('x').backgroundColor, b('linkedin').backgroundColor, b('x').color]; });
    if (r.join('|') !== 'rgb(15, 20, 25)|rgb(10, 102, 194)|rgb(255, 255, 255)') throw new Error(r.join('|'));
  } },
  { label: 'pill: one rounded floating surface', run: async (page) => {
    const r = await page.evaluate(() => { const p = getComputedStyle(document.querySelector('.mk-share-links[data-variant="pill"]')!); return { r: parseFloat(p.borderTopLeftRadius) > 100, sh: p.boxShadow !== 'none', d: p.display }; });
    if (!r.r || !r.sh || r.d !== 'inline-flex') throw new Error(JSON.stringify(r));
  } },
  { label: 'the URL field is a row: input + copy', selector: '.mk-share-links-url', css: { display: 'flex' } },

]);
