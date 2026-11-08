import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import { cssSmoke } from '../lib/css-smoke.ts';

/**
 * Why: Surface is CSS-only - its contract is surface.css. The checks read the
 * pseudo-elements that paint the texture: every pattern its own tile (and its
 * accent where it has one), every style its own mask stack, colors and
 * blending, every motion its keyframes (drift really moving), every
 * projection its plane, that a turning plane covers its box (pixels: a solid
 * tile over red), and the accessibility media queries. The tiles' pixels are
 * otherwise not asserted; the seamless repeat is the mask's own repeat.
 */

const PATTERNS = [
  'stripes', 'diagonal', 'dots', 'polka', 'checker', 'grid', 'ruled', 'hex', 'triangles', 'diamonds', 'herringbone',
  'plaid', 'waves', 'scales', 'zigzag', 'cross', 'bricks', 'cubes', 'circuit', 'topography', 'terrazzo', 'carbon',
  'pixel', 'weave', 'ornament', 'fibers', 'grain', 'grunge',
];
const ACCENTED = ['polka', 'grid', 'hex', 'diamonds', 'herringbone', 'plaid', 'cubes', 'circuit', 'terrazzo', 'pixel', 'weave', 'ornament'];
const STYLES = 'flat emboss deboss neon paper outline glow shadow long-shadow extrude stamp duotone risograph blueprint chalk pencil glass metal gold holographic gradient rainbow cutout halftone chromatic'.split(' ');
const MOTIONS = 'drift parallax orbit rotate counter spin-zoom sway swing tilt wobble wave bounce shake glitch breathe zoom heartbeat pulse flicker blink twinkle hue shimmer'.split(' ');
const PROJECTIONS = 'flat tilted tilted-down tilted-left tilted-right floor floor-low floor-high ceiling ceiling-low wall wall-left corridor horizon isometric isometric-left dimetric trimetric planometric cavalier cabinet banked'.split(' ');

/** the share of red pixels in a box's region (top/bottom as fractions of its height), at an animation phase 0-1 */
const redAt = (page: Page, selector: string, phase: number, top: number, bottom: number): Promise<number> =>
  page.evaluate(
    async ([selector, phase]) => {
      const el = document.querySelector(selector as string) as HTMLElement;
      for (const a of el.getAnimations({ subtree: true })) {
        a.pause();
        a.currentTime = ((a.effect?.getComputedTiming().duration as number) || 0) * (phase as number);
      }
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    },
    [selector, phase],
  ).then(async () => {
    const png = await page.locator(selector).screenshot();
    return page.evaluate(
      async ([b64, top, bottom]) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const g = c.getContext('2d')!;
        g.drawImage(img, 0, 0);
        const y0 = Math.ceil(img.height * (top as number)) + 1;
        const y1 = Math.floor(img.height * (bottom as number)) - 1;
        const d = g.getImageData(1, y0, img.width - 2, y1 - y0).data;
        let red = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] < 60 && d[i + 2] < 60) red++;
        return red / (d.length / 4);
      },
      [png.toString('base64'), top, bottom],
    );
  });

/** a computed property of a pseudo-element */
const pseudo = (page: Page, selector: string, which: '::before' | '::after', prop: string): Promise<string> =>
  page.$eval(selector, (el, [w, p]) => getComputedStyle(el, w).getPropertyValue(p).trim(), [which, prop]);

