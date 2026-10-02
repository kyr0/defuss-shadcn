import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: event-countdown is a CSS-only website block (Events & Promotions) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('event-countdown', [
  { label: 'default: centered card with four units', run: async (page) => {
    const r = await page.evaluate(() => { const i = document.querySelector('.mk-event-countdown:not([data-variant]) .mk-event-countdown-inner')!; return { align: getComputedStyle(i).textAlign, units: i.querySelectorAll('.countdown-unit').length, until: !!i.querySelector('[data-until]') }; });
    if (r.align !== 'center' || r.units !== 4 || !r.until) throw new Error(JSON.stringify(r));
  } },
  { label: 'dark: inverted with a glow', run: async (page) => {
    const bg = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-event-countdown[data-variant="dark"] .mk-event-countdown-inner')!).backgroundImage);
    if (!bg.includes('radial-gradient')) throw new Error(bg);
  } },
  { label: 'inline: one row', selector: '.mk-event-countdown[data-variant="inline"] .mk-event-countdown-inner', css: { 'flex-direction': 'row' } },
]);
