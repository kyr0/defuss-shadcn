import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: media-gallery is a CSS-only website block (Media) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('media-gallery', [
  { label: 'grid by default: square crops', run: async (page) => {
    const r = await page.evaluate(() => ({ d: getComputedStyle(document.querySelector('.mk-media-gallery-grid')!).display, ar: getComputedStyle(document.querySelector('.mk-media-gallery-grid img')!).aspectRatio }));
    if (r.d !== 'grid' || r.ar !== '1 / 1') throw new Error(JSON.stringify(r));
  } },
  { label: 'masonry radio switches to CSS columns', run: async (page) => {
    await page.click('.mk-media-gallery-views label:has(input[value="masonry"])');
    const r = await page.evaluate(() => { const g = getComputedStyle(document.querySelector('.mk-media-gallery-grid')!); return { d: g.display, cols: g.columnWidth }; });
    if (r.d !== 'block' || r.cols !== '176px') throw new Error(JSON.stringify(r));
  } },
  { label: 'filmstrip radio switches to a snapping row', run: async (page) => {
    await page.click('.mk-media-gallery-views label:has(input[value="strip"])');
    const r = await page.evaluate(() => { const g = getComputedStyle(document.querySelector('.mk-media-gallery-grid')!); return { d: g.display, snap: g.scrollSnapType }; });
    if (r.d !== 'flex' || !r.snap.startsWith('x')) throw new Error(JSON.stringify(r));
  } },
  { label: 'slideshow: a modal dialog with a snapping track', run: async (page) => {
    await page.click('.mk-media-gallery-tools .btn');
    const r = await page.evaluate(() => { const d = document.getElementById('mg-viewer') as HTMLDialogElement; return { modal: d.matches(':modal'), snap: getComputedStyle(d.querySelector('.mk-media-gallery-track')!).scrollSnapType }; });
    await page.keyboard.press('Escape');
    if (!r.modal || !r.snap.startsWith('x')) throw new Error(JSON.stringify(r));
  } },
]);
