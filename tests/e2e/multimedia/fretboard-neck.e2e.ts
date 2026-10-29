import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

/**
 * Why: the Fretboard Neck promises the neck of any tuning from its markup - the strings and their names, the nut or a
 * capo's bold bar with the nut thin behind it, inlays and fret numbers up to its frets - and the fingers on it: a
 * shape faint (a barre only where the markup names one, × on a muted string), the notes sounding filled with their
 * fret, the next ones outlined, nothing on an open string; across or upright, for either hand, in string colours; a
 * description of what it shows; a State API and df$.shadcn.fretboardNeck.play() to set the fingers. This drives the
 * shipped files: every fixture configuration's fingers and their roles, the frets, the nut per orientation and hand,
 * the colours, the capo and the barre, the description, setState / getState, data written into the markup, invalid
 * notes, play() and the API example, and the render contract.
 */

const FIXTURE = '/tests/e2e/multimedia/fretboard-neck.e2e-fixture.html';
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
type State = { name: string; config: { shape: string; barre: number | null; notes: string; next: string; capo: number } };
const state = (page: Page, id: string): Promise<State> => page.$eval(`#${id}`, (el: any) => { const s = el.api.getState(); return { name: s.name, config: s.config }; });
const set = (page: Page, id: string, name: string, config: Record<string, unknown> = {}) =>
  page.$eval(`#${id}`, async (el: any, [n, c]) => { await el.api.setState(n, c); }, [name, config] as const);
const fn = (page: Page, f: string, ...args: unknown[]) =>
  page.evaluate(([n, a]) => (globalThis as any).df$.shadcn.fretboardNeck[n as string](...(a as unknown[])), [f, args] as const);
/** every finger as role:string/fret (its text) */
const dots = (page: Page, id: string) =>
  page.$$eval(`#${id} .fretboard-neck-dot`, (els) =>
    els.map((e) => `${e.getAttribute('data-role')}:${(e as HTMLElement).style.getPropertyValue('--fretboard-neck-s')}/${(e as HTMLElement).style.getPropertyValue('--fretboard-neck-f')}${e.textContent ? `=${e.textContent}` : ''}`).sort(),
  );
const desc = (page: Page, id: string) => page.$eval(`#${id} .fretboard-neck-desc`, (e) => e.textContent);

