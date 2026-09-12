import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: pagination is CSS-only — verify the centered flex bar, the 36px
 * square controls, prev/next's wider padding, the active border + weight,
 * and aria-disabled inertness.
 */
await cssSmoke('pagination', [
  {
    label: '.pagination centers; the list is an 4px-gap row with no markers',
    selector: '.pagination-list',
    css: { display: 'flex', gap: '4px', 'list-style-type': 'none', padding: '0px' },
  },
  {
    label: '.pagination-nav nav wrapper',
    selector: '.pagination',
    css: { display: 'flex', 'justify-content': 'center' },
  },
  {
    label: 'links are 36px inline-flex boxes',
    selector: '#pg-link',
    css: { display: 'inline-flex', height: '36px', 'min-width': '36px', 'padding-inline': '8px' },
  },
  {
    label: 'prev/next get wider 12px inline padding',
    selector: '#pg-next',
    css: { 'padding-inline': '12px' },
  },
  {
    label: 'active link gains a border + medium weight',
    selector: '#pg-active',
    css: { 'border-top-width': '1px', 'font-weight': '500' },
  },
  {
    label: 'aria-disabled links go inert at 0.5 opacity',
    selector: '#pg-disabled',
    css: { opacity: '0.5', 'pointer-events': 'none' },
  },
  {
    label: 'ellipsis is a 36px slot for the sr-only span',
    selector: '#pg-ellipsis',
    css: { display: 'inline-flex', width: '36px', height: '36px' },
  },

  { label: 'pagination: data-size="xs" geometry', selector: '#z-pagination-xs .pagination-link', css: { 'height': '28px' } },
  { label: 'pagination: data-size="sm" geometry', selector: '#z-pagination-sm .pagination-link', css: { 'height': '32px' } },
  { label: 'pagination: data-size="md" geometry', selector: '#z-pagination-md .pagination-link', css: { 'height': '36px' } },
  { label: 'pagination: data-size="lg" geometry', selector: '#z-pagination-lg .pagination-link', css: { 'height': '40px' } },
  { label: 'pagination: data-size="xl" geometry', selector: '#z-pagination-xl .pagination-link', css: { 'height': '44px' } },
  { label: 'pagination: density "compact" → gap 2px', selector: '#pg-compact .pagination-list', css: { 'gap': '2px' } },
  { label: 'pagination: density "comfortable" → gap 4px', selector: '#pg-comfortable .pagination-list', css: { 'gap': '4px' } },
  { label: 'pagination: density "spacious" → gap 8px', selector: '#pg-spacious .pagination-list', css: { 'gap': '8px' } },
]);
void assert;
