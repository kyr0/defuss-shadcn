import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: pagination is CSS-only — the shipped contract is pagination.css itself.
 * This pins the three independent axes the doc page promises (variant, layout,
 * size) plus the aria-disabled rendering rule: literal px for the local size
 * scale, pairwise-distinct token colors where the theme values must not be
 * hardcoded, and the joined border-collapse geometry that is easy to break.
 */
await cssSmoke('pagination', [
  {
    label: 'default size scale applies (36px box, --radius-md, 14px text)',
    selector: '#p-link',
    css: {
      display: 'inline-flex',
      'min-width': '36px',
      height: '36px',
      'padding-inline-start': '8px',
      'border-top-left-radius': '8px',
      'font-size': '14px',
    },
  },
  {
    label: 'prev/next get the wider nav padding and size their icon',
    selector: '#p-prev',
    css: { 'padding-inline-start': '12px', height: '36px' },
  },
  {
    label: 'icons follow the size scale (1rem at default size)',
    selector: '#p-prev-icon',
    css: { width: '16px', height: '16px' },
  },
  {
    label: 'ellipsis matches the item box and is muted',
    selector: '#p-ellipsis',
    css: { 'min-width': '36px', height: '36px', 'font-size': '14px' },
  },

  // -- sizes ---------------------------------------------------------------
  {
    label: 'data-size="sm" shrinks box, font, icon and radius together',
    selector: '#p-sm-link',
    css: { 'min-width': '32px', height: '32px', 'font-size': '13px', 'border-top-left-radius': '6px' },
  },
  {
    label: 'data-size="sm" also scales the ellipsis (one shared scale)',
    selector: '#p-sm-ellipsis',
    css: { 'min-width': '32px', height: '32px' },
  },
  {
    label: 'data-size="lg" grows box, font and radius together',
    selector: '#p-lg-link',
    css: { 'min-width': '44px', height: '44px', 'font-size': '16px', 'border-top-left-radius': '10px' },
  },
  {
    label: 'data-size="lg" scales the icon too',
    selector: '#p-lg-icon',
    css: { width: '18px', height: '18px' },
  },

  // -- variants ------------------------------------------------------------
  {
    label: 'data-variant="outline" borders every item',
    selector: '#p-outline-link',
    css: { 'border-top-width': '1px' },
  },
  {
    label: 'outline item border, active fill and page background are all distinct',
    distinct: [
      { selector: '#p-outline-link', prop: 'border-top-color' },
      { selector: '#p-outline-active', prop: 'background-color' },
      { selector: '#p-outline-link', prop: 'background-color' },
    ],
  },
  {
    label: 'default variant leaves inactive items borderless, active bordered',
    distinct: [
      { selector: '#p-link', prop: 'border-top-color' },
      { selector: '#p-active', prop: 'border-top-color' },
    ],
  },

  // -- joined --------------------------------------------------------------
  {
    label: 'data-variant="joined" collapses the list gap to zero',
    selector: '#p-joined-list',
    css: { 'column-gap': '0px' },
  },
  {
    label: 'joined keeps the outer radius on the first item only',
    selector: '#p-joined-first',
    css: { 'border-top-left-radius': '8px', 'border-top-right-radius': '0px' },
  },
  {
    label: 'joined squares both inner corners of a middle item and overlaps its border',
    selector: '#p-joined-mid',
    css: {
      'border-top-left-radius': '0px',
      'border-top-right-radius': '0px',
      'margin-inline-start': '-1px',
    },
  },
  {
    label: 'joined keeps the outer radius on the last item only',
    selector: '#p-joined-last',
    css: { 'border-top-left-radius': '0px', 'border-top-right-radius': '8px' },
  },
  {
    label: 'joined pulls the ellipsis into the chain (bordered, square, overlapped)',
    selector: '#p-joined-ellipsis',
    css: { 'border-top-width': '1px', 'border-top-left-radius': '0px', 'margin-inline-start': '-1px' },
  },
  {
    label: 'joined items are visually contiguous (no sub-pixel gap between boxes)',
    run: async (page) => {
      const gap = await page.evaluate(() => {
        const items = [...document.querySelectorAll('#p-joined-list > li > *')];
        return items
          .slice(1)
          .map((el, i) => el.getBoundingClientRect().left - items[i].getBoundingClientRect().right)
          .reduce((max, d) => Math.max(max, Math.abs(d)), 0);
      });
      if (gap > 1.5) throw new Error(`joined items are ${gap}px apart, expected them to touch`);
    },
  },
  {
    label: 'joined composes with data-size="sm" (radius follows the size scale)',
    selector: '#p-joined-sm-first',
    css: { 'border-top-left-radius': '6px', height: '32px' },
  },

  // -- split layout --------------------------------------------------------
  {
    label: 'data-layout="split" lays the list out as two equal columns',
    run: async (page) => {
      const [a, b] = await page.evaluate(() =>
        getComputedStyle(document.querySelector('#p-split-list')!)
          .gridTemplateColumns.split(' ')
          .map(Number.parseFloat),
      );
      if (!(a > 0) || Math.abs(a - b) > 1) throw new Error(`expected two equal columns, got ${a} / ${b}`);
    },
  },
  {
    label: 'split prev/next fill their columns and sit at opposite ends',
    run: async (page) => {
      const { prev, next, nav } = await page.evaluate(() => {
        const r = (sel: string) => document.querySelector(sel)!.getBoundingClientRect();
        return { prev: r('#p-split-prev'), next: r('#p-split-next'), nav: r('#p-split') };
      });
      if (prev.left - nav.left > 2) throw new Error('previous is not flush with the start edge');
      if (nav.right - next.right > 2) throw new Error('next is not flush with the end edge');
      if (Math.abs(prev.width - next.width) > 1) throw new Error('columns are not equal width');
    },
  },
  {
    label: 'split + joined still collapses the gap (variant wins over layout)',
    selector: '#p-split-joined-list',
    css: { 'column-gap': '0px' },
  },

  // -- aria-disabled -------------------------------------------------------
  {
    label: 'aria-disabled renders non-interactive and muted with no inline styles',
    selector: '#p-next',
    css: { 'pointer-events': 'none', opacity: '0.5', cursor: 'default' },
  },
  {
    label: 'aria-disabled mutes the text color away from the enabled color',
    distinct: [
      { selector: '#p-next', prop: 'color' },
      { selector: '#p-link', prop: 'color' },
    ],
  },
  {
    label: 'a disabled link does not react to hover',
    run: async (page) => {
      const before = await page.$eval('#p-next', (el) => getComputedStyle(el).backgroundColor);
      await page.hover('#p-next', { force: true });
      const after = await page.$eval('#p-next', (el) => getComputedStyle(el).backgroundColor);
      if (before !== after) throw new Error(`hover changed a disabled link: ${before} -> ${after}`);
    },
  },
  {
    label: 'an enabled link does react to hover',
    run: async (page) => {
      const before = await page.$eval('#p-link', (el) => getComputedStyle(el).backgroundColor);
      await page.hover('#p-link');
      const after = await page.$eval('#p-link', (el) => getComputedStyle(el).backgroundColor);
      if (before === after) throw new Error(`hover had no effect on an enabled link (${before})`);
    },
  },
]);
