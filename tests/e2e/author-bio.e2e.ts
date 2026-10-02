import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: author-bio is a CSS-only website block (Article) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('author-bio', [
  { label: 'default: portrait beside the copy, between rules', run: async (page) => {
    const r = await page.evaluate(() => { const b = document.querySelector('.mk-author-bio:not([data-variant])')!; const a = b.querySelector('.avatar')!.getBoundingClientRect(); const c = b.querySelector('.mk-author-bio-body')!.getBoundingClientRect(); const s = getComputedStyle(b); return { beside: c.left >= a.right, rules: s.borderTopWidth + ' ' + s.borderBottomWidth }; });
    if (!r.beside || r.rules !== '1px 1px') throw new Error(JSON.stringify(r));
  } },
  { label: 'card: a raised surface with a primary wash and a ringed portrait; topics and actions', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-author-bio[data-variant="card"]')!; const s = getComputedStyle(c); return { pad: s.paddingTop, wash: s.backgroundImage.includes('radial-gradient'), shadow: s.boxShadow !== 'none', ring: getComputedStyle(c.querySelector(':scope > .avatar')!).boxShadow.split('px').length > 4, topics: c.querySelectorAll('.mk-author-bio-topics .badge').length }; });
    if (r.pad !== '28px' || !r.wash || !r.shadow || !r.ring || r.topics !== 3) throw new Error(JSON.stringify(r));
  } },
  { label: 'centered: a stack, portrait above', run: async (page) => {
    const r = await page.evaluate(() => { const b = document.querySelector('.mk-author-bio[data-variant="centered"]')!; return { dir: getComputedStyle(b).flexDirection, align: getComputedStyle(b).textAlign, above: b.querySelector('.avatar')!.getBoundingClientRect().bottom <= b.querySelector('.mk-author-bio-name')!.getBoundingClientRect().top }; });
    if (r.dir !== 'column' || r.align !== 'center' || !r.above) throw new Error(JSON.stringify(r));
  } },
  { label: 'label and role are muted, the name is not', distinct: [ { selector: '.mk-author-bio-name', prop: 'color' }, { selector: '.mk-author-bio-role', prop: 'color' } ] },

  { label: 'cover: the portrait overlaps the banner; stats in a row', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-author-bio[data-variant="cover"]')!; const cov = c.querySelector('.mk-author-bio-cover')!.getBoundingClientRect(); const a = c.querySelector(':scope > .avatar')!.getBoundingClientRect(); return { overlap: a.top < cov.bottom, stats: c.querySelectorAll('.statistic').length, dir: getComputedStyle(c.querySelector('.mk-author-bio-stats')!).flexDirection }; });
    if (!r.overlap || r.stats !== 3 || r.dir !== 'row') throw new Error(JSON.stringify(r));
  } },
  { label: 'inline: one row, the bio text hidden', run: async (page) => {
    const r = await page.evaluate(() => { const i = document.querySelector('.mk-author-bio[data-variant="inline"]')!; return { dir: getComputedStyle(i.querySelector('.mk-author-bio-body')!).flexDirection, h: Math.round(i.getBoundingClientRect().height) }; });
    if (r.dir !== 'row' || r.h > 72) throw new Error(JSON.stringify(r));
  } },

]);
