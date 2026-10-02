import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: profile-form is a CSS-only website block (Account & States) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('profile-form', [
  { label: 'sections: description beside the fields', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-profile-form-section')!).gridTemplateColumns.split(' ')[0]);
    if (r !== '256px') throw new Error(r);
  } },
  { label: 'username: the prefix addon is part of the description', run: async (page) => {
    const r = await page.evaluate(() => document.getElementById('pf-user')!.getAttribute('aria-describedby'));
    if (!r?.includes('pf-user-prefix')) throw new Error(String(r));
  } },
  { label: 'actions stick to the bottom', selector: '.mk-profile-form-actions', css: { position: 'sticky' } },
]);
