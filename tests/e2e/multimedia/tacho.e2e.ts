import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

/**
 * Why: the Tacho promises a needle on a scale over a native <meter> - the arc, the ticks and their labels, the meter's
 * low / high / optimum regions as zones, a needle that moves like a real one (a spring that overshoots and settles,
 * a smooth one, an instant one, end stops, no motion when the reader asks for none) - and a tuner on top of it: the
 * nearest note or string, the frequency, the cents, a pitch detector and listen() on an audio node. This drives the
 * shipped files: the dial of every fixture configuration, the needle's motion sampled frame by frame, the zones and
 * their colours, tune() and pitch(), detect() on synthesized signals, listen() on a running AudioContext, the bound
 * inputs, a value written into the meter, the formats (built in and added), the config, the events, the sizes, idle
 * and the render contract.
 */

const FIXTURE = '/tests/e2e/multimedia/tacho.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();
let failures = 0;
async function check(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${label}\n    ${err instanceof Error ? err.message : err}`);
  }
}
type State = { name: string; config: { value: number; label: string; text: string | null; caption: string } };
const state = (page: Page, id: string): Promise<State> => page.$eval(`#${id}`, (el: any) => el.api.getState());
const set = (page: Page, id: string, name: string, config: Record<string, unknown> = {}) =>
  page.$eval(`#${id}`, async (el: any, [n, c]) => { await el.api.setState(n, c); }, [name, config] as const);
const tc = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([f, a]) => (globalThis as any).df$.shadcn.tacho[f as string](...(a as unknown[])), [fn, args] as const);
const text = (page: Page, sel: string) => page.$eval(sel, (e) => e.textContent ?? '');
/** the needle's angle in degrees */
const angle = (page: Page, id: string) =>
  page.$eval(`#${id} .tacho-needle`, (e) => Number(/rotate\(([-\d.]+)\)/.exec(e.getAttribute('transform') ?? '')?.[1]));
const settled = (page: Page, id: string) => tc(page, 'settled', `#${id}`);
const near = (a: number, b: number, eps = 1e-3) => Math.abs(a - b) <= eps;

