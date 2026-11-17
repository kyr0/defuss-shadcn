import { existsSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { brotliCompressSync, constants } from 'node:zlib';
import type { Page } from 'playwright';

/**
 * Why: the Editor.js integration imports the official editor, its tools and
 * marked from jsDelivr at pinned versions; the Math components import KaTeX
 * (module, stylesheet, fonts), MathLive (module, fonts) and the Compute Engine
 * (module + its chunks, inside a worker) and the Visual Editor GrapesJS (its UMD build + stylesheet) the same
 * way, the scaffolds and Website templates import defuss-i18n and defuss-dom-router (their routing and
 * translation, the Translation and Client-side Routing guides), and the Geo Map d3-array, d3-geo, GeographicLib and
 * defuss-dson, the Terminal xterm.js with its addons (modules + stylesheet), and the docs search worker ONNX Runtime
 * Web's WASM, defuss-brotli's decoder and defuss-lid's CLD3 pack and core. The e2e files serve those builds
 * OFFLINE from the devDependencies (node_modules/<package>/<path>) - the
 * exact files the pinned URLs name - so a test never waits on the network
 * and a URL whose version is not the installed one answers 404 (the pin and
 * the devDependency must agree). Returns the request log.
 */
const MODULES = resolve(import.meta.dirname, '../../../node_modules/');
/** the content types of the vendor files that are no script (a stylesheet, its fonts) */
const TYPES: Record<string, string> = {
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.gz': 'application/gzip',
  '.cld3q': 'application/octet-stream',
};

/** a flag of flag-icons (the Language Switcher's pinned URL) drawn on the spot: two bands, the region's letters as the
 *  colour - a test asks for the URL, not for the artwork */
const FLAG_URL = /^https:\/\/cdn\.jsdelivr\.net\/npm\/flag-icons@7\.2\.3\/flags\/(4x3|1x1)\/([a-z-]+)\.svg$/;
export async function offlineFlags(page: Page): Promise<string[]> {
  const requests: string[] = [];
  await page.context().route((u) => FLAG_URL.test(u.href), async (route) => {
    const url = route.request().url();
    requests.push(url);
    const [, shape, region] = FLAG_URL.exec(url)!;
    const hue = [...region].reduce((h, c) => h + c.charCodeAt(0) * 37, 0) % 360;
    const [w, h] = shape === '1x1' ? [3, 3] : [4, 3];
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="hsl(${hue} 70% 45%)"/><rect width="${w}" height="1" fill="#fff"/></svg>`,
    });
  });
  return requests;
}

export async function offlineJsdelivr(page: Page): Promise<string[]> {
  const requests: string[] = await offlineFlags(page);
  // only the packages this repo pins as devDependencies - other jsDelivr files (echarts) stay the page's own business.
  // On the context: the Compute Engine is imported inside a worker, which page routes do not see
  await page.context().route((u) => /^https:\/\/cdn\.jsdelivr\.net\/npm\/(@editorjs\/|marked@|katex@|mathlive@|@cortex-js\/|grapesjs@|defuss-i18n@|defuss-dom-router@|d3-array@|d3-geo@|geographiclib-geodesic@|defuss-dson@|@xterm\/|onnxruntime-web@|defuss-brotli@|defuss-lid@|defuss-search@|defuss-lexicalsearch@|defuss-vectorsearch@|defuss-db@|defuss-storage@|defuss-dataview@|@huggingface\/tokenizers@)/.test(u.href), async (route) => {
    const url = route.request().url();
    requests.push(url);
    // @scope/name@version/path → node_modules/@scope/name/path
    const m = /^https:\/\/cdn\.jsdelivr\.net\/npm\/((?:@[^/]+\/)?[^@/]+)@([^/]+)\/(.+?)(?:\?.*)?$/.exec(url);
    const pkg = m ? resolve(MODULES, m[1]!, 'package.json') : '';
    const file = m ? resolve(MODULES, m[1]!, m[3]!) : '';
    const installed = pkg && existsSync(pkg) ? (JSON.parse(readFileSync(pkg, 'utf8')) as { version: string }).version : '';
    if (!m || m[2] !== installed || !existsSync(file)) return route.fulfill({ status: 404, body: 'not pinned' });
    await route.fulfill({ status: 200, contentType: TYPES[extname(file)] ?? 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: readFileSync(file) });
  });
  return requests;
}

/** poll (Node-side, so a page under a fake clock still progresses) until every .editorjs on the page is ready or failed */
export async function waitEditorsSettled(page: Page, runClock?: (ms: number) => Promise<void>): Promise<void> {
  const settled = () => page.evaluate(() => [...document.querySelectorAll('.editorjs')].every((e) => e.hasAttribute('data-ready') || e.hasAttribute('data-error')));
  for (let i = 0; i < 120; i++) {
    if (await settled()) {
      // Editor.js fades its blocks in on the REAL clock (its own .ce-block animation, 300 ms) - let it end
      await new Promise((r) => setTimeout(r, 450));
      return;
    }
    if (runClock) await runClock(250);
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('editors did not settle');
}

/** the model files a docs build downloaded (scripts/search-index.ts, defuss-vectorsearch's cacheDir) */
const MODELS = resolve(import.meta.dirname, '../../../.cache/models/');
const HF_URL = /^https:\/\/huggingface\.co\/([^/]+\/[^/]+)\/resolve\/([0-9a-f]+)\/(.+)\.br$/;
/**
 * The docs search's model OFFLINE: `https://huggingface.co/<id>/resolve/<revision>/<file>.br` answered with the file
 * the docs build downloaded into .cache/models/ (the same pinned revision, SHA-256 checked when it arrived), Brotli
 * compressed here as Hugging Face stores it. A file the cache lacks answers 404 - the build fetches the model only
 * when it encodes, so an e2e run after a build with a cold cache still has it. Returns the request log.
 */
/** a model file Brotli compressed once per process, at quality 5: quality 11 took ~a minute for Winzling-embed's 40 MB */
const COMPRESSED = new Map<string, Buffer>();
const compressed = (path: string): Buffer => {
  let body = COMPRESSED.get(path);
  if (!body) COMPRESSED.set(path, (body = brotliCompressSync(readFileSync(path), { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } })));
  return body;
};
export async function offlineModels(page: Page): Promise<string[]> {
  const requests: string[] = [];
  await page.context().route((u) => HF_URL.test(u.href), async (route) => {
    const url = route.request().url();
    requests.push(url);
    const [, id, revision, file] = HF_URL.exec(url)!;
    const path = resolve(MODELS, id!, revision!, file!);
    if (!existsSync(path)) return route.fulfill({ status: 404, body: `not in .cache/models - run a docs build with an empty .cache/search/` });
    await route.fulfill({ status: 200, contentType: 'application/octet-stream', headers: { 'Access-Control-Allow-Origin': '*' }, body: compressed(path) });
  });
  return requests;
}
