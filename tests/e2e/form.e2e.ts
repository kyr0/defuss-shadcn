import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: form is CSS-only layout glue — verify the 24px field stack, the
 * horizontal orientation switch (row + 8rem label column), the inline row,
 * and the reset fieldset with its legend.
 */
await cssSmoke('form', [
  {
    label: '.form stacks fields with 24px gaps',
    selector: '#fm-root',
    css: { display: 'flex', 'flex-direction': 'column', gap: '24px' },
  },
  {
    // the doc page's "Consistent field heights" grid, tested at the family
    // level: the .input ladder (md step = 36px unsized) must be the real box
    // of EVERY field control, whichever UA box-sizing it inherits
    label: 'every field control renders the same 36px md box (.input is the standard)',
    run: async (page) => {
      const heights = await page.evaluate(() =>
        ['#ld-input', '#ld-select', '#ld-number', '#ld-combobox', '#ld-date', '#ld-color', '#ld-file'].map(
          (sel) => Math.round(document.querySelector(sel)!.getBoundingClientRect().height),
        ),
      );
      assert.deepEqual(
        heights,
        Array(7).fill(36),
        `mixed field row must sit on the md ladder step, got ${heights.join('/')}`,
      );
    },
  },
  {
    label: 'data-orientation="horizontal" rows the field and widens the label',
    run: async (page) => {
      const [dir, label] = await page.evaluate(() => [
        getComputedStyle(document.querySelector('#fm-horizontal')!).flexDirection,
        getComputedStyle(document.querySelector('#fm-horizontal .label')!).minWidth,
      ]);
      assert.equal(dir, 'row');
      assert.equal(label, '128px', 'horizontal labels get an 8rem column');
    },
  },
  {
    label: '.form-field-inline is a centered 8px row with flush labels',
    selector: '#fm-inline',
    css: { display: 'flex', 'align-items': 'center', gap: '8px' },
  },
  {
    label: 'inline labels drop the block margin',
    selector: '#fm-inline .label',
    css: { 'margin-bottom': '0px' },
  },
  {
    label: '.form-fieldset resets the UA box and stacks with 16px gaps',
    selector: '#fm-fieldset',
    css: { border: /^0px none/, padding: '0px', 'flex-direction': 'column', gap: '16px' },
  },
]);
