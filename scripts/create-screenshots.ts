#!/usr/bin/env bun
import { chromium, type Locator, type Page } from 'playwright';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { componentDirs, componentFile } from '../src/documentation/lib/component-dirs.ts';
import { availableParallelism } from 'node:os';
import { componentFingerprints, declaredStates } from './lib/inputs.ts';

/**
 * Why: per-component default-state screenshots the AI agent can inspect
 * directly (light/ + dark/ PNGs under screenshots/). Only the initial render
 * is captured - zero interaction - so a screenshot is the component's resting
 * look. Pages are served over HTTP. CDNs are still reachable (lucide icons
 * and demo images are part of the default state) - only esm.sh is blocked,
 * which serves the 2 MB shiki bundle the source-viewer needs but previews
 * never do. All waits are bounded so nothing can hang the run.
 *
 * Incremental: manifest.json stores an input fingerprint per component
 * (shipped files + doc page + global shell; see lib/inputs.ts). Unchanged
 * components keep their PNGs; only changed ones are re-shot. `--force`
 * re-shoots everything. verify.ts checks freshness with the SAME fingerprints,
 * so a build that changed nothing costs ~0 s here and stays green there.
 */

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'screenshots');
const COMPS = join(ROOT, 'src/components');
const DIST = join(ROOT, 'dist');
const MANIFEST = join(OUT, 'manifest.json');
const FORCE = process.argv.includes('--force');
const SETTLE_MS = 250; // settle time for CSS enter animations

/** Both color schemes the system supports; each gets its own subfolder. */
const MODES = ['light', 'dark'] as const;

/** Pages rendered concurrently. Each doc page boots one sandbox iframe (a
 *  renderer running the whole bundle) per example - a page can hold 20 - so
 *  8 pages at once meant 100+ renderers and froze a 10-core laptop. A quarter
 *  of the cores (1-4); SCREENSHOT_CONCURRENCY overrides. */
const CONCURRENCY = Math.max(1, Number(process.env.SCREENSHOT_CONCURRENCY) || Math.min(4, Math.floor(availableParallelism() / 4)));
/** Hard ceiling per page so a slow network/CDN can never hang the run. */
const PAGE_TIMEOUT_MS = 20_000;

/** Static server exposing only /dist (same allowlist idea as tests/e2e/server.ts). */
function serveDist() {
  const MIME: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.md': 'text/plain; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.woff2': 'font/woff2',
  };
  return Bun.serve({
    port: 0,
    async fetch(req) {
      const path = decodeURIComponent(new URL(req.url).pathname);
      if (!path.startsWith('/dist/')) return new Response('Forbidden', { status: 403 });
      const file = Bun.file(join(ROOT, `.${path}`));
      if (!(await file.exists())) return new Response('Not found', { status: 404 });
      return new Response(file, {
        headers: { 'Content-Type': MIME[path.slice(path.lastIndexOf('.'))] ?? 'application/octet-stream' },
      });
    },
  });
}

/** Non-'default' states declared by the component source (parsed from {name}States). */
function stateNames(name: string): string[] {
  const ts = componentFile(COMPS, name, `${name}.ts`);
  if (!existsSync(ts)) return [];
  return declaredStates(readFileSync(ts, 'utf8')).filter((s) => s !== 'default');
}

/** All screenshot keys (manifest-relative paths) expected for one component. */
function shotKeys(name: string): string[] {
  return MODES.flatMap((mode) =>
    [`${name}.png`, ...stateNames(name).map((s) => `${name}-${s}.png`)].map((f) => `${mode}/${f}`),
  );
}

/** Content hash of a captured PNG - detects renders changing without inputs. */
function hashFile(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 16);
}

