import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: collapsible is a CSS-only native <details> disclosure - verify the
 * trigger geometry, the bordered clipped surface, and that the chevron's
 * 180° rotation tracks the [open] state (the only state signal here).
 */
await cssSmoke('collapsible', [
  {
    label: 'surface is a bordered, clipped block',
    selector: '#cl-closed',
    css: { border: /^1px solid /, 'border-top-width': '1px', overflow: 'hidden' },
  },
  {
    label: '.collapsible-trigger: full-width flex row, 12px/16px padding',
    selector: '#cl-closed .collapsible-trigger',
    css: { display: 'flex', 'justify-content': 'space-between', padding: '12px 16px', 'font-size': '14px', 'font-weight': '500' },
  },
  {
    label: 'chevron rotates 180° only when [open]',
    run: async (page) => {
      const [closed, open] = await page.evaluate(() => [
        getComputedStyle(document.querySelector('#cl-closed .collapsible-chevron')!).transform,
        getComputedStyle(document.querySelector('#cl-open .collapsible-chevron')!).transform,
      ]);
      assert.ok(closed === 'none' || closed === 'matrix(1, 0, 0, 1, 0, 0)', `closed chevron untransformed, got ${closed}`);
      assert.equal(open, 'matrix(-1, 0, 0, -1, 0, 0)', 'open chevron is rotate(180deg)');
    },
  },
  {
    label: '.collapsible-content is muted body text with asymmetric padding',
    selector: '#cl-open .collapsible-content',
    css: { padding: '0px 16px 12px', 'font-size': '14px', 'line-height': '22.4px' },
  },
  {
    label: 'density compact → trigger 8px block padding',
    selector: '#cl-compact .collapsible-trigger',
    css: { padding: '8px 12px' },
  },
  {
    label: 'density comfortable keeps the 12px 16px trigger default',
    selector: '#cl-comfortable .collapsible-trigger',
    css: { padding: '12px 16px' },
  },
  {
    label: 'density spacious → trigger 16px block padding',
    selector: '#cl-spacious .collapsible-trigger',
    css: { padding: '16px 20px' },
  },
]);
