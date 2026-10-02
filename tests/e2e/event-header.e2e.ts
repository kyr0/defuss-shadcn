import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: event-header is a CSS-only website block (Events & Promotions) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('event-header', [
  { label: 'default: a gradient band, a 64px title', run: async (page) => {
    const r = await page.evaluate(() => { const i = document.querySelector('.mk-event-header:not([data-variant]) .mk-event-header-inner')!; return { bg: getComputedStyle(i).backgroundImage.includes('radial-gradient'), size: getComputedStyle(i.querySelector('.mk-event-header-title')!).fontSize }; });
    if (!r.bg || r.size !== '64px') throw new Error(JSON.stringify(r));
  } },
  { label: 'calendar action downloads an .ics file', run: async (page) => {
    const d = await page.evaluate(() => document.querySelector('.mk-event-header a[download]')!.getAttribute('download'));
    if (!d?.endsWith('.ics')) throw new Error(String(d));
  } },
  { label: 'image: white over a covering picture', selector: '.mk-event-header[data-variant="image"] .mk-event-header-inner', css: { color: 'rgb(255, 255, 255)' } },
  { label: 'split: copy beside the poster', run: async (page) => {
    const n = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-event-header[data-variant="split"] .mk-event-header-inner')!).gridTemplateColumns.split(' ').length);
    if (n !== 2) throw new Error(String(n));
  } },
]);