async function shoot(
  browser: import('playwright').Browser,
  baseUrl: string,
  name: string,
  mode: (typeof MODES)[number],
): Promise<void> {
  const page: Page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  try {
    // the doc shell's preflight adds .dark when prefers-color-scheme matches,
    // so emulating the scheme drives dark mode through the site's own logic
    await page.emulateMedia({ colorScheme: mode });
    // keep lucide (icons!) and demo images loadable; drop the heavyweight
    // shiki highlighter the source sections pull from esm.sh
    await page.route(/^https?:\/\/esm\.sh\//, (route) => route.abort());
    await page.goto(`${baseUrl}/dist/documentation/${name}.html`, {
      waitUntil: 'domcontentloaded',
      timeout: PAGE_TIMEOUT_MS,
    });
    // the first .preview block is the component's default demo
    const preview = page.locator('main .preview').first();
    await preview.waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });
    // images/icons inside the preview are network loads - wait for them to
    // settle (or fail - broken-image demos stay honest) with a 4s hard cap
    await preview
      .locator('img')
      .evaluateAll((imgs) =>
        Promise.race([
          Promise.all(
            imgs.map((el) => {
              const img = el as HTMLImageElement;
              return img.complete ? undefined : new Promise((r) => { img.onload = img.onerror = r; });
            }),
          ),
          new Promise((r) => setTimeout(r, 4000)),
        ]),
      )
      .catch(() => undefined);
    // CodeExample sandboxes boot asynchronously (srcdoc assembly + module
    // fetches) - SETTLE_MS alone can catch the pre-boot placeholder frame
    // (seen on the presentation page: 4 decks racing for all.min.js). The
    // bridge's first height post IS the ready signal; pages without
    // executable examples pass immediately, broken ones time out softly.
    await page
      .waitForFunction(
        () => {
          const first = document.querySelector('.code-example-frame') as HTMLIFrameElement | null;
          return !first || parseFloat(first.style.height || '0') > 50;
        },
        undefined,
        { timeout: PAGE_TIMEOUT_MS },
      )
      .catch(() => undefined);
    await page.waitForTimeout(SETTLE_MS);
    await fitLiveExample(page, preview);
    await preview.screenshot({ path: join(OUT, mode, `${name}.png`), timeout: PAGE_TIMEOUT_MS });
    console.log(`  ✓ ${mode}/${name}.png`);

    // non-default states: the doc page marks the state-bearing element with
    // [data-state-demo]; drive it through the component's own State API and
    // capture the element itself (AGENTS.md "State API" → State screenshots)
    for (const state of stateNames(name)) {
      const anchor = page.locator('[data-state-demo]').first();
      if ((await anchor.count()) === 0) continue; // verify.ts reports the missing anchor
      // the anchor is typically a live example (the code-example card): it
      // drives the component it previews through el.preview, which appears
      // once the sandbox bridge reports ready - wait for it before driving
      await page.waitForFunction(
        () => {
          const el = document.querySelector('[data-state-demo]') as (HTMLElement & { api?: unknown; preview?: unknown }) | null;
          return el?.classList.contains('code-example') ? !!el.preview : !!el?.api;
        },
        undefined,
        { timeout: PAGE_TIMEOUT_MS },
      );
      await anchor.evaluate((el, s) => {
        // structural type (page context can't import the repo's .d.ts)
        type Driver = { setState(name: string, config?: Record<string, unknown>): void };
        const target = el as HTMLElement & { api?: Driver; preview?: Driver };
        const driver = target.classList.contains('code-example') ? target.preview : target.api;
        if (!driver) throw new Error('[data-state-demo] element has no .api / .preview - component failed to init?');
        driver.setState(s);
      }, state);
      await page.waitForTimeout(SETTLE_MS);
      // fixed/anchored popovers render in the viewport's top layer - a demo
      // below the fold would capture as blank. Scrolling the document moves
      // the static trigger (and the CSS anchor + popover with it) into view.
      await anchor.evaluate((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom > innerHeight || r.top < 0) window.scrollBy(0, r.top - innerHeight / 2);
      });
      await page.waitForTimeout(SETTLE_MS / 2); // let anchor re-positioning settle
      await fitLiveExample(page, anchor);
      await anchor.screenshot({ path: join(OUT, mode, `${name}-${state}.png`), timeout: PAGE_TIMEOUT_MS });
      console.log(`  ✓ ${mode}/${name}-${state}.png`);
    }
  } finally {
    await page.close();
  }
}

