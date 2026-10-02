import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: help-article is a CSS-only website block (Docs & Help) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('help-article', [
  { label: 'steps: numbered circles from a counter', run: async (page) => {
    const r = await page.evaluate(() => { const li = document.querySelector('.mk-help-article-steps li')!; return { c: getComputedStyle(li, '::before').content, w: getComputedStyle(li, '::before').width }; });
    if (r.c !== 'counter(mk-help)' || r.w !== '32px') throw new Error(JSON.stringify(r));
  } },
  { label: 'still stuck: a closed details', run: async (page) => {
    const o = await page.evaluate(() => (document.querySelector('.mk-help-article-stuck') as HTMLDetailsElement).open);
    if (o) throw new Error('open');
  } },
  { label: 'helpful: answering shows the thank-you (Feedback Form)', run: async (page) => {
    await page.click('.mk-help-article .mk-feedback-form-yesno label:first-child');
    const d = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-help-article .mk-feedback-form-thanks')!).display);
    if (d !== 'block') throw new Error(d);
  } },
]);
