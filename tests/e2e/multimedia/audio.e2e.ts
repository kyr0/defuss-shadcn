import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

/**
 * Why: the Audio component promises the Video's player on an <audio> - playback as a named state with time, rate,
 * volume, muted and captions as its config - in one row of controls, with controls outside it (data-audio-for), a
 * transcript line from the active caption cue, its API and its store. This drives the shipped files over the 24 s
 * harbour soundtrack: the authored starting volume and rate, every control, the readouts, the transcript line, the
 * end of the audio, the API, the store and the render contract.
 */

const FIXTURE = '/tests/e2e/multimedia/audio.e2e-fixture.html';
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
    return { name: st.name, ...st.config, paused: el.querySelector('audio').paused } as Record<string, any>;
  });
const api = (page: Page, id: string, name: string, config: Record<string, unknown> = {}) =>
  page.$eval(`#${id}`, async (el: any, [n, c]) => { await el.api.setState(n, c); }, [name, config] as const);
const text = (page: Page, sel: string) => page.$eval(sel, (el) => el.textContent ?? '');
const seeked = (page: Page, id: string, t: number) =>
  page.waitForFunction(([i, time]) => { const a = document.querySelector(`#${i} audio`) as HTMLAudioElement; return !a.seeking && Math.abs(a.currentTime - (time as number)) < 0.05; }, [id, t] as const);

