import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: docs-content is a CSS-only website block (Docs & Help) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('docs-content', [
  { label: 'prose: a dark code block, muted inline code', run: async (page) => {
    const r = await page.evaluate(() => ({ pre: getComputedStyle(document.querySelector('.mk-docs-content-prose pre')!).backgroundColor, inline: getComputedStyle(document.querySelector('.mk-docs-content-prose p code')!).fontFamily !== getComputedStyle(document.querySelector('.mk-docs-content-prose p')!).fontFamily }));
    if (!r.pre.startsWith('oklch(0.18') || !r.inline) throw new Error(JSON.stringify(r));
  } },
  { label: 'callouts: three tones, each with a note role', run: async (page) => {
    const r = await page.evaluate(() => [...document.querySelectorAll('.mk-docs-content-callout')].map((c) => getComputedStyle(c).borderLeftColor + c.getAttribute('role')));
    if (new Set(r).size !== 3 || !r.every((x) => x.endsWith('note'))) throw new Error(r.join());
  } },
  { label: 'pager: previous and next with rel', run: async (page) => {
    const r = await page.evaluate(() => [...document.querySelectorAll('.mk-docs-content-pager a')].map((a) => a.getAttribute('rel')).join());
    if (r !== 'prev,next') throw new Error(r);
  } },
]);
