#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { provenancePointer } from './lib/provenance.ts';
import { collectProvenance } from './lib/provenance-files.ts';
import { join, relative } from 'node:path';
import { minifySync } from 'oxc-minify';
import { viteIgnore } from './lib/vite-ignore.ts';
import { transform } from 'lightningcss';
import { walk } from './lib/audit.ts';
import { EXTRA_BUNDLES } from './lib/bundles.ts';
import { isDerivedArtifact } from './lib/minify.ts';

/**
 * Why: consumers ship readable files for debugging and request no bundle step,
 * but production pages want tiny payloads. Post-pass over the freshly built
 * dist/ writes per-component minified twins - `*.min.js` + `*.min.js.map`
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
// the generated bundles beside dist/components/ ship min twins like all.*
// does: the per-app bundles (bundle.ts step 3) and the section bundles (2c).
// VERIFIED: (verify `minified artifacts`) every section .css/.js has them
const APPS = join(ROOT, 'dist', 'apps');
const SECTIONS = join(ROOT, 'dist', 'sections');
const dirFiles = (dir: string, exts: string[]): string[] => (existsSync(dir) ? walk(dir, exts) : []);
const appFiles = (exts: string[]): string[] => dirFiles(APPS, exts);
const bundleDirFiles = (exts: string[]): string[] => [...appFiles(exts), ...dirFiles(SECTIONS, exts)];

// 1. JS: oxc minifySync - sourcemap maps min → the shipped readable .js
//    (which its own tsc map then maps back to the .ts source).
// mangle without `toplevel`: inner names get minified, but module top-level
// names stay (the exports are the public State API contract - AGENTS.md).
// Derived twins are skipped so re-running `make minify` stays idempotent
// (never re-minifies a .min.js into a .min.min.js).
const jsFiles = [...walk(COMPONENTS, ['.js']), ...bundleDirFiles(['.js'])].filter((f) => !isDerivedArtifact(f));
// §6 provenance: oxc drops comments, so the min twins of the two RUNTIME
// bundles (they embed defuss-morph + defuss-query) get the pointer re-stamped
// after minification - every shipped copy of the runtime carries its notice.
const RUNTIME_MIN = new Set([join(COMPONENTS, 'core.min.js'), join(COMPONENTS, 'all.min.js'), ...appFiles(['.js']).filter((f) => !isDerivedArtifact(f)).map((f) => f.replace(/\.js$/, '.min.js'))]);
const PROVENANCE_POINTER = provenancePointer(collectProvenance(ROOT));
for (const file of jsFiles) {
  const source = readFileSync(file, 'utf8');
  const minName = file.slice(file.lastIndexOf('/') + 1, -3);
  const result = minifySync(relative(ROOT, file), source, {
    module: true, // shipped as <script type="module"> - keep import/export semantics
    compress: true,
    mangle: true,
    sourcemap: true,
  });
  if (result.errors.length || !result.map) {
    console.error(`minify: ${relative(ROOT, file)}:`, result.errors);
    process.exit(1);
  }
  const minPath = file.replace(/\.js$/, '.min.js');
  // devtools resolve map.sources relative to the .map's URL - point at the
  // sibling readable .js by basename (oxc emits the ROOT-relative input path)
  // oxc drops comments: put the vite-ignore hint back on dynamic imports of a URL (map shifted to match)
  const hinted = viteIgnore(result.code, result.map.mappings);
  const map = { ...result.map, mappings: hinted.mappings, file: `${minName}.min.js`, sources: [`${minName}.js`] };
  // the comment must START a line - oxc's codegen may omit the trailing newline
  const code = hinted.code.endsWith('\n') ? hinted.code : `${hinted.code}\n`;
  const provenance = RUNTIME_MIN.has(minPath) ? `${PROVENANCE_POINTER}\n` : '';
  writeFileSync(minPath, `${code}${provenance}//# sourceMappingURL=${minName}.min.js.map\n`);
  writeFileSync(`${minPath}.map`, JSON.stringify(map));
}

// 2. CSS: lightningcss minify - no lowering targets given, so modern author
//    features (@layer, nesting, anchor positioning) pass through untouched.
const cssFiles = [...walk(COMPONENTS, ['.css']), ...bundleDirFiles(['.css'])].filter((f) => !isDerivedArtifact(f));
// the generated bundles (all.css, core.css) also ship a CSS source map —
// they're the files consumers debug in production (permissive map: the
// concat has no own map; lightningcss maps minified→concat, which is the
// readable bundle shipped next to it)
const MAPPED_BUNDLES = new Set([join(COMPONENTS, 'all.css'), join(COMPONENTS, 'core.css'), ...Object.keys(EXTRA_BUNDLES).map((b) => join(COMPONENTS, `${b}.css`)), ...cssFiles.filter((f) => f.startsWith(APPS) || f.startsWith(SECTIONS))]);
for (const file of cssFiles) {
  const withMap = MAPPED_BUNDLES.has(file);
  const { code, map } = transform({
    filename: relative(ROOT, file),
    code: Buffer.from(readFileSync(file)),
    minify: true,
    sourceMap: withMap,
  });
  const minPath = file.replace(/\.css$/, '.min.css');
  const mapName = `${file.slice(file.lastIndexOf('/') + 1, -4)}.min.css.map`;
  writeFileSync(minPath, withMap ? `${code}/*# sourceMappingURL=${mapName} */` : code);
  if (withMap && map) writeFileSync(`${minPath}.map`, map);
}

const pct = (a: number, b: number) => `${Math.round((100 * a) / b)}%`;
const bytes = (files: string[]) => files.reduce((n, f) => n + readFileSync(f).byteLength, 0);
const all = [...jsFiles, ...cssFiles];
const mins = [...walk(COMPONENTS, ['.min.js', '.min.css']), ...bundleDirFiles(['.min.js', '.min.css'])];
console.log(
  `minify: ${jsFiles.length} JS → .min.js + .min.js.map, ${cssFiles.length} CSS → .min.css ` +
    `(${bytes(all)} → ${bytes(mins)} bytes, ${pct(bytes(mins), bytes(all))})`,
);
