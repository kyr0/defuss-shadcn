import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: button is CSS-only — its shipped contract is every variant/size
 * geometry in button.css. Heights/paddings are hardcoded px in the CSS so
 * they assert literally; variant colors assert as distinct (theme-safe);
 * :focus-visible needs trusted keyboard input (run escape hatch).
 */
await cssSmoke('button', [
  {
    label: 'base geometry: 36px tall inline-flex with 0/16px padding',
    selector: '#bt-default',
    css: { display: 'inline-flex', height: '36px', padding: '0px 16px', 'font-size': '14px', 'font-weight': '500' },
  },
  {
    label: 'every size height applies literally',
    selector: '#bt-xs',
    css: { height: '28px' },
  },
  {
    label: 'sm/lg sizes',
    selector: '#bt-lg',
    css: { height: '44px', padding: '0px 32px', 'font-size': '16px' },
  },
  {
    label: 'md is the explicit default (36px)',
    selector: '#bt-md',
    css: { height: '36px' },
  },
  {
    label: 'xl is the documented 3.25rem / 1.125rem',
    selector: '#bt-xl',
    css: { height: '52px', 'font-size': '18px' },
  },
  {
    label: 'icon-xl is a 3.25rem square',
    selector: '#bt-icon-xl',
    css: { height: '52px', width: '52px' },
  },
  {
    label: 'icon sizes are square (height == width)',
    selector: '#bt-icon',
    css: { height: '36px', width: '36px', padding: '0px' },
  },
  {
    label: 'icon-xs / icon-sm / icon-lg squares',
    selector: '#bt-icon-lg',
    css: { height: '44px', width: '44px' },
  },
  {
    label: 'variants render distinct background colors',
    distinct: [
      { selector: '#bt-default', prop: 'background-color' },
      { selector: '#bt-secondary', prop: 'background-color' },
      { selector: '#bt-outline', prop: 'background-color' },
      { selector: '#bt-destructive', prop: 'background-color' },
    ],
  },
  {
    // regression: secondary used to hover via `opacity: 0.8`, which on the
    // near-white --secondary just faded the button into the page background
    label: 'secondary hover darkens the surface instead of fading (no opacity)',
    run: async (page) => {
      const before = await page.$eval('#bt-secondary', (el) => getComputedStyle(el).backgroundColor);
      await page.hover('#bt-secondary');
      await page.waitForTimeout(200); // .btn transitions `all` (150ms)
      const after = await page.$eval('#bt-secondary', (el) => {
        const cs = getComputedStyle(el);
        return { bg: cs.backgroundColor, opacity: cs.opacity };
      });
      assert.notEqual(after.bg, before, 'hover must visibly change the secondary surface');
      assert.equal(after.opacity, '1', 'hover must not fade the pale surface towards the page');
    },
  },
  {
    label: 'ghost and link are transparent',
    selector: '#bt-ghost',
    css: { 'background-color': 'rgba(0, 0, 0, 0)', 'border-top-color': 'rgba(0, 0, 0, 0)' },
  },
  {
    label: 'link variant drops the box (0 padding)',
    selector: '#bt-link',
    css: { padding: '0px', 'background-color': 'rgba(0, 0, 0, 0)', 'text-underline-offset': '4px' },
  },
  {
    label: 'disabled + aria-disabled dim to 0.5 opacity, inert',
    selector: '#bt-disabled',
    css: { opacity: '0.5', 'pointer-events': 'none' },
  },
  {
    label: 'aria-disabled="true" gets the same treatment as [disabled]',
    selector: '#bt-aria-disabled',
    css: { opacity: '0.5' },
  },
  {
    label: ':focus-visible draws the 2px ring outline (trusted Tab)',
    run: async (page) => {
      await page.focus('#bt-default');
      await page.keyboard.press('Tab'); // trusted keyboard focus → :focus-visible
      await page.keyboard.press('Shift+Tab');
      // .btn transitions `all` (150ms) — let the outline settle before reading
      await page.waitForTimeout(200);
      const outline = await page.$eval('#bt-default', (el) => {
        const cs = getComputedStyle(el);
        return { width: cs.outlineWidth, style: cs.outlineStyle, offset: cs.outlineOffset };
      });
      assert.deepEqual(outline, { width: '2px', style: 'solid', offset: '2px' });
    },
  },
]);
