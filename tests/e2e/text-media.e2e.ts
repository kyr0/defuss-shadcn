import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: text-media is a CSS-only website block (Media) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('text-media', [
  { label: 'default: text beside the media', run: async (page) => {
    const n = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-text-media:not([data-variant]) .mk-text-media-layout')!).gridTemplateColumns.split(' ').length);
    if (n !== 2) throw new Error(String(n));
  } },
  { label: 'reverse: media first', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-text-media[data-variant="reverse"]')!; return s.querySelector('.mk-text-media-media')!.getBoundingClientRect().left < s.querySelector('.mk-text-media-copy')!.getBoundingClientRect().left; });
    if (!r) throw new Error('media not first');
  } },
  { label: 'overlap: the card overlaps the picture', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-text-media[data-variant="overlap"]')!; const m = s.querySelector('.mk-text-media-media')!.getBoundingClientRect(); const c = s.querySelector('.mk-text-media-copy')!.getBoundingClientRect(); return { overlap: c.left < m.right, shadow: getComputedStyle(s.querySelector('.mk-text-media-copy')!).boxShadow !== 'none' }; });
    if (!r.overlap || !r.shadow) throw new Error(JSON.stringify(r));
  } },
]);
