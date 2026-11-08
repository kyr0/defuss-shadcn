import { cssSmoke } from '../lib/css-smoke.ts';

/**
 * Why: portfolio-grid is a CSS-only website block (Resume & Portfolio) - the fixture instantiates every documented
 * example; these checks pin what each arrangement promises: the mosaic's spans and their fold when narrow, the
 * masonry columns, the tilted polaroids that straighten, the strip that scrolls and snaps, the index whose picture
 * shows for the keyboard as for the pointer, the shape utilities winning over the block's radius, and stillness
 * under reduced motion.
 */
const grid = (v: string) => (v ? `.mk-portfolio-grid[data-variant="${v}"]` : '.mk-portfolio-grid:not([data-variant])');

await cssSmoke('portfolio-grid', [
  { label: 'bento: big spans two by two, tall two rows, wide two columns', run: async (page) => {
    const r = await page.evaluate(() => {
      const g = document.querySelector('.mk-portfolio-grid:not([data-variant])')!;
      const box = (s: string) => g.querySelector(s)!.getBoundingClientRect();
      const one = box('.mk-portfolio-grid-item:not([data-span])');
      const big = box('[data-span="big"]'), tall = box('[data-span="tall"]'), wide = box('[data-span="wide"]');
      return { big: [big.width / one.width, big.height / one.height], tall: tall.height / one.height, wide: wide.width / one.width, row: Math.round(one.height) };
    });
    const two = (n: number) => n > 2 && n < 2.2;
    if (!two(r.big[0]) || !two(r.big[1]) || !two(r.tall) || !two(r.wide) || r.row !== 192) throw new Error(JSON.stringify(r));
  } },
  { label: 'bento: the caption sits over the picture, on its bottom edge', run: async (page) => {
    const r = await page.evaluate(() => { const l = document.querySelector('.mk-portfolio-grid:not([data-variant]) .mk-portfolio-grid-link')!; const c = l.querySelector('.mk-portfolio-grid-caption')!; return { pos: getComputedStyle(c).position, bottom: Math.abs(c.getBoundingClientRect().bottom - l.getBoundingClientRect().bottom), color: getComputedStyle(c).color }; });
    if (r.pos !== 'absolute' || r.bottom > 1 || r.color !== 'rgb(255, 255, 255)') throw new Error(JSON.stringify(r));
  } },
  { label: 'bento: narrow, every span folds into the one column - nothing overflows', run: async (page) => {
    const r = await page.evaluate(() => { const g = document.querySelector('.mk-portfolio-grid:not([data-variant])') as HTMLElement; g.style.width = '320px'; const big = g.querySelector('[data-span="big"]')!.getBoundingClientRect().width; const out = { big: Math.round(big), width: g.clientWidth, overflow: g.scrollWidth > g.clientWidth }; g.style.width = ''; return out; });
    if (r.big !== r.width || r.overflow) throw new Error(JSON.stringify(r));
  } },
  { label: 'bento: hover zooms the picture', run: async (page) => {
    await page.hover(`${grid('')} .mk-portfolio-grid-link`);
    await page.waitForTimeout(700);
    const s = await page.$eval(`${grid('')} .mk-portfolio-grid-media`, (m) => getComputedStyle(m).scale);
    await page.mouse.move(0, 0);
    if (s !== '1.06') throw new Error(s);
  } },
  { label: 'masonry: columns of 15rem, items never split, the caption under the picture', run: async (page) => {
    const r = await page.evaluate(() => { const g = document.querySelector('.mk-portfolio-grid[data-variant="masonry"]')!; const i = g.querySelector('.mk-portfolio-grid-item')!; return { cols: getComputedStyle(g).columnWidth, brk: getComputedStyle(i).breakInside, cap: getComputedStyle(i.querySelector('.mk-portfolio-grid-caption')!).position }; });
    if (r.cols !== '240px' || r.brk !== 'avoid' || r.cap !== 'static') throw new Error(JSON.stringify(r));
  } },
  { label: 'scatter: polaroids tilted differently; hover or focus straightens and lifts one', run: async (page) => {
    const tilts = await page.$$eval(`${grid('scatter')} .mk-portfolio-grid-link`, (ls) => [...new Set(ls.map((l) => getComputedStyle(l).rotate))]);
    if (tilts.length < 3) throw new Error(JSON.stringify(tilts));
    await page.focus(`${grid('scatter')} .mk-portfolio-grid-item:nth-child(2) .mk-portfolio-grid-link`);
    await page.waitForTimeout(400);
    const r = await page.$eval(`${grid('scatter')} .mk-portfolio-grid-item:nth-child(2) .mk-portfolio-grid-link`, (l) => [getComputedStyle(l).rotate, getComputedStyle(l).scale, getComputedStyle(l.parentElement!).zIndex]);
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    if (r.join() !== '0deg,1.06,1') throw new Error(JSON.stringify(r));
  } },
  { label: 'strip: one row that scrolls sideways and snaps', run: async (page) => {
    const r = await page.evaluate(() => { const g = document.querySelector('.mk-portfolio-grid[data-variant="strip"]')!; const tops = [...g.querySelectorAll('.mk-portfolio-grid-item')].map((i) => Math.round(i.getBoundingClientRect().top)); return { row: new Set(tops).size, snap: getComputedStyle(g).scrollSnapType, align: getComputedStyle(g.querySelector('.mk-portfolio-grid-item')!).scrollSnapAlign, scrolls: g.scrollWidth > g.clientWidth, overflow: getComputedStyle(g).overflowX }; });
    if (r.row !== 1 || r.snap !== 'x mandatory' || r.align !== 'start' || !r.scrolls || r.overflow !== 'auto') throw new Error(JSON.stringify(r));
  } },
  { label: 'index: numbered rows; the picture hidden until the row is pointed at or focused', run: async (page) => {
    const sel = `${grid('index')} .mk-portfolio-grid-item:nth-child(2)`;
    const before = await page.$eval(`${sel} .mk-portfolio-grid-media`, (m) => getComputedStyle(m).opacity);
    const num = await page.$eval(`${sel} .mk-portfolio-grid-link`, (l) => getComputedStyle(l, '::before').content);
    await page.focus(`${sel} .mk-portfolio-grid-link`);
    await page.waitForTimeout(400);
    const after = await page.$eval(`${sel} .mk-portfolio-grid-media`, (m) => getComputedStyle(m).opacity);
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await page.hover(`${grid('index')} .mk-portfolio-grid-item:nth-child(3) .mk-portfolio-grid-title`);
    await page.waitForTimeout(400);
    const hovered = await page.$eval(`${grid('index')} .mk-portfolio-grid-item:nth-child(3) .mk-portfolio-grid-media`, (m) => getComputedStyle(m).opacity);
    await page.mouse.move(0, 0);
    if (before !== '0' || after !== '1' || hovered !== '1' || !num.startsWith('counter(')) throw new Error(JSON.stringify({ before, after, hovered, num }));
  } },
  { label: 'index: narrow, each row shows its picture as a 4rem thumbnail', run: async (page) => {
    await page.evaluate(() => { (document.querySelector('.mk-portfolio-grid[data-variant="index"]') as HTMLElement).style.width = '360px'; });
    // the picture fades in (the index's opacity transition) - read it once the transition has run
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => { const g = document.querySelector('.mk-portfolio-grid[data-variant="index"]') as HTMLElement; const cs = getComputedStyle(g.querySelector('.mk-portfolio-grid-media')!); const out = [cs.position, cs.opacity, cs.width]; g.style.width = ''; return out; });
    if (r.join() !== 'static,1,64px') throw new Error(JSON.stringify(r));
  } },
  { label: 'shape utilities win over the block\'s radius: a blob, a hexagon, cut corners (corner-shape: bevel - computed as superellipse(0) - where supported, else a clip-path)', run: async (page) => {
    const r = await page.evaluate(() => { const cs = (c: string) => getComputedStyle(document.querySelector(`.mk-portfolio-grid-link.${c}`)!); return { blob: cs('corner-blob').borderTopLeftRadius, hex: cs('shape-hexagon').clipPath.startsWith('polygon'), cut: cs('cut-corners').clipPath.startsWith('polygon') || /^(bevel|superellipse\(0\))$/.test(cs('cut-corners').getPropertyValue('corner-shape')) }; });
    if (r.blob !== '63% 55%' || !r.hex || !r.cut) throw new Error(JSON.stringify(r));
  } },
  { label: 'reduced motion: no zoom, no tilt animation', run: async (page) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const r = await page.evaluate(() => [getComputedStyle(document.querySelector('.mk-portfolio-grid-media')!).transitionDuration, getComputedStyle(document.querySelector('.mk-portfolio-grid[data-variant="scatter"] .mk-portfolio-grid-link')!).transitionDuration]);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    if (r.some((d) => !/^0s(, 0s)*$/.test(d))) throw new Error(JSON.stringify(r));
  } },
]);
