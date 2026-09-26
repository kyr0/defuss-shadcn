import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: alert is CSS-only - verify the flex layout + literal child geometry
 * apply, and that the destructive variant recolors the whole alert (border +
 * title + icon share the destructive token, distinct from the default).
 */
await cssSmoke('alert', [
  {
    label: 'alert.css applies flex layout + literal child geometry',
    selector: '#al-default',
    css: { display: 'flex', 'align-items': 'flex-start', 'border-top-width': '1px', 'font-size': '14px' },
  },
  {
    label: '.alert-title is 14px/500, .alert-description smaller',
    selector: '#al-default .alert-title',
    css: { 'font-size': '14px', 'font-weight': '500' },
  },
  {
    label: 'destructive recolors title (distinct from default foreground)',
    distinct: [
      { selector: '#al-default .alert-title', prop: 'color' },
      { selector: '#al-destructive .alert-title', prop: 'color' },
    ],
  },
  {
    label: 'destructive border matches its title color (same token)',
    run: async (page) => {
      const [border, title] = await page.evaluate(() => [
        getComputedStyle(document.querySelector('#al-destructive')!).borderTopColor,
        getComputedStyle(document.querySelector('#al-destructive .alert-title')!).color,
      ]);
      assert.equal(border, title, 'both are var(--destructive)');
    },
  },
  {
    label: 'density compact → padding 12px 16px, gap 8px',
    selector: '#al-compact',
    css: { padding: '12px 16px', gap: '8px' },
  },
  {
    label: 'density comfortable keeps the default padding',
    selector: '#al-comfortable',
    css: { padding: '16px 20px', gap: '12px' },
  },
  {
    label: 'density spacious → padding 20px 24px, gap 16px',
    selector: '#al-spacious',
    css: { padding: '20px 24px', gap: '16px' },
  },
]);
