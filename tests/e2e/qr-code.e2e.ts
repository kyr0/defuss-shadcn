import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit, type Page } from 'playwright';
import { PNG } from 'pngjs';
import { prepareZXingModule, readBarcodes, ZXING_CPP_COMMIT, ZXING_WASM_SHA256, ZXING_WASM_VERSION } from 'zxing-wasm/reader';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: a QR that looks correct can encode the wrong content or fail to scan.
 * These tests decode the browser's actual SVG screenshots with independent
 * ZXing-C++, loading its pinned WASM from node_modules, never a CDN. They
 * also exercise the published standalone/minified/all-bundle paths and
 * state/store/render, failure recovery, lifecycle and accessible geometry.
 *
 * Default: Chromium, like the per-component runner. To verify all engines:
 * bun tests/e2e/qr-code.e2e.ts --all-browsers
 * Individual engine: --browser=firefox or --browser=webkit.
 * An environment-provided launcher can be selected with --webkit-executable=PATH.
 */

const FIXTURE = '/tests/e2e/qr-code.e2e-fixture.html';
const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT = resolve(ROOT, 'output/qr-code');
const ENGINES = { chromium, firefox, webkit };
type Engine = keyof typeof ENGINES;
type QrConfig = Record<string, unknown>;
type QrState = DefussShadcnComponentState;
type QrElement = HTMLElement & { api: NonNullable<HTMLElement['api']> & { render(state?: QrState): string; settled(): Promise<void> } };
type Check = { browser: string; label: string; passed: boolean; error?: string };
type Decode = { browser: string; label: string; bytes: number; sha256: string; version: number; ecc: string; hasECI: boolean; width: number; height: number };
const checks: Check[] = [];
const decodes: Decode[] = [];
const completedEngines: Engine[] = [];
const browserVersions: Partial<Record<Engine, string>> = {};
let fatalError: string | undefined;
const artifacts = Object.fromEntries([
  'tests/e2e/qr-code.e2e-fixture.html',
  ...['core.css', 'core.min.css', 'core.js', 'core.min.js', 'all.min.css', 'all.min.js',
    'qr-code/qr-code.css', 'qr-code/qr-code.min.css', 'qr-code/qr-code.js', 'qr-code/qr-code.min.js'].map((file) => `dist/components/${file}`),
].map((file) => {
  const bytes = readFileSync(resolve(ROOT, file));
  return [file, { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }];
}));
const argument = process.argv.find((arg) => arg.startsWith('--browser='))?.slice('--browser='.length) ?? 'chromium';
assert.ok(argument in ENGINES, `unknown browser: ${argument}`);
const engines: Engine[] = process.argv.includes('--all-browsers') ? ['chromium', 'firefox', 'webkit'] : [argument as Engine];
const server = startServer();
mkdirSync(OUTPUT, { recursive: true });
const deadline = setTimeout(() => {
  fatalError = 'qr-code.e2e: exceeded its 180-second hang guard';
  console.error(fatalError);
  writeReport();
  server.stop();
  process.exit(1);
}, 180_000);
deadline.unref();

function writeReport(): void {
  const report = `${JSON.stringify({ decoder: { name: 'zxing-wasm/reader', version: ZXING_WASM_VERSION, zxingCppCommit: ZXING_CPP_COMMIT, wasmSha256: ZXING_WASM_SHA256, source: 'installed local WASM' }, artifacts, engines, completedEngines, browserVersions, checks, decodes, fatalError, passed: !fatalError && completedEngines.length === engines.length && checks.length > 0 && checks.every((c) => c.passed) }, null, 2)}\n`;
  writeFileSync(resolve(OUTPUT, 'e2e-report.json'), report);
  writeFileSync(resolve(OUTPUT, `e2e-report-${engines.length === 1 ? engines[0] : 'all'}.json`), report);
}

