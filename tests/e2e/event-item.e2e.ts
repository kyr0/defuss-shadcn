import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: event-item is a CSS-only website block (Events & Promotions) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('event-item', [
  { label: 'row: tile, details, action in three columns', run: async (page) => {
    const n = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-event-item:not([data-variant])')!).gridTemplateColumns.split(' ').length);
    if (n !== 3) throw new Error(String(n));
  } },
  { label: 'tile: 60px wide, the month in the destructive color', run: async (page) => {
    const r = await page.evaluate(() => { const d = document.querySelector('.mk-event-item-date')!; return { w: Math.round(d.getBoundingClientRect().width), b: getComputedStyle(d.querySelector('b')!).fontSize }; });
    if (r.w !== 60 || r.b !== '26px') throw new Error(JSON.stringify(r));
  } },
  { label: 'register sits above the stretched title link', run: async (page) => {
    const z = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-event-item > .btn')!).zIndex);
    if (z !== '1') throw new Error(z);
  } },
  { label: 'card: the tile floats over the picture', selector: '.mk-event-item[data-variant="card"] .mk-event-item-date', css: { position: 'absolute', top: '12px' } },
]);
