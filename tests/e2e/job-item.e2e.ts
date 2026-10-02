import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: job-item is a CSS-only website block (Company) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('job-item', [
  { label: 'row: a rule below, the title link stretched over the row', run: async (page) => {
    const r = await page.evaluate(() => { const j = document.querySelector('.mk-job-item:not([data-variant])')!; const a = j.querySelector('.mk-job-item-title a')!; return { rule: getComputedStyle(j).borderBottomWidth, pos: getComputedStyle(a, '::after').position, w: Math.round(parseFloat(getComputedStyle(a, '::after').width)) === Math.round(j.getBoundingClientRect().width) }; });
    if (r.rule !== '1px' || r.pos !== 'absolute' || !r.w) throw new Error(JSON.stringify(r));
  } },
  { label: 'row: salary and date aligned to the end', selector: '.mk-job-item:not([data-variant]) .mk-job-item-side', css: { 'text-align': 'end' } },
  { label: 'card: bordered card, stacked', selector: '.mk-job-item[data-variant="card"]', css: { 'flex-direction': 'column', 'border-top-width': '1px', 'padding-top': '24px' } },
]);