/** Playwright context/page creation has no per-call timeout option. */
async function bounded<T>(task: Promise<T>, label: string, timeout = 15_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([task, new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} exceeded ${timeout} ms`)), timeout);
      timer.unref();
    })]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function check(browser: string, label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    checks.push({ browser, label, passed: true });
    console.log(`  ✓ ${browser}: ${label}`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    checks.push({ browser, label, passed: false, error });
    console.error(`  ✗ ${browser}: ${label}\n    ${error}`);
  }
}

async function configure(page: Page, config: QrConfig, id = 'qr-basic', name = 'default'): Promise<QrState> {
  return page.evaluate(({ config, id, name }) => {
    const el = document.getElementById(id) as QrElement;
    el.api.setState(name, config);
    return el.api.getState();
  }, { config, id, name });
}

async function waitReady(page: Page): Promise<void> {
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLElement>('.qr-code')].every((el) => !!el.api), undefined, { timeout: 10_000 });
}

/** Only the rendered SVG is cropped; no test implementation re-encodes it. */
async function raster(page: Page, id: string, integerPitch: number | null): Promise<{ png: Buffer; state: QrState }> {
  const state = await page.evaluate(({ id, integerPitch }) => {
    const el = document.getElementById(id) as QrElement;
    const state = el.api.getState();
    if (integerPitch !== null) el.style.setProperty('--qr-code-size', `${(Number(state.config.moduleCount) + 8) * integerPitch}px`);
    return state;
  }, { id, integerPitch });
  assert.equal(state.name, 'default', `${id}: a rendered symbol is required`);
  const svg = page.locator(`#${id} .qr-code-symbol svg`);
  const geometry = await svg.evaluate((el) => ({
    viewBox: el.getAttribute('viewBox'),
    paths: el.querySelectorAll('path').length,
    rects: el.querySelectorAll('rect').length,
    unsafe: el.querySelectorAll('script,foreignObject,image,text').length,
    path: el.querySelector('path')?.getAttribute('d'),
    ariaHidden: el.getAttribute('aria-hidden'),
    focusable: el.getAttribute('focusable'),
  }));
  const side = Number(state.config.moduleCount) + 8;
  assert.equal(geometry.viewBox, `0 0 ${side} ${side}`);
  assert.equal(geometry.paths, 1);
  assert.equal(geometry.rects, 1);
  assert.equal(geometry.unsafe, 0);
  assert.match(geometry.path ?? '', /^[MmLlHhVvZz\d\s.,-]+$/);
  assert.equal(geometry.ariaHidden, 'true');
  assert.equal(geometry.focusable, 'false');
  // Locator screenshots round a fractional CSS origin outwards, adding a
  // pixel even when the requested symbol width is an integer. Align the
  // live SVG's origin for the controlled-pitch experiment; restore its
  // authored style after capture. No matrix or image data is synthesized.
  let originalStyle: string | null = null;
  if (integerPitch !== null) {
    await svg.scrollIntoViewIfNeeded();
    originalStyle = await svg.evaluate((el) => {
      const old = el.getAttribute('style');
      const box = el.getBoundingClientRect();
      // Align in layout, not with a composited transform: SVG crispEdges
      // can snap before such a transform and shift a raster edge by 1 px.
      const style = (el as SVGSVGElement).style;
      style.position = 'relative';
      style.left = `${Math.ceil(box.left) - box.left}px`;
      style.top = `${Math.ceil(box.top) - box.top}px`;
      return old;
    });
  }
  let png: Buffer;
  try {
    if (integerPitch !== null) {
      const clip = await svg.boundingBox();
      assert.ok(clip);
      png = await page.screenshot({ clip, type: 'png', scale: 'css', animations: 'disabled', timeout: 10_000 });
    } else {
      png = await svg.screenshot({ type: 'png', scale: 'css', animations: 'disabled', timeout: 10_000 });
    }
  } finally {
    if (integerPitch !== null) await svg.evaluate((el, old) => { if (old === null) el.removeAttribute('style'); else el.setAttribute('style', old); }, originalStyle);
  }
  if (integerPitch !== null) assertQuietZone(png, side, integerPitch);
  return { png, state };
}

/** Inspect raster borders, independently of the SVG path-generation code. */
function assertQuietZone(png: Buffer, side: number, pitch: number): void {
  const image = PNG.sync.read(png);
  assert.equal(image.width, side * pitch);
  assert.equal(image.height, side * pitch);
  const q = 4 * pitch;
  let violations = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (x >= q && y >= q && x < image.width - q && y < image.height - q) continue;
      const offset = (y * image.width + x) * 4;
      if (image.data[offset] !== 255 || image.data[offset + 1] !== 255 || image.data[offset + 2] !== 255 || image.data[offset + 3] !== 255) violations++;
    }
  }
  assert.equal(violations, 0, 'all four quiet-zone margins must be opaque white');
  // The three finder outer corners reach the first symbol module, exactly four modules inward.
  for (const [x, y] of [[q, q], [image.width - q - 1, q], [q, image.height - q - 1]]) {
    const offset = (y * image.width + x) * 4;
    assert.deepEqual([...image.data.subarray(offset, offset + 4)], [0, 0, 0, 255], 'finder corner at the four-module boundary');
  }
}

