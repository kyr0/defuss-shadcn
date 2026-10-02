import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: process-step is a CSS-only website block (Company) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('process-step', [
  { label: 'vertical: a 2px line from each number to the next step', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-process-steps:not([data-variant]) .mk-process-step')!; const b = getComputedStyle(s, '::before'); return { w: b.width, pos: b.position }; });
    if (r.w !== '2px' || r.pos !== 'absolute') throw new Error(JSON.stringify(r));
  } },
  { label: 'current: the number fills', run: async (page) => {
    const r = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('.mk-process-step[aria-current] .mk-process-step-number')!); const o = getComputedStyle(document.querySelector('.mk-process-step:not([aria-current]) .mk-process-step-number')!); return c.backgroundColor !== o.backgroundColor; });
    if (!r) throw new Error('current step not filled');
  } },
  { label: 'horizontal: steps on one row, the line along the top', run: async (page) => {
    const r = await page.evaluate(() => { const s = [...document.querySelectorAll('.mk-process-steps[data-variant="horizontal"] .mk-process-step')]; return { row: new Set(s.map((e) => Math.round(e.getBoundingClientRect().top))).size, h: getComputedStyle(s[0], '::before').height }; });
    if (r.row !== 1 || r.h !== '2px') throw new Error(JSON.stringify(r));
  } },
]);
