import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: playlist-item is a CSS-only website block (Media) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('playlist-item', [
  { label: 'the checked track is highlighted and shows bars', run: async (page) => {
    const r = await page.evaluate(() => { const on = document.querySelector('.mk-playlist-item:has(input:checked)')!; return { bars: getComputedStyle(on.querySelector('.mk-playlist-item-bars')!).display, num: getComputedStyle(on.querySelector('.mk-playlist-item-index > span')!).display, anim: getComputedStyle(on.querySelector('.mk-playlist-item-bars b')!).animationName }; });
    if (r.bars !== 'flex' || r.num !== 'none' || r.anim !== 'mk-playlist-bars') throw new Error(JSON.stringify(r));
  } },
  { label: 'clicking a track selects it', run: async (page) => {
    await page.click('.mk-playlist-item:not([data-variant]):nth-child(4) label');
    const v = await page.evaluate(() => (document.querySelector('input[name="track"]:checked') as HTMLInputElement).value);
    if (v !== '4') throw new Error(v);
  } },
  { label: 'reduced motion: the bars stand still', run: async (page) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const a = await page.$eval('.mk-playlist-item:has(input:checked) .mk-playlist-item-bars b', (e) => getComputedStyle(e).animationName);
    await page.emulateMedia({ reducedMotion: null });
    if (a !== 'none') throw new Error(a);
  } },
  { label: 'episode: a 72px cover', selector: '.mk-playlist-item[data-variant="episode"] .mk-playlist-item-cover', css: { width: '72px' } },
]);
