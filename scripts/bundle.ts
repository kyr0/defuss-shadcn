#!/usr/bin/env bun
import { mkdirSync, readdirSync, readFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { viteIgnore } from './lib/vite-ignore.ts';
import { join } from 'node:path';
import { provenanceNotice, provenancePointer } from './lib/provenance.ts';
import { collectProvenance } from './lib/provenance-files.ts';
import { appPlans } from './lib/apps-files.ts';
import { EXTRA_BUNDLES, inAllBundle } from './lib/bundles.ts';
import { sections } from './lib/sections-files.ts';

/**
 * Why: doc pages (and CDN consumers who want everything) used to carry 68
 * component <link> tags + 27 module <script> tags. This step ships a single
 * bundle instead - dist/components/all.css + all.js - so pages include one
 * stylesheet and one module script. The per-component files stay shipped for
 * pick-what-you-need installs; verify's `cross-page imports` gate mandates the
 * bundle includes on every doc page.
 *
 * JS: bundled from the src/*.ts modules with Bun.build (NOT string
 * concatenation - every component module redeclares `const df$`,
 * `function init()`, etc., which only stays valid inside real module scopes;
 * bundling from src/ also keeps one shared copy of the shared layer instead
 * of one per component). The readable all.js + all.js.map maps back to the
 * .ts sources; minify.ts then derives all.min.js + all.min.js.map like for
 * any other dist/components/*.js.
 *
 * core.js (plans/defuss-query-morph-integration.md §2.3/§2.6): the same inputs as
 * all.js minus the components - one defuss-morph + one defuss-query + the
 * defuss-shadcn-shared layer behind the guarded bootstrap of src/core/
 * index.ts. all.js embeds the SAME core payload first (its entry imports
 * src/core/index.ts before any component), so "all alone" and "core +
 * selected components" run byte-identical runtime code; a second copy never
 * loads (the bootstrap rejects an existing df$).
 *
 * CSS: concatenation is safe because every component stylesheet lives in
 * `@layer components` with flat-specificity, prefixed class selectors and
 * resolves tokens via var(--*) at runtime - so alphabetical (deterministic)
 * order is fine. VERIFIED: (section-bundles.e2e) source order still breaks an
 * equal-specificity tie between two components' classes on ONE element (a
 * dock snippet's `.dock-item.fab` outside its .dock); the components resolve
 * their real compositions by specificity instead (`.dock .fab.dock-item`).
 * all.min.css (+ the one .min.css.map in the system) is derived by minify.ts.
 *
 * Runs after build.ts (dist/ exists) and before minify.ts in both the
 * `build` and `docs` script chains.
 */

const ROOT = join(import.meta.dirname, '..');
const SRC_COMPONENTS = join(ROOT, 'src', 'components');
const DIST_COMPONENTS = join(ROOT, 'dist', 'components');
const TMP = join(ROOT, 'tmp');

// per-release provenance (§6): the core artifacts embed defuss-morph +
// defuss-query, so the MIT attribution ships INSIDE them - a pointer comment
// (versions + LICENSE hashes) before the source-map line, and the full
// notice as NOTICE.txt beside them.
const PROVENANCE = collectProvenance(ROOT);
const PROVENANCE_POINTER = provenancePointer(PROVENANCE);

/** Insert the provenance pointer before the file's final sourceMappingURL line. */
function stampProvenance(file: string): void {
  const src = readFileSync(file, 'utf8');
  const at = src.lastIndexOf('//# sourceMappingURL=');
  if (at === -1) throw new Error(`bundle: ${file} lost its sourceMappingURL line`);
  writeFileSync(file, `${src.slice(0, at).trimEnd()}\n${PROVENANCE_POINTER}\n${src.slice(at)}`);
}

const names = readdirSync(SRC_COMPONENTS, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();
if (names.length === 0) {
  console.error('bundle: no components found under src/components/');
  process.exit(1);
}

// re-add the vite-ignore hint to dynamic imports of a computed specifier
// (Bun.build strips comments) - and shift the sibling .map to match
function restoreViteIgnore(file: string): void {
  const mapFile = `${file}.map`;
  const map = existsSync(mapFile) ? JSON.parse(readFileSync(mapFile, 'utf8')) : null;
  const out = viteIgnore(readFileSync(file, 'utf8'), map?.mappings);
  if (!out.count) return;
  writeFileSync(file, out.code);
  if (map) writeFileSync(mapFile, JSON.stringify({ ...map, mappings: out.mappings }));
}

/** stamp the sourceMappingURL comment - must be the LAST line of the file */
function linkSourceMap(file: string, mapName: string): void {
  writeFileSync(file, `${readFileSync(file, 'utf8').trimEnd()}\n//# sourceMappingURL=${mapName}\n`);
}

// 1. core bundle: morph + query + shared behind the guarded bootstrap - the
//    runtime every component binds to, shipped as its own artifact AND
//    embedded first inside all.js below (§2.6 step 1 + step 3).
const core = await Bun.build({
  entrypoints: [join(ROOT, 'src', 'core', 'index.ts')],
  outdir: DIST_COMPONENTS,
  naming: 'core.js',
  format: 'esm',
  target: 'browser',
  sourcemap: 'external',
  minify: false,
});
if (!core.success) {
  console.error('bundle: core Bun.build failed:');
  for (const log of core.logs) console.error(`  ${log}`);
  process.exit(1);
}
linkSourceMap(join(DIST_COMPONENTS, 'core.js'), 'core.js.map');
stampProvenance(join(DIST_COMPONENTS, 'core.js')); // §6 provenance pointer

// 2. JS bundle: core payload first (its module body installs df$ +
//    df$.shadcn.shared before any component evaluates - §2.6 step 4), then
//    one side-effect import per interactive component (each module
//    self-initializes + registers its own MutationObserver on import).
// components of an extra bundle (scripts/lib/bundles.ts) stay out of all.*
const jsNames = names.filter((n) => inAllBundle(n) && existsSync(join(SRC_COMPONENTS, n, `${n}.ts`)));
mkdirSync(TMP, { recursive: true });
const entry = join(TMP, 'all-entry.ts');
writeFileSync(
  entry,
  [`import '../src/core/index.ts';`, ...jsNames.map((n) => `import '../src/components/${n}/${n}.ts';`)].join('\n') +
    '\n',
);

const result = await Bun.build({
  entrypoints: [entry],
  outdir: DIST_COMPONENTS,
  naming: 'all.js',
  format: 'esm',
  target: 'browser',
  sourcemap: 'external',
  minify: false,
});
if (!result.success) {
  console.error('bundle: Bun.build failed:');
  for (const log of result.logs) console.error(`  ${log}`);
  process.exit(1);
}
// Bun.build drops comments - also the `/* @vite-ignore */` the sources put in
// a dynamic import() of a runtime URL (mermaid's vendor build). Without it a
// consumer's Vite warns "The above dynamic import cannot be analyzed" for
// all.js; put it back on every import() whose argument is not a literal.
restoreViteIgnore(join(DIST_COMPONENTS, 'all.js'));
// Bun.build writes all.js.map but only stamps a debugId comment - link the map
// explicitly (must be the LAST line of the file)
linkSourceMap(join(DIST_COMPONENTS, 'all.js'), 'all.js.map');
stampProvenance(join(DIST_COMPONENTS, 'all.js')); // §6 provenance pointer

// NOTICE.txt: the human-readable per-release provenance notice (§6)
writeFileSync(join(DIST_COMPONENTS, 'NOTICE.txt'), provenanceNotice(PROVENANCE));

// 1b. core.css (plans/core-bundle.md): the modular path's fixed CSS cost —
//     the four theme utility sheets a pick-what-you-need consumer otherwise
//     links individually, concatenated in FIXED order (tokens first: every
//     later sheet reads var(--*); sizing → layout → accessibility). Concat is
//     safe for the same reasons all.css is: @layer + flat specificity +
//     runtime token resolution. Lives beside core.js (not dist/core/): the
//     two are one install pair and the docs/README already reference
//     components/core.js - divergence recorded in the plan.
const CORE_CSS_SHEETS = [
  'default-semantic-tokens.css',
  'sizing.css',
  'layout.css',
  'accessibility.css',
] as const;
const coreCss = CORE_CSS_SHEETS.map(
  (f) =>
    `/* ── theme/utils/${f} ── */\n` +
    readFileSync(join(ROOT, 'src', 'theme', 'utils', f), 'utf8').trimEnd(),
).join('\n\n');
writeFileSync(join(DIST_COMPONENTS, 'core.css'), `${coreCss}\n`);

// 2. CSS bundle: every component stylesheet, alphabetical, with a header per
//    section so the readable file stays navigable.
const css = names
  .filter((n) => inAllBundle(n) && existsSync(join(SRC_COMPONENTS, n, `${n}.css`)))
  .map(
    (n) =>
      `/* ── components/${n}/${n}.css ── */\n` +
      readFileSync(join(SRC_COMPONENTS, n, `${n}.css`), 'utf8').trimEnd(),
  )
  .join('\n\n');
writeFileSync(join(DIST_COMPONENTS, 'all.css'), `${css}\n`);

/**
 * A members-only bundle: {outDir}/{name}.css (+ .js when a member has JS).
 * No core payload, no shared layer - like a per-component .js, it binds to
 * the df$ runtime all.js / core.js installed, so a page loads it after one
 * of them. The JS is bundled from the BOUND dist files (build.ts replaced
 * their shared import with the df$.shadcn.shared binding): bundling the src
 * would embed a second copy of the shared layer instead of using the
 * installed one.
 */
async function buildMembersBundle(outDir: string, name: string, members: readonly string[]): Promise<void> {
  const scripts = members.filter((n) => existsSync(join(DIST_COMPONENTS, n, `${n}.js`)));
  if (scripts.length) {
    const bundleEntry = join(TMP, `${name}-entry.ts`);
    writeFileSync(bundleEntry, scripts.map((n) => `import '../dist/components/${n}/${n}.js';`).join('\n') + '\n');
    const built = await Bun.build({ entrypoints: [bundleEntry], outdir: outDir, naming: `${name}.js`, format: 'esm', target: 'browser', sourcemap: 'external', minify: false });
    if (!built.success) {
      console.error(`bundle: ${name} Bun.build failed:`);
      for (const log of built.logs) console.error(`  ${log}`);
      process.exit(1);
    }
    restoreViteIgnore(join(outDir, `${name}.js`));
    linkSourceMap(join(outDir, `${name}.js`), `${name}.js.map`);
  }
  writeFileSync(
    join(outDir, `${name}.css`),
    members
      .filter((n) => existsSync(join(SRC_COMPONENTS, n, `${n}.css`)))
      .map((n) => `/* ── components/${n}/${n}.css ── */\n` + readFileSync(join(SRC_COMPONENTS, n, `${n}.css`), 'utf8').trimEnd())
      .join('\n\n') + '\n',
  );
}

// 2b. the extra bundles (scripts/lib/bundles.ts): components too heavy or
//     too specialised for all.* - e.g. wysiwyg.css + wysiwyg.js, the HTML
//     Preview Editor.
for (const [bundle, members] of Object.entries(EXTRA_BUNDLES)) {
  await buildMembersBundle(DIST_COMPONENTS, bundle, members);
  console.log(`bundle: ${bundle}.js + ${bundle}.css (${members.join(', ')}) - kept out of all.*`);
}

// 2c. one bundle per sidebar section (scripts/lib/sections.ts) - the middle
//     ground between all.* and one file per component. Members only, like
//     the extra bundles; a section that IS an extra bundle (WYSIWYG Editors =
//     wysiwyg) was built above. dist/sections/ is rebuilt from scratch so a
//     renamed or removed section leaves no stale file behind.
const DIST_SECTIONS = join(ROOT, 'dist', 'sections');
rmSync(DIST_SECTIONS, { recursive: true, force: true });
mkdirSync(DIST_SECTIONS, { recursive: true });
const sectionList = sections();
for (const s of sectionList) if (s.dir === 'sections') await buildMembersBundle(DIST_SECTIONS, s.name, s.members);
console.log(`bundle: ${sectionList.length} section bundles → dist/sections/ (${sectionList.map((s) => `${s.name} ${s.members.length}`).join(', ')})`);

// 3. one bundle per Application Scaffold (scripts/lib/apps.ts): core + exactly
//    the components the app's markup needs - dist/apps/{app}.css + .js. The
//    full-screen page app-{app}.html loads only these (build-docs.ts), the
//    scaffold-lean e2e proves it renders and behaves as on all.css + all.js,
//    and stats.json publishes the measured sizes: what a real app ships.
const DIST_APPS = join(ROOT, 'dist', 'apps');
mkdirSync(DIST_APPS, { recursive: true });
const plans = appPlans();
for (const app of plans) {
  const appEntry = join(TMP, `app-${app.name}-entry.ts`);
  const scripts = app.components.filter((n) => existsSync(join(SRC_COMPONENTS, n, `${n}.ts`)));
  writeFileSync(appEntry, [`import '../src/core/index.ts';`, ...scripts.map((n) => `import '../src/components/${n}/${n}.ts';`)].join('\n') + '\n');
  const built = await Bun.build({ entrypoints: [appEntry], outdir: DIST_APPS, naming: `${app.name}.js`, format: 'esm', target: 'browser', sourcemap: 'external', minify: false });
  if (!built.success) {
    console.error(`bundle: app ${app.name} Bun.build failed:`);
    for (const log of built.logs) console.error(`  ${log}`);
    process.exit(1);
  }
  const file = join(DIST_APPS, `${app.name}.js`);
  restoreViteIgnore(file);
  linkSourceMap(file, `${app.name}.js.map`);
  stampProvenance(file);
  const sheets = app.components.filter((n) => existsSync(join(SRC_COMPONENTS, n, `${n}.css`)));
  writeFileSync(
    join(DIST_APPS, `${app.name}.css`),
    `/* ${app.slug}: core.css + the ${app.components.length} components its markup uses (${app.components.join(', ')}) - generated by scripts/bundle.ts */\n${coreCss}\n\n` +
      sheets.map((n) => `/* ── components/${n}/${n}.css ── */\n` + readFileSync(join(SRC_COMPONENTS, n, `${n}.css`), 'utf8').trimEnd()).join('\n\n') + '\n',
  );
}
console.log(`bundle: ${plans.length} app bundles → dist/apps/ (${plans.map((p) => `${p.name} ${p.components.length}`).join(', ')})`);

console.log(
  `bundle: core.js (+ map, morph+query+shared) + core.css (${CORE_CSS_SHEETS.length} theme sheets) → all.js (+ map, core first) + all.css (${names.length} component CSS)`,
);
