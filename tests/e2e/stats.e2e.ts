import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: stats is CSS-only - the metric rule (border-left + padding), 30px
 * values, the 2-column media split at wide width, and the flush-left link
 * CTA override (.mk-stat-link { padding-inline: 0 }) are the whole contract.
 */
await cssSmoke('stats', [
  {
    label: 'metric has a 3px accent rule with 20px padding',
    selector: '.mk-stat',
    css: { 'border-left-width': '3px', 'padding-left': '20px' },
  },
  {
    label: 'each metric takes its own accent from the chart palette; the trend chip is green',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const s = [...document.querySelectorAll('.mk-stat')].slice(0, 4).map((e) => getComputedStyle(e).borderLeftColor);
        return { tones: new Set(s).size, trend: getComputedStyle(document.querySelector('.mk-stat-trend[data-trend="up"]')!).color };
      });
      if (r.tones !== 4 || r.trend !== 'rgb(22, 163, 74)') throw new Error(JSON.stringify(r));
    },
  },
  {
    label: 'value is 30px/500 vs 16px muted label (distinct sizes)',
    distinct: [
      { selector: '.mk-stat-value', prop: 'font-size' },
      { selector: '.mk-stat-label', prop: 'font-size' },
    ],
  },
  {
    label: 'value font uses tabular-nums for aligned digits',
    selector: '.mk-stat-value',
    css: { 'font-variant-numeric': 'tabular-nums' },
  },
  {
    label: 'section splits copy | media at wide width',
    run: async (page) => {
      const cols = await page.evaluate(
        () => getComputedStyle(document.querySelector('.mk-stats-layout')!).gridTemplateColumns,
      );
      const n = cols.trim().split(/\s+/).length;
      if (n !== 2) throw new Error(`expected 2 section columns, got "${cols}"`);
    },
  },
  {
    label: 'link CTA sits flush with the rule (padding-inline 0)',
    selector: '.mk-stats .mk-stat-link',
    css: { 'padding-left': '0px', 'padding-right': '0px' },
  },
  {
    label: 'media is a square cover-cropped figure',
    selector: '.mk-stats-media',
    css: { 'aspect-ratio': '1 / 1' },
  },
  { label: 'cards: metrics on bordered cards with a sparkline in the accent color', run: async (page) => {
    const r = await page.evaluate(() => { const g = document.querySelector('.mk-stats-grid[data-variant="cards"]')!; const s = g.querySelector('.mk-stat')!; return { border: getComputedStyle(s).borderTopWidth, pad: getComputedStyle(s).paddingTop, spark: getComputedStyle(s.querySelector('.mk-stat-spark')!).color === getComputedStyle(s).borderLeftColor }; });
    if (r.border !== '1px' || r.pad !== '20px' || !r.spark) throw new Error(JSON.stringify(r));
  } },
  { label: 'band: a dark band of centered numbers', run: async (page) => {
    const r = await page.evaluate(() => { const b = document.querySelector('.mk-stats-band')!; return { dark: getComputedStyle(b).backgroundColor !== getComputedStyle(document.body).backgroundColor, align: getComputedStyle(b.querySelector('.mk-stat')!).textAlign }; });
    if (!r.dark || r.align !== 'center') throw new Error(JSON.stringify(r));
  } },
  { label: 'rings: radial progress per percentage', run: async (page) => {
    const n = await page.evaluate(() => document.querySelectorAll('.mk-stats-rings .radial-progress').length);
    if (n !== 3) throw new Error(String(n));
  } },
]);
