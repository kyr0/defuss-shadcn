import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: the search box's promise is a clear (×) that exists only while there
 * is text and that clears through the same `input` event typing fires - so
 * a page filters with one listener. The filter's promise is CSS alone:
 * choosing a chip hides the rest and reveals a reset that brings them back.
 * These checks type, click, press Escape and reset through the real
 * controls on the real dist/ files, and drive every State API state.
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

try {
  const page = await browser.newPage({ viewport: { width: 900, height: 1400 } });
  page.on('pageerror', (e) => {
    failures++;
    console.error(`  ✗ page error: ${e.message}`);
  });
  await page.goto(`${server.url}/tests/e2e/search-filter.e2e-fixture.html`);
  await page.waitForSelector('#sb[data-init]');

  const display = (sel: string, pseudo?: string) =>
    page.$eval(sel, (e, p) => getComputedStyle(e, p || null).display, pseudo ?? '');
  const state = (sel: string) => page.$eval(sel, (e) => (e as HTMLElement).dataset.stateName);
  // a folded chip: hidden (out of focus / arrow keys) and no width
  const folded = (sel: string) =>
    page.$eval(sel, (e) => getComputedStyle(e).visibility === 'hidden' && e.getBoundingClientRect().width < 0.5);
  const value = (sel: string) => page.$eval(sel, (e) => (e as HTMLInputElement).value);

  await check('search-filter.js initialized every box: data-init, api, enterkeyhint, default / filled from the value', async () => {
    const r = await page.evaluate(() => ({
      init: document.querySelectorAll('.search-box[data-init]').length,
      total: document.querySelectorAll('.search-box').length,
      api: typeof (document.getElementById('sb') as any).api?.setState,
      hint: document.getElementById('sb-in')!.getAttribute('enterkeyhint'),
    }));
    assert.equal(r.init, r.total);
    assert.equal(r.api, 'function');
    assert.equal(r.hint, 'search');
    assert.equal(await state('#sb'), 'default');
    assert.equal(await state('#sb-filled'), 'filled', 'a preset value starts filled');
  });

  await check('a framed field: one border on the box, a bare input, native cancel button hidden', async () => {
    const r = await page.evaluate(() => {
      const b = getComputedStyle(document.getElementById('sb')!);
      const i = getComputedStyle(document.getElementById('sb-in')!);
      return { boxBorder: b.borderTopWidth, h: b.height, inBorder: i.borderTopWidth, inBg: i.backgroundColor };
    });
    assert.deepEqual(r, { boxBorder: '1px', h: '36px', inBorder: '0px', inBg: 'rgba(0, 0, 0, 0)' });
  });

  await check('the × is hidden while empty and appears once there is text (filled)', async () => {
    assert.equal(await display('#sb-x'), 'none');
    await page.click('#sb-in');
    await page.keyboard.type('report');
    assert.equal(await state('#sb'), 'filled');
    assert.equal(await display('#sb-x'), 'block');
  });

  await check('clicking × empties the field, keeps focus, fires input and search-clear → default', async () => {
    await page.evaluate(() => {
      (globalThis as any).__ev = [];
      document.getElementById('sb-in')!.addEventListener('input', () => (globalThis as any).__ev.push('input'));
      document.getElementById('sb')!.addEventListener('search-clear', () => (globalThis as any).__ev.push('search-clear'));
    });
    await page.click('#sb-x');
    assert.equal(await value('#sb-in'), '');
    assert.equal(await state('#sb'), 'default');
    assert.equal(await display('#sb-x'), 'none');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'sb-in');
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__ev), ['input', 'search-clear']);
  });

  await check('Escape clears a filled box first; inside a dialog the dialog closes only on the next Escape', async () => {
    await page.evaluate(() => (document.getElementById('dlg') as HTMLDialogElement).showModal());
    await page.click('#sb-dlg-in');
    await page.keyboard.type('abc');
    await page.keyboard.press('Escape');
    assert.equal(await value('#sb-dlg-in'), '');
    assert.equal(await page.$eval('#dlg', (d) => (d as HTMLDialogElement).open), true, 'dialog still open');
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#dlg', (d) => (d as HTMLDialogElement).open), false);
  });

  await check('setState: default clears (or presets), filled, searching = spinner + aria-busy; unknown throws', async () => {
    await page.evaluate(() => (document.getElementById('sb') as any).api.setState('searching', { value: 'q' }));
    assert.equal(await state('#sb'), 'searching');
    assert.equal(await value('#sb-in'), 'q');
    assert.equal(await display('#sb', '::before'), 'block', 'spinner');
    assert.equal(await display('#sb .search-box-icon'), 'none', 'icon gives way');
    assert.equal(await page.$eval('#sb-in', (e) => e.getAttribute('aria-busy')), 'true');
    // typing while searching keeps the state - the page ends it
    await page.click('#sb-in');
    await page.keyboard.type('x');
    assert.equal(await state('#sb'), 'searching');
    await page.evaluate(() => (document.getElementById('sb') as any).api.setState('filled'));
    assert.equal(await state('#sb'), 'filled');
    assert.equal(await page.$eval('#sb-in', (e) => e.hasAttribute('aria-busy')), false);
    assert.equal(await display('#sb', '::before'), 'none');
    await page.evaluate(() => (document.getElementById('sb') as any).api.setState('default', { value: 'preset' }));
    assert.equal(await value('#sb-in'), 'preset');
    await page.evaluate(() => (document.getElementById('sb') as any).api.setState('default'));
    assert.equal(await value('#sb-in'), '');
    assert.deepEqual(await page.evaluate(() => (document.getElementById('sb') as any).api.getState()), { name: 'default', config: {} });
    const threw = await page.evaluate(() => { try { (document.getElementById('sb') as any).api.setState('nope'); return false; } catch { return true; } });
    assert.equal(threw, true);
  });

  await check('a trailing kbd / hint shows while empty and gives way to the × when filled', async () => {
    assert.notEqual(await display('#sb-kbd-k'), 'none');
    await page.click('#sb-kbd-in');
    await page.keyboard.type('x');
    assert.equal(await display('#sb-kbd-k'), 'none');
    await page.evaluate(() => (document.getElementById('sb-muted') as any).api.setState('filled', { value: 'y' }));
    assert.equal(await display('#sb-hint'), 'none');
  });

  await check('variants and sizes: pill radius, muted surface, 32 / 36 / 44px, disabled and invalid frames', async () => {
    const r = await page.evaluate(() => {
      const g = (id: string) => getComputedStyle(document.getElementById(id)!);
      return {
        pill: parseFloat(g('sb-kbd').borderTopLeftRadius) > 100,
        muted: g('sb-muted').backgroundColor !== g('sb').backgroundColor && g('sb-muted').boxShadow === 'none',
        heights: [g('sb-sm').height, g('sb').height, g('sb-lg').height],
        disabled: g('sb-dis').backgroundColor !== g('sb').backgroundColor,
        invalid: g('sb-inv').borderTopColor !== g('sb').borderTopColor,
      };
    });
    assert.deepEqual(r, { pill: true, muted: true, heights: ['32px', '36px', '44px'], disabled: true, invalid: true });
  });

  await check('filter chips: labels drawn from aria-label; no reset until something is chosen', async () => {
    assert.equal(await page.$eval('#f-svelte', (e) => getComputedStyle(e, '::after').content), '"Svelte"');
    assert.equal(await folded('#f-reset'), true, '#f-reset folded');
    assert.equal(await page.$eval('#f-svelte', (e) => getComputedStyle(e).height), '32px');
  });

  await check('choosing a radio hides the others and reveals the reset; reset brings them back', async () => {
    await page.click('#f-vue');
    await page.waitForTimeout(400); // the fold glide
    assert.equal(await folded('#f-svelte'), true, '#f-svelte folded');
    assert.equal(await folded('#f-react'), true, '#f-react folded');
    assert.equal(await folded('#f-vue'), false, '#f-vue shown');
    assert.equal(await folded('#f-reset'), false, '#f-reset shown');
    const on = await page.$eval('#f-vue', (e) => getComputedStyle(e).backgroundColor);
    const off = await page.$eval('#m-kit', (e) => getComputedStyle(e).backgroundColor);
    assert.notEqual(on, off, 'the chosen chip is primary');
    await page.click('#f-reset');
    await page.waitForTimeout(400); // the fold glide
    assert.equal(await page.$eval('#f-vue', (e) => (e as HTMLInputElement).checked), false);
    assert.equal(await folded('#f-svelte'), false, '#f-svelte shown');
    assert.equal(await folded('#f-reset'), true, '#f-reset folded');
  });

  await check('without a form: the .filter-reset radio shows × once chosen, and checking it restores all', async () => {
    assert.equal(await folded('#m-all'), true, '#m-all folded');
    await page.click('#m-nuxt');
    await page.waitForTimeout(400); // the fold glide
    assert.equal(await folded('#m-kit'), true, '#m-kit folded');
    assert.equal(await folded('#m-all'), false, '#m-all shown');
    assert.equal(await page.$eval('#m-all', (e) => getComputedStyle(e, '::after').content), '"×"');
    await page.click('#m-all');
    await page.waitForTimeout(400); // the fold glide
    assert.equal(await folded('#m-kit'), false, '#m-kit shown');
    assert.equal(await folded('#m-all'), true, '#m-all folded');
  });

  await check('checkboxes collapse like radios; data-multiple keeps every chip and toggles several', async () => {
    await page.click('#c-svelte');
    await page.waitForTimeout(400); // the fold glide
    assert.equal(await folded('#c-vue'), true, '#c-vue folded');
    await page.click('#x-design');
    await page.click('#x-code');
    await page.waitForTimeout(400); // the fold glide
    assert.equal(await folded('#x-writing'), false, '#x-writing shown');
    assert.equal(await folded('#x-reset'), false, '#x-reset shown');
    assert.equal(await page.$$eval('#f-multi input:checked', (l) => l.length), 2);
    assert.ok(parseFloat(await page.$eval('#x-design', (e) => getComputedStyle(e).borderTopLeftRadius)) > 100, 'pill');
  });

  await check('no jump: the chosen chip only glides left, and the reset grows in AFTER it', async () => {
    await page.evaluate(() => (document.getElementById('f-form') as HTMLFormElement).reset());
    await page.waitForTimeout(400);
    const xs: number[] = [];
    await page.click('#f-react');
    for (let i = 0; i < 20; i++) {
      xs.push(await page.$eval('#f-react', (e) => e.getBoundingClientRect().x));
      await page.waitForTimeout(20);
    }
    const steps = xs.slice(1).map((x, i) => xs[i] - x);
    assert.ok(steps.every((s) => s >= -0.5), `never moves right: ${xs.map(Math.round)}`);
    const between = new Set(xs.map(Math.round).filter((x) => x < Math.round(xs[0]) && x > Math.round(xs[xs.length - 1])));
    assert.ok(between.size >= 3, `a glide through ${between.size} positions, not a jump: ${xs.map(Math.round)}`);
    const r = await page.evaluate(() => [document.getElementById('f-react')!.getBoundingClientRect().right, document.getElementById('f-reset')!.getBoundingClientRect().left]);
    assert.ok(r[1] > r[0], 'the × sits after the chosen chip');
    await page.click('#f-reset');
  });

  await check('checkbox chips draw a box (ticked when checked); radio chips do not', async () => {
    const r = await page.evaluate(() => {
      const b = (id: string) => getComputedStyle(document.getElementById(id)!, '::before');
      return {
        radio: b('f-svelte').content,
        box: [b('x-writing').content, b('x-writing').width, b('x-writing').borderTopStyle, b('x-writing').maskImage],
        ticked: [b('x-design').backgroundColor !== 'rgba(0, 0, 0, 0)', b('x-design').maskImage.includes('svg')],
      };
    });
    assert.equal(r.radio, 'none');
    assert.equal(r.box[0], '""');
    assert.ok(parseFloat(r.box[1]) > 8 && r.box[2] === 'solid' && r.box[3] === 'none', `unchecked box ${r.box}`);
    assert.deepEqual(r.ticked, [true, true]);
  });

  await check(':has() filters content with no script', async () => {
    await page.click('#k-code');
    assert.equal(await display('#i-design'), 'none');
    assert.notEqual(await display('#i-code'), 'none');
    await page.click('#k-all');
    assert.notEqual(await display('#i-design'), 'none');
  });

  await check('filter variants and sizes: secondary / outline chosen chips, sm 28px / lg 40px, disabled chip', async () => {
    const r = await page.evaluate(() => {
      const g = (id: string) => getComputedStyle(document.getElementById(id)!);
      return {
        sec: g('p-free').backgroundColor,
        prim: g('x-design').backgroundColor,
        outBg: g('o-open').backgroundColor,
        heights: [g('k-design').height, g('l-large').height],
        disabled: g('o-closed').opacity,
      };
    });
    assert.notEqual(r.sec, r.prim);
    assert.notEqual(r.outBg, r.prim, 'outline keeps the background');
    assert.deepEqual(r.heights, ['28px', '40px']);
    assert.equal(r.disabled, '0.5');
  });
} finally {
  await browser.close();
  server.stop?.();
}

if (failures) {
  console.error(`\nsearch-filter.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('search-filter.e2e: all checks passed');
