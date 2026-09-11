import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: input is CSS-only — verify the 40px control box geometry plus the
 * four native pseudo-states the sheet styles: disabled (0.5), readonly
 * (muted bg), aria-invalid (destructive border), focus (ring border).
 */
await cssSmoke('input', [
  {
    label: '.input is a 40px control with 12px inline padding, 14px text',
    selector: '#in-default',
    css: { height: '40px', padding: '0px 12px', 'font-size': '14px', 'border-top-width': '1px' },
  },
  {
    label: 'data-size="sm" shrinks to 32px/10px/13px',
    selector: '#in-sm',
    css: { height: '32px', padding: '0px 10px', 'font-size': '13px' },
  },
  {
    label: 'data-size="xs" shrinks to 28px/8px/12px',
    selector: '#in-xs',
    css: { height: '28px', padding: '0px 8px', 'font-size': '12px' },
  },
  {
    label: 'data-size="md" is the explicit 36px step',
    selector: '#in-md',
    css: { height: '36px', padding: '0px 12px', 'font-size': '14px' },
  },
  {
    label: 'data-size="lg" grows to 44px/16px/16px',
    selector: '#in-lg',
    css: { height: '44px', padding: '0px 16px', 'font-size': '16px' },
  },
  {
    label: 'data-size="xl" grows to 52px/20px/18px',
    selector: '#in-xl',
    css: { height: '52px', padding: '0px 20px', 'font-size': '18px' },
  },
  {
    label: ':disabled dims to 0.5 / not-allowed',
    selector: '#in-disabled',
    css: { opacity: '0.5', cursor: 'not-allowed' },
  },
  {
    label: ':read-only renders the muted surface',
    run: async (page) => {
      const [def, ro] = await page.evaluate(() => [
        getComputedStyle(document.querySelector('#in-default')!).backgroundColor,
        getComputedStyle(document.querySelector('#in-readonly')!).backgroundColor,
      ]);
      assert.notEqual(def, ro, 'readonly uses a distinct (--muted) surface');
    },
  },
  {
    label: 'aria-invalid recolors the border to destructive',
    distinct: [
      { selector: '#in-default', prop: 'border-top-color' },
      { selector: '#in-invalid', prop: 'border-top-color' },
    ],
  },
  {
    label: ':focus draws the ring border (trusted click-focus)',
    run: async (page) => {
      await page.click('#in-default');
      await page.waitForTimeout(200); // border-color transitions 150ms
      const [blurred, focused] = await page.evaluate(() => {
        const def = document.querySelector<HTMLInputElement>('#in-default')!;
        const focusedBorder = getComputedStyle(def).borderTopColor;
        def.blur();
        return [getComputedStyle(def).borderTopColor, focusedBorder];
      });
      assert.notEqual(blurred, focused, 'focused border uses --ring, distinct from --input');
    },
  },
]);
