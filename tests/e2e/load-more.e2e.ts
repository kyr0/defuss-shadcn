import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: load-more is a CSS-only website block (Search & Navigation) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('load-more', [
  { label: 'the button is a link to the next batch', run: async (page) => {
    const r = await page.evaluate(() => document.querySelector('.mk-load-more-button')!.tagName);
    if (r !== 'A') throw new Error(r);
  } },
  { label: 'busy: the spinner shows and clicks are ignored', run: async (page) => {
    const r = await page.evaluate(() => { const b = document.querySelector('.mk-load-more-button[aria-busy="true"]')!; return { spin: getComputedStyle(b.querySelector('.mk-load-more-spin')!).display, pe: getComputedStyle(b).pointerEvents }; });
    if (r.spin === 'none' || r.pe !== 'none') throw new Error(JSON.stringify(r));
  } },
  { label: 'idle: no spinner', selector: '.mk-load-more-button:not([aria-busy]) .mk-load-more-spin', css: { display: 'none' } },
]);
