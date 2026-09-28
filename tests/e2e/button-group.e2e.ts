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
  {
    label: 'split button: the separator is the ONE 1px divider (neighbouring borders drop, no gap)',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const main = document.getElementById('bg-split-main')!;
        const more = document.getElementById('bg-split-more')!;
        return {
          gap: Math.round(more.getBoundingClientRect().left - main.getBoundingClientRect().right),
          mainEnd: getComputedStyle(main).borderRightWidth,
          moreStart: getComputedStyle(more).borderLeftWidth,
          mainOuter: getComputedStyle(main).borderLeftWidth,
        };
      });
      assert.deepEqual(r, { gap: 1, mainEnd: '0px', moreStart: '0px', mainOuter: '1px' });
    },
  },
  {
    label: 'split button: inner corners stay square, outer corners rounded - one control',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const cs = (id: string) => getComputedStyle(document.getElementById(id)!);
        return [cs('bg-split-main').borderTopRightRadius, cs('bg-split-more').borderTopLeftRadius, cs('bg-split-main').borderTopLeftRadius !== '0px', cs('bg-split-more').borderTopRightRadius !== '0px'];
      });
      assert.deepEqual(r, ['0px', '0px', true, true]);
    },
  },
  {
    label: 'vertical group: a separator is the one 1px divider there too',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const top = document.getElementById('bg-vs-top')!;
        const bottom = document.getElementById('bg-vs-bottom')!;
        return [Math.round(bottom.getBoundingClientRect().top - top.getBoundingClientRect().bottom), getComputedStyle(top).borderBottomWidth, getComputedStyle(bottom).borderTopWidth, getComputedStyle(top).borderBottomLeftRadius];
      });
      assert.deepEqual(r, [1, '0px', '0px', '0px']);
    },
  },
]);
