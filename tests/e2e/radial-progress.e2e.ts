import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: radial-progress is CSS-only — the shipped contract is the stylesheet
 * plus the three public custom properties. This asserts the geometry those
 * properties produce (diameter per data-size, the @property registration that
 * makes --value a tweenable number), that the ring is actually painted as a
 * masked conic-gradient, and that the four documented variants resolve to
 * genuinely distinct token colors (theme-agnostic distinctness, not literal
 * oklch values).
 */
await cssSmoke('radial-progress', [
  {
    label: 'base geometry: 5rem inline-grid disc, centered content',
    selector: '#rp-default',
    css: {
      display: 'inline-grid',
      width: '80px',
      height: '80px',
      'border-radius': '9999px',
      'box-sizing': 'content-box',
    },
  },
  {
    label: '@property registers --value as a <number> (computed, not raw text)',
    selector: '#rp-default',
    css: { '--value': '70' },
  },
  {
    label: '@property initial-value applies when no --value is set',
    selector: '#rp-unset',
    css: { '--value': '0' },
  },
  {
    label: 'the ring is a masked conic-gradient, not an SVG or border trick',
    run: async (page) => {
      const [bg, mask] = await page.$eval('#rp-default', (el) => {
        const s = getComputedStyle(el, '::before');
        return [s.backgroundImage, s.maskImage || s.webkitMaskImage];
      });
      assert.match(bg, /conic-gradient/, 'arc layer');
      assert.match(bg, /radial-gradient/, 'start-cap dot layer');
      assert.match(mask, /radial-gradient/, 'ring mask');
    },
  },
  {
    label: 'the leading cap tracks --value (0% at top, 25% at right)',
    run: async (page) => {
      const capLeft = (sel: string) =>
        page.$eval(sel, (el) => getComputedStyle(el, '::after').insetInlineStart);
      // r = (80 - 8) / 2 = 36 ; cap box is 8px, so left = 40 + 36*cos(a) - 4
      assert.equal(await capLeft('#rp-v0'), '36px'); // -90deg → cos = 0
      assert.equal(await capLeft('#rp-v25'), '72px'); // 0deg → cos = 1
    },
  },
  {
    label: 'data-size sets the documented diameters',
    run: async (page) => {
      const box = (sel: string) =>
        page.$eval(sel, (el) => {
          const s = getComputedStyle(el);
          return `${s.width}/${s.height}/${s.fontSize}`;
        });
      assert.equal(await box('#rp-sm'), '56px/56px/12px');
      assert.equal(await box('#rp-lg'), '128px/128px/20px');
    },
  },
  {
    label: 'custom --size / --thickness override the defaults',
    selector: '#rp-custom',
    css: { width: '192px', height: '192px' },
  },
  {
    label: 'all four variants carry distinct arc colors',
    distinct: [
      { selector: '#rp-variant-default', prop: 'color' },
      { selector: '#rp-secondary', prop: 'color' },
      { selector: '#rp-destructive', prop: 'color' },
      { selector: '#rp-success', prop: 'color' },
    ],
  },
  {
    label: 'the arc color is also the label color (one declaration recolors both)',
    run: async (page) => {
      const [own, cap] = await page.$eval('#rp-destructive', (el) => [
        getComputedStyle(el).color,
        getComputedStyle(el, '::after').backgroundColor,
      ]);
      assert.equal(cap, own, 'currentColor cap');
    },
  },
]);
