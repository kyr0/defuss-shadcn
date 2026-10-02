import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: code-block is a CSS-only website block (Docs & Help) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('code-block', [
  { label: 'tabs: only the checked tab\'s code shows; switching is CSS-only', run: async (page) => {
    const before = await page.evaluate(() => [...document.querySelectorAll('.mk-code-block:not([data-variant]) pre')].map((p) => getComputedStyle(p).display).join());
    await page.click('.mk-code-block-tabs label:has(input[value="bun"])');
    const after = await page.evaluate(() => [...document.querySelectorAll('.mk-code-block:not([data-variant]) pre')].map((p) => getComputedStyle(p).display).join());
    if (before !== 'block,none,none' || after !== 'none,none,block') throw new Error(JSON.stringify({ before, after }));
  } },
  { label: 'file: numbered lines, highlighted ones tinted', run: async (page) => {
    const r = await page.evaluate(() => { const l = document.querySelector('.mk-code-block[data-variant="file"] code > span')!; const h = document.querySelector('.mk-code-block[data-variant="file"] [data-highlight]')!; return { n: getComputedStyle(l, '::before').content, hl: getComputedStyle(h).boxShadow.includes('inset') }; });
    if (r.n !== 'counter(mk-line)' || !r.hl) throw new Error(JSON.stringify(r));
  } },
  { label: 'inline: the prompt is CSS, not text', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-code-block[data-variant="inline"] code > span')!; return { before: getComputedStyle(s, '::before').content, text: s.textContent!.startsWith('$') }; });
    if (r.before !== '"$ "' || r.text) throw new Error(JSON.stringify(r));
  } },
]);
