import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

/**
 * Why: the Video component promises a player whose playback is a named state - default (paused) or playing, with
 * time, rate, volume, muted and captions as its config - driven by controls inside it, controls anywhere on the
 * page (data-video-for), its API and its store, and following the media whatever moved it. This drives the shipped
 * files over the 24 s harbour clip: every control, the readouts, the caption overlay from a <track>, captions as a
 * key, the player's own text tracks and the captions menu over them (a Dropdown Menu), tracks() while it plays, the
 * vertical volume, the native controls, the end of the video, full screen (hidden in a frame that may not use it),
 * the API, the store and the render contract.
 */

const FIXTURE = '/tests/e2e/multimedia/video.e2e-fixture.html';
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
type Snap = { name: string; time: number; duration: number; rate: number; volume: number; muted: boolean; captions: string; paused: boolean };
const state = (page: Page, id: string): Promise<Snap> =>
  page.$eval(`#${id}`, (el: any) => {
    const st = el.api.getState();
    return { name: st.name, ...st.config, paused: el.querySelector('video').paused };
  });
const api = (page: Page, id: string, name: string, config: Record<string, unknown> = {}) =>
  page.$eval(`#${id}`, async (el: any, [n, c]) => { await el.api.setState(n, c); }, [name, config] as const);
const text = (page: Page, sel: string) => page.$eval(sel, (el) => el.textContent ?? '');
const attr = (page: Page, sel: string, name: string) => page.$eval(sel, (el, n) => el.getAttribute(n), name);
/** the media of a player reached a time (a seek completes asynchronously) */
const seeked = (page: Page, id: string, t: number) =>
  page.waitForFunction(([i, time]) => { const v = document.querySelector(`#${i} video`) as HTMLVideoElement; return !v.seeking && Math.abs(v.currentTime - (time as number)) < 0.05; }, [id, t] as const);

