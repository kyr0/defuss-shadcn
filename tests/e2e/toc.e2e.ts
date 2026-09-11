import { cssSmoke, type Check } from './lib/css-smoke.ts';

const checks: Check[] = [
  {
    label: 'toc-title: small caps group label',
    selector: '.toc-title',
    css: {
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
    },
  },
  {
    label: 'toc-link: block, muted, transparent left border',
    selector: 'a.toc-link[href="#a"]',
    css: {
      display: 'block',
      borderLeftWidth: '2px',
      borderLeftColor: 'rgba(0, 0, 0, 0)',
      textDecoration: 'none',
    },
  },
  {
    label: 'aria-current="location" marks the active section with a primary border',
    selector: 'a.toc-link[aria-current="location"]',
    css: {
      borderLeftWidth: '2px',
    },
    run: async (page) => {
      const [active, plain] = await page.evaluate(() => {
        const a = getComputedStyle(document.querySelector('a.toc-link[aria-current="location"]')!);
        const b = getComputedStyle(document.querySelector('a.toc-link[href="#a"]')!);
        return [a.borderLeftColor, b.borderLeftColor];
      });
      if (active === plain || active === 'rgba(0, 0, 0, 0)') {
        throw new Error(`current link border not distinct (${active} vs ${plain})`);
      }
    },
  },
  {
    label: 'hover raises the link to foreground (escape hatch)',
    run: async (page) => {
      const link = page.locator('a.toc-link[href="#b"]');
      const before = await link.evaluate((el) => getComputedStyle(el).color);
      await link.hover();
      const after = await link.evaluate((el) => getComputedStyle(el).color);
      if (before === after) throw new Error(`hover color did not change (${before})`);
    },
  },
];

await cssSmoke('toc', checks);
console.log('toc.e2e: all checks passed');