/**
 * A live example (the code-example card, or its stage) previews in a
 * sandboxed iframe - an out-of-process frame that rasterizes only what is on
 * screen, so a capture of a card reaching past the viewport came out blank
 * below the fold. Bring such a target fully into view first: the viewport
 * grows to fit a taller card, then the frame gets a moment to paint.
 */
async function fitLiveExample(page: Page, target: Locator): Promise<void> {
  const live = await target.evaluate((el) => !!el.closest('.code-example')).catch(() => false);
  if (!live) return;
  const height = Math.ceil(await target.evaluate((el) => el.getBoundingClientRect().height));
  const vp = page.viewportSize();
  const pad = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 72);
  if (vp && height + pad + 40 > vp.height) await page.setViewportSize({ width: vp.width, height: Math.ceil(height + pad + 40) });
  // the target lands right below the fixed site header and the sticky page
  // header - the docs keep their height in scroll-padding-top
  await target.evaluate((el) => {
    const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 72;
    window.scrollTo({ top: scrollY + el.getBoundingClientRect().top - pad - 8, behavior: 'instant' });
  });
  await page.waitForTimeout(SETTLE_MS * 2);
}

type Manifest = {
  /** input fingerprint per component (what the screenshots were shot against) */
  fingerprints: Record<string, string>;
  /** content hash per PNG ("mode/file.png") - detects renders edited/corrupted outside the pipeline */
  renders: Record<string, string>;
};

const components = componentDirs(COMPS).map((c) => c.name);
if (FORCE) rmSync(OUT, { recursive: true, force: true }); // --force: full recapture
for (const mode of MODES) mkdirSync(join(OUT, mode), { recursive: true });

// decide what actually changed - content hashes, not mtimes
const current = componentFingerprints(DIST);
const previous: Manifest = existsSync(MANIFEST)
  ? (JSON.parse(readFileSync(MANIFEST, 'utf8')) as Manifest)
  : { fingerprints: {}, renders: {} };
// a component is stale when inputs changed OR any expected PNG is absent
// (default shot + one per non-default state, per mode)
const stale = components.filter(
  (name) =>
    current[name] !== previous.fingerprints[name] ||
    shotKeys(name).some((key) => !existsSync(join(OUT, key))),
);

const manifest: Manifest = { fingerprints: {}, renders: {} };
for (const name of components) {
  if (stale.includes(name)) continue;
  manifest.fingerprints[name] = current[name]; // carried over
  for (const key of shotKeys(name)) if (previous.renders?.[key]) manifest.renders[key] = previous.renders[key];
}

const server = serveDist();
const baseUrl = `http://localhost:${server.port}`;
const browser = await chromium.launch();

const failures: string[] = [];
let cursor = 0;

// simple worker pool - each worker pulls the next (component × mode) job until exhausted
const jobs = stale.flatMap((name) => MODES.map((mode) => ({ name, mode })));
async function worker(): Promise<void> {
  while (cursor < jobs.length) {
    const { name, mode } = jobs[cursor++];
    try {
      await shoot(browser, baseUrl, name, mode);
    } catch (err) {
      failures.push(`${mode}/${name}: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await browser.close();
server.stop();

// record fingerprints + render hashes only for components whose modes ALL
// succeeded - a partially failed component stays stale and is retried
const failedComponents = new Set(failures.map((f) => f.split(':')[0].split('/')[1]));
for (const name of stale) {
  if (failedComponents.has(name)) continue;
  manifest.fingerprints[name] = current[name];
  for (const key of shotKeys(name)) if (existsSync(join(OUT, key))) manifest.renders[key] = hashFile(join(OUT, key));
}
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));

if (failures.length) {
  console.error(`\ncreate-screenshots: ${failures.length} capture(s) failed`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(
  `\ncreate-screenshots: ${jobs.length} re-shot, ${components.length - stale.length} up-to-date (${components.length} × ${MODES.length} modes) → screenshots/`,
);
