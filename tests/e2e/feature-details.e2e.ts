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
  { label: 'bento: a dense grid; wide tiles span two columns, the accent tile is primary', run: async (page) => {
    const r = await page.evaluate(() => { const g = document.querySelector('.mk-features-bento')!; return { flow: getComputedStyle(g).gridAutoFlow, wide: getComputedStyle(g.querySelector('[data-span="wide"]')!).gridColumnStart, accent: getComputedStyle(g.querySelector('[data-tone="primary"]')!).backgroundColor !== getComputedStyle(g.querySelector('.mk-bento-tile:not([data-tone])')!).backgroundColor }; });
    if (!r.flow.includes('dense') || r.wide !== 'span 2' || !r.accent) throw new Error(JSON.stringify(r));
  } },
  { label: 'alternating: the second row puts the media after the copy', run: async (page) => {
    const r = await page.evaluate(() => { const [a, b] = document.querySelectorAll('.mk-feature-row'); const left = (row: Element, s: string) => row.querySelector(s)!.getBoundingClientRect().left; return { first: left(a, '.mk-feature-media') < left(a, '.mk-feature-copy'), second: left(b, '.mk-feature-media') > left(b, '.mk-feature-copy'), checks: document.querySelectorAll('.mk-feature-checks li').length }; });
    if (!r.first || !r.second || r.checks !== 6) throw new Error(JSON.stringify(r));
  } },
  { label: 'tabs: the trigger list stands vertical beside the panel', selector: '.mk-features-tabs .tab-list', css: { 'flex-direction': 'column' } },
  { label: 'boxed: cards on a surface with a border', selector: '.mk-feature-cards[data-variant="boxed"] .mk-feature-card', css: { 'border-top-width': '1px', 'padding-top': '24px' } },
]);
