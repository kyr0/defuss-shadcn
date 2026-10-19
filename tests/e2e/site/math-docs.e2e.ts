import assert from 'node:assert/strict';
import { chromium, type Frame, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { pageRel } from '../../../src/documentation/lib/page-dirs.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';

/**
 * Why: the Math pages show the three components where readers meet them - in
 * the docs' HTML Preview Editor, whose sandbox is an opaque-origin frame. That
 * is where a same-origin worker file cannot start, so the compute panel's
 * worker (started from a Blob) is proven HERE, with the real engine; the
 * overview's composed example (an editor driving a formula and a compute
 * panel), the renderer's linked table and exports, the editor's keyboard, a
 * recorded result that loads no engine, and the deadline ride along. The
 * pinned vendors are served from node_modules (offline, counted).
 */

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
const NOISE = /api\.github\.com|status of 403/;

/** Open a docs page and return one of its examples' sandbox, booted, with the vendor request log. */
async function open(slug: string, nth: number | string = 0): Promise<{ page: Page; frame: Frame; errors: string[]; requests: string[] }> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.setDefaultTimeout(20_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !NOISE.test(m.text())) errors.push(m.text());
  });
  const requests = await offlineJsdelivr(page);
  await page.goto(`${server.url}/dist/documentation/${pageRel(slug)}`, { waitUntil: 'load' });
  assert.equal(await page.locator('main h1').count(), 1, `${slug}: h1`);
  // by position, or by the card's label - a page leads with its individual examples, so positions move
  const card =
    typeof nth === 'number'
      ? page.locator('.code-example').nth(nth)
      : page.locator('.code-example').filter({ has: page.locator(':scope > p', { hasText: nth }) }).first();
  await card.scrollIntoViewIfNeeded();
  const frame = (await (await card.locator('iframe').first().elementHandle())!.contentFrame())!;
  await frame.waitForFunction(() => typeof (globalThis as any).df$ === 'function' && (globalThis as any).df$.shadcn?.mathRendererApi);
  // the examples' scripts attach on DOMContentLoaded, which waits for the preview's parser-blocking lucide script
  // (unpkg) - the components can be ready before it. VERIFIED: (tmp/probe-dcl.ts) lucide delayed 4 s: the editor was
  // ready while readyState was "loading", and the overview's compute panel missed the edit
  await frame.waitForFunction(() => document.readyState !== 'loading', undefined, { timeout: 20_000 });
  return { page, frame, errors, requests };
}

const typeset = (frame: Frame) =>
  frame.waitForFunction(() => [...document.querySelectorAll('.math-renderer')].every((f) => ['rendered', 'highlighted', 'error'].includes((f as HTMLElement).dataset.state ?? '')), undefined, { timeout: 15_000 });

