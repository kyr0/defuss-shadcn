import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: comment-item is a CSS-only website block (Comments) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('comment-item', [
  { label: 'avatar beside the main column; replies nest in an ordered list on a thread line', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.getElementById('c-1')!; const a = c.querySelector(':scope > .avatar')!.getBoundingClientRect(); const m = c.querySelector(':scope > .mk-comment-item-main')!.getBoundingClientRect(); const rep = c.querySelector(':scope > .mk-comment-item-replies')!; return { beside: m.left >= a.right, list: rep.tagName, line: getComputedStyle(rep).borderLeftWidth, nested: rep.querySelectorAll('.mk-comment-item').length, indent: rep.getBoundingClientRect().left >= m.left - 1 }; });
    if (!r.beside || r.list !== 'OL' || r.line !== '2px' || r.nested !== 2 || !r.indent) throw new Error(JSON.stringify(r));
  } },
  { label: 'the timestamp is a permalink to the comment id', run: async (page) => {
    const h = await page.evaluate(() => document.querySelector('#c-2 .mk-comment-item-time')!.getAttribute('href'));
    if (h !== '#c-2') throw new Error(String(h));
  } },
  { label: ':target highlights the permalinked comment', run: async (page) => {
    await page.click('#c-3 .mk-comment-item-time');
    const r = await page.evaluate(() => [getComputedStyle(document.getElementById('c-3')!).backgroundColor, getComputedStyle(document.getElementById('c-2')!).backgroundColor]);
    if (r[0] === r[1]) throw new Error(`no highlight: ${r}`);
  } },
  { label: 'data-highlighted tints too', distinct: [ { selector: '#c-4', prop: 'background-color' }, { selector: '#c-5', prop: 'background-color' } ] },
  { label: 'compact text is 14px; deleted text is italic', run: async (page) => {
    const r = await page.evaluate(() => [getComputedStyle(document.querySelector('#c-5 .mk-comment-item-body')!).fontSize, getComputedStyle(document.querySelector('#c-6 .mk-comment-item-body')!).fontStyle]);
    if (r.join() !== '14px,italic') throw new Error(`got ${r}`);
  } },

  { label: 'reactions: pressed chips are tinted; the menu sits at the head end', run: async (page) => {
    const r = await page.evaluate(() => { const re = document.querySelector('.mk-comment-item-reactions')!; const bg = (s: string) => getComputedStyle(re.querySelector(s)!).backgroundColor; const head = document.querySelector('#r-1 .mk-comment-item-head')!; const m = head.querySelector('.mk-comment-item-menu')!.getBoundingClientRect(); return { tint: bg('[aria-pressed="true"]') !== bg('[aria-pressed="false"]'), end: Math.abs(m.right - head.getBoundingClientRect().right) < 2 }; });
    if (!r.tint || !r.end) throw new Error(JSON.stringify(r));
  } },
  { label: 'voted: the score column comes before the avatar', run: async (page) => {
    const r = await page.evaluate(() => { const q = document.getElementById('q-1')!; return q.querySelector('.mk-comment-item-votes')!.getBoundingClientRect().right <= q.querySelector(':scope > .avatar')!.getBoundingClientRect().left; });
    if (!r) throw new Error('votes not before the avatar');
  } },
  { label: 'accepted: a 3px green rail', selector: '.mk-comment-item[data-variant="accepted"]', css: { 'border-left-width': '3px' } },
  { label: 'collapsed replies open natively', run: async (page) => {
    await page.click('.mk-comment-item-thread > summary');
    const r = await page.evaluate(() => { const d = document.querySelector('.mk-comment-item-thread') as HTMLDetailsElement; return { open: d.open, vis: d.querySelector('.mk-comment-item')!.getBoundingClientRect().height > 0 }; });
    if (!r.open || !r.vis) throw new Error(JSON.stringify(r));
  } },

]);
