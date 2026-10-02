import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: comment-header is a CSS-only website block (Comments) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('comment-header', [
  { label: 'title and actions share a row, a rule below', run: async (page) => {
    const r = await page.evaluate(() => { const h = document.querySelector('.mk-comment-header:not([data-variant])')!; const t = h.querySelector('.mk-comment-header-title')!.getBoundingClientRect(); const a = h.querySelector('.mk-comment-header-actions')!.getBoundingClientRect(); return { row: a.left > t.right && Math.abs((a.top + a.bottom) / 2 - (t.top + t.bottom) / 2) < 4, rule: getComputedStyle(h).borderBottomWidth }; });
    if (!r.row || r.rule !== '1px') throw new Error(JSON.stringify(r));
  } },
  { label: 'the select sits in its label (one accessible name)', run: async (page) => {
    const n = await page.evaluate(() => (document.querySelector('.mk-comment-header-sort select') as HTMLSelectElement).labels?.[0]?.textContent?.trim().startsWith('Sort by'));
    if (!n) throw new Error('select not labelled');
  } },
  { label: 'sort links: the current one raised', distinct: [ { selector: '.mk-comment-header-tabs a[aria-current]', prop: 'background-color' }, { selector: '.mk-comment-header-tabs a:not([aria-current])', prop: 'background-color' } ] },
  { label: 'plain: no rule', selector: '.mk-comment-header[data-variant="plain"]', css: { 'border-bottom-width': '0px' } },

  { label: 'participants take their own row under the title', run: async (page) => {
    const r = await page.evaluate(() => { const p = document.querySelector('.mk-comment-header-people')!; const t = p.closest('.mk-comment-header')!.querySelector('.mk-comment-header-title')!.getBoundingClientRect(); return { below: p.getBoundingClientRect().top >= t.bottom, basis: getComputedStyle(p).flexBasis }; });
    if (!r.below || r.basis !== '100%') throw new Error(JSON.stringify(r));
  } },

]);
