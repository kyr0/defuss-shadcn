import assert from 'node:assert/strict';
import { chromium, type BrowserContext, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { offlineJsdelivr, offlineModels } from '../lib/vendor-offline.ts';

/**
 * Why: the docs search (runtime/docs-search.ts + its worker, runtime/search-worker.ts) is the header palette every
 * page carries. Proven here on the built site, in a real browser, with the pinned vendors and the model served
 * offline from node_modules and .cache/models (counted):
 * - after the page has loaded, the worker loads both lanes by itself - the documents, the token index, ONNX Runtime's
 *   WASM and the four model files - and the status line says which search answers;
 * - a typed query is answered by the worker's ranking, the palette in `data-filter="none"`, the first hit
 *   highlighted; Enter opens it; an empty query brings the page list back;
 * - a German question finds the English page by meaning, and defuss-lid names its language;
 * - a second visit downloads nothing but the manifest: every file comes from the Cache API;
 * - with the data saver on only the keyword lane starts, and the status line's button adds the semantic one.
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
const PAGE = '/dist/documentation/overlays/dialog.html';

interface Session {
  context: BrowserContext;
  page: Page;
  errors: string[];
  vendors: string[];
  models: string[];
  files: string[];
}
async function session(init?: () => void): Promise<Session> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !NOISE.test(m.text())) errors.push(m.text());
  });
  const vendors = await offlineJsdelivr(page);
  const models = await offlineModels(page);
  // the worker's own requests reach the context, not the page
  const files: string[] = [];
  context.on('request', (r) => {
    if (/\/documentation\/search\//.test(r.url())) files.push(r.url().replace(/^.*\/documentation\//, ''));
  });
  context.on('requestfailed', (r) => errors.push(`request failed: ${r.url()} ${r.failure()?.errorText}`));
  return { context, page, errors, vendors, models, files };
}
const lanes = (page: Page, lexical: string, semantic: string) =>
  page.waitForFunction(
    ([l, s]) => {
      const status = document.getElementById('docs-palette-status');
      return status?.dataset.lexical === l && status.dataset.semantic === s;
    },
    [lexical, semantic],
    { timeout: 60_000 },
  );
const hits = (page: Page) => page.$$eval('#docs-palette-list .command-item:not([hidden])', (els) => els.map((el) => (el as HTMLElement).dataset.href));
/** opens the palette - closed first, so a check that failed with it open does not take the next one along */
async function openPalette(page: Page): Promise<void> {
  await page.evaluate(() => (document.getElementById('docs-palette') as HTMLDialogElement).close());
  await page.click('.header-search');
}
/** types a query and waits until the worker's hits answer it */
async function search(page: Page, query: string, first: string): Promise<void> {
  await page.fill('#docs-palette .command-input', query);
  await page.waitForFunction((href) => document.querySelector<HTMLElement>('#docs-palette-list [data-docs-results] .command-item')?.dataset.href === href, first, { timeout: 15_000 });
}

try {
  const s = await session();
  const { page } = s;

  await check('after the load event the worker loads both lanes by itself; the status line says which search answers', async () => {
    await page.goto(`${server.url}${PAGE}`, { waitUntil: 'load' });
    await lanes(page, 'ready', 'ready');
    assert.equal(await page.textContent('#docs-palette-status .docs-search-mode'), 'Keyword + semantic search');
    assert.deepEqual(
      s.models.map((u) => u.replace(/^.*\//, '')).sort(),
      ['model_q8.onnx.br', 'runtime.json.br', 'tokenizer.json.br', 'tokenizer_config.json.br'],
      'the four model files of the pinned release, as Brotli',
    );
    assert.ok(s.vendors.some((u) => u.endsWith('/ort-wasm-simd-threaded.wasm')), 'ONNX Runtime WASM (the single-thread build)');
    assert.ok(s.vendors.some((u) => u.endsWith('/decompressor.wasm')), "defuss-brotli's decoder");
    assert.deepEqual(s.files.map((f) => f.replace(/\?.*$/, '')).sort(), ['search/documents.json.br', 'search/manifest.json', 'search/tokens.bin.br']);
    assert.equal(await page.$eval('#docs-palette-status [data-docs-search-semantic]', (el) => getComputedStyle(el).display), 'none', 'no offer once it is loaded');
  });

  await check('a query is answered by the worker: data-filter="none", the first hit highlighted, Enter opens it', async () => {
    await openPalette(page);
    await search(page, 'tooltip', 'overlays/tooltip.html');
    assert.equal(await page.getAttribute('#docs-palette', 'data-filter'), 'none');
    assert.equal(await page.$eval('#docs-palette-list [data-highlighted]', (el) => (el as HTMLElement).dataset.href), 'overlays/tooltip.html');
    const row = await page.$eval('#docs-palette-list [data-highlighted]', (el) => ({
      title: el.querySelector('.docs-hit-title')?.textContent,
      group: el.querySelector('.command-shortcut')?.textContent,
      snippet: !!el.querySelector('.docs-hit-snippet')?.textContent,
    }));
    assert.deepEqual(row, { title: 'Tooltip ATM', group: 'Overlays', snippet: true });
    const sections = (await hits(page)).filter((h) => h!.includes('#toc-'));
    assert.ok(sections.length > 0, 'sections of other pages are hits of their own');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.pathname.endsWith('/overlays/tooltip.html') && document.querySelector('main h1')?.textContent?.includes('Tooltip'));
    assert.equal(await page.$eval('#docs-palette', (el) => (el as HTMLDialogElement).open), false, 'the palette closes');
  });

  await check('an empty query (or closing) puts the page list back and the text filter on', async () => {
    await openPalette(page);
    await search(page, 'popover', 'overlays/popover.html');
    await page.fill('#docs-palette .command-input', '');
    await page.waitForFunction(() => !document.getElementById('docs-palette')!.hasAttribute('data-filter'));
    const total = await page.evaluate(() => (globalThis as any).df$.shadcn.docs.searchIndex.length);
    assert.equal((await hits(page)).length, total, 'every entry of the page list');
    await page.keyboard.press('Escape');
  });

  await check('a German question finds the English page by meaning; defuss-lid names the language', async () => {
    await openPalette(page);
    await search(page, 'Wie zeige ich ein modales Fenster an', 'overlays/dialog.html');
    await page.waitForFunction(() => !document.querySelector<HTMLElement>('[data-docs-search-language]')!.hidden);
    assert.equal(await page.textContent('[data-docs-search-language]'), 'German');
    // a few letters are no language - the badge goes
    await search(page, 'kbd', 'primitives/kbd.html');
    await page.waitForFunction(() => document.querySelector<HTMLElement>('[data-docs-search-language]')!.hidden);
    assert.ok(s.vendors.some((u) => u.endsWith('/major_20.cld3q')) && s.vendors.some((u) => u.endsWith('/cld3-core.bin.gz')), 'the CLD3 pack and core');
    await page.keyboard.press('Escape');
  });

  await check('a second visit downloads nothing but the manifest: the Cache API holds every file', async () => {
    const before = { models: s.models.length, vendors: s.vendors.filter((u) => /onnxruntime|decompressor/.test(u)).length };
    s.files.length = 0;
    await page.goto(`${server.url}${PAGE}`, { waitUntil: 'load' });
    await lanes(page, 'ready', 'ready');
    assert.equal(s.models.length, before.models, 'no model file');
    assert.equal(s.vendors.filter((u) => /onnxruntime/.test(u)).length, 1, 'ONNX Runtime once');
    assert.deepEqual(s.files, ['search/manifest.json'], 'only the manifest');
    const cached = await page.evaluate(async () => (await (await caches.open('defuss-shadcn-search')).keys()).length);
    assert.equal(cached, 7, 'documents, tokens, ONNX Runtime and the four model files');
    await openPalette(page);
    await search(page, 'Wie zeige ich ein modales Fenster an', 'overlays/dialog.html');
    await page.keyboard.press('Escape');
  });

  await check('no console errors, no failed requests', async () => {
    assert.deepEqual(s.errors, []);
  });
  await s.context.close();

  await check('data saver: the keyword lane only, until the status line adds the semantic one', async () => {
    const saver = await session(() => {
      Object.defineProperty(Navigator.prototype, 'connection', { configurable: true, get: () => ({ saveData: true }) });
    });
    await saver.page.goto(`${server.url}${PAGE}`, { waitUntil: 'load' });
    await lanes(saver.page, 'ready', 'idle');
    assert.equal(saver.models.length, 0, 'no model download');
    assert.equal(await saver.page.textContent('#docs-palette-status .docs-search-mode'), 'Keyword search');
    await saver.page.click('.header-search');
    await search(saver.page, 'tooltip', 'overlays/tooltip.html');
    await saver.page.click('#docs-palette-status [data-docs-search-semantic]');
    await lanes(saver.page, 'ready', 'ready');
    assert.equal(saver.models.length, 4, 'the model, once asked for');
    assert.deepEqual(saver.errors, []);
    await saver.context.close();
  });
} finally {
  await browser.close();
  server.stop();
}
if (failures) {
  console.error(`\ndocs-search.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('\ndocs-search.e2e: all checks passed');
