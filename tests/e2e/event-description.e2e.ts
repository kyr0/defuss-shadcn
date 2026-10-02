import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: event-description is a CSS-only website block (Events & Promotions) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('event-description', [
  { label: 'layout: description beside a sticky 20rem facts card', run: async (page) => {
    const r = await page.evaluate(() => { const f = document.querySelector('.mk-event-description-facts')!; return { pos: getComputedStyle(f).position, w: Math.round(f.getBoundingClientRect().width) }; });
    if (r.pos !== 'sticky' || r.w !== 320) throw new Error(JSON.stringify(r));
  } },
  { label: 'capacity: a labelled meter', run: async (page) => {
    const r = await page.evaluate(() => { const m = document.querySelector('.mk-event-description-capacity meter') as HTMLMeterElement; return { v: m.value, label: m.labels.length }; });
    if (r.v !== 320 || r.label !== 1) throw new Error(JSON.stringify(r));
  } },
  { label: 'audience: pills; takeaways: checks', run: async (page) => {
    const r = await page.evaluate(() => ({ pill: getComputedStyle(document.querySelector('.mk-event-description-audience li')!).borderTopLeftRadius, n: document.querySelectorAll('.mk-event-description-takeaways li').length }));
    if (r.pill !== '999px' || r.n !== 4) throw new Error(JSON.stringify(r));
  } },
]);