await cssSmoke('surface', [
  {
    label: 'a surface is a positioned, clipped stacking context in the surface color',
    selector: '#p-hex',
    css: { position: 'relative', overflow: 'hidden', isolation: 'isolate', display: 'block' },
  },
  {
    label: 'an empty surface takes --surface-aspect (16 / 9); one with content its content height',
    run: async (page) => {
      const [w, h] = await page.$eval('#empty', (el) => [el.clientWidth, el.clientHeight]);
      assert.equal(Math.round((w / h) * 90), 160, `${w}x${h}`);
      assert.equal(await page.$eval('#note', (el) => getComputedStyle(el).aspectRatio), 'auto');
    },
  },
  {
    label: 'both layers sit behind the content: absolute, z-index -1, no pointer events',
    run: async (page) => {
      for (const w of ['::before', '::after'] as const) {
        assert.equal(await pseudo(page, '#note', w, 'position'), 'absolute');
        assert.equal(await pseudo(page, '#note', w, 'z-index'), '-1');
        assert.equal(await pseudo(page, '#note', w, 'pointer-events'), 'none');
      }
      const box = await page.$eval('#note h3', (el) => getComputedStyle(el).position);
      assert.equal(box, 'static');
    },
  },
  {
    label: 'every pattern masks the ink with a tile of its own (28 distinct tiles)',
    run: async (page) => {
      const tiles = new Set<string>();
      for (const p of PATTERNS) {
        const mask = await pseudo(page, `#p-${p}`, '::before', 'mask-image');
        assert.match(mask, /url\("data:image\/svg\+xml|conic|linear-gradient\(/, p);
        tiles.add(mask);
      }
      assert.equal(tiles.size, PATTERNS.length);
    },
  },
  {
    label: 'a pattern with an accent paints it on ::after; one without leaves ::after transparent',
    run: async (page) => {
      for (const p of PATTERNS) {
        const mask = await pseudo(page, `#p-${p}`, '::after', 'mask-image');
        if (ACCENTED.includes(p)) assert.match(mask, /url\(/, p);
        else assert.match(mask, /linear-gradient\((transparent|rgba\(0, 0, 0, 0\))/, p);
      }
    },
  },
  {
    label: 'the tile size follows --surface-size (herringbone is 3 units)',
    run: async (page) => {
      const size = await pseudo(page, '#tuned', '::before', 'mask-size');
      assert.match(size, /42px 42px/, size);
    },
  },
  {
    label: 'custom inks paint the surface, the ink and the accent',
    run: async (page) => {
      assert.equal(await page.$eval('#tuned', (el) => getComputedStyle(el).backgroundColor), 'rgb(59, 42, 30)');
      assert.equal(await pseudo(page, '#tuned', '::before', 'background-color'), 'rgb(160, 117, 79)');
      assert.equal(await pseudo(page, '#tuned', '::after', 'background-color'), 'rgb(138, 97, 66)');
    },
  },
  {
    label: 'emboss and deboss cut rims (tile minus tile) and swap light and shade',
    run: async (page) => {
      for (const s of ['emboss', 'deboss']) {
        assert.match(await pseudo(page, `#s-${s}`, '::before', 'mask-composite'), /intersect, subtract, add/);
        assert.match(await pseudo(page, `#s-${s}`, '::after', 'mask-composite'), /intersect, subtract, add/);
      }
      const embossLight = await pseudo(page, '#s-emboss', '::before', 'background-color');
      const debossShade = await pseudo(page, '#s-deboss', '::after', 'background-color');
      assert.equal(embossLight, debossShade);
      assert.notEqual(embossLight, await pseudo(page, '#s-emboss', '::after', 'background-color'));
    },
  },
  {
    label: 'every style is its own look: its masks, colors, fills and blending',
    run: async (page) => {
      const looks = new Set<string>();
      for (const st of STYLES) {
        const look = await page.$eval(`#s-${st}`, (el) => {
          const b = getComputedStyle(el, '::before');
          const a = getComputedStyle(el, '::after');
          const s = getComputedStyle(el);
          return [s.backgroundColor, s.backgroundImage.slice(0, 60), b.backgroundColor, b.backgroundImage.slice(0, 60), b.maskComposite, b.maskPosition, b.maskImage.length, a.backgroundColor, a.display, a.mixBlendMode, a.maskComposite, a.maskPosition].join('|');
        });
        looks.add(look);
      }
      assert.equal(looks.size, STYLES.length, 'no two styles alike');
      // the light: emboss's lit rim moves with --surface-light-angle
      const at = (angle: string) => page.$eval('#s-emboss', (el, angle) => { (el as HTMLElement).style.setProperty('--surface-light-angle', angle); return getComputedStyle(el, '::before').maskPosition; }, angle);
      assert.notEqual(await at('45deg'), await at('225deg'));
    },
  },
  {
    label: 'neon draws the tube (tile minus its erosion) and a halo (the tile grown) on a dark surface',
    run: async (page) => {
      assert.equal(await pseudo(page, '#s-neon', '::before', 'mask-composite'), 'intersect, subtract, intersect, intersect, intersect, add');
      assert.equal(await pseudo(page, '#s-neon', '::after', 'mask-composite'), 'intersect, exclude, add, add, add, add');
      const bg = await page.$eval('#s-neon', (el) => getComputedStyle(el).backgroundColor);
      const flat = await page.$eval('#s-flat', (el) => getComputedStyle(el).backgroundColor);
      assert.notEqual(bg, flat);
    },
  },
  {
    label: 'paper lays a grain under the inks and warms the sheet',
    run: async (page) => {
      assert.match(await page.$eval('#s-paper', (el) => getComputedStyle(el).backgroundImage), /feTurbulence/);
      const paper = await page.$eval('#s-paper', (el) => getComputedStyle(el).backgroundColor);
      assert.notEqual(paper, await page.$eval('#s-flat', (el) => getComputedStyle(el).backgroundColor));
    },
  },
  {
    label: 'every motion runs its keyframes (both layers; blink and twinkle the accent, shimmer the ink)',
    run: async (page) => {
      const name: Record<string, string> = { drift: 'surface-drift-x, surface-drift-y', parallax: 'surface-drift-x, surface-drift-y', counter: 'surface-spin', rotate: 'surface-spin' };
      for (const m of MOTIONS) {
        const want = name[m] || `surface-${m}`;
        const before = await pseudo(page, `#m-${m}`, '::before', 'animation-name');
        const after = await pseudo(page, `#m-${m}`, '::after', 'animation-name');
        if (m === 'blink' || m === 'twinkle') assert.deepEqual([before, after], ['none', want], m);
        else if (m === 'shimmer') assert.equal(before, want, m);
        else assert.deepEqual([before, after], [want, want], m);
      }
      assert.match(await pseudo(page, '#m-shimmer', '::before', 'background-image'), /linear-gradient/);
      // a receding plane drifts its tile, so its fade stays where it is
      for (const m of ['floor-drift', 'wall-drift']) assert.equal(await pseudo(page, `#m-${m}`, '::before', 'animation-name'), 'surface-drift-tile-x, surface-drift-tile-y', m);
    },
  },
  {
    label: 'drift moves the plane on a flat surface (the transform) and the tile on a floor (the typed offset)',
    run: async (page) => {
      const flat = async () => pseudo(page, '#m-drift', '::before', 'transform');
      const floor = async () => [await pseudo(page, '#m-floor-drift', '::before', 'mask-position'), await pseudo(page, '#m-floor-drift', '::before', 'transform')];
      const [a, fa] = [await flat(), await floor()];
      await page.waitForTimeout(400);
      const [b, fb] = [await flat(), await floor()];
      assert.notEqual(a, b, 'the flat plane moves');
      assert.notEqual(fa[0], fb[0], 'the floor tile moves');
      assert.equal(fa[1], fb[1], 'the floor plane (and its fade) stays');
    },
  },
  {
    label: 'drift runs at the exact --surface-direction: every 15deg step takes its own course (each axis loops on its own)',
    run: async (page) => {
      const courses = await page.$eval('#m-drift', (el) => {
        const out: number[] = [];
        for (let d = 0; d < 360; d += 15) {
          (el as HTMLElement).style.setProperty('--surface-direction', `${d}deg`);
          const anims = el.getAnimations({ subtree: true });
          for (const a of anims) {
            a.pause();
            a.currentTime = 0;
          }
          const from = new DOMMatrix(getComputedStyle(el, '::before').transform);
          for (const a of anims) a.currentTime = 1000;
          const to = new DOMMatrix(getComputedStyle(el, '::before').transform);
          out.push((Math.atan2(-(to.m42 - from.m42), to.m41 - from.m41) * 180) / Math.PI);
          for (const a of anims) a.play();
        }
        (el as HTMLElement).style.removeProperty('--surface-direction');
        return out;
      });
      courses.forEach((angle, i) => assert.ok(Math.abs(((angle - i * 15 + 540) % 360) - 180) < 0.5, `${i * 15}deg ran at ${angle.toFixed(1)}deg`));
    },
  },
  {
    label: 'every projection tips its plane differently; every surface is an inline-size container',
    run: async (page) => {
      const planes = new Set<string>();
      for (const p of PROJECTIONS) {
        planes.add((await pseudo(page, `#j-${p}`, '::before', 'transform')) + (await pseudo(page, `#j-${p}`, '::after', 'transform')));
        assert.equal(await page.$eval(`#j-${p}`, (el) => getComputedStyle(el).containerType), 'inline-size', p);
      }
      assert.equal(planes.size, PROJECTIONS.length);
      // a receding plane fades along itself; while it spins the fade is round
      assert.match(await pseudo(page, '#j-floor', '::before', 'mask-image'), /^linear-gradient\(/);
      assert.match(await pseudo(page, '#c-reported', '::before', 'mask-image'), /^radial-gradient\(/);
      // a floor's box rises in a haze toward its horizon, a ceiling's falls toward it
      const haze = (id: string) => page.$eval(id, (el) => getComputedStyle(el).backgroundImage);
      assert.match(await haze('#j-floor'), /^linear-gradient\(to top, rgba\(0, 0, 0, 0\) [\d.]+%, /);
      assert.match(await haze('#j-ceiling'), /^linear-gradient\(rgba\(0, 0, 0, 0\) [\d.]+%, /);
      assert.match(await haze('#j-flat'), /^linear-gradient\(rgba\(0, 0, 0, 0\) 0px, rgba\(0, 0, 0, 0\) 0px\)/);
    },
  },
  {
    label: 'a turning plane never uncovers its box (the reported tilted + rotate, a flat spin, a floor spin-zoom turned 45deg)',
    run: async (page) => {
      for (const phase of [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]) {
        assert.equal(await redAt(page, '#c-flat', phase, 0, 1), 0, `flat @${phase}`);
        assert.equal(await redAt(page, '#c-reported', phase, 0.4, 1), 0, `tilted @${phase}`);
        assert.equal(await redAt(page, '#c-floor', phase, 0.6, 1), 0, `floor @${phase}`);
      }
    },
  },
  {
    label: 'the background variant fills its parent behind the content; the parent becomes the stacking context',
    run: async (page) => {
      const [pos, z, w, cw] = await page.$eval('#bg', (el) => {
        const cs = getComputedStyle(el);
        return [cs.position, cs.zIndex, el.clientWidth, (el.parentElement as HTMLElement).clientWidth];
      });
      assert.equal(pos, 'absolute');
      assert.equal(z, '-1');
      assert.equal(w, cw);
      const parent = await page.$eval('#card', (el) => [getComputedStyle(el).position, getComputedStyle(el).isolation]);
      assert.deepEqual(parent, ['relative', 'isolate']);
    },
  },
  {
    label: 'a hidden surface is not shown',
    selector: '#hidden',
    css: { display: 'none' },
  },
  {
    label: 'reduced motion stops every motion',
    run: async (page) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const m of MOTIONS) {
        assert.equal(await pseudo(page, `#m-${m}`, '::before', 'animation-name'), 'none', m);
        assert.equal(await pseudo(page, `#m-${m}`, '::after', 'animation-name'), 'none', m);
      }
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    },
  },
  {
    label: 'forced colors hide the texture and paint the system background',
    run: async (page) => {
      await page.emulateMedia({ forcedColors: 'active' });
      assert.equal(await pseudo(page, '#p-hex', '::before', 'display'), 'none');
      assert.equal(await pseudo(page, '#p-hex', '::after', 'display'), 'none');
      await page.emulateMedia({ forcedColors: 'none' });
    },
  },
]);
