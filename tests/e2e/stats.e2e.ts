import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: stats is CSS-only - the metric rule (border-left + padding), 30px
 * values, the 2-column media split at wide width, and the flush-left link
 * CTA override (.mk-stat-link { padding-inline: 0 }) are the whole contract.
 */
await cssSmoke('stats', [
  {
    label: 'metric has a 1px left rule with 24px padding',
    selector: '.mk-stat',
    css: { 'border-left-width': '1px', 'padding-left': '24px' },
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
]);
