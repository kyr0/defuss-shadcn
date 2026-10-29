import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

/**
 * Why: the Chord Chart promises one chord diagram from its markup - a dot where a finger goes, nothing on an open
 * string, × on a muted one, a barre only where the markup names one and the shape can hold it, a capo's bold bar with
 * the strings behind it, the first fret's number higher up the neck - across or upright, for either hand, in string
 * colours, and an active state; its State API and df$.shadcn.chordChart set the chord. This drives the shipped files:
 * every fixture configuration's grid and label, where the dots sit, the nut per orientation and hand, the string
 * colours, setState / getState, a shape written into the markup, a chart its parent morphs, the API, the chord library
 * and the render contract.
 */

const FIXTURE = '/tests/e2e/multimedia/chord-chart.e2e-fixture.html';
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
type State = { name: string; config: { name: string; shape: string; barre: number | null; capo: number } };
const state = (page: Page, id: string): Promise<State> => page.$eval(`#${id}`, (el: any) => { const s = el.api.getState(); return { name: s.name, config: s.config }; });
const set = (page: Page, id: string, name: string, config: Record<string, unknown> = {}) =>
  page.$eval(`#${id}`, async (el: any, [n, c]) => { await el.api.setState(n, c); }, [name, config] as const);
const cc = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([f, a]) => (globalThis as any).df$.shadcn.chordChart[f as string](...(a as unknown[])), [fn, args] as const);
const label = (page: Page, id: string) => page.$eval(`#${id} .chord-chart-grid`, (e) => e.getAttribute('aria-label'));
/** the first dot's place in the grid, as a share of its box; the grid's nut borders */
const look = (page: Page, id: string) =>
  page.$eval(`#${id}`, (fig) => {
    const grid = fig.querySelector('.chord-chart-grid')!;
    const box = grid.getBoundingClientRect();
    const style = getComputedStyle(grid);
    const dot = fig.querySelector('.chord-chart-dot')!.getBoundingClientRect();
    const share = (v: number) => Math.round(v * 10) / 10;
    return {
      across: box.width > box.height,
      nut: [style.borderLeftWidth, style.borderRightWidth, style.borderTopWidth],
      x: share((dot.left + dot.width / 2 - box.left) / box.width),
      y: share((dot.top + dot.height / 2 - box.top) / box.height),
    };
  });

