import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: cta is a CSS-only website block (Events & Promotions) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('cta', [
  { label: 'default: centered on a muted surface', selector: '.mk-cta:not([data-variant]) .mk-cta-inner', css: { 'text-align': 'center', 'flex-direction': 'column' } },
  { label: 'split: copy and actions on one row', selector: '.mk-cta[data-variant="split"] .mk-cta-inner', css: { 'flex-direction': 'row', 'text-align': 'start' } },
  { label: 'dark: inverted with a radial glow', run: async (page) => {
    const r = await page.evaluate(() => { const i = getComputedStyle(document.querySelector('.mk-cta[data-variant="dark"] .mk-cta-inner')!); return { glow: i.backgroundImage.includes('radial-gradient'), color: i.color !== getComputedStyle(document.body).color }; });
    if (!r.glow || !r.color) throw new Error(JSON.stringify(r));
  } },
  { label: 'image: white text over a covering picture', run: async (page) => {
    const r = await page.evaluate(() => { const i = document.querySelector('.mk-cta[data-variant="image"] .mk-cta-inner')!; return { color: getComputedStyle(i).color, bg: getComputedStyle(i.querySelector('.mk-cta-bg')!).position }; });
    if (r.color !== 'rgb(255, 255, 255)' || r.bg !== 'absolute') throw new Error(JSON.stringify(r));
  } },
]);
