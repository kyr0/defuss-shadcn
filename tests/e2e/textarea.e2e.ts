import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: textarea is CSS-only - verify the 80px min box with content-based
 * auto-grow (field-sizing), vertical-only resize, disabled dimming + resize
 * lock, and the aria-invalid border recolor.
 */
await cssSmoke('textarea', [
  {
    label: '.textarea is an 80px-min auto-growing box with 8px/12px padding',
    selector: '#ta-default',
    css: { 'min-height': '80px', padding: '8px 12px', 'font-size': '14px', resize: 'vertical', 'field-sizing': 'content' },
  },
  {
    label: ':disabled dims, locks resize, and shows the not-allowed cursor',
    selector: '#ta-disabled',
    css: { opacity: '0.5', cursor: 'not-allowed', resize: 'none' },
  },
  {
    label: 'aria-invalid recolors the border to destructive',
    distinct: [
      { selector: '#ta-default', prop: 'border-top-color' },
      { selector: '#ta-invalid', prop: 'border-top-color' },
    ],
  },
  {
    label: ':focus swaps the border to the ring color (trusted click-focus)',
    run: async (page) => {
      await page.click('#ta-default');
      await page.waitForTimeout(200); // border-color transitions 150ms
      const [normal, focused] = await page.evaluate(() => {
        const el = document.querySelector<HTMLTextAreaElement>('#ta-default')!;
        const focusedBorder = getComputedStyle(el).borderTopColor;
        el.blur();
        return [getComputedStyle(el).borderTopColor, focusedBorder];
      });
      assert.notEqual(normal, focused, 'focused border uses --ring, distinct from --input');
    },
  },
]);
