/**
 * Why: `bun run e2e` drove every Playwright file on every run - 240+ browsers
 * for a change to one component. Each e2e file now declares what it exercises
 * through what it loads, and runs again only when one of those inputs
 * changed (or its last run did not pass):
 *
 * - the test file and its fixture(s), the shared e2e helpers, the lockfile
 *   (Playwright's version);
 * - the BUILT files the test or a fixture loads, as the browser gets them:
 *   dist/components/<name>/ for components/<name>/<name>.(js|css), core.js +
 *   core.css for core.*, dist/theme/ for the theme; for all.* core + the
 *   folders of the components the fixture's markup actually uses (the same
 *   class / hook / namespace analysis as the per-app bundles -
 *   scripts/lib/apps.ts) + the bundling step, an extra bundle's members for
 *   that bundle (code-example + editorjs for wysiwyg.*). Not
 *   the sources: a source edit that builds to the same bytes (a comment) runs
 *   nothing, and one tested before its rebuild runs again once the rebuild
 *   changes what the browser loads. The component a test is named after adds
 *   its source folder too (a test may read its skill or schema);
 * - a test that loads the documentation site (or a full-screen app) depends
 *   on everything that renders the site: all of src/ and scripts/.
 *
 * Pure: the caller reads the files and hashes the inputs (tests/e2e/run.ts).
 * A path ending in "/" is a directory prefix.
 */

import { EXTRA_BUNDLES } from './bundles.ts';

/** the built core every component fixture runs on (VERIFIED: a comment edit in src/shared/ built byte-identical
 *  core.js / all.js / core.min.js, yet selected all 261 files while the sources were the input) */
export const CORE_INPUTS = ['dist/components/core.js', 'dist/components/core.css'];
/** the bundling step of all.* and the extra bundles - it can change a bundle without changing core or a component's
 *  folder; the extra bundles' member lists live in the docs lib (scripts/lib/bundles.ts re-exports them) */
export const BUNDLE_INPUTS = ['scripts/bundle.ts', 'scripts/lib/bundles.ts', 'src/documentation/lib/extra-bundles.ts', 'scripts/templates/'];
/** the bundle files a fixture can load from dist/components/: core, all and every extra bundle */
const BUNDLE_FILE = new RegExp(`dist/components/(all|core|${Object.keys(EXTRA_BUNDLES).join('|')})(?:\\.min)?\\.(?:js|css)`, 'g');
/** what renders the documentation site - everything */
export const SITE_INPUTS = ['src/', 'scripts/', 'package.json', 'tsconfig.json'];
/** every e2e file shares these */
export const SHARED_INPUTS = ['tests/e2e/lib/', 'tests/e2e/server.ts', 'bun.lock'];

/**
 * The bytes of an input that can decide a test. package.json counts without its `scripts`: no e2e test runs a
 * package script (they start node / bun on files), and the build reads no field of it (the release version is
 * src/shared/version.ts, the dependencies are pinned by bun.lock) - yet every component's inputs name it
 * (CORE_INPUTS), so a script edit re-ran all ~260 files (~8.5 min). Any other file: as it is.
 */
export function inputContent(rel: string, bytes: Uint8Array): Uint8Array | string {
  if (rel !== 'package.json') return bytes;
  try {
    const { scripts: _scripts, ...rest } = JSON.parse(new TextDecoder().decode(bytes));
    return JSON.stringify(rest);
  } catch {
    return bytes;
  }
}

export interface E2eSource {
  /** the test's name: tests/e2e/<folder>/<name>.e2e.ts (the folder: e2eFolder) */
  name: string;
  /** the test file's text */
  test: string;
  /** the fixtures it loads: file name → text */
  fixtures: Record<string, string>;
  /** the components a piece of markup uses (scripts/lib/apps.ts resolver) */
  componentsOf: (markup: string) => string[];
  /** a component's repo-relative folder (src/components/<section>/<name>/), undefined when there is none */
  componentDir: (name: string) => string | undefined;
}

