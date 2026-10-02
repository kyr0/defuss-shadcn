import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: sort-control is a CSS-only website block (Search & Navigation) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('sort-control', [
  { label: 'select: a visible label', run: async (page) => {
    const n = await page.evaluate(() => (document.getElementById('so-1') as HTMLSelectElement).labels.length);
    if (n !== 1) throw new Error(String(n));
  } },
  { label: 'segmented: the checked segment is raised', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-sort-control[data-variant="segmented"] label:has(:checked)')!).boxShadow !== 'none');
    if (!r) throw new Error('flat');
  } },
  { label: 'menu: the button opens the popover of radios', run: async (page) => {
    await page.click('[popovertarget="so-menu"]');
    const r = await page.evaluate(() => ({ open: document.getElementById('so-menu')!.matches(':popover-open'), radios: document.querySelectorAll('#so-menu input[type="radio"]').length }));
    await page.keyboard.press('Escape');
    if (!r.open || r.radios !== 4) throw new Error(JSON.stringify(r));
  } },
]);
