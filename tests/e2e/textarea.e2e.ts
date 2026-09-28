import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';
import { assertLegibleDisabled } from './lib/disabled.ts';

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
    label: ':disabled locks resize',
    selector: '#ta-disabled',
    css: { resize: 'none' },
  },
  {
    label: 'disabled textarea stays legible: full --input border, muted surface + text, not-allowed',
    run: (page) => assertLegibleDisabled(page, { control: '#ta-disabled', tokens: { 'border-top-color': '--input', 'background-color': '--muted', color: '--muted-foreground' } }),
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
  {
    label: 'disabled textarea keeps a (painted) corner grip so it still reads as a text field',
    run: async (page) => {
      const bg = await page.$eval('#ta-disabled', (el) => getComputedStyle(el).backgroundImage);
      assert.match(bg, /linear-gradient.*linear-gradient/);
    },
  },
]);
