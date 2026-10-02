import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: project-item is a CSS-only website block (Company) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('project-item', [
  { label: 'default: 4:3 picture, title link over the card', run: async (page) => {
    const r = await page.evaluate(() => { const p = document.querySelector('.mk-project-item:not([data-variant])')!; return { ar: getComputedStyle(p.querySelector('img')!).aspectRatio, link: getComputedStyle(p.querySelector('.mk-project-item-title a')!, '::after').position }; });
    if (r.ar !== '4 / 3' || r.link !== 'absolute') throw new Error(JSON.stringify(r));
  } },
  { label: 'overlay: caption hidden until hover', run: async (page) => {
    const sel = '.mk-project-item[data-variant="overlay"]';
    const before = await page.$eval(`${sel} .mk-project-item-body`, (e) => getComputedStyle(e).opacity);
    await page.hover(sel);
    await page.waitForTimeout(400);
    const after = await page.$eval(`${sel} .mk-project-item-body`, (e) => getComputedStyle(e).opacity);
    if (before !== '0' || after !== '1') throw new Error(JSON.stringify({ before, after }));
  } },
  { label: 'wide: a 21:9 picture', selector: '.mk-project-item[data-variant="wide"] img', css: { 'aspect-ratio': '21 / 9' } },
]);