async function decode(page: Page, engine: Engine, label: string, id = 'qr-basic', pitch: number | null = 4): Promise<Buffer> {
  const { png, state } = await raster(page, id, pitch);
  const result = await readBarcodes(png, { formats: ['QRCode'], tryHarder: true, tryInvert: false, maxNumberOfSymbols: 1, textMode: 'Plain' });
  assert.equal(result.length, 1, `${label}: independent decoder must detect one symbol`);
  const qr = result[0];
  assert.equal(qr.isValid, true, qr.error);
  assert.equal(qr.symbology, 'QRCode');
  assert.equal(qr.isMirrored, false);
  assert.equal(qr.isInverted, false);
  const value = state.config.value as string;
  const bytes = new TextEncoder().encode(value);
  assert.deepEqual([...qr.bytes], [...bytes], `${label}: exact UTF-8 bytes`);
  assert.equal(qr.text, value, `${label}: exact text, including whitespace and normalization form`);
  assert.equal(qr.hasECI, [...value].some((character) => character.charCodeAt(0) > 127), `${label}: non-ASCII has an explicit ECI segment`);
  const meta = JSON.parse(qr.extra) as { ECLevel: string; Version: string | number };
  assert.equal(meta.ECLevel, state.config.ecc, `${label}: requested ECC must not be boosted or downgraded`);
  assert.equal(Number(meta.Version), state.config.actualVersion);
  if (state.config.version !== 'auto') assert.equal(Number(meta.Version), state.config.version);
  const image = PNG.sync.read(png);
  decodes.push({ browser: engine, label, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), version: Number(meta.Version), ecc: meta.ECLevel, hasECI: qr.hasECI, width: image.width, height: image.height });
  return png;
}

