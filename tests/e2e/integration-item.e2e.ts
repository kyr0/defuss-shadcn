import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: integration-item is a CSS-only website block (Company) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('integration-item', [
  { label: 'logo: a 44px tile in the brand color', run: async (page) => {
    const r = await page.evaluate(() => { const l = document.querySelector('.mk-integration-item:not([data-variant]) .mk-integration-item-logo')!; return { w: getComputedStyle(l).width, bg: getComputedStyle(l).backgroundColor }; });
    if (r.w !== '44px' || r.bg !== 'rgb(36, 41, 47)') throw new Error(JSON.stringify(r));
  } },
  { label: 'actions are labelled with the tool', run: async (page) => {
    const n = await page.evaluate(() => [...document.querySelectorAll('.mk-integration-item > .btn')].filter((b) => !/(Connect|Manage) \w/.test(b.getAttribute('aria-label') ?? '')).length);
    if (n) throw new Error(`${n} unlabelled`);
  } },
  { label: 'compact: a row without the description', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-integration-item[data-variant="compact"]')!; return { dir: getComputedStyle(c).flexDirection, desc: getComputedStyle(c.querySelector('.mk-integration-item-desc')!).display }; });
    if (r.dir !== 'row' || r.desc !== 'none') throw new Error(JSON.stringify(r));
  } },
]);
