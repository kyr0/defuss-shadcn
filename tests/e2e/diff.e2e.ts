import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: E2E smoke test for the shipped diff component. The fixture stacks a
 * red item 1 over a blue item 2 in every documented configuration (default,
 * text, line / primary variants, vertical, follow-hover, start position +
 * ratios, RTL); hit-testing a point tells which layer shows there, so the
 * clip, the drag surface, the keyboard and the named State API are checked
 * on the real dist/ files.
 */

const FIXTURE = '/tests/e2e/diff.e2e-fixture.html';
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

/** Which layer shows at (fx, fy) - fractions of the figure box. */
const layerAt = (page: Page, id: string, fx: number, fy = 0.08) =>
  page.evaluate(
    ([id, fx, fy]) => {
      document.getElementById(id as string)!.scrollIntoView({ block: "center" });
      const r = document.getElementById(id as string)!.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width * (fx as number), r.top + r.height * (fy as number));
      return hit?.closest('.diff-item-1') ? 'a' : hit?.closest('.diff-item-2') ? 'b' : String(hit?.className);
    },
    [id, fx, fy],
  );
const pos = (page: Page, id: string) =>
  page.$eval(`#${id}`, (el) => parseFloat((el as HTMLElement).style.getPropertyValue('--diff-pos')));
const at = async (page: Page, id: string, fx: number, fy = 0.08) => {
  await page.$eval(`#${id}`, (el) => el.scrollIntoView({ block: "center" }));
  const r = (await page.locator(`#${id}`).boundingBox())!;
  return { x: r.x + r.width * fx, y: r.y + r.height * fy };
};

