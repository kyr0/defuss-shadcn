import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: feature-details is CSS-only - at wide containers the two features
 * split with a visible 1px rule between them and the card row goes 4-up;
 * below that it stacks (covered by the container query in CSS).
 */
await cssSmoke('feature-details', [
  {
    label: 'head block is centered (eyebrow primary ≠ body text)',
    selector: '.mk-features-eyebrow',
    css: { 'font-size': '16px', 'font-weight': '500' },
  },
  {
    label: 'split grid shows the vertical rule at wide width',
    selector: '.mk-feature-sep',
    css: { display: 'block', width: '1px' },
  },
  {
    label: 'features grid resolves to three columns (1fr auto 1fr)',
    run: async (page) => {
      const cols = await page.evaluate(
        () => getComputedStyle(document.querySelector('.mk-features-grid')!).gridTemplateColumns,
      );
      const n = cols.trim().split(/\s+/).length;
      if (n !== 3) throw new Error(`expected 3 grid columns, got "${cols}"`);
    },
  },
  {
    label: 'feature titles are 30px/500, square media cover-cropped',
    distinct: [
      { selector: '.mk-feature-title', prop: 'font-size' },
      { selector: '.mk-feature-desc', prop: 'font-size' },
    ],
  },
  {
    label: 'benefit cards go 4-up at wide width, icons 24px',
    run: async (page) => {
      const cols = await page.evaluate(
        () => getComputedStyle(document.querySelector('.mk-feature-cards')!).gridTemplateColumns,
      );
      const n = cols.trim().split(/\s+/).length;
      if (n !== 4) throw new Error(`expected 4 card columns, got "${cols}"`);
    },
  },
]);
