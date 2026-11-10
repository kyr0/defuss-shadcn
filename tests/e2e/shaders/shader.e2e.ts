import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

/**
 * Why: a shader's promise is an animated surface that costs nothing it does not need - one WebGL2 context for
 * the page, drawing only what is in view, a still frame under reduced motion, the poster where WebGL2 is missing -
 * in the theme's colors, from markup alone. These checks read the real pixels the shipped dist/ files draw
 * (headless Chromium runs WebGL2 on SwiftShader): every effect draws a picture, the thirty share one context, the surface effect reads its words, the
 * clock moves and stops through the State API, two instances at the same moment draw the same frame, a token
 * change repaints, the pointer reaches an interactive effect even while it is paused, a picture inside is the
 * source (an SVG's shape, an image's pixels), the variants sit where they say, errors keep the poster and say why,
 * an effect below the fold waits until it is scrolled to, and render() reproduces the markup of every state.
 */

const server = startServer();
const browser = await chromium.launch();
let failures = 0;
const check = async (label: string, fn: () => Promise<void>): Promise<void> => {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${label}\n    ${err instanceof Error ? err.message : err}`);
  }
};

const url = `${server.url}/tests/e2e/shaders/shader.e2e-fixture.html`;
const EFFECTS = ['mesh-gradient', 'grain-gradient', 'warp', 'neuro-noise', 'dithering', 'god-rays', 'aurora', 'pulsing-border', 'hologram', 'metaballs', 'liquid-metal', 'water', 'fluted-glass', 'fluid', 'dot-orbit', 'topography', 'trails', 'orb', 'galaxy', 'waves', 'plasma', 'bokeh', 'ripple', 'voronoi', 'halftone', 'kaleidoscope', 'clouds', 'fire', 'starfield', 'silk', 'nebula', 'prism', 'matrix', 'marble', 'oil', 'op-art', 'lightning', 'snow', 'fireflies', 'glitch', 'crt', 'caustics', 'smoke', 'surface'];

/** The canvas of a shader read back: its size, mean luminance, luminance spread, alpha range and a coarse fingerprint. */
const pixels = (page: Page, id: string) =>
  page.evaluate((id) => {
    const canvas = document.getElementById(id)!.querySelector('canvas.shader-canvas') as HTMLCanvasElement;
    const { width: w, height: h } = canvas;
    const d = canvas.getContext('2d')!.getImageData(0, 0, w, h).data;
    let sum = 0;
    let sq = 0;
    let amin = 255;
    let amax = 0;
    const n = w * h;
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      sum += l;
      sq += l * l;
      amin = Math.min(amin, d[i + 3]);
      amax = Math.max(amax, d[i + 3]);
    }
    const mean = sum / n;
    const at = (x: number, y: number) => Array.from(d.slice((Math.floor(y * (h - 1)) * w + Math.floor(x * (w - 1))) * 4, (Math.floor(y * (h - 1)) * w + Math.floor(x * (w - 1))) * 4 + 4));
    const print = [0.2, 0.5, 0.8].flatMap((y) => [0.2, 0.5, 0.8].flatMap((x) => at(x, y)));
    return { w, h, mean, spread: Math.sqrt(Math.max(sq / n - mean * mean, 0)), amin, amax, print, corner: at(0.02, 0.02), center: at(0.5, 0.55), url: canvas.toDataURL() };
  }, id);

const frames = (page: Page, id: string) => page.evaluate((id) => (document.getElementById(id) as any)._shader.frames as number, id);
const stats = (page: Page) => page.evaluate(() => (globalThis as any).df$.shadcn.shader.stats());
const redraw = (page: Page, id: string) => page.evaluate((id) => (globalThis as any).df$.shadcn.shader.frame(`#${id}`), id);

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (e) => {
    failures++;
    console.error(`  ✗ page error: ${e.message}`);
  });
  // record the events from the first moment
  await page.addInitScript(() => {
    (globalThis as any).__events = [];
    for (const type of ['shader-ready', 'shader-error'])
      document.addEventListener(type, (e) => (globalThis as any).__events.push({ type, id: (e.target as HTMLElement).id, detail: (e as CustomEvent).detail }));
  });
  await page.goto(url);
  await page.waitForFunction((n) => document.querySelectorAll('#tiles .shader[data-ready]').length === n, EFFECTS.length, { timeout: 60_000 });

  await check('init: every shader is bound, with one aria-hidden canvas and the State API', async () => {
    const r = await page.evaluate(() =>
      [...document.querySelectorAll('.shader')].map((el: any) => ({
        id: el.id,
        init: el.hasAttribute('data-init'),
        canvases: el.querySelectorAll(':scope > canvas.shader-canvas').length,
        hidden: el.querySelector('canvas.shader-canvas')?.getAttribute('aria-hidden'),
        api: typeof el.api?.setState,
        state: el.dataset.stateName,
      })),
    );
    for (const s of r) assert.deepEqual([s.init, s.canvases, s.hidden, s.api, s.state], [true, 1, 'true', 'function', 'default'], s.id);
    assert.deepEqual(await page.evaluate(() => (globalThis as any).df$.shadcn.shader.effects()), [...EFFECTS, 'custom']);
  });

  await check('every effect draws a picture - not blank, not flat - and the page holds ONE WebGL context', async () => {
    for (const fx of EFFECTS) {
      const p = await pixels(page, `t-${fx}`);
      assert.ok(p.w > 0 && p.h > 0, `${fx}: canvas sized`);
      assert.ok(p.amax > 0, `${fx}: something drawn`);
      assert.ok(p.spread > 3, `${fx}: a picture, not one flat color (spread ${p.spread.toFixed(1)})`);
    }
    const s = await stats(page);
    assert.equal(s.contexts, 1, 'one context');
    assert.ok(s.programs >= 18, `programs compiled once each (${s.programs})`);
    assert.equal(s.supported, true);
    const ready = await page.evaluate(() => (globalThis as any).__events.filter((e: any) => e.type === 'shader-ready' && e.id.startsWith('t-')));
    assert.equal(ready.length, EFFECTS.length, 'shader-ready once per tile');
    assert.ok(ready.every((e: any) => e.detail.width > 0 && e.detail.height > 0 && e.detail.pixelRatio > 0 && EFFECTS.includes(e.detail.effect)));
  });

  await check('the clock: frames change while running, paused holds the frame, default runs it again', async () => {
    const a = await pixels(page, 'twin-a');
    await page.waitForTimeout(400);
    const b = await pixels(page, 'twin-a');
    assert.notDeepEqual(a.print, b.print, 'running: the picture moves');
    await page.evaluate(() => (document.getElementById('twin-a') as any).api.setState('paused'));
    await page.waitForTimeout(100);
    const f1 = await frames(page, 'twin-a');
    const c = await pixels(page, 'twin-a');
    await page.waitForTimeout(400);
    assert.equal(await frames(page, 'twin-a'), f1, 'paused: no more frames');
    assert.deepEqual((await pixels(page, 'twin-a')).print, c.print, 'paused: the picture holds');
    assert.equal(await page.evaluate(() => document.getElementById('twin-a')!.dataset.stateName), 'paused');
    await page.evaluate(() => (document.getElementById('twin-a') as any).api.setState('default'));
    await page.waitForTimeout(300);
    assert.ok((await frames(page, 'twin-a')) > f1, 'default: frames again');
  });

  await check('a moment is a frame: two instances paused at the same time draw the same picture', async () => {
    await page.evaluate(() => {
      for (const id of ['twin-a', 'twin-b']) (document.getElementById(id) as any).api.setState('paused', { time: 3.25 });
    });
    await redraw(page, 'twin-a');
    await redraw(page, 'twin-b');
    const [a, b] = [await pixels(page, 'twin-a'), await pixels(page, 'twin-b')];
    assert.equal(a.url, b.url, 'identical frames');
    assert.deepEqual(await page.evaluate(() => {
      const { name, config } = (document.getElementById('twin-a') as any).api.getState();
      return { name, config };
    }), { name: 'paused', config: { time: 3.25 } });
  });

  await check('data-speed="0" holds the still frame', async () => {
    const f = await frames(page, 'still');
    await page.waitForTimeout(400);
    assert.equal(await frames(page, 'still'), f);
    assert.ok((await pixels(page, 'still')).spread > 3, 'the still frame is drawn');
  });

  await check('setState writes effect, speed and colors as attributes and draws the new effect', async () => {
    const before = await pixels(page, 'twin-b');
    await page.evaluate(() => (document.getElementById('twin-b') as any).api.setState('paused', { effect: 'galaxy', speed: 0.5, colors: 'rgb(255, 0, 0) rgb(0, 255, 0)' }));
    await redraw(page, 'twin-b');
    const r = await page.evaluate(() => {
      const el = document.getElementById('twin-b')!;
      return [el.dataset.effect, el.dataset.speed, el.dataset.colors, (el as any)._shader.effect];
    });
    assert.deepEqual(r, ['galaxy', '0.5', 'rgb(255, 0, 0) rgb(0, 255, 0)', 'galaxy']);
    assert.notEqual((await pixels(page, 'twin-b')).url, before.url, 'the new effect is on the canvas');
    const threw = await page.evaluate(() => {
      try {
        (document.getElementById('twin-b') as any).api.setState('nope');
        return false;
      } catch {
        return true;
      }
    });
    assert.ok(threw, 'an unknown state throws');
  });

  await check('the theme: a token changed on the element repaints it in the new color', async () => {
    await page.evaluate(() => (document.getElementById('themed') as any).api.setState('paused', { time: 2 }));
    await redraw(page, 'themed');
    const blue = await pixels(page, 'themed');
    await page.evaluate(() => {
      const el = document.getElementById('themed')!;
      for (let i = 1; i <= 5; i++) el.style.setProperty(`--chart-${i}`, 'rgb(220, 20, 20)');
    });
    await page.waitForFunction(() => {
      const c = document.getElementById('themed')!.querySelector('canvas') as HTMLCanvasElement;
      const d = c.getContext('2d')!.getImageData(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1).data;
      return d[0] > 150 && d[2] < 80;
    }, null, { timeout: 5000 });
    const red = await pixels(page, 'themed');
    assert.ok(red.center[0] > 150 && red.center[2] < 80 && blue.center[2] > red.center[2], `red after the token change: ${red.center} (was ${blue.center})`);
  });

  await check('the pointer: an interactive effect follows it, even while paused', async () => {
    // only what is in the viewport draws: the tile sits at the fold
    await page.locator('#pointer').scrollIntoViewIfNeeded();
    await page.evaluate(() => (document.getElementById('pointer') as any).api.setState('paused', { time: 0 }));
    await page.mouse.move(5, 880);
    await page.waitForTimeout(600);
    const box = (await page.locator('#pointer').boundingBox())!;
    const before = await pixels(page, 'pointer');
    await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.2);
    await page.waitForTimeout(800);
    const after = await pixels(page, 'pointer');
    assert.notDeepEqual(after.print, before.print, 'the pointer redraws the paused effect');
    await page.mouse.move(5, 880);
  });

  await check('a picture is the source: an SVG shape is the mask, an image the pixels, both stay for assistive tech', async () => {
    await page.locator('#metal').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => (document.getElementById('metal') as any)._shader.hasImage === 1 && (document.getElementById('dither') as any)._shader.hasImage === 1, null, { timeout: 10_000 });
    await redraw(page, 'metal');
    const metal = await pixels(page, 'metal');
    assert.equal(metal.corner[3], 0, 'outside the triangle: transparent');
    assert.ok(metal.center[3] > 200, 'inside the triangle: metal');
    const r = await page.evaluate(() => ({
      svg: getComputedStyle(document.querySelector('#metal svg')!).opacity,
      img: getComputedStyle(document.querySelector('#dither img')!).opacity,
      label: document.querySelector('#metal svg')!.getAttribute('aria-label'),
      blocked: document.getElementById('dither')!.dataset.image ?? null,
    }));
    assert.deepEqual(r, { svg: '0', img: '0', label: 'A triangle', blocked: null });
    assert.ok((await pixels(page, 'dither')).spread > 20, 'the photo, dithered');
  });

  await check('a custom shader runs with its data-* uniform; a broken one keeps its poster and reports the GLSL error', async () => {
    const rings = await pixels(page, 'custom');
    assert.ok(rings.spread > 3 && rings.amax === 255, `the rings are drawn (spread ${rings.spread.toFixed(1)})`);
    const errors = await page.evaluate(() => (globalThis as any).__events.filter((e: any) => e.type === 'shader-error').map((e: any) => [e.id, e.detail.effect, e.detail.message]));
    const broken = errors.find((e: string[]) => e[0] === 'broken');
    assert.ok(broken && broken[1] === 'custom' && /oops|undeclared|ERROR/i.test(broken[2]), `GLSL error reported: ${JSON.stringify(broken)}`);
    const unknown = errors.find((e: string[]) => e[0] === 'unknown');
    assert.ok(unknown && /unknown effect "no-such-effect"/.test(unknown[2]), `unknown effect reported: ${JSON.stringify(unknown)}`);
    const r = await page.evaluate(() =>
      ['broken', 'unknown'].map((id) => {
        const el = document.getElementById(id)!;
        return [el.hasAttribute('data-fallback'), el.hasAttribute('data-ready'), getComputedStyle(el.querySelector('canvas')!).display, getComputedStyle(el).backgroundImage !== 'none'];
      }),
    );
    assert.deepEqual(r, [
      [true, false, 'none', true],
      [true, false, 'none', true],
    ]);
  });

  await check('register(): a named effect for the page, with its params as data-* attributes', async () => {
    const r = await page.evaluate(async () => {
      const shader = (globalThis as any).df$.shadcn.shader;
      shader.register('stripes', { params: { bands: 4 }, colors: ['rgb(0, 0, 0)', 'rgb(255, 255, 255)'], fragment: 'uniform float u_bands; void main() { fragColor = vec4(ramp(step(.5, fract(v_uv.x * u_bands))), 1.); }' });
      const el = document.createElement('div');
      el.className = 'shader';
      el.id = 'stripes';
      el.dataset.effect = 'stripes';
      el.dataset.bands = '2';
      el.style.cssText = 'width: 100px; height: 40px; aspect-ratio: auto';
      document.getElementById('tiles')!.append(el);
      // a shader draws only in the viewport: the 44 tiles push the new one below the fold
      el.scrollIntoView({ block: 'center' });
      await new Promise((r, reject) => {
        el.addEventListener('shader-ready', r, { once: true });
        setTimeout(() => reject(new Error('no shader-ready within 15 s')), 15_000);
      });
      const c = el.querySelector('canvas') as HTMLCanvasElement;
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      const px = (x: number) => d[(Math.floor(c.height / 2) * c.width + Math.floor(x * c.width)) * 4];
      let bad = '';
      try {
        shader.register('Bad Name', { fragment: 'void main() {}' });
      } catch (e) {
        bad = String(e);
      }
      return { left: px(0.1), right: px(0.9), quarter: px(0.35), bad };
    });
    assert.deepEqual([r.left, r.quarter, r.right], [0, 255, 255], 'two bands: black, then white from 0.25 (data-bands="2")');
    assert.match(r.bad, /no effect name/);
  });

  await check('surface: every pattern, material, projection and motion is a word in data-*; an unknown word is the first', async () => {
    const words = await page.evaluate(() => (globalThis as any).df$.shadcn.shader.options('surface'));
    assert.deepEqual(Object.keys(words), ['pattern', 'material', 'projection', 'motion']);
    assert.deepEqual([words.pattern.length, words.material.length, words.projection.length, words.motion.length], [26, 28, 13, 24]);
    assert.deepEqual(await page.evaluate(() => (globalThis as any).df$.shadcn.shader.options('aurora')), {});
    await page.locator('#sf').scrollIntoViewIfNeeded();
    const look = async (attrs: Record<string, string>) => {
      await page.evaluate((attrs) => {
        const el = document.getElementById('sf')!;
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(`data-${k}`, v);
      }, attrs);
      await page.waitForTimeout(60);
      await redraw(page, 'sf');
      const p = await pixels(page, 'sf');
      assert.ok(p.spread > 3, `${JSON.stringify(attrs)}: a picture (spread ${p.spread.toFixed(1)})`);
      return p.print.join(',');
    };
    for (const key of ['pattern', 'material', 'projection'] as const) {
      const prints = new Set<string>();
      for (const w of words[key]) prints.add(await look({ [key]: w }));
      assert.equal(prints.size, words[key].length, `every ${key} draws its own picture`);
      await look({ [key]: words[key][0] });
    }
    for (const w of words.motion) await look({ motion: w });
    await look({ motion: 'none' });
    const first = await look({ pattern: 'hex' });
    assert.equal(await look({ pattern: 'no-such-pattern' }), first, 'an unknown word draws the first');
    assert.equal(await page.evaluate(() => (document.getElementById('sf') as any)._shader.params.u_pattern), 0);
    assert.equal(await page.evaluate(() => document.getElementById('sf')!.hasAttribute('data-fallback')), false);
  });

  await check('controls: generated from the effect - lists between previous / next that wrap, sliders, colors, pause, reset', async () => {
    await page.locator('#ctl-box').scrollIntoViewIfNeeded();
    await redraw(page, 'ctl');
    const box = await page.evaluate(() => {
      const b = document.getElementById('ctl-box')!;
      return {
        selects: [...b.querySelectorAll('select')].map((s) => s.id.replace('ctl-box-', '')),
        sliders: b.querySelectorAll('input.slider').length,
        colors: b.querySelectorAll('input[type=color]').length,
        steps: [...b.querySelectorAll('[data-shader-step]')].map((x) => x.getAttribute('aria-label')),
        pause: b.querySelector('[data-shader-action=pause]')?.getAttribute('aria-pressed'),
      };
    });
    assert.deepEqual(box.selects, ['effect', 'pattern', 'material', 'projection', 'motion'], 'the effect and every named choice');
    assert.equal(box.sliders, 13, 'twelve parameters and the speed');
    assert.equal(box.colors, 4, 'one input per palette color');
    assert.equal(box.steps.length, 10);
    assert.equal(box.steps[2], 'Previous pattern');
    assert.equal(box.pause, 'false');
    const pattern = () => page.getAttribute('#ctl', 'data-pattern');
    await page.click('#ctl-box-pattern-next');
    assert.equal(await pattern(), 'checker', 'next: the second word');
    await page.click('#ctl-box-pattern-prev');
    await page.click('#ctl-box-pattern-prev');
    assert.equal(await pattern(), 'lattice', 'previous from the first wraps to the last');
    await page.click('#ctl-box-pattern-next');
    assert.equal(await pattern(), 'hex', 'next from the last wraps to the first');
    // a slider writes its attribute; the parameter glides there
    await page.locator('#ctl-box-scale').fill('16');
    assert.equal(await page.getAttribute('#ctl', 'data-scale'), '16');
    await redraw(page, 'ctl');
    const mid = await page.evaluate(() => (document.getElementById('ctl') as any)._shader.live.u_scale);
    await page.waitForFunction(() => (document.getElementById('ctl') as any)._shader.live.u_scale === 16, null, { timeout: 5000 });
    assert.ok(mid > 8 && mid <= 16, `eases from 8 toward 16 (${mid})`);
    // a color input writes the palette
    await page.locator('#ctl-box [data-shader-color="1"]').fill('#ff0000');
    assert.match((await page.getAttribute('#ctl', 'data-colors')) || '', /^#[0-9a-f]{6} #ff0000 #[0-9a-f]{6} #[0-9a-f]{6}$/);
    // pause, play
    await page.click('#ctl-box [data-shader-action=pause]');
    assert.equal(await page.getAttribute('#ctl', 'data-state-name'), 'paused');
    assert.equal(await page.getAttribute('#ctl-box [data-shader-action=pause]', 'aria-pressed'), 'true');
    await page.click('#ctl-box [data-shader-action=pause]');
    assert.equal(await page.getAttribute('#ctl', 'data-state-name'), 'default');
    // reset: what the controls wrote is gone, the authored attributes stay
    await page.click('#ctl-box [data-shader-action=reset]');
    assert.deepEqual(
      await page.evaluate(() => ['data-scale', 'data-pattern', 'data-colors', 'data-motion'].map((a) => document.getElementById('ctl')!.getAttribute(a))),
      [null, null, null, 'none'],
    );
    // another effect: the controls are rebuilt for it, the focus stays on the button. The list holds the page's
    // registered effects after the built-in ones (register() above added stripes), and the last wraps to the first
    await page.focus('#ctl-box-effect-next');
    await page.click('#ctl-box-effect-next');
    assert.equal(await page.getAttribute('#ctl', 'data-effect'), 'stripes', 'a registered effect is in the list');
    await page.waitForFunction(() => !document.getElementById('ctl-box-pattern'), null, { timeout: 15_000 });
    await page.click('#ctl-box-effect-next');
    assert.equal(await page.getAttribute('#ctl', 'data-effect'), 'mesh-gradient', 'the last effect wraps to the first');
    await page.waitForFunction(() => !!document.getElementById('ctl-box-distortion'), null, { timeout: 15_000 });
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'ctl-box-effect-next');
  });

  await check('post passes: the surface effect is anti-aliased (FXAA) and smoothed; data-aa="none" data-smooth="0" draws straight', async () => {
    await page.locator('#raw').scrollIntoViewIfNeeded();
    await redraw(page, 'raw');
    const r = await page.evaluate(() => {
      const a = (document.getElementById('t-surface') as any)._shader;
      const b = (document.getElementById('raw') as any)._shader;
      return { aa: [a.aa, b.aa], smooth: [a.smooth, b.smooth], post: [!!a.post, !!b.post], history: !!a.post?.history };
    });
    assert.deepEqual(r.aa, ['fxaa', 'none']);
    assert.deepEqual(r.smooth, [0.6, 0]);
    assert.deepEqual(r.post, [true, false], 'only the smoothed instance holds post targets');
    assert.equal(r.history, true, 'a history target for the frame blend');
    for (const id of ['t-surface', 'raw']) {
      const p = await pixels(page, id);
      assert.equal(p.amin, 255, `${id}: opaque - the alpha hint never reaches the canvas`);
      assert.ok(p.spread > 3, `${id}: a picture`);
    }
  });

  await check('a press is a tap: the ripple starts a ring where it lands (u_taps)', async () => {
    await page.locator('#tap').scrollIntoViewIfNeeded();
    await redraw(page, 'tap');
    const before = await pixels(page, 'tap');
    const box = (await page.locator('#tap').boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(700);
    await redraw(page, 'tap');
    const after = await pixels(page, 'tap');
    const taps = await page.evaluate(() => (document.getElementById('tap') as any)._shader.taps.map((t: number[]) => t.slice(0, 2).map((v) => Math.round(v * 10) / 10)));
    assert.deepEqual(taps, [[0.5, 0.5]], 'the press, in v_uv space');
    assert.notEqual(after.print.join(','), before.print.join(','), 'the ring changes the picture');
    await page.mouse.move(5, 880);
  });

  await check('variants: the background fills its host behind the content, the border reaches --shader-glow past it', async () => {
    const r = await page.evaluate(() => {
      const box = (id: string) => document.getElementById(id)!.getBoundingClientRect();
      const host = getComputedStyle(document.getElementById('bg-host')!);
      const bhost = getComputedStyle(document.getElementById('border-host')!);
      return {
        bg: [box('bg').width - box('bg-host').width, box('bg').height - box('bg-host').height, getComputedStyle(document.getElementById('bg')!).zIndex, host.position, host.isolation],
        border: [Math.round(box('border-host').left - box('border').left), Math.round(box('border').right - box('border-host').right), bhost.position, bhost.isolation],
        frame: (document.getElementById('border') as any)._shader.frame,
      };
    });
    assert.deepEqual(r.bg, [0, 0, '-1', 'relative', 'isolate']);
    assert.deepEqual(r.border, [20, 20, 'relative', 'isolate'], '1.25rem past each edge');
    assert.deepEqual(r.frame, [20, 12], 'the ring sits on the host: inset 20px, its 12px radius');
    const ring = await pixels(page, 'border');
    assert.ok(ring.amin === 0 && ring.amax > 0, 'clear inside, the glow on the edge');
    // the glow fades out before the box ends: its outermost pixels are clear (exp alone left about a quarter there -
    // a hard rectangle around the search box of the Search & Navigation template)
    const edge = await page.evaluate(() => {
      const c = document.getElementById('border')!.querySelector('canvas.shader-canvas') as HTMLCanvasElement;
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      let max = 0;
      for (let x = 0; x < c.width; x++) for (const y of [0, c.height - 1]) max = Math.max(max, d[(y * c.width + x) * 4 + 3]!);
      for (let y = 0; y < c.height; y++) for (const x of [0, c.width - 1]) max = Math.max(max, d[(y * c.width + x) * 4 + 3]!);
      return max;
    });
    assert.ok(edge <= 8, `the canvas edge is clear (alpha ${edge})`);
  });

  await check('below the fold: no frame until it is scrolled to', async () => {
    assert.equal(await frames(page, 'below'), 0);
    await page.locator('#below').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.getElementById('below')!.hasAttribute('data-ready'), null, { timeout: 15_000 });
    assert.ok((await pixels(page, 'below')).spread > 3);
    assert.equal((await stats(page)).contexts, 1, 'still one context');
  });

  await check('only what is in the viewport draws: just below the fold a shader stops, in view it runs again', async () => {
    // 40 px under the fold - inside the 20% margin the engine once drew ahead
    await page.evaluate(() => {
      const el = document.getElementById('below')!;
      scrollTo(0, el.getBoundingClientRect().top + scrollY - innerHeight - 40);
    });
    await page.waitForTimeout(400);
    const out = await frames(page, 'below');
    await page.waitForTimeout(600);
    assert.equal(await frames(page, 'below'), out, 'no frame out of view');
    assert.equal(await page.evaluate(() => (document.getElementById('below') as any)._shader.visible), false);
    await page.locator('#below').scrollIntoViewIfNeeded();
    await page.waitForFunction((n) => (document.getElementById('below') as any)._shader.frames > n + 2, out, { timeout: 10_000 });
    // the resolution steps between three levels - it never drifts (a drifting scale re-sampled every canvas)
    assert.ok([1, 0.75, 0.5].includes((await stats(page)).scale), 'scale ' + (await stats(page)).scale);
  });

  await check('a resize renders at the new size (CSS size × the render scale)', async () => {
    // only what is in view draws: back to the top first
    await page.evaluate(() => scrollTo(0, 0));
    await page.evaluate(() => (document.getElementById('still')!.style.width = '224px'));
    await page.waitForFunction(
      () => {
        const el = document.getElementById('still') as any;
        const i = el._shader;
        return i.cssW === 224 && i.w === Math.max(1, Math.round(224 * i.scale)) && el.querySelector('canvas').width === i.w;
      },
      null,
      { timeout: 5000 },
    );
  });

  await page.close();

  await check('reduced motion: one still frame per effect, no clock', async () => {
    const p = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    await p.goto(url);
    await p.waitForFunction((n) => document.querySelectorAll('#tiles .shader[data-ready]').length === n, EFFECTS.length, { timeout: 60_000 });
    await p.waitForTimeout(300);
    const s1 = await stats(p);
    await p.waitForTimeout(500);
    const s2 = await stats(p);
    assert.equal(s2.animating, 0, 'nothing animating');
    assert.equal(s2.frames, s1.frames, 'no frames after the still ones');
    assert.ok((await pixels(p, 't-aurora')).spread > 3, 'the still frame is a picture');
    await p.close();
  });

  await check('without WebGL2: every shader keeps its poster and reports why', async () => {
    const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await p.addInitScript(() => {
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        return type === 'webgl2' ? null : (get as any).call(this, type, ...rest);
      } as typeof get;
      (globalThis as any).__errors = [];
      document.addEventListener('shader-error', (e) => (globalThis as any).__errors.push((e as CustomEvent).detail.message));
    });
    await p.goto(url);
    await p.waitForFunction((n) => document.querySelectorAll('#tiles .shader[data-fallback]').length === n, EFFECTS.length, { timeout: 15_000 });
    const r = await p.evaluate(() => ({
      ready: document.querySelectorAll('.shader[data-ready]').length,
      poster: getComputedStyle(document.getElementById('t-mesh-gradient')!).backgroundImage.startsWith('radial-gradient'),
      canvas: getComputedStyle(document.querySelector('#t-mesh-gradient canvas')!).display,
      img: getComputedStyle(document.querySelector('#dither img')!).opacity,
      message: (globalThis as any).__errors[0],
      supported: (globalThis as any).df$.shadcn.shader.stats().supported,
    }));
    assert.deepEqual(r, { ready: 0, poster: true, canvas: 'none', img: '1', message: 'WebGL2 is not available', supported: false });
    await p.close();
  });

  await check('the context is released with nothing in view; the canvases keep their last frame, and draw again in view', async () => {
    const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors: string[] = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(url);
    await p.waitForFunction((n) => document.querySelectorAll('#tiles .shader[data-ready]').length === n, EFFECTS.length, { timeout: 60_000 });
    const before = await pixels(p, 't-aurora');
    await p.evaluate(() => scrollTo(0, 2400));
    await p.waitForFunction(() => (globalThis as any).df$.shadcn.shader.stats().contexts === 0, null, { timeout: 20_000 });
    assert.ok((await pixels(p, 't-aurora')).spread > 3 && before.spread > 3, 'the last frame stays');
    const drawn = await frames(p, 't-aurora');
    await p.evaluate(() => scrollTo(0, 0));
    await p.waitForFunction(() => (globalThis as any).df$.shadcn.shader.stats().contexts === 1, null, { timeout: 30_000 });
    // the programs compile again (a frame draws one only when it is linked - a released one left none behind)
    await p.waitForFunction((n) => (document.getElementById('t-aurora') as any)._shader.frames > n + 2, drawn, { timeout: 60_000 });
    assert.deepEqual(errors, []);
    await p.close();
  });

  await check('render(): the markup of every state, 1:1 - and the store', async () => {
    const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await p.goto(url);
    // forty-odd programs compile first (a software GPU takes seconds); the contract reads the page after
    await p.waitForFunction((n) => document.querySelectorAll('#tiles .shader[data-ready]').length === n, EFFECTS.length, { timeout: 60_000 });
    await assertRenderContract(p, '.shader[id]', ['default', 'paused'], { runtimeAttrs: ['data-ready', 'data-fallback', 'data-image'], runtimeOwned: '.shader-canvas' });
    await p.close();
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`shader.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
