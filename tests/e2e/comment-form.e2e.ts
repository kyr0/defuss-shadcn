import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: comment-form is a CSS-only website block (Comments) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('comment-form', [
  { label: 'avatar beside the textarea; without one, the full width', run: async (page) => {
    const r = await page.evaluate(() => { const [a, g] = document.querySelectorAll('.mk-comment-form'); return [getComputedStyle(a).gridTemplateColumns.split(' ').length, getComputedStyle(g).gridTemplateColumns.split(' ').length]; });
    if (r.join() !== '2,1') throw new Error(`columns ${r}`);
  } },
  { label: 'the textarea grows with its text (field-sizing: content)', run: async (page) => {
    const sel = '.mk-comment-form:not([data-variant]) textarea';
    const before = await page.$eval(sel, (e) => e.getBoundingClientRect().height);
    await page.fill(sel, 'one\ntwo\nthree\nfour\nfive\nsix\nseven');
    const after = await page.$eval(sel, (e) => e.getBoundingClientRect().height);
    if (!(after > before + 30)) throw new Error(`${before} → ${after}`);
  } },
  { label: 'native validation: an empty submit is blocked', run: async (page) => {
    const v = await page.evaluate(() => { const f = document.querySelector('.mk-comment-form[aria-label="Leave a reply"]') as HTMLFormElement; return f.checkValidity(); });
    if (v !== false) throw new Error('form valid while empty');
  } },
  { label: 'guest fields share a row', run: async (page) => {
    const r = await page.evaluate(() => { const [a, b] = document.querySelectorAll('.mk-comment-form-fields > div'); return Math.abs(a.getBoundingClientRect().top - b.getBoundingClientRect().top) < 2; });
    if (!r) throw new Error('fields stacked');
  } },
  { label: 'reply: a smaller textarea', distinct: [ { selector: '.mk-comment-form[data-variant="reply"] textarea', prop: 'min-height' }, { selector: '.mk-comment-form:not([data-variant]) textarea', prop: 'min-height' } ] },

  { label: 'framed: one bordered box, the textarea without its own border', run: async (page) => {
    const r = await page.evaluate(() => { const f = document.querySelector('.mk-comment-form[data-variant="framed"]')!; return { box: getComputedStyle(f.querySelector('.mk-comment-form-main')!).borderTopWidth, ta: getComputedStyle(f.querySelector('textarea')!).borderTopWidth, bar: getComputedStyle(f.querySelector('.mk-comment-form-toolbar')!).borderBottomWidth }; });
    if (r.box !== '1px' || r.ta !== '0px' || r.bar !== '1px') throw new Error(JSON.stringify(r));
  } },
  { label: 'review: no stars blocks the post (native required on the radios)', run: async (page) => {
    const v = await page.evaluate(() => { const f = document.querySelector('form[aria-label="Write a review"]') as HTMLFormElement; (f.querySelector('textarea') as HTMLTextAreaElement).value = 'Great'; return f.checkValidity(); });
    if (v !== false) throw new Error('valid without a rating');
  } },

]);
