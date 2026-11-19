import { chromium, type Page } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { startServer } from '../server.ts';
import { offlineJsdelivr, waitEditorsSettled } from '../lib/vendor-offline.ts';
import { extraBundleOf } from '../../../src/documentation/lib/extra-bundles.ts';

/**
 * Why: dist/stats.json publishes what each Application Scaffold ships when it
 * is built on its own (dist/apps/{app}.* - core + only the components its
 * markup uses, scripts/lib/apps.ts). This is the evidence behind that number:
 * every full-screen app page loads ONLY its app bundle, and here it must
 * render exactly as the same markup does on core + all.css + all.js - every
 * element's box, display, colors, font and radius, which components
 * initialized and in which state - with no script error. The scaffold-*.e2e
 * tests then drive the lean pages through their clicks.
 */

const ROOT = join(import.meta.dirname, '..', '..', '..');
const stats = JSON.parse(readFileSync(join(ROOT, 'dist', 'stats.json'), 'utf8')) as {
  apps: Record<string, { href: string; components: string[]; totalSizeGzMinified: number }>;
  bundle: { totalSizeGzMinified: number };
};
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

/** every element's rendering - what a missing component stylesheet or script changes */
function snapshot(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.body.querySelectorAll('*')]
      // drawn content is left out like a canvas: the Graph Explorer's layers and its outlets fill with its worker's
      // messages, which arrive at their own time in each load (the explorer and the outlets themselves are compared);
      // toast.js mounts its empty container on every page that loads it - the whole system does, an app without
      // toasts (the knowledge graph) rightly does not
      .filter((el) => !el.closest('svg, canvas, script, style, .graph-explorer > [data-ce-chrome], [data-graph-explorer-for] > [data-ce-chrome], body > #toast-container:empty'))
      .map((el, i) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        // position, not id: some ids are generated per load (a window's title id)
        const id = `${el.tagName.toLowerCase()}[${i}]`;
        return [
          id,
          [r.x, r.y, r.width, r.height].map((n) => Math.round(n)).join(','),
          cs.display, cs.visibility, cs.position, cs.color, cs.backgroundColor, cs.fontSize, cs.fontWeight, cs.borderTopLeftRadius, cs.borderTopWidth, cs.opacity,
          el.hasAttribute('data-init') ? 'init' : '', (el as HTMLElement).dataset.stateName ?? '',
        ].join(' | ');
      }),
  );
}

async function open(href: string, full: boolean, extras: string[] = []): Promise<{ page: Page; errors: string[] }> {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-03-14T09:30:00Z') });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/lucide|unpkg|Failed to load resource/i.test(m.text())) errors.push(m.text()); });
  // the icons come from a CDN in both variants - stub it so the comparison never waits on the network
  await page.route('https://unpkg.com/**', (r) => r.fulfill({ contentType: 'text/javascript', body: '' }));
  // Shiki too (the API documentation paints its code with it): its paint lands at its own time in each load - the
  // code stays plain in both variants
  await page.route('https://esm.sh/**', (r) => r.fulfill({ status: 404, body: 'offline' }));
  // the Editor.js builds too (the document editor): the pinned devDependencies, never the network
  await offlineJsdelivr(page);
  const url = `${server.url}/dist/documentation/${href}`;
  if (full) {
    // the same page on the whole system: core.css + all.css + the wysiwyg extra bundle (Editor.js lives there), all.js + wysiwyg.js - what every docs page loads
    // - and the other extra bundles that hold one of the app's components (the knowledge graph: graphs, geo)
    const bundles = ['wysiwyg', ...extras.filter((b) => b !== 'wysiwyg')];
    await page.route(url, async (route) => {
      const body = (await (await route.fetch()).text())
        .replace(/<link rel="stylesheet" href="(?:\.\.\/)+apps\/[^"]+\.min\.css" id="tokens-css" \/>/, '<link rel="stylesheet" href="../../components/core.css" id="tokens-css" /><link rel="stylesheet" href="../../components/all.css" />' + bundles.map((b) => `<link rel="stylesheet" href="../../components/${b}.css" />`).join(''))
        .replace(/<script type="module" src="(?:\.\.\/)+apps\/[^"]+\.min\.js"><\/script>/, '<script type="module" src="../../components/all.js"></script>' + bundles.map((b) => `<script type="module" src="../../components/${b}.js"></script>`).join(''));
      assert.ok(body.includes('../components/all.js'), 'the full variant swapped the bundle in');
      await route.fulfill({ contentType: 'text/html', body });
    });
  }
  await page.goto(url);
  await page.waitForFunction(() => !!(globalThis as any).df$?.shadcn, undefined, { timeout: 10_000 });
  await page.clock.runFor(2000);
  // an Editor.js document mounts after its builds arrive - compare once it did (the fake clock is advanced meanwhile)
  await waitEditorsSettled(page, (ms) => page.clock.runFor(ms));
  await page.clock.runFor(2000);
  // an app that works on its own after load (the Workflow Studio runs its first workflow) settles first: each load
  // reaches its end at its own pace, and aria-busy says when it is still on the way
  for (let i = 0; i < 80 && (await page.evaluate(() => !!document.querySelector('[aria-busy="true"]'))); i++) await page.clock.runFor(500);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  return { page, errors };
}

try {
  for (const [name, app] of Object.entries(stats.apps)) {
    await check(`${name}: app-page loads only dist/apps/${name}/${name}.min.* (${app.components.length} components, ${(app.totalSizeGzMinified / 1024).toFixed(1)} KiB of ${(stats.bundle.totalSizeGzMinified / 1024).toFixed(1)} KiB) and renders as on the whole system`, async () => {
      const html = readFileSync(join(ROOT, 'dist', 'documentation', app.href), 'utf8');
      assert.ok(html.includes(`../../apps/${name}/${name}.min.css`) && html.includes(`../../apps/${name}/${name}.min.js`));
      assert.ok(!/(?:href|src)="(?:\.\.\/)+components\//.test(html), 'no system file beside the app bundle');
      const extras = [...new Set(app.components.map(extraBundleOf).filter((b): b is string => !!b))];
      const lean = await open(app.href, false);
      const full = await open(app.href, true, extras);
      assert.deepEqual(lean.errors, [], 'no script error on the app bundle');
      assert.deepEqual(full.errors, [], 'no script error on the whole system');
      // the registry: every component the app uses registered its State API (JS ones)
      const leanApis = await lean.page.evaluate(() => Object.keys((globalThis as any).df$.shadcn).filter((k) => k.endsWith('Api')).sort());
      const fullApis = await full.page.evaluate(() => Object.keys((globalThis as any).df$.shadcn).filter((k) => k.endsWith('Api')).sort());
      assert.ok(leanApis.length < fullApis.length, `the app bundle is a subset (${leanApis.length} of ${fullApis.length} State APIs)`);
      const [a, b] = [await snapshot(lean.page), await snapshot(full.page)];
      assert.equal(a.length, b.length, 'same element count');
      const diff = a.map((line, i) => (line === b[i] ? null : `lean: ${line}\n      full: ${b[i]}`)).filter(Boolean);
      assert.equal(diff.length, 0, `${diff.length} element(s) render differently:\n      ${diff.slice(0, 6).join('\n      ')}`);
      await lean.page.close();
      await full.page.close();
    });
  }
} finally {
  await browser.close();
  server.stop();
}
if (failures) {
  console.error(`scaffold-lean: ${failures} failure(s)`);
  process.exit(1);
}
console.log('scaffold-lean: all checks passed');
