import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: error-state is a CSS-only website block (Account & States) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('error-state', [
  { label: 'default: an alert with a destructive icon and details', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-error-state:not([data-variant])')!; return { role: s.getAttribute('role'), details: !!s.querySelector('details pre code') }; });
    if (r.role !== 'alert' || !r.details) throw new Error(JSON.stringify(r));
  } },
  { label: 'inline: a tinted row', selector: '.mk-error-state[data-variant="inline"]', css: { 'border-top-width': '1px', 'text-align': 'start' } },
  { label: 'page: a large outlined code, no icon', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-error-state[data-variant="page"]')!; return { icon: !s.querySelector('.mk-error-state-icon'), stroke: getComputedStyle(s.querySelector('.mk-error-state-code')!).webkitTextStrokeWidth }; });
    if (!r.icon || r.stroke !== '2px') throw new Error(JSON.stringify(r));
  } },
]);