try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${server.url}${FIXTURE}`);
  await page.waitForFunction(() => document.querySelectorAll('.tacho[data-init]').length === 10);
  for (const id of ['tc-tuner', 'tc-pan', 'tc-spring', 'tc-smooth', 'tc-instant', 'tc-rev', 'tc-vu', 'tc-sm', 'tc-idle', 'tc-knob-view']) await settled(page, id);

  await check('the dial: drawn before the meter, which stays for assistive technology; ticks, labels, zones', async () => {
    const info = await page.$$eval('.tacho', (els) =>
      Object.fromEntries(
        els.map((el) => [
          el.id,
          {
            first: el.querySelector('.tacho-dial')?.nextElementSibling?.tagName,
            labels: [...el.querySelectorAll('.tacho-tick-label')].map((t) => t.textContent).join(' '),
            majors: (el.querySelector('.tacho-tick[data-major]')?.getAttribute('d')?.match(/M/g) ?? []).length,
            minors: (el.querySelector('.tacho-tick:not([data-major])')?.getAttribute('d')?.match(/M/g) ?? []).length,
            zones: [...el.querySelectorAll('.tacho-zone')].map((z) => z.getAttribute('data-zone')).join(' '),
            hidden: el.querySelector('.tacho-dial')?.getAttribute('aria-hidden'),
          },
        ]),
      ),
    );
    assert.equal(info['tc-tuner'].first, 'METER');
    assert.equal(info['tc-tuner'].hidden, 'true');
    assert.equal(info['tc-tuner'].labels, '-50 -25 0 +25 +50');
    assert.deepEqual([info['tc-tuner'].majors, info['tc-tuner'].minors], [5, 16]);
    assert.equal(info['tc-tuner'].zones, 'suboptimum optimum suboptimum');
    assert.equal(info['tc-pan'].labels, 'L50 L25 C R25 R50');
    assert.equal(info['tc-pan'].zones, '', 'no low and high: no zones');
    assert.equal(info['tc-rev'].labels, '0 1 2 3 4 5 6 7 8', 'an added format: the scale in thousands');
    assert.equal(info['tc-rev'].zones, 'optimum suboptimum even-less-good');
    assert.equal(info['tc-vu'].labels, '-20 -15 -10 -5 0', 'the scale goes without the readout\'s decimals');
    assert.equal(info['tc-sm'].labels, '0 1', 'data-labels="ends"');
    const box = await page.$eval('#tc-tuner-meter', (e) => e.getBoundingClientRect().toJSON());
    assert.ok(box.width <= 1 && box.height <= 1, 'the meter is visually hidden');
    assert.equal(await page.getAttribute('#tc-tuner-meter', 'aria-valuetext'), 'A, 440.0 Hz, A4 · 0 ct');
    assert.equal(await page.getAttribute('#tc-pan meter', 'aria-valuetext'), 'L20');
  });

  await check('the needle on the value: the sweep around the top, the readouts in their formats', async () => {
    const angles = Object.fromEntries(await Promise.all(['tc-tuner', 'tc-pan', 'tc-rev', 'tc-vu', 'tc-knob-view'].map(async (id) => [id, await angle(page, id)])));
    assert.equal(angles['tc-tuner'], 0);
    assert.equal(angles['tc-pan'], -18, '-20 of ±50 over 90°');
    assert.equal(angles['tc-rev'], -96, '800 of 8000 over 240°');
    assert.ok(near(angles['tc-vu'], -45 + (10 / 23) * 90, 0.01));
    assert.equal(angles['tc-knob-view'], -54, '3 of 10 over 270°');
    assert.equal(await text(page, '#tc-pan .tacho-value'), 'L20');
    assert.equal(await text(page, '#tc-rev .tacho-value'), '800 rpm');
    assert.equal(await text(page, '#tc-vu .tacho-value'), '-10.0 dB');
    assert.equal(await text(page, '#tc-tuner .tacho-value'), '440.0 Hz', 'authored text is its own');
  });

  await check('the needle moves: a spring overshoots and settles, smooth does not, instant jumps; the end stop holds it', async () => {
    const samples = await page.evaluate(async () => {
      const ids = ['tc-spring', 'tc-smooth', 'tc-instant'];
      const needle = (id: string) => Number(/rotate\(([-\d.]+)\)/.exec(document.querySelector(`#${id} .tacho-needle`)!.getAttribute('transform') ?? '')?.[1]);
      for (const id of ids) (document.querySelector(`#${id}`) as any).api.setState('default', { value: 100 });
      const first = ids.map(needle);
      const seen: number[][] = [];
      const t0 = performance.now();
      while (performance.now() - t0 < 1500) {
        await new Promise(requestAnimationFrame);
        seen.push(ids.map(needle));
      }
      return { first, max: ids.map((_, i) => Math.max(...seen.map((s) => s[i]))), last: seen.at(-1), monotone: seen.every((s, i) => i === 0 || s[1] >= seen[i - 1][1] - 1e-9) };
    });
    assert.equal(samples.first[2], 60, 'instant: at once');
    assert.ok(samples.first[0] < 0, `spring: not at once (${samples.first[0]})`);
    assert.ok(samples.max[0] > 60.5, `the spring overshoots: ${samples.max[0]}`);
    assert.ok(samples.max[0] <= 63.01, `the end stop at 2.5 % past the end: ${samples.max[0]}`);
    assert.ok(samples.max[1] <= 60.001 && samples.monotone, `smooth: no overshoot (${samples.max[1]})`);
    assert.deepEqual(samples.last, [60, 60, 60]);
    // with reduced motion the needle jumps
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await set(page, 'tc-spring', 'default', { value: 0 });
    assert.equal(await angle(page, 'tc-spring'), -60, 'prefers-reduced-motion: at once');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await set(page, 'tc-smooth', 'default', { value: 0 });
    await set(page, 'tc-instant', 'default', { value: 0 });
  });

  await check('zones: the value\'s region on the root (the meter\'s own), the needle and the label in its colour', async () => {
    const zone = (id: string) => page.getAttribute(`#${id}`, 'data-zone');
    await set(page, 'tc-tuner', 'default', { value: 3 });
    assert.equal(await zone('tc-tuner'), 'optimum');
    const green = await page.$eval('#tc-tuner .tacho-label', (e) => getComputedStyle(e).color);
    await set(page, 'tc-tuner', 'default', { value: 20 });
    assert.equal(await zone('tc-tuner'), 'suboptimum');
    await page.waitForTimeout(250);
    assert.notEqual(await page.$eval('#tc-tuner .tacho-label', (e) => getComputedStyle(e).color), green);
    assert.equal(
      await page.$eval('#tc-tuner .tacho-needle-blade', (e) => getComputedStyle(e).fill),
      await page.$eval('#tc-tuner .tacho-label', (e) => getComputedStyle(e).color),
    );
    await set(page, 'tc-rev', 'default', { value: 6000 });
    assert.equal(await zone('tc-rev'), 'suboptimum');
    await set(page, 'tc-rev', 'default', { value: 7000 });
    assert.equal(await zone('tc-rev'), 'even-less-good');
    assert.equal(await text(page, '#tc-rev .tacho-value'), '7,000 rpm');
    await set(page, 'tc-vu', 'default', { value: 2 });
    assert.equal(await zone('tc-vu'), 'even-less-good');
    assert.equal(await zone('tc-pan'), null);
    await set(page, 'tc-tuner', 'default', { value: 0 });
    await set(page, 'tc-rev', 'default', { value: 800 });
    await set(page, 'tc-vu', 'default', { value: -10 });
  });

  await check('tune(): the nearest note above, the frequency below, the cents on the needle; strings, flats, A4, no signal', async () => {
    const hz = 440 * 2 ** (12 / 1200);
    assert.deepEqual(await tc(page, 'tune', '#tc-tuner', hz), { note: 'A', octave: 4, cents: 12, target: 440 });
    let s = await state(page, 'tc-tuner');
    assert.deepEqual(s.config, { value: 12, label: 'A', text: '443.1 Hz', caption: 'A4 · +12 ct' });
    assert.equal(await page.getAttribute('#tc-tuner-meter', 'aria-valuetext'), 'A, 443.1 Hz, A4 · +12 ct');
    await settled(page, 'tc-tuner');
    assert.equal(await angle(page, 'tc-tuner'), 12, '12 of ±50 over 100°');
    assert.equal((await tc(page, 'tune', '#tc-tuner', 261.63)).note, 'C');
    assert.equal((await state(page, 'tc-tuner')).config.value, 0);
    assert.equal((await tc(page, 'pitch', 466.16, { notation: 'flat' })).note, 'B♭');
    assert.equal((await tc(page, 'pitch', 466.16)).note, 'A♯');
    assert.equal((await tc(page, 'pitch', 432, { a4: 432 })).cents, 0);
    assert.deepEqual(await tc(page, 'pitch', 82.0, { strings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] }), { note: 'E', octave: 2, cents: -8.6, target: 82.41 });
    // far from every string: the needle at its end stop, the caption has the cents
    await tc(page, 'tune', '#tc-tuner', 100, { strings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] });
    s = await state(page, 'tc-tuner');
    assert.equal(s.config.value, -50, 'the meter keeps its range');
    assert.equal(s.config.caption, 'A2 · -165 ct');
    assert.equal(await tc(page, 'tune', '#tc-tuner', null), null);
    assert.equal((await state(page, 'tc-tuner')).name, 'idle');
    assert.equal(await page.getAttribute('#tc-tuner', 'data-idle'), '');
    await settled(page, 'tc-tuner');
    assert.equal(await angle(page, 'tc-tuner'), 0, 'idle: back to its rest (the optimum)');
    await tc(page, 'tune', '#tc-tuner', 440);
    assert.equal((await state(page, 'tc-tuner')).name, 'default');
    assert.equal(await page.getAttribute('#tc-tuner', 'data-idle'), null);
  });

  await check('detect(): the pitch of sines and of a tone rich in harmonics; none in noise or silence', async () => {
    const out = await page.evaluate(() => {
      const detect = (globalThis as any).df$.shadcn.tacho.detect;
      const sr = 48000;
      const tone = (f: number, harmonics: number) => {
        const x = new Float32Array(4096);
        for (let i = 0; i < x.length; i++) for (let k = 1; k <= harmonics; k++) x[i] += (0.5 / k) * Math.sin((2 * Math.PI * f * k * i) / sr);
        return x;
      };
      const noise = new Float32Array(4096).map(() => Math.random() * 2 - 1);
      return {
        found: [82.41, 110, 329.63, 1000].map((f, i) => detect(tone(f, i === 1 ? 8 : 1), sr)?.frequency),
        clarity: detect(tone(110, 8), sr)?.clarity,
        noise: detect(noise, sr),
        silence: detect(new Float32Array(4096), sr),
      };
    });
    [82.41, 110, 329.63, 1000].forEach((f, i) => assert.ok(Math.abs(out.found[i] / f - 1) < 0.002, `${f} Hz: ${out.found[i]}`));
    assert.ok(out.clarity > 0.95, `clarity ${out.clarity}`);
    assert.ok(out.noise === null || out.noise.clarity < 0.85, 'noise has no clear pitch');
    assert.equal(out.silence, null);
  });

  await check('listen(): a running AudioContext - what an oscillator plays is detected and shown; silence is idle', async () => {
    const started = await page.evaluate(async () => {
      const ctx = new AudioContext();
      await ctx.resume();
      const osc = new OscillatorNode(ctx, { type: 'sawtooth', frequency: 440 * 2 ** (12 / 1200) });
      const gain = new GainNode(ctx, { gain: 0.3 });
      osc.connect(gain);
      osc.start();
      Object.assign(globalThis, { listenCtx: ctx, listenOsc: osc });
      return { state: ctx.state, node: (globalThis as any).df$.shadcn.tacho.listen('#tc-tuner', gain) instanceof AnalyserNode };
    });
    try {
      assert.deepEqual(started, { state: 'running', node: true });
      await page.waitForFunction(() => {
        const c = (document.querySelector('#tc-tuner') as any).api.getState().config;
        return c.label === 'A' && Math.abs(c.value - 12) <= 2;
      }, null, { timeout: 5000 });
      const hz = parseFloat(await text(page, '#tc-tuner .tacho-value'));
      assert.ok(Math.abs(hz - 443.06) <= 0.2, `the frequency detected: ${hz} Hz`);
      await page.evaluate(() => (globalThis as any).listenOsc.stop());
      await page.waitForFunction(() => (document.querySelector('#tc-tuner') as any).api.getState().name === 'idle', null, { timeout: 5000 });
    } finally {
      assert.equal(await tc(page, 'listen', '#tc-tuner', null), null);
      await page.evaluate(() => (globalThis as any).listenCtx.close());
      await set(page, 'tc-tuner', 'default', { value: 0, label: 'A', text: '440.0 Hz', caption: 'A4 · 0 ct' });
    }
  });

  await check('bound inputs (a slider, a knob) and a value written into the meter drive the needle', async () => {
    await page.$eval('#tc-pan-slider', (e) => {
      (e as HTMLInputElement).value = '15';
      e.dispatchEvent(new Event('input', { bubbles: true }));
    });
    assert.equal((await state(page, 'tc-pan')).config.value, 15);
    assert.equal(await text(page, '#tc-pan .tacho-value'), 'R15');
    await page.focus('#tc-knob');
    await page.keyboard.press('End');
    assert.equal((await state(page, 'tc-knob-view')).config.value, 10);
    await page.$eval('#tc-pan meter', (m) => ((m as HTMLMeterElement).value = -5));
    await page.waitForFunction(() => document.querySelector('#tc-pan .tacho-value')?.textContent === 'L5');
    assert.equal((await state(page, 'tc-pan')).config.value, -5);
    await set(page, 'tc-pan', 'default', { value: 0 });
    assert.equal(await text(page, '#tc-pan .tacho-value'), 'C');
  });

  await check('formats: one added and named later redraws the scale and the readout; another range redraws the dial', async () => {
    await page.evaluate(() => (globalThis as any).df$.shadcn.tacho.format('pct', (v: number, c: any) => (c.tick ? `${v * 100}` : `${Math.round(v * 100)} %`)));
    await page.$eval('#tc-sm', (e) => e.setAttribute('data-format', 'pct'));
    await page.waitForFunction(() => document.querySelector('#tc-sm .tacho-value')?.textContent === '50 %');
    assert.equal(await page.$$eval('#tc-sm .tacho-tick-label', (els) => els.map((e) => e.textContent).join(' ')), '0 100');
    await page.$eval('#tc-sm meter', (m) => m.setAttribute('max', '2'));
    await page.waitForFunction(() => [...document.querySelectorAll('#tc-sm .tacho-tick-label')].map((e) => e.textContent).join(' ') === '0 200');
    await settled(page, 'tc-sm');
    assert.equal(await angle(page, 'tc-sm'), -30, '0.5 of 2 over 120°');
    await page.$eval('#tc-sm meter', (m) => m.setAttribute('max', '1'));
    await page.$eval('#tc-sm', (e) => e.removeAttribute('data-format'));
  });

  await check('the config: merged; text null shows the value in its format; setState(getState()) changes nothing; the events', async () => {
    await page.evaluate(() => {
      (globalThis as any).changes = [];
      document.querySelector('#tc-tuner')!.addEventListener('tacho-change', (e: any) => (globalThis as any).changes.push(e.detail));
    });
    await set(page, 'tc-tuner', 'default', { value: -10 });
    const s = await state(page, 'tc-tuner');
    assert.deepEqual(s.config, { value: -10, label: 'A', text: '440.0 Hz', caption: 'A4 · 0 ct' });
    const changes = await page.evaluate(() => (globalThis as any).changes);
    assert.deepEqual(changes, [{ value: -10, zone: 'suboptimum', label: 'A', text: '440.0 Hz', caption: 'A4 · 0 ct' }]);
    await page.$eval('#tc-tuner', async (el: any) => { await el.api.setState('default', el.api.getState().config); });
    assert.equal((await page.evaluate(() => (globalThis as any).changes)).length, 1, 'no change, no event');
    await set(page, 'tc-tuner', 'default', { text: null });
    assert.equal(await text(page, '#tc-tuner .tacho-value'), '-10');
    await set(page, 'tc-tuner', 'default', { value: 0, text: '440.0 Hz' });
    assert.equal(await tc(page, 'value', '#tc-tuner'), 0);
    assert.equal(await tc(page, 'value', '#tc-tuner-meter', 5), 5, 'the meter resolves to its tacho');
    assert.ok(Number.isNaN(await tc(page, 'value', '#nothing')));
    await tc(page, 'value', '#tc-tuner', 0);
  });

  await check('sizes, colour, idle authored', async () => {
    const w = (id: string) => page.$eval(`#${id}`, (e) => Math.round(e.getBoundingClientRect().width));
    assert.equal(await w('tc-sm'), 160);
    assert.equal(await w('tc-pan'), 256);
    assert.equal(await w('tc-tuner'), 352);
    const colours = await page.$eval('#tc-sm', (el) => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--chart-2)';
      el.append(probe);
      const chart = getComputedStyle(probe).color;
      probe.remove();
      return { chart, needle: getComputedStyle(el.querySelector('.tacho-needle-blade')!).fill, pivot: getComputedStyle(el.querySelector('.tacho-pivot')!).fill };
    });
    assert.ok(colours.needle === colours.chart && colours.pivot === colours.chart, JSON.stringify(colours));
    assert.equal((await state(page, 'tc-idle')).name, 'idle');
    assert.equal(await page.$eval('#tc-idle .tacho-label', (e) => getComputedStyle(e).opacity), '0.35');
    await set(page, 'tc-idle', 'default');
    assert.equal(await page.getAttribute('#tc-idle', 'data-idle'), null);
    await set(page, 'tc-idle', 'idle');
  });

  await check('no page error', async () => {
    assert.deepEqual(errors, []);
  });

  await check('render(): the model is the authored markup; render(state) equals setState(state) on the live element', async () => {
    await assertRenderContract(page, '.tacho[id]', ['default', 'idle'], { runtimeOwned: '.tacho-dial' });
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\ntacho.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('tacho.e2e: all checks passed');