try {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  page.setDefaultTimeout(10_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${server.url}${FIXTURE}`);
  await page.waitForFunction(() => [...document.querySelectorAll('.audio')].every((el: any) => el.api && el.querySelector('audio').readyState >= 1));

  await check('every player initializes in default with the length of its audio; the authored volume and rate apply', async () => {
    const r = await page.$$eval('.audio', (els: any[]) => els.map((el) => [el.id, el.api.getState().name, Math.round(el.api.getState().config.duration)]));
    assert.deepEqual(r, [['aud-basic', 'default', 24], ['aud-compact', 'default', 24], ['aud-rate', 'default', 24], ['aud-remote', 'default', 24]]);
    assert.equal((await state(page, 'aud-basic')).volume, 0.6, 'the volume range starts it');
    assert.equal((await state(page, 'aud-rate')).rate, 1.5, 'the rate select starts it');
    assert.equal(await text(page, '#aud-compact-left'), '-0:24');
  });

  await check('the toggle plays and pauses; the readouts follow', async () => {
    await page.click('#aud-basic-toggle');
    await page.waitForFunction(() => (document.querySelector('#aud-basic') as any).api.getState().name === 'playing');
    assert.equal(await page.$eval('#aud-basic-toggle', (b) => b.getAttribute('aria-pressed')), 'true');
    await page.waitForFunction(() => document.querySelector('#aud-basic [data-audio-output="time"]')?.textContent === '0:01');
    await page.click('#aud-basic-toggle');
    const s = await state(page, 'aud-basic');
    assert.equal(s.name, 'default');
    assert.equal(s.paused, true);
  });

  await check('the transcript line shows the active caption cue; captions off empties it', async () => {
    await api(page, 'aud-basic', 'default', { time: 7 });
    await page.waitForFunction(() => document.querySelector('#aud-basic .audio-captions')?.textContent === '[Gulls cry over the harbour]');
    assert.equal((await state(page, 'aud-basic')).captions, 'en', 'captions is the key of the track shown (its srclang)');
    await api(page, 'aud-basic', 'default', { captions: false });
    assert.equal(await text(page, '#aud-basic .audio-captions'), '');
    assert.equal((await state(page, 'aud-basic')).captions, '');
    await api(page, 'aud-basic', 'default', { captions: 'en' });
    assert.equal(await text(page, '#aud-basic .audio-captions'), '[Gulls cry over the harbour]');
  });

  await check('the scrubber seeks, mute and volume follow the controls', async () => {
    await page.$eval('#aud-basic-seek', (el: HTMLInputElement) => { el.value = '20'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await seeked(page, 'aud-basic', 20);
    await page.click('#aud-basic-mute');
    assert.equal((await state(page, 'aud-basic')).muted, true);
    // turning the volume up unmutes
    await page.$eval('#aud-basic-volume', (el: HTMLInputElement) => { el.value = '0.3'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    const s = await state(page, 'aud-basic');
    assert.equal(s.volume, 0.3);
    assert.equal(s.muted, false);
  });

  await check('skip and the rate select inside the row', async () => {
    await api(page, 'aud-rate', 'default', { time: 10 });
    await seeked(page, 'aud-rate', 10);
    await page.click('#aud-rate-fwd');
    await seeked(page, 'aud-rate', 15);
    await page.click('#aud-rate-back');
    await seeked(page, 'aud-rate', 10);
    assert.equal(await text(page, '#aud-rate-time'), '0:10');
    await page.selectOption('#aud-rate-select', '2');
    assert.equal((await state(page, 'aud-rate')).rate, 2);
    await api(page, 'aud-rate', 'default', { rate: 0.75 });
    assert.equal(await page.$eval('#aud-rate-select', (el: HTMLSelectElement) => el.value), '0.75');
    // the select keeps its own width: the title and the scrubber keep the rest of the row
    const width = (sel: string) => page.$eval(sel, (e) => e.getBoundingClientRect().width);
    const [select, body] = [await width('#aud-rate-select'), await width('#aud-rate .audio-body')];
    assert.ok(select < 110 && body > 250, `select ${select}px, body ${body}px`);
  });

  await check('the vertical volume in the compact row: a panel below the sound button (data-side="bottom"), shown on hover', async () => {
    assert.equal(await page.$eval('#aud-compact-volume', (el) => getComputedStyle(el).writingMode), 'vertical-lr');
    await page.mouse.move(0, 0);
    assert.equal(await page.$eval('#aud-compact-sound .audio-volume-panel', (el) => getComputedStyle(el).visibility), 'hidden');
    await page.hover('#aud-compact-mute');
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#aud-compact-sound .audio-volume-panel')!).visibility === 'visible');
    const [b, m] = await Promise.all([(await page.$('#aud-compact-volume'))!.boundingBox(), (await page.$('#aud-compact-mute'))!.boundingBox()]);
    assert.ok(b && m && b.height > b.width * 4 && b.y >= m.y + m.height, 'tall, below the button');
    assert.equal((await state(page, 'aud-compact')).volume, 0.8, 'the authored value is the starting volume');
    await page.$eval('#aud-compact-volume', (el: HTMLInputElement) => { el.value = '0.2'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.equal((await state(page, 'aud-compact')).volume, 0.2);
    await page.mouse.move(0, 0);
  });

  await check('a control and a readout outside the player (data-audio-for) drive it and follow it', async () => {
    await page.click('#aud-remote-toggle');
    await page.waitForFunction(() => (document.querySelector('#aud-remote') as any).api.getState().name === 'playing');
    assert.equal(await page.$eval('#aud-remote-toggle', (b) => b.getAttribute('aria-pressed')), 'true');
    await page.click('#aud-remote-toggle');
    await api(page, 'aud-remote', 'default', { time: 4 });
    await seeked(page, 'aud-remote', 4);
    await page.waitForFunction(() => document.querySelector('#aud-remote-time')?.textContent === '0:04');
  });

  await check('the end of the audio lands in default', async () => {
    await api(page, 'aud-compact', 'playing', { time: 23.6 });
    await page.waitForFunction(() => (document.querySelector('#aud-compact audio') as HTMLAudioElement).ended, undefined, { timeout: 5000 });
    assert.equal((await state(page, 'aud-compact')).name, 'default');
  });

  await check('df$.shadcn.audio: play, pause, toggle, seek, skip, mute, volume, rate, captions', async () => {
    const r = await page.evaluate(async () => {
      const a = (globalThis as any).df$.shadcn.audio;
      const el = document.getElementById('aud-remote') as any;
      const out: unknown[] = [];
      await a.play(el);
      out.push(el.api.getState().name);
      a.pause('#aud-remote');
      out.push(el.api.getState().name, a.toggle(el));
      a.pause(el);
      a.seek(el, 12);
      a.skip(el, 3);
      out.push(Math.round(el.api.getState().config.time));
      a.mute(el, true);
      a.volume(el, 0.25);
      a.rate(el, 1.25);
      a.captions(el, false);
      const c = el.api.getState().config;
      out.push(c.muted, c.volume, c.rate, c.captions);
      return out;
    });
    assert.deepEqual(r, ['playing', 'default', true, 15, true, 0.25, 1.25, '']);
  });

  await check('a narrow player drops the volume and the length (container query)', async () => {
    const r = await page.evaluate(() => {
      const el = document.getElementById('aud-basic')!;
      el.style.width = '18rem';
      const out = ['#aud-basic-volume', '#aud-basic [data-audio-output="duration"]'].map((s) => getComputedStyle(document.querySelector(s)!).display);
      el.style.width = '';
      return out;
    });
    assert.deepEqual(r, ['none', 'none']);
  });

  await check('no page error', async () => {
    assert.deepEqual(errors, []);
  });

  await check('render(): the model is the authored markup; render(state) equals setState(state) on the live element', async () => {
    await assertRenderContract(page, '.audio[id]', ['default', 'playing'], {
      runtimeOwned: '.audio-captions, [data-audio-action="seek"], [data-audio-output]',
    });
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\naudio.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('audio.e2e: all checks passed');
