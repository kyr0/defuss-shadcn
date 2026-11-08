import { cssSmoke } from '../lib/css-smoke.ts';

/**
 * Why: availability is a CSS-only website block (Resume & Portfolio) - the fixture instantiates every documented
 * example; these checks pin what it promises: a card with the terms between two rules, a banner that keeps status,
 * heading and actions on one row, the status colour from the Indicator dot, and actions that leave a printed page.
 */
await cssSmoke('availability', [
  { label: 'a card: 1.5rem padding and a border', selector: '.mk-availability:not([data-variant])', css: { 'padding-top': '24px', 'border-top-width': '1px', 'flex-direction': 'column' } },
  { label: 'the terms sit between two rules, label over value', selector: '.mk-availability-facts', css: { 'border-top-width': '1px', 'border-bottom-width': '1px', display: 'grid' } },
  { label: 'the aside is named by its heading', run: async (page) => {
    const r = await page.$$eval('aside.mk-availability', (as) => as.map((a) => document.getElementById(a.getAttribute('aria-labelledby')!)?.className));
    if (r.some((c) => c !== 'mk-availability-title')) throw new Error(JSON.stringify(r));
  } },
  { label: 'banner: status, heading and actions on one row', run: async (page) => {
    const r = await page.evaluate(() => { const b = document.querySelector('.mk-availability[data-variant="banner"]')!; const box = (s: string) => b.querySelector(s)!.getBoundingClientRect(); const s = box('.mk-availability-status'), t = box('.mk-availability-title'), a = box('.mk-availability-actions'); const mid = (r: DOMRect) => (r.top + r.bottom) / 2; return { order: s.right < t.left && t.right < a.left, row: Math.abs(mid(s) - mid(a)) < 12 && Math.abs(mid(t) - mid(a)) < 12, dir: getComputedStyle(b).flexDirection }; });
    if (!r.order || !r.row || r.dir !== 'row') throw new Error(JSON.stringify(r));
  } },
  { label: 'banner: it wraps when narrow', run: async (page) => {
    const r = await page.evaluate(() => { const b = document.querySelector('.mk-availability[data-variant="banner"]') as HTMLElement; b.style.width = '320px'; const t = b.querySelector('.mk-availability-title')!.getBoundingClientRect(); const a = b.querySelector('.mk-availability-actions')!.getBoundingClientRect(); b.style.width = ''; return { below: a.top >= t.bottom - 1, overflow: b.scrollWidth <= b.clientWidth }; });
    if (!r.below || !r.overflow) throw new Error(JSON.stringify(r));
  } },
  { label: 'the status colour is the Indicator dot\'s: available, limited, booked', distinct: [ { selector: '.mk-availability .indicator-dot[data-variant="success"]', prop: 'background-color' }, { selector: '.mk-availability .indicator-dot[data-variant="warning"]', prop: 'background-color' }, { selector: '.mk-availability .indicator-dot[data-variant="neutral"]', prop: 'background-color' } ] },
  { label: 'spotlight: centered on the primary colour, a headline-sized heading', run: async (page) => {
    const r = await page.evaluate(() => { const a = document.querySelector('.mk-availability[data-variant="spotlight"]')!; const card = document.querySelector('.mk-availability:not([data-variant])')!; const t = (e: Element) => getComputedStyle(e.querySelector('.mk-availability-title')!); return { align: getComputedStyle(a).textAlign, bg: getComputedStyle(a).backgroundColor !== getComputedStyle(card).backgroundColor, size: parseFloat(t(a).fontSize) > 2 * parseFloat(t(card).fontSize), dots: getComputedStyle(a).backgroundImage.startsWith('radial-gradient') }; });
    if (r.align !== 'center' || !r.bg || !r.size || !r.dots) throw new Error(JSON.stringify(r));
  } },
  { label: 'spotlight: text in the primary foreground colour', distinct: [ { selector: '.mk-availability[data-variant="spotlight"] .mk-availability-title', prop: 'color' }, { selector: '.mk-availability:not([data-variant]) .mk-availability-title', prop: 'color' } ] },
  { label: 'print: the actions leave the page, the terms stay', run: async (page) => {
    await page.emulateMedia({ media: 'print' });
    const r = await page.evaluate(() => ({ actions: getComputedStyle(document.querySelector('.mk-availability-actions')!).display, facts: getComputedStyle(document.querySelector('.mk-availability-facts')!).display, shadow: getComputedStyle(document.querySelector('.mk-availability')!).boxShadow }));
    await page.emulateMedia({ media: 'screen' });
    if (r.actions !== 'none' || r.facts !== 'grid' || r.shadow !== 'none') throw new Error(JSON.stringify(r));
  } },
]);
