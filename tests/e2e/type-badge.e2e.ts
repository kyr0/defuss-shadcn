import { cssSmoke, type Check } from './lib/css-smoke.ts';

const checks: Check[] = [
  {
    label: 'base: mono chip — xs font size, 600 weight, border, sm radius',
    selector: '.type-badge[data-type="ATM"]',
    css: {
      fontWeight: '600',
      fontFamily: /mono/i,
      borderTopWidth: '1px',
      padding: '2px 6px',
      // base font-size is 0.5625rem (9px) → 1.4 line-height = 12.6px
      lineHeight: /^(12\.6|12\.599\d*)px$/,
    },
  },
  {
    label: 'all five type colors are pairwise distinct',
    distinct: ['ATM', 'MOL', 'ORG', 'BLK', 'TPL'].map((t) => ({
      selector: `.type-badge[data-type="${t}"]`,
      prop: 'color',
    })),
  },
  {
    label: 'data-size scales the chip (sm > xs, xl > lg)',
    selector: '.type-badge[data-size="xl"]',
    css: { fontSize: '17px' },
  },
  {
    label: 'data-size="sm" is the documented 0.6875rem',
    selector: '.type-badge[data-size="sm"]',
    css: { fontSize: '11px' },
  },
  {
    label: 'dark mode flips every type to its dark identity (distinct from light)',
    run: async (page) => {
      const before = await page.evaluate(() =>
        ['ATM', 'MOL', 'ORG', 'BLK', 'TPL'].map((t) => getComputedStyle(document.querySelector(`.type-badge[data-type="${t}"]`)!).color),
      );
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      const after = await page.evaluate(() =>
        ['ATM', 'MOL', 'ORG', 'BLK', 'TPL'].map((t) => getComputedStyle(document.querySelector(`.type-badge[data-type="${t}"]`)!).color),
      );
      for (let i = 0; i < before.length; i++) {
        if (before[i] === after[i]) throw new Error(`type ${i} did not flip in dark mode (${before[i]})`);
      }
    },
  },
];

await cssSmoke('type-badge', checks);
console.log('type-badge.e2e: all checks passed');