try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } });
  page.setDefaultTimeout(10_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${server.url}${FIXTURE}`);
  await page.waitForFunction(() => [...document.querySelectorAll('.fretboard-neck')].every((el: any) => el.api && el.querySelector('.fretboard-neck-board')));

  await check('the neck of its tuning: the strings and their names, the 1st on top; the frets up to the highest named + 2', async () => {
    const names = await page.$$eval('#fn-c .fretboard-neck-string-name', (els) => els.map((e) => `${e.getAttribute('data-string')}:${e.textContent}`));
    assert.deepEqual(names, ['4:G', '3:C', '2:E', '1:A']);
    const ys = await page.$$eval('#fn-c .fretboard-neck-string', (els) => Object.fromEntries(els.map((e) => [e.getAttribute('data-string'), Math.round(e.getBoundingClientRect().top)])));
    assert.ok(ys['1'] < ys['2'] && ys['2'] < ys['3'] && ys['3'] < ys['4'], `across: the 1st string on top ${JSON.stringify(ys)}`);
    assert.equal(await page.$eval('#fn-c .fretboard-neck-board', (e) => (e as HTMLElement).style.getPropertyValue('--fretboard-neck-frets')), '5');
    assert.deepEqual(await page.$$eval('#fn-c .fretboard-neck-fret-number', (els) => els.map((e) => e.textContent)), ['3', '5']);
    assert.deepEqual(await page.$eval('#fn-c .fretboard-neck-wires', (e) => [getComputedStyle(e).borderLeftWidth, getComputedStyle(e).borderRightWidth]), ['4px', '0px'], 'the left hand: the nut on the left');
    assert.equal(await page.$$eval('#fn-plain .fretboard-neck-string', (els) => els.length), 4, 'four strings without a tuning');
    assert.equal(await page.$$eval('#fn-plain .fretboard-neck-string-name', (els) => els.length), 0);
  });

  await check('the fingers: sounding filled with their fret, next outlined, the shape faint; nothing on an open string', async () => {
    assert.deepEqual(await dots(page, 'fn-c'), ['active:1/3=3'], 'the shape\'s one finger is the note sounding');
    assert.deepEqual(await dots(page, 'fn-next'), ['active:3/2=2', 'chord:1/2', 'next:2/3']);
    const look = await page.$$eval('#fn-next .fretboard-neck-dot', (els) => Object.fromEntries(els.map((e) => [e.getAttribute('data-role'), [getComputedStyle(e).borderTopStyle, getComputedStyle(e).backgroundColor]])));
    assert.equal(look.next[0], 'dashed');
    assert.notEqual(look.active[1], look.chord[1]);
    assert.deepEqual(await dots(page, 'fn-muted'), ['active:2/1=1', 'active:4/2=2', 'active:5/3=3', 'muted:6/0=×']);
    assert.equal(await page.$eval('#fn-muted .fretboard-neck-dot[data-role="muted"]', (e) => e.hasAttribute('data-nut')), true, '× at the nut');
  });

  await check('upright: the nut on top, the strings from the 4th on the left; the right hand mirrors across', async () => {
    const up = await page.$eval('#fn-upright', (el) => {
      const board = el.querySelector('.fretboard-neck-board')!.getBoundingClientRect();
      const xs = Object.fromEntries([...el.querySelectorAll('.fretboard-neck-string')].map((e) => [e.getAttribute('data-string'), Math.round(e.getBoundingClientRect().left)]));
      return { tall: board.height > board.width, nut: getComputedStyle(el.querySelector('.fretboard-neck-wires')!).borderTopWidth, xs };
    });
    assert.equal(up.tall, true);
    assert.equal(up.nut, '4px');
    assert.ok(up.xs['4'] < up.xs['1'], `the 4th string on the left ${JSON.stringify(up.xs)}`);
    assert.deepEqual(await page.$eval('#fn-right .fretboard-neck-wires', (e) => [getComputedStyle(e).borderLeftWidth, getComputedStyle(e).borderRightWidth]), ['0px', '4px'], 'the right hand: the nut on the right');
  });

  await check('string colours: each string and its dots in a chart colour', async () => {
    const strings = await page.$$eval('#fn-colors .fretboard-neck-string', (els) => new Set(els.map((e) => getComputedStyle(e).backgroundColor)).size);
    assert.equal(strings, 4);
    const fingers = await page.$$eval('#fn-colors .fretboard-neck-dot[data-role="active"]', (els) => new Set(els.map((e) => getComputedStyle(e).backgroundColor)).size);
    assert.equal(fingers, 3);
    assert.equal(await page.$$eval('#fn-c .fretboard-neck-string', (els) => new Set(els.map((e) => getComputedStyle(e).backgroundColor)).size), 1, 'one colour without data-colors');
  });

  await check('a capo: the bold bar on its fret wire, the nut thin behind it; the barre at the capo + its fret', async () => {
    const neck = await page.$eval('#fn-capo', (el) => {
      const x = (e: Element | null) => (e ? Math.round(e.getBoundingClientRect().left + e.getBoundingClientRect().width / 2) : -1);
      const barre = el.querySelector('.fretboard-neck-barre') as HTMLElement;
      return {
        nut: getComputedStyle(el.querySelector('.fretboard-neck-wires')!).borderLeftWidth,
        capoX: x(el.querySelector('.fretboard-neck-capo')),
        fret3: x(el.querySelector('.fretboard-neck-fret-number')),
        barre: [barre.style.getPropertyValue('--fretboard-neck-f'), barre.style.getPropertyValue('--fretboard-neck-s1'), barre.style.getPropertyValue('--fretboard-neck-s2')],
        frets: (el.querySelector('.fretboard-neck-board') as HTMLElement).style.getPropertyValue('--fretboard-neck-frets'),
      };
    });
    assert.equal(neck.nut, '2px');
    assert.ok(neck.capoX > neck.fret3, `the capo past the 3rd fret's middle ${JSON.stringify(neck)}`);
    assert.deepEqual(neck.barre, ['4', '1', '6']);
    assert.equal(neck.frets, '8', 'the capo + the highest fret + 2');
    assert.deepEqual(await dots(page, 'fn-capo'), ['active:6/4=1', 'chord:3/5', 'chord:4/6', 'chord:5/6'], 'the barred strings carry no dots of their own');
  });

  await check('data-frets: twelve frets, every inlay up to the double dot', async () => {
    assert.deepEqual(await page.$$eval('#fn-scale .fretboard-neck-fret-number', (els) => els.map((e) => e.textContent)), ['3', '5', '7', '10', '12']);
    assert.equal(await page.$$eval('#fn-scale .fretboard-neck-inlay[data-double]', (els) => els.length), 1);
    assert.equal((await dots(page, 'fn-scale')).length, 5);
  });

  await check('a picture with a description: role img, aria-describedby kept and extended, the words written on every change', async () => {
    assert.deepEqual(await page.$eval('#fn-c', (e) => [e.getAttribute('role'), e.querySelector('.fretboard-neck-board')!.getAttribute('aria-hidden')]), ['img', 'true']);
    assert.equal(await desc(page, 'fn-c'), 'G C E A neck; shape 0 0 0 3; sounding string 1 fret 3');
    assert.equal(await desc(page, 'fn-capo'), 'E A D G B e neck; capo 3; shape 1 3 3 2 1 1, barre at fret 1; sounding string 6 fret 1');
    assert.equal(await desc(page, 'fn-plain'), '4 strings');
    const by = await page.$eval('#fn-plain', (e) => e.getAttribute('aria-describedby')!.split(' '));
    assert.equal(by[0], 'fn-own-hint');
    assert.equal(await page.$eval(`#${by[1]}`, (e) => e.className), 'fretboard-neck-desc');
  });

  await check('setState: the fingers, merged into the config; getState reports them', async () => {
    assert.deepEqual(await state(page, 'fn-next'), { name: 'default', config: { shape: '0232', barre: null, notes: '3/2', next: '2/3', capo: 0 } });
    await set(page, 'fn-next', 'default', { notes: [{ string: 2, fret: 3 }], next: '1/2' });
    assert.deepEqual(await state(page, 'fn-next'), { name: 'default', config: { shape: '0232', barre: null, notes: '2/3', next: '1/2', capo: 0 } });
    assert.deepEqual(await dots(page, 'fn-next'), ['active:2/3=3', 'chord:3/2', 'next:1/2']);
    assert.equal(await desc(page, 'fn-next'), 'G C E A neck; shape 0 2 3 2; sounding string 2 fret 3; next string 1 fret 2');
    await set(page, 'fn-next', 'default', { capo: 2 });
    assert.ok((await dots(page, 'fn-next')).includes('active:2/5=3'), 'the frets count from the capo; a dot names its fret as written');
    await set(page, 'fn-next', 'default', { shape: '', notes: '', next: '', capo: 0 });
    assert.deepEqual(await dots(page, 'fn-next'), []);
    assert.deepEqual(await page.$eval('#fn-next', (e) => ['data-shape', 'data-notes', 'data-next', 'data-capo'].map((a) => e.hasAttribute(a))), [false, false, false, false]);
    await assert.rejects(set(page, 'fn-next', 'playing'));
  });

  await check('notes that do not exist are dropped: strings past the tuning are not drawn', async () => {
    await set(page, 'fn-plain', 'default', { notes: '9/2 1/30 x/1 2/1' });
    assert.equal((await state(page, 'fn-plain')).config.notes, '9/2 2/1');
    assert.deepEqual(await dots(page, 'fn-plain'), ['active:2/1=1']);
    await set(page, 'fn-plain', 'default', { notes: '' });
  });

  await check('data written into the markup draws the neck again and is reported', async () => {
    await page.$eval('#fn-upright', (e) => e.setAttribute('data-capo', '2'));
    await page.waitForFunction(() => !!document.querySelector('#fn-upright .fretboard-neck-capo'));
    assert.equal((await state(page, 'fn-upright')).config.capo, 2);
    await page.$eval('#fn-upright', (e) => e.setAttribute('data-tuning', 'D G B E'));
    await page.waitForFunction(() => document.querySelector('#fn-upright .fretboard-neck-string-name')?.textContent === 'D');
    await page.$eval('#fn-upright', (e) => { e.removeAttribute('data-capo'); e.setAttribute('data-tuning', 'G C E A'); });
  });

  await check('df$.shadcn.fretboardNeck.play(): the notes sounding with a shape and the next ones', async () => {
    assert.deepEqual(await fn(page, 'play', '#fn-play', '3/2 2/3 1/2', { shape: '0232' }), [{ string: 3, fret: 2 }, { string: 2, fret: 3 }, { string: 1, fret: 2 }]);
    assert.deepEqual(await dots(page, 'fn-play'), ['active:1/2=2', 'active:2/3=3', 'active:3/2=2']);
    assert.deepEqual(await fn(page, 'play', '#fn-play', []), []);
    assert.deepEqual(await dots(page, 'fn-play'), ['chord:1/2', 'chord:2/3', 'chord:3/2'], 'the shape stays');
    assert.deepEqual(await fn(page, 'play', '#nothing', '1/1'), []);
  });

  await check('the API example: Strum plays the chord, Pick walks its strings with the next one outlined', async () => {
    await page.selectOption('#fn-play-chord', '0003');
    await page.click('#fn-play-strum');
    assert.deepEqual(await dots(page, 'fn-play'), ['active:1/3=3']);
    await page.selectOption('#fn-play-chord', '0232');
    await page.click('#fn-play-pick');
    assert.deepEqual(await dots(page, 'fn-play'), ['chord:1/2', 'chord:2/3', 'next:3/2'], 'the open 4th string picked shows nothing, the 3rd next');
    await page.click('#fn-play-pick');
    assert.deepEqual(await dots(page, 'fn-play'), ['active:3/2=2', 'chord:1/2', 'next:2/3']);
  });

  await check('no page error', async () => {
    assert.deepEqual(errors, []);
  });

  await check('render(): the model is the authored markup; render(state) equals setState(state) on the live element', async () => {
    await assertRenderContract(page, '.fretboard-neck[id]', ['default'], { runtimeOwned: '.fretboard-neck-board, .fretboard-neck-desc' });
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nfretboard-neck.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('fretboard-neck.e2e: all checks passed');
