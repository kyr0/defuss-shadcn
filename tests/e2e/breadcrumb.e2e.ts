import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: breadcrumb is CSS-only - verify the list resets to a flex row with
 * exact gaps/size, the ellipsis reserves a square hit area, and the current
 * page renders as foreground text (not a muted link).
 */
await cssSmoke('breadcrumb', [
  {
    label: '.breadcrumb-list is a flex row with 6px gaps, no list marker',
    selector: '.breadcrumb-list',
    css: { display: 'flex', gap: '6px', 'list-style-type': 'none', 'font-size': '14px', padding: '0px' },
  },
  {
    label: '.breadcrumb-separator is smaller (12px) muted text',
    selector: '.breadcrumb-separator',
    css: { 'font-size': '12px', display: 'flex', 'align-items': 'center' },
  },
  {
    label: 'icon separators sit on the labels\' optical center (baseline bug regression)',
    run: async (page) => {
      const centers = await page.evaluate(() => {
        const row = document.querySelector('#icon-crumbs')!;
        const svg = row.querySelector('.breadcrumb-separator svg')!;
        const link = row.querySelector('.breadcrumb-link')!;
        const center = (el: Element) => {
          const r = el.getBoundingClientRect();
          return r.top + r.height / 2;
        };
        return { sep: center(svg), label: center(link) };
      });
      const off = Math.abs(centers.sep - centers.label);
      if (off > 1.5)
        throw new Error(
          `icon separator center is ${off.toFixed(1)}px off the label center (want <=1.5)`,
        );
    },
  },
  {
    label: '.breadcrumb-ellipsis is a 24px centered square',
    selector: '.breadcrumb-ellipsis',
    css: { display: 'flex', width: '24px', height: '24px', 'justify-content': 'center' },
  },
  {
    label: 'current page is foreground, links are muted (distinct colors)',
    distinct: [
      { selector: '.breadcrumb-link', prop: 'color' },
      { selector: '.breadcrumb-page', prop: 'color' },
    ],
  },
  {
    // size ladder mirrors the shared field sizes: 12/13/14/16/18px on the list
    label: 'data-size scales the trail type 12/13/14/16/18px',
    run: async (page) => {
      const sizes = await page.evaluate(() =>
        ['bc-xs', 'bc-sm', 'bc-md', 'bc-lg', 'bc-xl'].map((id) =>
          getComputedStyle(document.querySelector(`#${id} .breadcrumb-list`)!).fontSize,
        ),
      );
      assert.deepEqual(sizes, ['12px', '13px', '14px', '16px', '18px'], `sizes, got ${sizes.join('/')}`);
    },
  },
]);