/** The fixture files a test text names (`x.e2e-fixture.html`). */
export const fixturesNamed = (text: string): string[] => [...new Set([...text.matchAll(/([a-z0-9-]+\.e2e-fixture\.html)/g)].map((m) => m[1]))];

/**
 * The folder of an e2e file under tests/e2e/: the section of the component it
 * is named after (tests/e2e/overlays/accordion.e2e.ts, like
 * src/components/overlays/accordion/), `site` for every other test
 * (documentation, scaffold-*, the bundles…). The one layout rule of the e2e
 * tree - verify's `e2e sections` gate, the runner and css-smoke ask here.
 */
export const e2eFolder = (name: string, sectionOf: (n: string) => string | undefined): string => sectionOf(name) ?? 'site';

/** a component's section from its repo-relative folder (`src/components/<section>/<name>/`) */
const sectionFromDir = (dir: string | undefined): string | undefined => dir?.split('/')[2];

/** The inputs of one e2e file - sorted repo paths, "dir/" for a directory. */
export function e2eInputs(src: E2eSource): string[] {
  // VERIFIED: a test sits in tests/e2e/<section>/ (its component's section) or site/ - verify's `e2e sections` gate names the move
  const folder = e2eFolder(src.name, (n) => sectionFromDir(src.componentDir(n)));
  const out = new Set<string>([`tests/e2e/${folder}/${src.name}.e2e.ts`, ...SHARED_INPUTS]);
  const add = (list: string[]) => list.forEach((p) => out.add(p));
  /** a component's built folder (dist/ is flat: dist/components/<name>/) */
  const built = (c: string) => {
    if (src.componentDir(c)) out.add(`dist/components/${c}/`);
  };
  for (const f of Object.keys(src.fixtures)) out.add(`tests/e2e/${folder}/${f}`);
  const texts = [src.test, ...Object.values(src.fixtures)];
  const all = texts.join('\n');
  let known = false;
  // a docs asset a fixture shows (a sample photo, a video): that file - public/ is copied verbatim, nothing renders it.
  // VERIFIED: 38 block, guide and deck fixtures counted as site tests for their images alone
  const ASSET = /dist\/documentation\/((?:images|videos|fonts|files)\/[A-Za-z0-9._/-]+)/g;
  for (const m of all.matchAll(ASSET)) {
    out.add(`dist/documentation/${m[1]}`);
    known = true;
  }
  // the documentation site or a full-screen app: everything that renders it
  if (/dist\/documentation\/|documentation\/[a-z0-9-]+\.html|dist\/apps\/|documentation\.e2e|openDocPage/.test(all.replace(ASSET, ''))) {
    add(SITE_INPUTS);
    known = true;
  }
  for (const m of all.matchAll(/dist\/components\/([a-z0-9-]+)\/\1(?:\.min)?\.(?:js|css)/g)) {
    built(m[1]);
    add(CORE_INPUTS);
    known = true;
  }
  for (const m of all.matchAll(BUNDLE_FILE)) {
    add(CORE_INPUTS);
    known = true;
    if (m[1] !== 'core') add(BUNDLE_INPUTS);
    for (const member of EXTRA_BUNDLES[m[1]] ?? []) built(member);
    if (m[1] === 'all') for (const fx of Object.values(src.fixtures)) src.componentsOf(fx).forEach(built);
  }
  if (/dist\/theme\//.test(all)) {
    out.add('dist/theme/');
    known = true;
  }
  // the component the test is named after (accordion.e2e.ts → accordion): its build and its sources
  built(src.name);
  const own = src.componentDir(src.name);
  if (own) out.add(own);
  // nothing recognised: be safe, it depends on everything
  if (!known) add(SITE_INPUTS);
  return [...out].sort();
}

/** Does a repo path fall under one of the inputs? */
export const coveredBy = (path: string, inputs: readonly string[]): boolean =>
  inputs.some((i) => (i.endsWith('/') ? path.startsWith(i) : path === i));
