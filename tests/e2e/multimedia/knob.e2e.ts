import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

/**
 * Why: the Knob promises a rotary control over a native range input - a value on any scale (linear, exponential,
 * logarithmic, power, decibel, one the page adds), settled on the input's step, written in a format (number, si,
 * percent, time, signed, one the page adds, the page's locale); rings for the sources that modulate it (their range
 * around the value, their live value, the effective value); and a drag whose speed is the radius over the distance
 * from the knob. This drives the shipped files: the dial, every scale and format, the drag near and far (Shift,
 * Escape, the precision circles, the events), the marks of the steps, typing the value in (a Number Input over the
 * readout: Enter, Escape, leaving it, the range and step, a percent knob in percent), a knob that never moves, the
 * resets (double click, Ctrl + click, Delete), the keys, the rings and
 * modulate(), a value written from outside, another format or range, disabled (by state and authored), the form
 * (submission, reset) and the render contract.
 */

const FIXTURE = '/tests/e2e/multimedia/knob.e2e-fixture.html';
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
const state = (page: Page, id: string) =>
  page.$eval(`#${id}`, (el: any) => {
    const st = el.api.getState();
    return { name: st.name as string, value: st.config.value as number };
  });
const set = (page: Page, id: string, name: string, config: Record<string, unknown> = {}) =>
  page.$eval(`#${id}`, async (el: any, [n, c]) => { await el.api.setState(n, c); }, [name, config] as const);
const kn = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([f, a]) => (globalThis as any).df$.shadcn.knob[f as string](...(a as unknown[])), [fn, args] as const);
const text = (page: Page, sel: string) => page.$eval(sel, (e) => e.textContent ?? '');
/** the dial's custom property */
const dialVar = (page: Page, id: string, name: string) =>
  page.$eval(`#${id} .knob-dial`, (e, n) => (e as HTMLElement).style.getPropertyValue(n), name);
const near = (a: number, b: number, eps = 1e-3) => Math.abs(a - b) <= eps;
const center = async (page: Page, id: string) => {
  const box = (await page.$eval(`#${id} .knob-dial`, (e) => e.getBoundingClientRect().toJSON())) as DOMRect;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};
/** a drag: down at the knob, through the moves (offsets from its centre), up - unless it stays held */
async function drag(page: Page, id: string, moves: [number, number][], hold = false) {
  const c = await center(page, id);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  for (const [dx, dy] of moves) await page.mouse.move(c.x + dx, c.y + dy);
  if (!hold) await page.mouse.up();
}

