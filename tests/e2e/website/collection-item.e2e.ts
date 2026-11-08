import { cssSmoke } from '../lib/css-smoke.ts';

/**
 * Why: collection-item is a CSS-only website block (Shop) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('collection-item', [
  { label: 'default: 4:5 picture, stretched title link', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-collection-item:not([data-variant])')!; return { ar: getComputedStyle(c.querySelector('img')!).aspectRatio, link: getComputedStyle(c.querySelector('.mk-collection-item-title a')!, '::after').position }; });
    if (r.ar !== '4 / 5' || r.link !== 'absolute') throw new Error(JSON.stringify(r));
  } },
  { label: 'overlay: white text over a scrim', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-collection-item[data-variant="overlay"]')!; return { color: getComputedStyle(c).color, pos: getComputedStyle(c.querySelector('.mk-collection-item-body')!).position }; });
    if (r.color !== 'rgb(255, 255, 255)' || r.pos !== 'absolute') throw new Error(JSON.stringify(r));
  } },
  { label: 'banner: 21:9 with a pill cue', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-collection-item[data-variant="banner"]')!; return { ar: getComputedStyle(c.querySelector('img')!).aspectRatio, pill: getComputedStyle(c.querySelector('.mk-collection-item-more')!).borderTopLeftRadius }; });
    if (r.ar !== '21 / 9' || r.pill !== '999px') throw new Error(JSON.stringify(r));
  } },
  { label: 'default hover: the card lifts and the picture casts a shadow', run: async (page) => {
    const sel = '.mk-collection-item:not([data-variant])';
    await page.hover(sel);
    await page.waitForTimeout(450);
    const r = await page.$eval(sel, (c) => ({ t: getComputedStyle(c).translate, shadow: getComputedStyle(c.querySelector('.mk-collection-item-media')!).boxShadow }));
    if (r.t !== '0px -4px' || r.shadow === 'none') throw new Error(JSON.stringify(r));
    await page.mouse.move(0, 0);
  } },
  { label: 'badge: a pill over the picture that lets clicks through; sale is red', run: async (page) => {
    const r = await page.evaluate(() => { const b = document.querySelector('.mk-collection-item-badge')!; const s = document.querySelector('.mk-collection-item-badge[data-tone="sale"]')!; return { pos: getComputedStyle(b).position, pe: getComputedStyle(b).pointerEvents, pill: getComputedStyle(b).borderTopLeftRadius, sale: getComputedStyle(s).backgroundColor }; });
    if (r.pos !== 'absolute' || r.pe !== 'none' || r.pill !== '999px' || r.sale !== 'rgb(220, 38, 38)') throw new Error(JSON.stringify(r));
  } },
  { label: 'overlay: the cue is hidden until hover', run: async (page) => {
    const sel = '.mk-collection-item[data-variant="overlay"]';
    const before = await page.$eval(sel, (c) => getComputedStyle(c.querySelector('.mk-collection-item-more')!).opacity);
    await page.hover(sel);
    await page.waitForTimeout(400);
    const after = await page.$eval(sel, (c) => getComputedStyle(c.querySelector('.mk-collection-item-more')!).opacity);
    if (before !== '0' || after !== '1') throw new Error(JSON.stringify({ before, after }));
    await page.mouse.move(0, 0);
  } },
  { label: 'stack: three prints on a tinted panel; the side ones fan out on hover', run: async (page) => {
    const sel = '.mk-collection-item[data-variant="stack"]';
    const read = () => page.$eval(sel, (c) => { const imgs = [...c.querySelectorAll('.mk-collection-item-media')]; return { n: imgs.length, area: getComputedStyle(imgs[0]!).gridArea, tint: getComputedStyle(c.querySelector('.mk-collection-item-stack')!).backgroundColor, rot: imgs.map((i) => getComputedStyle(i).rotate) }; });
    const before = await read();
    await page.hover(sel);
    await page.waitForTimeout(600);
    const after = await read();
    if (before.n !== 3 || !before.area.startsWith('1 / 1') || before.tint === 'rgba(0, 0, 0, 0)' || before.rot[0] !== '-9deg' || after.rot[0] !== '-15deg' || after.rot[1] !== '15deg') throw new Error(JSON.stringify({ before, after }));
  } },
]);
