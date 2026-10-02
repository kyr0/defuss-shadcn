import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: tracking-status is a CSS-only website block (Shop) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('tracking-status', [
  { label: 'steps across with the line filled to the progress', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-tracking-status-steps')!; const li = [...s.children]; return { row: new Set(li.map((l) => Math.round(l.getBoundingClientRect().top))).size, fill: Math.round(parseFloat(getComputedStyle(s, '::after').width) / parseFloat(getComputedStyle(s, '::before').width) * 100) }; });
    if (r.row !== 1 || r.fill !== 66) throw new Error(JSON.stringify(r));
  } },
  { label: 'done steps are green with a check; the current one is marked', run: async (page) => {
    const r = await page.evaluate(() => ({ done: getComputedStyle(document.querySelector('[data-done] > .mk-tracking-status-dot')!).backgroundColor, cur: document.querySelector('.mk-tracking-status-steps [aria-current="step"] strong')!.textContent }));
    if (r.done !== 'rgb(22, 163, 74)' || r.cur !== 'Out for delivery') throw new Error(JSON.stringify(r));
  } },
  { label: 'compact: a bar filled by the custom property', run: async (page) => {
    const bg = await page.$eval('.mk-tracking-status-bar', (e) => getComputedStyle(e).backgroundImage);
    if (!bg.includes('66%')) throw new Error(bg);
  } },
]);
