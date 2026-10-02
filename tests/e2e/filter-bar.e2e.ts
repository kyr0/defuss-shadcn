import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: filter-bar is a CSS-only website block (Search & Navigation) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('filter-bar', [
  { label: 'one row that scrolls sideways', run: async (page) => {
    const r = await page.evaluate(() => { const f = getComputedStyle(document.querySelector('.mk-filter-bar form')!); return { d: f.display, o: f.overflowX }; });
    if (r.d !== 'flex' || r.o !== 'auto') throw new Error(JSON.stringify(r));
  } },
  { label: 'chips: checking fills them', run: async (page) => {
    await page.click('.mk-filter-bar-chip:has(input[name="new"])');
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-filter-bar-chip:has(input[name="new"])')!).backgroundColor !== getComputedStyle(document.querySelector('.mk-filter-bar-chip:has(input[name="organic"])')!).backgroundColor);
    if (!r) throw new Error('not filled');
  } },
  { label: 'sticky: position sticky with blur', selector: '.mk-filter-bar[data-variant="sticky"]', css: { position: 'sticky', 'backdrop-filter': /blur/ } },
]);
