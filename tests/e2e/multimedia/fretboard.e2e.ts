import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

/**
 * Why: the Fretboard promises a tablature rendered from a JSON of scores, played along on its own clock. This drives
 * the shipped files: the lanes of every measure (chord names, the tab staff, lyrics), items placed at their beats,
 * strums and chords resolved to frets (a picked string from the chord sounding), lyrics following a melody (a hold,
 * markup shown as text), the lines breaking at the width and again after a resize (the position kept, no text running
 * into the next), the clock (play, pause, resume, stop, the end of the score landing in default), what sounds
 * lighting up, the loop (the API, a click on a measure's number, Shift-click, the loop toggle, the keys, playback
 * kept inside it), the keys and a click on a measure, Space (in the tab, on an idle page the tab used last, never a
 * button's), the scores (key, time signature and score selects filled from the song, from with tracks replaced, the
 * position kept), string colours, the neck across and upright for either fretting hand, mirrored chord charts, the
 * readouts and controls outside the tab, the
 * position slider, the neck and the chord chart outlets, scrolling to the line being played (its own scroll box,
 * the page, data-follow="none"), a song without scores, fretboard-change, the API and the render contract.
 */

const FIXTURE = '/tests/e2e/multimedia/fretboard.e2e-fixture.html';
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
    const c = st.config;
    return { name: st.name, position: c.position, score: c.score, key: c.key, signature: c.signature, loop: c.loop, zoom: c.zoom };
  });
const set = (page: Page, id: string, name: string, config: Record<string, unknown> = {}) =>
  page.$eval(`#${id}`, async (el: any, [n, c]) => { await el.api.setState(n, c); }, [name, config] as const);
const fb = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([f, a]) => (globalThis as any).df$.shadcn.fretboard[f as string](...(a as unknown[])), [fn, args] as const);
/** the texts of the active items of a tab */
const lit = (page: Page, id: string) =>
  page.$$eval(`#${id} .fretboard-sheet [data-active]`, (els) => els.map((e) => `${e.getAttribute('data-item')}:${e.textContent}`));
const text = (page: Page, sel: string) => page.$eval(sel, (e) => e.textContent ?? '');

