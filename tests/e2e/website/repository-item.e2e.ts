import { cssSmoke } from '../lib/css-smoke.ts';

/**
 * Why: repository-item is a CSS-only website block (Resume & Portfolio) - the fixture instantiates every documented
 * example; these checks pin what it promises: the name link covers the card, the language dot takes its colour
 * from data-language or its own `color`, the numbers line up at the bottom of a row of cards, and plain is a row.
 */
await cssSmoke('repository-item', [
  { label: 'a card: border and the large radius', selector: '.mk-repository-item:not([data-variant])', css: { 'border-top-width': '1px', position: 'relative' } },
  { label: 'the name link covers the whole card', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-repository-item')!; const b = c.getBoundingClientRect(); const hit = document.elementFromPoint(b.right - 6, b.bottom - 6); return hit?.closest('a')?.closest('.mk-repository-item-name') ? 'link' : hit?.className ?? 'nothing'; });
    if (r !== 'link') throw new Error(r);
  } },
  { label: 'data-language="css" paints the dot in the CSS colour', selector: '.mk-repository-item-language[data-language="css"]', css: { 'background-color': 'rgb(102, 51, 153)', width: '10px', 'border-top-left-radius': '50%' } },
  { label: 'a language without data-language: the dot\'s own color', selector: '.mk-repository-item-language:not([data-language])', css: { 'background-color': 'rgb(194, 45, 64)' } },
  { label: 'the languages differ', distinct: [ { selector: '.mk-repository-item-language[data-language="typescript"]', prop: 'background-color' }, { selector: '.mk-repository-item-language[data-language="javascript"]', prop: 'background-color' }, { selector: '.mk-repository-item-language[data-language="rust"]', prop: 'background-color' } ] },
  { label: 'stars and forks carry their word for screen readers only', run: async (page) => {
    const r = await page.$$eval('.mk-repository-item-stats .sr-only', (s) => s.map((e) => [e.textContent!.trim(), getComputedStyle(e).position]));
    if (!r.length || r.some(([t, p]) => !['stars', 'forks'].includes(t) || p !== 'absolute')) throw new Error(JSON.stringify(r));
  } },
  { label: 'a row of cards: equal heights, the numbers on one line at the bottom', run: async (page) => {
    const r = await page.evaluate(() => { const cards = [...document.querySelectorAll('section.fx:last-of-type .mk-repository-item')].slice(0, 2); return { heights: cards.map((c) => Math.round(c.getBoundingClientRect().height)), bottoms: cards.map((c) => Math.round(c.querySelector('.mk-repository-item-stats')!.getBoundingClientRect().bottom)) }; });
    if (r.heights[0] !== r.heights[1] || r.bottoms[0] !== r.bottoms[1]) throw new Error(JSON.stringify(r));
  } },
  { label: 'plain: no card - a rule below only', selector: '.mk-repository-item[data-variant="plain"]', css: { 'border-left-width': '0px', 'border-bottom-width': '1px', 'background-color': 'rgba(0, 0, 0, 0)' } },
]);
