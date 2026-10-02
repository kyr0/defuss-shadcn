import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: order-confirmation is a CSS-only website block (Shop) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('order-confirmation', [
  { label: 'the check draws itself; reduced motion keeps it static', run: async (page) => {
    const a = await page.$eval('.mk-order-confirmation-check path', (e) => getComputedStyle(e).animationName);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const b = await page.$eval('.mk-order-confirmation-check path', (e) => getComputedStyle(e).animationName);
    await page.emulateMedia({ reducedMotion: null });
    if (a !== 'mk-order-check' || b !== 'none') throw new Error(JSON.stringify({ a, b }));
  } },
  { label: 'status region with a selectable order number', run: async (page) => {
    const r = await page.evaluate(() => ({ role: document.querySelector('.mk-order-confirmation')!.getAttribute('role'), sel: getComputedStyle(document.querySelector('.mk-order-confirmation-lead code')!).userSelect }));
    if (r.role !== 'status' || r.sel !== 'all') throw new Error(JSON.stringify(r));
  } },
  { label: 'details: a hairline grid of four facts', run: async (page) => {
    const r = await page.evaluate(() => ({ gap: getComputedStyle(document.querySelector('.mk-order-confirmation-details')!).columnGap, n: document.querySelectorAll('.mk-order-confirmation-details dt').length }));
    if (r.gap !== '1px' || r.n !== 4) throw new Error(JSON.stringify(r));
  } },
]);
