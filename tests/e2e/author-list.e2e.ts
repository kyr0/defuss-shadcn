import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: author-list is a CSS-only website block (Article) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('author-list', [
  { label: 'default: rows with a count at the end', run: async (page) => {
    const r = await page.evaluate(() => { const i = document.querySelector('.mk-author-list:not([data-variant]) .mk-author-list-item')!; const c = i.querySelector('.mk-author-list-count')!.getBoundingClientRect(); return { end: Math.abs(c.right - i.getBoundingClientRect().right) < 2, rule: getComputedStyle(i).borderBottomWidth }; });
    if (!r.end || r.rule !== '1px') throw new Error(JSON.stringify(r));
  } },
  { label: 'grid: cards in columns', run: async (page) => {
    const r = await page.evaluate(() => { const items = [...document.querySelectorAll('.mk-author-list[data-variant="grid"] .mk-author-list-item')].map((i) => i.getBoundingClientRect().top); return { display: getComputedStyle(document.querySelector('.mk-author-list[data-variant="grid"] .mk-author-list-items')!).display, sameRow: Math.abs(items[0] - items[1]) < 2 }; });
    if (r.display !== 'grid' || !r.sameRow) throw new Error(JSON.stringify(r));
  } },
  { label: 'stack: avatars overlap, names hidden visually but kept (and focusable)', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-author-list[data-variant="stack"]')!; const a = [...s.querySelectorAll('.avatar')].map((e) => e.getBoundingClientRect()); const who = s.querySelector('.mk-author-list-who')!; return { overlap: a[1].left < a[0].right, hidden: getComputedStyle(who).clipPath, w: who.getBoundingClientRect().width, inTree: s.querySelector('.mk-author-list-name')!.textContent }; });
    if (!r.overlap || r.hidden !== 'inset(50%)' || r.w > 1 || r.inTree !== 'Sophie Tan') throw new Error(JSON.stringify(r));
  } },

  { label: 'ranked: medals for the top three, a Progress bar per writer', run: async (page) => {
    const r = await page.evaluate(() => { const l = document.querySelector('.mk-author-list[data-variant="ranked"]')!; return { medal: getComputedStyle(l.querySelector('[data-rank="1"]')!, '::before').content, four: getComputedStyle(l.querySelector('[data-rank="4"]')!, '::before').content, bars: l.querySelectorAll('.progress').length, grid: getComputedStyle(l.querySelector('.mk-author-list-item')!).display }; });
    if (r.medal !== '"🥇"' || r.four !== '"4"' || r.bars !== 4 || r.grid !== 'grid') throw new Error(JSON.stringify(r));
  } },
  { label: 'the follow action sits at the row end', run: async (page) => {
    const r = await page.evaluate(() => { const i = document.querySelector('.mk-author-list-item:has(.mk-author-list-action)')!; return Math.abs(i.querySelector('.mk-author-list-action')!.getBoundingClientRect().right - (i.getBoundingClientRect().right - parseFloat(getComputedStyle(i).paddingRight))) < 2; });
    if (!r) throw new Error('action not at the end');
  } },
  { label: 'stack: every avatar has its tooltip', run: async (page) => {
    const n = await page.evaluate(() => [...document.querySelectorAll('.mk-author-list[data-variant="stack"] .avatar[data-tooltip-trigger]')].filter((a) => document.getElementById(a.getAttribute('data-tooltip-trigger')!)).length);
    if (n !== 4) throw new Error(String(n));
  } },

]);
