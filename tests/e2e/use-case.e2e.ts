import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: use-case is a CSS-only website block (Company) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('use-case', [
  { label: 'default: copy beside the picture', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-use-case:not([data-variant]) .mk-use-case-layout')!).gridTemplateColumns.split(' ').length);
    if (r !== 2) throw new Error(String(r));
  } },
  { label: 'reverse: the picture comes first', run: async (page) => {
    const r = await page.evaluate(() => { const u = document.querySelector('.mk-use-case[data-variant="reverse"]')!; return u.querySelector('.mk-use-case-media')!.getBoundingClientRect().left < u.querySelector('.mk-use-case-copy')!.getBoundingClientRect().left; });
    if (!r) throw new Error('media not first');
  } },
  { label: 'metric: a rule in the chart color and a big number', run: async (page) => {
    const r = await page.evaluate(() => { const m = document.querySelector('.mk-use-case-metric')!; return { rule: getComputedStyle(m).borderLeftWidth, size: getComputedStyle(m.querySelector('strong')!).fontSize }; });
    if (r.rule !== '3px' || r.size !== '28px') throw new Error(JSON.stringify(r));
  } },
  { label: 'card: a bordered surface', selector: '.mk-use-case[data-variant="card"]', css: { 'border-top-width': '1px', 'padding-top': '28px' } },
]);
