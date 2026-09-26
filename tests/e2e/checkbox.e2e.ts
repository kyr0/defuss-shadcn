import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: checkbox is CSS-only - appearance:none + the ::after check/dash are
 * the whole visual contract. Verify geometry, the checked/indeterminate
 * fills (distinct from the empty box), the ::after marks, disabled dimming,
 * and the aria-invalid border recolor.
 */
await cssSmoke('checkbox', [
  {
    label: '.checkbox is a 18px appearance-none box',
    selector: '#cb-plain',
    css: { appearance: 'none', width: '18px', height: '18px', 'border-top-width': '1px', 'background-color': /oklch|rgb/ },
  },
  {
    label: 'checked fills with primary (distinct from the empty box)',
    distinct: [
      { selector: '#cb-plain', prop: 'background-color' },
      { selector: '#cb-checked', prop: 'background-color' },
    ],
  },
  {
    label: 'indeterminate fills like checked (same primary token)',
    run: async (page) => {
      const [checked, indet] = await page.evaluate(() => [
        getComputedStyle(document.querySelector('#cb-checked')!).backgroundColor,
        getComputedStyle(document.querySelector('#cb-indet')!).backgroundColor,
      ]);
      assert.equal(checked, indet);
    },
  },
  {
    label: 'checked draws the checkmark ::after (6x10 rotated border)',
    run: async (page) => {
      const after = await page.evaluate(() => {
        const s = getComputedStyle(document.querySelector('#cb-checked')!, '::after');
        return { content: s.content, width: s.width, height: s.height, borderTopWidth: s.borderTopWidth };
      });
      assert.equal(after.content, '""', 'checkmark is a generated box');
      assert.equal(after.width, '6px');
      assert.equal(after.height, '10px');
      assert.equal(after.borderTopWidth, '0px'); // solid check: border-width 0 2px 2px 0
    },
  },
  {
    label: 'indeterminate draws the dash ::after (10x2 filled bar)',
    run: async (page) => {
      const after = await page.evaluate(() => {
        const s = getComputedStyle(document.querySelector('#cb-indet')!, '::after');
        return { content: s.content, width: s.width, height: s.height };
      });
      assert.equal(after.content, '""');
      assert.equal(after.width, '10px');
      assert.equal(after.height, '2px');
    },
  },
  {
    label: 'disabled dims to 0.5 with not-allowed cursor',
    selector: '#cb-disabled',
    css: { opacity: '0.5', cursor: 'not-allowed' },
  },
  {
    label: 'aria-invalid recolors the border to destructive (distinct)',
    distinct: [
      { selector: '#cb-plain', prop: 'border-top-color' },
      { selector: '#cb-invalid', prop: 'border-top-color' },
    ],
  },
  {
    label: '.checkbox-item-block aligns to the top for wrapping labels',
    selector: '.checkbox-item-block',
    css: { display: 'flex', 'align-items': 'flex-start' },
  },
]);
