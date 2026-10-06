import { chromium, type Page } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

/**
 * Why: the section bundles (scripts/lib/sections.ts) and their vendoring ZIPs
 * (scripts/release-zips.ts) promise that core + the sections listed under
 * "Needs" + the section is enough for the section's documented markup. This
 * consumes them the way a user does: build the release ZIPs, unzip each,
 * copy the <link>/<script> tags from its README, and render every member's
 * component-skill markup on them - it must render exactly as the same markup
 * on the whole system (core.css + all.* + wysiwyg.*), every element's box,
 * display, colors, font and radius, with the same components initialized and
 * no script error the whole system does not also have. A section missing from
 * "Needs" leaves an element unstyled and fails here.
 */

const ROOT = join(import.meta.dirname, '..', '..');
const OUT = join(ROOT, 'tmp', 'e2e-section-zips');
const PAGE_TIMEOUT_MS = 30_000;

// 1. the artifact: the release ZIPs, built from the current dist/, unzipped
rmSync(OUT, { recursive: true, force: true });
const built = Bun.spawnSync(['bun', 'scripts/release-zips.ts', '--out', OUT], { cwd: ROOT });
if (built.exitCode !== 0) throw new Error(`release-zips failed: ${built.stderr.toString()}`);
for (const zip of readdirSync(OUT).filter((f) => f.endsWith('.zip'))) {
  const un = Bun.spawnSync(['unzip', '-q', zip], { cwd: OUT });
  if (un.exitCode !== 0) throw new Error(`unzip ${zip} failed: ${un.stderr.toString()}`);
}
const folders = readdirSync(OUT).filter((f) => !f.endsWith('.zip'));

const stats = JSON.parse(readFileSync(join(ROOT, 'dist', 'stats.json'), 'utf8')) as {
  sections: Record<string, { heading: string; members: string[]; needs: string[]; files: string[] }>;
};

// 2. one server: /zip/<folder>/… = the unzipped downloads, /dist/… = the whole system
const TYPES: Record<string, string> = { '.css': 'text/css', '.js': 'text/javascript', '.map': 'application/json', '.html': 'text/html' };
const server = Bun.serve({
  port: 0,
  async fetch(req) {
    const path = normalize(decodeURIComponent(new URL(req.url).pathname));
    if (path === '/page') return new Response(pages.get(new URL(req.url).searchParams.get('id') ?? '') ?? '', { headers: { 'content-type': 'text/html' } });
    const file = path.startsWith('/zip/') ? join(OUT, path.slice(5)) : path.startsWith('/dist/') ? join(ROOT, path) : '';
    if (!file || !file.startsWith(ROOT) || !existsSync(file)) return new Response('not found', { status: 404 });
    return new Response(Bun.file(file), { headers: { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' } });
  },
});
const base = `http://localhost:${server.port}`;
const pages = new Map<string, string>();

const htmlBlocks = (md: string): string => [...md.matchAll(/```html\n([\s\S]*?)```/g)].map((m) => m[1]).join('\n');
/** every member's documented markup, without its script tags (the bundles bring the behavior) */
const markupOf = (members: readonly string[]): string =>
  members.map((m) => htmlBlocks(readFileSync(join(ROOT, 'src', 'components', m, 'component-skill.md'), 'utf8'))).join('\n').replace(/<script\b[\s\S]*?<\/script>/gi, '');
/** the tags the ZIP's README tells a user to copy */
function readmeTags(folder: string): string {
  const readme = readFileSync(join(OUT, folder, 'README.md'), 'utf8');
  const block = readme.match(/```html\n([\s\S]*?)```/);
  assert.ok(block, `${folder}/README.md has the load-order html block`);
  return block[1];
}
/** the whole system as the reference for the all ZIP - the minified twins, like the README tags
 *  (minification rounds color-mix() results differently) */
const FULL = ['components/core.min.css', 'components/all.min.css', 'components/wysiwyg.min.css']
  .map((f) => `<link rel="stylesheet" href="/dist/${f}">`)
  .concat(['components/all.min.js', 'components/wysiwyg.min.js'].map((f) => `<script type="module" src="/dist/${f}"></script>`))
  .join('\n');

/**
 * The reference for one section: the ZIP's own tags, then every OTHER section bundle from dist/
 * after them. Same files, same order for the section and its needs - the only difference is the
 * rest of the system, so a difference means "Needs" misses a section. (Against all.css instead,
 * the alphabetical order would decide ties between two components' classes on one element - a
 * dock snippet's `.dock-item.fab` outside its .dock - which no real page hits.)
 */
function withEverythingElse(tags: string, name: string, s: { needs: string[] }): string {
  const others = Object.entries(stats.sections).filter(([n, o]) => n !== name && !s.needs.includes(o.heading));
  const files = others.flatMap(([, o]) => o.files).map((f) => f.replace(/\.(css|js)$/, '.min.$1'));
  return [tags, ...files.filter((f) => f.endsWith('.css')).map((f) => `<link rel="stylesheet" href="/dist/${f}">`), ...files.filter((f) => f.endsWith('.js')).map((f) => `<script type="module" src="/dist/${f}"></script>`)].join('\n');
}

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

/** every element of the documented markup (#markup) - what a missing section stylesheet or script
 *  changes; elements a runtime appends to <body> on its own (a live region of a component outside
 *  the section) are not the section's markup */
function snapshot(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('#markup *')]
      .filter((el) => !el.closest('svg, canvas, script, style, iframe, video'))
      .map((el, i) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return [
          `${el.tagName.toLowerCase()}[${i}]${el.className && typeof el.className === 'string' ? `.${el.className.split(/\s+/)[0]}` : ''}`,
          [r.x, r.y, r.width, r.height].map((n) => Math.round(n)).join(','),
          cs.display, cs.visibility, cs.position, cs.color, cs.backgroundColor, cs.fontSize, cs.fontWeight, cs.borderTopLeftRadius, cs.borderTopWidth, cs.opacity,
          el.hasAttribute('data-init') ? 'init' : '', (el as HTMLElement).dataset.stateName ?? '',
        ].join(' | ');
      }),
  );
}

