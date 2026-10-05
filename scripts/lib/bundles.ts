/**
 * Why: a few components are too heavy, or too specialised, to ride in the
 * all.css / all.js bundle every page pays for. They ship in an EXTRA bundle
 * instead - dist/components/{bundle}.css + .js (+ the min twins and maps
 * minify.ts derives) - which a page includes AFTER all.* (or core + its
 * components) when it uses them. The extra bundle carries only its
 * components: it binds to the df$ runtime all.js / core.js installed, like a
 * per-component .js does.
 *
 * One list, read by bundle.ts (what goes where), verify.ts (all.js lacks
 * them, the extra bundle carries them, doc pages load it) and stats-files.ts
 * (the bundle is measured on its own). Pure data, no fs.
 */
export const EXTRA_BUNDLES: Readonly<Record<string, readonly string[]>> = {
  // the HTML Preview Editor (editor + sandboxed live preview + device
  // toolbar) - the WYSIWYG Editors section
  wysiwyg: ['code-example'],
};

/** The extra bundle a component ships in, or null when it rides in all.*. */
export function extraBundleOf(component: string): string | null {
  for (const [bundle, members] of Object.entries(EXTRA_BUNDLES)) if (members.includes(component)) return bundle;
  return null;
}

/** True when the component is part of the all.css / all.js bundle. */
export const inAllBundle = (component: string): boolean => extraBundleOf(component) === null;

/** dist-relative paths of the extra bundles' generated files (not their derived min twins / js maps). */
export const extraBundleArtifacts = (): string[] =>
  Object.keys(EXTRA_BUNDLES).flatMap((b) => [`components/${b}.css`, `components/${b}.js`, `components/${b}.min.css.map`]);
