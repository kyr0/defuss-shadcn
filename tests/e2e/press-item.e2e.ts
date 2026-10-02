import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: press-item is a CSS-only website block (Company) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('press-item', [
  { label: 'the external headline link covers the card and warns', run: async (page) => {
    const r = await page.evaluate(() => { const a = document.querySelector('.mk-press-item-title a')!; return { pos: getComputedStyle(a, '::after').position, t: a.getAttribute('target'), sr: !!a.querySelector('.sr-only') }; });
    if (r.pos !== 'absolute' || r.t !== '_blank' || !r.sr) throw new Error(JSON.stringify(r));
  } },
  { label: 'quote: serif pull quote with curly quotes', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-press-item-quote p')!, '::before').content);
    if (r !== '"“"') throw new Error(r);
  } },
  { label: 'compact: one row, outlet - headline - date', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-press-item[data-variant="compact"]')!; return { cols: getComputedStyle(c).gridTemplateColumns.split(' ').length, rule: getComputedStyle(c).borderBottomWidth, top: getComputedStyle(c).borderTopWidth }; });
    if (r.cols !== 3 || r.rule !== '1px' || r.top !== '0px') throw new Error(JSON.stringify(r));
  } },
]);
