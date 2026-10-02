import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: announcement is a CSS-only website block (Events & Promotions) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('announcement', [
  { label: 'bar: an open, in-flow dialog across the width', run: async (page) => {
    const r = await page.evaluate(() => { const d = document.querySelector('.mk-announcement:not([data-variant])') as HTMLDialogElement; return { open: d.open, pos: getComputedStyle(d).position, full: Math.round(d.getBoundingClientRect().width) === Math.round(d.parentElement!.getBoundingClientRect().width) }; });
    if (!r.open || r.pos !== 'relative' || !r.full) throw new Error(JSON.stringify(r));
  } },
  { label: 'the close button dismisses it natively (form method=dialog)', run: async (page) => {
    await page.click('.mk-announcement:not([data-variant]) .mk-announcement-close');
    const r = await page.evaluate(() => { const d = document.querySelector('.mk-announcement:not([data-variant])') as HTMLDialogElement; return { open: d.open, display: getComputedStyle(d).display }; });
    if (r.open || r.display !== 'none') throw new Error(JSON.stringify(r));
  } },
  { label: 'primary: filled strip', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-announcement[data-variant="primary"]')!).backgroundColor !== getComputedStyle(document.querySelector('.mk-announcement[data-variant="inline"]')!).backgroundColor);
    if (!r) throw new Error('not filled');
  } },
  { label: 'inline: a rounded card; floating: fixed with a shadow', run: async (page) => {
    const r = await page.evaluate(() => ({ radius: getComputedStyle(document.querySelector('.mk-announcement[data-variant="inline"]')!).borderTopLeftRadius !== '0px', pos: getComputedStyle(document.querySelector('.mk-announcement[data-variant="floating"]')!).position }));
    if (!r.radius || r.pos !== 'fixed') throw new Error(JSON.stringify(r));
  } },
]);
