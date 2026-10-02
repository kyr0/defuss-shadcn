import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: resource-item is a CSS-only website block (Docs & Help) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('resource-item', [
  { label: 'card: stretched title link, a type pill', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-resource-item:not([data-variant])')!; return { link: getComputedStyle(c.querySelector('.mk-resource-item-title a')!, '::after').position, pill: getComputedStyle(c.querySelector('.mk-resource-item-type')!).borderTopLeftRadius }; });
    if (r.link !== 'absolute' || r.pill !== '999px') throw new Error(JSON.stringify(r));
  } },
  { label: 'compact: a row without the description', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-resource-item[data-variant="compact"]')!; return { dir: getComputedStyle(c).flexDirection, desc: getComputedStyle(c.querySelector('.mk-resource-item-desc')!).display }; });
    if (r.dir !== 'row' || r.desc !== 'none') throw new Error(JSON.stringify(r));
  } },
  { label: 'featured: picture beside the text', selector: '.mk-resource-item[data-variant="featured"]', css: { display: 'grid' } },
]);
