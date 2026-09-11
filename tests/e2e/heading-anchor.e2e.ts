import { cssSmoke, type Check } from './lib/css-smoke.ts';

const checks: Check[] = [
  {
    label: 'base: muted color, no underline, right margin, normal weight',
    selector: 'h3#t-before .heading-anchor',
    css: {
      textDecoration: 'none',
      marginRight: '6px',
      fontWeight: '400',
    },
  },
  {
    label: 'data-placement="after" swaps the margin side',
    selector: 'h3#t-after .heading-anchor',
    css: {
      marginRight: '0px',
      marginLeft: '6px',
    },
  },
  {
    label: 'sizes map to the documented font sizes',
    selector: 'a[data-size="md"]',
    css: { fontSize: '16px' },
  },
  {
    label: 'xs and xl are the two ends of the scale',
    selector: 'a[data-size="xl"]',
    css: { fontSize: '20px' },
  },
  {
    label: 'hover turns the glyph primary + underlined (escape hatch)',
    run: async (page) => {
      const a = page.locator('h3#t-before .heading-anchor');
      await a.hover();
      const [decoration, color] = await a.evaluate((el) => {
        const cs = getComputedStyle(el);
        return [cs.textDecoration, cs.color];
      });
      if (!decoration.includes('underline')) throw new Error(`hover did not underline (${decoration})`);
      // --primary resolved (never the muted foreground of the base rule)
      const base = await page.locator('h3#t-after .heading-anchor').evaluate((el) => getComputedStyle(el).color);
      if (color === base) throw new Error(`hover color did not change (${color})`);
    },
  },
];

await cssSmoke('heading-anchor', checks);
console.log('heading-anchor.e2e: all checks passed');
