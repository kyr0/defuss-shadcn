import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: project-details is a CSS-only website block (Company) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('project-details', [
  { label: 'facts: a ruled row of label/value pairs', run: async (page) => {
    const r = await page.evaluate(() => { const d = document.querySelector('.mk-project-details-facts')!; return { rule: getComputedStyle(d).borderTopWidth, cols: new Set([...d.children].map((c) => Math.round(c.getBoundingClientRect().top))).size }; });
    if (r.rule !== '1px' || r.cols !== 1) throw new Error(JSON.stringify(r));
  } },
  { label: 'brief: beside the deliverables', run: async (page) => {
    const n = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-project-details-brief')!).gridTemplateColumns.split(' ').length);
    if (n !== 2) throw new Error(String(n));
  } },
  { label: 'gallery: dense grid, wide and tall spans', run: async (page) => {
    const r = await page.evaluate(() => { const g = document.querySelector('.mk-project-details-gallery')!; return { flow: getComputedStyle(g).gridAutoFlow, wide: getComputedStyle(g.querySelector('[data-span="wide"]')!).gridColumnStart, tall: getComputedStyle(g.querySelector('[data-span="tall"]')!).gridRowStart }; });
    if (!r.flow.includes('dense') || r.wide !== 'span 2' || r.tall !== 'span 2') throw new Error(JSON.stringify(r));
  } },
]);
