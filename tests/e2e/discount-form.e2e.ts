import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: discount-form is a CSS-only website block (Shop) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('discount-form', [
  { label: 'format: an invalid code is rejected by the browser and shows the message', run: async (page) => {
    await page.fill('#dc-1', 'A!');
    await page.click('.mk-discount-form:has(#dc-1) button[type="submit"]');
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-discount-form:has(#dc-1) .mk-discount-form-error')!).display);
    if (r !== 'flex') throw new Error(r);
  } },
  { label: 'rejected: aria-invalid shows the message without interaction', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-discount-form:has(#dc-2) .mk-discount-form-error')!).display);
    if (r !== 'flex') throw new Error(r);
  } },
  { label: 'applied: a status chip with the saving', run: async (page) => {
    const r = await page.evaluate(() => { const a = document.querySelector('.mk-discount-form-applied')!; return { role: a.getAttribute('role'), border: getComputedStyle(a).borderTopStyle }; });
    if (r.role !== 'status' || r.border !== 'dashed') throw new Error(JSON.stringify(r));
  } },
  { label: 'collapsed: a closed details until asked', run: async (page) => {
    const r = await page.evaluate(() => (document.querySelector('details.mk-discount-form') as HTMLDetailsElement).open);
    if (r) throw new Error('open');
  } },
]);
