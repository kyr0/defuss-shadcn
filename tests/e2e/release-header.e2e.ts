import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: release-header is a CSS-only website block (Docs & Help) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('release-header', [
  { label: 'the version is an inverted mono tag', run: async (page) => {
    const r = await page.evaluate(() => { const v = document.querySelector('.mk-release-header-version')!; return { tag: v.tagName, bg: getComputedStyle(v).backgroundColor !== getComputedStyle(document.body).backgroundColor }; });
    if (r.tag !== 'CODE' || !r.bg) throw new Error(JSON.stringify(r));
  } },
  { label: 'highlights: three tiles in a row', run: async (page) => {
    const r = await page.evaluate(() => new Set([...document.querySelectorAll('.mk-release-header-highlights li')].map((l) => Math.round(l.getBoundingClientRect().top))).size);
    if (r !== 1) throw new Error(String(r));
  } },
  { label: 'compact: one line', run: async (page) => {
    const n = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-release-header[data-variant="compact"]')!).gridTemplateColumns.split(' ').length);
    if (n !== 3) throw new Error(String(n));
  } },
]);
