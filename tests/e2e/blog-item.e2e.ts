import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: blog-item is a CSS-only website block (Blog) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('blog-item', [
  { label: 'the title link stretches over the whole card', run: async (page) => {
    const r = await page.evaluate(() => { const s = getComputedStyle(document.querySelector('.mk-blog-item-title a')!, '::after'); return s.position + ' ' + s.inset; });
    if (r !== 'absolute 0px') throw new Error(r);
  } },
  { label: 'default: 3:2 image above the copy, three-line excerpt', run: async (page) => {
    const r = await page.evaluate(() => { const i = document.querySelector('.mk-blog-item:not([data-variant])')!; const m = i.querySelector('.mk-blog-item-media')!; return { ar: getComputedStyle(m).aspectRatio, above: m.getBoundingClientRect().bottom <= i.querySelector('.mk-blog-item-title')!.getBoundingClientRect().top, clamp: getComputedStyle(i.querySelector('.mk-blog-item-excerpt')!).webkitLineClamp }; });
    if (r.ar !== '3 / 2' || !r.above || r.clamp !== '3') throw new Error(JSON.stringify(r));
  } },
  { label: 'horizontal: image beside the copy at fixture width', run: async (page) => {
    const r = await page.evaluate(() => { const i = document.querySelector('.mk-blog-item[data-variant="horizontal"]')!; const m = i.querySelector('.mk-blog-item-media')!.getBoundingClientRect(); const b = i.querySelector('.mk-blog-item-body')!.getBoundingClientRect(); return { beside: b.left >= m.right, top: Math.abs(b.top - m.top) < 2 }; });
    if (!r.beside || !r.top) throw new Error(JSON.stringify(r));
  } },
  { label: 'featured: the image fills the card behind the copy; white text', run: async (page) => {
    const r = await page.evaluate(() => { const f = document.querySelector('.mk-blog-item[data-variant="featured"]')!; const m = f.querySelector('.mk-blog-item-media')!; return { pos: getComputedStyle(m).position, h: f.getBoundingClientRect().height >= 384, color: getComputedStyle(f.querySelector('.mk-blog-item-title')!).color }; });
    if (r.pos !== 'absolute' || !r.h || r.color !== 'rgb(255, 255, 255)') throw new Error(JSON.stringify(r));
  } },

  { label: 'card: a bordered surface; the bookmark Swap and the tags sit above the stretched link', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-blog-item[data-variant="card"]')!; const a = getComputedStyle(c.querySelector('.mk-blog-item-actions')!); const t = getComputedStyle(c.querySelector('.mk-blog-item-tags')!); return { border: getComputedStyle(c).borderTopWidth, a: a.position + a.zIndex, t: t.position + t.zIndex }; });
    if (r.border !== '1px' || r.a !== 'absolute1' || r.t !== 'relative1') throw new Error(JSON.stringify(r));
  } },
  { label: 'the bookmark is clickable (the swap toggles, the link does not fire)', run: async (page) => {
    await page.click('.mk-blog-item[data-variant="card"] .mk-blog-item-actions .swap');
    const v = await page.evaluate(() => (document.querySelector('.mk-blog-item[data-variant="card"] .mk-blog-item-actions input') as HTMLInputElement).checked);
    if (!v) throw new Error('swap not toggled');
  } },
  { label: 'minimal: two columns, the date first, no image', run: async (page) => {
    const r = await page.evaluate(() => { const m = document.querySelector('.mk-blog-item[data-variant="minimal"]')!; return { cols: getComputedStyle(m).gridTemplateColumns.split(' ').length, img: getComputedStyle(m.querySelector('.mk-blog-item-media')!).display, date: m.querySelector('.mk-blog-item-date')!.getBoundingClientRect().left < m.querySelector('.mk-blog-item-title')!.getBoundingClientRect().left }; });
    if (r.cols !== 2 || r.img !== 'none' || !r.date) throw new Error(JSON.stringify(r));
  } },
  { label: 'quote: on the primary surface, serif title with an opening quote', run: async (page) => {
    const r = await page.evaluate(() => { const q = document.querySelector('.mk-blog-item[data-variant="quote"]')!; return { bg: getComputedStyle(q).backgroundColor !== 'rgba(0, 0, 0, 0)', mark: getComputedStyle(q.querySelector('.mk-blog-item-title')!, '::before').content }; });
    if (!r.bg || r.mark !== '"“"') throw new Error(JSON.stringify(r));
  } },
  { label: 'podcast: a square cover beside the copy, the player across the bottom', run: async (page) => {
    const r = await page.evaluate(() => { const p = document.querySelector('.mk-blog-item[data-variant="podcast"]')!; const m = p.querySelector('.mk-blog-item-media')!.getBoundingClientRect(); const pl = p.querySelector('.mk-blog-item-player')!.getBoundingClientRect(); return { square: Math.abs(m.width - m.height) < 2, below: pl.top >= m.bottom, z: getComputedStyle(p.querySelector('.mk-blog-item-player')!).zIndex }; });
    if (!r.square || !r.below || r.z !== '1') throw new Error(JSON.stringify(r));
  } },

]);