try {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  await page.goto(`${server.url}${FIXTURE}`);

  await check('diff.js initialized every figure and painted --diff-pos from the range', async () => {
    await page.waitForFunction(() => document.querySelectorAll('.diff:not([data-init])').length === 0);
    assert.equal(await pos(page, 'd-default'), 50);
    assert.equal(await pos(page, 'd-start'), 25);
    assert.equal(await pos(page, 'd-vertical'), 40);
  });

  await check('item 1 shows left of the divider, item 2 right of it', async () => {
    assert.equal(await layerAt(page, 'd-default', 0.25), 'a');
    assert.equal(await layerAt(page, 'd-default', 0.75), 'b');
    assert.equal(await layerAt(page, 'd-start', 0.12), 'a');
    assert.equal(await layerAt(page, 'd-start', 0.4), 'b');
  });

  await check('ratios size the figure; text content sizes it itself', async () => {
    const r = await page.evaluate(() => {
      const box = (id: string) => document.getElementById(id)!.getBoundingClientRect();
      return { d: box('d-default'), sq: box('d-primary'), v: box('d-vertical'), s: box('d-start'), t: box('d-text') };
    });
    assert.ok(Math.abs(r.d.width / r.d.height - 16 / 9) < 0.02, `16/9 (${r.d.width}x${r.d.height})`);
    assert.ok(Math.abs(r.sq.width - r.sq.height) < 1, '1/1');
    assert.ok(Math.abs(r.v.width / r.v.height - 3 / 4) < 0.02, '3/4');
    assert.ok(Math.abs(r.s.width / r.s.height - 4 / 3) < 0.02, '4/3');
    assert.ok(r.t.height > 60, `text figure has its content height (${r.t.height})`);
  });

  await check('the divider line sits on --diff-pos; the knob is centered on it', async () => {
    const r = await page.evaluate(() => {
      const el = document.getElementById('d-default')!;
      const box = el.getBoundingClientRect();
      const line = getComputedStyle(el, '::after');
      const range = el.querySelector('.diff-range')!.getBoundingClientRect();
      return { left: parseFloat(line.left), w: box.width, rangeCenter: range.left + range.width / 2 - box.left, rangeMidY: range.top + range.height / 2 - box.top, h: box.height };
    });
    assert.ok(Math.abs(r.left - r.w / 2) < 0.5, `line at 50% (${r.left} of ${r.w})`);
    // the range is widened by one knob on both sides: value 50 = the figure's center
    assert.ok(Math.abs(r.rangeCenter - r.w / 2) < 0.5, 'range centered on the figure');
    assert.ok(Math.abs(r.rangeMidY - r.h / 2) < 0.5, 'knob strip vertically centered');
  });

  await check('drag anywhere: press at 20%, move to 80%', async () => {
    const a = await at(page, 'd-default', 0.2);
    const b = await at(page, 'd-default', 0.8);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    assert.ok(Math.abs((await pos(page, 'd-default')) - 20) < 0.5, 'press jumps to 20%');
    await page.mouse.move(b.x, b.y, { steps: 6 });
    await page.mouse.up();
    assert.ok(Math.abs((await pos(page, 'd-default')) - 80) < 0.5, 'drag reaches 80%');
    assert.equal(await layerAt(page, 'd-default', 0.7), 'a');
    const focused = await page.evaluate(() => document.activeElement?.closest('#d-default') !== null);
    assert.ok(focused, 'the range takes focus, so keys continue from there');
  });

  await check('keyboard: arrows step 1%, Shift+arrow / Page keys 10%, Home / End the ends; input fires', async () => {
    await page.$eval('#d-default', (el) => {
      (globalThis as unknown as { __inputs: number }).__inputs = 0;
      el.querySelector('.diff-range')!.addEventListener('input', () => (globalThis as unknown as { __inputs: number }).__inputs++);
    });
    await page.focus('#d-default .diff-range');
    const start = await pos(page, 'd-default');
    await page.keyboard.press('ArrowLeft');
    assert.ok(Math.abs((await pos(page, 'd-default')) - (start - 1)) < 0.01, 'ArrowLeft -1');
    await page.keyboard.press('Shift+ArrowLeft');
    assert.ok(Math.abs((await pos(page, 'd-default')) - (start - 11)) < 0.01, 'Shift+ArrowLeft -10');
    await page.keyboard.press('PageUp');
    assert.ok(Math.abs((await pos(page, 'd-default')) - (start - 1)) < 0.01, 'PageUp +10');
    await page.keyboard.press('Home');
    assert.equal(await pos(page, 'd-default'), 0, 'Home: only item 2');
    await page.keyboard.press('End');
    assert.equal(await pos(page, 'd-default'), 100, 'End: only item 1');
    assert.ok((await page.evaluate(() => (globalThis as unknown as { __inputs: number }).__inputs)) >= 3, 'native input events fire');
  });

  await check('follow-hover: a mouse moving over the figure drags the divider without a press', async () => {
    const p = await at(page, 'd-hover', 0.3);
    await page.mouse.move(p.x, p.y, { steps: 3 });
    assert.ok(Math.abs((await pos(page, 'd-hover')) - 30) < 0.5, `follows to 30% (${await pos(page, 'd-hover')})`);
    // a plain figure does not follow
    const before = await pos(page, 'd-start');
    const q = await at(page, 'd-start', 0.8);
    await page.mouse.move(q.x, q.y, { steps: 3 });
    assert.equal(await pos(page, 'd-start'), before);
  });

  await check('vertical: item 1 above the divider; drag and ArrowDown move it down', async () => {
    assert.equal(await layerAt(page, 'd-vertical', 0.2, 0.2), 'a');
    assert.equal(await layerAt(page, 'd-vertical', 0.2, 0.7), 'b');
    const line = await page.$eval('#d-vertical', (el) => parseFloat(getComputedStyle(el, '::after').top) / el.getBoundingClientRect().height);
    assert.ok(Math.abs(line - 0.4) < 0.01, `line at 40% height (${line})`);
    await page.focus('#d-vertical .diff-range');
    await page.keyboard.press('ArrowDown');
    assert.ok(Math.abs((await pos(page, 'd-vertical')) - 41) < 0.01, 'ArrowDown +1 (down)');
    const a = await at(page, 'd-vertical', 0.2, 0.1);
    const b = await at(page, 'd-vertical', 0.2, 0.75);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 5 });
    await page.mouse.up();
    assert.ok(Math.abs((await pos(page, 'd-vertical')) - 75) < 0.5, 'drag down to 75%');
  });

  await check('RTL: item 1 is revealed from the right edge', async () => {
    assert.equal(await layerAt(page, 'd-rtl', 0.9), 'a');
    assert.equal(await layerAt(page, 'd-rtl', 0.5), 'b');
    const p = await at(page, 'd-rtl', 0.3);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.up();
    assert.ok(Math.abs((await pos(page, 'd-rtl')) - 70) < 0.5, `press at 30% from the left = 70% (${await pos(page, 'd-rtl')})`);
  });

  await check('variants: primary divider in --primary, line divider 3px', async () => {
    const r = await page.evaluate(() => {
      const probe = document.createElement('i');
      probe.style.color = 'var(--primary)';
      document.body.append(probe);
      const primary = getComputedStyle(probe).color;
      probe.remove();
      return {
        primary,
        primaryLine: getComputedStyle(document.getElementById('d-primary')!, '::after').backgroundColor,
        lineW: getComputedStyle(document.getElementById('d-line')!, '::after').width,
        defW: getComputedStyle(document.getElementById('d-start')!, '::after').width,
      };
    });
    assert.equal(r.primaryLine, r.primary);
    assert.equal(r.lineW, '3px');
    assert.equal(r.defW, '2px');
  });

  await check('labels: item 1 top-left, item 2 top-right (vertical: bottom-left)', async () => {
    const r = await page.evaluate(() => {
      const rel = (sel: string, fig: string) => {
        const f = document.getElementById(fig)!.getBoundingClientRect();
        const b = document.querySelector(`#${fig} ${sel} .diff-label`)!.getBoundingClientRect();
        return { l: Math.round(b.left - f.left), r: Math.round(f.right - b.right), t: Math.round(b.top - f.top), b: Math.round(f.bottom - b.bottom) };
      };
      return { a: rel('.diff-item-1', 'd-default'), b: rel('.diff-item-2', 'd-default'), vb: rel('.diff-item-2', 'd-vertical') };
    });
    assert.equal(r.a.l, 12); assert.equal(r.a.t, 12);
    assert.equal(r.b.r, 12); assert.equal(r.b.t, 12);
    assert.equal(r.vb.l, 12); assert.equal(r.vb.b, 12);
  });

  await check("state API: setState('before') / 'after' reveal one side; getState reflects it", async () => {
    const r = await page.$eval('#d-start', (el) => {
      const api = (el as HTMLElement & { api: { setState(n: string, c?: object): void; getState(): { name: string; config: { position: number } } } }).api;
      api.setState('before');
      const b = api.getState();
      api.setState('after');
      const a = api.getState();
      return { b, a };
    });
    assert.equal(r.b.name, 'before'); assert.equal(r.b.config.position, 100);
    assert.equal(r.a.name, 'after'); assert.equal(r.a.config.position, 0);
    assert.equal(await layerAt(page, 'd-start', 0.05), 'b');
  });

  await check("state API: setState('default') restores the authored position; { position } presets it", async () => {
    const r = await page.$eval('#d-start', (el) => {
      const api = (el as HTMLElement & { api: { setState(n: string, c?: object): void; getState(): { name: string; config: { position: number } } } }).api;
      api.setState('default');
      const restored = api.getState();
      api.setState('default', { position: 60 });
      return { restored, preset: api.getState(), value: (el.querySelector('.diff-range') as HTMLInputElement).value };
    });
    assert.equal(r.restored.config.position, 25);
    assert.equal(r.preset.name, 'default');
    assert.equal(r.preset.config.position, 60);
    assert.equal(r.value, '60', 'the range value follows (it is the source of truth)');
    assert.equal(await layerAt(page, 'd-start', 0.55), 'a');
  });

  await check('state API: unknown state names throw; registry globals', async () => {
    const r = await page.evaluate(() => {
      let err = '';
      try {
        (document.getElementById('d-start') as HTMLElement & { api: { setState(n: string): void } }).api.setState('nope');
      } catch (e) {
        err = String(e);
      }
      const g = globalThis as unknown as { df$: { shadcn: { diffApi?: { setState: unknown }; diffStates?: string[] } } };
      return { err, api: typeof g.df$?.shadcn?.diffApi?.setState, states: g.df$?.shadcn?.diffStates };
    });
    assert.ok(r.err.includes('unknown state'), r.err);
    assert.equal(r.api, 'function');
    assert.deepEqual(r.states, ['default', 'before', 'after']);
  });
  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await assertRenderContract(page, '.diff[id]', ['default','before','after'], { runtimeAttrs: ['style'] });
  });

} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\ndiff.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('diff.e2e: all checks passed');
