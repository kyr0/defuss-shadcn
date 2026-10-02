import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: coming-soon is a CSS-only website block (Account & States) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('coming-soon', [
  { label: 'default: centered with a ticking countdown and a form', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-coming-soon:not([data-variant]) .mk-coming-soon-copy')!; return { align: getComputedStyle(c).textAlign, until: !!c.querySelector('.countdown-group[data-until]'), units: c.querySelectorAll('.countdown-unit[data-variant="primary"]').length, sec: !!c.querySelector('[data-unit="seconds"]'), req: (c.querySelector('input[type="email"]') as HTMLInputElement).required }; });
    if (r.align !== 'center' || !r.until || r.units !== 4 || !r.sec || !r.req) throw new Error(JSON.stringify(r));
  } },
  { label: 'a soft gradient background', run: async (page) => {
    const bg = await page.$eval('.mk-coming-soon', (e) => getComputedStyle(e).backgroundImage);
    if (!bg.includes('radial-gradient')) throw new Error(bg);
  } },
  { label: 'image: the compact timer stays on one row', run: async (page) => {
    const n = await page.evaluate(() => new Set([...document.querySelectorAll('.mk-coming-soon[data-variant="image"] .countdown-unit')].map((u) => Math.round(u.getBoundingClientRect().top))).size);
    if (n !== 1) throw new Error(String(n));
  } },
  { label: 'image: copy beside the picture', run: async (page) => {
    const n = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-coming-soon[data-variant="image"] .mk-coming-soon-layout')!).gridTemplateColumns.split(' ').length);
    if (n !== 2) throw new Error(String(n));
  } },
]);
