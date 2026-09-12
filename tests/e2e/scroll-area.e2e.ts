import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: scroll-area is CSS-only — native scrolling + overscroll isolation +
 * thin styled scrollbars. Verify overflow/position/overscroll/gutter and the
 * standard scrollbar-color property (the webkit pseudo rules can't be read
 * via getComputedStyle, so assert the standards-side equivalent + the sheet).
 */
await cssSmoke('scroll-area', [
  {
    label: 'pane scrolls on both axes with stable gutter',
    selector: '#sa-demo',
    css: { overflow: 'auto', position: 'relative', 'overscroll-behavior': 'contain', 'scrollbar-gutter': 'stable' },
  },
  {
    label: 'scrollbars are thin + themed via standard scrollbar properties',
    run: async (page) => {
      const [width, css] = await page.evaluate(async () => [
        getComputedStyle(document.querySelector('#sa-demo')!).scrollbarWidth,
        await (await fetch('/dist/components/scroll-area/scroll-area.css')).text(),
      ]);
      assert.equal(width, 'thin');
      assert.match(css, /scrollbar-color:/, 'scrollbar-color themed');
      // thumb size flows through the density custom property (6px default)
      assert.match(css, /--scrollbar-size:\s*6px/, 'webkit thumb sized via 6px default');
      assert.match(css, /::-webkit-scrollbar\s*{\s*width:\s*var\(--scrollbar-size\)/, 'webkit thumb reads the token');
    },
  },
  {
    label: 'density compact/comfortable/spacious → 4/6/8px scrollbar token',
    run: async (page) => {
      const sizes = await page.evaluate(() =>
        ['sa-compact', 'sa-comfortable', 'sa-spacious'].map((id) =>
          getComputedStyle(document.getElementById(id)!).getPropertyValue('--scrollbar-size').trim(),
        ),
      );
      assert.deepEqual(sizes, ['4px', '6px', '8px'], `density scrollbar sizes, got ${sizes.join('/')}`);
    },
  },
]);
void assert;
