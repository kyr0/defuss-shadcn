import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: success-state is a CSS-only website block (Account & States) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('success-state', [
  { label: 'a status with a rippling green check; reduced motion stops it', run: async (page) => {
    const a = await page.$eval('.mk-success-state-icon', (e) => getComputedStyle(e, '::after').animationName);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const b = await page.$eval('.mk-success-state-icon', (e) => getComputedStyle(e, '::after').animationName);
    await page.emulateMedia({ reducedMotion: null });
    if (a !== 'mk-success-ripple' || b !== 'none') throw new Error(JSON.stringify({ a, b }));
  } },
  { label: 'summary: a dl on a muted panel', run: async (page) => {
    const n = await page.evaluate(() => document.querySelectorAll('.mk-success-state-summary dt').length);
    if (n !== 3) throw new Error(String(n));
  } },
  { label: 'compact: a card', selector: '.mk-success-state[data-variant="compact"]', css: { 'border-top-width': '1px', 'padding-top': '24px' } },
]);
