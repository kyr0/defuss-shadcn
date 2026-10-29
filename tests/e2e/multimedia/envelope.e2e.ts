import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

/**
 * Why: the Envelope promises the curves of an audio plugin, drawn from one JSON object and edited by their handles -
 * an ADSR (delay, attack, hold, decay, sustain, release, the bends), a compressor's transfer curve (threshold, ratio,
 * knee, makeup, attack, release) and a filter's or an EQ's response (Web Audio's own) - with knobs, inputs and
 * selects bound to the parameters both ways, playback that shows the live value and phase, and the parameters driving
 * Web Audio. This drives the shipped files: the curves and their handles, the drags (frozen view, Shift, Escape, the
 * editing state, the events, the source written back), the keys, the resets, the bound controls, the gate / trigger /
 * stop / reset actions, the phases and outputs, a retriggered gate, schedule() and connect() rendered offline against
 * the curve, the compressor's static curve and its attack and release, a filter's response against Web Audio's
 * biquads, modulate(), the EQ's bands, the sizes, read-only, disabled, the merged config and the render contract.
 */

const FIXTURE = '/tests/e2e/multimedia/envelope.e2e-fixture.html';
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
type State = { name: string; params: Record<string, any> };
const state = (page: Page, id: string): Promise<State> =>
  page.$eval(`#${id}`, (el: any) => {
    const st = el.api.getState();
    return { name: st.name as string, params: st.config.params };
  });
const set = (page: Page, id: string, name: string, config: Record<string, unknown> = {}) =>
  page.$eval(`#${id}`, async (el: any, [n, c]) => { await el.api.setState(n, c); }, [name, config] as const);
const env = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([f, a]) => (globalThis as any).df$.shadcn.envelope[f as string](...(a as unknown[])), [fn, args] as const);
const text = (page: Page, sel: string) => page.$eval(sel, (e) => e.textContent ?? '');
const source = (page: Page, id: string) => page.$eval(`#${id} > script.envelope-source`, (e) => e.textContent ?? '');
const near = (a: number, b: number, eps = 1e-3) => Math.abs(a - b) <= eps;
const plot = async (page: Page, id: string) =>
  (await page.$eval(`#${id} .envelope-plot`, (e) => e.getBoundingClientRect().toJSON())) as DOMRect;
