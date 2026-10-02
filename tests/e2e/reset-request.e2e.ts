import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: reset-request is a CSS-only website block (Account & States) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('reset-request', [
  { label: 'default: an icon circle and one required email field', run: async (page) => {
    const r = await page.evaluate(() => ({ icon: getComputedStyle(document.querySelector('.mk-reset-request-icon')!).borderTopLeftRadius, req: (document.getElementById('rr-email') as HTMLInputElement).required }));
    if (r.icon !== '50%' || !r.req) throw new Error(JSON.stringify(r));
  } },
  { label: 'sent: a status with a green icon', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-reset-request[data-variant="sent"]')!; return { role: s.getAttribute('role'), color: getComputedStyle(s.querySelector('.mk-reset-request-icon')!).color }; });
    if (r.role !== 'status' || r.color !== 'rgb(21, 128, 61)') throw new Error(JSON.stringify(r));
  } },
]);
