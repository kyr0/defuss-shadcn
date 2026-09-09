#!/usr/bin/env bun
import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { minifySync } from 'oxc-minify';
import { transform } from 'lightningcss';
import { walk } from './lib/audit.ts';
import { isDerivedArtifact } from './lib/minify.ts';

/**
 * Why: consumers ship readable files for debugging and request no bundle step,
 * but production pages want tiny payloads. Post-pass over the freshly built
 * dist/ writes per-component minified twins — `*.min.js` + `*.min.js.map`
 * (oxc-minify, on top of the tsc-emitted `*.js.map`) and `*.min.css`
 * (lightningcss). Runs after build.ts, never touches src/; verify's
 * `minified artifacts` gate makes shipping without them a build failure.
 *
 * Scope is dist/components/ only: doc-site assets are dev-facing by design,
 * and the token file must stay verbatim (verify's `dist 1:1` byte-compares it
 * against src/).
 */

const ROOT = join(import.meta.dirname, '..');
const COMPONENTS = join(ROOT, 'dist', 'components');

// 1. JS: oxc minifySync — sourcemap maps min → the shipped readable .js
//    (which its own tsc map then maps back to the .ts source).
// mangle without `toplevel`: inner names get minified, but module top-level
// names stay (the exports are the public State API contract — AGENTS.md).
// Derived twins are skipped so re-running `make minify` stays idempotent
// (never re-minifies a .min.js into a .min.min.js).
const jsFiles = walk(COMPONENTS, ['.js']).filter((f) => !isDerivedArtifact(f));
for (const file of jsFiles) {
  const source = readFileSync(file, 'utf8');
  const minName = file.slice(file.lastIndexOf('/') + 1, -3);
  const result = minifySync(relative(ROOT, file), source, {
    module: true, // shipped as <script type="module"> — keep import/export semantics
    compress: true,
    mangle: true,
    sourcemap: true,
  });
  if (result.errors.length || !result.map) {
    console.error(`minify: ${relative(ROOT, file)}:`, result.errors);
    process.exit(1);
  }
  const minPath = file.replace(/\.js$/, '.min.js');
  // devtools resolve map.sources relative to the .map's URL — point at the
  // sibling readable .js by basename (oxc emits the ROOT-relative input path)
  const map = { ...result.map, file: `${minName}.min.js`, sources: [`${minName}.js`] };
  // the comment must START a line — oxc's codegen may omit the trailing newline
  const code = result.code.endsWith('\n') ? result.code : `${result.code}\n`;
  writeFileSync(minPath, `${code}//# sourceMappingURL=${minName}.min.js.map\n`);
  writeFileSync(`${minPath}.map`, JSON.stringify(map));
}

// 2. CSS: lightningcss minify — no lowering targets given, so modern author
//    features (@layer, nesting, anchor positioning) pass through untouched.
const cssFiles = walk(COMPONENTS, ['.css']).filter((f) => !isDerivedArtifact(f));
for (const file of cssFiles) {
  // the single-file bundle (bundle.ts) is the one artifact that also ships a
  // CSS source map — it's the file consumers debug in production
  const withMap = file === join(COMPONENTS, 'all.css');
  const { code, map } = transform({
    filename: relative(ROOT, file),
    code: Buffer.from(readFileSync(file)),
    minify: true,
    sourceMap: withMap,
  });
  const minPath = file.replace(/\.css$/, '.min.css');
  writeFileSync(
    minPath,
    withMap ? `${code}/*# sourceMappingURL=all.min.css.map */` : code,
  );
  if (withMap && map) writeFileSync(`${minPath}.map`, map);
}

const pct = (a: number, b: number) => `${Math.round((100 * a) / b)}%`;
const bytes = (files: string[]) => files.reduce((n, f) => n + readFileSync(f).byteLength, 0);
const all = [...jsFiles, ...cssFiles];
const mins = walk(COMPONENTS, ['.min.js', '.min.css']);
console.log(
  `minify: ${jsFiles.length} JS → .min.js + .min.js.map, ${cssFiles.length} CSS → .min.css ` +
    `(${bytes(all)} → ${bytes(mins)} bytes, ${pct(bytes(mins), bytes(all))})`,
);
