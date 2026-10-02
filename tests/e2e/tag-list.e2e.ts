import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: tag-list is a CSS-only website block (Search & Navigation) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('tag-list', [
  { label: 'default: outlined pills', selector: '.mk-tag-list:not([data-variant]) a', css: { 'border-top-width': '1px', 'border-top-left-radius': '999px' } },
  { label: 'plain: the # is decorative CSS', run: async (page) => {
    const r = await page.evaluate(() => { const a = document.querySelector('.mk-tag-list[data-variant="plain"] a')!; return { before: getComputedStyle(a, '::before').content, text: a.textContent }; });
    if (!r.before.startsWith('"#"') || r.text !== 'calmsoftware') throw new Error(JSON.stringify(r));
  } },
  { label: 'colored: each tag its own tint', run: async (page) => {
    const r = await page.evaluate(() => new Set([...document.querySelectorAll('.mk-tag-list[data-variant="colored"] a')].map((a) => getComputedStyle(a).backgroundColor)).size);
    if (r !== 4) throw new Error(String(r));
  } },
]);