try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1200 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(`${server.url}${FIXTURE}`);
  await page.waitForFunction(() => [...document.querySelectorAll('.knob')].every((el: any) => el.api && el.querySelector('.knob-dial')));

  await check('every knob draws its dial over the input: the value ring, the face, a ring per source; the readout and aria-valuetext', async () => {
    const dials = await page.$$eval('.knob', (els) => els.map((el) => [el.id, el.querySelector('.knob-dial')!.getAttribute('aria-hidden'), el.querySelectorAll('.knob-track').length, el.querySelectorAll('.knob-face .knob-pointer').length, el.querySelectorAll('.knob-ring').length]));
    assert.equal(dials.length, 23);
    assert.ok(dials.every(([, hidden, track, pointer]) => hidden === 'true' && track === 1 && pointer === 1));
    assert.deepEqual(dials.filter((d) => d[4]).map((d) => [d[0], d[4]]), [['kb-cutoff', 4]], 'the cutoff: four rings - a duplicate id is dropped');
    assert.equal(await page.$eval('#kb-cutoff-input', (e) => e.getAttribute('aria-valuetext')), '1.00 kHz');
    assert.equal(await text(page, '#kb-cutoff .knob-value'), '1.00 kHz');
    assert.equal(await page.$eval('#kb-cutoff .knob-dial', (e) => e.nextElementSibling?.id), 'kb-cutoff-input', 'the dial before the input');
    // the input stays the slider: focusable, named, out of sight
    const input = await page.$eval('#kb-cutoff-input', (e) => [(e as HTMLInputElement).type, e.getBoundingClientRect().width, (e as HTMLInputElement).labels?.[0]?.textContent]);
    assert.deepEqual(input, ['range', 1, 'Cutoff']);
    assert.equal(await page.$eval('#kb-nostep-input', (e) => e.getAttribute('step')), 'any', 'a range without a step takes any value');
    assert.equal((await state(page, 'kb-nostep')).value, 0.37);
    const size = await page.$$eval('#kb-sm .knob-dial, #kb-md .knob-dial, #kb-lg .knob-dial', (els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
    assert.deepEqual(size, [36, 48, 72], 'sm, default, lg');
    assert.equal(await page.$eval('#kb-reserve .knob-dial', (e) => Math.round(e.getBoundingClientRect().width)), 68, '--knob-reserve: two ring slots free (2 × 2 × 5 px)');
    assert.equal(await page.$eval('#kb-reserve .knob-face', (e) => Math.round(e.getBoundingClientRect().width)), await page.$eval('#kb-md .knob-face', (e) => Math.round(e.getBoundingClientRect().width)), 'the same face');
    const colors = await page.$$eval('#kb-md, #kb-danger', (els) => {
      const root = getComputedStyle(document.documentElement);
      return els.map((e) => getComputedStyle(e).getPropertyValue('--knob-color').trim()).concat([root.getPropertyValue('--chart-2').trim(), root.getPropertyValue('--destructive').trim()]);
    });
    assert.deepEqual(colors.slice(0, 2), colors.slice(2), 'data-color: the chart colour, destructive');
    assert.equal(await page.$eval('#kb-flat .knob-face', (e) => getComputedStyle(e).backgroundImage), 'none', 'flat: no face');
  });

  await check('the scales: each maps the turn onto the value and back; a value settles on the step; a broken scale is linear', async () => {
    const pos = (id: string) => kn(page, 'position', `#${id}`) as Promise<number>;
    assert.ok(near(await pos('kb-cutoff'), Math.log(50) / Math.log(1000)), 'exponential: 1 kHz between 20 Hz and 20 kHz');
    await set(page, 'kb-cutoff', 'default', { value: 200 });
    assert.ok(near(await pos('kb-cutoff'), 1 / 3));
    assert.equal(await text(page, '#kb-cutoff .knob-value'), '200 Hz');
    await set(page, 'kb-cutoff', 'default', { value: 2000 });
    assert.ok(near(await pos('kb-cutoff'), 2 / 3));
    assert.equal(await text(page, '#kb-cutoff .knob-value'), '2.00 kHz');
    await set(page, 'kb-cutoff', 'default', { value: 1000 });
    await set(page, 'kb-mix', 'default', { value: 0.25 });
    assert.ok(near(await pos('kb-mix'), 0.25), 'linear');
    assert.equal(await text(page, '#kb-mix .knob-value'), '25%');
    await set(page, 'kb-feedback', 'default', { value: 91 });
    assert.ok(near(await pos('kb-feedback'), 0.5), 'logarithmic: 91 at the middle of 1 to 100 - fast first, fine last');
    await set(page, 'kb-attack', 'default', { value: 1.25 });
    assert.ok(near(await pos('kb-attack'), 0.5), 'power, exponent 3: 1.25 s at the middle of 0 to 10 s');
    assert.equal(await text(page, '#kb-attack .knob-value'), '1.25 s');
    await set(page, 'kb-attack', 'default', { value: 0.25 });
    assert.equal(await text(page, '#kb-attack .knob-value'), '250 ms');
    const floor = Math.pow(10, -66 / 60);
    assert.ok(near(await pos('kb-gain'), (Math.pow(10, -6 / 60) - floor) / (1 - floor)), 'decibel: 0 dB on the audio taper');
    assert.equal(await text(page, '#kb-gain .knob-value'), '0.0 dB');
    await set(page, 'kb-gain', 'default', { value: -60 });
    assert.ok(near(await pos('kb-gain'), 0));
    assert.equal(await text(page, '#kb-gain .knob-value'), '-60.0 dB');
    await set(page, 'kb-gain', 'default', { value: 0 });
    await set(page, 'kb-semi', 'default', { value: 7.4 });
    assert.equal((await state(page, 'kb-semi')).value, 7, 'the step: whole semitones');
    assert.equal(await text(page, '#kb-semi .knob-value'), '+7 st');
    assert.ok(near(await pos('kb-across'), 0.5), 'an exponential range across 0 is linear');
    await set(page, 'kb-mix', 'default', { value: 7 });
    assert.equal((await state(page, 'kb-mix')).value, 1, 'inside the range');
    await set(page, 'kb-mix', 'default', { value: 0.5 });
  });

  await check('the formats: si, percent, time, signed, a number with its decimals and unit, in the page\'s locale', async () => {
    assert.equal(await text(page, '#kb-de .knob-value'), '1.234,50 Hz', 'German: a decimal comma, a grouping point');
    assert.equal(await text(page, '#kb-sm .knob-value'), '30', 'a range of 100: no decimals');
    assert.equal(await text(page, '#kb-fine .knob-value'), '0.0 ct', 'signed: no sign at 0');
    await set(page, 'kb-fine', 'default', { value: -12.34 });
    assert.equal(await text(page, '#kb-fine .knob-value'), '-12.3 ct');
    await set(page, 'kb-fine', 'default', { value: 0 });
    assert.equal(await text(page, '#kb-pan .knob-value'), '-20', 'a format not yet added: a number');
  });

  await check('a drag: left and right turn it at full speed within the radius, slower beyond it; Shift is finer; the precision circles show', async () => {
    await page.$eval('#kb-fine', (el) => {
      const log: any = { input: 0, change: 0, details: [] };
      (globalThis as any).__knobLog = log;
      el.querySelector('input')!.addEventListener('input', () => log.input++);
      el.querySelector('input')!.addEventListener('change', () => log.change++);
      el.addEventListener('knob-change', (e: any) => log.details.push(e.detail));
    });
    // near: 40 px right within the 48 px radius, the 400 px travel → a tenth of the turn, 20 ct
    await drag(page, 'kb-fine', [[10, 0], [20, 0], [30, 0], [40, 0]], true);
    assert.equal((await state(page, 'kb-fine')).name, 'adjusting');
    await page.waitForTimeout(200);
    const circles = await page.$eval('#kb-fine .knob-dial', (e) => [getComputedStyle(e, '::after').width, getComputedStyle(e, '::before').width, getComputedStyle(e, '::after').opacity]);
    assert.deepEqual(circles, ['96px', '80px', '1'], 'the radius (48 px) and the circle through the pointer (40 px away)');
    await page.mouse.up();
    let s = await state(page, 'kb-fine');
    assert.deepEqual(s, { name: 'default', value: 20 });
    assert.equal(await text(page, '#kb-fine .knob-value'), '+20.0 ct');
    const log = await page.evaluate(() => (globalThis as any).__knobLog);
    assert.equal(log.input, 4, 'an input event per move');
    assert.equal(log.change, 1, 'one change when the drag ends');
    assert.deepEqual(log.details.at(-1), { value: 20, position: 0.6, text: '+20.0 ct', committed: true });
    assert.ok(log.details.slice(0, -1).every((d: any) => d.committed === false));
    // far: away from the knob first (no value change), then the same 40 px right ~192 px above it → a quarter as far
    await set(page, 'kb-fine', 'default', { value: 0 });
    await drag(page, 'kb-fine', [[0, -96], [0, -192], [10, -192], [20, -192], [30, -192], [40, -192]]);
    s = await state(page, 'kb-fine');
    assert.ok(s.value > 4.8 && s.value < 5.1, `the radius over the distance: about a quarter of 20 ct (${s.value})`);
    // Shift: ten times finer
    await set(page, 'kb-fine', 'default', { value: 0 });
    await page.keyboard.down('Shift');
    await drag(page, 'kb-fine', [[10, 0], [20, 0], [30, 0], [40, 0]]);
    await page.keyboard.up('Shift');
    assert.ok(near((await state(page, 'kb-fine')).value, 2), 'Shift: 2 ct');
    // left turns it down
    await drag(page, 'kb-fine', [[-20, 0]]);
    assert.ok(near((await state(page, 'kb-fine')).value, -8), 'left: down by 10 ct');
  });

  await check('Escape ends a drag where it started; double click, Ctrl + click and Delete go back to the default', async () => {
    await set(page, 'kb-fine', 'default', { value: 0 });
    const changes = await page.evaluate(() => (globalThis as any).__knobLog.change);
    await drag(page, 'kb-fine', [[10, 0], [20, 0], [30, 0], [40, 0]], true);
    assert.equal((await state(page, 'kb-fine')).value, 20);
    await page.keyboard.press('Escape');
    assert.deepEqual(await state(page, 'kb-fine'), { name: 'default', value: 0 });
    await page.mouse.up();
    assert.equal(await page.evaluate(() => (globalThis as any).__knobLog.change), changes, 'no change: the value is where it was');
    const c = await center(page, 'kb-cutoff');
    await set(page, 'kb-cutoff', 'default', { value: 5000 });
    await page.mouse.dblclick(c.x, c.y);
    assert.equal((await state(page, 'kb-cutoff')).value, 1000, 'double click: data-default');
    await set(page, 'kb-cutoff', 'default', { value: 5000 });
    await page.keyboard.down('Control');
    await page.mouse.click(c.x, c.y);
    await page.keyboard.up('Control');
    assert.equal((await state(page, 'kb-cutoff')).value, 1000, 'Ctrl + click');
    await set(page, 'kb-mix', 'default', { value: 0.9 });
    await page.focus('#kb-mix-input');
    await page.keyboard.press('Delete');
    assert.equal((await state(page, 'kb-mix')).value, 0.5, 'Delete: the authored value');
  });

  await check('the keys: an arrow 1 % of the turn (Shift 0.1 %) or the input\'s step, Page Up / Down 10 %, Home / End', async () => {
    await page.focus('#kb-mix-input');
    const v = async () => (await state(page, 'kb-mix')).value;
    await page.keyboard.press('ArrowRight');
    assert.ok(near(await v(), 0.51));
    await page.keyboard.press('Shift+ArrowUp');
    assert.ok(near(await v(), 0.511));
    await page.keyboard.press('PageUp');
    assert.ok(near(await v(), 0.611));
    await page.keyboard.press('ArrowDown');
    assert.ok(near(await v(), 0.601));
    await page.keyboard.press('Home');
    assert.equal(await v(), 0);
    await page.keyboard.press('End');
    assert.equal(await v(), 1);
    await set(page, 'kb-mix', 'default', { value: 0.5 });
    await page.focus('#kb-semi-input');
    await page.keyboard.press('ArrowUp');
    assert.equal((await state(page, 'kb-semi')).value, 8, 'a stepped knob: one step');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    assert.equal((await state(page, 'kb-semi')).value, 6);
    await page.focus('#kb-cutoff-input');
    const before = (await kn(page, 'position', '#kb-cutoff')) as number;
    await page.keyboard.press('ArrowRight');
    assert.ok(near((await kn(page, 'position', '#kb-cutoff')) as number, before + 0.01, 2e-3), 'on its scale: 1 % of the turn');
    await set(page, 'kb-cutoff', 'default', { value: 1000 });
    await set(page, 'kb-semi', 'default', { value: 7 });
  });

  await check('the marks of the steps: one per step of a stepped knob, or that many over the turn; a drag snaps to the steps', async () => {
    const ticks = (id: string) => page.$$eval(`#${id} .knob-tick`, (els) => els.map((e) => Number((e as HTMLElement).style.getPropertyValue('--knob-t'))));
    assert.equal((await ticks('kb-semi')).length, 49, '-24 to 24 in semitones');
    assert.deepEqual(await ticks('kb-wave'), [0, 0.3333, 0.6667, 1], 'four steps');
    assert.deepEqual(await ticks('kb-delay'), [0, 0.3333, 0.6667, 1], 'data-ticks="4" on 1 ms to 1 s: the decades');
    assert.deepEqual(await ticks('kb-fine'), [], 'no marks unless asked');
    const mark = await page.$eval('#kb-wave .knob-tick', (e) => parseFloat(getComputedStyle(e, '::before').height));
    assert.ok(mark > 4, `a mark between the value ring and the face (${mark}px)`);
    await set(page, 'kb-delay', 'default', { value: 0.01 });
    assert.ok(near((await kn(page, 'position', '#kb-delay')) as number, 1 / 3), '10 ms on the first decade mark');
    assert.equal(await text(page, '#kb-delay .knob-value'), '10.0 ms');
    await page.$eval('#kb-mix', (e) => e.setAttribute('data-ticks', '3'));
    await page.waitForFunction(() => document.querySelectorAll('#kb-mix .knob-tick').length === 3);
    await page.$eval('#kb-mix', (e) => e.removeAttribute('data-ticks'));
    await page.waitForFunction(() => document.querySelectorAll('#kb-mix .knob-tick').length === 0);
    // a fifth of the turn from Saw (2 of 0 to 3): 2.6 snaps to 3
    await drag(page, 'kb-wave', [[20, 0], [40, 0]]);
    assert.equal((await state(page, 'kb-wave')).value, 3);
    assert.equal(await kn(page, 'position', '#kb-wave'), 1);
    await set(page, 'kb-wave', 'default', { value: 2 });
  });

  await check('the value typed in: a Number Input (xs) over the readout - Enter sets it, Escape keeps it, leaving it sets it', async () => {
    await set(page, 'kb-gain', 'default', { value: 0 });
    const box = () => page.$eval('#kb-gain', (e) => e.getBoundingClientRect().toJSON());
    const before = await box();
    await page.dblclick('#kb-gain .knob-value');
    const editor = await page.$eval('#kb-gain .knob-editor', (e) => {
      const input = e.querySelector('input')!;
      return {
        kind: [e.classList.contains('number-input'), e.getAttribute('data-size')],
        field: [input.type, input.value, input.min, input.max, input.step, input.getAttribute('aria-label')],
        unit: e.querySelector('.number-input-unit')?.textContent,
        focused: document.activeElement === input,
        hidden: getComputedStyle(document.querySelector('#kb-gain .knob-value')!).visibility,
        height: Math.round(e.getBoundingClientRect().height),
      };
    });
    assert.deepEqual(editor, { kind: [true, 'xs'], field: ['number', '0', '-60', '6', 'any', 'Gain'], unit: 'dB', focused: true, hidden: 'hidden', height: 28 });
    assert.deepEqual(await box(), before, 'the knob keeps its size');
    await page.fill('#kb-gain .knob-editor input', '-12.5');
    await page.keyboard.press('Enter');
    assert.equal((await state(page, 'kb-gain')).value, -12.5);
    assert.equal(await text(page, '#kb-gain .knob-value'), '-12.5 dB');
    assert.equal(await page.$$eval('#kb-gain .knob-editor', (els) => els.length), 0);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'kb-gain-input', 'the keys go back to the knob');
    assert.equal(await page.$eval('#kb-gain .knob-value', (e) => getComputedStyle(e).visibility), 'visible');
    // outside the range: settled
    await page.keyboard.press('Enter');
    await page.fill('#kb-gain .knob-editor input', '1000');
    await page.keyboard.press('Enter');
    assert.equal((await state(page, 'kb-gain')).value, 6);
    // a percent knob is typed in percent; Escape keeps the value
    await set(page, 'kb-mix', 'default', { value: 0.5 });
    await page.focus('#kb-mix-input');
    await page.keyboard.press('Enter');
    assert.deepEqual(await page.$eval('#kb-mix .knob-editor', (e) => [e.querySelector('input')!.value, e.querySelector('input')!.max, e.querySelector('.number-input-unit')?.textContent]), ['50', '100', '%']);
    await page.fill('#kb-mix .knob-editor input', '25');
    await page.keyboard.press('Enter');
    assert.equal((await state(page, 'kb-mix')).value, 0.25);
    await page.keyboard.press('Enter');
    await page.fill('#kb-mix .knob-editor input', '90');
    await page.keyboard.press('Escape');
    assert.equal((await state(page, 'kb-mix')).value, 0.25, 'Escape: the old value');
    assert.equal(await page.$$eval('#kb-mix .knob-editor', (els) => els.length), 0);
    // leaving the field sets the value
    await page.dblclick('#kb-fine .knob-value');
    await page.fill('#kb-fine .knob-editor input', '33');
    await page.mouse.click(5, 5);
    assert.equal((await state(page, 'kb-fine')).value, 33);
    // a stepped knob: its step, the nearest step; a time knob in seconds
    await page.dblclick('#kb-semi .knob-value');
    assert.equal(await page.$eval('#kb-semi .knob-editor input', (e) => (e as HTMLInputElement).step), '1');
    await page.fill('#kb-semi .knob-editor input', '3.4');
    await page.keyboard.press('Enter');
    assert.equal((await state(page, 'kb-semi')).value, 3);
    await page.dblclick('#kb-delay .knob-value');
    assert.deepEqual(await page.$eval('#kb-delay .knob-editor', (e) => [e.querySelector('input')!.value, e.querySelector('.number-input-unit')?.textContent]), ['0.01', 's']);
    await page.keyboard.press('Escape');
    // disabled: nothing to type in
    await page.dblclick('#kb-off .knob-value', { force: true });
    assert.equal(await page.$$eval('#kb-off .knob-editor', (els) => els.length), 0);
    await set(page, 'kb-gain', 'default', { value: 0 });
    await set(page, 'kb-mix', 'default', { value: 0.5 });
    await set(page, 'kb-fine', 'default', { value: 0 });
    await set(page, 'kb-semi', 'default', { value: 7 });
  });

  await check('the knob never moves: a longer value text spills out on both sides, the dial stays put', async () => {
    const where = () => page.$eval('#kb-gain', (e) => [e.getBoundingClientRect().toJSON(), e.querySelector('.knob-dial')!.getBoundingClientRect().toJSON()]);
    await set(page, 'kb-gain', 'default', { value: 0 });
    const before = await where();
    await set(page, 'kb-gain', 'default', { value: -60 });
    assert.equal(await text(page, '#kb-gain .knob-value'), '-60.0 dB');
    assert.deepEqual(await where(), before);
    const spill = await page.$eval('#kb-gain .knob-value', (e) => {
      const range = document.createRange();
      range.selectNodeContents(e);
      const text = range.getBoundingClientRect();
      const box = e.getBoundingClientRect();
      return { wider: text.width > box.width, centred: Math.abs(text.left + text.width / 2 - (box.left + box.width / 2)) < 1 };
    });
    assert.deepEqual(spill, { wider: true, centred: true });
    await set(page, 'kb-gain', 'default', { value: 0 });
  });

  await check('the rings: a range around the value per source, their description; modulate() shows the live values and the effective value', async () => {
    const rings = await kn(page, 'rings', '#kb-cutoff');
    assert.deepEqual(rings, [
      { id: 'lfo', label: 'LFO 1', amount: 0.15, color: 'chart-2', bipolar: true },
      { id: 'env', label: 'Envelope 2', amount: 0.3, color: 'chart-4', bipolar: false },
      { id: 'macro', label: 'Macro', amount: -0.25, color: '#e11d48', bipolar: false },
      { id: 'odd', label: 'odd', amount: 1, color: 'not a colour', bipolar: false },
    ]);
    const p = Math.log(50) / Math.log(1000);
    const drawn = await page.$$eval('#kb-cutoff .knob-ring', (els) => els.map((e) => [e.getAttribute('data-ring'), e.hasAttribute('data-bipolar'), e.getAttribute('title'), (e as HTMLElement).style.getPropertyValue('--knob-ring'), (e as HTMLElement).style.getPropertyValue('--knob-ring-color'), Number((e as HTMLElement).style.getPropertyValue('--knob-from')), Number((e as HTMLElement).style.getPropertyValue('--knob-to'))]));
    const expected: [string, boolean, string, string, string, number, number][] = [
      ['lfo', true, 'LFO 1', '1', 'var(--chart-2)', p - 0.15, p + 0.15],
      ['env', false, 'Envelope 2', '2', 'var(--chart-4)', p, p + 0.3],
      ['macro', false, 'Macro', '3', '#e11d48', p - 0.25, p],
      ['odd', false, 'odd', '4', 'var(--chart-4)', p, 1],
    ];
    drawn.forEach((d, i) => {
      assert.deepEqual(d.slice(0, 5), expected[i].slice(0, 5));
      assert.ok(near(d[5] as number, expected[i][5]) && near(d[6] as number, expected[i][6]), `ring ${d[0]}: ${d[5]} to ${d[6]}`);
    });
    const described = await page.$eval('#kb-cutoff-input', (e) => document.getElementById(e.getAttribute('aria-describedby')!)?.textContent);
    assert.equal(described, 'Modulated by LFO 1 (± 15 %), Envelope 2 (+ 30 %), Macro (- 25 %), odd (+ 100 %)');
    assert.ok(near(Number(await dialVar(page, 'kb-cutoff', '--knob-p')), p));
    // live: LFO 1 at its top, Envelope 2 half open (an envelope below 0 is 0)
    const effective = (await kn(page, 'modulate', '#kb-cutoff', { lfo: 1, env: 0.5, macro: -1 })) as number;
    const e = p + 0.15 + 0.15;
    assert.ok(Math.abs(effective - 20 * Math.pow(1000, e)) < 1, `the effective value ${effective}`);
    const live = await page.$$eval('#kb-cutoff .knob-ring', (els) => els.map((x) => x.hasAttribute('data-live')));
    assert.deepEqual(live, [true, true, true, false], 'the macro runs too (at 0), the odd one does not');
    assert.ok(near(Number(await dialVar(page, 'kb-cutoff', '--knob-e')), e));
    assert.equal(await page.$eval('#kb-cutoff .knob-dial', (x) => x.hasAttribute('data-modulated')), true);
    const lfo = await page.$eval('#kb-cutoff .knob-ring[data-ring="lfo"]', (x) => [Number((x as HTMLElement).style.getPropertyValue('--knob-at-lo')), Number((x as HTMLElement).style.getPropertyValue('--knob-at-hi'))]);
    assert.ok(near(lfo[0], p) && near(lfo[1], p + 0.15), 'the LFO\'s arc: from the value to where it moves it');
    assert.equal((await state(page, 'kb-cutoff')).value, 1000, 'modulation is not the value');
    // turning the knob moves the rings with it
    await set(page, 'kb-cutoff', 'default', { value: 200 });
    assert.ok(near(Number(await page.$eval('#kb-cutoff .knob-ring[data-ring="env"]', (x) => (x as HTMLElement).style.getPropertyValue('--knob-to'))), 1 / 3 + 0.3));
    await kn(page, 'modulate', '#kb-cutoff', null);
    assert.equal(await page.$eval('#kb-cutoff .knob-dial', (x) => x.hasAttribute('data-modulated')), false);
    assert.equal(await page.$$eval('#kb-cutoff .knob-ring[data-live]', (els) => els.length), 0);
    // other rings: the live value of a source that stays is kept
    await kn(page, 'modulate', '#kb-cutoff-input', { env: 1 });
    const next = await kn(page, 'rings', '#kb-cutoff', [{ id: 'env', label: 'Envelope 2', amount: 0.1 }]);
    assert.deepEqual(next, [{ id: 'env', label: 'Envelope 2', amount: 0.1, bipolar: false }]);
    assert.equal(await page.$$eval('#kb-cutoff .knob-ring[data-live]', (els) => els.length), 1);
    assert.equal(await page.$eval('#kb-cutoff-input', (x) => document.getElementById(x.getAttribute('aria-describedby')!)?.textContent), 'Modulated by Envelope 2 (+ 10 %)');
    await kn(page, 'modulate', '#kb-cutoff', null);
    await set(page, 'kb-cutoff', 'default', { value: 1000 });
  });

  await check('a value written from outside is shown, not sent back; another format, unit or range draws the same value again', async () => {
    const before = await page.evaluate(() => (globalThis as any).__knobLog.details.length);
    await page.$eval('#kb-fine-input', (e) => {
      (e as HTMLInputElement).value = '50';
      e.dispatchEvent(new Event('input', { bubbles: true }));
    });
    assert.equal((await state(page, 'kb-fine')).value, 50);
    assert.equal(await text(page, '#kb-fine .knob-value'), '+50.0 ct');
    assert.equal(await page.evaluate(() => (globalThis as any).__knobLog.details.length), before, 'no knob-change');
    await page.$eval('#kb-sm', (e) => e.setAttribute('data-unit', 'dB'));
    await page.waitForFunction(() => document.querySelector('#kb-sm .knob-value')?.textContent === '30 dB');
    await page.$eval('#kb-sm-input', (e) => e.setAttribute('max', '60'));
    await page.waitForFunction(() => (globalThis as any).df$.shadcn.knob.position('#kb-sm') === 0.5);
    await page.$eval('#kb-sm-input', (e) => e.setAttribute('max', '100'));
    await page.$eval('#kb-sm', (e) => e.removeAttribute('data-unit'));
    await set(page, 'kb-fine', 'default', { value: 0 });
  });

  await check('scales and formats a page adds: the knobs on them draw again', async () => {
    await page.evaluate(() => {
      const k = (globalThis as any).df$.shadcn.knob;
      k.scale('smooth', {
        value: (p: number, r: any) => r.min + (r.max - r.min) * (3 * p * p - 2 * p * p * p),
        position: (v: number, r: any) => 0.5 - Math.sin(Math.asin(1 - (2 * (v - r.min)) / (r.max - r.min)) / 3),
      });
      k.format('pan', (v: number) => (v === 0 ? 'C' : v < 0 ? `L${-v}` : `R${v}`));
    });
    assert.equal(await text(page, '#kb-pan .knob-value'), 'L20');
    await set(page, 'kb-xfade', 'default', { value: 15.625 });
    assert.ok(near((await kn(page, 'position', '#kb-xfade')) as number, 0.25), 'smoothstep: 15.6 % at a quarter of the turn');
    await set(page, 'kb-pan', 'default', { value: 0 });
    assert.equal(await text(page, '#kb-pan .knob-value'), 'C');
    assert.equal(await page.$eval('#kb-pan-input', (e) => e.getAttribute('aria-valuetext')), 'C');
  });

  await check('disabled: by state and authored - no drag, no keys; the API reads and writes the value', async () => {
    await set(page, 'kb-md', 'disabled');
    assert.equal(await page.$eval('#kb-md-input', (e) => (e as HTMLInputElement).disabled), true);
    await drag(page, 'kb-md', [[30, 0]]);
    assert.deepEqual(await state(page, 'kb-md'), { name: 'disabled', value: 50 });
    assert.equal(await page.$eval('#kb-md', (e) => getComputedStyle(e).opacity), '0.5');
    await set(page, 'kb-md', 'default');
    assert.equal(await page.$eval('#kb-md-input', (e) => (e as HTMLInputElement).disabled), false);
    assert.equal((await state(page, 'kb-off')).name, 'disabled', 'an input authored disabled');
    assert.equal(await kn(page, 'value', '#kb-md', 64), 64);
    assert.equal(await kn(page, 'value', '#kb-md'), 64);
    assert.equal(await kn(page, 'reset', '#kb-md'), 50);
    assert.ok(Number.isNaN(await kn(page, 'value', '#nothing')));
  });

  await check('the form: the input submits its value under its name; a reset puts the authored value back', async () => {
    const data = () => page.$eval('#kb-form', (f) => new URLSearchParams(new FormData(f as HTMLFormElement) as any).toString());
    assert.equal(await data(), 'gain=0&mix=0.5');
    await set(page, 'kb-form-gain', 'default', { value: -3.2 });
    assert.equal((await state(page, 'kb-form-gain')).value, -3, 'half decibels');
    assert.equal(await data(), 'gain=-3&mix=0.5');
    await page.click('#kb-form-reset');
    await page.waitForFunction(() => document.querySelector('#kb-form-gain .knob-value')?.textContent === '0.0 dB');
    assert.equal((await state(page, 'kb-form-gain')).value, 0);
  });

  await check('no page error', async () => {
    assert.deepEqual(errors, []);
  });

  await check('render(): the model is the authored markup; render(state) equals setState(state) on the live element', async () => {
    await assertRenderContract(page, '.knob[id]', ['default', 'adjusting', 'disabled'], {
      runtimeOwned: '.knob-dial, .knob-value',
    });
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nknob.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('knob.e2e: all checks passed');
