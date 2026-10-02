import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: news-item is a CSS-only website block (News) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('news-item', [
  { label: 'the headline link stretches over the whole item (one click target)', run: async (page) => {
    const r = await page.evaluate(() => { const a = document.querySelector('.mk-news-item-title a')!; const s = getComputedStyle(a, '::after'); const item = a.closest('.mk-news-item')!; return { pos: s.position, inset: s.inset, itemPos: getComputedStyle(item).position }; });
    if (r.pos !== 'absolute' || r.inset !== '0px' || r.itemPos !== 'relative') throw new Error(JSON.stringify(r));
  } },
  { label: 'summary clamps to three lines; thumbnails are 4:3', run: async (page) => {
    const r = await page.evaluate(() => ({ clamp: getComputedStyle(document.querySelector('.mk-news-item-summary')!).webkitLineClamp, ar: getComputedStyle(document.querySelector('.mk-news-item:not([data-variant]) .mk-news-item-media')!).aspectRatio }));
    if (r.clamp !== '3' || r.ar !== '4 / 3') throw new Error(JSON.stringify(r));
  } },
  { label: 'lead: image above the copy at 16:9, a 32px headline', run: async (page) => {
    const r = await page.evaluate(() => { const l = document.querySelector('.mk-news-item[data-variant="lead"]')!; const m = l.querySelector('.mk-news-item-media')!.getBoundingClientRect(); const t = l.querySelector('.mk-news-item-title')!; return { above: m.bottom <= t.getBoundingClientRect().top, size: getComputedStyle(t).fontSize, ar: getComputedStyle(l.querySelector('.mk-news-item-media')!).aspectRatio }; });
    if (!r.above || r.size !== '32px' || r.ar !== '16 / 9') throw new Error(JSON.stringify(r));
  } },
  { label: 'compact: time beside the headline, category hidden', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-news-item[data-variant="compact"]')!; return { dir: getComputedStyle(c.querySelector('.mk-news-item-body')!).flexDirection, cat: getComputedStyle(c.querySelector('.mk-news-item-category')!).display }; });
    if (r.dir !== 'row' || r.cat !== 'none') throw new Error(JSON.stringify(r));
  } },
  { label: 'live marker carries the pulsing dot', run: async (page) => {
    const a = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-news-item-live')!, '::before').animationName);
    if (a !== 'mk-news-item-pulse') throw new Error(a);
  } },

  { label: 'card: a surface with the image on top; the footer is raised above the stretched link', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-news-item[data-variant="card"]')!; const m = c.querySelector('.mk-news-item-media')!.getBoundingClientRect(); const t = c.querySelector('.mk-news-item-title')!.getBoundingClientRect(); const f = getComputedStyle(c.querySelector('.mk-news-item-footer')!); return { border: getComputedStyle(c).borderTopWidth, top: m.bottom <= t.top, z: f.zIndex, pos: f.position }; });
    if (r.border !== '1px' || !r.top || r.z !== '1' || r.pos !== 'relative') throw new Error(JSON.stringify(r));
  } },
  { label: 'video media: duration from data-video', run: async (page) => {
    const c = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-news-item-media[data-video]')!, '::after').content);
    if (c !== '"4:12"') throw new Error(c);
  } },
  { label: 'overlay: the image under a static body, so the headline link spans the item', run: async (page) => {
    const r = await page.evaluate(() => { const o = document.querySelector('.mk-news-item[data-variant="overlay"]')!; return { iso: getComputedStyle(o).isolation, media: getComputedStyle(o.querySelector('.mk-news-item-media')!).zIndex, body: getComputedStyle(o.querySelector('.mk-news-item-body')!).position, color: getComputedStyle(o.querySelector('.mk-news-item-title')!).color }; });
    if (r.iso !== 'isolate' || r.media !== '-1' || r.body !== 'static' || r.color !== 'rgb(255, 255, 255)') throw new Error(JSON.stringify(r));
  } },
  { label: 'ranked: the number from data-rank, no summary', run: async (page) => {
    const r = await page.evaluate(() => { const i = document.querySelector('.mk-news-item[data-variant="ranked"][data-rank="2"]')!; return getComputedStyle(i, '::before').content; });
    if (r !== '"2"') throw new Error(r);
  } },
  { label: 'live: a rail with a dot; the key moment is red', run: async (page) => {
    const r = await page.evaluate(() => { const [k, n] = document.querySelectorAll('.mk-news-item[data-variant="live"]'); const m = (e: Element) => e.querySelector('.mk-news-item-meta')!; return { rail: getComputedStyle(m(n)).borderRightWidth, key: getComputedStyle(m(k), '::after').backgroundColor !== getComputedStyle(m(n), '::after').backgroundColor }; });
    if (r.rail !== '2px' || !r.key) throw new Error(JSON.stringify(r));
  } },
  { label: 'loading: Skeleton bars inside the same layout, aria-busy', run: async (page) => {
    const r = await page.evaluate(() => { const l = document.querySelector('.mk-news-item[aria-busy="true"]')!; return { n: l.querySelectorAll('.skeleton').length, media: Math.round(l.querySelector('.mk-news-item-media')!.getBoundingClientRect().width) }; });
    if (r.n !== 5 || r.media !== 144) throw new Error(JSON.stringify(r));
  } },

]);
