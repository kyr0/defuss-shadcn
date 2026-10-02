import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: security-settings is a CSS-only website block (Account & States) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('security-settings', [
  { label: 'rows: icon, text, action in three columns, hairline between', run: async (page) => {
    const r = await page.evaluate(() => { const rows = document.querySelectorAll('.mk-security-settings-row'); return { cols: getComputedStyle(rows[0]).gridTemplateColumns.split(' ').length, rule: getComputedStyle(rows[1]).borderTopWidth }; });
    if (r.cols !== 3 || r.rule !== '1px') throw new Error(JSON.stringify(r));
  } },
  { label: 'status chips: on green, off amber', run: async (page) => {
    const r = await page.evaluate(() => ['on', 'off'].map((s) => getComputedStyle(document.querySelector(`.mk-security-settings-status[data-status="${s}"]`)!).color).join());
    if (r !== 'rgb(21, 128, 61),rgb(180, 83, 9)') throw new Error(r);
  } },
  { label: 'two-factor is a switch; session actions are named', run: async (page) => {
    const r = await page.evaluate(() => ({ sw: document.getElementById('sec-2fa')!.getAttribute('role'), named: [...document.querySelectorAll('.mk-security-settings-list button')].every((b) => b.getAttribute('aria-label')?.startsWith('Sign out ')) }));
    if (r.sw !== 'switch' || !r.named) throw new Error(JSON.stringify(r));
  } },
]);
