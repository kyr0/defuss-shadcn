import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: docs-navigation is a CSS-only website block (Docs & Help) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('docs-navigation', [
  { label: 'the current page is marked and filled', run: async (page) => {
    const r = await page.evaluate(() => { const a = document.querySelector('.mk-docs-navigation:not([data-variant]) a[aria-current="page"]')!; return { w: getComputedStyle(a).fontWeight, bg: getComputedStyle(a).backgroundColor !== 'rgba(0, 0, 0, 0)' }; });
    if (r.w !== '600' || !r.bg) throw new Error(JSON.stringify(r));
  } },
  { label: 'groups collapse natively', run: async (page) => {
    const r = await page.evaluate(() => [...document.querySelectorAll('.mk-docs-navigation:not([data-variant]) details')].map((d) => (d as HTMLDetailsElement).open).join());
    if (r !== 'true,false') throw new Error(r);
  } },
  { label: 'bordered: the current link lights the rail', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-docs-navigation[data-variant="bordered"] a[aria-current]')!).borderLeftWidth);
    if (r !== '2px') throw new Error(r);
  } },
]);
