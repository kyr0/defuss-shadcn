import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: active-filters is a CSS-only website block (Search & Navigation) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('active-filters', [
  { label: 'each chip is a link that says what it removes', run: async (page) => {
    const r = await page.evaluate(() => [...document.querySelectorAll('.mk-active-filters-chip')].every((a) => a.tagName === 'A' && a.getAttribute('aria-label')!.startsWith('Remove filter ')));
    if (!r) throw new Error('unnamed chip');
  } },
  { label: 'chips are pills', selector: '.mk-active-filters-chip', css: { 'border-top-left-radius': '999px', height: '28px' } },
  { label: 'bar: a muted bar with the count at the end', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-active-filters[data-variant="bar"] output')!).marginLeft !== '0px');
    if (!r) throw new Error('count not pushed');
  } },
]);
