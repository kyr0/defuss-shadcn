import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: pagination is CSS-only - verify the centered flex bar, the 36px
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

  // the component gained a runtime (pagination.ts): window math + interaction.
  // The nav is data-driven: it renders its link window from data-active-page /
  // -min-page / -max-page / -page-display-count (see the #pg-live demo).
  {
    label: "runtime: init marker + data-driven window (3 links around page 3, both ellipses)",
    run: async (page) => {
      await page.waitForFunction(() => !!document.querySelector('#pg-live[data-init]'));
      const links = await page.$$eval('#pg-live .pagination-link[data-page]', (els) => els.map((e) => e.textContent));
      assert.deepEqual(links, ['2', '3', '4'], 'window = 3 pages around the active one');
      assert.equal(await page.$eval('#pg-live .pagination-link[aria-current="page"]', (e) => e.textContent), '3');
      assert.equal(await page.$$eval('#pg-live .pagination-ellipsis', (els) => els.length), 2, 'ellipsis both sides');
    },
  },
  {
    label: 'runtime: clicking page link 4 moves aria-current to 4',
    run: async (page) => {
      await page.click('#pg-live .pagination-link[data-page="4"]');
      await page.waitForFunction(() => document.querySelector('#pg-live')!.getAttribute('data-active-page') === '4');
      assert.equal(await page.$eval('#pg-live .pagination-link[aria-current="page"]', (e) => e.textContent), '4');
    },
  },
  {
    label: 'runtime: pagination-next/pagination-prev action events step the page',
    run: async (page) => {
      await page.$eval('#pg-live', (el) => el.dispatchEvent(new Event('pagination-next', { bubbles: true })));
      assert.equal(await page.$eval('#pg-live', (el) => el.getAttribute('data-active-page')), '5');
      await page.$eval('#pg-live', (el) => el.dispatchEvent(new Event('pagination-prev', { bubbles: true })));
      assert.equal(await page.$eval('#pg-live', (el) => el.getAttribute('data-active-page')), '4');
    },
  },
  {
    label: "state API: getState().name === 'default'; setState('default', { page: 9 }) re-renders the window",
    run: async (page) => {
      assert.equal(await page.$eval('#pg-live', (el) => (el as any).api.getState().name), 'default', "declared state 'default'");
      await page.$eval('#pg-live', (el) => (el as any).api.setState('default', { page: 9 }));
      assert.equal(await page.$eval('#pg-live .pagination-link[aria-current="page"]', (e) => e.textContent), '9');
    },
  },
]);
void assert;