async function render(id: string, head: string, body: string, baseHref: string): Promise<{ page: Page; errors: string[]; apis: string[] }> {
  pages.set(id, `<!doctype html><html><head><meta charset="utf-8"><base href="${baseHref}">${head}</head><body><div id="markup">${body}</div></body></html>`);
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(PAGE_TIMEOUT_MS);
  await page.clock.install({ time: new Date('2026-03-14T09:30:00Z') });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/i.test(m.text())) errors.push(m.text()); });
  // only this server: remote images, fonts, vendor renderers fail the same way in both variants
  await page.route('**', (r) => (r.request().url().startsWith(base) ? r.continue() : r.abort()));
  await page.goto(`${base}/page?id=${encodeURIComponent(id)}`, { timeout: PAGE_TIMEOUT_MS });
  await page.waitForFunction(() => !!(globalThis as any).df$?.shadcn, undefined, { timeout: 10_000 });
  await page.clock.runFor(2000);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const apis = await page.evaluate(() => Object.keys((globalThis as any).df$.shadcn).filter((k) => k.endsWith('Api')).sort());
  return { page, errors: errors.sort(), apis };
}

const camel = (c: string): string => c.replace(/-([a-z])/g, (_m, ch: string) => ch.toUpperCase());

try {
  await check(`release-zips: ${folders.length} ZIPs (all + ${Object.keys(stats.sections).length} sections) unzip to one folder each`, async () => {
    assert.equal(folders.length, Object.keys(stats.sections).length + 1);
    for (const f of folders) for (const need of ['README.md', 'LICENSE', 'NOTICE.txt', 'components/core.css']) assert.ok(existsSync(join(OUT, f, need)), `${f}/${need}`);
    const all = folders.find((f) => f.endsWith('-all'))!;
    assert.ok(!existsSync(join(OUT, all, 'components', 'core.js')), 'the all ZIP has no core.js (all.js embeds the runtime)');
  });

  for (const [name, s] of Object.entries(stats.sections)) {
    const folder = folders.find((f) => f.endsWith(`-${name}`));
    await check(`${name}: the ZIP's README tags render the ${s.members.length} member(s) as the whole system does (needs: ${s.needs.join(', ') || 'nothing else'})`, async () => {
      assert.ok(folder, `a ZIP for ${name}`);
      const body = markupOf(s.members);
      const lean = await render(`${name}-lean`, readmeTags(folder), body, `/zip/${folder}/`);
      const full = await render(`${name}-full`, withEverythingElse(readmeTags(folder), name, s), body, `/zip/${folder}/`);
      assert.deepEqual(lean.errors, full.errors, 'the same script errors as on the whole system (ideally none)');
      for (const m of s.members)
        if (existsSync(join(ROOT, 'src', 'components', m, `${m}.ts`))) assert.ok(lean.apis.includes(`${camel(m)}Api`), `${m} registered its State API from the section bundle`);
      assert.ok(lean.apis.length <= full.apis.length, `the section load is a subset (${lean.apis.length} of ${full.apis.length} State APIs)`);
      const [a, b] = [await snapshot(lean.page), await snapshot(full.page)];
      assert.equal(a.length, b.length, 'same element count');
      const diff = a.map((line, i) => (line === b[i] ? null : `zip:  ${line}\n      full: ${b[i]}`)).filter(Boolean);
      assert.equal(diff.length, 0, `${diff.length} element(s) render differently:\n      ${diff.slice(0, 6).join('\n      ')}`);
      await lean.page.close();
      await full.page.close();
    });
  }

  await check('all: the all ZIP renders the Overlays markup as dist/ does', async () => {
    const folder = folders.find((f) => f.endsWith('-all'))!;
    const body = markupOf(stats.sections.overlays.members);
    const lean = await render('all-lean', readmeTags(folder), body, `/zip/${folder}/`);
    const full = await render('all-full', FULL, body, '/');
    assert.deepEqual(lean.errors, full.errors);
    const [a, b] = [await snapshot(lean.page), await snapshot(full.page)];
    assert.deepEqual(a, b);
    await lean.page.close();
    await full.page.close();
  });
} finally {
  await browser.close();
  server.stop();
}
if (failures) {
  console.error(`section-bundles: ${failures} failure(s)`);
  process.exit(1);
}
console.log('section-bundles: all checks passed');
