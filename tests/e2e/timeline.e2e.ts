import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: timeline is CSS-only - the 10px dot, the 1px rail each item draws via
 * ::before (suppressed on the last item), and the active-dot recolor.
 */
await cssSmoke('timeline', [
  {
    label: '.timeline is a marker-free positioned list',
    selector: '#tl-demo',
    css: { 'list-style-type': 'none', position: 'relative', padding: '0px', margin: '0px' },
  },
  {
    label: 'items are 16px-gap rows with 24px trailing space',
    selector: '#tl-item-1',
    css: { display: 'flex', gap: '16px', 'padding-bottom': '24px' },
  },
  {
    label: 'dot is a 10px circle; active variant recolors it',
    distinct: [
      { selector: '#tl-item-1 .timeline-dot', prop: 'background-color' },
      { selector: '#tl-item-2 .timeline-dot', prop: 'background-color' },
    ],
  },
  {
    label: 'each item draws a 1px rail but the last one does not',
    run: async (page) => {
      const rails = await page.evaluate(() => ({
        first: getComputedStyle(document.querySelector('#tl-item-1')!, '::before').display,
        last: getComputedStyle(document.querySelector('#tl-item-2')!, '::before').display,
        width: getComputedStyle(document.querySelector('#tl-item-1')!, '::before').width,
      }));
      assert.notEqual(rails.first, 'none', 'non-final items show the connector');
      assert.equal(rails.last, 'none', 'the last item hides its connector');
      assert.equal(rails.width, '1px');
    },
  },
  { label: 'timeline: density "compact" → padding-bottom 18px', selector: '#tld-compact .timeline-item', css: { 'padding-bottom': '18px' } },
  { label: 'timeline: density "compact" → column-gap 12px', selector: '#tld-compact .timeline-item', css: { 'column-gap': '12px' } },
  { label: 'timeline: density "comfortable" → padding-bottom 24px', selector: '#tld-comfortable .timeline-item', css: { 'padding-bottom': '24px' } },
  { label: 'timeline: density "comfortable" → column-gap 16px', selector: '#tld-comfortable .timeline-item', css: { 'column-gap': '16px' } },
  { label: 'timeline: density "spacious" → padding-bottom 30px', selector: '#tld-spacious .timeline-item', css: { 'padding-bottom': '30px' } },
  { label: 'timeline: density "spacious" → column-gap 20px', selector: '#tld-spacious .timeline-item', css: { 'column-gap': '20px' } },
]);
