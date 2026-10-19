/**
 * Why: the extra bundles - components kept out of all.* - for the build
 * scripts. The list itself lives in the docs lib
 * (src/documentation/lib/extra-bundles.ts), because the docs SSG loads a
 * bundle on the pages that use it and cannot import scripts/; this module
 * re-exports it, so bundle.ts, verify.ts, stats-files.ts and sections.ts read
 * the one list. Pure data, no fs.
 *
 * VERIFIED: (verify `artifact contract`, 2026-10-13 build) all.js embeds no
 * member of an extra bundle, and each extra bundle exactly its members.
 */
import { EXTRA_BUNDLES } from '../../src/documentation/lib/extra-bundles.ts';

export { bundlesUsedIn, EXTRA_BUNDLES, extraBundleOf, inAllBundle } from '../../src/documentation/lib/extra-bundles.ts';

/** dist-relative paths of the extra bundles' generated files (not their derived min twins / js maps). */
export const extraBundleArtifacts = (): string[] =>
  Object.keys(EXTRA_BUNDLES).flatMap((b) => [`components/${b}.css`, `components/${b}.js`, `components/${b}.min.css.map`]);
