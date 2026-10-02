import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: notification-settings is a CSS-only website block (Account & States) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('notification-settings', [
  { label: 'matrix: every checkbox names its topic and channel', run: async (page) => {
    const r = await page.evaluate(() => [...document.querySelectorAll('.mk-notification-settings table .checkbox')].map((c) => c.getAttribute('aria-label')));
    if (r.length !== 12 || r[0] !== 'Mentions by Email' || r.some((x) => !x)) throw new Error(JSON.stringify(r));
  } },
  { label: 'matrix: row and column headers', run: async (page) => {
    const r = await page.evaluate(() => ({ cols: document.querySelectorAll('.mk-notification-settings thead th[scope="col"]').length, rows: document.querySelectorAll('.mk-notification-settings tbody th[scope="row"]').length }));
    if (r.cols !== 4 || r.rows !== 4) throw new Error(JSON.stringify(r));
  } },
  { label: 'list: a switch per topic', run: async (page) => {
    const n = await page.evaluate(() => document.querySelectorAll('.mk-notification-settings[data-variant="list"] [role="switch"]').length);
    if (n !== 3) throw new Error(String(n));
  } },
]);
