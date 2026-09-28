import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';
import { assertLegibleDisabled } from './lib/disabled.ts';

/**
 * Why: date-picker is CSS-only (a styled native <input type="date">) —
 * verify the 36px (md-step) control box and disabled dimming. The calendar indicator
 * is UA shadow-DOM and intentionally not asserted.
 */
await cssSmoke('date-picker', [
  {
    label: '.date-input is a 36px control (md default) with 12px inline padding',
    selector: '#dp-default',
    css: { height: '36px', padding: '0px 12px', 'font-size': '14px', 'border-top-width': '1px', cursor: 'pointer' },
  },
  {
    label: 'disabled date-picker stays legible: full --input border, muted surface + text, not-allowed',
    run: (page) => assertLegibleDisabled(page, { control: '#dp-disabled', tokens: { 'border-top-color': '--input', 'background-color': '--muted', color: '--muted-foreground' } }),
  },

  { label: 'date-picker: data-size="xs" geometry', selector: '#z-datepicker-xs', css: { 'height': '28px' } },
  { label: 'date-picker: data-size="sm" geometry', selector: '#z-datepicker-sm', css: { 'height': '32px' } },
  { label: 'date-picker: data-size="md" geometry', selector: '#z-datepicker-md', css: { 'height': '36px' } },
  { label: 'date-picker: data-size="lg" geometry', selector: '#z-datepicker-lg', css: { 'height': '44px' } },
  { label: 'date-picker: data-size="xl" geometry', selector: '#z-datepicker-xl', css: { 'height': '52px' } },
  {
    label: 'a TYPED date outside min/max is flagged after leaving the field (border + hint with warning sign)',
    run: async (page) => {
      const look = () => page.evaluate(() => {
        const input = document.getElementById('dp-range')!;
        const hint = document.getElementById('dp-range-hint')!;
        return {
          border: getComputedStyle(input).borderTopColor,
          hint: getComputedStyle(hint).color,
          sign: getComputedStyle(hint, '::before').content,
          overflow: (input as HTMLInputElement).validity.rangeOverflow,
        };
      });
      const untouched = await look();
      assert.equal(untouched.sign, 'none', 'an untouched field is not flagged');
      // type it (keyboard, the way people who know their date enter it)
      await page.click('#dp-range');
      await page.keyboard.type('05152030');
      await page.keyboard.press('Tab');
      await page.waitForTimeout(250); // border-color transitions 150ms
      const bad = await look();
      assert.equal(bad.overflow, true, 'the browser rejects the typed date');
      assert.notEqual(bad.border, untouched.border, 'the border marks it');
      assert.notEqual(bad.hint, untouched.hint, 'the hint turns into the error');
      assert.match(bad.sign, /⚠/, 'a warning sign - not colour alone');
      // a typed date inside the range reads as normal again
      await page.click('#dp-range');
      await page.keyboard.press('Control+a').catch(() => {});
      await page.$eval('#dp-range', (el) => { (el as HTMLInputElement).value = ''; });
      await page.click('#dp-range');
      await page.keyboard.type('03102026');
      await page.keyboard.press('Tab');
      await page.waitForTimeout(250);
      const good = await look();
      assert.equal(good.overflow, false);
      assert.equal(good.border, untouched.border);
      assert.equal(good.sign, 'none');
    },
  },
  {
    label: 'aria-invalid="true" gives the same flagged look without interaction (app-side errors)',
    run: async (page) => {
      const r = await page.evaluate(() => [
        getComputedStyle(document.getElementById('dp-flagged')!).borderTopColor,
        getComputedStyle(document.getElementById('dp-range')!).borderTopColor,
        getComputedStyle(document.getElementById('dp-flagged-hint')!, '::before').content,
      ]);
      assert.notEqual(r[0], r[1]);
      assert.match(r[2], /⚠/);
    },
  },
]);
