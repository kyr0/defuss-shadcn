import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: roadmap-item is a CSS-only website block (Docs & Help) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('roadmap-item', [
  { label: 'status colors: planned gray, progress blue, shipped green', run: async (page) => {
    const r = await page.evaluate(() => ['progress', 'shipped'].map((s) => getComputedStyle(document.querySelector(`.mk-roadmap-item-status[data-status="${s}"]`)!).color).join());
    if (r !== 'rgb(29, 78, 216),rgb(21, 128, 61)') throw new Error(r);
  } },
  { label: 'voting checks the box and fills it', run: async (page) => {
    await page.click('#rm-1 ~ .mk-roadmap-item-foot .mk-roadmap-item-vote');
    const r = await page.evaluate(() => { const v = document.querySelector('#rm-1 ~ .mk-roadmap-item-foot .mk-roadmap-item-vote')!; return { c: (v.querySelector('input') as HTMLInputElement).checked, bg: getComputedStyle(v).backgroundColor !== 'rgba(0, 0, 0, 0)' }; });
    if (!r.c || !r.bg) throw new Error(JSON.stringify(r));
  } },
  { label: 'board: three columns', run: async (page) => {
    const n = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-roadmap-board')!).gridTemplateColumns.split(' ').filter((v) => v !== '0px').length);
    if (n !== 3) throw new Error(String(n));
  } },
]);
