import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: collection-item is a CSS-only website block (Shop) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('collection-item', [
  { label: 'default: 4:5 picture, stretched title link', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-collection-item:not([data-variant])')!; return { ar: getComputedStyle(c.querySelector('img')!).aspectRatio, link: getComputedStyle(c.querySelector('.mk-collection-item-title a')!, '::after').position }; });
    if (r.ar !== '4 / 5' || r.link !== 'absolute') throw new Error(JSON.stringify(r));
  } },
  { label: 'overlay: white text over a scrim', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-collection-item[data-variant="overlay"]')!; return { color: getComputedStyle(c).color, pos: getComputedStyle(c.querySelector('.mk-collection-item-body')!).position }; });
    if (r.color !== 'rgb(255, 255, 255)' || r.pos !== 'absolute') throw new Error(JSON.stringify(r));
  } },
  { label: 'banner: 21:9 with a pill cue', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-collection-item[data-variant="banner"]')!; return { ar: getComputedStyle(c.querySelector('img')!).aspectRatio, pill: getComputedStyle(c.querySelector('.mk-collection-item-more')!).borderTopLeftRadius }; });
    if (r.ar !== '21 / 9' || r.pill !== '999px') throw new Error(JSON.stringify(r));
  } },
]);
