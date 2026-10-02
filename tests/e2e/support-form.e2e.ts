import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: support-form is a CSS-only website block (Account & States) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('support-form', [
  { label: 'layout: form beside the help aside', run: async (page) => {
    const n = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-support-form-layout')!).gridTemplateColumns.split(' ').length);
    if (n !== 2) throw new Error(String(n));
  } },
  { label: 'priority: a segmented radio group; choosing urgent turns it red', run: async (page) => {
    await page.click('.mk-support-form-priority label:has(input[value="urgent"])');
    const r = await page.evaluate(() => { const l = document.querySelector('.mk-support-form-priority label:has(:checked)')!; return { v: (l.querySelector('input') as HTMLInputElement).value, color: getComputedStyle(l).color !== getComputedStyle(document.querySelector('.mk-support-form-priority label:not(:has(:checked))')!).color }; });
    if (r.v !== 'urgent' || !r.color) throw new Error(JSON.stringify(r));
  } },
  { label: 'attachments: a multiple file input in a dashed zone', run: async (page) => {
    const r = await page.evaluate(() => ({ m: (document.getElementById('sp-files') as HTMLInputElement).multiple, b: getComputedStyle(document.querySelector('.mk-support-form-drop')!).borderTopStyle }));
    if (!r.m || r.b !== 'dashed') throw new Error(JSON.stringify(r));
  } },
]);
