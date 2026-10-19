import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

/**
 * Why: the Media Timeline promises a timeline rendered from a JSON of timeline metadata that drives a media both
 * ways and keeps its playhead through a re-render. This drives the shipped files: placement (percent geometry,
 * spans derived from the items they name - also from another span -, markers, lanes for overlapping regions, the
 * ruler's labels), the own clock of a timeline without media, the media moving the playhead and the playhead (pointer, keys, setState, the API) moving the
 * media, the playing state mirrored both ways and the playhead running on a Web Animation, new data keeping the
 * playhead, zoom and its controls, captions as the media's text track (shown by the Video's overlay, drawn natively
 * on a bare <video>, cues replaced on new data), the info outlet (escaped text, the authored content between items),
 * readouts and controls outside the timeline, media-timeline-change, annotation rows above the row they name (for),
 * row backgrounds and CSS colours (checked), several scale rows (minutes over seconds, seconds over frames), the
 * events outlet (its times seek and pause), the loop (drawn on the ruler, its keys, the API, playback kept inside
 * it - with media and with the own clock), text rows as keyed tracks in a Video's captions menu, and the render
 * contract.
 */

const FIXTURE = '/tests/e2e/multimedia/media-timeline.e2e-fixture.html';
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
const tl = (page: Page, id: string) =>
  page.$eval(`#${id}`, (el: any) => {
    const st = el.api.getState();
    return { name: st.name, time: st.config.time, zoom: st.config.zoom, tracks: st.config.data.tracks.length };
  });
const set = (page: Page, id: string, name: string, config: Record<string, unknown> = {}) =>
  page.$eval(`#${id}`, async (el: any, [n, c]) => { await el.api.setState(n, c); }, [name, config] as const);
/** where an element sits, in percent of its timeline's content box */
const at = (page: Page, sel: string) =>
  page.$eval(sel, (el) => {
    const content = el.closest('.media-timeline-content')!.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    return { left: Math.round(((box.left - content.left) / content.width) * 1000) / 10, width: Math.round((box.width / content.width) * 1000) / 10 };
  });
const playhead = (page: Page, id: string) =>
  page.$eval(`#${id} .media-timeline-playhead`, (el) => {
    const content = el.closest('.media-timeline-content')!.getBoundingClientRect();
    return ((el.getBoundingClientRect().left + 1 - content.left) / content.width) * 100;
  });
const videoTime = (page: Page) => page.$eval('#mt-player video', (v: HTMLVideoElement) => v.currentTime);
const seeked = (page: Page, sel: string, t: number) =>
  page.waitForFunction(([s, time]) => { const v = document.querySelector(s as string) as HTMLVideoElement; return !v.seeking && Math.abs(v.currentTime - (time as number)) < 0.05; }, [sel, t] as const);

