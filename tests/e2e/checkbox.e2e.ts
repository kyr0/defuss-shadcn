import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';
import { assertLegibleDisabled } from './lib/disabled.ts';

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
    label: 'disabled checkbox stays legible: mid-grey edge, muted surface, muted label, no hand pointer',
    run: (page) => assertLegibleDisabled(page, { control: '#cb-disabled', label: 'label[for="cb-disabled"]', tokens: { 'background-color': '--muted' } }),
  },
  {
    label: 'disabled box edge stands apart from both its muted fill and the page (a readable shape, not a ghost)',
    distinct: [
      { selector: '#cb-disabled', prop: 'border-top-color' },
      { selector: '#cb-disabled', prop: 'background-color' },
      { selector: 'body', prop: 'background-color' },
    ],
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
  {
    label: 'clicking the gap between control and label toggles (.checkbox-item)',
    run: async (page) => {
      // the midpoint of the whitespace between the control and its label text
      const at = await page.evaluate(() => {
        const input = document.querySelector('#cb-gap')!;
        const label = document.querySelector('label[for="cb-gap"]')!;
        const a = input.getBoundingClientRect();
        const b = label.getBoundingClientRect();
        return { x: (a.right + b.left) / 2, y: a.top + a.height / 2, gap: b.left - a.right };
      });
      assert.ok(at.gap > 2, 'fixture has a real gap between control and label');
      await page.mouse.click(at.x, at.y);
      assert.equal(await page.evaluate(() => (document.querySelector('#cb-gap') as HTMLInputElement).checked), true);
    },
  },
  {
    label: 'clicking the gap between control and label toggles (.checkbox-item-block)',
    run: async (page) => {
      // the midpoint of the whitespace between the control and its label text
      const at = await page.evaluate(() => {
        const input = document.querySelector('#cb-gap-block')!;
        const label = document.querySelector('label[for="cb-gap-block"]')!;
        const a = input.getBoundingClientRect();
        const b = label.getBoundingClientRect();
        return { x: (a.right + b.left) / 2, y: a.top + a.height / 2, gap: b.left - a.right };
      });
      assert.ok(at.gap > 2, 'fixture has a real gap between control and label');
      await page.mouse.click(at.x, at.y);
      assert.equal(await page.evaluate(() => (document.querySelector('#cb-gap-block') as HTMLInputElement).checked), true);
    },
  },
  {
    label: 'select all: the parent box follows its group - some = mixed (dash), all = checked, none = empty',
    run: async (page) => {
      const state = () => page.evaluate(() => {
        const p = document.getElementById('sa-all') as HTMLInputElement;
        const kids = ['sa-1', 'sa-2', 'sa-3'].map((id) => (document.getElementById(id) as HTMLInputElement).checked);
        return { parent: p.indeterminate ? 'mixed' : p.checked ? 'checked' : 'empty', kids, dash: getComputedStyle(p, '::after').height };
      });
      let s = await state();
      assert.deepEqual([s.parent, s.dash], ['mixed', '2px'], 'authored: one of three ticked -> mixed on load, drawn as the dash');
      await page.click('label[for="sa-2"]');
      await page.click('label[for="sa-3"]');
      assert.equal((await state()).parent, 'checked', 'all ticked -> checked');
      await page.click('label[for="sa-1"]');
      assert.equal((await state()).parent, 'mixed', 'untick one -> back to mixed');
      await page.click('label[for="sa-2"]');
      await page.click('label[for="sa-3"]');
      assert.equal((await state()).parent, 'empty', 'none ticked -> empty');
    },
  },
  {
    label: 'select all: clicking the parent ticks every child (from mixed or empty), clicking it full clears them',
    run: async (page) => {
      const kids = () => page.evaluate(() => ['sa-1', 'sa-2', 'sa-3'].map((id) => (document.getElementById(id) as HTMLInputElement).checked));
      const parent = () => page.evaluate(() => { const p = document.getElementById('sa-all') as HTMLInputElement; return p.indeterminate ? 'mixed' : p.checked ? 'checked' : 'empty'; });
      await page.click('label[for="sa-2"]');
      assert.equal(await parent(), 'mixed');
      await page.click('#sa-all');
      assert.deepEqual([await parent(), await kids()], ['checked', [true, true, true]], 'mixed -> all ticked');
      await page.click('#sa-all');
      assert.deepEqual([await parent(), await kids()], ['empty', [false, false, false]], 'full -> all cleared');
      await page.click('#sa-all');
      assert.deepEqual([await parent(), await kids()], ['checked', [true, true, true]], 'empty -> all ticked');
      assert.equal(await page.$eval('#sa-all', (p) => p.getAttribute('aria-controls')), 'sa-1 sa-2 sa-3');
    },
  },
]);
