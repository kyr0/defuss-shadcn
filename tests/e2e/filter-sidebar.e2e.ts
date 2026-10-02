import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: filter-sidebar is a CSS-only website block (Search & Navigation) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('filter-sidebar', [
  { label: 'groups are details; rating starts collapsed', run: async (page) => {
    const r = await page.evaluate(() => [...document.querySelectorAll('details.mk-filter-sidebar-group')].map((d) => (d as HTMLDetailsElement).open).join());
    if (r !== 'true,true,true,false') throw new Error(r);
  } },
  { label: 'swatches: named checkboxes; checked gets a ring', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-filter-sidebar-swatch:has(:checked)')!; return { name: s.querySelector('.sr-only')!.textContent, ring: getComputedStyle(s).outlineStyle }; });
    if (r.name !== 'Sand' || r.ring !== 'solid') throw new Error(JSON.stringify(r));
  } },
  { label: 'price inputs bring the numeric keyboard', run: async (page) => {
    const r = await page.evaluate(() => document.getElementById('fs-min')!.getAttribute('inputmode'));
    if (r !== 'numeric') throw new Error(String(r));
  } },
]);