try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } });
  page.setDefaultTimeout(10_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const log: { id: string; time: number; active: string[] }[] = [];
    (globalThis as any).__mtLog = log;
    document.addEventListener('media-timeline-change', (e: any) => log.push({ id: e.target.id, time: e.detail.time, active: e.detail.active.map((a: any) => `${a.track}/${a.item}`) }));
  });
  await page.goto(`${server.url}${FIXTURE}`);
  await page.waitForFunction(() => [...document.querySelectorAll('.media-timeline')].every((el: any) => el.api && !el.querySelector('.media-timeline-body')?.hidden));

  await check('every timeline renders its JSON: a label and a row per track, under a ruler', async () => {
    const r = await page.$$eval('.media-timeline', (els) => els.map((el) => [el.id, el.querySelectorAll('.media-timeline-track').length, [...el.querySelectorAll('.media-timeline-label:not([data-ruler])')].map((l) => l.textContent).join(',')]));
    assert.deepEqual(r, [
      ['mt-alone', 3, 'Scenes,Cuts,Daylight'],
      ['mt-zoom', 1, 'Sound'],
      ['mt-video', 3, 'Scenes,Sound,Captions'],
      ['mt-bare', 1, 'Captions'],
      ['mt-rows', 6, 'News,Picture,Verses,Notes,Sound,Orphan'],
      ['mt-frames', 1, 'Shots'],
      ['mt-menu', 4, 'English,Deutsch,Sound,Bild (Deutsch)'],
    ]);
  });

  await check('placement: regions in percent of the length, markers at their time, spans from the items they name', async () => {
    assert.deepEqual(await at(page, '#mt-alone [data-item="morning"]'), { left: 25, width: 25 });
    assert.deepEqual(await at(page, '#mt-alone [data-item="full"]'), { left: 25, width: 50 }, 'morning to noon');
    assert.deepEqual(await at(page, '#mt-alone [data-item="nested"]'), { left: 25, width: 75 }, 'a span of a span and dusk');
    const markers = await page.$$eval('#mt-alone .media-timeline-marker', (els) => els.length);
    assert.equal(markers, 3, 'a marker past the length is not drawn');
    assert.deepEqual(await at(page, '#mt-alone [data-item="late"]'), { left: 91.7, width: 8.3 }, 'an item past the length is cut at its end');
    const fit = await page.$eval('#mt-alone .media-timeline-scroll', (el) => el.scrollWidth - el.clientWidth);
    assert.equal(fit, 0, 'nothing widens the content past the width');
    assert.equal((await at(page, '#mt-alone .media-timeline-marker:nth-child(2)')).left, 50);
  });

  await check('overlapping regions of one track stack in lanes; the ruler labels as many times as fit', async () => {
    const lanes = await page.$$eval('#mt-video [data-track="sound"] .media-timeline-item', (els) => els.map((e) => (e as HTMLElement).style.getPropertyValue('--lane').trim()));
    assert.deepEqual(lanes, ['0', '1', '1'], 'surf in lane 0, gulls and bell beside it in lane 1');
    assert.equal(await page.$eval('#mt-video [data-track="sound"]', (e) => (e as HTMLElement).style.getPropertyValue('--lanes').trim()), '2');
    const ticks = await page.$$eval('#mt-alone .media-timeline-tick', (els) => els.map((e) => e.textContent));
    assert.deepEqual(ticks, ['0:00', '0:05', '0:10', '0:15', '0:20'], 'labels every 5 s at about 26 px per second');
  });

  await check('without media the timeline keeps its own time: a click and the keys move the playhead', async () => {
    const box = (await page.$('#mt-alone .media-timeline-content'))!;
    const b = (await box.boundingBox())!;
    await page.mouse.click(b.x + b.width * 0.5, b.y + b.height / 2);
    assert.equal(Math.round((await tl(page, 'mt-alone')).time), 12);
    assert.ok(Math.abs((await playhead(page, 'mt-alone')) - 50) < 0.6, 'the playhead stands at the click');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+ArrowRight');
    assert.equal(Math.round((await tl(page, 'mt-alone')).time), 18);
    await page.keyboard.press('Home');
    assert.equal((await tl(page, 'mt-alone')).time, 0);
    await page.keyboard.press('End');
    assert.equal((await tl(page, 'mt-alone')).time, 24);
    const slider = await page.$eval('#mt-alone .media-timeline-scroll', (el) => [el.getAttribute('role'), el.getAttribute('aria-valuenow'), el.getAttribute('aria-valuemax'), el.getAttribute('aria-valuetext')]);
    assert.deepEqual(slider, ['slider', '24', '24', '0:24 of 0:24']);
  });

  await check('without media, playing runs the timeline\'s own clock: the playhead runs, default stops it, the end lands in default', async () => {
    await set(page, 'mt-alone', 'default', { time: 2 });
    await set(page, 'mt-alone', 'playing');
    assert.equal((await tl(page, 'mt-alone')).name, 'playing');
    assert.equal(await page.$eval('#mt-alone .media-timeline-playhead', (el) => el.getAnimations().length), 1);
    await page.waitForTimeout(700);
    const t = (await tl(page, 'mt-alone')).time;
    assert.ok(t > 2.4 && t < 3.6, `the clock ran at normal speed: ${t}`);
    await set(page, 'mt-alone', 'default');
    const stopped = (await tl(page, 'mt-alone')).time;
    await page.waitForTimeout(400);
    assert.equal((await tl(page, 'mt-alone')).time, stopped, 'default stops the clock');
    assert.equal(await page.$eval('#mt-alone .media-timeline-playhead', (el) => el.getAnimations().length), 0);
    await set(page, 'mt-alone', 'playing', { time: 23.5 });
    await page.waitForFunction(() => (document.querySelector('#mt-alone') as any).api.getState().name === 'default', undefined, { timeout: 3000 });
    assert.equal((await tl(page, 'mt-alone')).time, 24);
  });

  await check('the media moves the playhead: a seek of the video sets the time, the playhead, the readouts and the active items', async () => {
    assert.equal(await page.$eval('#mt-video-length', (e) => e.textContent), '0:24', 'the length comes from the video');
    await page.$eval('#mt-player', (el: any) => el.api.setState('default', { time: 14 }));
    await seeked(page, '#mt-player video', 14);
    await page.waitForFunction(() => document.querySelector('#mt-video-time')?.textContent === '0:14');
    assert.equal((await tl(page, 'mt-video')).time, 14);
    assert.ok(Math.abs((await playhead(page, 'mt-video')) - (14 / 24) * 100) < 0.6);
    assert.equal(await page.$eval('#mt-video-active', (e) => e.textContent), 'Noon · Surf · Bell · [The harbour bell rings]');
    const activeItems = await page.$$eval('#mt-video .media-timeline-item[data-active]', (els) => els.map((e) => e.getAttribute('data-item')));
    assert.deepEqual(activeItems, ['noon', 'surf', 'bell', 'cc-1']);
  });

  await check('the info outlet renders a Card per active item with info - text escaped - and its own content between items', async () => {
    const cards = await page.$$eval('#mt-info .media-timeline-card', (els) => els.map((c) => [c.getAttribute('data-item'), c.querySelector('.card-title')?.textContent, c.querySelector('.card-description')?.textContent, c.querySelector('dd')?.textContent]));
    assert.deepEqual(cards, [['noon', 'High noon', 'The bell rings <twice>.', '13 s and 15 s']]);
    assert.equal(await page.$eval('#mt-info .media-timeline-card-meta', (e) => e.textContent), 'Scenes0:12 - 0:18');
    await page.$eval('#mt-player', (el: any) => el.api.setState('default', { time: 7 }));
    await page.waitForFunction(() => [...document.querySelectorAll('#mt-info .card-title')].map((e) => e.textContent).join() === 'Morning,Gulls');
    await page.$eval('#mt-player', (el: any) => el.api.setState('default', { time: 22 }));
    await page.waitForFunction(() => document.querySelector('#mt-info #mt-info-empty')?.textContent === 'Nothing here.');
  });

  await check('media-timeline-change reports the items under the playhead when they change', async () => {
    const log = await page.evaluate(() => (globalThis as any).__mtLog.filter((e: any) => e.id === 'mt-video'));
    const last = log[log.length - 1];
    assert.equal(Math.round(last.time), 22);
    assert.deepEqual(last.active, ['scenes/dusk']);
    assert.ok(log.some((e: any) => e.active.join() === 'scenes/morning,sound/surf,sound/gulls'), JSON.stringify(log.map((e: any) => e.active)));
  });

  await check('the playhead moves the media: a click and a drag seek the video; the keys and setState too', async () => {
    const b = (await (await page.$('#mt-video .media-timeline-content'))!.boundingBox())!;
    await page.mouse.click(b.x + b.width * 0.25, b.y + 10);
    await seeked(page, '#mt-player video', 6);
    await page.mouse.move(b.x + b.width * 0.25, b.y + 40);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * 0.75, b.y + 40, { steps: 5 });
    await page.mouse.up();
    await seeked(page, '#mt-player video', 18);
    assert.equal(await page.$eval('#mt-video', (el: any) => el.api.getState().config.loop), null, 'a drag over the rows draws no loop');
    await page.keyboard.press('PageDown');
    await seeked(page, '#mt-player video', 8);
    await set(page, 'mt-video', 'default', { time: 3 });
    await seeked(page, '#mt-player video', 3);
    await page.evaluate(() => (globalThis as any).df$.shadcn.mediaTimeline.seek('#mt-video', 10));
    await seeked(page, '#mt-player video', 10);
    assert.equal(await page.$eval('#mt-player [data-video-action="toggle"]', (b) => b.getAttribute('aria-pressed')), 'false');
  });

  await check('playing: the video plays the timeline, the timeline plays the video; the playhead runs on a Web Animation', async () => {
    await page.click('#mt-player-toggle');
    await page.waitForFunction(() => (document.querySelector('#mt-video') as any).api.getState().name === 'playing');
    // the state reads the media at once; the playhead starts on the media's play event, a task later
    await page.waitForFunction(() => document.querySelector('#mt-video .media-timeline-playhead')!.getAnimations().length === 1);
    const before = await playhead(page, 'mt-video');
    await page.waitForTimeout(600);
    const after = await playhead(page, 'mt-video');
    assert.ok(after > before + 1, `the playhead moved on: ${before} → ${after}`);
    assert.ok(Math.abs(after - ((await videoTime(page)) / 24) * 100) < 1.5, 'in step with the video');
    await set(page, 'mt-video', 'default');
    assert.equal(await page.$eval('#mt-player video', (v: HTMLVideoElement) => v.paused), true, 'the timeline paused the video');
    assert.equal(await page.$eval('#mt-video .media-timeline-playhead', (el) => el.getAnimations().length), 0);
    await page.click('#mt-video-toggle');
    await page.waitForFunction(() => !(document.querySelector('#mt-player video') as HTMLVideoElement).paused);
    assert.equal(await page.$eval('#mt-player', (el: any) => el.api.getState().name), 'playing', 'the video reports it');
    await page.click('#mt-video-toggle');
    await page.waitForFunction(() => (document.querySelector('#mt-player video') as HTMLVideoElement).paused);
  });

  await check('the loop: a drag on the ruler draws it (the playhead goes to its start), playback stays inside it and returns at its end; play outside starts at its start; a double click clears it', async () => {
    await set(page, 'mt-video', 'default', { time: 20 });
    await seeked(page, '#mt-player video', 20);
    assert.equal(await page.$eval('#mt-video-unloop', (b) => b.hasAttribute('disabled')), true, 'nothing to clear');
    await page.evaluate(() => {
      const out: unknown[] = [];
      document.getElementById('mt-video')!.addEventListener('media-timeline-loop', (e: any) => out.push(e.detail.loop));
      (globalThis as any).__loops = out;
      return out;
    });
    const b = (await (await page.$('#mt-video .media-timeline-content'))!.boundingBox())!;
    await page.mouse.move(b.x + b.width * 0.25, b.y + 10);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * (8 / 24), b.y + 10, { steps: 4 });
    await page.mouse.up();
    const loop = await page.$eval('#mt-video', (el: any) => el.api.getState().config.loop);
    assert.ok(Math.abs(loop.start - 6) < 0.1 && Math.abs(loop.end - 8) < 0.1, JSON.stringify(loop));
    await seeked(page, '#mt-player video', loop.start);
    assert.deepEqual(await at(page, '#mt-video .media-timeline-loop'), { left: 25, width: Math.round(((loop.end - loop.start) / 24) * 1000) / 10 });
    assert.equal(await page.$eval('#mt-video-loop', (e) => e.textContent), '0:06 - 0:08');
    assert.equal(await page.$eval('#mt-video-unloop', (b) => b.hasAttribute('disabled')), false);
    assert.equal((await page.evaluate(() => (globalThis as any).__loops)).length, 1, 'media-timeline-loop');
    // playing: back to the start at the end
    await page.evaluate(() => {
      const v = document.querySelector('#mt-player video') as HTMLVideoElement;
      (globalThis as any).__back = 0;
      v.addEventListener('seeked', () => { if (v.currentTime < 6.3) (globalThis as any).__back++; });
    });
    await page.$eval('#mt-player', (el: any) => el.api.setState('playing'));
    await page.waitForFunction(() => (globalThis as any).__back >= 1, undefined, { timeout: 6000 });
    const t1 = await videoTime(page);
    assert.ok(t1 >= 5.9 && t1 < 8.1, `inside the loop: ${t1}`);
    assert.equal(await page.$eval('#mt-player', (el: any) => el.api.getState().name), 'playing', 'it plays on');
    await page.$eval('#mt-player', (el: any) => el.api.setState('default', { time: 20 }));
    await seeked(page, '#mt-player video', 20);
    await page.$eval('#mt-player', (el: any) => el.api.setState('playing'));
    await page.waitForFunction(() => (document.querySelector('#mt-player video') as HTMLVideoElement).currentTime < 8.1);
    await page.$eval('#mt-player', (el: any) => el.api.setState('default'));
    await page.mouse.dblclick(b.x + b.width * 0.5, b.y + 10);
    assert.equal(await page.$eval('#mt-video', (el: any) => el.api.getState().config.loop), null);
    assert.equal(await page.$eval('#mt-video .media-timeline-loop', (e) => e.hasAttribute('hidden')), true);
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__loops.at(-1)), null);
  });

  await check('the loop by keys and the API, with the own clock: [ starts it, ] ends it, Escape clears it; loop() sets it and the clock stays inside', async () => {
    await set(page, 'mt-alone', 'default', { time: 3 });
    await page.focus('#mt-alone .media-timeline-scroll');
    await page.keyboard.press('[');
    let loop = await page.$eval('#mt-alone', (el: any) => el.api.getState().config.loop);
    assert.deepEqual(loop, { start: 3, end: 24 });
    await set(page, 'mt-alone', 'default', { time: 9 });
    await page.keyboard.press(']');
    loop = await page.$eval('#mt-alone', (el: any) => el.api.getState().config.loop);
    assert.deepEqual(loop, { start: 3, end: 9 });
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#mt-alone', (el: any) => el.api.getState().config.loop), null);
    const r = await page.evaluate(() => (globalThis as any).df$.shadcn.mediaTimeline.loop('#mt-alone', 10, 11));
    assert.deepEqual(r, { start: 10, end: 11 });
    assert.equal((await tl(page, 'mt-alone')).time, 10, 'the playhead went to its start');
    await set(page, 'mt-alone', 'playing');
    await page.waitForTimeout(1600);
    const t = (await tl(page, 'mt-alone')).time;
    assert.ok(t >= 10 && t < 11, `the clock looped: ${t}`);
    assert.equal((await tl(page, 'mt-alone')).name, 'playing');
    await set(page, 'mt-alone', 'default', { loop: null });
    assert.equal(await page.evaluate(() => (globalThis as any).df$.shadcn.mediaTimeline.loop('#mt-alone')), null);
  });

  await check('annotation rows sit above the row they name, in data order; a for that names no row keeps its place', async () => {
    const rows = await page.$$eval('#mt-rows .media-timeline-track', (els) => els.map((e) => [e.getAttribute('data-track'), e.getAttribute('data-kind'), e.getAttribute('data-for')]));
    assert.deepEqual(rows, [
      ['news', 'regions', 'picture'],
      ['picture', 'video', null],
      ['verses', 'regions', 'sound'],
      ['notes', 'regions', 'sound'],
      ['sound', 'audio', null],
      ['orphan', 'regions', 'nowhere'],
    ]);
    const glyph = await page.$eval('#mt-rows .media-timeline-label[data-kind="video"]', (e) => getComputedStyle(e, '::before').content);
    assert.equal(glyph, '""', 'a content row carries its glyph');
  });

  await check('a row background tints the row and its label; a colour is a theme name or a CSS colour CSS accepts, else the track\'s', async () => {
    const bg = await page.$eval('#mt-rows [data-track="verses"]', (e) => [e.hasAttribute('data-background'), (e as HTMLElement).style.getPropertyValue('--media-timeline-row').trim(), getComputedStyle(e).backgroundColor !== getComputedStyle(document.querySelector('#mt-rows [data-track="picture"]')!).backgroundColor]);
    assert.deepEqual(bg, [true, 'var(--chart-2)', true]);
    assert.equal(await page.$eval('#mt-rows .media-timeline-label[data-background]', (e) => e.textContent), 'News');
    const v1 = await page.$eval('#mt-rows [data-item="v1"]', (e) => [e.getAttribute('data-color'), (e as HTMLElement).style.getPropertyValue('--media-timeline-color').trim(), getComputedStyle(e).borderInlineStartColor]);
    assert.deepEqual(v1, [null, '#e11d48', 'rgb(225, 29, 72)']);
    assert.equal(await page.$eval('#mt-rows [data-item="n1"]', (e) => [e.getAttribute('data-color'), (e as HTMLElement).style.cssText.includes('url')].join()), 'chart-5,false', 'not a colour: the track\'s');
  });

  await check('scale rows: minutes over seconds (each labelling its unit within the row above), seconds over frames', async () => {
    const rows = await page.$$eval('#mt-rows .media-timeline-scale', (els) => els.map((r) => [...r.querySelectorAll('.media-timeline-tick')].map((t) => t.textContent)));
    const nf = await page.evaluate(() => [new Intl.NumberFormat('en', { style: 'unit', unit: 'minute', unitDisplay: 'narrow' }).format(0), new Intl.NumberFormat('en', { style: 'unit', unit: 'second', unitDisplay: 'narrow' }).format(2)]);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0], [nf[0]], 'one minute mark on 24 s');
    assert.equal(rows[1][1], nf[1], 'seconds every 2 at about 28 px per second');
    assert.deepEqual(await page.$$eval('#mt-rows .media-timeline-label[data-ruler]', (els) => els.map((e) => e.textContent)), ['min', 's']);
    const frames = await page.$$eval('#mt-frames .media-timeline-scale:last-child .media-timeline-tick', (els) => els.map((t) => t.textContent));
    assert.deepEqual(frames.slice(0, 7), ['0', '5', '10', '15', '20', '0', '5'], 'frames restart with every second');
  });

  await check('the events outlet: every event in time order (text escaped), its time a link that seeks and pauses, the latest passed marked', async () => {
    const items = await page.$$eval('#mt-events .media-timeline-event', (els) => els.map((e) => [e.querySelector('button')?.textContent, e.querySelector('span')?.textContent]));
    assert.deepEqual(items, [['0:06', 'Gulls <three>'], ['0:13', 'The bell, first stroke'], ['0:15', 'The bell, again']]);
    await set(page, 'mt-rows', 'playing', { time: 2 });
    await page.click('#mt-events .media-timeline-event:nth-child(2) button');
    const s = await tl(page, 'mt-rows');
    assert.deepEqual([s.name, s.time], ['default', 13], 'there, paused');
    assert.deepEqual(await page.$$eval('#mt-events [aria-current]', (els) => els.map((e) => e.getAttribute('data-event'))), ['1']);
    await set(page, 'mt-rows', 'default', { time: 16 });
    assert.deepEqual(await page.$$eval('#mt-events [aria-current]', (els) => els.map((e) => e.getAttribute('data-event'))), ['2']);
    await set(page, 'mt-rows', 'default', { time: 1 });
    assert.equal(await page.$$eval('#mt-events [aria-current]', (els) => els.length), 0);
  });

  await check('text rows are keyed tracks: the Video lists them in its captions menu by track id; the default one shows', async () => {
    const r = await page.$eval('#mt-menu-player', (el: any) => [el.api.getState().config.captions, !!el.querySelector('#mt-menu-cc').getAttribute('popovertarget')]);
    assert.deepEqual(r, ['desc-de', true]);
    await page.$eval('#mt-menu-player', (el: any) => el.api.setState('default', { time: 1, captions: 'sub-de' }));
    await page.waitForFunction(() => document.querySelector('#mt-menu-player .video-captions')?.textContent === 'Wellen rollen heran');
    await page.click('#mt-menu-cc');
    const menu = await page.$eval('#mt-menu-cc', (b) => b.getAttribute('popovertarget'));
    const sub = await page.$$eval(`#${menu} .dropdown-sub-content [role="menuitemradio"]`, (els) => els.map((e) => [e.textContent, e.getAttribute('aria-checked')]));
    assert.deepEqual(sub, [['English', 'false'], ['Deutsch', 'true']]);
    await page.click(`#${menu} > [role="menuitemradio"][data-value="desc-de"]`);
    await page.waitForFunction(() => document.querySelector('#mt-menu-player .video-captions')?.textContent === 'Morgendämmerung');
  });

  await check('captions: the captions track is a text track of the video, shown in the Video overlay; the toggle hides it', async () => {
    const track = await page.$eval('#mt-player video', (v: HTMLVideoElement) => {
      const t = [...v.textTracks].find((x) => x.label === 'Captions')!;
      return [t.kind, t.language, t.mode, t.cues?.length];
    });
    assert.deepEqual(track, ['captions', 'en', 'hidden', 2], 'the Video took it over (hidden: it draws it)');
    assert.equal(await page.$eval('#mt-player', (el: any) => el.api.getState().config.captions), 'cc', 'its key is the track id');
    await set(page, 'mt-video', 'default', { time: 1 });
    await page.waitForFunction(() => document.querySelector('#mt-player .video-captions')?.textContent === '[Waves roll in under the dawn sky]');
    await page.click('#mt-player-cc');
    assert.equal(await page.$eval('#mt-player .video-captions', (e) => e.textContent), '');
    await page.click('#mt-player-cc');
    assert.equal(await page.$eval('#mt-player .video-captions', (e) => e.textContent), '[Waves roll in under the dawn sky]');
  });

  await check('a bare <video>: the captions track shows natively (mode showing) with its cues', async () => {
    const track = await page.$eval('#mt-bare-player', (v: HTMLVideoElement) => [...v.textTracks].map((t) => [t.label, t.mode, t.cues?.length]));
    assert.deepEqual(track, [['Captions', 'showing', 2]]);
    // a row that leaves the data and returns takes its old track again: the media's list (and the browser's own
    // captions menu) does not grow by an empty track per return
    const again = await page.evaluate(() => {
      const t = (globalThis as any).df$.shadcn.mediaTimeline;
      const data = t.data('#mt-bare');
      const v = document.getElementById('mt-bare-player') as HTMLVideoElement;
      const out: unknown[] = [];
      t.load('#mt-bare', { version: 1, duration: 24, tracks: [] });
      out.push([...v.textTracks].map((x) => [x.mode, x.cues?.length ?? null]));
      t.load('#mt-bare', data);
      out.push([...v.textTracks].map((x) => [x.label, x.mode, x.cues?.length]));
      return out;
    });
    assert.deepEqual(again, [[['disabled', null]], [['Captions', 'showing', 2]]]);
  });

  await check('new data re-renders and the playhead stays; the captions cues are replaced', async () => {
    await set(page, 'mt-video', 'default', { time: 9 });
    await seeked(page, '#mt-player video', 9);
    const before = await playhead(page, 'mt-video');
    await page.evaluate(() =>
      (globalThis as any).df$.shadcn.mediaTimeline.load('#mt-video', {
        version: 1,
        tracks: [
          { id: 'chapters', label: 'Chapters', items: [{ id: 'one', start: 0, end: 12, label: 'Part one' }, { id: 'two', start: 12, end: 24, label: 'Part two' }] },
          { id: 'cc', label: 'Captions', kind: 'captions', items: [{ start: 8, end: 10, text: 'A new caption' }] },
        ],
      }),
    );
    const s = await tl(page, 'mt-video');
    assert.equal(s.time, 9);
    assert.equal(s.tracks, 2);
    assert.equal(await page.$eval('#mt-video .media-timeline-label:not([data-ruler])', (e) => e.textContent), 'Chapters');
    assert.ok(Math.abs((await playhead(page, 'mt-video')) - before) < 0.1, 'the playhead did not move');
    assert.equal(await videoTime(page), 9, 'nor did the video');
    assert.equal(await page.$eval('#mt-player video', (v: HTMLVideoElement) => [...v.textTracks].filter((t) => t.label === 'Captions').length), 1, 'the same text track');
    await page.waitForFunction(() => document.querySelector('#mt-player .video-captions')?.textContent === 'A new caption');
    assert.equal(await page.$eval('#mt-video-active', (e) => e.textContent), 'Part one · A new caption');
    const data = await page.evaluate(() => (globalThis as any).df$.shadcn.mediaTimeline.data('#mt-video'));
    assert.equal(data.tracks[0].id, 'chapters');
    assert.deepEqual(await page.evaluate(() => (globalThis as any).df$.shadcn.mediaTimeline.active('#mt-video', 20).map((a: any) => a.item)), ['two']);
    assert.match(await page.$eval('#mt-video script.media-timeline-source', (e) => e.textContent ?? ''), /"Part one"/, 'the script holds the data (render)');
  });

  await check('zoom: data-zoom starts it; the header zooms in, out and back to fit; the playhead stays in view while it plays', async () => {
    const width = () => page.$eval('#mt-zoom .media-timeline-content', (e) => Math.round(e.getBoundingClientRect().width));
    const view = await page.$eval('#mt-zoom .media-timeline-scroll', (e) => e.clientWidth);
    assert.equal(await width(), 24 * 60);
    assert.equal((await tl(page, 'mt-zoom')).zoom, 60);
    const ticks = await page.$$eval('#mt-zoom .media-timeline-tick', (els) => els.length);
    assert.equal(ticks, 24, 'a label every second at 60 px per second');
    await page.click('#mt-zoom-in');
    assert.equal(await width(), 24 * 90);
    assert.equal(await page.$eval('#mt-zoom', (e) => e.getAttribute('data-zoom')), '90');
    await page.click('#mt-zoom-fit');
    assert.equal(await width(), view);
    assert.equal(await page.$eval('#mt-zoom', (e) => e.hasAttribute('data-zoom')), false);
    await page.click('#mt-zoom-out');
    assert.equal((await tl(page, 'mt-zoom')).zoom, 0, 'zooming out of fit stays at fit');
    await page.evaluate(() => (globalThis as any).df$.shadcn.mediaTimeline.zoom('#mt-video', 100));
    await page.$eval('#mt-player', (el: any) => el.api.setState('playing', { time: 15 }));
    await page.waitForFunction(() => {
      const s = document.querySelector('#mt-video .media-timeline-scroll')!;
      const x = ((document.querySelector('#mt-player video') as HTMLVideoElement).currentTime / 24) * s.scrollWidth;
      return s.scrollLeft > 0 && x >= s.scrollLeft && x <= s.scrollLeft + s.clientWidth;
    });
    await page.$eval('#mt-player', (el: any) => el.api.setState('default'));
    await page.evaluate(() => (globalThis as any).df$.shadcn.mediaTimeline.zoom('#mt-video', 0));
  });

  await check('no page error', async () => {
    assert.deepEqual(errors, []);
  });

  await check('render(): the model is the authored markup; render(state) equals setState(state) on the live element', async () => {
    await assertRenderContract(page, '.media-timeline[id]', ['default', 'playing'], {
      runtimeOwned: '.media-timeline-body, [data-media-timeline-output]',
    });
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nmedia-timeline.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('media-timeline.e2e: all checks passed');
