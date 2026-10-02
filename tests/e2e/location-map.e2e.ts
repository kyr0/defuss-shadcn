import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: location-map is a CSS-only website block (Events & Promotions) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('location-map', [
  { label: 'pins: buttons placed by --x / --y', run: async (page) => {
    const r = await page.evaluate(() => { const p = document.querySelector('.mk-location-map-pin') as HTMLElement; const c = p.parentElement!.getBoundingClientRect(); const b = p.getBoundingClientRect(); return { tag: p.tagName, x: Math.round(((b.left + b.width / 2) - c.left) / c.width * 100), target: p.getAttribute('popovertarget') }; });
    if (r.tag !== 'BUTTON' || r.x !== 24 || r.target !== 'lm-1') throw new Error(JSON.stringify(r));
  } },
  { label: 'clicking a pin opens its card; Escape closes it', run: async (page) => {
    await page.click('.mk-location-map-pin');
    const open = await page.evaluate(() => document.getElementById('lm-1')!.matches(':popover-open'));
    await page.keyboard.press('Escape');
    const closed = await page.evaluate(() => !document.getElementById('lm-1')!.matches(':popover-open'));
    if (!open || !closed) throw new Error(JSON.stringify({ open, closed }));
  } },
  { label: 'layout: the map beside the list; full is taller', run: async (page) => {
    const r = await page.evaluate(() => ({ cols: getComputedStyle(document.querySelector('.mk-location-map-layout')!).gridTemplateColumns.split(' ').length, full: getComputedStyle(document.querySelector('.mk-location-map[data-variant="full"] .mk-location-map-canvas')!).minHeight }));
    if (r.cols !== 2 || r.full !== '448px') throw new Error(JSON.stringify(r));
  } },
]);
