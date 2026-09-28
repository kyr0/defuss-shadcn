import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';
import { assertLegibleDisabled } from './lib/disabled.ts';

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
    label: 'disabled file input stays legible: full --input border, muted surface + text, not-allowed',
    run: (page) => assertLegibleDisabled(page, { control: '#fi-disabled', tokens: { 'border-top-color': '--input', 'background-color': '--muted', color: '--muted-foreground' } }),
  },
  {
    label: 'a squeezed file input keeps a readable width for the file name (min 24rem)',
    run: async (page) => {
      const w = await page.evaluate(() => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;width:900px';
        row.innerHTML = '<span style="flex:1 0 800px">wide sibling</span><input type="file" class="file-input" style="flex:0 1 auto;width:auto">';
        document.body.append(row);
        const width = row.querySelector('input')!.getBoundingClientRect().width;
        row.remove();
        return width;
      });
      assert.equal(w, 384);
    },
  },

  { label: 'file-input: data-size="xs" geometry', selector: '#z-fileinput-xs', css: { 'height': '28px' } },
  { label: 'file-input: data-size="sm" geometry', selector: '#z-fileinput-sm', css: { 'height': '32px' } },
  { label: 'file-input: data-size="md" geometry', selector: '#z-fileinput-md', css: { 'height': '36px' } },
  { label: 'file-input: data-size="lg" geometry', selector: '#z-fileinput-lg', css: { 'height': '44px' } },
  { label: 'file-input: data-size="xl" geometry', selector: '#z-fileinput-xl', css: { 'height': '52px' } },
]);
