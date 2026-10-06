/**
 * Why: `bun run e2e` drove every Playwright file on every run - 240+ browsers
 * for a change to one component. Each e2e file now declares what it exercises
 * through what it loads, and runs again only when one of those inputs
 * changed (or its last run did not pass):
 *
 * - the test file and its fixture(s), the shared e2e helpers, the lockfile
 *   (Playwright's version);
 * - the sources behind every dist/ file the test or a fixture loads: a
 *   component's own folder for components/<name>/<name>.(js|css), core + the
 *   shared layer + the theme for core.*, for all.* core + the components the
 *   fixture's markup actually uses (the same class / hook / namespace analysis
 *   as the per-app bundles - scripts/lib/apps.ts), code-example for wysiwyg.*;
 * - a test that loads the documentation site (or a full-screen app) depends
 *   on everything that renders the site: all of src/ and scripts/.
 *
 * Pure: the caller reads the files and hashes the inputs (tests/e2e/run.ts).
 * A path ending in "/" is a directory prefix.
 */

/** what every component fixture's runtime is built from */
export const CORE_INPUTS = ['src/core/', 'src/shared/', 'src/theme/', 'scripts/build.ts', 'scripts/bundle.ts', 'scripts/minify.ts', 'scripts/templates/', 'scripts/lib/bundles.ts', 'package.json', 'tsconfig.json'];
/** what renders the documentation site - everything */
export const SITE_INPUTS = ['src/', 'scripts/', 'package.json', 'tsconfig.json'];
/** every e2e file shares these */
export const SHARED_INPUTS = ['tests/e2e/lib/', 'tests/e2e/server.ts', 'bun.lock'];

export interface E2eSource {
  /** the test's name: tests/e2e/<name>.e2e.ts */
  name: string;
  /** the test file's text */
  test: string;
  /** the fixtures it loads: file name → text */
  fixtures: Record<string, string>;
  /** the components a piece of markup uses (scripts/lib/apps.ts resolver) */
  componentsOf: (markup: string) => string[];
  /** is there a src/components/<name>/ */
  isComponent: (name: string) => boolean;
}

/** The fixture files a test text names (`x.e2e-fixture.html`). */
export const fixturesNamed = (text: string): string[] => [...new Set([...text.matchAll(/([a-z0-9-]+\.e2e-fixture\.html)/g)].map((m) => m[1]))];

/** The inputs of one e2e file - sorted repo paths, "dir/" for a directory. */
export function e2eInputs(src: E2eSource): string[] {
  const out = new Set<string>([`tests/e2e/${src.name}.e2e.ts`, ...SHARED_INPUTS]);
  const add = (list: string[]) => list.forEach((p) => out.add(p));
  const component = (c: string) => {
    if (src.isComponent(c)) out.add(`src/components/${c}/`);
  };
  for (const f of Object.keys(src.fixtures)) out.add(`tests/e2e/${f}`);
  const texts = [src.test, ...Object.values(src.fixtures)];
  const all = texts.join('\n');
  let known = false;
  // the documentation site or a full-screen app: everything that renders it
  if (/dist\/documentation\/|documentation\/[a-z0-9-]+\.html|dist\/apps\/|documentation\.e2e|openDocPage/.test(all)) {
    add(SITE_INPUTS);
    known = true;
  }
  for (const m of all.matchAll(/dist\/components\/([a-z0-9-]+)\/\1(?:\.min)?\.(?:js|css)/g)) {
    component(m[1]);
    add(CORE_INPUTS);
    known = true;
  }
  for (const m of all.matchAll(/dist\/components\/(all|core|wysiwyg)(?:\.min)?\.(?:js|css)/g)) {
    add(CORE_INPUTS);
    known = true;
    if (m[1] === 'wysiwyg') component('code-example');
    if (m[1] === 'all') for (const fx of Object.values(src.fixtures)) src.componentsOf(fx).forEach(component);
  }
  if (/dist\/theme\//.test(all)) {
    out.add('src/theme/');
    known = true;
  }
  // the component the test is named after (accordion.e2e.ts → accordion)
  component(src.name);
  // nothing recognised: be safe, it depends on everything
  if (!known) add(SITE_INPUTS);
  return [...out].sort();
}

/** Does a repo path fall under one of the inputs? */
export const coveredBy = (path: string, inputs: readonly string[]): boolean =>
  inputs.some((i) => (i.endsWith('/') ? path.startsWith(i) : path === i));
