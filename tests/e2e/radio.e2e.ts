import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: radio is CSS-only — appearance:none circle + a centered ::after dot.
 * Verify the 16px round control, the checked dot + border recolor, group
 * orientation, the disabled dimming that also reaches the sibling label, and
 * the two-column block layout.
 */
await cssSmoke('radio', [
  {
    label: '.radio is a 16px appearance-none circle',
    selector: '#r-default',
    css: { appearance: 'none', width: '16px', height: '16px', 'border-radius': '50%', 'border-top-width': '1px' },
  },
  {
    label: 'checked draws the 8px centered dot and recolors the border',
    run: async (page) => {
      const [unchecked, checked] = await page.evaluate(() => [
        {
          dotWidth: getComputedStyle(document.querySelector('#r-default')!, '::after').width,
          border: getComputedStyle(document.querySelector('#r-default')!).borderTopColor,
        },
        {
          dotWidth: getComputedStyle(document.querySelector('#r-checked')!, '::after').width,
          border: getComputedStyle(document.querySelector('#r-checked')!).borderTopColor,
        },
      ]);
      assert.equal(checked.dotWidth, '8px', 'dot is 0.5rem wide');
      assert.ok(unchecked.dotWidth === 'auto' || unchecked.dotWidth === '0px', `unchecked has no dot, got ${unchecked.dotWidth}`);
      assert.notEqual(unchecked.border, checked.border, 'checked border uses --primary');
    },
  },
  {
    label: ':disabled dims the control AND its sibling label',
    run: async (page) => {
      const pair = await page.evaluate(() => [
        getComputedStyle(document.querySelector('#r-disabled')!).opacity,
        getComputedStyle(document.querySelector('label[for="r-disabled"]')!).opacity,
      ]);
      assert.deepEqual(pair, ['0.5', '0.5'], '.radio:disabled + label is dimmed too');
    },
  },
  {
    label: 'aria-invalid recolors the border (distinct from unchecked)',
    distinct: [
      { selector: '#r-default', prop: 'border-top-color' },
      { selector: '#r-invalid', prop: 'border-top-color' },
    ],
  },
  {
    label: 'groups stack by default, data-orientation="horizontal" rows them',
    run: async (page) => {
      const dirs = await page.evaluate(() => ({
        vertical: getComputedStyle(document.querySelector('#rg-vertical')!).flexDirection,
        horizontal: getComputedStyle(document.querySelector('#rg-horizontal')!).flexDirection,
      }));
      assert.equal(dirs.vertical, 'column');
      assert.equal(dirs.horizontal, 'row');
    },
  },
  {
    label: '.radio-item-block is a 2-col grid (radio track + 1fr) with the radio spanning both rows',
    run: async (page) => {
      const g = await page.evaluate(() => {
        const block = getComputedStyle(document.querySelector('.radio-item-block')!);
        const radio = getComputedStyle(document.querySelector('#r-block')!);
        return { display: block.display, cols: block.gridTemplateColumns, row: `${radio.gridRowStart}/${radio.gridRowEnd}` };
      });
      assert.equal(g.display, 'grid');
      assert.match(g.cols, /^16px \d+(\.\d+)?px$/, `auto track resolves to the 16px radio, got ${g.cols}`);
      assert.equal(g.row, '1/3', 'radio spans both label rows');
    },
  },
  {
    label: 'density compact/comfortable/spacious → option gap 4/8/12px',
    css: { gap: '4px' },
    selector: '#rg-compact',
  },
  { label: 'density comfortable keeps the 8px default gap', selector: '#rg-comfortable', css: { gap: '8px' } },
  { label: 'density spacious → option gap 12px', selector: '#rg-spacious', css: { gap: '12px' } },
]);
