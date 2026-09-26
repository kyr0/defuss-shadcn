import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: separator is CSS-only - verify the 1px horizontal rule stretches
 * full width, the vertical orientation swaps the axis and stretches to the
 * flex row's height, and the labelled variant lays out label + rules.
 */
await cssSmoke('separator', [
  {
    label: 'horizontal <hr> is a borderless 1px bar spanning its container',
    selector: '#sep-horizontal',
    css: { height: '1px', 'border-top-width': '0px', 'flex-shrink': '0' },
  },
  {
    label: 'horizontal rule fills the available width (width >> height)',
    run: async (page) => {
      const box = await page.$eval('#sep-horizontal', (el) => el.getBoundingClientRect());
      assert.ok(box.width > box.height * 100, `expected a full-width 1px rule, got ${box.width}×${box.height}`);
    },
  },
  {
    label: 'vertical separator is 1px wide and stretches to the row height',
    selector: '#sep-vertical',
    css: { width: '1px', height: '48px', 'align-self': 'stretch' },
  },
  {
    label: 'labelled separator: flex row with 12px gaps, uppercase label',
    selector: '#sep-labelled',
    css: { display: 'flex', gap: '12px' },
  },
  {
    label: 'label text is 12px/500 uppercase',
    selector: '#sep-labelled span',
    css: { 'font-size': '12px', 'font-weight': '500', 'text-transform': 'uppercase' },
  },
]);
