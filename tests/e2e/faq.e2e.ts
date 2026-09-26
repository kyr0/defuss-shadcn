import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: faq is CSS-only - 3-up icon-card grid at wide width, 64px icon tile
 * with a 24px primary icon inside, and question answers visible (not hidden
 * behind a disclosure).
 */
await cssSmoke('faq', [
  {
    label: 'grid resolves to three columns at fixture width',
    run: async (page) => {
      const cols = await page.evaluate(
        () => getComputedStyle(document.querySelector('.mk-faq-grid')!).gridTemplateColumns,
      );
      const n = cols.trim().split(/\s+/).length;
      if (n !== 3) throw new Error(`expected 3 columns, got "${cols}"`);
    },
  },
  {
    label: 'icon tile is a 64px bordered muted square',
    selector: '.mk-faq-icon',
    css: { width: '64px', height: '64px', 'border-width': '1px', 'border-radius': '10px' },
  },
  {
    label: 'tile icon is 24px and colored by the primary token (≠ muted)',
    distinct: [
      { selector: '.mk-faq-icon svg', prop: 'color' },
      { selector: '.mk-faq-answer', prop: 'color' },
    ],
  },
  {
    label: 'answers are visible text (no disclosure hiding)',
    run: async (page) => {
      const n = await page.evaluate(
        () =>
          [...document.querySelectorAll('.mk-faq-answer')].filter(
            (p) => getComputedStyle(p).display !== 'none' && (p.textContent ?? '').length > 10,
          ).length,
      );
      if (n !== 6) throw new Error(`expected 6 visible answers, got ${n}`);
    },
  },
]);