try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } });
  page.setDefaultTimeout(10_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const log: { id: string; measure: number; active: string[] }[] = [];
    (globalThis as any).__fbLog = log;
    document.addEventListener('fretboard-change', (e: any) =>
      log.push({ id: e.target.id, measure: e.detail.measure, active: e.detail.active.map((a: any) => a.item) }),
    );
  });
  await page.goto(`${server.url}${FIXTURE}`);
  await page.waitForFunction(() => [...document.querySelectorAll('.fretboard')].every((el: any) => el.api && el.querySelector('.fretboard-sheet')));

  await check('every tab renders its song: measures, a lane per track, string names and lane labels in each line', async () => {
    const r = await page.$$eval('.fretboard', (els) => els.map((el) => [el.id, el.querySelectorAll('.fretboard-measure').length]));
    assert.deepEqual(r, [['fb-main', 4], ['fb-long', 16], ['fb-waltz', 2], ['fb-empty', 0], ['fb-page', 8], ['fb-still', 8], ['fb-guitar', 2]]);
    const lanes = await page.$$eval('#fb-main .fretboard-measure[data-measure="1"] .fretboard-lane', (els) => els.map((e) => `${e.getAttribute('data-kind')}:${e.getAttribute('data-track')}`));
    assert.deepEqual(lanes, ['chords:chords', 'tab:melody', 'lyrics:en', 'lyrics:de']);
    const clef = await page.$$eval('#fb-main .fretboard-line:first-child .fretboard-clef .fretboard-string-name', (els) => els.map((e) => [e.textContent, getComputedStyle(e).getPropertyValue('--fretboard-s')]));
    assert.deepEqual(clef, [['G', '4'], ['C', '3'], ['E', '2'], ['A', '1']], 'G C E A - the 1st string (A) on the top line');
    assert.equal(await text(page, '#fb-main .fretboard-clef [title="EN"]'), 'EN');
    assert.equal(await page.$eval('#fb-main .fretboard-measure[data-measure="4"]', (e) => e.hasAttribute('data-last')), true);
    assert.equal(await page.$eval('#fb-main .fretboard-sheet', (e) => e.getAttribute('aria-label')), 'Fixture song');
    // the 1st string sits on the top line
    const y = await page.$$eval('#fb-main .fretboard-measure[data-measure="4"] .fretboard-hit', (hits) => [...hits[0].querySelectorAll('.fretboard-fret')].map((e) => [e.textContent, Math.round(e.getBoundingClientRect().top)]));
    assert.deepEqual(y.map((x) => x[0]), ['3', '0', '0', '0'], 'the C chord as a column, 1st string first');
    assert.ok(y.every((x, i) => i === 0 || (x[1] as number) > (y[i - 1][1] as number)), 'string 1 above string 4');
  });

  await check('items sit at their beats; strums and chords play the chord shape, a string without a fret picks it', async () => {
    const at = await page.$$eval('#fb-main [data-track="chords"] .fretboard-chord', (els) => els.map((e) => `${e.textContent}@${getComputedStyle(e).getPropertyValue('--fretboard-at')}`));
    assert.deepEqual(at, ['C@0', 'F@0', 'C@0.5', 'G@0', 'C@0']);
    const strums = await page.$$eval('#fb-main .fretboard-measure[data-measure="3"] .fretboard-hit', (els) =>
      els.map((e) => `${[...e.querySelectorAll('.fretboard-fret')].map((f) => f.textContent).join('')}:${e.querySelector('.fretboard-strum')?.getAttribute('data-dir')}:${e.getAttribute('title')}`));
    assert.deepEqual(strums, ['2320:down:G', '2320:up:G'], 'the G shape 0232 read from the 1st string down');
    const picked = await page.$$eval('#fb-main .fretboard-measure[data-measure="4"] .fretboard-hit', (hits) => [...hits[1].querySelectorAll('.fretboard-fret')].map((e) => `${getComputedStyle(e).getPropertyValue('--fretboard-s')}/${e.textContent}`));
    assert.deepEqual(picked, ['1/3', '4/0'], 'string 4 without a fret takes the C chord\'s 0');
    // the waltz: three beats a measure
    assert.deepEqual(await page.$$eval('#fb-waltz .fretboard-hit', (els) => els.map((e) => getComputedStyle(e).getPropertyValue('--fretboard-at'))), ['0', '0.6667']);
    assert.equal(await page.$eval('#fb-waltz .fretboard-lane[data-kind="tab"]', (e) => e.hasAttribute('data-strums')), true);
  });

  await check('lyrics follow the melody: a syllable per note, _ holds one over the next note, markup is text', async () => {
    const words = await page.$$eval('#fb-main [data-track="en"] .fretboard-syllable', (els) => els.map((e) => e.textContent));
    assert.deepEqual(words, ['Twin-', 'kle,', 'twin-', 'kle,', 'lit-', 'tle', 'star,', 'oh', 'my', '<b>!</b>']);
    assert.equal(await page.$$eval('#fb-main .fretboard-syllable b', (els) => els.length), 0, 'no <b> element');
    const held = await fb(page, 'active', '#fb-main', 9.5);
    assert.ok(held.some((a: any) => a.item === 'en-7' && a.text === 'oh' && a.start === 8 && a.end === 12), 'oh lasts over the held note');
    // a lane of its own items: beats sets the length
    const stern = (await fb(page, 'active', '#fb-main', 5)).find((a: any) => a.track === 'de');
    assert.equal(stern, undefined, 'Stern lasts one beat (beats: 1)');
  });

  await check('texts never run into the next item of their lane', async () => {
    const overlaps = await page.$$eval('#fb-main .fretboard-lane:not([data-kind="tab"])', (lanes) =>
      lanes.flatMap((lane) => {
        const boxes = [...lane.children].map((c) => c.getBoundingClientRect()).sort((a, b) => a.left - b.left);
        return boxes.flatMap((b, i) => (i && boxes[i - 1].right > b.left + 0.5 ? [`${lane.getAttribute('data-track')}`] : []));
      }),
    );
    assert.deepEqual(overlaps, []);
  });

  await check('a position lights up what sounds there - chords, notes, syllables - and the readouts follow', async () => {
    await set(page, 'fb-main', 'default', { position: 4 });
    assert.deepEqual(await lit(page, 'fb-main'), ['chords-1:F', 'melody-4:0', 'en-4:lit-', 'de-2:Stern']);
    assert.equal(await text(page, '#fb-main-measure'), '2');
    assert.equal(await text(page, '#fb-main-beat'), '1');
    assert.equal(await text(page, '#fb-main-chord'), 'F');
    assert.equal(await text(page, '#fb-main-time'), '0:02', 'four beats at 120 BPM');
    assert.equal(await text(page, '#fb-main-duration'), '0:08');
    assert.equal(await text(page, '#fb-main-bpm'), '120');
    assert.equal(await text(page, '#fb-main-keyout'), 'C');
    assert.equal(await text(page, '#fb-main-scoreout'), 'C major, fast');
    assert.equal(await page.$eval('#fb-main-position', (e: HTMLInputElement) => [e.max, e.value].join()), '16,4');
    // the playhead stands in measure 2, at its first beat
    assert.equal(await page.$eval('#fb-main .fretboard-cursor', (e) => e.closest('.fretboard-measure')!.getAttribute('data-measure')), '2');
    const log = await page.evaluate(() => (globalThis as any).__fbLog.filter((x: any) => x.id === 'fb-main').at(-1));
    assert.deepEqual(log, { id: 'fb-main', measure: 2, active: ['chords-1', 'melody-4', 'en-4', 'de-2'] });
  });

  await check('play, pause, resume, stop: the clock runs at the tempo, a pause keeps the position, stop goes to the start', async () => {
    await set(page, 'fb-main', 'default', { position: 0 });
    await page.click('#fb-main-toggle');
    assert.equal((await state(page, 'fb-main')).name, 'playing');
    assert.equal(await page.$eval('#fb-main-toggle', (e) => e.getAttribute('aria-pressed')), 'true');
    assert.equal(await page.$eval('#fb-main-toggle-out', (e) => e.getAttribute('aria-pressed')), 'true', 'a bound toggle too');
    await page.waitForFunction(() => (document.querySelector('#fb-main') as any).api.getState().config.position >= 2.5);
    await page.waitForFunction(() => document.querySelector('#fb-main [data-item="melody-2"]')?.hasAttribute('data-active'));
    assert.equal(await page.$eval('#fb-main .fretboard-playhead', (e) => e.getAnimations().length), 1, 'the playhead runs on a Web Animation');
    await page.click('#fb-main-pause');
    const paused = await state(page, 'fb-main');
    assert.equal(paused.name, 'paused');
    await page.waitForTimeout(300);
    assert.equal((await state(page, 'fb-main')).position, paused.position, 'a pause stands');
    await page.click('#fb-main-play');
    await page.waitForFunction((p) => (document.querySelector('#fb-main') as any).api.getState().config.position > p + 0.5, paused.position);
    await page.click('#fb-main-stop');
    assert.deepEqual([(await state(page, 'fb-main')).name, (await state(page, 'fb-main')).position], ['default', 0]);
    assert.equal(await page.$eval('#fb-main-toggle', (e) => e.getAttribute('aria-pressed')), 'false');
  });

  await check('the end of the score: playing lands in default, back at the start', async () => {
    await set(page, 'fb-main', 'playing', { position: 15 });
    await page.waitForFunction(() => (document.querySelector('#fb-main') as any).api.getState().name === 'default', undefined, { timeout: 3000 });
    assert.equal((await state(page, 'fb-main')).position, 0);
    assert.equal(await page.$eval('#fb-main', (e) => e.getAttribute('data-state-name')), 'default');
    assert.equal(await page.$eval('#fb-main-toggle', (e) => e.getAttribute('aria-pressed')), 'false');
  });

  await check('the keys of the sheet: Space, arrows (Shift: a measure), Home, End', async () => {
    await page.focus('#fb-main .fretboard-sheet');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    assert.equal((await state(page, 'fb-main')).position, 2);
    await page.keyboard.press('Shift+ArrowRight');
    assert.equal((await state(page, 'fb-main')).position, 4);
    await page.keyboard.press('ArrowLeft');
    assert.equal((await state(page, 'fb-main')).position, 3);
    await page.keyboard.press('Shift+ArrowLeft');
    assert.equal((await state(page, 'fb-main')).position, 0, 'to the start of its measure');
    await page.keyboard.press('End');
    assert.equal((await state(page, 'fb-main')).position, 12);
    await page.keyboard.press('Home');
    assert.equal((await state(page, 'fb-main')).position, 0);
    await page.keyboard.press(' ');
    assert.equal((await state(page, 'fb-main')).name, 'playing');
    await page.keyboard.press(' ');
    assert.equal((await state(page, 'fb-main')).name, 'paused');
    await set(page, 'fb-main', 'default', { position: 0 });
  });

  await check('a click on a measure goes to the beat under the pointer', async () => {
    const box = (await page.$('#fb-main .fretboard-measure[data-measure="2"] .fretboard-lane[data-kind="tab"]'))!;
    const b = (await box.boundingBox())!;
    const pad = 12;
    await page.mouse.click(b.x + pad + ((b.width - 2 * pad) * 2.5) / 4, b.y + b.height / 2);
    assert.equal((await state(page, 'fb-main')).position, 6, 'measure 2, beat 3');
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('fretboard-sheet')), true, 'the sheet takes the focus');
  });

  await check('the loop: a measure number, Shift-click, the toggle, the keys - marked measures, the readout', async () => {
    await page.click('#fb-main .fretboard-measure[data-measure="3"] .fretboard-number');
    assert.deepEqual((await state(page, 'fb-main')).loop, { start: 3, end: 3 });
    assert.equal((await state(page, 'fb-main')).position, 8, 'the playhead goes into the loop');
    await page.click('#fb-main .fretboard-measure[data-measure="2"] .fretboard-number', { modifiers: ['Shift'] });
    assert.deepEqual((await state(page, 'fb-main')).loop, { start: 2, end: 3 });
    assert.deepEqual(await page.$$eval('#fb-main .fretboard-measure[data-loop]', (els) => els.map((e) => e.getAttribute('data-measure'))), ['2', '3']);
    assert.equal(await text(page, '#fb-main-loopout'), '2 - 3');
    assert.equal(await page.$eval('#fb-main-loop', (e) => e.getAttribute('aria-pressed')), 'true');
    await page.click('#fb-main-loop');
    assert.equal((await state(page, 'fb-main')).loop, null, 'the toggle clears a loop');
    await page.click('#fb-main-loop');
    assert.deepEqual((await state(page, 'fb-main')).loop, { start: 1, end: 4 }, 'and loops the whole score');
    await page.focus('#fb-main .fretboard-sheet');
    await page.keyboard.press('Escape');
    assert.equal((await state(page, 'fb-main')).loop, null);
    await set(page, 'fb-main', 'default', { position: 5 });
    await page.keyboard.press('[');
    assert.deepEqual((await state(page, 'fb-main')).loop, { start: 2, end: 4 });
    await set(page, 'fb-main', 'default', { position: 9 });
    await page.keyboard.press(']');
    assert.deepEqual((await state(page, 'fb-main')).loop, { start: 2, end: 3 });
    assert.deepEqual(await fb(page, 'loop', '#fb-main', null), null);
    assert.equal(await text(page, '#fb-main-loopout'), '');
  });

  await check('playback stays inside the loop: at its end it goes on at its start', async () => {
    await fb(page, 'loop', '#fb-long', 2);
    await set(page, 'fb-long', 'playing');
    assert.equal((await state(page, 'fb-long')).position >= 4, true, 'play starts at the loop');
    const seen = await page.evaluate(async () => {
      const el = document.querySelector('#fb-long') as any;
      const out: number[] = [];
      for (let i = 0; i < 30; i++) {
        out.push(el.api.getState().config.position);
        await new Promise((r) => setTimeout(r, 50));
      }
      return out;
    });
    assert.ok(seen.every((p) => p >= 4 && p < 8), `inside measure 2: ${seen.join(' ')}`);
    assert.ok(seen.some((p, i) => i && p < seen[i - 1]), 'it went back to the start of the loop');
    await set(page, 'fb-long', 'default', { loop: null, position: 0 });
  });

  await check('its own scroll box: the line being played goes to the top, a loop back scrolls up again', async () => {
    const top = () => page.$eval('#fb-long .fretboard-sheet', (e) => e.scrollTop);
    assert.equal(await top(), 0);
    await set(page, 'fb-long', 'playing', { position: 4 * 9 });
    const line = await page.$eval('#fb-long .fretboard-measure[data-measure="10"]', (m) => {
      const l = m.closest('.fretboard-line') as HTMLElement;
      return l.offsetTop - parseFloat(getComputedStyle(l.parentElement!).rowGap);
    });
    await page.waitForFunction((t) => Math.abs((document.querySelector('#fb-long .fretboard-sheet') as HTMLElement).scrollTop - t) < 2, line);
    await fb(page, 'loop', '#fb-long', 1);
    await page.waitForFunction(() => (document.querySelector('#fb-long .fretboard-sheet') as HTMLElement).scrollTop === 0);
    await set(page, 'fb-long', 'default', { loop: null, position: 0 });
  });

  await check('the page scrolls to the line being played; data-follow="none" scrolls nothing', async () => {
    await page.setViewportSize({ width: 1000, height: 500 });
    await page.$eval('#fb-page', (e) => e.scrollIntoView({ block: 'start' }));
    const before = await page.evaluate(() => scrollY);
    await set(page, 'fb-page', 'playing', { position: 4 * 5 });
    await page.waitForFunction(() => {
      const m = document.querySelector('#fb-page .fretboard-measure[data-measure="6"]')!.getBoundingClientRect();
      return m.top >= -2 && m.bottom <= innerHeight;
    });
    assert.ok((await page.evaluate(() => scrollY)) > before, 'the window scrolled down');
    await set(page, 'fb-page', 'default', { position: 0 });
    // the smooth scroll back to its first line ends first
    await page.waitForTimeout(800);
    await page.$eval('#fb-still', (e) => e.scrollIntoView({ block: 'start' }));
    const still = await page.evaluate(() => scrollY);
    await set(page, 'fb-still', 'playing', { position: 4 * 6 });
    await page.waitForTimeout(600);
    assert.equal(await page.evaluate(() => scrollY), still);
    await set(page, 'fb-still', 'default', { position: 0 });
    await page.setViewportSize({ width: 1000, height: 1400 });
    await page.evaluate(() => scrollTo(0, 0));
  });

  await check('the lines follow the width: a narrower tab breaks more lines, the position stays', async () => {
    const lines = () => page.$eval('#fb-long .fretboard-sheet', (e) => Number(e.getAttribute('data-lines')));
    const wide = await lines();
    await set(page, 'fb-long', 'paused', { position: 22 });
    await page.$eval('#fb-long', (e: HTMLElement) => (e.style.width = '420px'));
    await page.waitForFunction((n) => Number(document.querySelector('#fb-long .fretboard-sheet')!.getAttribute('data-lines')) > n, wide);
    assert.equal((await state(page, 'fb-long')).position, 22);
    assert.equal(await page.$eval('#fb-long .fretboard-cursor', (e) => e.closest('.fretboard-measure')!.getAttribute('data-measure')), '6');
    const overflow = await page.$$eval('#fb-long .fretboard-line', (ls) => ls.filter((l) => l.scrollWidth > l.clientWidth + 1).length);
    assert.equal(overflow, 0, 'no line wider than the sheet');
    await page.$eval('#fb-long', (e: HTMLElement) => (e.style.width = ''));
    await page.waitForFunction((n) => Number(document.querySelector('#fb-long .fretboard-sheet')!.getAttribute('data-lines')) === n, wide);
    await set(page, 'fb-long', 'default', { position: 0 });
  });

  await check('Space plays, pauses and resumes: in the tab, on an idle page the tab used last; a button keeps its Space', async () => {
    await set(page, 'fb-main', 'default', { position: 0 });
    await page.focus('#fb-main .fretboard-sheet');
    await page.keyboard.press(' ');
    assert.equal((await state(page, 'fb-main')).name, 'playing');
    await page.keyboard.press(' ');
    assert.equal((await state(page, 'fb-main')).name, 'paused');
    const y = await page.evaluate(() => scrollY);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press(' ');
    assert.equal((await state(page, 'fb-main')).name, 'playing', 'resumed: nothing focused, the tab used last');
    await page.keyboard.press(' ');
    assert.equal((await state(page, 'fb-main')).name, 'paused');
    assert.equal(await page.evaluate(() => scrollY), y, 'the page did not scroll');
    await page.focus('#fb-main-stop');
    await page.keyboard.press(' ');
    const stopped = await state(page, 'fb-main');
    assert.deepEqual([stopped.name, stopped.position], ['default', 0], 'Space on Stop stops');
    await page.click('#fb-waltz .fretboard-measure[data-measure="1"] .fretboard-lane[data-kind="chords"]');
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press(' ');
    assert.equal((await state(page, 'fb-waltz')).name, 'playing', 'the other tab, used last');
    assert.equal((await state(page, 'fb-main')).name, 'default');
    await page.keyboard.press(' ');
    assert.equal((await state(page, 'fb-waltz')).name, 'paused');
    await set(page, 'fb-waltz', 'default', { position: 0 });
  });

  await check('scores: the selects list the keys and the time signatures of the key; a choice shows that score as written', async () => {
    const options = (id: string) => page.$$eval(`#${id} option`, (els) => els.map((e) => (e as HTMLOptionElement).value));
    assert.deepEqual(await options('fb-main-key'), ['C', 'G']);
    assert.deepEqual(await options('fb-main-signature'), ['4/4', '3/4']);
    assert.deepEqual(await options('fb-main-score'), ['c-120', 'c-34', 'g-120']);
    await set(page, 'fb-main', 'paused', { position: 8 });
    await page.selectOption('#fb-main-signature', '3/4');
    let s = await state(page, 'fb-main');
    assert.deepEqual([s.score, s.signature, s.name], ['c-34', '3/4', 'paused']);
    assert.equal(s.position, 6, 'the same share of the song, at a bar line: measure 3 of 4');
    assert.equal(await text(page, '#fb-main-sigout'), '3/4');
    assert.equal(await text(page, '#fb-main-duration'), '0:06', 'twelve beats at 120 BPM');
    assert.deepEqual(await page.$$eval('#fb-main .fretboard-measure[data-measure="1"] .fretboard-hit', (els) => els.map((e) => getComputedStyle(e).getPropertyValue('--fretboard-at'))), ['0', '0.6667'], 'three beats a measure');
    assert.equal(await page.$$eval('#fb-main [data-track="en"] .fretboard-syllable', (els) => els.length), 8, 'the words kept (from), on its notes');
    await set(page, 'fb-main', 'playing');
    await page.selectOption('#fb-main-key', 'G');
    s = await state(page, 'fb-main');
    assert.deepEqual([s.score, s.key, s.signature, s.name], ['g-120', 'G', '4/4', 'playing'], 'G is in four-four only; playing goes on');
    assert.deepEqual(await options('fb-main-signature'), ['4/4'], 'the time signatures of G');
    assert.deepEqual(await page.$$eval('#fb-main [data-track="chords"] .fretboard-chord', (els) => els.map((e) => e.textContent)), ['G', 'D'], 'its own chords');
    assert.equal(await page.$$eval('#fb-main [data-track="en"] .fretboard-syllable', (els) => els.length), 10, 'the words kept (from)');
    assert.equal(await page.$eval('#fb-main [data-item="melody-2"] .fretboard-fret', (e) => e.textContent), '5');
    await set(page, 'fb-main', 'paused');
    assert.equal(await fb(page, 'select', '#fb-main', { key: 'C', signature: '3/4' }), 'c-34');
    assert.equal(await fb(page, 'select', '#fb-main', { signature: '4/4' }), 'c-120', 'in the key shown');
    await page.selectOption('#fb-main-score', 'g-120');
    assert.equal((await state(page, 'fb-main')).score, 'g-120');
    await page.selectOption('#fb-main-score', 'c-120');
    assert.deepEqual(await fb(page, 'scores', '#fb-main'), [
      { id: 'c-120', label: 'C major, fast', key: 'C', signature: '4/4', bpm: 120 },
      { id: 'c-34', label: 'C · 3/4', key: 'C', signature: '3/4', bpm: 120 },
      { id: 'g-120', label: 'G · 4/4', key: 'G', signature: '4/4', bpm: 120 },
    ]);
    await set(page, 'fb-main', 'default', { position: 0 });
  });

  await check('string colours and the fretting hand: a chart colour per string, the neck upright and mirrored, the chord charts across and upright, mirrored', async () => {
    const colors = await page.evaluate(() => {
      const probe = document.createElement('span');
      document.body.append(probe);
      const chart = (k: number) => {
        probe.style.color = `var(--chart-${k})`;
        return getComputedStyle(probe).color;
      };
      const want = [1, 2, 3, 4].map(chart);
      const ink = [1, 2, 3, 4].map((k) => {
        probe.style.color = `color-mix(in oklab, var(--chart-${k}) 55%, var(--foreground))`;
        return getComputedStyle(probe).color;
      });
      probe.remove();
      const measure = '#fb-waltz .fretboard-measure[data-measure="1"]';
      const lines = [...document.querySelectorAll(`${measure} .fretboard-lane[data-kind="tab"] .fretboard-string`)].map((e) => getComputedStyle(e).backgroundColor);
      const frets = [...document.querySelectorAll('#fb-waltz .fretboard-measure[data-measure="2"] .fretboard-fret')].map((e) => [Number(e.getAttribute('data-string')), getComputedStyle(e).color] as const);
      return { want, ink, lines, frets };
    });
    assert.equal(new Set(colors.want).size, 4);
    assert.deepEqual(colors.lines, colors.want, 'string n takes chart colour n');
    assert.equal(new Set(colors.ink).size, 4);
    assert.ok(colors.frets.length === 4 && colors.frets.every(([n, c]) => c === colors.ink[n - 1]), `and its fret numbers, mixed toward the text colour ${JSON.stringify(colors.frets)}`);
    const plain = await page.$$eval('#fb-main .fretboard-measure[data-measure="1"] .fretboard-lane[data-kind="tab"] .fretboard-string', (els) => new Set(els.map((e) => getComputedStyle(e).backgroundColor)).size);
    assert.equal(plain, 1, 'one colour without data-colors');
    // the outlets take the tab's hand and colours; the neck is upright where it says so
    assert.deepEqual(await page.$eval('#fb-waltz-neck', (e) => [e.getAttribute('data-orientation'), e.getAttribute('data-hand'), e.getAttribute('data-colors')]), ['vertical', 'right', 'strings']);
    const across = (sel: string, axis: 'left' | 'top') => page.$$eval(`${sel} .fretboard-neck-string`, (els, a) => Object.fromEntries(els.map((e) => [e.getAttribute('data-string'), Math.round(e.getBoundingClientRect()[a as 'left' | 'top'])])), axis);
    let xs = await across('#fb-waltz-neck', 'left');
    assert.ok(xs['1'] < xs['2'] && xs['2'] < xs['3'] && xs['3'] < xs['4'], `upright for the right hand: the 1st string on the left ${JSON.stringify(xs)}`);
    const box = await page.$eval('#fb-waltz-neck .fretboard-neck-board', (e) => e.getBoundingClientRect().toJSON());
    assert.ok(box.height > box.width, 'upright');
    const nutTop = await page.$eval('#fb-waltz-neck .fretboard-neck-wires', (e) => getComputedStyle(e).borderTopWidth);
    assert.equal(nutTop, '4px', 'the nut on top');
    const ys = await across('#fb-main-neck', 'top');
    assert.ok(ys['1'] < ys['4'], 'across: the 1st string on top, as the tab draws it');
    assert.deepEqual(await page.$eval('#fb-main-neck .fretboard-neck-wires', (e) => [getComputedStyle(e).borderLeftWidth, getComputedStyle(e).borderRightWidth]), ['4px', '0px'], 'the left hand: the nut on the left');
    // the C shape (0003): where its one dot - the 1st string at the 3rd fret - sits in the grid, as a share of it
    // a chart the tab writes again is drawn by the Chord Chart component as it starts
    const chart = async (sel: string) =>
      (await page.waitForSelector(`${sel} [data-chord="C"] .chord-chart-grid`, { state: 'attached' })) &&
      page.$eval(`${sel} [data-chord="C"]`, (fig) => {
        const grid = fig.querySelector('.chord-chart-grid')!;
        const box = grid.getBoundingClientRect();
        const style = getComputedStyle(grid);
        const dot = fig.querySelector('.chord-chart-dot')!.getBoundingClientRect();
        const share = (v: number) => Math.round(v * 10) / 10;
        return {
          hand: fig.getAttribute('data-hand'),
          orientation: fig.getAttribute('data-orientation'),
          across: box.width > box.height,
          nut: [style.borderLeftWidth, style.borderRightWidth, style.borderTopWidth],
          x: share((dot.left + dot.width / 2 - box.left) / box.width),
          y: share((dot.top + dot.height / 2 - box.top) / box.height),
          marks: fig.querySelectorAll('.chord-chart-mark').length,
        };
      });
    assert.deepEqual(
      await chart('#fb-waltz-chords'),
      { hand: 'right', orientation: 'horizontal', across: true, nut: ['0px', '3px', '0px'], x: 0.4, y: 0, marks: 0 },
      'across for the right hand: the nut on the right, the 3rd fret to its left, the 1st string on top; nothing on the open strings',
    );
    assert.deepEqual(
      await chart('#fb-waltz-chords-upright'),
      { hand: 'right', orientation: 'vertical', across: false, nut: ['0px', '0px', '3px'], x: 0, y: 0.6, marks: 0 },
      'upright for the right hand: the nut on top, the 1st string on the left',
    );
    // another hand on the tab: the outlets are drawn again at once
    await page.$eval('#fb-waltz', (e) => e.setAttribute('data-hand', 'left'));
    await page.waitForFunction(() => document.querySelector('#fb-waltz-neck')?.getAttribute('data-hand') === 'left');
    xs = await across('#fb-waltz-neck', 'left');
    assert.ok(xs['4'] < xs['1'], 'upright for the left hand: the 4th string on the left, as chord charts draw it');
    assert.deepEqual(
      await chart('#fb-waltz-chords'),
      { hand: 'left', orientation: 'horizontal', across: true, nut: ['3px', '0px', '0px'], x: 0.6, y: 0, marks: 0 },
      'across for the left hand: the nut on the left, the fret to its right, the 1st string on top',
    );
    assert.deepEqual(
      await chart('#fb-waltz-chords-upright'),
      { hand: 'left', orientation: 'vertical', across: false, nut: ['0px', '0px', '3px'], x: 1, y: 0.6, marks: 0 },
      'upright for the left hand: the nut on top, the 4th string on the left',
    );
    await page.$eval('#fb-waltz', (e) => e.setAttribute('data-hand', 'right'));
  });

  await check('zoom: the controls, the keys and the API scale the sheet; the lines break again, the position and playing stay', async () => {
    const look = () =>
      page.$eval('#fb-main', (el) => {
        const sheet = el.querySelector('.fretboard-sheet') as HTMLElement;
        const fret = el.querySelector('.fretboard-fret') as HTMLElement;
        const measure = el.querySelector('.fretboard-measure') as HTMLElement;
        return {
          attr: el.getAttribute('data-zoom'),
          font: getComputedStyle(fret).fontSize,
          width: parseFloat(measure.style.minInlineSize),
          lines: Number(sheet.getAttribute('data-lines')),
          readout: document.querySelector('#fb-main-zoom')!.textContent,
        };
      });
    await set(page, 'fb-main', 'paused', { position: 5 });
    const one = await look();
    assert.deepEqual([one.attr, one.font, one.readout, (await state(page, 'fb-main')).zoom], [null, '12px', '100%', 1]);
    await page.click('#fb-main-zoom-in');
    let z = await look();
    assert.deepEqual([z.attr, z.font, z.readout, (await state(page, 'fb-main')).zoom], ['1.25', '15px', '125%', 1.25]);
    assert.ok(Math.abs(z.width - one.width * 1.25) <= 2, `a measure 1.25 times as wide: ${one.width} → ${z.width}`);
    assert.equal((await state(page, 'fb-main')).position, 5, 'the position stays');
    await page.click('#fb-main-zoom-out');
    await page.click('#fb-main-zoom-out');
    z = await look();
    assert.deepEqual([z.attr, z.readout], ['0.8', '80%']);
    await page.click('#fb-main-zoom-reset');
    assert.equal((await look()).attr, null, 'the default size writes no data-zoom');
    await page.focus('#fb-main .fretboard-sheet');
    await page.keyboard.press('+');
    assert.equal((await state(page, 'fb-main')).zoom, 1.25, '+ zooms in');
    await page.keyboard.press('-');
    await page.keyboard.press('-');
    assert.equal((await state(page, 'fb-main')).zoom, 0.8, '- zooms out');
    await page.keyboard.press('0');
    assert.equal((await state(page, 'fb-main')).zoom, 1, '0: the default size');
    assert.equal(await fb(page, 'zoom', '#fb-main', 9), 3, 'at most 3');
    z = await look();
    assert.ok(z.lines > one.lines, `the lines break again: ${one.lines} → ${z.lines}`);
    assert.equal(await fb(page, 'zoom', '#fb-main', 0.1), 0.5, 'at least 0.5');
    // a click maps to the beat under the pointer at any scale
    await fb(page, 'zoom', '#fb-main', 2);
    const box = (await page.$eval('#fb-main .fretboard-measure[data-measure="2"]', (e) => e.getBoundingClientRect().toJSON())) as DOMRect;
    await page.mouse.click(box.x + box.width / 2 + 6, box.y + box.height - 8);
    assert.equal((await state(page, 'fb-main')).position, 6, 'measure 2, beat 3');
    await set(page, 'fb-main', 'playing');
    await fb(page, 'zoom', '#fb-main', 1);
    assert.equal((await state(page, 'fb-main')).name, 'playing', 'playing goes on');
    await set(page, 'fb-main', 'default', { position: 0 });
    // an authored scale
    const waltz = await page.$eval('#fb-waltz', (el: any) => [el.api.getState().config.zoom, getComputedStyle(el.querySelector('.fretboard-fret')).fontSize]);
    assert.deepEqual(waltz, [1.25, '15px'], 'data-zoom starts it');
  });

  await check('the position slider follows the playhead and moves it', async () => {
    await page.$eval('#fb-main-position', (e: HTMLInputElement) => {
      e.value = '9';
      e.dispatchEvent(new Event('input', { bubbles: true }));
    });
    assert.equal((await state(page, 'fb-main')).position, 9);
    await set(page, 'fb-main', 'default', { position: 13 });
    assert.equal(await page.$eval('#fb-main-position', (e: HTMLInputElement) => e.value), '13');
  });

  await check('the neck: the note sounding filled, the next dashed, the chord shape faint; inlays up to its frets', async () => {
    await set(page, 'fb-main', 'default', { position: 1 });
    const dots = await page.$$eval('#fb-main-neck .fretboard-neck-dot', (els) => els.map((e) => `${e.getAttribute('data-role')}:${getComputedStyle(e).getPropertyValue('--fretboard-neck-s')}/${getComputedStyle(e).getPropertyValue('--fretboard-neck-f')}`).sort());
    assert.deepEqual(dots, ['chord:1/3', 'next:2/3'], 'nothing on the open strings - the one sounding included');
    assert.equal(await page.$eval('#fb-main-neck .fretboard-neck-board', (e) => getComputedStyle(e).getPropertyValue('--fretboard-neck-frets')), '5', 'the highest fret + 2');
    assert.deepEqual(await page.$$eval('#fb-main-neck .fretboard-neck-fret-number', (els) => els.map((e) => e.textContent)), ['3', '5']);
    await set(page, 'fb-main', 'default', { position: 8 });
    assert.deepEqual(await page.$$eval('#fb-main-neck .fretboard-neck-dot[data-role="active"]', (els) => els.map((e) => e.textContent).sort()), ['2', '2', '3'], 'the strummed G - its open string shows nothing');
  });

  await check('the chord chart: a diagram per chord in the order it sounds, the one sounding marked', async () => {
    const charts = await page.$$eval('#fb-main-chords .chord-chart', (els) => els.map((e) => [e.getAttribute('data-chord'), e.querySelector('[role="img"]')!.getAttribute('aria-label'), e.hasAttribute('data-active')]));
    assert.deepEqual(charts, [['C', 'C: 0 0 0 3', false], ['F', 'F: 2 0 1 0', false], ['G', 'G: 0 2 3 2', true]]);
    assert.equal(await page.$$eval('#fb-main-chords [data-chord="C"] .chord-chart-dot', (els) => els.length), 1);
    assert.equal(await page.$$eval('#fb-main-chords [data-chord="C"] .chord-chart-mark', (els) => els.length), 0, 'nothing on an open string');
    await set(page, 'fb-main', 'default', { position: 0 });
  });

  await check('a guitar with a capo: six strings, the capo as the bold bar, the barre dashed, open strings show nothing', async () => {
    const clef = await page.$$eval('#fb-guitar .fretboard-line:first-child .fretboard-clef .fretboard-string-name', (els) => els.map((e) => [e.textContent, getComputedStyle(e).getPropertyValue('--fretboard-s')]));
    assert.deepEqual(clef, [['E', '6'], ['A', '5'], ['D', '4'], ['G', '3'], ['B', '2'], ['e', '1']], 'six strings, the 1st (e) on the top line');
    assert.equal(await text(page, '#fb-guitar-capo'), '3');
    assert.equal(await text(page, '#fb-guitar-scoreout'), 'Ab · 4/4 · capo 3');
    assert.deepEqual(await page.$$eval('#fb-guitar-score option', (els) => els.map((e) => e.textContent)), ['Ab · 4/4 · capo 3', 'F · 4/4']);
    // the neck across: the bold bar on the 3rd fret wire, the nut thin behind it; F's barre at the capo's 1st fret
    await set(page, 'fb-guitar', 'default', { position: 0 });
    const neck = await page.$eval('#fb-guitar-neck', (el) => {
      const x = (e: Element | null) => (e ? Math.round(e.getBoundingClientRect().left + e.getBoundingClientRect().width / 2) : -1);
      const barre = el.querySelector('.fretboard-neck-barre') as HTMLElement | null;
      return {
        capo: el.getAttribute('data-capo'),
        nut: getComputedStyle(el.querySelector('.fretboard-neck-wires')!).borderLeftWidth,
        capoX: x(el.querySelector('.fretboard-neck-capo')),
        fret3: x(el.querySelector('.fretboard-neck-fret-number')),
        barre: barre && [barre.style.getPropertyValue('--fretboard-neck-f'), barre.style.getPropertyValue('--fretboard-neck-s1'), barre.style.getPropertyValue('--fretboard-neck-s2')],
        barreX: x(barre),
        barreTall: !!barre && barre.getBoundingClientRect().height > barre.getBoundingClientRect().width,
        dots: [...el.querySelectorAll('.fretboard-neck-dot')].map((d) => [d.getAttribute('data-role'), d.getAttribute('data-string'), (d as HTMLElement).style.getPropertyValue('--fretboard-neck-f'), d.textContent]),
      };
    });
    assert.equal(neck.capo, '3');
    assert.equal(neck.nut, '2px', 'the nut a thin line behind the capo');
    assert.ok(neck.capoX > neck.fret3, `the capo on the 3rd fret wire, past the 3rd fret's middle ${JSON.stringify(neck)}`);
    assert.deepEqual(neck.barre, ['4', '1', '6'], 'the barre at the capo + 1, from the 1st to the 6th string');
    assert.ok(neck.barreTall && neck.barreX > neck.capoX, 'a line across the strings, past the capo');
    assert.deepEqual(
      neck.dots.sort(),
      [['active', '6', '4', '1'], ['chord', '4', '6', ''], ['chord', '5', '6', ''], ['next', '3', '5', '']].sort(),
      'the barred strings carry no dots of their own; the 6th string picked at the capo + 1, its fret as written',
    );
    // Em: the open 6th string picked shows nothing - no 0, no dot at the nut
    await set(page, 'fb-guitar', 'default', { position: 4 });
    const em = await page.$$eval('#fb-guitar-neck .fretboard-neck-dot', (els) => els.map((d) => [d.getAttribute('data-role'), d.textContent]));
    assert.deepEqual(em.sort(), [['chord', ''], ['next', '']], `Em: its 4th string, the 5th coming next - nothing for the open string sounding ${JSON.stringify(em)}`);
    assert.equal(await page.$$eval('#fb-guitar-neck .fretboard-neck-barre', (els) => els.length), 0, 'no barre the data does not name');
    // upright: the capo across the strings
    const upright = await page.$eval('#fb-guitar-upright .fretboard-neck-capo', (e) => e.getBoundingClientRect().toJSON());
    assert.ok(upright.width > upright.height, 'upright: the capo lies across');
    // the chord charts: the capo as the bold bar with the strings behind it, F's barre dashed, a barre that cannot be is none
    const charts = await page.$$eval('#fb-guitar-chords .chord-chart, #fb-guitar-chords-upright .chord-chart', (figs) =>
      figs.map((fig) => {
        const grid = fig.querySelector('.chord-chart-grid')!;
        const barre = fig.querySelector('.chord-chart-barre');
        const box = barre?.getBoundingClientRect();
        const style = getComputedStyle(grid);
        return [
          fig.getAttribute('data-chord'),
          fig.getAttribute('data-orientation'),
          grid.getAttribute('data-capo'),
          getComputedStyle(grid, '::before').content !== 'none',
          fig.getAttribute('data-orientation') === 'vertical' ? style.borderTopWidth : style.borderLeftWidth,
          fig.querySelectorAll('.chord-chart-dot').length,
          [...fig.querySelectorAll('.chord-chart-mark')].map((m) => m.textContent).join(''),
          barre ? [box!.height > box!.width ? 'across the strings' : 'along a fret', getComputedStyle(barre).borderLeftStyle + getComputedStyle(barre).borderTopStyle] : null,
          grid.getAttribute('aria-label'),
        ];
      }),
    );
    assert.deepEqual(charts, [
      ['F', 'horizontal', '3', true, '4px', 3, '', ['across the strings', 'dashednone'], 'F: 1 3 3 2 1 1, barre at fret 1, capo 3'],
      ['Em', 'horizontal', '3', true, '4px', 2, '', null, 'Em: 0 2 2 0 0 0, capo 3'],
      ['C', 'horizontal', '3', true, '4px', 3, '×', null, 'C: x 3 2 0 1 0, capo 3'],
      ['F', 'vertical', '3', true, '4px', 3, '', ['along a fret', 'nonedashed'], 'F: 1 3 3 2 1 1, barre at fret 1, capo 3'],
      ['Em', 'vertical', '3', true, '4px', 2, '', null, 'Em: 0 2 2 0 0 0, capo 3'],
      ['C', 'vertical', '3', true, '4px', 3, '×', null, 'C: x 3 2 0 1 0, capo 3'],
    ]);
    // without the capo: the nut is the bold bar again
    await page.selectOption('#fb-guitar-score', 'open');
    await page.waitForFunction(() => document.querySelector('#fb-guitar-capo')?.textContent === '');
    const open = await page.$eval('#fb-guitar-neck', (el) => [el.hasAttribute('data-capo'), el.querySelectorAll('.fretboard-neck-capo').length, getComputedStyle(el.querySelector('.fretboard-neck-wires')!).borderLeftWidth]);
    assert.deepEqual(open, [false, 0, '4px']);
    assert.equal(await page.$$eval('#fb-guitar-chords .chord-chart-grid[data-capo]', (els) => els.length), 0);
    assert.equal(await page.$eval('#fb-guitar-chords [data-chord="F"] .chord-chart-grid', (e) => getComputedStyle(e, '::before').content), 'none');
    await page.selectOption('#fb-guitar-score', 'capo');
    await set(page, 'fb-guitar', 'default', { position: 0 });
  });

  await check('a song without scores draws nothing and cannot play', async () => {
    assert.equal(await page.$$eval('#fb-empty .fretboard-line', (els) => els.length), 0);
    await set(page, 'fb-empty', 'playing');
    assert.equal((await state(page, 'fb-empty')).name, 'default');
    assert.equal(await page.$eval('#fb-empty', (e) => e.getAttribute('data-state-name')), 'default');
  });

  await check('the API: load, data, seek, loop, active, stop', async () => {
    const song = await fb(page, 'data', '#fb-waltz');
    assert.equal(song.scores[0].id, 'waltz');
    await fb(page, 'seek', '#fb-waltz', 2, 2);
    assert.equal((await state(page, 'fb-waltz')).position, 4);
    await fb(page, 'load', '#fb-waltz', { version: 1, chords: { G: '0232' }, scores: [{ id: 'other', key: 'G', time: [3, 4], tracks: [{ id: 'c', kind: 'chords', items: [{ measure: 1, name: 'G' }, { measure: 3, name: 'G' }] }] }] });
    const s = await state(page, 'fb-waltz');
    assert.deepEqual([s.score, s.key, s.position], ['other', 'G', 6], 'the same share of the song: two of three measures, at a bar line');
    assert.equal(await page.$$eval('#fb-waltz .fretboard-measure', (els) => els.length), 3);
    assert.match(await text(page, '#fb-waltz script.fretboard-source'), /"other"/, 'the script holds the song (render)');
    assert.deepEqual(await fb(page, 'loop', '#fb-waltz', 2, 9), { start: 2, end: 3 }, 'clamped to the score');
    assert.deepEqual((await fb(page, 'active', '#fb-waltz', 0)).map((a: any) => a.text), ['G']);
    await fb(page, 'play', '#fb-waltz');
    assert.equal((await state(page, 'fb-waltz')).name, 'playing');
    await fb(page, 'pause', '#fb-waltz');
    assert.equal((await state(page, 'fb-waltz')).name, 'paused');
    await fb(page, 'stop', '#fb-waltz');
    const stopped = await state(page, 'fb-waltz');
    assert.deepEqual([stopped.name, stopped.position], ['default', 3], 'stop goes to the start of the loop');
  });

  await check('no page error', async () => {
    assert.deepEqual(errors, []);
  });

  await check('render(): the model is the authored markup; render(state) equals setState(state) on the live element', async () => {
    await assertRenderContract(page, '.fretboard[id]', ['default', 'playing', 'paused'], {
      runtimeOwned: '.fretboard-sheet, [data-fretboard-output], [data-fretboard-control]',
    });
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nfretboard.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('fretboard.e2e: all checks passed');
