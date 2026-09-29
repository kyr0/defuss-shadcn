import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: text-rotate is CSS-only - verify the one-line window, that the line
 * count picks the keyframes, which line is in view at points of the loop
 * (the animation is seeked through getAnimations()), the pause on hover, the
 * down / fade / align / line-height / duration options and reduced motion.
 */
type Page = import('playwright').Page;
/** Seek the element's animation(s) to a fraction of the round; return the line in view. */
const lineAt = (page: Page, id: string, frac: number) =>
  page.$eval('#' + id, (el, frac) => {
    const anims = el.getAnimations({ subtree: true });
    for (const a of anims) {
      const d = Number((a.effect as KeyframeEffect).getComputedTiming().duration);
      a.pause();
      a.currentTime = d * frac;
    }
    const w = el.getBoundingClientRect();
    const lines = [...el.firstElementChild!.children] as HTMLElement[];
    const visible = lines.find((l) => {
      const r = l.getBoundingClientRect();
      const cy = r.top + r.height / 2;
      return cy > w.top && cy < w.bottom && getComputedStyle(l).opacity !== '0';
    });
    return visible?.textContent ?? null;
  }, frac);

await cssSmoke('text-rotate', [
  {
    label: 'a one-line window (1lh = the text line height), inline on the baseline, as wide as the widest line',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const w = document.getElementById('tr3')!;
        const cs = getComputedStyle(w);
        const lines = [...w.firstElementChild!.children].map((l) => l.getBoundingClientRect().width);
        return { h: w.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(document.getElementById('sentence')!).lineHeight), overflow: cs.overflow, display: cs.display, width: Math.round(w.getBoundingClientRect().width), widest: Math.round(Math.max(...lines)) };
      });
      assert.equal(r.h, r.lh); assert.equal(r.overflow, 'hidden'); assert.equal(r.display, 'inline-grid'); assert.equal(r.width, r.widest);
    },
  },
  {
    label: 'the line count picks the keyframes (2 / 3 / 6); default round 10s, custom via --text-rotate-duration',
    run: async (page) => {
      const r = await page.evaluate(() => ['tr2', 'tr3', 'tr6'].map((id) => { const s = getComputedStyle(document.querySelector(`#${id} > span`)!); return [s.animationName, s.animationDuration]; }));
      assert.deepEqual(r, [['text-rotate-2', '4s'], ['text-rotate-3', '10s'], ['text-rotate-6', '10s']]);
    },
  },
  {
    label: 'the loop: ONE → TWO → THREE, each holding its third, then back to ONE',
    run: async (page) => {
      const seq = [];
      for (const f of [0.1, 0.3, 0.45, 0.6, 0.8, 0.95, 0.9999]) seq.push(await lineAt(page, 'tr3', f));
      assert.deepEqual(seq, ['ONE', 'ONE', 'TWO', 'TWO', 'THREE', 'THREE', 'ONE']);
    },
  },
  {
    label: 'six lines each get their sixth of the round',
    run: async (page) => {
      const seq = [];
      for (const k of [0, 1, 2, 3, 4, 5]) seq.push(await lineAt(page, 'tr6', (k + 0.5) / 6));
      assert.deepEqual(seq, ['1', '2', '3', '4', '5', '6']);
    },
  },
  {
    label: 'down: the same reading order, the stack moving downward (column-reverse)',
    run: async (page) => {
      const seq = [];
      for (const f of [0.1, 0.45, 0.8]) seq.push(await lineAt(page, 'down', f));
      assert.deepEqual(seq, ['ONE', 'TWO', 'THREE']);
      assert.equal(await page.$eval('#down > span', (s) => getComputedStyle(s).flexDirection), 'column-reverse');
    },
  },
  {
    label: 'fade: every line in the same cell, one visible per slot',
    run: async (page) => {
      const seq = [];
      for (const f of [0.15, 0.5, 0.85]) seq.push(await lineAt(page, 'fade', f));
      assert.deepEqual(seq, ['ONE', 'TWO', 'THREE']);
      const same = await page.$eval('#fade', (w) => { const r = [...w.firstElementChild!.children].map((l) => (l as HTMLElement).offsetTop); return new Set(r).size; });
      assert.equal(same, 1);
    },
  },
  {
    label: 'hover pauses the loop; data-pause="none" keeps it running',
    run: async (page) => {
      await page.hover('#tr2');
      assert.equal(await page.$eval('#tr2 > span', (s) => getComputedStyle(s).animationPlayState), 'paused');
      await page.hover('#tr6');
      assert.equal(await page.$eval('#tr6 > span', (s) => getComputedStyle(s).animationPlayState), 'running');
    },
  },
  {
    label: 'data-align="center" centers a shorter line; a taller line-height makes a taller window',
    run: async (page) => {
      const r = await page.evaluate(() => ({ align: getComputedStyle(document.querySelector('#center > span > span')!).textAlign, tall: document.getElementById('tall')!.getBoundingClientRect().height }));
      assert.deepEqual(r, { align: 'center', tall: 50 });
    },
  },
  {
    label: 'in a sentence the shown line sits on the text baseline (no vertical shift against its neighbours)',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const p = document.getElementById('sentence')!;
        const shown = document.querySelector('#tr3 > span > :first-child')!;
        // the text node before the rotator and the shown line: same baseline = same bottom of their line box
        const range = document.createRange();
        range.setStart(p.firstChild!, 0);
        range.setEnd(p.firstChild!, 5);
        const word = range.getBoundingClientRect();
        const r2 = document.createRange();
        r2.selectNodeContents(shown);
        const line = r2.getBoundingClientRect();
        return Math.abs(word.bottom - line.bottom);
      });
      assert.ok(r <= 1, `baseline offset ${r}px`);
    },
  },
  {
    label: 'reduced motion: no animation, the first line stays',
    run: async (page) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const r = await page.evaluate(() => [getComputedStyle(document.querySelector('#tr3 > span')!).animationName, getComputedStyle(document.querySelector('#fade > span > :first-child')!).opacity]);
      assert.deepEqual(r, ['none', '1']);
    },
  },
]);
