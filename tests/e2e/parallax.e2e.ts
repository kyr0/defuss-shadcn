import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: parallax is CSS-only - view timelines drive everything. These checks
 * scroll the fixture's boxes and read the computed translate / scale /
 * opacity: planes travel in opposite directions, a sticky stage pins while
 * its layers zoom and words pass, drifting columns slide past each other,
 * reveals go from hidden to shown, and reduced motion leaves it all still.
 */
type P = import('playwright').Page;
const ty = (page: P, sel: string) => page.$eval(sel, (e) => { const t = getComputedStyle(e).translate; return t === 'none' ? 0 : parseFloat(t.split(' ')[1] ?? '0'); });
const scrollBox = async (page: P, i: number, to: 'top' | 'bottom' | number) => {
  await page.$eval(`#fx-${i} > div`, (b, v) => { b.scrollTop = v === 'top' ? 0 : v === 'bottom' ? b.scrollHeight : (v as number); }, to);
  await page.waitForTimeout(150);
};

await cssSmoke('parallax', [
  {
    label: 'the scene is a view timeline; layers are absolutely placed planes',
    run: async (page) => {
      const r = await page.evaluate(() => { const s = document.querySelector('#fx-0 .parallax')!; const l = s.querySelector('.parallax-layer')!; return { tl: getComputedStyle(s).viewTimelineName, pos: getComputedStyle(l).position, anim: getComputedStyle(l).animationName, speed: getComputedStyle(l).getPropertyValue('--parallax-speed').trim() }; });
      if (r.tl !== '--parallax' || r.pos !== 'absolute' || r.anim !== 'parallax-shift' || r.speed !== '60%') throw new Error(JSON.stringify(r));
    },
  },
  {
    label: 'seven planes: the sky (60%) and the trees (-18%) travel in opposite directions',
    run: async (page) => {
      const sky = '#fx-0 .parallax-layer:first-child';
      const trees = '#fx-0 .parallax-layer:last-child';
      await scrollBox(page, 0, 'top');
      const [s0, t0] = [await ty(page, sky), await ty(page, trees)];
      await scrollBox(page, 0, 'bottom');
      const [s1, t1] = [await ty(page, sky), await ty(page, trees)];
      if (!(s1 > s0 + 50) || !(t1 < t0 - 20)) throw new Error(JSON.stringify({ s0, s1, t0, t1 }));
    },
  },
  {
    label: 'sticky: the stage pins while the scene scrolls; the star field zooms and the words pass in turn',
    run: async (page) => {
      const read = () => page.evaluate(() => { const box = document.querySelector('#fx-1 > div')!; const stage = box.querySelector('.parallax-stage')!; const zoom = box.querySelector('.parallax-layer[data-motion="zoom"]')!; const words = [...box.querySelectorAll('.parallax-layer[data-motion="pass"]')].map((w) => +parseFloat(getComputedStyle(w).opacity).toFixed(2)); return { stageTop: Math.round(stage.getBoundingClientRect().top - box.getBoundingClientRect().top), scale: parseFloat(getComputedStyle(zoom).scale) || 1, words }; });
      const scene = await page.$eval('#fx-1 > div', (box) => { const s = box.querySelector('.parallax')!; return s.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop; });
      const pinned = await page.$eval('#fx-1 .parallax-stage', (s) => s.getBoundingClientRect().height);
      const len = (await page.$eval('#fx-1 .parallax', (s) => s.getBoundingClientRect().height)) - pinned;
      await scrollBox(page, 1, scene + len * 0.05);
      const a = await read();
      await scrollBox(page, 1, scene + len * 0.5);
      const b = await read();
      await scrollBox(page, 1, scene + len * 0.9);
      const c = await read();
      if ([a, b, c].some((x) => Math.abs(x.stageTop) > 2)) throw new Error(`stage not pinned ${[a.stageTop, b.stageTop, c.stageTop]}`);
      if (!(c.scale > b.scale && b.scale > a.scale)) throw new Error(`zoom ${[a.scale, b.scale, c.scale]}`);
      // early: the first word shows; middle: the second; late: the third
      if (!(a.words[0] > a.words[2]) || !(b.words[1] > 0.6) || !(c.words[2] > c.words[0])) throw new Error(`words ${JSON.stringify([a.words, b.words, c.words])}`);
    },
  },
  {
    label: 'drifting columns slide past each other',
    run: async (page) => {
      const col = (n: number) => `#fx-2 .parallax-drift:nth-child(${n})`;
      await scrollBox(page, 2, 'top');
      const before = [await ty(page, col(1)), await ty(page, col(2))];
      await scrollBox(page, 2, 'bottom');
      const after = [await ty(page, col(1)), await ty(page, col(2))];
      if (!(after[0] < before[0]) || !(after[1] > before[1])) throw new Error(JSON.stringify({ before, after }));
    },
  },
  {
    label: 'hero: the copy fades out as it leads (data-motion="fade")',
    run: async (page) => {
      const copy = '#fx-3 .parallax-layer[data-motion="fade"]';
      await scrollBox(page, 3, 'top');
      const o0 = await page.$eval(copy, (e) => parseFloat(getComputedStyle(e).opacity));
      await scrollBox(page, 3, 'bottom');
      const o1 = await page.$eval(copy, (e) => parseFloat(getComputedStyle(e).opacity));
      if (!(o0 > 0.9) || !(o1 < 0.1)) throw new Error(JSON.stringify({ o0, o1 }));
    },
  },
  {
    label: 'reveals: hidden before entering, shown in view; variants swap the keyframes',
    run: async (page) => {
      const last = '#fx-4 .parallax-reveal:last-child';
      await scrollBox(page, 4, 'top');
      const before = await page.$eval(last, (e) => parseFloat(getComputedStyle(e).opacity));
      await scrollBox(page, 4, 'bottom');
      const after = await page.$eval(last, (e) => parseFloat(getComputedStyle(e).opacity));
      const names = await page.evaluate(() => ['zoom', 'fade'].map((v) => getComputedStyle(document.querySelector(`.parallax-reveal[data-reveal="${v}"]`)!).animationName));
      if (!(before < 0.2) || !(after > 0.95) || names.join() !== 'parallax-reveal-zoom,parallax-reveal-fade') throw new Error(JSON.stringify({ before, after, names }));
    },
  },
  {
    label: 'the inline axis switches the timeline axis and the keyframes',
    run: async (page) => {
      const r = await page.evaluate(() => ({ axis: getComputedStyle(document.querySelector('.parallax[data-axis="inline"]')!).viewTimelineAxis, anim: getComputedStyle(document.querySelector('.parallax[data-axis="inline"] .parallax-layer')!).animationName }));
      if (r.axis !== 'inline' || r.anim !== 'parallax-shift-inline') throw new Error(JSON.stringify(r));
    },
  },
  {
    label: 'reduced motion: the still composition',
    run: async (page) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const r = await page.evaluate(() => ['.parallax-layer', '.parallax-drift', '.parallax-reveal'].map((s) => getComputedStyle(document.querySelector(s)!).animationName));
      await page.emulateMedia({ reducedMotion: null });
      if (r.join() !== 'none,none,none') throw new Error(r.join());
    },
  },
]);
