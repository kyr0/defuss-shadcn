import { cssSmoke } from '../lib/css-smoke.ts';

/**
 * Why: session-item is a CSS-only website block (Events & Promotions) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('session-item', [
  { label: 'a time column, a track rule on the start edge', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-session-item:not([data-variant])')!; return { col: getComputedStyle(s).gridTemplateColumns.split(' ')[0], rule: getComputedStyle(s).borderLeftWidth }; });
    if (r.col !== '72px' || r.rule !== '3px') throw new Error(JSON.stringify(r));
  } },
  { label: 'save toggle: a real checkbox; checking shows "Added"', run: async (page) => {
    const sel = '.mk-session-item:not([data-variant]) .mk-session-item-save';
    await page.click(sel);
    const r = await page.evaluate((s) => { const l = document.querySelector(s)!; return { checked: (l.querySelector('input') as HTMLInputElement).checked, on: getComputedStyle(l.querySelector('.mk-session-item-save-on')!).display, off: getComputedStyle(l.querySelector('.mk-session-item-save-off')!).display }; }, sel);
    if (!r.checked || !r.on.endsWith('flex') || r.off !== 'none') throw new Error(JSON.stringify(r));
  } },
  { label: 'keynote tinted, break dashed and muted', run: async (page) => {
    const r = await page.evaluate(() => ({ key: getComputedStyle(document.querySelector('.mk-session-item[data-variant="keynote"] .mk-session-item-title')!).fontSize, brk: getComputedStyle(document.querySelector('.mk-session-item[data-variant="break"]')!).borderTopStyle }));
    if (r.key !== '22px' || r.brk !== 'dashed') throw new Error(JSON.stringify(r));
  } },
  { label: 'cover: the picture fills the card under a scrim; white text, the save toggle in the top corner', run: async (page) => {
    const r = await page.$eval('.mk-session-item[data-variant="cover"]', (c) => { const img = c.querySelector('.mk-session-item-cover')!; const cr = c.getBoundingClientRect(); const ir = img.getBoundingClientRect(); const sr = c.querySelector('.mk-session-item-save')!.getBoundingClientRect(); const br = c.querySelector('.mk-session-item-body')!.getBoundingClientRect(); return { pos: getComputedStyle(img).position, fill: Math.round(ir.width) === Math.round(cr.width) && Math.round(ir.height) === Math.round(cr.height), color: getComputedStyle(c).color, minH: getComputedStyle(c).minHeight, saveTop: sr.top - cr.top < 40 && cr.right - sr.right < 40, bodyLow: br.bottom > cr.bottom - 40 }; });
    if (r.pos !== 'absolute' || !r.fill || r.color !== 'rgb(255, 255, 255)' || r.minH !== '352px' || !r.saveTop || !r.bodyLow) throw new Error(JSON.stringify(r));
  } },
  { label: 'live: an uppercase chip with a dot; a session running now gets a red border', run: async (page) => {
    const r = await page.$eval('.mk-session-item:has(.mk-session-item-live):not([data-variant="cover"])', (c) => { const l = c.querySelector('.mk-session-item-live')!; return { up: getComputedStyle(l).textTransform, dot: getComputedStyle(l, '::before').width, anim: getComputedStyle(l, '::before').animationName, border: getComputedStyle(c).borderTopColor }; });
    if (r.up !== 'uppercase' || r.dot !== '8px' || r.anim !== 'mk-session-live' || !r.border.startsWith('oklch') && !r.border.startsWith('color')) throw new Error(JSON.stringify(r));
  } },
  { label: 'tags are pills; links name their session for a screen reader', run: async (page) => {
    const r = await page.$eval('.mk-session-item:has(.mk-session-item-links)', (c) => ({ pill: getComputedStyle(c.querySelector('.mk-session-item-tags li') ?? document.querySelector('.mk-session-item-tags li')!).borderTopLeftRadius, name: c.querySelector('.mk-session-item-links a')!.textContent!.trim() }));
    if (r.pill !== '999px' || !/ of /.test(r.name)) throw new Error(JSON.stringify(r));
  } },
]);