try {
  await check('the sidebar lists the Math section: overview, Formula Rendering, Formula Editing, Compute & Explain', async () => {
    const page = await browser.newPage();
    await page.goto(`${server.url}/dist/documentation/${pageRel('math')}`, { waitUntil: 'load' });
    const files = await page.$$eval('.nav-link', (as) => as.map((a) => (a as HTMLAnchorElement).pathname.split('/').pop()));
    for (const id of ['math', 'math-renderer', 'math-editor', 'math-compute']) assert.equal(files.filter((f) => f === `${id}.html`).length, 1, id);
    await page.close();
  });

  await check('overview: the editor drives the formula and the compute panel; Compute runs the engine in a Blob worker inside the sandbox', async () => {
    const { page, frame, errors, requests } = await open('math');
    await frame.waitForFunction(() => document.querySelector('.math-editor[data-ready]'), undefined, { timeout: 15_000 });
    await frame.evaluate(() => (globalThis as any).df$.shadcn.mathEditor.setValue(document.getElementById('ov-editor')!, '\\frac{x^2-4}{x-2}'));
    await frame.waitForFunction(() => document.querySelector('#ov-formula annotation')?.textContent === '\\frac{x^2-4}{x-2}');
    const input = await frame.evaluate(() => (document.getElementById('ov-compute') as any).api.getState().config.latex);
    assert.equal(input, '\\frac{x^2-4}{x-2}');
    const workers: string[] = [];
    page.on('worker', (w) => workers.push(w.url()));
    await frame.click('#ov-compute [data-math-run]');
    await frame.waitForFunction(() => (document.getElementById('ov-compute') as HTMLElement).dataset.stateName === 'result', undefined, { timeout: 30_000 });
    const r = await frame.evaluate(() => {
      const c = (document.getElementById('ov-compute') as any).api.getState().config;
      return { result: c.result.result.latex, condition: c.result.conditions.map((k: any) => k.json) };
    });
    assert.deepEqual(r, { result: 'x+2', condition: [['NotEqual', ['Subtract', 'x', 2], 0]] });
    assert.ok(workers.some((u) => u.startsWith('blob:')), workers.join(', '));
    assert.ok(requests.some((u) => u.includes('compute-engine@0.149.0/dist/esm-min/compute-engine.js')));
    assert.deepEqual(errors, []);
    await page.close();
  });

  await check('Formula Rendering: every example typesets; a table row selects its term; export writes clean TeX; bad TeX shows an alert, \\href no link', async () => {
    const first = await open('math-renderer');
    await typeset(first.frame);
    assert.equal(await first.frame.locator('.math-renderer .katex-mathml math').count(), 1);
    await first.page.close();
    const terms = await open('math-renderer', 3);
    await typeset(terms.frame);
    await terms.frame.click('tr[data-math-term="m"]');
    const marked = await terms.frame.evaluate(() => [...document.querySelectorAll('#variance .katex-html [data-selected]')].map((n) => (n as HTMLElement).dataset.dfMathId));
    assert.deepEqual(marked, ['m']);
    await terms.page.close();
    const exp = await open('math-renderer', 4);
    await typeset(exp.frame);
    await exp.frame.click('[data-export="latex"]');
    await exp.frame.waitForFunction(() => document.getElementById('euler-out')!.textContent === 'e^{i\\pi} + 1 = 0');
    await exp.page.close();
    const bad = await open('math-renderer', 5);
    await typeset(bad.frame);
    const r = await bad.frame.evaluate(() => ({ alerts: [...document.querySelectorAll('.math-renderer-error')].map((o) => o.textContent!.slice(0, 18)), links: document.querySelectorAll('.math-renderer a').length }));
    assert.deepEqual(r, { alerts: ['KaTeX parse error:'], links: 0 });
    assert.deepEqual([...first.errors, ...terms.errors, ...exp.errors, ...bad.errors], []);
    await bad.page.close();
  });

  await check('Formula Editing: the editor loads in the sandbox; readonly and disabled start in their states; the keyboard opens in its editor', async () => {
    const states = await open('math-editor', 1);
    await states.frame.waitForFunction(() => document.querySelectorAll('.math-editor[data-ready]').length === 2, undefined, { timeout: 15_000 });
    assert.deepEqual(await states.frame.evaluate(() => [...document.querySelectorAll('.math-editor')].map((e) => (e as HTMLElement).dataset.stateName)), ['readonly', 'disabled']);
    await states.page.close();
    const kb = await open('math-editor', 2);
    await kb.frame.waitForFunction(() => document.querySelectorAll('.math-editor[data-ready]').length === 2, undefined, { timeout: 15_000 });
    await kb.frame.click('.math-editor:first-child [data-math-command="keyboard"]');
    await kb.frame.waitForFunction(() => !!document.querySelector('.math-editor:first-child .math-editor-keyboard .ML__keyboard'));
    assert.equal(await kb.frame.evaluate(() => (document.querySelector('.math-editor') as HTMLElement).dataset.stateName), 'keyboard-open');
    assert.deepEqual([...states.errors, ...kb.errors], []);
    await kb.page.close();
  });

  await check('Compute & Explain: the page loads no engine until Compute; a recorded result shows as recorded; the deadline stops 200000!', async () => {
    const rec = await open('math-compute', 'Differentiated once, shown without the engine');
    await rec.frame.waitForFunction(() => document.querySelector('.math-compute-recorded'));
    const recorded = await rec.frame.evaluate(() => ({ state: (document.querySelector('.math-compute') as HTMLElement).dataset.stateName, steps: document.querySelectorAll('.math-compute-step').length }));
    assert.deepEqual(recorded, { state: 'result', steps: 3 });
    assert.deepEqual(rec.requests.filter((u) => u.includes('compute-engine')), [], 'no engine for a recorded result');
    await rec.page.close();
    const slow = await open('math-compute', 'Stopped after half a second');
    await slow.frame.click('[data-math-run]');
    await slow.frame.waitForFunction(() => (document.querySelector('.math-compute') as HTMLElement).dataset.stateName === 'error', undefined, { timeout: 30_000 });
    assert.equal(await slow.frame.evaluate(() => document.querySelector('.math-compute-status')!.textContent), 'The computation took longer than 0.5 s and was stopped.');
    assert.deepEqual([...rec.errors, ...slow.errors], []);
    await slow.page.close();
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nmath-docs.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nmath-docs.e2e: all checks passed');