const handle = (id: string, h: string) => `#${id} .envelope-handle[data-handle="${h}"]`;
const centre = async (page: Page, sel: string) => {
  const b = (await page.$eval(sel, (e) => e.getBoundingClientRect().toJSON())) as DOMRect;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
/** a drag of a handle by an offset in px - held when hold is set */
async function drag(page: Page, sel: string, dx: number, dy: number, opts: { hold?: boolean; shift?: boolean } = {}) {
  const c = await centre(page, sel);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  if (opts.shift) await page.keyboard.down('Shift');
  await page.mouse.move(c.x + dx / 2, c.y + dy / 2);
  await page.mouse.move(c.x + dx, c.y + dy);
  if (opts.shift) await page.keyboard.up('Shift');
  if (!opts.hold) await page.mouse.up();
}
const reset = (page: Page, id: string) => env(page, 'params', `#${id}`, null).then(() => page.click(`#${id}-reset`));
/** the shape of a bend at the middle of a slope: 1 / (1 + e^(-4c)) */
const mid = (c: number) => 1 / (1 + Math.exp(-4 * c));

try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1800 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${server.url}${FIXTURE}`);
  await page.waitForFunction(() => document.querySelectorAll('.envelope[data-init]').length === 10);
  const authored = await source(page, 'ev-amp');

  await check('init: a group described by the whole curve, the handles of each kind, the curves in SVG', async () => {
    const info = await page.$$eval('.envelope', (els) =>
      els.map((el) => ({
        id: el.id,
        role: el.getAttribute('role'),
        desc: document.getElementById((el.getAttribute('aria-describedby') ?? '').split(' ').pop() ?? '')?.textContent,
        handles: [...el.querySelectorAll('.envelope-handle')].map((h) => h.getAttribute('data-handle')),
        svg: el.querySelector('.envelope-curve')?.namespaceURI,
      })),
    );
    const by = Object.fromEntries(info.map((i) => [i.id, i]));
    for (const i of info) {
      assert.equal(i.role, 'group', i.id);
      assert.equal(i.svg, 'http://www.w3.org/2000/svg', i.id);
    }
    assert.equal(by['ev-amp'].desc, 'Attack 100 ms, decay 300 ms, sustain 60%, release 400 ms');
    assert.deepEqual(by['ev-amp'].handles, ['attack', 'attackCurve', 'decay', 'decayCurve', 'release', 'releaseCurve']);
    assert.deepEqual(by['ev-dahdsr'].handles, ['delay', 'attack', 'attackCurve', 'hold', 'decay', 'decayCurve', 'release', 'releaseCurve']);
    assert.equal(by['ev-dahdsr'].desc, 'Delay 200 ms, attack 300 ms, hold 200 ms, decay 500 ms, sustain 40%, release 600 ms');
    assert.deepEqual(by['ev-comp'].handles, ['threshold', 'ratio']);
    assert.equal(by['ev-comp'].desc, 'Threshold -24.0 dB, ratio 4:1, knee 6.0 dB, makeup +3.0 dB, attack 10 ms, release 200 ms');
    assert.deepEqual(by['ev-filter'].handles, ['cut']);
    assert.equal(by['ev-filter'].desc, 'Cutoff: low pass, 2 kHz, 24 dB/oct, resonance +6.0 dB');
    assert.deepEqual(by['ev-eq'].handles, ['low', 'bass', '3', 'air', 'notch']);
    assert.deepEqual(by['ev-sm'].handles, ['attack', 'attackCurve', 'decay', 'decayCurve', 'release'], 'a sustain of 0: no release bend');
    assert.deepEqual(by['ev-readonly'].handles, [], 'read-only: no handles');
    assert.equal(by['ev-bare'].desc, 'Attack 10 ms, decay 300 ms, sustain 70%, release 500 ms', 'no source: the defaults');
    // the phase strip: one mark per stage
    assert.deepEqual(await page.$$eval('#ev-dahdsr .envelope-phase', (els) => els.map((e) => e.textContent)), ['Dly', 'A', 'H', 'D', 'S', 'R']);
    // a handle in words
    assert.equal(await page.getAttribute(handle('ev-amp', 'decay'), 'aria-valuetext'), 'Decay 300 ms, sustain 60%');
    assert.equal(await page.getAttribute(handle('ev-amp', 'decay'), 'role'), 'slider');
  });

  await check('the curve: the ADSR levels at times, bends included (valueAt)', async () => {
    assert.ok(near((await env(page, 'valueAt', '#ev-amp', 0.05)).value, 0.5), 'half the attack');
    const decay = await env(page, 'valueAt', '#ev-amp', 0.25);
    assert.equal(decay.phase, 'decay');
    assert.ok(near(decay.value, 1 - 0.4 * mid(0.5)), `a bent decay: ${decay.value}`);
    assert.deepEqual(await env(page, 'valueAt', '#ev-amp', 2), { value: 0.6, phase: 'sustain' });
    const release = await env(page, 'valueAt', '#ev-amp', 0.8, 0.6);
    assert.equal(release.phase, 'release');
    assert.ok(near(release.value, 0.3), 'half the release from the sustain');
    assert.deepEqual(await env(page, 'valueAt', '#ev-amp', 1.1, 0.6), { value: 0, phase: 'idle' });
    // released in the attack: from the level reached
    assert.ok(near((await env(page, 'valueAt', '#ev-amp', 0.05 + 0.2, 0.05)).value, 0.25));
    assert.deepEqual(await env(page, 'valueAt', '#ev-dahdsr', 0.1), { value: 0, phase: 'delay' });
    assert.deepEqual(await env(page, 'valueAt', '#ev-dahdsr', 0.6), { value: 1, phase: 'hold' });
    assert.ok(near((await env(page, 'valueAt', '#ev-dahdsr', 0.35)).value, mid(0.6)), 'a bent attack');
  });

  await check('a drag: the time of a handle on the plot as it was when the drag began, the editing state, the events, the source', async () => {
    await page.evaluate(() => {
      (globalThis as any).changes = [];
      document.querySelector('#ev-amp')!.addEventListener('envelope-change', (e: any) => (globalThis as any).changes.push(e.detail.committed));
    });
    const box = await plot(page, 'ev-amp');
    await drag(page, handle('ev-amp', 'attack'), box.width * 0.1, 0, { hold: true });
    const during = await state(page, 'ev-amp');
    assert.equal(during.name, 'editing');
    assert.equal(await page.$eval('#ev-amp', (el: any) => el.api.getState().config.handle), 'attack');
    assert.ok(near(during.params.attack, 0.2, 0.004), `attack ${during.params.attack}`);
    assert.equal(await source(page, 'ev-amp'), authored, 'the source waits for the drag to end');
    assert.equal(await page.$eval(handle('ev-amp', 'attack'), (e) => e.hasAttribute('data-active')), true);
    await page.mouse.up();
    const after = await state(page, 'ev-amp');
    assert.equal(after.name, 'default');
    assert.ok(JSON.parse(await source(page, 'ev-amp')).attack === after.params.attack, 'the source holds the new attack');
    const changes = await page.evaluate(() => (globalThis as any).changes as boolean[]);
    assert.ok(changes.includes(false) && changes.at(-1) === true, `events ${changes}`);
    // the bound knob followed
    assert.ok(near(Number(await page.$eval('#ev-amp-attack-input', (e) => (e as HTMLInputElement).value)), after.params.attack));
    // the view takes the new length once the drag is done: the handle stays on its time
    const x = Number(await page.$eval(handle('ev-amp', 'attack'), (e) => (e as HTMLElement).style.getPropertyValue('--envelope-x')));
    const T = after.params.attack + 0.3 + 0.4;
    assert.ok(near(x, after.params.attack / (T * 1.25), 2e-4), `x ${x}`);
  });

  await check('drags of a level, a bend, with Shift (ten times finer), and Escape (back where it began)', async () => {
    await reset(page, 'ev-amp');
    assert.equal(await source(page, 'ev-amp'), authored, 'reset: the authored text back');
    const box = await plot(page, 'ev-amp');
    await drag(page, handle('ev-amp', 'decay'), 0, -box.height * 0.2);
    assert.ok(near((await state(page, 'ev-amp')).params.sustain, 0.8, 0.01), 'up a fifth: sustain 80 %');
    assert.ok(near(Number(await page.$eval('#ev-amp-sustain-input', (e) => (e as HTMLInputElement).value)), 0.8, 0.01), 'the sustain knob');
    await reset(page, 'ev-amp');
    await drag(page, handle('ev-amp', 'attackCurve'), 0, -box.height * 0.2);
    const bend = (await state(page, 'ev-amp')).params.attackCurve;
    assert.ok(near(bend, (2 * Math.log(0.7 / 0.3)) / 8, 0.02), `the middle of the attack at 70 %: ${bend}`);
    await reset(page, 'ev-amp');
    await drag(page, handle('ev-amp', 'release'), box.width * 0.2, 0, { shift: true });
    assert.ok(near((await state(page, 'ev-amp')).params.release, 0.4 + 0.2 * 1.0 * 0.1, 0.006), 'Shift: a tenth of the move');
    await reset(page, 'ev-amp');
    await drag(page, handle('ev-amp', 'release'), box.width * 0.2, 0, { hold: true });
    assert.ok((await state(page, 'ev-amp')).params.release > 0.5);
    await page.keyboard.press('Escape');
    await page.mouse.up();
    const back = await state(page, 'ev-amp');
    assert.equal(back.params.release, 0.4, 'Escape: the release it began with');
    assert.equal(back.name, 'default');
  });

  await check('keys: times by 10 % (Shift 1 %), levels, Delete; double click and Ctrl + click: the authored values', async () => {
    await reset(page, 'ev-amp');
    await page.focus(handle('ev-amp', 'attack'));
    await page.keyboard.press('ArrowRight');
    assert.ok(near((await state(page, 'ev-amp')).params.attack, 0.11));
    await page.keyboard.press('Shift+ArrowLeft');
    assert.ok(near((await state(page, 'ev-amp')).params.attack, 0.11 / 1.01));
    await page.keyboard.press('Delete');
    assert.equal((await state(page, 'ev-amp')).params.attack, 0.1);
    await page.focus(handle('ev-amp', 'decay'));
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowLeft');
    let p = (await state(page, 'ev-amp')).params;
    assert.ok(near(p.sustain, 0.61) && near(p.decay, 0.3 / 1.1), JSON.stringify(p));
    await page.dblclick(handle('ev-amp', 'decay'));
    p = (await state(page, 'ev-amp')).params;
    assert.ok(p.sustain === 0.6 && p.decay === 0.3, 'double click: decay and sustain back');
    await page.focus(handle('ev-amp', 'releaseCurve'));
    await page.keyboard.press('ArrowUp');
    assert.equal((await state(page, 'ev-amp')).params.releaseCurve, 0.05);
    const c = await centre(page, handle('ev-amp', 'releaseCurve'));
    await page.keyboard.down('Control');
    await page.mouse.click(c.x, c.y);
    await page.keyboard.up('Control');
    assert.equal((await state(page, 'ev-amp')).params.releaseCurve, 0, 'Ctrl + click');
  });

  await check('bound controls: a knob, a number input, a range, selects and a checkbox set the parameters', async () => {
    await page.focus('#ev-amp-attack-input');
    await page.keyboard.press('End');
    assert.equal((await state(page, 'ev-amp')).params.attack, 5, 'the attack knob turned to its end');
    await page.fill('#ev-amp-release', '0.8');
    assert.equal((await state(page, 'ev-amp')).params.release, 0.8);
    await reset(page, 'ev-amp');
    assert.equal(await page.inputValue('#ev-amp-release'), '0.4', 'reset: the controls follow');
    await page.$eval('#ev-comp-ratio', (e) => {
      (e as HTMLInputElement).value = '8';
      e.dispatchEvent(new Event('input', { bubbles: true }));
    });
    assert.equal((await state(page, 'ev-comp')).params.ratio, 8);
    await page.selectOption('#ev-filter-slope', '48');
    assert.equal((await state(page, 'ev-filter')).params.bands[0].slope, 48);
    await page.selectOption('#ev-filter-type', 'highpass');
    assert.equal((await state(page, 'ev-filter')).params.bands[0].type, 'highpass');
    await page.uncheck('#ev-filter-on');
    assert.equal((await state(page, 'ev-filter')).params.bands[0].on, false);
    assert.deepEqual(await env(page, 'response', '#ev-filter', [100, 1000]), [0, 0], 'a band off: flat');
    await set(page, 'ev-filter', 'default', { params: { bands: [{ id: 'cut', label: 'Cutoff', type: 'lowpass', frequency: 2000, Q: 6, slope: 24 }] } });
    assert.equal(await page.inputValue('#ev-filter-type'), 'lowpass');
    assert.equal(await page.isChecked('#ev-filter-on'), true);
    await set(page, 'ev-comp', 'default', { params: { ratio: 4 } });
  });

  await check('the gate: held it plays attack, decay, sustain; let go the release - then default; aria-pressed, the dot, the outputs', async () => {
    await page.evaluate(() => {
      (globalThis as any).phases = [];
      document.querySelector('#ev-amp')!.addEventListener('envelope-phase', (e: any) => (globalThis as any).phases.push(e.detail.phase));
    });
    const c = await centre(page, '#ev-amp-gate');
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    assert.equal((await state(page, 'ev-amp')).name, 'playing');
    assert.equal(await page.getAttribute('#ev-amp-gate', 'aria-pressed'), 'true');
    await page.waitForFunction(() => document.querySelector('#ev-amp-phase')?.textContent === 'Sustain', null, { timeout: 3000 });
    assert.equal(await text(page, '#ev-amp-value'), '60%');
    assert.equal(await page.$eval('#ev-amp .envelope-dot', (e) => (e as HTMLElement).hidden), false);
    assert.equal(await page.getAttribute('#ev-amp .envelope-graph', 'data-phase'), 'sustain');
    assert.equal(await page.$eval('#ev-amp .envelope-phase[data-active]', (e) => e.getAttribute('data-phase')), 'sustain');
    await page.mouse.up();
    assert.equal(await page.getAttribute('#ev-amp-gate', 'aria-pressed'), 'false');
    await page.waitForFunction(() => (document.querySelector('#ev-amp') as any).api.getState().name === 'default', null, { timeout: 3000 });
    assert.deepEqual(await page.evaluate(() => (globalThis as any).phases), ['attack', 'decay', 'sustain', 'release', 'idle']);
    assert.equal(await page.$eval('#ev-amp .envelope-dot', (e) => (e as HTMLElement).hidden), true);
    assert.equal(await text(page, '#ev-amp-phase'), '');
    assert.equal(await page.getAttribute('#ev-amp .envelope-graph', 'data-phase'), null);
  });

  await check('trigger (a gate of data-value), setState playing with a gate, stop, a gate opened again in the release', async () => {
    await page.evaluate(() => ((globalThis as any).phases = []));
    await page.click('#ev-amp-trigger');
    await page.waitForFunction(() => (document.querySelector('#ev-amp') as any).api.getState().name === 'default', null, { timeout: 3000 });
    assert.deepEqual(await page.evaluate(() => (globalThis as any).phases), ['attack', 'decay', 'release', 'idle'], 'a 0.2 s gate');
    await set(page, 'ev-amp', 'playing', { gate: 0.05 });
    assert.equal((await state(page, 'ev-amp')).name, 'playing');
    await page.waitForFunction(() => (document.querySelector('#ev-amp') as any).api.getState().name === 'default', null, { timeout: 3000 });
    await env(page, 'noteOn', '#ev-amp');
    await page.click('#ev-amp-stop');
    assert.equal((await state(page, 'ev-amp')).name, 'default', 'stop: at once');
    // legato: the attack starts from the level the release reached
    await page.evaluate(() => {
      (globalThis as any).values = [];
      document.querySelector('#ev-amp')!.addEventListener('envelope-value', (e: any) => (globalThis as any).values.push(e.detail));
    });
    await env(page, 'trigger', '#ev-amp', 0.4);
    await page.waitForFunction(() => document.querySelector('#ev-amp-phase')?.textContent === 'Release', null, { timeout: 3000 });
    await page.waitForTimeout(80);
    // one task: no frame between clearing the record and opening the gate
    await page.evaluate(() => {
      (globalThis as any).values = [];
      (globalThis as any).df$.shadcn.envelope.noteOn('#ev-amp');
    });
    await page.waitForFunction(() => (globalThis as any).values.length > 0);
    const first = await page.evaluate(() => (globalThis as any).values[0]);
    assert.equal(first.phase, 'attack');
    assert.ok(first.value > 0.15, `from the level reached: ${first.value}`);
    await env(page, 'stop', '#ev-amp');
  });

  await check('schedule(): an AudioParam rendered offline follows the curve, bends and release included', async () => {
    const out = await page.evaluate(async () => {
      const envelope = (globalThis as any).df$.shadcn.envelope;
      const ctx = new OfflineAudioContext(1, 8000 * 3, 8000);
      const src = new ConstantSourceNode(ctx, { offset: 1 });
      const gain = new GainNode(ctx, { gain: 0 });
      src.connect(gain).connect(ctx.destination);
      const end = envelope.schedule('#ev-dahdsr', gain.gain, { start: 0, gate: 1.5 });
      src.start();
      const data = (await ctx.startRendering()).getChannelData(0);
      const times = [0.1, 0.35, 0.6, 0.95, 1.3, 1.6, 1.8, 2.15];
      return { end, got: times.map((t) => data[Math.round(t * 8000)]), want: times.map((t) => envelope.valueAt('#ev-dahdsr', t, 1.5).value) };
    });
    assert.ok(near(out.end, 2.1), `the release ends at ${out.end}`);
    out.got.forEach((g: number, i: number) => assert.ok(near(g, out.want[i], 0.01), `sample ${i}: ${g} vs ${out.want[i]}`));
  });

  await check('the compressor: its static curve with the knee, the reduction at its attack and release, the outputs, a threshold drag', async () => {
    assert.equal(await env(page, 'transfer', '#ev-comp', -60), -57);
    assert.equal(await env(page, 'transfer', '#ev-comp', 0), -15);
    assert.ok(near(await env(page, 'transfer', '#ev-comp', -24), -24 - 0.75 * 9 / 12 + 3));
    await env(page, 'input', '#ev-comp', -6, 0);
    const gr = await env(page, 'input', '#ev-comp', -6, 0.01);
    assert.ok(near(gr, 13.5 * (1 - Math.exp(-1)), 1e-6), `one attack time: ${gr}`);
    assert.equal((await state(page, 'ev-comp')).name, 'playing');
    assert.equal(await text(page, '#ev-comp-gr'), '-8.5 dB');
    assert.equal(await text(page, '#ev-comp-phase'), 'Attack');
    assert.equal(await page.$eval('#ev-comp .envelope-meter', (e) => (e as HTMLElement).style.getPropertyValue('--envelope-reduction')), String(Math.round((gr / 24) * 10000) / 10000));
    const dot = await page.$eval('#ev-comp .envelope-dot', (e) => [Number((e as HTMLElement).style.getPropertyValue('--envelope-x')), Number((e as HTMLElement).style.getPropertyValue('--envelope-y'))]);
    assert.ok(near(dot[0], 54 / 60, 1e-4) && near(dot[1], (60 - 6 - gr + 3) / 60, 1e-4), `the dot: ${dot}`);
    const released = await env(page, 'input', '#ev-comp', -40, 0.6);
    assert.ok(near(released, gr * Math.exp(-0.59 / 0.2), 1e-6));
    assert.equal(await text(page, '#ev-comp-phase'), 'Release');
    await env(page, 'input', '#ev-comp', null);
    assert.equal((await state(page, 'ev-comp')).name, 'default');
    assert.equal(await page.$eval('#ev-comp .envelope-dot', (e) => (e as HTMLElement).hidden), true);
    const box = await plot(page, 'ev-comp');
    await drag(page, handle('ev-comp', 'threshold'), box.width * 0.1, 0);
    const th = (await state(page, 'ev-comp')).params.threshold;
    assert.ok(near(th, -18, 0.15), `threshold ${th}`);
    assert.ok(near(Number(await page.inputValue('#ev-comp-threshold-input')), th, 0.051), 'the threshold knob');
    await page.focus(handle('ev-comp', 'ratio'));
    await page.keyboard.press('ArrowDown');
    assert.ok(near((await state(page, 'ev-comp')).params.ratio, 4.4), 'down: more reduction');
    await page.focus(handle('ev-comp', 'threshold'));
    await page.keyboard.press('ArrowUp');
    assert.equal((await state(page, 'ev-comp')).params.knee, 7, 'up on the threshold: the knee');
    await set(page, 'ev-comp', 'default', { params: { threshold: -24, ratio: 4, knee: 6 } });
  });

  await check('the filter: Web Audio\'s response (two biquads for 24 dB), a drag, the wheel, modulate()', async () => {
    const want = await page.evaluate(() => {
      const ctx = new OfflineAudioContext(1, 128, 48000);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 2000;
      f.Q.value = 6;
      const at = new Float32Array([100, 2000, 8000]);
      const mag = new Float32Array(3);
      f.getFrequencyResponse(at, mag, new Float32Array(3));
      return [...mag].map((m) => 2 * 20 * Math.log10(m));
    });
    const got = await env(page, 'response', '#ev-filter', [100, 2000, 8000]);
    got.forEach((g: number, i: number) => assert.ok(near(g, want[i], 0.01), `${g} vs ${want[i]}`));
    assert.ok(near(got[1], 12, 0.05), 'a resonance of 6 dB, twice');
    assert.equal(Number(await page.$eval(handle('ev-filter', 'cut'), (e) => (e as HTMLElement).style.getPropertyValue('--envelope-y'))), (12 + 24) / 48, 'the handle on the peak');
    const box = await plot(page, 'ev-filter');
    await drag(page, handle('ev-filter', 'cut'), -box.width / 3, 0);
    const f = (await state(page, 'ev-filter')).params.bands[0].frequency;
    assert.ok(near(f, 200, 4), `a third of the plot down: a decade - ${f}`);
    const c = await centre(page, handle('ev-filter', 'cut'));
    await page.mouse.move(c.x, c.y);
    await page.mouse.wheel(0, -100);
    assert.equal((await state(page, 'ev-filter')).params.bands[0].Q, 6.5, 'the wheel: resonance');
    await set(page, 'ev-filter', 'default', { params: { bands: [{ id: 'cut', label: 'Cutoff', type: 'lowpass', frequency: 2000, Q: 6, slope: 24 }] } });
    const before = (await env(page, 'response', '#ev-filter', [2000]))[0];
    await env(page, 'modulate', '#ev-filter', { cut: { frequency: 500 } });
    assert.equal((await state(page, 'ev-filter')).name, 'playing');
    assert.ok((await env(page, 'response', '#ev-filter', [2000]))[0] < before - 20, 'the live cutoff');
    assert.ok(((await page.getAttribute('#ev-filter .envelope-ghost', 'd')) ?? '').length > 100, 'the authored curve dashed');
    assert.equal((await state(page, 'ev-filter')).params.bands[0].frequency, 2000, 'the parameters stay');
    await env(page, 'modulate', '#ev-filter', null);
    assert.equal((await state(page, 'ev-filter')).name, 'default');
    assert.equal(await page.getAttribute('#ev-filter .envelope-ghost', 'd'), null);
  });

  await check('connect(): the filter chain renders what the curve shows; the compressor chain takes the parameters', async () => {
    const out = await page.evaluate(async () => {
      const envelope = (globalThis as any).df$.shadcn.envelope;
      const ctx = new OfflineAudioContext(1, 24000, 48000);
      const osc = new OscillatorNode(ctx, { frequency: 8000 });
      const chain = envelope.connect('#ev-filter', ctx);
      osc.connect(chain.input);
      chain.output.connect(ctx.destination);
      osc.start();
      const data = (await ctx.startRendering()).getChannelData(0);
      let sum = 0;
      for (let i = 12000; i < 24000; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / 12000);
      chain.disconnect();
      const comp = envelope.connect('#ev-comp', new OfflineAudioContext(1, 128, 48000));
      const c = comp.compressor;
      const r = { threshold: c.threshold.value, ratio: c.ratio.value, knee: c.knee.value, attack: c.attack.value, release: c.release.value };
      comp.disconnect();
      return { db: 20 * Math.log10(rms / Math.SQRT1_2), want: envelope.response('#ev-filter', [8000])[0], comp: r, adsr: envelope.connect('#ev-amp', ctx) };
    });
    assert.ok(near(out.db, out.want, 1), `${out.db} dB rendered vs ${out.want} dB drawn`);
    assert.deepEqual(out.comp, { threshold: -24, ratio: 4, knee: 6, attack: 0.009999999776482582, release: 0.20000000298023224 });
    assert.equal(out.adsr, null, 'an ADSR has no chain - schedule() it');
  });

  await check('the EQ: bands by id or number, colours, a band off, keys on gain and Q', async () => {
    assert.equal(await page.$eval(handle('ev-eq', 'bass'), (e) => (e as HTMLElement).style.getPropertyValue('--envelope-handle-color')), 'var(--chart-2)');
    assert.equal(await page.$eval(handle('ev-eq', 'air'), (e) => (e as HTMLElement).style.getPropertyValue('--envelope-handle-color')), '#e11d48');
    assert.equal(await page.$eval(handle('ev-eq', 'notch'), (e) => e.hasAttribute('data-off')), true);
    assert.equal(await page.$$eval('#ev-eq .envelope-band-curve', (els) => els.length), 5);
    await page.focus(handle('ev-eq', '3'));
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('PageUp');
    let bands = (await state(page, 'ev-eq')).params.bands;
    assert.equal(bands[2].gain, -3.5);
    assert.equal(bands[2].Q, 2.2);
    await page.focus(handle('ev-eq', 'bass'));
    await page.keyboard.press('ArrowUp');
    bands = (await state(page, 'ev-eq')).params.bands;
    assert.equal(bands[1].gain, 4, 'a shelf: its handle at half its gain');
    await page.focus(handle('ev-eq', 'low'));
    await page.keyboard.press('ArrowRight');
    bands = (await state(page, 'ev-eq')).params.bands;
    assert.ok(near(bands[0].frequency, 60 * 2 ** (1 / 12), 0.01), 'a semitone up');
    const total = (await env(page, 'response', '#ev-eq', [3000]))[0];
    assert.ok(total > -3, `the notch is off: ${total}`);
  });

  await check('sizes, read-only, disabled (authored and by state), the defaults', async () => {
    const h = (id: string) => page.$eval(`#${id} .envelope-plot`, (e) => Math.round(e.getBoundingClientRect().height));
    assert.equal(await h('ev-sm'), 96);
    assert.equal(await h('ev-amp'), 144);
    assert.equal(await h('ev-eq'), 224);
    assert.equal((await state(page, 'ev-off')).name, 'disabled');
    assert.equal(await page.getAttribute(handle('ev-off', 'attack'), 'tabindex'), '-1');
    await drag(page, handle('ev-off', 'attack'), 60, 0);
    assert.equal((await state(page, 'ev-off')).params.attack, 0.2, 'no drag');
    await set(page, 'ev-off', 'default');
    assert.equal(await page.getAttribute('#ev-off', 'aria-disabled'), null);
    assert.equal(await page.getAttribute(handle('ev-off', 'attack'), 'tabindex'), '0');
    await set(page, 'ev-amp', 'playing');
    await set(page, 'ev-amp', 'disabled');
    assert.equal(await page.getAttribute('#ev-amp', 'aria-disabled'), 'true');
    assert.equal(await page.$eval('#ev-amp .envelope-dot', (e) => (e as HTMLElement).hidden), true, 'playback stops');
    await page.focus(handle('ev-amp', 'attack'));
    await page.keyboard.press('ArrowRight');
    assert.equal((await state(page, 'ev-amp')).params.attack, 0.1, 'no keys');
    await set(page, 'ev-amp', 'default');
    await set(page, 'ev-off', 'disabled');
  });

  await check('the config: parameters merged, written into the source; setState(getState()) changes nothing; params()', async () => {
    await set(page, 'ev-amp', 'default', { params: { attack: 0.5 } });
    const s = await state(page, 'ev-amp');
    assert.equal(s.params.attack, 0.5);
    assert.equal(s.params.decay, 0.3);
    const written = await source(page, 'ev-amp');
    assert.equal(JSON.parse(written).attack, 0.5);
    assert.equal(await text(page, '#ev-amp-attack .knob-value'), '500 ms');
    await page.$eval('#ev-amp', async (el: any) => { await el.api.setState('default', el.api.getState().config); });
    assert.equal(await source(page, 'ev-amp'), written);
    assert.deepEqual(await env(page, 'params', '#ev-amp', { attack: 0.1 }), { attack: 0.1, decay: 0.3, sustain: 0.6, release: 0.4, attackCurve: 0, decayCurve: 0.5, releaseCurve: 0 });
    assert.equal(await source(page, 'ev-amp'), authored, 'the authored parameters: the authored text');
    assert.equal(await env(page, 'params', '#nothing'), null);
    // out of range: clamped
    await set(page, 'ev-sm', 'default', { params: { sustain: 3, attack: -1 } });
    const sm = (await state(page, 'ev-sm')).params;
    assert.ok(sm.sustain === 1 && sm.attack === 0);
  });

  await check('in a form: the bound controls submit the parameters; a reset puts them back and the curve follows', async () => {
    await set(page, 'ev-form-env', 'default', { params: { sustain: 0.3, release: 1.5 } });
    const data = () => page.$eval('#ev-form', (f) => new URLSearchParams(new FormData(f as HTMLFormElement) as any).toString());
    assert.equal(await data(), 'sustain=0.3&release=1.5');
    await page.click('#ev-form-reset');
    await page.waitForFunction(() => (document.querySelector('#ev-form-env') as any).api.getState().config.params.release === 0.4);
    const p = (await state(page, 'ev-form-env')).params;
    assert.ok(p.sustain === 0.7 && p.release === 0.4, JSON.stringify(p));
    assert.equal(await text(page, '#ev-form-env .envelope-desc'), 'Attack 50 ms, decay 200 ms, sustain 70%, release 400 ms');
  });

  await check('connect() live: a running context - the compressor\'s level in and its reduction shown, the meter empty when it stops', async () => {
    const running = await page.evaluate(async () => {
      const ctx = new AudioContext();
      await ctx.resume();
      (globalThis as any).liveCtx = ctx;
      const chain = (globalThis as any).df$.shadcn.envelope.connect('#ev-comp', ctx);
      const osc = new OscillatorNode(ctx, { frequency: 220 });
      osc.connect(chain.input);
      chain.output.connect(ctx.destination);
      osc.start();
      (globalThis as any).liveOsc = osc;
      (globalThis as any).liveChain = chain;
      return ctx.state;
    });
    assert.equal(running, 'running', 'headless Chromium runs an AudioContext');
    await page.waitForFunction(() => {
      const el = document.querySelector('#ev-comp') as any;
      return el.api.getState().name === 'playing' && document.querySelector('#ev-comp-gr')?.textContent !== '0.0 dB';
    }, null, { timeout: 5000 });
    const x = Number(await page.$eval('#ev-comp .envelope-dot', (el) => (el as HTMLElement).style.getPropertyValue('--envelope-x')));
    assert.ok(x > 0.95, `a full-scale sine goes in near 0 dB: ${x}`);
    assert.ok(Number(await page.$eval('#ev-comp .envelope-meter', (el) => (el as HTMLElement).style.getPropertyValue('--envelope-reduction'))) > 0);
    await page.evaluate(() => (globalThis as any).liveOsc.stop());
    await page.waitForFunction(() => (document.querySelector('#ev-comp') as any).api.getState().name === 'default', null, { timeout: 5000 });
    assert.equal(await page.$eval('#ev-comp .envelope-meter', (el) => (el as HTMLElement).style.getPropertyValue('--envelope-reduction')), '', 'the meter empties');
    await page.evaluate(async () => {
      (globalThis as any).liveChain.disconnect();
      await (globalThis as any).liveCtx.close();
    });
  });

  await check('no page error', async () => {
    assert.deepEqual(errors, []);
  });

  await check('render(): the model is the authored markup; render(state) equals setState(state) on the live element', async () => {
    await assertRenderContract(page, '.envelope[id]', ['default', 'playing', 'editing', 'disabled'], {
      runtimeOwned: '.envelope-graph, [data-envelope-output]',
    });
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nenvelope.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('envelope.e2e: all checks passed');