try {
  const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
  page.setDefaultTimeout(10_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${server.url}${FIXTURE}`);
  await page.waitForFunction(() => [...document.querySelectorAll('.video')].every((el: any) => el.api && el.querySelector('video').readyState >= 1));

  await check('every player initializes in default with the length of its video (24 s)', async () => {
    const r = await page.$$eval('.video', (els: any[]) => els.map((el) => [el.id, el.api.getState().name, Math.round(el.api.getState().config.duration)]));
    assert.deepEqual(r, [['vid-bar', 'default', 24], ['vid-overlay', 'default', 24], ['vid-native', 'default', 24], ['vid-remote', 'default', 24], ['vid-menu', 'default', 24]]);
    assert.equal(await text(page, '#vid-bar [data-video-output="duration"]'), '0:24');
    assert.equal(await text(page, '#vid-overlay [data-video-output="remaining"]'), '-0:24');
    assert.ok(Math.abs(Number(await attr(page, '#vid-bar-seek', 'max')) - 24) < 0.1, 'the scrubber spans the length');
  });

  await check('the toggle plays and pauses: the state, aria-pressed, the time and its readout follow', async () => {
    await page.click('#vid-bar-toggle');
    await page.waitForFunction(() => (document.querySelector('#vid-bar') as any).api.getState().name === 'playing');
    assert.equal(await attr(page, '#vid-bar-toggle', 'aria-pressed'), 'true');
    assert.equal(await attr(page, '#vid-bar', 'data-state-name'), 'playing');
    // the readout follows the media's timeupdate (a few times a second)
    await page.waitForFunction(() => document.querySelector('#vid-bar [data-video-output="time"]')?.textContent === '0:01');
    await page.click('#vid-bar-toggle');
    const s = await state(page, 'vid-bar');
    assert.equal(s.name, 'default');
    assert.equal(s.paused, true);
    assert.equal(await attr(page, '#vid-bar-toggle', 'aria-pressed'), 'false');
  });

  await check('setState seeks: { time } moves the video, the readout, the scrubber and its value text', async () => {
    await api(page, 'vid-bar', 'default', { time: 12 });
    await seeked(page, 'vid-bar', 12);
    assert.equal(await text(page, '#vid-bar [data-video-output="time"]'), '0:12');
    assert.equal(await page.$eval('#vid-bar-seek', (el: HTMLInputElement) => Number(el.value)), 12);
    assert.equal(await attr(page, '#vid-bar-seek', 'aria-valuetext'), '0:12 of 0:24');
    assert.equal((await state(page, 'vid-bar')).time, 12);
  });

  await check('the scrubber seeks; skip moves back 5 seconds', async () => {
    await page.$eval('#vid-bar-seek', (el: HTMLInputElement) => { el.value = '18'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await seeked(page, 'vid-bar', 18);
    await page.click('#vid-bar-back');
    await seeked(page, 'vid-bar', 13);
  });

  await check('mute: the sound goes off, the toggle is pressed and the video carries the muted attribute', async () => {
    await page.click('#vid-bar-mute');
    let s = await state(page, 'vid-bar');
    assert.equal(s.muted, true);
    assert.equal(await attr(page, '#vid-bar-mute', 'aria-pressed'), 'true');
    assert.equal(await page.$eval('#vid-bar video', (v) => v.hasAttribute('muted')), true);
    await api(page, 'vid-bar', 'default', { muted: false });
    s = await state(page, 'vid-bar');
    assert.equal(s.muted, false);
    assert.equal(await attr(page, '#vid-bar-mute', 'aria-pressed'), 'false');
  });

  await check('volume: the range sets it, setState writes the range', async () => {
    await page.$eval('#vid-bar-volume', (el: HTMLInputElement) => { el.value = '0.4'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.equal((await state(page, 'vid-bar')).volume, 0.4);
    await api(page, 'vid-bar', 'default', { volume: 0.8 });
    assert.equal(await page.$eval('#vid-bar-volume', (el: HTMLInputElement) => el.value), '0.8');
    assert.equal(await attr(page, '#vid-bar-volume', 'value'), '0.8');
  });

  await check('captions: the <track default> fills the overlay with the active cue; captions is its key (srclang); one track - the button toggles it', async () => {
    await api(page, 'vid-bar', 'default', { time: 1 });
    await page.waitForFunction(() => document.querySelector('#vid-bar .video-captions')?.textContent === '[Waves roll in under the dawn sky]');
    assert.equal(await page.$eval('#vid-bar video', (v: HTMLVideoElement) => v.textTracks[0].mode), 'hidden', 'the browser draws none of its own');
    assert.equal((await state(page, 'vid-bar')).captions, 'en');
    assert.equal(await attr(page, '#vid-bar-cc', 'popovertarget'), null, 'one track: no menu');
    await page.click('#vid-bar-cc');
    assert.equal(await text(page, '#vid-bar .video-captions'), '');
    assert.equal((await state(page, 'vid-bar')).captions, '');
    assert.equal(await attr(page, '#vid-bar-cc', 'aria-pressed'), 'false');
    await page.click('#vid-bar-cc');
    assert.equal(await text(page, '#vid-bar .video-captions'), '[Waves roll in under the dawn sky]');
    assert.equal((await state(page, 'vid-bar')).captions, 'en');
    await api(page, 'vid-bar', 'default', { time: 5 });
    await page.waitForFunction(() => document.querySelector('#vid-bar .video-captions')?.textContent === '');
  });

  await check('the player\'s own JSON tracks: the default one shows; two or more make the button a Dropdown Menu - Off, Subtitles (a submenu of two), Video captions (one item)', async () => {
    assert.equal((await state(page, 'vid-menu')).captions, 'desc-de');
    await api(page, 'vid-menu', 'default', { time: 1 });
    await page.waitForFunction(() => document.querySelector('#vid-menu .video-captions')?.textContent === 'Morgendämmerung über dem Hafen');
    const menuId = await attr(page, '#vid-menu-cc', 'popovertarget');
    assert.ok(menuId, 'the button opens a menu');
    assert.equal(await attr(page, '#vid-menu-cc', 'aria-haspopup'), 'menu', 'dropdown.js took it as its trigger');
    await page.click('#vid-menu-cc');
    await page.waitForFunction((id) => document.getElementById(id as string)?.matches(':popover-open'), menuId);
    const items = await page.$eval(`#${menuId}`, (m) => [...m.querySelectorAll(':scope > .dropdown-item, :scope > .dropdown-sub > .dropdown-item')].map((i) => [i.getAttribute('role'), i.textContent?.trim(), i.getAttribute('aria-checked')]));
    assert.deepEqual(items, [['menuitemradio', 'Off', 'false'], ['menuitem', 'Subtitles', null], ['menuitemradio', 'PictureDeutsch', 'true']], 'the JSON labels name the groups');
    assert.equal((await state(page, 'vid-menu')).captions, 'desc-de', 'opening the menu toggles nothing');
    await page.click(`#${menuId} .dropdown-sub-trigger`);
    await page.click(`#${menuId} .dropdown-sub-content [data-value="sub-en"]`);
    assert.equal((await state(page, 'vid-menu')).captions, 'sub-en');
    await page.waitForFunction(() => document.querySelector('#vid-menu .video-captions')?.textContent === 'Waves roll in');
    assert.equal(await page.$eval(`#${menuId}`, (m) => m.matches(':popover-open')), false, 'a choice closes the menu');
    assert.equal(await page.$eval(`#${menuId} [data-value="sub-en"]`, (i) => i.getAttribute('aria-checked')), 'true');
    assert.equal(await page.$eval(`#${menuId} .dropdown-sub-trigger .dropdown-shortcut`, (s) => s.textContent), 'English', 'the submenu names its choice');
    // the keyboard: Enter opens it (dropdown.js), the arrows move, Enter chooses (dropdown:select)
    await page.focus('#vid-menu-cc');
    await page.keyboard.press('Enter');
    // the menu's toggle event (a task after it opens) moves the focus to its first item
    await page.waitForFunction((id) => !!document.activeElement?.closest(`#${id}`), menuId);
    await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
    assert.equal((await state(page, 'vid-menu')).captions, '', 'Off');
    assert.equal(await text(page, '#vid-menu .video-captions'), '');
    assert.equal(await attr(page, '#vid-menu-cc', 'aria-pressed'), 'false');
    await api(page, 'vid-menu', 'default', { captions: 'desc-de' });
    assert.equal(await text(page, '#vid-menu .video-captions'), 'Morgendämmerung über dem Hafen');
    assert.equal(await attr(page, '#vid-menu-cc', 'aria-pressed'), 'true');
  });

  await check('tracks(): a track changes while the video plays (the choice stays), a new key joins the menu, replace retires the rest', async () => {
    await api(page, 'vid-menu', 'playing', { time: 1 });
    const r = await page.evaluate(async () => {
      const v = (globalThis as any).df$.shadcn.video;
      const el = document.getElementById('vid-menu') as any;
      const out: unknown[] = [];
      out.push(v.tracks(el, [{ id: 'desc-de', kind: 'descriptions', label: 'Deutsch', lang: 'de', items: [{ start: 0, end: 24, text: 'Neu: der Hafen' }] }]));
      await new Promise((r) => setTimeout(r, 300));
      out.push(el.querySelector('.video-captions').textContent, el.api.getState().name, el.api.getState().config.captions);
      v.tracks(el, [{ id: 'sub-fr', kind: 'subtitles', label: 'Français', lang: 'fr', items: [{ start: 0, end: 24, text: 'Les vagues' }] }]);
      const menu = document.getElementById(el.querySelector('#vid-menu-cc').getAttribute('popovertarget'));
      out.push([...menu!.querySelectorAll('.dropdown-sub-content [role="menuitemradio"]')].map((i) => i.textContent));
      out.push(v.tracks(el, [{ id: 'desc-de', kind: 'descriptions', label: 'Deutsch', lang: 'de', items: [{ start: 0, end: 24, text: 'Allein' }] }], true));
      out.push(el.querySelector('#vid-menu-cc').hasAttribute('popovertarget') || el.querySelector('#vid-menu-cc').hasAttribute('aria-haspopup'));
      el.api.setState('default');
      return out;
    });
    assert.deepEqual(r, [['desc-de'], 'Neu: der Hafen', 'playing', 'desc-de', ['English', 'Deutsch', 'Français'], ['desc-de'], false]);
    await page.waitForFunction(() => document.querySelector('#vid-menu .video-captions')?.textContent === 'Allein');
  });

  await check('the vertical volume: a range in a panel over the sound button, shown on hover and focus', async () => {
    assert.equal(await page.$eval('#vid-menu-volume', (el) => getComputedStyle(el).writingMode), 'vertical-lr');
    const shown = () => page.$eval('#vid-menu-sound .video-volume-panel', (el) => getComputedStyle(el).visibility);
    await page.mouse.move(0, 0);
    assert.equal(await shown(), 'hidden');
    await page.hover('#vid-menu-mute');
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#vid-menu-sound .video-volume-panel')!).visibility === 'visible');
    const box = (await page.$('#vid-menu-volume'))!.boundingBox();
    const mute = (await page.$('#vid-menu-mute'))!.boundingBox();
    const [b, m] = await Promise.all([box, mute]);
    assert.ok(b && m && b.height > b.width * 4 && b.y + b.height <= m.y, 'tall, above the button');
    await page.$eval('#vid-menu-volume', (el: HTMLInputElement) => { el.value = '0.3'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.equal((await state(page, 'vid-menu')).volume, 0.3);
    await page.mouse.move(0, 0);
    await page.focus('#vid-menu-volume');
    assert.equal(await shown(), 'visible', 'the focus keeps it open');
    await page.$eval('#vid-menu-volume', (el: HTMLElement) => el.blur());
  });

  await check('controls outside the player (data-video-for on a container and on a control) drive it and follow it', async () => {
    await page.click('#vid-remote-toggle');
    await page.waitForFunction(() => (document.querySelector('#vid-remote') as any).api.getState().name === 'playing');
    assert.equal(await attr(page, '#vid-remote-toggle', 'aria-pressed'), 'true');
    await page.click('#vid-remote-pause');
    assert.equal((await state(page, 'vid-remote')).name, 'default');
    await api(page, 'vid-remote', 'default', { time: 3 });
    await seeked(page, 'vid-remote', 3);
    await page.click('#vid-remote-fwd');
    await seeked(page, 'vid-remote', 8);
    assert.equal(await text(page, '#vid-remote-time'), '0:08');
    await page.selectOption('#vid-remote-rate', '1.5');
    assert.equal((await state(page, 'vid-remote')).rate, 1.5);
    await page.click('#vid-remote-2x');
    assert.equal((await state(page, 'vid-remote')).rate, 2);
    assert.equal(await page.$eval('#vid-remote-rate', (el: HTMLSelectElement) => el.value), '2', 'the select shows the rate that plays');
    assert.equal(await attr(page, '#vid-remote-2x', 'aria-pressed'), 'true');
    await api(page, 'vid-remote', 'default', { rate: 1 });
    assert.equal(await attr(page, '#vid-remote-2x', 'aria-pressed'), 'false');
  });

  await check('native controls: playback started on the element itself is the playing state (read back)', async () => {
    await page.$eval('#vid-native video', (v: HTMLVideoElement) => v.play());
    await page.waitForFunction(() => (document.querySelector('#vid-native') as any).api.getState().name === 'playing');
    await page.$eval('#vid-native video', (v: HTMLVideoElement) => v.pause());
    await page.waitForFunction(() => (document.querySelector('#vid-native') as any).api.getState().name === 'default');
  });

  await check('a click on the picture plays and pauses (no native controls)', async () => {
    await page.click('#vid-overlay video');
    await page.waitForFunction(() => (document.querySelector('#vid-overlay') as any).api.getState().name === 'playing');
    await page.click('#vid-overlay video');
    assert.equal((await state(page, 'vid-overlay')).name, 'default');
  });

  await check('the end of the video lands in default at its length', async () => {
    await api(page, 'vid-overlay', 'playing', { time: 23.6 });
    await page.waitForFunction(() => (document.querySelector('#vid-overlay video') as HTMLVideoElement).ended, undefined, { timeout: 5000 });
    const s = await state(page, 'vid-overlay');
    assert.equal(s.name, 'default');
    assert.ok(s.time > 23.9, String(s.time));
  });

  await check('full screen: the button puts the whole player full screen and back; aria-pressed follows', async () => {
    await page.click('#vid-bar-fs');
    await page.waitForFunction(() => document.fullscreenElement?.id === 'vid-bar');
    await page.waitForFunction(() => document.querySelector('#vid-bar-fs')?.getAttribute('aria-pressed') === 'true');
    await page.click('#vid-bar-fs');
    await page.waitForFunction(() => !document.fullscreenElement);
    assert.equal(await attr(page, '#vid-bar-fs', 'aria-pressed'), 'false');
  });

  await check('full screen controls hide in a frame that may not use the Fullscreen API (the docs sandbox without the opt-in)', async () => {
    const r = await page.evaluate(async (src) => {
      const f = document.createElement('iframe');
      f.setAttribute('allow', "fullscreen 'none'");
      f.style.cssText = 'width: 700px; height: 400px';
      f.src = src;
      document.body.append(f);
      await new Promise((r) => f.addEventListener('load', r, { once: true }));
      const doc = f.contentDocument!;
      for (let i = 0; i < 50 && !(doc.getElementById('vid-bar') as any)?.api; i++) await new Promise((r) => setTimeout(r, 100));
      const fs = doc.getElementById('vid-bar-fs')!;
      const out = [doc.fullscreenEnabled, fs.hasAttribute('hidden'), f.contentWindow!.getComputedStyle(fs).display];
      f.remove();
      return out;
    }, FIXTURE);
    assert.deepEqual(r, [false, true, 'none']);
  });

  await check('df$.shadcn.video: play, pause, toggle, seek, skip, mute, volume, rate, captions', async () => {
    const r = await page.evaluate(async () => {
      const v = (globalThis as any).df$.shadcn.video;
      const el = document.getElementById('vid-remote') as any;
      const out: unknown[] = [];
      await v.play('#vid-remote');
      out.push(el.api.getState().name);
      v.pause(el);
      out.push(el.api.getState().name);
      out.push(v.toggle(el), el.api.getState().name);
      v.toggle(el);
      v.seek(el, 10);
      v.skip(el, -4);
      out.push(Math.round(el.api.getState().config.time));
      v.mute(el, false);
      out.push(el.api.getState().config.muted);
      v.mute(el);
      out.push(el.api.getState().config.muted);
      v.volume(el, 0.5);
      v.rate(el, 0.5);
      v.captions(el, false);
      const c = el.api.getState().config;
      out.push(c.volume, c.rate, c.captions);
      return out;
    });
    assert.deepEqual(r, ['playing', 'default', true, 'playing', 6, false, true, 0.5, 0.5, '']);
  });

  await check('the store: a subscriber hears playback, and store.set() drives the player', async () => {
    const r = await page.evaluate(async () => {
      const el = document.getElementById('vid-remote') as any;
      el.api.setState('default', { rate: 1 });
      const heard: string[] = [];
      const off = el.store.subscribe((s: { name: string }) => heard.push(s.name));
      el.store.set({ name: 'playing', config: {} });
      await el.api.settled();
      await new Promise((r) => setTimeout(r, 300));
      const playing = !el.querySelector('video').paused;
      el.api.setState('default');
      off();
      return { playing, heard: [...new Set(heard)] };
    });
    assert.equal(r.playing, true);
    assert.deepEqual(r.heard, ['playing', 'default']);
  });

  await check('a narrow player drops the volume, the length and the skip (container query)', async () => {
    const r = await page.evaluate(() => {
      const el = document.getElementById('vid-bar')!;
      el.style.width = '20rem';
      const hidden = ['#vid-bar-volume', '#vid-bar-back', '#vid-bar [data-video-output="duration"]'].map((s) => getComputedStyle(document.querySelector(s)!).display);
      el.style.width = '';
      return hidden;
    });
    assert.deepEqual(r, ['none', 'none', 'none']);
  });

  await check('no page error', async () => {
    assert.deepEqual(errors, []);
  });

  await check('render(): the model is the authored markup; render(state) equals setState(state) on the live element', async () => {
    await assertRenderContract(page, '.video[id]', ['default', 'playing'], {
      runtimeOwned: '.video-captions, [data-video-action="seek"], [data-video-output], .video > .dropdown-content',
    });
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nvideo.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('video.e2e: all checks passed');
