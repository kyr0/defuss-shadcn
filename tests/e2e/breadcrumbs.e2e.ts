import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: breadcrumbs is a CSS-only website block (Search & Navigation) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('breadcrumbs', [
  { label: 'wide: the trail shows, the back link hides', run: async (page) => {
    const r = await page.evaluate(() => { const b = document.querySelector('.mk-breadcrumbs:not([data-variant])')!; return { trail: getComputedStyle(b.querySelector('.breadcrumb')!).display, back: getComputedStyle(b.querySelector('.mk-breadcrumbs-back')!).display }; });
    if (r.trail === 'none' || r.back !== 'none') throw new Error(JSON.stringify(r));
  } },
  { label: 'narrow: only the back link', run: async (page) => {
    await page.evaluate(() => { (document.querySelector('.mk-breadcrumbs:not([data-variant])') as HTMLElement).style.width = '300px'; });
    const r = await page.evaluate(() => { const b = document.querySelector('.mk-breadcrumbs:not([data-variant])')!; return { trail: getComputedStyle(b.querySelector('.breadcrumb')!).display, back: getComputedStyle(b.querySelector('.mk-breadcrumbs-back')!).display }; });
    if (r.trail !== 'none' || !r.back.endsWith('flex')) throw new Error(JSON.stringify(r));
  } },
  { label: 'collapsed: "…" opens the hidden levels', run: async (page) => {
    await page.click('.mk-breadcrumbs-more');
    const r = await page.evaluate(() => document.getElementById('bc-more')!.matches(':popover-open'));
    await page.keyboard.press('Escape');
    if (!r) throw new Error('closed');
  } },
]);
