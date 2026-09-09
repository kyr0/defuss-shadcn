/**
 * Why: the minify pass (scripts/minify.ts) and tsc (sourceMap) write derived
 * twins next to every shipped file. verify's `dist 1:1` orphan check, the
 * `minified artifacts` gate and the fingerprint hashing in inputs.ts all need
 * to recognize those as GENERATED, not orphans. Pure module (no fs/native
 * bindings) so tests/minify.test.ts can pin the contract in browser mode —
 * same split as scripts/lib/changelog.ts.
 */

/** Files derived from a source file: minified twins + JavaScript source maps. */
export const DERIVED_ARTIFACT = /\.(min\.css|min\.js|js\.map)$/;

/**
 * The single-file bundle (scripts/bundle.ts → minify.ts twins). These three
 * are generated yet NOT matched by DERIVED_ARTIFACT: all.css/all.js have no
 * src/ counterpart at all, and all.min.css.map is the system's only CSS source
 * map (the regex predates it). verify's `dist 1:1` orphan check allow-lists
 * them next to STATS_FILE. Kept OUT of isDerivedArtifact: minify.ts uses that
 * to skip re-minifying twins, and all.js/all.css must still be minified.
 */
export const BUNDLE_ARTIFACTS: ReadonlySet<string> = new Set([
  'components/all.css',
  'components/all.js',
  'components/all.min.css.map',
]);

/** True for `x.min.css`, `x.min.js`, `x.js.map` and `x.min.js.map`. */
export function isDerivedArtifact(relPath: string): boolean {
  return DERIVED_ARTIFACT.test(relPath);
}

/**
 * Every shipped component file must have its minified twin (CSS: one; JS: min
 * + both source maps, per AGENTS.md — the Installation page advertises them,
 * so a missing twin is user-facing breakage). `present` = dist-relative paths
 * that exist non-empty. Returns human-readable problem lines; empty = OK.
 */
export function minifyArtifactProblems(present: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  for (const rel of present) {
    const m = rel.match(/^components\/([^/]+)\/\1\.(css|js)$/);
    if (!m) continue;
    // strip exactly `.{ext}` (3 or 4 chars) — a fixed slice(0,-4) would eat a
    // character of every .js component name
    const base = rel.slice(0, -(m[2].length + 1));
    const required =
      m[2] === 'css'
        ? [`${base}.min.css`]
        : [`${base}.min.js`, `${base}.js.map`, `${base}.min.js.map`];
    for (const need of required) if (!present.has(need)) problems.push(`dist/${need} missing`);
  }
  return problems.sort();
}
