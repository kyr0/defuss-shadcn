import { cssSmoke } from './lib/css-smoke.ts';

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
]);
