import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: tag-cloud is a CSS-only website block (Search & Navigation) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('tag-cloud', [
  { label: 'five weights, five sizes', run: async (page) => {
    const r = await page.evaluate(() => [1, 2, 3, 4, 5].map((w) => getComputedStyle(document.querySelector(`.mk-tag-cloud:not([data-variant]) a[data-weight="${w}"]`)!).fontSize));
    if (new Set(r).size !== 5 || r[4] !== '28px') throw new Error(r.join());
  } },
  { label: 'counts are text', run: async (page) => {
    const t = await page.evaluate(() => document.querySelector('.mk-tag-cloud a')!.textContent);
    if (!t!.includes('posts')) throw new Error(String(t));
  } },
  { label: 'pills: even size with a count chip', selector: '.mk-tag-cloud[data-variant="pills"] a[data-weight="5"]', css: { 'font-size': '13px', 'border-top-left-radius': '999px' } },
]);
