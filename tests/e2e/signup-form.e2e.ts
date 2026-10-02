import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: signup-form is a CSS-only website block (Account & States) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('signup-form', [
  { label: 'new-password autocomplete with rules as its description', run: async (page) => {
    const r = await page.evaluate(() => { const p = document.getElementById('su-pass')!; return p.getAttribute('autocomplete') + '|' + document.getElementById(p.getAttribute('aria-describedby')!)!.tagName; });
    if (r !== 'new-password|UL') throw new Error(r);
  } },
  { label: 'a valid entry turns the field green (:user-valid)', run: async (page) => {
    await page.fill('#su-email', 'anna@example.com');
    await page.click('#su-name');
    await page.waitForTimeout(300);
    const c = await page.$eval('#su-email', (e) => getComputedStyle(e).borderTopColor);
    if (c !== 'rgb(22, 163, 74)') throw new Error(c);
  } },
  { label: 'split: pitch beside the form', run: async (page) => {
    const n = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-signup-form-layout')!).gridTemplateColumns.split(' ').length);
    if (n !== 2) throw new Error(String(n));
  } },
]);
