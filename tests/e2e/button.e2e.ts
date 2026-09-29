import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: button is CSS-only - its shipped contract is every variant/size
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
      // .btn transitions `all` (150ms) - let the outline settle before reading
      await page.waitForTimeout(200);
      const outline = await page.$eval('#bt-default', (el) => {
        const cs = getComputedStyle(el);
        return { width: cs.outlineWidth, style: cs.outlineStyle, offset: cs.outlineOffset };
      });
      assert.deepEqual(outline, { width: '2px', style: 'solid', offset: '2px' });
    },
  },
  {
    label: 'soft: a 12% tint of --primary; dashed: a dashed 1px border',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const cs = (id: string) => getComputedStyle(document.getElementById(id)!);
        return { soft: cs('bt-soft').backgroundColor, dashed: [cs('bt-dashed').borderTopStyle, cs('bt-dashed').borderTopWidth, cs('bt-dashed').backgroundColor] };
      });
      assert.ok(/oklch|color\(|rgba/.test(r.soft) && !/rgba\(0, 0, 0, 0\)/.test(r.soft), `soft tint (${r.soft})`);
      assert.deepEqual(r.dashed, ['dashed', '1px', 'rgba(0, 0, 0, 0)']);
    },
  },
  {
    label: 'tones: four distinct solid fills; warning uses dark text',
    distinct: [
      { selector: '#bt-success', prop: 'background-color' },
      { selector: '#bt-warning', prop: 'background-color' },
      { selector: '#bt-info', prop: 'background-color' },
      { selector: '#bt-tone-destructive', prop: 'background-color' },
    ],
  },
  {
    label: 'tone styles: outline border = the tone, soft / ghost / dashed / link write in it',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const cs = (id: string) => getComputedStyle(document.getElementById(id)!);
        const solid = cs('bt-success').backgroundColor;
        return {
          solid,
          outlineBorder: cs('bt-success-outline').borderTopColor,
          outlineBg: cs('bt-success-outline').backgroundColor,
          dashedBorder: [cs('bt-success-dashed').borderTopColor, cs('bt-success-dashed').borderTopStyle],
          inks: ['bt-success-outline', 'bt-success-soft', 'bt-success-ghost', 'bt-success-dashed', 'bt-success-link'].map((id) => cs(id).color),
          plainGhostInk: getComputedStyle(document.body).color,
          warnFg: cs('bt-warning').color,
          infoFg: cs('bt-info').color,
        };
      });
      assert.equal(r.outlineBorder, r.solid);
      assert.equal(r.outlineBg, 'rgba(0, 0, 0, 0)');
      assert.deepEqual(r.dashedBorder, [r.solid, 'dashed']);
      assert.equal(new Set(r.inks).size, 1, `one ink for every text style (${r.inks.join(' | ')})`);
      assert.notEqual(r.inks[0], r.solid, 'ink is mixed toward the foreground');
      assert.notEqual(r.warnFg, r.infoFg, 'warning text is dark, info text white');
    },
  },
  {
    label: 'custom tone: --btn-color fills, --btn-color-fg writes; outline borders in it',
    selector: '#bt-custom',
    css: { 'background-color': 'rgb(120, 40, 200)', color: 'rgb(255, 255, 0)' },
  },
  {
    label: 'custom tone outline border',
    selector: '#bt-custom-outline',
    css: { 'border-top-color': 'rgb(120, 40, 200)' },
  },
  {
    label: 'RTL: data-rtl-flip icons mirror, symmetric icons and LTR stay',
    run: async (page) => {
      const r = await page.evaluate(() => ['bt-rtl-arrow', 'bt-rtl-sym', 'bt-ltr-arrow'].map((id) => getComputedStyle(document.getElementById(id)!).scale));
      assert.deepEqual(r, ['-1 1', 'none', 'none']);
    },
  },
]);
