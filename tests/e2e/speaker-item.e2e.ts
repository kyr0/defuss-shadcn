import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: speaker-item is a CSS-only website block (Events & Promotions) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('speaker-item', [
  { label: 'default: a square grayscale portrait, color on hover', run: async (page) => {
    const sel = '.mk-speaker-item:not([data-variant])';
    const before = await page.$eval(`${sel} .mk-speaker-item-photo`, (e) => getComputedStyle(e).filter);
    await page.hover(sel);
    await page.waitForTimeout(400);
    const after = await page.$eval(`${sel} .mk-speaker-item-photo`, (e) => getComputedStyle(e).filter);
    if (!before.includes('grayscale') || after !== 'none') throw new Error(JSON.stringify({ before, after }));
  } },
  { label: 'featured: portrait beside the bio, a 28px name', run: async (page) => {
    const r = await page.evaluate(() => { const f = document.querySelector('.mk-speaker-item[data-variant="featured"]')!; return { size: getComputedStyle(f.querySelector('.mk-speaker-item-name')!).fontSize, beside: f.querySelector('.mk-speaker-item-body')!.getBoundingClientRect().left > f.querySelector('.mk-speaker-item-photo')!.getBoundingClientRect().right }; });
    if (r.size !== '28px' || !r.beside) throw new Error(JSON.stringify(r));
  } },
  { label: 'compact: a round 56px portrait', selector: '.mk-speaker-item[data-variant="compact"] .mk-speaker-item-photo', css: { width: '56px', 'border-top-left-radius': '50%' } },
]);
