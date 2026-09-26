import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: button-group is CSS-only - it stitches sibling buttons into one
 * control. Verify the inline-flex stretch, the -1px overlap that hides the
 * shared border, the square inner corners, the 1px separator, and the
 * vertical orientation switch.
 */
await cssSmoke('button-group', [
  {
    label: '.btn-group is inline-flex with stretched children',
    selector: '#bg-horizontal',
    css: { display: 'inline-flex', 'align-items': 'stretch' },
  },
  {
    label: 'adjacent buttons overlap by -1px (single shared border)',
    selector: '#bg-right',
    css: { 'margin-inline-start': '-1px' },
  },
  {
    label: 'inner corners are squared off, outer corners keep the radius',
    run: async (page) => {
      const corners = await page.evaluate(() => {
        const left = getComputedStyle(document.querySelector('#bg-left')!);
        const right = getComputedStyle(document.querySelector('#bg-right')!);
        return {
          leftStart: left.borderStartStartRadius,
          leftEnd: left.borderStartEndRadius,
          rightStart: right.borderStartStartRadius,
          rightEnd: right.borderStartEndRadius,
        };
      });
      // --radius: 0.625rem (10px) in the default token file → --radius-md: 8px
      assert.equal(corners.leftStart, '8px', 'first keeps outer --radius-md');
      assert.equal(corners.leftEnd, '0px', 'first has square inner edge');
      assert.equal(corners.rightStart, '0px', 'second has square inner edge');
      assert.notEqual(corners.rightEnd, '0px', 'last keeps outer radius');
    },
  },
  {
    label: 'role=separator renders a 1px stretch rule',
    selector: '#bg-separator [role="separator"]',
    css: { width: '1px' },
  },
  {
    label: 'data-orientation="vertical" stacks the group',
    selector: '#bg-vertical',
    css: { 'flex-direction': 'column', 'align-items': 'stretch' },
  },
  {
    // issue #13: vertical corners must be symmetric - Top rounded on BOTH
    // top corners, Bottom on both bottom, middle fully square
    label: 'vertical group corners are symmetric top/bottom (issue #13)',
    run: async (page) => {
      const corners = await page.evaluate(() => {
        const c = (id: string) => {
          const s = getComputedStyle(document.getElementById(id)!);
          return [
            s.borderTopLeftRadius,
            s.borderTopRightRadius,
            s.borderBottomRightRadius,
            s.borderBottomLeftRadius,
          ];
        };
        return { top: c('bg-v-top'), mid: c('bg-v-mid'), bottom: c('bg-v-bottom') };
      });
      assert.deepEqual(corners.top, ['8px', '8px', '0px', '0px'], 'Top rounded on both top corners');
      assert.deepEqual(corners.mid, ['0px', '0px', '0px', '0px'], 'Middle fully square');
      assert.deepEqual(corners.bottom, ['0px', '0px', '8px', '8px'], 'Bottom rounded on both bottom corners');
    },
  },
  // size ladder (doc page "Sizes" demo): size rides on the .btn children,
  // so the group's first button must render at the shared .btn ladder height
  { label: 'size ladder: xs button is 28px', selector: '#bg-xs .btn', css: { height: '28px' } },
  { label: 'size ladder: sm button is 32px', selector: '#bg-sm .btn', css: { height: '32px' } },
  { label: 'size ladder: md button is 36px', selector: '#bg-md .btn', css: { height: '36px' } },
  { label: 'size ladder: lg button is 44px', selector: '#bg-lg .btn', css: { height: '44px' } },
  { label: 'size ladder: xl button is 52px', selector: '#bg-xl .btn', css: { height: '52px' } },
]);
