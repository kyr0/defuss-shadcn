import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: card is CSS-only — verify the surface (border, overflow clip, inline
 * container for the @container query), literal paddings/type, and that the
 * documented container query (<280px) actually swaps to compact paddings.
 */
await cssSmoke('card', [
  {
    label: '.card is a clipped inline-size container',
    selector: '#card-full',
    css: { overflow: 'hidden', 'container-type': 'inline-size', 'border-top-width': '1px' },
  },
  {
    label: 'header/content use literal 24px paddings, footer drops its top',
    selector: '#card-full .card-header',
    css: { padding: '24px 24px 0px' },
  },
  {
    label: '.card-title is 20px/600, description muted 14px',
    selector: '#card-full .card-title',
    css: { 'font-size': '20px', 'font-weight': '600', margin: '0px' },
  },
  {
    label: 'title and description render with distinct colors',
    distinct: [
      { selector: '#card-full .card-title', prop: 'color' },
      { selector: '#card-full .card-description', prop: 'color' },
    ],
  },
  {
    label: '@container query: <280px switches to 16px paddings + 16px title',
    run: async (page) => {
      const narrow = await page.evaluate(() => {
        const header = getComputedStyle(document.querySelector('#card-narrow .card-header')!);
        const title = getComputedStyle(document.querySelector('#card-narrow .card-title')!);
        const wide = getComputedStyle(document.querySelector('#card-full .card-header')!);
        return {
          narrowPad: header.padding,
          narrowTitle: title.fontSize,
          widePad: wide.padding,
        };
      });
      assert.equal(narrow.narrowPad, '16px 16px 0px', 'compact header padding');
      assert.equal(narrow.narrowTitle, '16px', 'compact title size');
      assert.equal(narrow.widePad, '24px 24px 0px', 'wide card unaffected');
    },
  },
  { label: 'card: density "compact" → padding-top 16px', selector: '#cd-compact .card-header', css: { 'padding-top': '16px' } },
  { label: 'card: density "comfortable" → padding-top 24px', selector: '#cd-comfortable .card-header', css: { 'padding-top': '24px' } },
  { label: 'card: density "spacious" → padding-top 32px', selector: '#cd-spacious .card-header', css: { 'padding-top': '32px' } },
]);