try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
  page.setDefaultTimeout(10_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${server.url}${FIXTURE}`);
  await page.waitForFunction(() => [...document.querySelectorAll('.chord-chart')].every((el: any) => el.api && el.querySelector('.chord-chart-grid')));

  await check('every chart draws its grid after the caption, read as one picture', async () => {
    const r = await page.$$eval('.chord-chart', (els) => els.map((e) => [e.id, e.children[1]?.className, e.children[1]?.getAttribute('role'), e.children[1]?.getAttribute('aria-label')]));
    assert.deepEqual(r, [
      ['cc-c', 'chord-chart-grid', 'img', 'C: 0 0 0 3'],
      ['cc-g7', 'chord-chart-grid', 'img', 'G7: 0 2 1 2'],
      ['cc-am', 'chord-chart-grid', 'img', 'Am: 2 0 0 0'],
      ['cc-g', 'chord-chart-grid', 'img', 'G: 0 2 3 2'],
      ['cc-guitar', 'chord-chart-grid', 'img', 'C: x 3 2 0 1 0'],
      ['cc-f', 'chord-chart-grid', 'img', 'F: 1 3 3 2 1 1, barre at fret 1'],
      ['cc-d', 'chord-chart-grid', 'img', 'D: x 5 7 7 7 5, barre at fret 5'],
      ['cc-capo', 'chord-chart-grid', 'img', 'G: 3 2 0 0 0 3, capo 2'],
      ['cc-active', 'chord-chart-grid', 'img', 'F: 2 0 1 0'],
      ['cc-no-barre', 'chord-chart-grid', 'img', 'C: 0 0 0 3'],
      ['cc-library', 'chord-chart-grid', 'img', 'C: 0 0 0 3'],
      ['cc-morphed', 'chord-chart-grid', 'img', 'F: 2 0 1 0'],
    ]);
  });

  await check('across for the left hand: the nut on the left, the 3rd fret to its right, the 1st string on top; nothing on an open string', async () => {
    assert.deepEqual(await look(page, 'cc-c'), { across: true, nut: ['3px', '0px', '0px'], x: 0.6, y: 0 });
    assert.equal(await page.$$eval('#cc-c .chord-chart-dot', (els) => els.length), 1);
    assert.equal(await page.$$eval('#cc-c .chord-chart-mark', (els) => els.length), 0);
    assert.equal(await page.$eval('#cc-c .chord-chart-grid', (e) => (e as HTMLElement).style.getPropertyValue('--chord-chart-strings')), '4');
  });

  await check('upright: the nut on top, the strings from the 4th on the left; the right hand mirrors across', async () => {
    const g7 = await page.$eval('#cc-g7', (fig) => {
      const grid = fig.querySelector('.chord-chart-grid')!.getBoundingClientRect();
      const dots = [...fig.querySelectorAll('.chord-chart-dot')].map((d) => [d.getAttribute('data-string'), Math.round(d.getBoundingClientRect().left)] as const);
      return { tall: grid.height > grid.width, top: getComputedStyle(fig.querySelector('.chord-chart-grid')!).borderTopWidth, dots: Object.fromEntries(dots) };
    });
    assert.equal(g7.tall, true);
    assert.equal(g7.top, '3px');
    assert.ok(g7.dots['3'] < g7.dots['2'] && g7.dots['2'] < g7.dots['1'], `the 3rd string left of the 1st ${JSON.stringify(g7.dots)}`);
    assert.deepEqual(await look(page, 'cc-am'), { across: true, nut: ['0px', '3px', '0px'], x: 0.6, y: 1 }, 'Am: the 4th string at the 2nd fret, the nut on the right');
  });

  await check('string colours: string n in chart colour n', async () => {
    const colors = await page.$$eval('#cc-g .chord-chart-dot', (els) => els.map((e) => [e.getAttribute('data-string'), getComputedStyle(e).backgroundColor]));
    assert.deepEqual(colors.map((c) => c[0]), ['3', '2', '1']);
    assert.equal(new Set(colors.map((c) => c[1])).size, 3, 'three strings, three colours');
    const plain = await page.$$eval('#cc-guitar .chord-chart-dot', (els) => new Set(els.map((e) => getComputedStyle(e).backgroundColor)).size);
    assert.equal(plain, 1, 'one colour without data-colors');
  });

  await check('a muted string: an × before the nut; a barre: one dashed line, no dots of their own on the barred strings', async () => {
    const marks = await page.$$eval('#cc-guitar .chord-chart-mark', (els) => els.map((e) => [e.getAttribute('data-string'), e.textContent]));
    assert.deepEqual(marks, [['6', '×']]);
    const f = await page.$eval('#cc-f', (fig) => {
      const barre = fig.querySelector('.chord-chart-barre')!;
      const box = barre.getBoundingClientRect();
      return { dots: fig.querySelectorAll('.chord-chart-dot').length, along: box.width > box.height, style: getComputedStyle(barre).borderTopStyle };
    });
    assert.deepEqual(f, { dots: 3, along: true, style: 'dashed' }, 'upright: the barre lies along the fret');
    assert.equal(await page.$$eval('#cc-no-barre .chord-chart-barre', (els) => els.length), 0, 'one string at the fret is no barre');
  });

  await check('higher up the neck: drawn from its lowest fret, its number named; a capo: the bold bar with the strings behind it', async () => {
    const d = await page.$eval('#cc-d .chord-chart-grid', (e) => [e.getAttribute('data-base'), getComputedStyle(e, '::after').content, (e as HTMLElement).style.getPropertyValue('--chord-chart-frets')]);
    assert.deepEqual(d, ['5', '"5fr"', '4']);
    const capo = await page.$eval('#cc-capo .chord-chart-grid', (e) => [e.getAttribute('data-capo'), getComputedStyle(e, '::before').content !== 'none', getComputedStyle(e).borderTopWidth]);
    assert.deepEqual(capo, ['2', true, '4px']);
    assert.equal(await page.$eval('#cc-c .chord-chart-grid', (e) => getComputedStyle(e, '::before').content), 'none');
  });

  await check('active: the frame and the caption in the primary colour', async () => {
    assert.equal((await state(page, 'cc-active')).name, 'active');
    const paint = (id: string) => page.$eval(`#${id}`, (e) => [getComputedStyle(e).borderTopColor, getComputedStyle(e.querySelector('figcaption')!).color]);
    const [on, off] = [await paint('cc-active'), await paint('cc-c')];
    assert.notDeepEqual(on, off);
    assert.equal(off[0], 'rgba(0, 0, 0, 0)', 'at rest the frame is transparent');
  });

  await check('setState: the chord and the state; the chord is merged, a state change keeps it', async () => {
    await set(page, 'cc-c', 'active', { name: 'Am', shape: '2000' });
    assert.deepEqual(await state(page, 'cc-c'), { name: 'active', config: { name: 'Am', shape: '2000', barre: null, capo: 0 } });
    assert.equal(await page.$eval('#cc-c figcaption', (e) => e.textContent), 'Am');
    assert.equal(await label(page, 'cc-c'), 'Am: 2 0 0 0');
    assert.equal(await page.$eval('#cc-c', (e) => e.hasAttribute('data-active')), true);
    await set(page, 'cc-c', 'default');
    assert.deepEqual(await state(page, 'cc-c'), { name: 'default', config: { name: 'Am', shape: '2000', barre: null, capo: 0 } });
    await set(page, 'cc-c', 'default', { capo: 3, shape: 'x 10 12 12 12 10' });
    assert.equal(await page.$eval('#cc-c', (e) => e.getAttribute('data-shape')), 'x 10 12 12 12 10');
    assert.equal(await label(page, 'cc-c'), 'Am: x 10 12 12 12 10, capo 3');
    assert.equal(await page.$eval('#cc-c .chord-chart-grid', (e) => [e.getAttribute('data-base'), e.hasAttribute('data-capo')].join()), '10,false', 'a capo with a shape higher up: the fret number, no bar');
    await set(page, 'cc-c', 'default', { name: 'C', shape: '0003', capo: 0 });
    assert.equal(await page.$eval('#cc-c', (e) => e.hasAttribute('data-capo')), false);
    await assert.rejects(set(page, 'cc-c', 'muted'));
  });

  await check('markup written into the chart is drawn again and reported', async () => {
    await page.$eval('#cc-g7', (e) => e.setAttribute('data-shape', '2220'));
    await page.waitForFunction(() => document.querySelector('#cc-g7 .chord-chart-grid')?.getAttribute('aria-label') === 'G7: 2 2 2 0');
    await page.$eval('#cc-g7 figcaption', (e) => { e.textContent = 'D'; });
    await page.waitForFunction(() => document.querySelector('#cc-g7 .chord-chart-grid')?.getAttribute('aria-label') === 'D: 2 2 2 0');
    assert.deepEqual((await state(page, 'cc-g7')).config, { name: 'D', shape: '2220', barre: null, capo: 0 });
    await page.$eval('#cc-active', (e) => e.removeAttribute('data-active'));
    await page.waitForFunction(() => (document.querySelector('#cc-active') as any).api.getState().name === 'default');
  });

  await check('a chart its parent morphs keeps its drawing', async () => {
    // the Fretboard writes its chords outlet again with df$().html(): the chart stays, its grid must come back
    await page.evaluate(() => (globalThis as any).df$('#cc-morph').html('<figure class="chord-chart" id="cc-morphed" data-shape="2010" data-hand="right"><figcaption>F</figcaption></figure>'));
    await page.waitForFunction(() => document.querySelector('#cc-morphed .chord-chart-grid')?.getAttribute('aria-label') === 'F: 2 0 1 0');
    assert.equal(await page.$eval('#cc-morphed', (e) => e.getAttribute('data-hand')), 'right');
  });

  await check('df$.shadcn.chordChart: chord() reads and sets, parse() reads a shape', async () => {
    assert.deepEqual(await cc(page, 'chord', '#cc-library'), { name: 'C', shape: '0003', barre: null, capo: 0 });
    assert.deepEqual(await cc(page, 'chord', '#cc-library', { name: 'Bb', shape: '3211', barre: 1 }), { name: 'Bb', shape: '3211', barre: 1, capo: 0 });
    assert.equal(await label(page, 'cc-library'), 'Bb: 3 2 1 1, barre at fret 1');
    assert.equal(await cc(page, 'chord', '#nothing'), null);
    assert.deepEqual(await cc(page, 'parse', 'x32010'), ['x', 3, 2, 0, 1, 0]);
    assert.deepEqual(await cc(page, 'parse', 'x 10 12 12 12 10'), ['x', 10, 12, 12, 12, 10]);
    assert.equal(await cc(page, 'parse', 'abc'), null);
    assert.equal(await cc(page, 'parse', ''), null);
  });

  await check('the chord library: the select shows another chord, the switch marks it sounding', async () => {
    await page.selectOption('#cc-library-chord', 'Am|2000');
    assert.equal(await label(page, 'cc-library'), 'Am: 2 0 0 0');
    assert.equal(await page.$$eval('#cc-library .chord-chart-barre', (els) => els.length), 0);
    await page.click('#cc-library-active');
    assert.equal((await state(page, 'cc-library')).name, 'active');
    await page.selectOption('#cc-library-chord', 'C|0003');
    assert.deepEqual(await state(page, 'cc-library'), { name: 'active', config: { name: 'C', shape: '0003', barre: null, capo: 0 } }, 'the next chord stays active');
  });

  await check('no page error', async () => {
    assert.deepEqual(errors, []);
  });

  await check('render(): the model is the authored markup; render(state) equals setState(state) on the live element', async () => {
    await assertRenderContract(page, '.chord-chart[id]', ['default', 'active'], { runtimeOwned: '.chord-chart-grid' });
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nchord-chart.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('chord-chart.e2e: all checks passed');
