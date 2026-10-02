import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: related-item is a CSS-only website block (Article) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('related-item', [
  { label: 'the title link stretches over the whole item', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-related-item-title a')!, '::after').position);
    if (r !== 'absolute') throw new Error(r);
  } },
  { label: 'default: an 80px square thumbnail beside the copy; two-line titles', run: async (page) => {
    const r = await page.evaluate(() => { const i = document.querySelector('.mk-related-item:not([data-variant])')!; const m = i.querySelector('.mk-related-item-media')!.getBoundingClientRect(); return { w: Math.round(m.width), h: Math.round(m.height), clamp: getComputedStyle(i.querySelector('.mk-related-item-title')!).webkitLineClamp }; });
    if (r.w !== 80 || r.h !== 80 || r.clamp !== '2') throw new Error(JSON.stringify(r));
  } },
  { label: 'card: image above, 16:9', run: async (page) => {
    const r = await page.evaluate(() => { const i = document.querySelector('.mk-related-item[data-variant="card"]')!; return { dir: getComputedStyle(i).flexDirection, ar: getComputedStyle(i.querySelector('.mk-related-item-media')!).aspectRatio }; });
    if (r.dir !== 'column' || r.ar !== '16 / 9') throw new Error(JSON.stringify(r));
  } },
  { label: 'text: no image, a rule below, the arrow at the end', run: async (page) => {
    const r = await page.evaluate(() => { const i = document.querySelector('.mk-related-item[data-variant="text"]')!; return { img: !!i.querySelector('img'), rule: getComputedStyle(i).borderBottomWidth, arrow: !!i.querySelector('.mk-related-item-arrow') }; });
    if (r.img || r.rule !== '1px' || !r.arrow) throw new Error(JSON.stringify(r));
  } },

  { label: 'numbered: the number from data-rank, no thumbnail', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-related-item[data-variant="numbered"][data-rank="3"]')!, '::before').content);
    if (r !== '"3"') throw new Error(r);
  } },
  { label: 'overlay: the image under the title, a badge on it', run: async (page) => {
    const r = await page.evaluate(() => { const o = document.querySelector('.mk-related-item[data-variant="overlay"]')!; return { iso: getComputedStyle(o).isolation, z: getComputedStyle(o.querySelector('.mk-related-item-media')!).zIndex, badge: getComputedStyle(o.querySelector('.mk-related-item-badge')!).position, h: o.getBoundingClientRect().height >= 176 }; });
    if (r.iso !== 'isolate' || r.z !== '-1' || r.badge !== 'absolute' || !r.h) throw new Error(JSON.stringify(r));
  } },

]);
