import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: release-item is a CSS-only website block (Docs & Help) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('release-item', [
  { label: 'kinds: four distinct colors, always with a word', run: async (page) => {
    const r = await page.evaluate(() => ['new', 'improved', 'fixed', 'breaking'].map((t) => { const e = document.querySelector(`.mk-release-item-type[data-type="${t}"]`)!; return getComputedStyle(e).color + '|' + e.textContent; }));
    if (new Set(r.map((x) => x.split('|')[0])).size !== 4 || r.some((x) => !x.split('|')[1])) throw new Error(r.join());
  } },
  { label: 'layout: the kind column beside the body', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-release-item')!).gridTemplateColumns.split(' ')[0]);
    if (r !== '104px') throw new Error(r);
  } },
]);