try {
  const wasm = readFileSync(fileURLToPath(import.meta.resolve('zxing-wasm/reader/zxing_reader.wasm')));
  assert.equal(createHash('sha256').update(wasm).digest('hex'), ZXING_WASM_SHA256);
  await prepareZXingModule({ overrides: { wasmBinary: new Uint8Array(wasm).buffer }, fireImmediately: true });

  for (const engine of engines) {
    const executableFlag = `--${engine}-executable=`;
    const executablePath = process.argv.find((arg) => arg.startsWith(executableFlag))?.slice(executableFlag.length);
    console.log(`qr-code.e2e: launching ${engine}`);
    const browser = await ENGINES[engine].launch({ timeout: 15_000, ...(executablePath ? { executablePath } : {}) });
    browserVersions[engine] = browser.version();
    try {
      const context = await bounded(browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 }), `${engine}: context creation`);
      const errors: string[] = [];
      const remote: string[] = [];
      const failedRequests: string[] = [];
      const watch = (page: Page): void => {
        page.setDefaultTimeout(10_000);
        page.setDefaultNavigationTimeout(15_000);
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
        page.on('requestfailed', (request) => failedRequests.push(`${request.url()}: ${request.failure()?.errorText}`));
        page.on('response', (response) => { if (response.status() >= 400) failedRequests.push(`${response.status()}: ${response.url()}`); });
        page.on('request', (request) => { if (!request.url().startsWith(server.url) && !request.url().startsWith('data:')) remote.push(request.url()); });
      };
      context.on('page', watch);
      try {
        console.log(`qr-code.e2e: ${engine} ${browser.version()}, creating fixture page`);
        const page = await bounded(context.newPage(), `${engine}: page creation`);
        await page.goto(`${server.url}${FIXTURE}`);
        await waitReady(page);

        await check(engine, 'standalone HTML renders labelled native SVG; named initial states are independent', async () => {
          const r = await page.evaluate(() => ({
            names: ['qr-basic', 'qr-empty', 'qr-capacity'].map((id) => document.getElementById(id)!.api!.getState().name),
            label: document.querySelector('#qr-basic .qr-code-symbol')!.getAttribute('aria-label'),
            role: document.querySelector('#qr-basic .qr-code-symbol')!.getAttribute('role'),
            status: document.querySelector('#qr-empty .qr-code-status')!.localName,
            caption: document.querySelector('#qr-basic figcaption a')!.getAttribute('href'),
            focusable: document.querySelectorAll('.qr-code [tabindex], .qr-code svg[focusable="true"]').length,
          }));
          assert.deepEqual(r, { names: ['default', 'empty', 'error'], label: 'QR code for the project', role: 'img', status: 'output', caption: 'https://example.com/project', focusable: 0 });
          writeFileSync(resolve(OUTPUT, `${engine}-basic.png`), await decode(page, engine, 'basic URL'));
        });

        await check(engine, 'numeric, alphanumeric, URL, punctuation, whitespace and Unicode decode byte-for-byte', async () => {
          const values = [
            '0123456789012345678901234567890',
            'HELLO WORLD $%*+-./: 42',
            'https://example.com/path?q=a%20b&lang=de#fragment',
            '<tag attr="value"> & \' ?!;[]{}\\',
            ' \tline one\nline two\r\n ',
            'Grüße, Мир, 漢字, e\u0301, 😀',
            'é',
            'e\u0301',
            '漢字とカタカナ',
            '😀🚀𝄞',
          ];
          for (let i = 0; i < values.length; i++) {
            await configure(page, { value: values[i], ecc: 'M', version: 'auto' });
            await decode(page, engine, `content-${i + 1}`);
          }
        });

        await check(engine, 'all ECC levels remain exact, including a tiny payload which permits boosting', async () => {
          for (const ecc of ['L', 'M', 'Q', 'H']) {
            await decode(page, engine, `authored ECC ${ecc}`, `qr-${ecc.toLowerCase()}`, null);
            await configure(page, { value: '1', ecc, version: 'auto' });
            await decode(page, engine, `exact ECC ${ecc}`);
          }
        });

        await check(engine, 'forced versions across count/version-info transitions decode, through version 40', async () => {
          for (const version of [1, 6, 7, 9, 10, 26, 27, 40]) {
            const value = version === 1 ? 'Version 1' : `Version ${version}: UTF-8 Мир 😀`;
            const state = await configure(page, { value, ecc: 'M', version });
            assert.equal(state.config.moduleCount, 17 + version * 4);
            await decode(page, engine, `forced version ${version}`);
          }
        });

        await check(engine, 'exact capacity fits and the next unit fails without a stale symbol or truncation', async () => {
          for (const [unit, maximum, ecc] of [['1', 41, 'L'], ['A', 25, 'L'], ['a', 17, 'L'], ['a', 7, 'H']] as const) {
            await configure(page, { value: unit.repeat(maximum), ecc, version: 1 });
            await decode(page, engine, `v1 ${ecc} ${unit} capacity ${maximum}`);
            const failed = await configure(page, { value: unit.repeat(maximum + 1) });
            assert.equal(failed.name, 'error');
            assert.equal(failed.config.errorCode, 'capacity-exceeded');
            assert.equal(failed.config.value, unit.repeat(maximum + 1));
            assert.equal(await page.locator('#qr-basic svg').count(), 0);
          }
          await configure(page, { value: '1'.repeat(7089), ecc: 'L', version: 40 });
          await decode(page, engine, 'v40 L numeric maximum 7089');
          const tooLarge = await configure(page, { value: '1'.repeat(7090) });
          assert.equal(tooLarge.name, 'error');
          assert.equal(tooLarge.config.errorCode, 'capacity-exceeded');
          assert.equal(await page.locator('#qr-basic svg').count(), 0);
        });

        await check(engine, 'documented sizes, dense custom size, dark theme, print and RTL remain decodable', async () => {
          await configure(page, { value: 'https://example.com/project', ecc: 'M', version: 'auto' });
          await page.$eval('#qr-basic', (el) => el.style.removeProperty('--qr-code-size'));
          assert.equal(await page.$eval('#qr-basic', (el) => getComputedStyle(el).borderTopWidth), '1px');
          assert.equal(await page.$eval('#qr-sm', (el) => getComputedStyle(el).borderTopWidth), '0px');
          for (const [id, width] of [['qr-sm', 128], ['qr-basic', 192], ['qr-lg', 256], ['qr-dense', 360]] as const) {
            const box = await page.locator(`#${id} svg`).boundingBox();
            assert.ok(box);
            assert.equal(box.width, width);
            assert.equal(box.height, width);
            await decode(page, engine, `documented size ${width}`, id, null);
          }
          writeFileSync(resolve(OUTPUT, `${engine}-unicode.png`), await decode(page, engine, 'authored Unicode', 'qr-unicode'));
          writeFileSync(resolve(OUTPUT, `${engine}-dark.png`), await decode(page, engine, 'dark theme', 'qr-dark'));
          await page.emulateMedia({ media: 'print' });
          try {
            writeFileSync(resolve(OUTPUT, `${engine}-print.png`), await decode(page, engine, 'print rendering', 'qr-dark'));
          } finally {
            await page.emulateMedia({ media: 'screen' });
          }
          const original = await page.$eval('#qr-dark svg path', (el) => el.getAttribute('d'));
          await page.$eval('#qr-dark', (el) => { el.setAttribute('dir', 'rtl'); el.style.setProperty('--radius-lg', '999px'); });
          assert.equal(await page.$eval('#qr-dark svg path', (el) => el.getAttribute('d')), original);
          await decode(page, engine, 'RTL, extreme frame radius', 'qr-dark');
          if (engine === 'chromium') {
            await page.emulateMedia({ forcedColors: 'active' });
            assert.equal(await page.$eval('#qr-dark .qr-code-symbol', (el) => getComputedStyle(el).forcedColorAdjust), 'none');
            await decode(page, engine, 'forced colors', 'qr-dark');
            await page.emulateMedia({ forcedColors: 'none' });
          }
          await page.$eval('#qr-dark', (el) => { el.parentElement!.style.inlineSize = '180px'; });
          const constrained = await page.locator('#qr-dark svg').boundingBox();
          assert.ok(constrained && constrained.width <= 180 && constrained.width === constrained.height);
          await decode(page, engine, 'narrow responsive container', 'qr-dark', null);
          await page.$eval('#qr-dark', (el) => {
            el.style.setProperty('--qr-code-dark', '#102a43');
            el.style.setProperty('--qr-code-light', '#f8fafc');
          });
          await decode(page, engine, 'explicit high-contrast color override', 'qr-dark', null);
        });

        await check(engine, 'native controls drive default/empty/error; snapshots restore through the real store', async () => {
          await page.fill('#qr-input', 'Live: Мир 😀');
          await page.click('#qr-update');
          await decode(page, engine, 'live input', 'qr-live');
          await page.click('#qr-save');
          assert.match(await page.locator('#qr-rendered').textContent() ?? '', /<svg/);
          await page.click('#qr-clear');
          assert.equal(await page.locator('#qr-live .qr-code-status').textContent(), 'No QR code data.');
          assert.equal(await page.locator('#qr-live svg').count(), 0);
          await page.click('#qr-error');
          assert.equal(await page.locator('#qr-live .qr-code-status').textContent(), 'QR code unavailable.');
          assert.equal(await page.locator('#qr-live svg').count(), 0);
          await page.click('#qr-default');
          await decode(page, engine, 'default recovery', 'qr-live');
          await page.fill('#qr-input', 'Changed after snapshot');
          await page.click('#qr-update');
          await page.click('#qr-restore');
          assert.equal(await page.locator('#qr-observed').textContent(), 'default: Live: Мир 😀');
          await decode(page, engine, 'store snapshot replay', 'qr-live');
        });

        await check(engine, 'partial updates, complete store writes, idempotence and detached rendering agree', async () => {
          const result = await page.evaluate(async () => {
            const el = document.getElementById('qr-basic') as QrElement;
            el.api.setState('default', { value: 'State replay 😀', ecc: 'Q', version: 7, label: 'Replay label' });
            el.api.setState('default', { size: 'lg' });
            const snapshot = JSON.parse(JSON.stringify(el.api.getState())) as QrState;
            const html = el.outerHTML;
            const savedMarkup = el.api.render(snapshot);
            el.api.render({ ...snapshot, name: 'empty' });
            const pure = el.outerHTML === html;
            el.api.setState(snapshot.name, snapshot.config);
            const idempotent = el.outerHTML === html;
            el.api.setState('error', { message: 'Temporary' });
            el.store!.set({ name: snapshot.name, config: snapshot.config });
            await el.api.settled();
            const replayed = el.api.render() === savedMarkup;
            const same = JSON.stringify(el.store!.value) === JSON.stringify({ name: el.api.getState().name, config: el.api.getState().config });
            const retained = el.api.getState().config;
            // Complete store writes normalize omitted fields from authored defaults, not the last update.
            el.store!.set({ name: 'default', config: { value: 'Complete store value', ecc: 'L', version: 'auto', label: 'Store label', size: 'md', variant: 'plain' } });
            await el.api.settled();
            return { pure, idempotent, replayed, same, retained, storeConfig: el.api.getState().config };
          });
          assert.equal(result.pure, true);
          assert.equal(result.idempotent, true);
          assert.equal(result.replayed, true);
          assert.equal(result.same, true);
          assert.equal(result.retained.value, 'State replay 😀');
          assert.equal(result.retained.ecc, 'Q');
          assert.equal(result.retained.size, 'lg');
          assert.equal(result.storeConfig.value, 'Complete store value');
          assert.equal(result.storeConfig.version, 'auto');
          assert.equal(result.storeConfig.variant, 'plain');
          await decode(page, engine, 'complete store value');
        });

        await check(engine, 'attribute updates recover invalid markup without observer loops or sibling changes', async () => {
          const sibling = await page.$eval('#qr-lg svg path', (el) => el.getAttribute('d'));
          await page.$eval('#qr-basic', (el) => {
            el.setAttribute('data-value', 'Attribute data 😀');
            el.setAttribute('data-ecc', 'H');
            el.setAttribute('data-version', '7');
          });
          await page.waitForFunction(() => document.getElementById('qr-basic')!.api!.getState().config.actualVersion === 7);
          await decode(page, engine, 'attribute-driven payload');
          assert.equal(await page.$eval('#qr-lg svg path', (el) => el.getAttribute('d')), sibling);
          await page.$eval('#qr-basic', (el) => el.setAttribute('data-version', '01'));
          await page.waitForFunction(() => document.getElementById('qr-basic')!.api!.getState().config.errorCode === 'invalid-markup');
          assert.equal(await page.locator('#qr-basic svg').count(), 0);
          await page.$eval('#qr-basic', (el) => el.setAttribute('data-version', 'auto'));
          await page.waitForFunction(() => document.getElementById('qr-basic')!.api!.getState().name === 'default');
          await decode(page, engine, 'corrected attribute');
          const writes = await page.evaluate(async () => {
            const el = document.getElementById('qr-basic')!;
            let count = 0;
            const observer = new MutationObserver((records) => { count += records.length; });
            observer.observe(el, { attributes: true, childList: true, subtree: true });
            await new Promise((r) => setTimeout(r, 100));
            observer.disconnect();
            return count;
          });
          assert.equal(writes, 0, 'a settled symbol should perform no continuing writes');
        });

        await check(engine, 'attribute corrections recover; API A -> B -> A batches preserve final empty/error state', async () => {
          for (const [attribute, invalid, valid] of [['data-size', 'xl', 'md'], ['data-variant', 'rounded', 'plain']]) {
            await page.$eval('#qr-basic', (el, { attribute, invalid }) => el.setAttribute(attribute, invalid), { attribute, invalid });
            await page.waitForFunction(() => document.getElementById('qr-basic')!.api!.getState().config.errorCode === 'invalid-markup');
            await page.$eval('#qr-basic', (el, { attribute, valid }) => el.setAttribute(attribute, valid), { attribute, valid });
            await page.waitForFunction(() => document.getElementById('qr-basic')!.api!.getState().name === 'default');
            await decode(page, engine, `${attribute} same-value correction`);
          }
          const results = await page.evaluate(async () => {
            const el = document.getElementById('qr-basic') as QrElement;
            const results: { requested: string; actual: string; svg: number; earlierNativeWrite: boolean }[] = [];
            for (const requested of ['empty', 'error']) {
              el.api.setState('default', { value: 'A' });
              el.api.setState('default', { value: 'B' });
              el.api.setState('default', { value: 'A' });
              el.api.setState(requested, { value: 'A' });
              await new Promise((r) => setTimeout(r, 0));
              results.push({ requested, actual: el.api.getState().name, svg: el.querySelectorAll('svg').length, earlierNativeWrite: false });
              el.api.setState('default', { value: 'A' });
              el.setAttribute('data-value', 'A');
              el.api.setState(requested);
              await new Promise((r) => setTimeout(r, 0));
              results.push({ requested, actual: el.api.getState().name, svg: el.querySelectorAll('svg').length, earlierNativeWrite: true });
            }
            return results;
          });
          assert.deepEqual(results, [
            { requested: 'empty', actual: 'empty', svg: 0, earlierNativeWrite: false },
            { requested: 'empty', actual: 'empty', svg: 0, earlierNativeWrite: true },
            { requested: 'error', actual: 'error', svg: 0, earlierNativeWrite: false },
            { requested: 'error', actual: 'error', svg: 0, earlierNativeWrite: true },
          ]);
        });

        await check(engine, 'late roots, moves and genuine removal/reinsertion bind once and recover', async () => {
          const result = await page.evaluate(async () => {
            const bad = document.createElement('figure') as QrElement;
            bad.className = 'qr-code';
            bad.setAttribute('data-value', 'Invalid sibling');
            bad.setAttribute('data-version', 'NaN');
            const duplicate = document.createElement('figure') as QrElement;
            duplicate.className = 'qr-code';
            duplicate.setAttribute('data-value', 'Duplicate symbol slots');
            for (let i = 0; i < 2; i++) {
              const symbol = document.createElement('div');
              symbol.className = 'qr-code-symbol';
              duplicate.append(symbol);
            }
            const el = document.createElement('figure') as QrElement;
            el.className = 'qr-code';
            el.id = 'qr-late';
            el.setAttribute('data-value', 'Late insertion');
            const caption = document.createElement('figcaption');
            caption.className = 'qr-code-caption';
            caption.textContent = 'Authored trailing caption';
            el.append(caption);
            document.body.append(bad, duplicate, el);
            await new Promise((r) => setTimeout(r, 30));
            const initial = el.api.getState().name;
            const malformed = [bad, duplicate].map((sibling) => ({ name: sibling.api.getState().name, code: sibling.api.getState().config.errorCode, svg: sibling.querySelectorAll('svg').length }));
            bad.remove();
            duplicate.remove();
            const api = el.api;
            const container = document.createElement('div');
            document.body.append(container);
            container.append(el);
            await new Promise((r) => setTimeout(r, 30));
            const moved = el.api === api;
            el.remove();
            await new Promise((r) => setTimeout(r, 30));
            const unbound = !el.api;
            el.setAttribute('data-value', 'Reinserted 😀');
            document.body.append(el);
            await new Promise((r) => setTimeout(r, 30));
            const reinserted = el.api.getState();
            return { initial, malformed, moved, unbound, reinserted, symbols: el.querySelectorAll('.qr-code-symbol').length, statuses: el.querySelectorAll('.qr-code-status').length, captionLast: el.lastElementChild === caption };
          });
          assert.equal(result.initial, 'default');
          assert.deepEqual(result.malformed, [{ name: 'error', code: 'invalid-markup', svg: 0 }, { name: 'error', code: 'invalid-markup', svg: 0 }]);
          assert.equal(result.moved, true);
          assert.equal(result.unbound, true);
          assert.equal(result.reinserted.name, 'default');
          assert.equal(result.reinserted.config.value, 'Reinserted 😀');
          assert.equal(result.symbols, 1);
          assert.equal(result.statuses, 1);
          assert.equal(result.captionLast, true);
          await decode(page, engine, 'reinserted root', 'qr-late');
          for (const [attribute, field, invalid, valid] of [['data-size', 'size', 'xl', 'lg'], ['data-variant', 'variant', 'rounded', 'outline']]) {
            await page.$eval('#qr-late', (el, { attribute, invalid }) => el.setAttribute(attribute, invalid), { attribute, invalid });
            await page.waitForFunction(() => document.getElementById('qr-late')!.api!.getState().config.errorCode === 'invalid-markup');
            assert.equal(await page.locator('#qr-late svg').count(), 0);
            const corrected = await page.evaluate(async ({ attribute, valid }) => {
              const el = document.getElementById('qr-late') as QrElement;
              el.remove();
              await new Promise((resolve) => setTimeout(resolve, 30));
              const unbound = !el.api;
              el.setAttribute(attribute, valid);
              document.body.append(el);
              await new Promise((resolve) => setTimeout(resolve, 30));
              return { unbound, state: el.api.getState() };
            }, { attribute, valid });
            assert.equal(corrected.unbound, true);
            assert.equal(corrected.state.name, 'default', `${attribute}: a valid detached correction recovers the symbol`);
            assert.equal(corrected.state.config[field], valid);
            assert.equal(corrected.state.config.errorCode, undefined);
            await decode(page, engine, `detached ${field} correction`, 'qr-late');
          }
          const explicitError = await page.evaluate(async () => {
            const el = document.getElementById('qr-late') as QrElement;
            el.api.setState('error', { message: 'Intentionally unavailable' });
            el.remove();
            await new Promise((resolve) => setTimeout(resolve, 30));
            el.setAttribute('data-size', 'sm');
            document.body.append(el);
            await new Promise((resolve) => setTimeout(resolve, 30));
            return { state: el.api.getState(), symbols: el.querySelectorAll('svg').length };
          });
          assert.equal(explicitError.state.name, 'error', 'presentation-only edits preserve an intentional error');
          assert.equal(explicitError.state.config.message, 'Intentionally unavailable');
          assert.equal(explicitError.state.config.size, 'sm');
          assert.equal(explicitError.symbols, 0);
          await page.$eval('#qr-late', (el) => el.remove());
        });

        await check(engine, 'hostile-looking payload/label/status stay inert text; malformed UTF-16 clears the symbol', async () => {
          const payload = '"><img src=x onerror="throw 42"><script>throw 43</script>';
          await configure(page, { value: payload, label: payload, version: 'auto' });
          await decode(page, engine, 'inert payload');
          const before = await page.locator('#qr-basic figcaption').innerHTML();
          await configure(page, { message: payload }, 'qr-basic', 'error');
          assert.equal(await page.locator('#qr-basic .qr-code-status').textContent(), payload);
          assert.equal(await page.locator('#qr-basic img, #qr-basic script').count(), 0);
          assert.equal(await page.locator('#qr-basic figcaption').innerHTML(), before);
          for (const value of ['\ud800', '\udfff', 'x\ud800y']) {
            const result = await configure(page, { value }, 'qr-basic');
            assert.equal(result.name, 'error');
            assert.equal(result.config.errorCode, 'invalid-text');
            assert.equal(await page.locator('#qr-basic svg').count(), 0);
          }
        });

        await check(engine, 'minified standalone and all-component bundles produce independently decodable output', async () => {
          const authored = readFileSync(resolve(ROOT, `.${FIXTURE}`), 'utf8');
          for (const mode of ['minified', 'all'] as const) {
            const p = await bounded(context.newPage(), `${engine}: ${mode} page creation`);
            const html = mode === 'minified'
              ? authored.replaceAll('/core.css', '/core.min.css').replaceAll('/core.js', '/core.min.js').replaceAll('/qr-code.css', '/qr-code.min.css').replaceAll('/qr-code.js', '/qr-code.min.js')
              : authored.replace('/dist/components/qr-code/qr-code.css', '/dist/components/all.min.css').replace('<script type="module" src="/dist/components/core.js"></script>', '').replace('/dist/components/qr-code/qr-code.js', '/dist/components/all.min.js');
            await p.route(`**${FIXTURE}`, (route) => route.fulfill({ contentType: 'text/html', body: html }));
            await p.goto(`${server.url}${FIXTURE}`);
            await waitReady(p);
            await decode(p, engine, `${mode} standalone URL`);
            await decode(p, engine, `${mode} standalone Unicode`, 'qr-unicode');
            await p.close();
          }
        });

        await check(engine, 'render() and store contract reproduce all authored instances and named states', async () => {
          // The shared contract reloads the fixture and exercises default, empty and error.
          // SVG is deliberately NOT excluded as runtime-owned: its geometry is part of state.
          await assertRenderContract(page, '.qr-code[id]', ['default', 'empty', 'error']);
        });

        await check(engine, 'no runtime network loader, failed request or uncaught browser/console error', async () => {
          assert.deepEqual(remote, []);
          assert.deepEqual(failedRequests, []);
          assert.deepEqual(errors, []);
        });
      } finally {
        await bounded(context.close(), `${engine}: context close`, 5_000).catch((error) => {
          fatalError ??= error instanceof Error ? error.message : String(error);
          console.error(fatalError);
        });
      }
    } finally {
      await bounded(browser.close(), `${engine}: browser close`, 5_000).catch((error) => {
        fatalError ??= error instanceof Error ? error.message : String(error);
        console.error(fatalError);
      });
    }
    completedEngines.push(engine);
  }
} catch (error) {
  fatalError = error instanceof Error ? error.message : String(error);
  console.error(fatalError);
} finally {
  clearTimeout(deadline);
  server.stop();
  writeReport();
}

const failures = checks.filter((c) => !c.passed);
console.log(`qr-code.e2e: ${checks.length - failures.length}/${checks.length} checks passed; ${decodes.length} independently decoded browser screenshots`);
if (fatalError || failures.length) process.exit(1);
