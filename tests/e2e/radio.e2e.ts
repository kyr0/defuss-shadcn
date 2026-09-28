import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';
import { assertLegibleDisabled } from './lib/disabled.ts';

/**
 * Why: radio is CSS-only - appearance:none circle + a centered ::after dot.
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
    label: 'disabled radio stays legible: mid-grey ring, muted surface, muted label, no hand pointer',
    run: (page) => assertLegibleDisabled(page, { control: '#r-disabled', label: 'label[for="r-disabled"]', tokens: { 'background-color': '--muted' } }),
  },
  {
    label: 'disabled ring edge stands apart from both its muted fill and the page (a readable shape, not a ghost)',
    distinct: [
      { selector: '#r-disabled', prop: 'border-top-color' },
      { selector: '#r-disabled', prop: 'background-color' },
      { selector: 'body', prop: 'background-color' },
    ],
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
  {
    label: 'clicking the gap between control and label toggles (.radio-item)',
    run: async (page) => {
      // the midpoint of the whitespace between the control and its label text
      const at = await page.evaluate(() => {
        const input = document.querySelector('#rd-gap')!;
        const label = document.querySelector('label[for="rd-gap"]')!;
        const a = input.getBoundingClientRect();
        const b = label.getBoundingClientRect();
        return { x: (a.right + b.left) / 2, y: a.top + a.height / 2, gap: b.left - a.right };
      });
      assert.ok(at.gap > 2, 'fixture has a real gap between control and label');
      await page.mouse.click(at.x, at.y);
      assert.equal(await page.evaluate(() => (document.querySelector('#rd-gap') as HTMLInputElement).checked), true);
    },
  },
  {
    label: 'clicking the gap between control and label toggles (.radio-item-block)',
    run: async (page) => {
      // the midpoint of the whitespace between the control and its label text
      const at = await page.evaluate(() => {
        const input = document.querySelector('#rd-gap-block')!;
        const label = document.querySelector('label[for="rd-gap-block"]')!;
        const a = input.getBoundingClientRect();
        const b = label.getBoundingClientRect();
        return { x: (a.right + b.left) / 2, y: a.top + a.height / 2, gap: b.left - a.right };
      });
      assert.ok(at.gap > 2, 'fixture has a real gap between control and label');
      await page.mouse.click(at.x, at.y);
      assert.equal(await page.evaluate(() => (document.querySelector('#rd-gap-block') as HTMLInputElement).checked), true);
    },
  },
  {
    label: 'disabled radio card stays legible: no fade, muted title, no hand pointer',
    run: (page) => assertLegibleDisabled(page, { control: '#rd-card-disabled', label: '.radio-card:has(#rd-card-disabled) > label' }),
  },
  {
    label: 'the shared name makes the set: picking one clears the other and the form submits one value',
    run: async (page) => {
      await page.click('label[for="rn-m"]');
      const r = await page.evaluate(() => ({
        s: (document.getElementById('rn-s') as HTMLInputElement).checked,
        m: (document.getElementById('rn-m') as HTMLInputElement).checked,
        size: new FormData(document.getElementById('rn-form') as HTMLFormElement).getAll('size'),
      }));
      assert.deepEqual(r, { s: false, m: true, size: ['m'] });
    },
  },
  {
    label: 'different names in ONE fieldset are independent (the fieldset groups nothing)',
    run: async (page) => {
      await page.click('label[for="rn-a"]');
      await page.click('label[for="rn-b"]');
      const both = await page.evaluate(() => ['rn-a', 'rn-b'].map((id) => (document.getElementById(id) as HTMLInputElement).checked));
      assert.deepEqual(both, [true, true]);
    },
  },
  {
    label: 'a shared name is one set even with no fieldset',
    run: async (page) => {
      await page.click('label[for="rn-y"]');
      const r = await page.evaluate(() => ['rn-x', 'rn-y'].map((id) => (document.getElementById(id) as HTMLInputElement).checked));
      assert.deepEqual(r, [false, true]);
    },
  },
]);
