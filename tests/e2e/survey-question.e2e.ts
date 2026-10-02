import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: survey-question is a CSS-only website block (Account & States) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('survey-question', [
  { label: 'progress shows the position', run: async (page) => {
    const v = await page.evaluate(() => (document.querySelector('.mk-survey-question-meta progress') as HTMLProgressElement).value);
    if (v !== 3) throw new Error(String(v));
  } },
  { label: 'the checked option is highlighted', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-survey-question-option:has(:checked)')!).borderTopColor !== getComputedStyle(document.querySelector('.mk-survey-question-option:not(:has(:checked))')!).borderTopColor);
    if (!r) throw new Error('not highlighted');
  } },
  { label: 'scale: five steps on one row', run: async (page) => {
    const n = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-survey-question-scale')!).gridTemplateColumns.split(' ').length);
    if (n !== 5) throw new Error(String(n));
  } },
  { label: 'multiple: the hint describes the fieldset', run: async (page) => {
    const r = await page.evaluate(() => document.querySelector('.mk-survey-question[data-variant="multiple"] fieldset')!.getAttribute('aria-describedby'));
    if (r !== 'sq-hint') throw new Error(String(r));
  } },
]);
