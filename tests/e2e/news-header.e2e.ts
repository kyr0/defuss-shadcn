import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: news-header is a CSS-only website block (News) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('news-header', [
  { label: 'title scales to 48px at fixture width; masthead to a 72px serif', run: async (page) => {
    const r = await page.evaluate(() => [...document.querySelectorAll('.mk-news-header-title')].slice(0, 2).map((e) => getComputedStyle(e).fontSize));
    if (r.join() !== '48px,72px') throw new Error(`got ${r}`);
  } },
  { label: 'the current topic is underlined in the primary color; others are muted', distinct: [ { selector: '.mk-news-header-topics a[aria-current]', prop: 'border-bottom-color' }, { selector: '.mk-news-header-topics a:not([aria-current])', prop: 'border-bottom-color' } ] },
  { label: 'the topic row scrolls horizontally (one row, never wraps)', selector: '.mk-news-header-topics', css: { 'overflow-x': 'auto', 'flex-wrap': 'nowrap' } },
  { label: 'masthead: centered, double-ruled topics', selector: '.mk-news-header[data-variant="masthead"] .mk-news-header-topics', css: { 'border-top-style': 'double', 'border-bottom-style': 'double' } },

  { label: 'many topics: the row scrolls with a hint at its end; data-wrap breaks it onto lines instead', run: async (page) => {
    const r = await page.evaluate(() => { const [s, w] = document.querySelectorAll('.mk-news-header[data-topics-demo] .mk-news-header-topics'); return { scroll: s.scrollWidth > s.clientWidth, hint: getComputedStyle(s, '::after').position, wrap: getComputedStyle(w).flexWrap, lines: w.getBoundingClientRect().height > 60, noHint: getComputedStyle(w, '::after').content }; });
    if (!r.scroll || r.hint !== 'sticky' || r.wrap !== 'wrap' || !r.lines || r.noHint !== 'none') throw new Error(JSON.stringify(r));
  } },
  { label: 'bar: one row, a compact 24px title, tools at the end', run: async (page) => {
    const r = await page.evaluate(() => { const b = document.querySelector('.mk-news-header[data-variant="bar"]')!; const t = b.querySelector('.mk-news-header-title')!.getBoundingClientRect(); const tools = b.querySelector('.mk-news-header-tools')!.getBoundingClientRect(); return { dir: getComputedStyle(b).flexDirection, size: getComputedStyle(b.querySelector('.mk-news-header-title')!).fontSize, sameRow: Math.abs((t.top + t.bottom) / 2 - (tools.top + tools.bottom) / 2) < 12 }; });
    if (r.dir !== 'row' || r.size !== '24px' || !r.sameRow) throw new Error(JSON.stringify(r));
  } },
  { label: 'the live line carries the Live label in red', distinct: [ { selector: '.mk-news-header-live strong', prop: 'color' }, { selector: '.mk-news-header-live', prop: 'color' } ] },

]);
