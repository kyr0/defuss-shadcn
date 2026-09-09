#!/usr/bin/env bun
import { mkdirSync, readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Why: doc pages (and CDN consumers who want everything) used to carry 68
 * component <link> tags + 27 module <script> tags. This step ships a single
 * bundle instead — dist/components/all.css + all.js — so pages include one
 * stylesheet and one module script. The per-component files stay shipped for
 * pick-what-you-need installs; verify's `cross-page imports` gate mandates the
 * bundle includes on every doc page.
 *
 * JS: bundled from the src/*.ts modules with Bun.build (NOT string
 * concatenation — every component module redeclares `const _defussShadcn`,
 * `function init()`, etc., which only stays valid inside real module scopes;
 * bundling from src/ also keeps one shared copy of state-api.ts instead of 27
 * inlined ones). The readable all.js + all.js.map maps back to the .ts
 * sources; minify.ts then derives all.min.js + all.min.js.map like for any
 * other dist/components/*.js.
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

const names = readdirSync(SRC_COMPONENTS, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();
if (names.length === 0) {
  console.error('bundle: no components found under src/components/');
  process.exit(1);
}

// 1. JS bundle: one side-effect import per interactive component (each module
//    self-initializes + registers its own MutationObserver on import).
const jsNames = names.filter((n) => existsSync(join(SRC_COMPONENTS, n, `${n}.ts`)));
mkdirSync(TMP, { recursive: true });
const entry = join(TMP, 'all-entry.ts');
writeFileSync(
  entry,
  jsNames.map((n) => `import '../src/components/${n}/${n}.ts';`).join('\n') + '\n',
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
const allJs = join(DIST_COMPONENTS, 'all.js');
writeFileSync(
  allJs,
  `${readFileSync(allJs, 'utf8').trimEnd()}\n//# sourceMappingURL=all.js.map\n`,
);

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

console.log(`bundle: ${jsNames.length} JS modules → all.js (+ map), ${names.length} CSS → all.css`);
