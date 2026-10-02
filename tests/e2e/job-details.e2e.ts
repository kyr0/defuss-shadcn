import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: job-details is a CSS-only website block (Company) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('job-details', [
  { label: 'layout: description and a sticky summary side by side', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-job-details-summary')!; const b = document.querySelector('.mk-job-details-body')!.getBoundingClientRect(); return { pos: getComputedStyle(s).position, beside: s.getBoundingClientRect().left > b.right, w: Math.round(s.getBoundingClientRect().width) }; });
    if (r.pos !== 'sticky' || !r.beside || r.w !== 288) throw new Error(JSON.stringify(r));
  } },
  { label: 'lists: a check icon before each line', run: async (page) => {
    const bg = await page.$eval('.mk-job-details-list li', (e) => getComputedStyle(e, '::before').backgroundImage);
    if (!bg.includes('svg')) throw new Error(bg);
  } },
  { label: 'benefits: tiles on a muted surface', selector: '.mk-job-details-benefits li', css: { display: 'flex', 'padding-top': '14px' } },
]);
