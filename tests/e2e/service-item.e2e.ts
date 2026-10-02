import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: service-item is a CSS-only website block (Company) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('service-item', [
  { label: 'card: a bordered surface with an icon tile', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-service-item:not([data-variant])')!; return { border: getComputedStyle(s).borderTopWidth, icon: getComputedStyle(s.querySelector('.mk-service-item-icon')!).width }; });
    if (r.border !== '1px' || r.icon !== '44px') throw new Error(JSON.stringify(r));
  } },
  { label: 'the title link covers the card', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-service-item-title a')!, '::after').position);
    if (r !== 'absolute') throw new Error(r);
  } },
  { label: 'image: a 16:9 picture bleeding to the card edges', selector: '.mk-service-item[data-variant="image"] .mk-service-item-media', css: { 'aspect-ratio': '16 / 9', 'margin-top': '-24px' } },
  { label: 'inline: icon beside the text, no border', selector: '.mk-service-item[data-variant="inline"]', css: { display: 'grid', 'border-top-color': 'rgba(0, 0, 0, 0)' } },
]);
