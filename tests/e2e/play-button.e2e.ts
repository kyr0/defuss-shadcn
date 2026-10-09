import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: Play Button is CSS-only - one native button whose circle is its box and
 * whose triangle is a clip-path. Verify the round geometry and the size scale,
 * the triangle in the foreground colour, the variants' distinct fills, the
 * pulse ring (and that reduced motion stops it), hover feedback and the native
 * disabled state - on the real dist/ files.
 */
const px = (page: import('playwright').Page, id: string) =>
  page.$eval(`#${id}`, (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; });

await cssSmoke('play-button', [
  {
    label: 'a 72px circle by default: round, pointer, a large shadow',
    selector: '#pb',
    css: { width: '72px', height: '72px', borderTopLeftRadius: '9999px', cursor: 'pointer', boxShadow: /rgb/ },
  },
  {
    label: 'sizes: sm 48 · md 72 · lg 96 · xl 128 - always round',
    run: async (page) => {
      const sizes = await Promise.all(['pb-sm', 'pb', 'pb-lg', 'pb-xl'].map((id) => px(page, id)));
      assert.deepEqual(sizes, [[48, 48], [72, 72], [96, 96], [128, 128]]);
    },
  },
  {
    label: 'the triangle: ::before clipped to a right-pointing triangle in the foreground colour, a third of the button',
    run: async (page) => {
      const t = await page.$eval('#pb', (e) => {
        const b = getComputedStyle(e, '::before');
        return { clip: b.clipPath, bg: b.backgroundColor, color: getComputedStyle(e).color, w: parseFloat(b.width) };
      });
      assert.match(t.clip, /^polygon\(0px 0px, 100% 50%, 0px 100%\)$/);
      assert.equal(t.bg, t.color, 'drawn in currentColor');
      assert.ok(Math.abs(t.w - 72 * 0.34) < 0.5, `width ${t.w}`);
    },
  },
  {
    label: 'variants: default, secondary, outline and glass fill differently',
    distinct: ['pb', 'pb-secondary', 'pb-outline', 'pb-glass'].map((id) => ({ selector: `#${id}`, prop: 'backgroundColor' })),
  },
  {
    label: 'glass: frosted (backdrop-filter) and a white triangle',
    selector: '#pb-glass',
    css: { backdropFilter: /blur\(12px\)/, color: 'oklch(1 0 0)' },
  },
  {
    label: 'pulse: a ring animation on ::after - and none without data-pulse',
    run: async (page) => {
      const r = await page.evaluate(() => [
        getComputedStyle(document.getElementById('pb-pulse')!, '::after').animationName,
        getComputedStyle(document.getElementById('pb')!, '::after').content,
      ]);
      assert.deepEqual(r, ['play-button-pulse', 'none']);
    },
  },
  {
    label: 'hover grows the button; disabled is half opacity and not-allowed',
    run: async (page) => {
      await page.hover('#pb');
      await page.waitForTimeout(250);
      assert.equal(await page.$eval('#pb', (e) => getComputedStyle(e).scale), '1.06');
      const d = await page.$eval('#pb-disabled', (e) => [getComputedStyle(e).opacity, getComputedStyle(e).cursor]);
      assert.deepEqual(d, ['0.5', 'not-allowed']);
    },
  },
  {
    label: 'reduced motion: no pulse, no scaling',
    run: async (page) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.hover('#pb');
      const r = await page.evaluate(() => [getComputedStyle(document.getElementById('pb-pulse')!, '::after').animationName, getComputedStyle(document.getElementById('pb')!).scale]);
      assert.deepEqual(r, ['none', 'none']);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    },
  },
]);
