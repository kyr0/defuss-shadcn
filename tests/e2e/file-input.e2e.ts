import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: file-input is CSS-only - verify the 36px (md-step) control frame and that the
 * ::file-selector-button pseudo-element gets the muted fill + divider the
 * sheet defines, plus disabled dimming.
 */
await cssSmoke('file-input', [
  {
    label: '.file-input is a 36px bordered control (md default)',
    selector: '#fi-default',
    css: { height: '36px', 'border-top-width': '1px', 'font-size': '14px', padding: '0px', cursor: 'pointer' },
  },
  {
    label: '::file-selector-button is full-height, muted, right-divided',
    run: async (page) => {
      const btn = await page.evaluate(() => {
        const s = getComputedStyle(document.querySelector('#fi-default')!, '::file-selector-button');
        return { height: s.height, 'border-right-width': s.borderRightWidth, cursor: s.cursor };
      });
      // computed style resolves the author's `height: calc(100% + 2px)` to the
      // 36px border-box (flush with the frame, no 1px gaps above/below)
      assert.equal(btn.height, '36px', 'button fills the control height');
      assert.equal(btn['border-right-width'], '1px', 'divider between button and file name');
      assert.equal(btn.cursor, 'pointer');
    },
  },
  {
    label: 'disabled dims to 0.5 with not-allowed',
    selector: '#fi-disabled',
    css: { opacity: '0.5', cursor: 'not-allowed' },
  },

  { label: 'file-input: data-size="xs" geometry', selector: '#z-fileinput-xs', css: { 'height': '28px' } },
  { label: 'file-input: data-size="sm" geometry', selector: '#z-fileinput-sm', css: { 'height': '32px' } },
  { label: 'file-input: data-size="md" geometry', selector: '#z-fileinput-md', css: { 'height': '36px' } },
  { label: 'file-input: data-size="lg" geometry', selector: '#z-fileinput-lg', css: { 'height': '44px' } },
  { label: 'file-input: data-size="xl" geometry', selector: '#z-fileinput-xl', css: { 'height': '52px' } },
]);
