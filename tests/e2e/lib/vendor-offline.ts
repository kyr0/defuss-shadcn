import { existsSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import type { Page } from 'playwright';

/**
 * Why: the Editor.js integration imports the official editor, its tools and
 * marked from jsDelivr at pinned versions; the Math components import KaTeX
 * (module, stylesheet, fonts), MathLive (module, fonts) and the Compute Engine
 * (module + its chunks, inside a worker) and the Visual Editor GrapesJS (its UMD build + stylesheet) the same
 * way. The e2e files serve those builds
 * OFFLINE from the devDependencies (node_modules/<package>/<path>) - the
 * exact files the pinned URLs name - so a test never waits on the network
 * and a URL whose version is not the installed one answers 404 (the pin and
 * the devDependency must agree). Returns the request log.
 */
const MODULES = resolve(import.meta.dirname, '../../../node_modules/');
/** the content types of the vendor files that are no script (a stylesheet, its fonts) */
const TYPES: Record<string, string> = { '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.json': 'application/json' };

export async function offlineJsdelivr(page: Page): Promise<string[]> {
  const requests: string[] = [];
  // only the packages this repo pins as devDependencies - other jsDelivr files (echarts) stay the page's own business.
  // On the context: the Compute Engine is imported inside a worker, which page routes do not see
  await page.context().route((u) => /^https:\/\/cdn\.jsdelivr\.net\/npm\/(@editorjs\/|marked@|katex@|mathlive@|@cortex-js\/|grapesjs@)/.test(u.href), async (route) => {
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
