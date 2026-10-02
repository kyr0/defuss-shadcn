import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: article-body is a CSS-only website block (Article) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('article-body', [
  { label: 'one readable measure: 42rem (672px), 17px / 1.75', selector: '.mk-article-body:not([data-variant]):not([data-size])', css: { 'max-width': '672px', 'font-size': '17px', 'line-height': '29.75px' } },
  { label: 'plain elements are styled: blockquote rule, code chip, hr line - code is a Code Mockup', run: async (page) => {
    const r = await page.evaluate(() => { const b = document.querySelector('section.fx:nth-of-type(2) .mk-article-body')!; const cs = (s: string) => getComputedStyle(b.querySelector(s)!); return [cs('blockquote').borderLeftWidth, cs('p > code').fontFamily !== cs('p').fontFamily, (b.querySelector(':scope > .mockup-code') ? 'mockup' : 'bare'), cs('hr').height]; });
    if (r.join() !== '3px,true,mockup,1px') throw new Error(`got ${r}`);
  } },
  { label: 'h2 opens a section with more space above than below', run: async (page) => {
    const r = await page.evaluate(() => { const h = getComputedStyle(document.querySelector('.mk-article-body h2')!); return [parseFloat(h.marginTop), parseFloat(h.marginBottom)]; });
    if (!(r[0] > 40 && r[1] === 0)) throw new Error(`margins ${r}`);
  } },
  { label: 'the callout and the table', run: async (page) => {
    const r = await page.evaluate(() => ({ note: getComputedStyle(document.querySelector('.mk-article-body-note')!).borderLeftWidth, table: getComputedStyle(document.querySelector('.mk-article-body > table')!).overflowX }));
    if (r.note !== '3px' || r.table !== 'auto') throw new Error(JSON.stringify(r));
  } },
  { label: 'serif variant and the drop cap', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-article-body[data-variant="serif"]')!; return { serif: getComputedStyle(s).fontFamily !== getComputedStyle(s.querySelector('h2')!).fontFamily, cap: getComputedStyle(s.querySelector('p')!, '::first-letter').float }; });
    if (!r.serif || !['left', 'inline-start'].includes(r.cap)) throw new Error(JSON.stringify(r));
  } },
  { label: 'sizes: sm 15px, lg 19px', run: async (page) => {
    const r = await page.evaluate(() => ['sm', 'lg'].map((v) => getComputedStyle(document.querySelector(`.mk-article-body[data-size="${v}"]`)!).fontSize));
    if (r.join() !== '15px,19px') throw new Error(`got ${r}`);
  } },

  { label: 'components keep their own look: the mockup pre gets no prose border, the table is the Table component', run: async (page) => {
    const r = await page.evaluate(() => ({ pre: getComputedStyle(document.querySelector('.mk-article-body .mockup-code pre')!).borderTopWidth, table: getComputedStyle(document.querySelector('.mk-article-body .table')!).display }));
    if (r.pre !== '0px' || r.table !== 'table') throw new Error(JSON.stringify(r));
  } },
  { label: 'heading anchors are not styled as prose links', distinct: [ { selector: '.mk-article-body .heading-anchor', prop: 'text-decoration-line' }, { selector: '.mk-article-body p a:not([class])', prop: 'text-decoration-line' } ] },
  { label: 'lead, pull quote and footnotes', run: async (page) => {
    const r = await page.evaluate(() => ({ lead: getComputedStyle(document.querySelector('.mk-article-body-lead')!).fontSize, pq: getComputedStyle(document.querySelector('.mk-article-body-pullquote')!).fontFamily !== getComputedStyle(document.querySelector('.mk-article-body-lead')!).fontFamily, ref: getComputedStyle(document.querySelector('.mk-article-body-ref')!).verticalAlign }));
    if (r.lead !== '21.25px' || !r.pq || r.ref !== 'super') throw new Error(JSON.stringify(r));
  } },
  { label: 'the footnote ref jumps to the note, which lights up (:target)', run: async (page) => {
    await page.click('.mk-article-body-ref a');
    const bg = await page.evaluate(() => getComputedStyle(document.getElementById('fn-1')!).backgroundColor);
    if (bg === 'rgba(0, 0, 0, 0)') throw new Error('note not highlighted');
  } },
  { label: 'layout: the TOC beside the text at a wide viewport; the progress bar is scroll-driven', run: async (page) => {
    const r = await page.evaluate(() => { const l = document.querySelector('.mk-article-body-layout')!; const p = getComputedStyle(document.querySelector('.mk-article-body-progress')!); return { cols: getComputedStyle(l).gridTemplateColumns.split(' ').length, toc: getComputedStyle(l.querySelector('.toc')!).position, anim: p.animationName }; });
    if (r.cols !== 2 || r.toc !== 'sticky' || r.anim !== 'mk-article-body-read') throw new Error(JSON.stringify(r));
  } },

]);
