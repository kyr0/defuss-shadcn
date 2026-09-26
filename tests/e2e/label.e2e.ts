import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: label is CSS-only - geometry is literal; the dimming states are the
 * interesting part: [data-disabled] and the pure-CSS :has(+ :disabled)
 * sibling rule must both yield 0.7 opacity without any JS.
 */
await cssSmoke('label', [
  {
    label: '.label is block 14px/500 with 6px bottom margin',
    selector: '#lb-plain',
    css: { display: 'block', 'font-size': '14px', 'font-weight': '500', 'margin-bottom': '6px', 'line-height': '14px' },
  },
  {
    label: '.label-hint is lighter and muted',
    selector: '#lb-plain .label-hint',
    css: { 'font-weight': '400', 'font-size': '13px' },
  },
  {
    label: '[data-disabled] dims to 0.7 / not-allowed',
    selector: '#lb-disabled',
    css: { opacity: '0.7', cursor: 'not-allowed' },
  },
  {
    label: ':has(+ :disabled) dims the label of a disabled input (pure CSS)',
    run: async (page) => {
      const opacity = await page.$eval('#lb-sibling', (el) => getComputedStyle(el).opacity);
      assert.equal(opacity, '0.7');
    },
  },
  {
    // the documented for↔id contract (issue #17): clicking the label focuses
    // the control its `for` points at - proof the pairing is intact
    label: 'clicking the label focuses the control named by its for/id pairing',
    run: async (page) => {
      await page.click('#lb-plain');
      const focused = await page.evaluate(() => document.activeElement?.id);
      assert.equal(focused, 'in-1', 'for="in-1" must transfer focus to #in-1');
    },
  },
  {
    // the required star renders from CSS alone (:has(+ input[required])::after)
    // - content carries the NBSP + asterisk, destructive color
    label: ':has(+ input[required]) renders the decorative star via ::after',
    run: async (page) => {
      const style = await page.$eval('#lb-required', (el) => {
        const s = getComputedStyle(el, '::after');
        return { content: s.content, color: s.color };
      });
      assert.match(style.content, /\*/, `::after content should carry the star, got ${style.content}`);
      assert.notEqual(style.color, 'rgb(0, 0, 0)', 'star uses the destructive token color');
    },
  },
]);
