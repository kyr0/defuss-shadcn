import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: help-category is a CSS-only website block (Docs & Help) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('help-category', [
  { label: 'the topic link covers the card; top articles sit above it', run: async (page) => {
    const r = await page.evaluate(() => ({ link: getComputedStyle(document.querySelector('.mk-help-category-title a')!, '::after').position, z: getComputedStyle(document.querySelector('.mk-help-category-top a')!).zIndex }));
    if (r.link !== 'absolute' || r.z !== '1') throw new Error(JSON.stringify(r));
  } },
  { label: 'clicking a top article targets that link, not the card', run: async (page) => {
    const r = await page.evaluate(() => { const a = document.querySelector('.mk-help-category-top a')!; const b = a.getBoundingClientRect(); const hit = document.elementFromPoint(b.left + 5, b.top + b.height / 2); return hit === a; });
    if (!r) throw new Error('covered');
  } },
  { label: 'compact: no description', selector: '.mk-help-category[data-variant="compact"] .mk-help-category-desc', css: { display: 'none' } },
]);
