#!/usr/bin/env bun
import { mkdirSync, readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { provenanceNotice, provenancePointer } from './lib/provenance.ts';
import { collectProvenance } from './lib/provenance-files.ts';

/**
 * Why: doc pages (and CDN consumers who want everything) used to carry 68
 * component <link> tags + 27 module <script> tags. This step ships a single
 * bundle instead — dist/components/all.css + all.js — so pages include one
 * stylesheet and one module script. The per-component files stay shipped for
 * pick-what-you-need installs; verify's `cross-page imports` gate mandates the
 * bundle includes on every doc page.
 *
 * JS: bundled from the src/*.ts modules with Bun.build (NOT string
 * concatenation — every component module redeclares `const df$`,
 * `function init()`, etc., which only stays valid inside real module scopes;
 * bundling from src/ also keeps one shared copy of the shared layer instead
 * of one per component). The readable all.js + all.js.map maps back to the
 * .ts sources; minify.ts then derives all.min.js + all.min.js.map like for
 * any other dist/components/*.js.
 *
 * core.js (plans/defuss-query-morph-integration.md §2.3/§2.6): the same inputs as
 * all.js minus the components — one defuss-morph + one defuss-query + the
 * defuss-shadcn-shared layer behind the guarded bootstrap of src/core/
 * index.ts. all.js embeds the SAME core payload first (its entry imports
 * src/core/index.ts before any component), so "all alone" and "core +
 * selected components" run byte-identical runtime code; a second copy never
 * loads (the bootstrap rejects an existing df$).
 *
 * CSS: concatenation is safe because every component stylesheet lives in
 * `@layer components` with flat-specificity, prefixed class selectors and
 * resolves tokens via var(--*) at runtime — source order is not load-bearing,
 * so alphabetical (deterministic) order is fine. all.min.css (+ the one
 * .min.css.map in the system) is derived by minify.ts.
 *
 * Runs after build.ts (dist/ exists) and before minify.ts in both the
 * `build` and `docs` script chains.
 */

const ROOT = join(import.meta.dirname, '..');
const SRC_COMPONENTS = join(ROOT, 'src', 'components');
const DIST_COMPONENTS = join(ROOT, 'dist', 'components');
const TMP = join(ROOT, 'tmp');

// per-release provenance (§6): the core artifacts embed defuss-morph +
// defuss-query, so the MIT attribution ships INSIDE them — a pointer comment
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

/** stamp the sourceMappingURL comment — must be the LAST line of the file */
function linkSourceMap(file: string, mapName: string): void {
  writeFileSync(file, `${readFileSync(file, 'utf8').trimEnd()}\n//# sourceMappingURL=${mapName}\n`);
}

// 1. core bundle: morph + query + shared behind the guarded bootstrap — the
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
//    df$.shadcn.shared before any component evaluates — §2.6 step 4), then
//    one side-effect import per interactive component (each module
//    self-initializes + registers its own MutationObserver on import).
const jsNames = names.filter((n) => existsSync(join(SRC_COMPONENTS, n, `${n}.ts`)));
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
// Bun.build writes all.js.map but only stamps a debugId comment — link the map
// explicitly (must be the LAST line of the file)
linkSourceMap(join(DIST_COMPONENTS, 'all.js'), 'all.js.map');
stampProvenance(join(DIST_COMPONENTS, 'all.js')); // §6 provenance pointer

// NOTICE.txt: the human-readable per-release provenance notice (§6)
writeFileSync(join(DIST_COMPONENTS, 'NOTICE.txt'), provenanceNotice(PROVENANCE));

// 2. CSS bundle: every component stylesheet, alphabetical, with a header per
//    section so the readable file stays navigable.
const css = names
  .filter((n) => existsSync(join(SRC_COMPONENTS, n, `${n}.css`)))
  .map(
    (n) =>
      `/* ── components/${n}/${n}.css ── */\n` +
      readFileSync(join(SRC_COMPONENTS, n, `${n}.css`), 'utf8').trimEnd(),
  )
  .join('\n\n');
writeFileSync(join(DIST_COMPONENTS, 'all.css'), `${css}\n`);

console.log(
  `bundle: core.js (+ map, morph+query+shared), ${jsNames.length} component JS modules → all.js (+ map, core first), ${names.length} CSS → all.css`,
);
