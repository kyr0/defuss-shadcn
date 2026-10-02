import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: news-ticker is a CSS-only website block (News) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('news-ticker', [
  { label: 'the track runs the marquee animation; the copy list is inert + aria-hidden', run: async (page) => {
    const r = await page.evaluate(() => { const t = document.querySelector('.mk-news-ticker:not([data-variant]) .mk-news-ticker-track')!; const lists = t.querySelectorAll('.mk-news-ticker-items'); return { anim: getComputedStyle(t).animationName, dur: getComputedStyle(t).animationDuration, copy: (lists[1] as HTMLElement).inert && lists[1].getAttribute('aria-hidden') === 'true', same: Math.abs(lists[0].getBoundingClientRect().width - lists[1].getBoundingClientRect().width) < 0.5 }; });
    if (r.anim !== 'mk-news-ticker-scroll' || r.dur !== '40s' || !r.copy || !r.same) throw new Error(JSON.stringify(r));
  } },
  { label: 'hover pauses the strip', run: async (page) => {
    await page.hover('.mk-news-ticker:not([data-variant]) .mk-news-ticker-label');
    const s = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-news-ticker:not([data-variant]) .mk-news-ticker-track')!).animationPlayState);
    await page.mouse.move(0, 0);
    if (s !== 'paused') throw new Error(s);
  } },
  { label: 'breaking: red label with a pulsing dot; the duration custom property applies', run: async (page) => {
    const r = await page.evaluate(() => { const b = document.querySelector('.mk-news-ticker[data-variant="breaking"]')!; return { dot: getComputedStyle(b.querySelector('.mk-news-ticker-label')!, '::before').animationName, dur: getComputedStyle(b.querySelector('.mk-news-ticker-track')!).animationDuration }; });
    if (r.dot !== 'mk-news-ticker-pulse' || r.dur !== '25s') throw new Error(JSON.stringify(r));
  } },
  { label: 'static: no animation, the copy hidden, the row scrolls by hand', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-news-ticker[data-variant="static"]')!; return { anim: getComputedStyle(s.querySelector('.mk-news-ticker-track')!).animationName, copy: getComputedStyle(s.querySelector('.mk-news-ticker-items[aria-hidden]')!).display, scroll: getComputedStyle(s.querySelector('.mk-news-ticker-viewport')!).overflowX }; });
    if (r.anim !== 'none' || r.copy !== 'none' || r.scroll !== 'auto') throw new Error(JSON.stringify(r));
  } },
  { label: 'reduced motion: the marquee stops', run: async (page) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const a = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-news-ticker:not([data-variant]) .mk-news-ticker-track')!).animationName);
    await page.emulateMedia({ reducedMotion: null });
    if (a !== 'none') throw new Error(a);
  } },
  { label: 'sizes: sm is a slimmer strip', distinct: [ { selector: '.mk-news-ticker[data-size="sm"] .mk-news-ticker-items a', prop: 'padding-top' }, { selector: '.mk-news-ticker:not([data-size]) .mk-news-ticker-items a', prop: 'padding-top' } ] },

  { label: 'market: a dark label, up green and down red', run: async (page) => {
    const r = await page.evaluate(() => { const m = document.querySelector('.mk-news-ticker[data-variant="market"]')!; const c = (s: string) => getComputedStyle(m.querySelector(s)!).color; return { label: getComputedStyle(m.querySelector('.mk-news-ticker-label')!).backgroundColor !== getComputedStyle(document.querySelector('.mk-news-ticker:not([data-variant]) .mk-news-ticker-label')!).backgroundColor, trends: c('[data-trend="up"]') !== c('[data-trend="down"]'), arrow: getComputedStyle(m.querySelector('[data-trend="up"]')!, '::before').content }; });
    if (!r.label || !r.trends || r.arrow !== '"▲"') throw new Error(JSON.stringify(r));
  } },
  { label: 'inverse: a dark band', distinct: [ { selector: '.mk-news-ticker[data-variant="inverse"]', prop: 'background-color' }, { selector: '.mk-news-ticker:not([data-variant])', prop: 'background-color' } ] },
  { label: 'pill: rounded with a shadow', selector: '.mk-news-ticker[data-variant="pill"]', css: { 'border-top-left-radius': /^9\d\dpx$|px$/, 'box-shadow': /rgb/ } },

]);
