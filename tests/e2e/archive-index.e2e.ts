import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: archive-index is a CSS-only website block (Blog) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('archive-index', [
  { label: 'years are exclusive native disclosures: opening 2025 closes 2026', run: async (page) => {
    const nav = '.mk-archive-index:not([data-variant])';
    await page.click(`${nav} .mk-archive-index-year:nth-of-type(2) > summary`);
    const r = await page.evaluate((n) => [...document.querySelectorAll(`${n} .mk-archive-index-year`)].map((d) => (d as HTMLDetailsElement).open), nav);
    if (r.join() !== 'false,true,false') throw new Error(`open: ${r}`);
  } },
  { label: 'the current month is marked and the counts are pills', run: async (page) => {
    const r = await page.evaluate(() => ({ cur: document.querySelectorAll('.mk-archive-index-year a[aria-current]').length, radius: getComputedStyle(document.querySelector('.mk-archive-index-count')!).borderTopLeftRadius }));
    if (r.cur !== 1 || r.radius !== '999px') throw new Error(JSON.stringify(r));
  } },
  { label: 'columns: a grid of open years', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-archive-index[data-variant="columns"]')!; const ys = [...c.querySelectorAll('.mk-archive-index-year')].map((y) => y.getBoundingClientRect().top); return { display: getComputedStyle(c).display, row: ys.every((t) => Math.abs(t - ys[0]) < 2), open: [...c.querySelectorAll('details')].every((d) => d.open) }; });
    if (r.display !== 'grid' || !r.row || !r.open) throw new Error(JSON.stringify(r));
  } },

  { label: 'calendar: a 6-column month grid, shaded by data-level', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-archive-index[data-variant="calendar"]')!; const ul = c.querySelector('ul')!; const bg = (l: string) => getComputedStyle(c.querySelector(`a[data-level="${l}"]`)!).backgroundColor; return { cols: getComputedStyle(ul).gridTemplateColumns.split(' ').length, shades: new Set(['0', '1', '2', '3', '4'].map(bg)).size, legend: c.querySelectorAll('.mk-archive-index-legend i').length }; });
    if (r.cols !== 6 || r.shades !== 5 || r.legend !== 5) throw new Error(JSON.stringify(r));
  } },
  { label: 'tags: weight scales the size; the heaviest is primary', run: async (page) => {
    const r = await page.evaluate(() => { const fs = (w: string) => parseFloat(getComputedStyle(document.querySelector(`.mk-archive-index-tags a[data-weight="${w}"]`)!).fontSize); return [fs('1'), fs('5')]; });
    if (!(r[1] > r[0] + 10)) throw new Error(`sizes ${r}`);
  } },
  { label: 'timeline: Timeline entries with month chips (pill links) and a pick', run: async (page) => {
    const r = await page.evaluate(() => { const tl = document.querySelector('.mk-archive-index .timeline')!; const a = tl.querySelector('.mk-archive-index-months a:not([aria-current])')!; const cur = tl.querySelector('.mk-archive-index-months a[aria-current]')!; return { items: tl.querySelectorAll('.timeline-item').length, chips: tl.querySelectorAll('.mk-archive-index-months a').length, radius: getComputedStyle(a).borderTopLeftRadius, deco: getComputedStyle(a).textDecorationLine, cur: getComputedStyle(cur).backgroundColor !== getComputedStyle(a).backgroundColor, picks: tl.querySelectorAll('.mk-archive-index-pick').length }; });
    if (r.items !== 3 || r.chips !== 11 || r.radius !== '999px' || r.deco !== 'none' || !r.cur || r.picks !== 3) throw new Error(JSON.stringify(r));
  } },

]);
