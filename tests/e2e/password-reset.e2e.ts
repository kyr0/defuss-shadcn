import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: password-reset is a CSS-only website block (Account & States) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('password-reset', [
  { label: 'both fields are new-password with a minimum length', run: async (page) => {
    const r = await page.evaluate(() => ['pr-new', 'pr-confirm'].map((id) => { const i = document.getElementById(id) as HTMLInputElement; return i.autocomplete + i.minLength; }).join());
    if (r !== 'new-password12,new-password12') throw new Error(r);
  } },
  { label: 'done: a green check', selector: '.mk-password-reset[data-variant="done"] .mk-password-reset-icon', css: { color: 'rgb(21, 128, 61)' } },
]);
