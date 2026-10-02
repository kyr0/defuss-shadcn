import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: location-item is a CSS-only website block (Events & Promotions) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('location-item', [
  { label: 'status: open is green with a dot, closed is muted', run: async (page) => {
    const r = await page.evaluate(() => ({ open: getComputedStyle(document.querySelector('.mk-location-item-status[data-status="open"]')!).color, closed: getComputedStyle(document.querySelector('.mk-location-item-status[data-status="closed"]')!, '::before').boxShadow }));
    if (r.open !== 'rgb(21, 128, 61)' || r.closed !== 'none') throw new Error(JSON.stringify(r));
  } },
  { label: 'address is an <address>; phone is a tel: link', run: async (page) => {
    const r = await page.evaluate(() => ({ a: document.querySelector('.mk-location-item-address')!.tagName, tel: document.querySelector('.mk-location-item-actions a[href^="tel:"]') !== null }));
    if (r.a !== 'ADDRESS' || !r.tel) throw new Error(JSON.stringify(r));
  } },
  { label: 'compact: actions beside the text', run: async (page) => {
    const n = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-location-item[data-variant="compact"] .mk-location-item-body')!).gridTemplateColumns.split(' ').length);
    if (n !== 2) throw new Error(String(n));
  } },
]);
