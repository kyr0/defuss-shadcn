#!/usr/bin/env bun
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { parseHTML } from 'linkedom';
import { auditUtilities, walk } from './lib/audit.ts';
import { componentFingerprints, declaredStates } from './lib/inputs.ts';
import { BUNDLE_ARTIFACTS, isDerivedArtifact, minifyArtifactProblems } from './lib/minify.ts';
import { provenanceNotice, provenancePointer } from './lib/provenance.ts';
import { collectProvenance } from './lib/provenance-files.ts';
import { STATS_FILE, statsClaimProblems, type StatsDoc } from './lib/stats.ts';
import { buildStatsFileText } from './lib/stats-files.ts';
import { RELEASE_STAMP, packageVersion, unpinnedRefs } from './lib/mirror.ts';
import {
  changelogProblems,
  changelogDataMarkupProblems,
  FIX_TWO_COMMITS,
  parseChangelogData,
  type CommitInfo,
} from './lib/changelog.ts';
import {
  parseSkillFrontmatter,
  ROOT_SKILL_OUTPUT_FILE,
  ROOT_SKILL_TEMPLATE_FILE,
  SKILL_FRONTMATTER_KEYS,
  SKILL_OUTPUT_FILE,
  SKILL_TEMPLATE_FILE,
} from './lib/skill.ts';
import { readmeCssOnlyProblems } from './lib/readme.ts';
import { ariaDescribedByProblems, fieldDescriptionOwnerProblems, fieldFeatureProblems } from './lib/fields.ts';
import { parseThemes, defaultTokenModes, sidebarContrastProblems, radiusConsistencyProblems } from './lib/contrast.ts';
import { themeCssText, themeFileName, themeJsonText, themeJsonFileName } from './lib/theme-css.ts';
import { buildRootSkillText, buildSkillReferences, buildSkillText } from './lib/skill-files.ts';
import { archBodyHtml } from '../src/documentation/lib/arch-md.ts';
import { typeBadgeHtml, type ComponentType } from './lib/taxonomy.ts';
import { docsDistToSrc, isDocsSsgAuthoringSrc, STANDALONE_DECKS, standaloneDeckFile } from './lib/docs-ssg.ts';
import { markdownLinkProblems, type MdDoc } from './lib/links.ts';
import { versionDrift } from './lib/version-sites.ts';
import {
  exampleFences, exampleFragment, examplePlaceholders,
  findStatesTable,
  isSchemaArtifact,
  parseComponentSchemaText,
  schemaManifestText,
  schemaStatesProblems,
  type ComponentSchema,
} from './lib/schema.ts';

/**
 * Why: one static, fast gate that proves the repo is self-consistent after any
 * change - run automatically at the end of `bun run build`. Every check names
 * the offending file and the fix. Failures exit 1; ⚠ warnings (known gaps,
 * e.g. not every component has an e2e test yet) report but don't fail.
 */

const ROOT = join(import.meta.dirname, '..');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');
const DOCS = join(SRC, 'documentation');
const DOCS_PAGES = join(DOCS, 'pages');
const DOCS_DIST = join(DIST, 'documentation');
const COMPS = join(SRC, 'components');
const E2E = join(ROOT, 'tests/e2e');

let failed = 0;
let warned = 0;

function check(name: string, problems: string[], fix: string, warnOnly = false): void {
  if (problems.length === 0) {
    console.log(`  ✓ ${name}`);
    return;
  }
  if (warnOnly) {
    warned++;
    console.log(`  ⚠ ${name} (${problems.length})`);
  } else {
    failed++;
    console.log(`  ✗ ${name} (${problems.length})`);
  }
  for (const p of problems.slice(0, 5)) console.log(`      ${p}`);
  if (problems.length > 5) console.log(`      … and ${problems.length - 5} more`);
  console.log(`      fix: ${fix}`);
}

const componentDirs = readdirSync(COMPS).filter((d) => statSync(join(COMPS, d)).isDirectory());
/** Both color schemes create-screenshots.ts captures; state PNGs need both. */
const MODES = ['light', 'dark'];
/** Doc pages are defuss-ssg output: dist/documentation/*.html, rendered from
 * src/documentation/pages/*.mdx (build:docs must run before verify - it does,
 * in every package.json chain). Gates that check the SHIPPED surface read the
 * rendered pages; gates about authoring read the .mdx sources. */
const docPages = existsSync(DOCS_DIST)
  ? readdirSync(DOCS_DIST).filter((f) => f.endsWith('.html'))
  : [];

// 1. every component folder ships a component skill
check(
  'component skills',
  componentDirs.filter((c) => !existsSync(join(COMPS, c, 'component-skill.md'))).map((c) => `src/components/${c}/component-skill.md missing`),
  'write the skill (see AGENTS.md "Component skill template")',
);

// 2. every component has a documentation page (MDX source)
check(
  'documentation pages',
  componentDirs.filter((c) => !existsSync(join(DOCS_PAGES, `${c}.mdx`))).map((c) => `src/documentation/pages/${c}.mdx missing`),
  `copy src/documentation/pages/badge.mdx as template`,
);

// 3. every component has an e2e smoke test - rollout complete, hard gate.
// The fixture/assertions encode the component's documented surface (incl.
// State API states), so new components land with source + fixture + test
// together (AGENTS.md "Docs ↔ E2E parity").
const missingE2e = componentDirs
  .filter((c) => !existsSync(join(E2E, `${c}.e2e.ts`)))
  .map((c) => `tests/e2e/${c}.e2e.ts missing`);
check(
  'e2e smoke tests',
  missingE2e,
  'add fixture + test: interactive components follow tests/e2e/accordion.e2e.{ts,fixture.html}; CSS-only components use tests/e2e/lib/css-smoke.ts (see tests/e2e/badge.e2e.ts). Then `bun run e2e`',
);

// 4. component CSS uses only defined tokens (tweakcn shape) or local defs
const tokenFile = readFileSync(join(SRC, 'theme/utils/default-semantic-tokens.css'), 'utf8');
const globalTokens = new Set([...tokenFile.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
const tokenProblems: string[] = [];
for (const css of walk(COMPS, ['.css'])) {
  const content = readFileSync(css, 'utf8');
  const local = new Set([...content.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  for (const m of content.matchAll(/var\((--[a-z0-9-]+)\)/g)) {
    if (!globalTokens.has(m[1]) && !local.has(m[1])) {
      tokenProblems.push(`${relative(ROOT, css)} uses undefined ${m[1]}`);
    }
  }
}
check(
  'design tokens',
  tokenProblems,
  'use an existing token from theme/utils/default-semantic-tokens.css or a literal value (no new tokens)',
);

// 5. no undefined utility-shaped classes (components = hard gate, doc pages = info)
const { docIssues, compIssues } = auditUtilities(ROOT);
check(
  'utility classes (doc pages)',
  docIssues,
  'define the class in documentation/public/css/docs-utilities.css',
  true,
);
check(
  'utility classes (components)',
  compIssues,
  'define the class in documentation/public/css/docs-utilities.css or replace with component CSS',
);

// 6. the source listings on the rendered doc pages must equal the component
// sources they claim to show. <SourceFiles> embeds the file at SSG build
// time, so drift is impossible by construction - this gate proves it holds:
// every #source-css/#source-js section's <code> text must match the file its
// "view file" anchor points at (entity-decoded textContent vs file bytes).
const docHtml = docPages.map((p) => [p, readFileSync(join(DOCS_DIST, p), 'utf8')] as const);
const snippetProblems: string[] = [];
for (const [page, html] of docHtml) {
  const { document } = parseHTML(html);
  for (const section of document.querySelectorAll('section#source-css, section#source-js')) {
    const anchor = section.querySelector('a[href*="/components/"]');
    const href = anchor?.getAttribute('href') ?? '';
    const comp = href.match(/components\/([^/]+)\/([^/]+)\.(css|js)$/)?.[1];
    const ext = href.match(/\.(css|js)$/)?.[1];
    if (!comp || !ext) continue;
    const expected =
      ext === 'css'
        ? existsSync(join(COMPS, comp, `${comp}.css`)) && readFileSync(join(COMPS, comp, `${comp}.css`), 'utf8')
        : existsSync(join(COMPS, comp, `${comp}.ts`)) && readFileSync(join(COMPS, comp, `${comp}.ts`), 'utf8');
    if (!expected) continue;
    const shown = section.querySelector('pre > code')?.textContent ?? '';
    if (shown !== expected) {
      snippetProblems.push(`${page} - #source-${ext} listing differs from src/components/${comp}/${comp}.${ext === 'css' ? 'css' : 'ts'} (rebuild docs)`);
    }
  }
}
check(
  'snippet sync',
  snippetProblems,
  'run `bun run build:docs` (SourceFiles re-embeds the current component sources)',
);

// 6b. doc-page code-block integrity: unbalanced <pre> tags mean a snippet's
// opening tag was destroyed and raw code leaked into live markup (accordion/
// dialog shipped exactly that - the parser then swallows real DOM and site.js
// mis-pairs code toggles); duplicate real-DOM ids mean a whole section was
// duplicated (both pages also shipped that, breaking `built with` anchors and
// any getElementById consumer). Ids quoted inside <pre>/inline <code>/the
// CodeExample <textarea> source panes are prose, not DOM (each fence runs in
// its own sandbox where it IS unique), so all three are stripped before the
// duplicate scan.
const codeBlockProblems: string[] = [];
for (const [page, html] of docHtml) {
  const opens = html.match(/<pre[\s>]/g)?.length ?? 0;
  const closes = html.match(/<\/pre>/g)?.length ?? 0;
  if (opens !== closes) {
    codeBlockProblems.push(
      `${page}: ${opens} <pre> open vs ${closes} </pre> close tags - a code block's opening tag was destroyed, raw code leaked into markup`,
    );
    continue;
  }
  const realDom = html
    .replace(/<pre[\s>][\s\S]*?<\/pre>/g, '')
    .replace(/<textarea[\s>][\s\S]*?<\/textarea>/g, '')
    .replace(/<code[\s>][\s\S]*?<\/code>/g, '');
  const ids: string[] = [];
  for (const m of realDom.matchAll(/(?<![\w-])id="([^"]+)"/g)) ids.push(m[1]);
  const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (dupes.length) {
    codeBlockProblems.push(`${page}: duplicate element id(s) ${dupes.join(', ')} - a section is duplicated`);
  }
}
check(
  'doc code-block integrity',
  codeBlockProblems,
  'repair the page markup: every <pre><code class="language-…"> block needs its opening tag, and each section id must appear exactly once',
);

// 7. every rendered doc page loads the single-file bundle (scripts/bundle.ts):
// one all.css link + one all.js module script (cross-page demos still work —
// the bundle covers all components). Stray per-component stylesheet/script
// tags are banned so the lists can't creep back; <a href> "view file"
// anchors, data-spec-href spans and escaped code samples (&lt;link…) stay
// legal - only real tags match.
const importProblems: string[] = [];
for (const [page, html] of docHtml) {
  if (!html.includes('<link rel="stylesheet" href="../components/all.css"')) {
    importProblems.push(`${page} missing the all.css bundle link`);
  }
  if (!html.includes('<script type="module" src="../components/all.js"')) {
    importProblems.push(`${page} missing the all.js bundle script`);
  }
  for (const m of html.matchAll(/<link\b[^>]*\bhref="\.\.\/components\/[^/"]+\/[^/"]+\.css"/g)) {
    importProblems.push(`${page} loads a per-component stylesheet (${m[0]}) - the all.css bundle replaced the include lists`);
  }
  for (const m of html.matchAll(/<script\b[^>]*\bsrc="\.\.\/components\/[^/"]+\/[^/"]+\.js"/g)) {
    importProblems.push(`${page} imports a per-component script (${m[0]}) - the all.js bundle replaced the include lists`);
  }
}
check(
  'cross-page imports',
  importProblems,
  'load the bundle on every doc page: <link rel="stylesheet" href="../components/all.css"> and <script type="module" src="../components/all.js"></script>',
);

// 8. every doc page is reachable from the sidebar (lib/nav.ts NAV) - except
// the chrome-free standalone decks, which are frames of a page that IS in the
// sidebar (their own .mdx), never navigation targets themselves
const navSrc = readFileSync(join(DOCS, 'lib/nav.ts'), 'utf8');
const standaloneDeckPages = new Set(STANDALONE_DECKS.map(standaloneDeckFile));
check(
  'sidebar coverage',
  docPages.filter((p) => !standaloneDeckPages.has(p) && !navSrc.includes(`'${p}'`)).map((p) => `${p} not referenced in lib/nav.ts`),
  "add the page to the NAV array in src/documentation/lib/nav.ts",
);

// 9. oxlint clean (oxlint exits non-zero only on errors - warnings pass by policy)
const lint = Bun.spawnSync({ cmd: ['bunx', 'oxlint', 'src', 'tests', 'scripts'], cwd: ROOT, stdout: 'pipe' });
check(
  'lint',
  lint.exitCode !== 0
    ? [new TextDecoder().decode(lint.stdout).split('\n').find((l) => /Found \d+/.test(l)) ?? 'oxlint failed to run']
    : [],
  'fix errors per AGENTS.md "Linting" (unused vars → _ prefix)',
);

// 10. dist/ is a fresh 1:1 mirror of src/ (types stripped, everything else copied)
const distProblems: string[] = [];
if (!existsSync(DIST)) {
  distProblems.push('dist/ does not exist - run `bun run build`');
} else {
  for (const f of walk(SRC, [''])) {
    const rel = relative(SRC, f);
    // ambient type declarations compile nothing and ship nothing; src/shared
    // + src/core are build-time-only (bundled once into core.js, never
    // shipped as loose module trees)
    if (rel.endsWith('.d.ts') || rel.startsWith(`shared${sep}`) || rel.startsWith(`core${sep}`)) continue;
    // docs SSG authoring inputs (pages/, lib/, runtime/, data/, config.ts)
    // are consumed by defuss-ssg, never copied 1:1
    if (isDocsSsgAuthoringSrc(rel)) continue;
    if (rel.endsWith('.ts')) {
      const js = join(DIST, rel.replace(/\.ts$/, '.js'));
      if (!existsSync(js)) distProblems.push(`dist/${relative(SRC, f).replace(/\.ts$/, '.js')} missing - rebuild`);
      else if (readFileSync(js, 'utf8').trim() === '') distProblems.push(`dist/${relative(SRC, rel)} is empty - rebuild`);
    } else {
      const mirror = join(DIST, rel);
      if (!existsSync(mirror)) distProblems.push(`dist/${rel} missing - rebuild`);
      else if(!readFileSync(mirror).equals(readFileSync(f))) distProblems.push(`dist/${rel} differs from src - rebuild`);
    }
  }
  const srcSet = new Set(walk(SRC, ['']).map((f) => relative(SRC, f).replace(/\.ts$/, '.js')));
  for (const f of walk(DIST, [''])) {
    const rel = relative(DIST, f);
    // scripts/minify.ts + tsc sourceMap write derived twins, scripts/stats.ts
    // writes the generated stats document, scripts/bundle.ts writes the
    // single-file bundle - none of them are orphans
    // scripts/build.ts publishes schema sidecars to dist/schemas/ from a
    // DIFFERENT src path (components/<n>/<n>.schema.json) - allow-listed, not orphans
    if (isDerivedArtifact(rel) || BUNDLE_ARTIFACTS.has(rel) || rel === STATS_FILE || isSchemaArtifact(rel)) continue;
    if (!srcSet.has(rel)) {
      // docs pages/assets originate from the SSG authoring tree
      // (pages/*.mdx, public/*, runtime/*.ts) - resolve before flagging
      const docsRel = rel.startsWith(`documentation${sep}`) ? rel.slice(`documentation${sep}`.length) : null;
      if (docsRel) {
        const mapped = docsDistToSrc(docsRel);
        // null = generated output with no src counterpart (js/search-index.js)
        if (mapped === null || existsSync(join(SRC, mapped))) continue;
      }
      distProblems.push(`dist/${rel} is orphaned (no src/ counterpart) - rebuild`);
    }
  }
}
check(
  'dist 1:1',
  distProblems,
  'run `bun run build` (never edit dist/ directly)',
);

// 10a. every shipped component file must carry its minified twins (the
// Installation page advertises *.min.css / *.min.js / *.min.js.map / *.js.map
// to consumers - a component shipping without them is a broken CDN URL).
const artifactProblems = existsSync(DIST)
  ? minifyArtifactProblems(
      new Set(
        walk(DIST, [''])
          .filter((f) => statSync(f).size > 0)
          .map((f) => relative(DIST, f)),
      ),
    )
  : [];
check(
  'minified artifacts',
  artifactProblems.slice(0, 8),
  'run `bun run build` (compiles + minifies via scripts/minify.ts; `make minify` for the post-pass alone)',
);

// 10d. dist/stats.json must match the CURRENT dist/components/ tree - it is
// generated by scripts/stats.ts (counts per taxonomy type, JS/CSS-only split,
// byte sizes incl. minified + gzipped). Byte-comparison against exactly what
// the writer produces (shared lib/stats-files.ts), so a component edit or a
// minify re-run without regenerating stats fails here.
const statsProblems: string[] = [];
if (existsSync(DIST)) {
  const statsPath = join(DIST, STATS_FILE);
  if (!existsSync(statsPath)) statsProblems.push(`dist/${STATS_FILE} missing - generated by scripts/stats.ts`);
  else if (!readFileSync(statsPath).equals(Buffer.from(buildStatsFileText(DIST), 'utf8')))
    statsProblems.push(`dist/${STATS_FILE} is stale vs. dist/components/ - rebuild`);
}
check(
  'stats.json fresh',
  statsProblems,
  'run `bun run stats` (or `bun run build`, which regenerates it after minify)',
);

// 10e. README + doc-site index must PROMINENTLY state the current numbers —
// total, withJs, withoutJs and the KiB-formatted gzip sizes - as the exact
// sentence generated from dist/stats.json (shared renderer in lib/stats.ts).
// A stale or missing claim is misinformation: the docs promise the site's
// data, so verify compares the rendered sentence, not hand-typed digits.
// (Runs after the fresh gate, which already fails if stats.json lags dist/.)
if (statsProblems.length === 0) {
  const statsDoc = JSON.parse(readFileSync(join(DIST, STATS_FILE), 'utf8')) as StatsDoc;
  const claim = statsClaimProblems(readFileSync(join(ROOT, 'README.md'), 'utf8'), 'README.md', statsDoc).concat(
    existsSync(join(DOCS_DIST, 'index.html'))
      ? statsClaimProblems(readFileSync(join(DOCS_DIST, 'index.html'), 'utf8'), 'dist/documentation/index.html', statsDoc)
      : ['dist/documentation/index.html missing - run `bun run build:docs`'],
  );
  check(
    'stats claim (README + index)',
    claim,
    'state the current footprint verbatim in both files - update the sentence to match dist/stats.json and run `bun run docs` (README.md and the rendered index page are a parity pair, commit them together)',
  );
}

// 10b. State API contract (AGENTS.md "State API"): every JS component must
// expose the global preamble + a declared default state + a bound per-element
// api. Ratchet rollout: components listed in STATE_API_LEGACY predate the
// contract and only warn - remove a name from the list as it is migrated, and
// every NEW JS component must satisfy the contract from day one.
// Migration complete: every JS component satisfies the State API contract —
// keep this list empty as the ratchet (new components must comply from day one).
const STATE_API_LEGACY: string[] = [];
const STATE_API_PATTERNS: Array<[string, RegExp]> = [
  // preamble comes from the shared layer (emitted once in core.js; the
  // component build binds dist .js to df$.shadcn.shared - verify 10c)
  ['defussGlobals() preamble', /(defussGlobals\(\)|globalThis\.df\$\s*=)/],
  ['registry api assignment', /(df\$|defussGlobals\(\))\.\w+Api\s*=/],
  ['registry states assignment', /(df\$|defussGlobals\(\))\.\w+States\s*=/],
  ['states array declares default', /\w+States\s*=\s*\[[^\]]*['"]default['"]/],
  ['setState implementation', /\bsetState\s*\(/],
  ['getState implementation', /\bgetState\s*\(/],
  ['triggerStateChange implementation', /\btriggerStateChange\b/],
];
const stateApiProblems: string[] = [];
const stateApiWarnings: string[] = [];
for (const name of componentDirs) {
  const jsFile = join(COMPS, name, `${name}.ts`);
  if (!existsSync(jsFile)) continue;
  const src = readFileSync(jsFile, 'utf8');
  const missing = STATE_API_PATTERNS.filter(([, re]) => !re.test(src)).map(([label]) => label);
  if (missing.length === 0) continue;
  // spell out the refactor directive when the states array itself is absent —
  // an agent reading only this line must know what to do (AGENTS.md "State API")
  const rest = missing.filter((m) => m !== 'states array declares default').join(', ');
  const line = missing.includes('states array declares default')
    ? `${name}: no ${name}States = ['default', …] declared - refactor this component to support at least the 'default' state following the State API architecture${rest ? ` (also missing: ${rest})` : ''}`
    : `${name}: missing ${missing.join(', ')}`;
  if (STATE_API_LEGACY.includes(name)) stateApiWarnings.push(line);
  else stateApiProblems.push(line);
}
check(
  'state API',
  stateApiProblems,
  `refactor each component above to the State API architecture: declare {name}States with "default" first, implement setState/getState/triggerStateChange, bind el.api (AGENTS.md "State API", copy accordion.ts); then drop migrated names from STATE_API_LEGACY in scripts/verify.ts`,
);
check(
  'state API (legacy rollout)',
  stateApiWarnings,
  'step 1 of the two-step rollout (SOURCE FIRST, e2e after): refactor each component to the State API (at least a "default" state, AGENTS.md "State API"), one component per commit, then drop it from STATE_API_LEGACY in scripts/verify.ts; afterwards its e2e fixture/test must cover every declared state',
  true,
);

// 10c. shipped JS must carry the core binding guard: every component whose
// src/ .ts imports defussGlobals() must ship a .js whose shared import was
// rewritten into the generated df$.shadcn.shared bindings (build.ts +
// scripts/templates/component-shared-binding.js). If someone edits dist/ or
// breaks the post-pass, the registry globals silently vanish at runtime.
// Vendor imports: the ONLY dynamic import() shipped JS may contain is a
// component loading its official third-party renderer on demand from a
// pinned URL (the lazy twin of chart's vendor <script>). That is vendor code,
// never part of our payload - the "no runtime import" rules below stay about
// OUR modules. Exact call sites, reasoned; a stale entry (call site gone) or a
// missing / unpinned vendor URL fails too.
const VENDOR_IMPORTS: Record<string, { site: RegExp; pinned: string; reason: string }> = {
  mermaid: {
    site: /import\((?:\/\*[^*]*\*\/\s*)?vendorUrl\)/g,
    pinned: 'https://cdn.jsdelivr.net/npm/mermaid@12.0.0/dist/mermaid.esm.min.mjs',
    reason: 'loads the official Mermaid renderer on the first diagram (pinned jsDelivr ESM, or a self-hosted copy)',
  },
};
const vendorProblems: string[] = [];
/** `src` with the allow-listed vendor import call sites of `names` removed. */
function withoutVendorImports(src: string, names: string[], where: string): string {
  let out = src;
  for (const name of names) {
    const v = VENDOR_IMPORTS[name];
    if (!v) continue;
    if (!v.site.test(out)) vendorProblems.push(`${where}: VENDOR_IMPORTS["${name}"] is stale - its call site is gone; remove the entry`);
    v.site.lastIndex = 0;
    if (!out.includes(v.pinned)) vendorProblems.push(`${where}: ${name}'s vendor URL is not the pinned ${v.pinned}`);
    if (/mermaid@latest/.test(out)) vendorProblems.push(`${where}: ${name} must pin its vendor version, never @latest`);
    out = out.replace(v.site, '/* vendor import */');
  }
  return out;
}

const inlineProblems: string[] = [];
for (const name of componentDirs) {
  const tsFile = join(COMPS, name, `${name}.ts`);
  if (!existsSync(tsFile) || !readFileSync(tsFile, 'utf8').includes('defussGlobals()')) continue;
  const distJs = join(DIST, 'components', name, `${name}.js`);
  if (!existsSync(distJs)) continue; // already reported by dist 1:1
  const shipped = withoutVendorImports(readFileSync(distJs, 'utf8'), [name], `${name}.js`);
  if (!shipped.includes('__df$shared')) {
    inlineProblems.push(`${name}.js missing the df$.shadcn.shared binding guard - run \`bun run build\``);
  } else if (/(^|\n)\s*import[\s({]|import\(/.test(shipped)) {
    inlineProblems.push(`${name}.js still has a live module import - build post-pass failed to bind`);
  }
}
check(
  'core bindings (dist)',
  inlineProblems,
  'run `bun run build`; never edit dist/ directly',
);

// 10f. artifact contract (plans/defuss-query-morph-integration.md §2.3 + §5.1):
// core.js carries exactly morph+query+shared (no component code, no docs
// data, no runtime imports); all.js embeds the same runtime first plus every
// shipping JS component once. Membership markers, not byte hashes - the
// generated-code exemption minification would otherwise hide.
{
  const artifactProblems: string[] = [];
  const readDist = (rel: string): string =>
    existsSync(join(DIST, rel)) ? readFileSync(join(DIST, rel), 'utf8') : '';
  const coreJs = readDist('components/core.js');
  const allJs = withoutVendorImports(readDist('components/all.js'), Object.keys(VENDOR_IMPORTS), 'all.js');
  /** component identifiers are camelCased (number-input → numberInputStates) */
  const camel = (c: string): string => c.replace(/-([a-z])/g, (_m, ch: string) => ch.toUpperCase());

  if (!coreJs) artifactProblems.push('dist/components/core.js missing - run `bun run build`');
  else {
    for (const marker of ['queryVersion', 'htmlStringToVNodes', 'defussGlobals'])
      if (!coreJs.includes(marker)) artifactProblems.push(`core.js lacks runtime marker "${marker}"`);
    for (const c of componentDirs) {
      if (!existsSync(join(COMPS, c, `${c}.ts`))) continue;
      const id = camel(c);
      if (new RegExp(`\\b${id}States\\s*=`).test(coreJs))
        artifactProblems.push(`core.js embeds component "${c}" - core must stay component-free`);
    }
    for (const marker of ['searchIndex', 'onPageReady', 'realignWhenSettled'])
      if (coreJs.includes(marker)) artifactProblems.push(`core.js contains docs-only marker "${marker}"`);
    if (/(^|\n)\s*import[\s({]|import\(/.test(coreJs))
      artifactProblems.push('core.js contains a runtime import - the payload must be self-contained');
  }

  if (!allJs) artifactProblems.push('dist/components/all.js missing - run `bun run build`');
  else {
    if (!allJs.includes('queryVersion') || !allJs.includes('htmlStringToVNodes'))
      artifactProblems.push('all.js does not embed the core runtime (morph + query)');
    for (const c of componentDirs) {
      if (!existsSync(join(COMPS, c, `${c}.ts`))) continue;
      if (!new RegExp(`\\b${camel(c)}States\\s*=`).test(allJs))
        artifactProblems.push(`all.js is missing component "${c}" (bundle ≠ shipping manifest)`);
    }
    if (/(^|\n)\s*import[\s({]|import\(/.test(allJs))
      artifactProblems.push('all.js contains a runtime import - the payload must be self-contained');
  }
  check(
    'artifact contract (core/all)',
    artifactProblems,
    'run `bun run build` - core = morph+query+shared only; all = core first + every shipping component, both import-free (see plans/defuss-query-morph-integration.md §2.3)',
  );
}
check(
  'vendor imports (pinned, allow-listed)',
  vendorProblems,
  'a component may import only its official renderer, from the pinned URL in VENDOR_IMPORTS (scripts/verify.ts) - update the entry with the component, never widen it to our own modules',
);

// 10g. legacy runtime namespace: the pre-migration registry name must be gone
// from every authored surface (plans §2.1 - the namespace is df$.shadcn).
// Historical prose inside plans/ and compiled public/js output are exempt
// (the latter is regenerated by build:docs). The marker is assembled at
// runtime so this gate's own source text never trips it.
{
  const legacyMarker = ['_defuss', 'Shadcn'].join('');
  const legacyProblems: string[] = [];
  for (const f of [
    ...walk(SRC, ['.ts']),
    ...walk(join(ROOT, 'tests'), ['.ts']),
    ...walk(join(ROOT, 'scripts'), ['.ts']),
  ]) {
    if (readFileSync(f, 'utf8').includes(legacyMarker))
      legacyProblems.push(`${relative(ROOT, f)} still uses the legacy runtime namespace`);
  }
  check('legacy namespace', legacyProblems, 'migrate to df$.shadcn (AGENTS.md "No window globals")');
}

// 10h. shared ABI stamp: core publishes df$.shadcn.shared.abi and every
// emitted component guards on it - core and components must qualify from the
// SAME release, so src/shared/version.ts must equal package.json's version.
{
  const pkgVersion = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version as string;
  const abi = readFileSync(join(SRC, 'shared', 'version.ts'), 'utf8').match(/SHARED_ABI = '([^']+)'/)?.[1];
  check(
    'shared ABI',
    abi === pkgVersion ? [] : [`src/shared/version.ts says ${abi} but package.json says ${pkgVersion}`],
    'bump SHARED_ABI in src/shared/version.ts with the release (same-release core/components guard on it)',
  );
}

// 10i. version sites: the release version also lives in the Claude Code plugin
// manifest, the shared-ABI stamp and the flagship deck's cover - every site in
// scripts/lib/version-sites.ts must equal package.json (a release that bumped
// only package.json left them behind)
{
  const pkgVersion = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version as string;
  check(
    'version sites',
    versionDrift((file) => readFileSync(join(ROOT, file), 'utf8'), pkgVersion),
    'run `bun scripts/bump-version.ts <version>` (moves every site in scripts/lib/version-sites.ts); releases do this via `bun run deploy`',
  );
}

// 11. every component doc page exposes a default-state .preview block - the
//     contract create-screenshots.ts (and the agent's eye) relies on
const previewProblems: string[] = [];
for (const c of componentDirs) {
  const page = join(DOCS_DIST, `${c}.html`);
  if (existsSync(page) && !readFileSync(page, 'utf8').includes('class="preview"')) {
    previewProblems.push(`dist/documentation/${c}.html has no .preview block`);
  }
}
check(
  'preview blocks',
  previewProblems,
  'wrap the default demo in <div class="preview">…</div> (see pages/badge.mdx)',
);

// 12. every component has light + dark screenshots whose manifest fingerprint
// matches the CURRENT dist/ inputs (same content-hash contract as
// create-screenshots.ts). Content-based, so a no-change rebuild stays green
// and any component edit invalidates exactly its own shots.
const shotProblems: string[] = [];
if (existsSync(DIST)) {
  const manifestPath = join(ROOT, 'screenshots', 'manifest.json');
  const manifest: { fingerprints?: Record<string, string> } = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, 'utf8'))
    : {};
  const current = componentFingerprints(DIST);
  for (const c of componentDirs) {
    for (const mode of ['light', 'dark']) {
      if (!existsSync(join(ROOT, 'screenshots', mode, `${c}.png`))) {
        shotProblems.push(`screenshots/${mode}/${c}.png missing`);
      }
    }
    if (manifest.fingerprints?.[c] !== current[c]) {
      shotProblems.push(`screenshots of ${c} are stale vs dist/ (manifest mismatch)`);
    }
  }
}
check(
  'screenshots',
  shotProblems,
  'run `bun run screenshots` (incremental - re-shoots only components changed since the manifest)',
);

// 12b. every declared state of every JS component must be covered by ALL
// four artifacts (AGENTS.md "State API" rule 7): screenshot per mode, doc
// page (States section + data-state-demo anchor), component skill, e2e test.
const coverageProblems: string[] = [];
for (const c of componentDirs) {
  const tsFile = join(COMPS, c, `${c}.ts`);
  if (!existsSync(tsFile)) continue;
  const states = declaredStates(readFileSync(tsFile, 'utf8'));
  if (states.length === 0) continue;

  const doc = existsSync(join(DOCS_DIST, `${c}.html`)) ? readFileSync(join(DOCS_DIST, `${c}.html`), 'utf8') : '';
  if (!doc.includes('data-state-demo')) coverageProblems.push(`${c}: doc page lacks a [data-state-demo] anchor for state capture`);

  const skill = existsSync(join(COMPS, c, 'component-skill.md'))
    ? readFileSync(join(COMPS, c, 'component-skill.md'), 'utf8')
    : '';
  const e2e = existsSync(join(ROOT, 'tests', 'e2e', `${c}.e2e.ts`))
    ? readFileSync(join(ROOT, 'tests', 'e2e', `${c}.e2e.ts`), 'utf8')
    : '';

  for (const s of states) {
    if (s !== 'default' && MODES.some((m) => !existsSync(join(ROOT, 'screenshots', m, `${c}-${s}.png`)))) {
      coverageProblems.push(`${c}: no screenshot for state "${s}" (both modes) - add [data-state-demo] + run \`bun run screenshots\``);
    }
    if (!doc.includes(`<code>${s}</code>`)) coverageProblems.push(`${c}: state "${s}" not documented in ${c}.html (<code>${s}</code>)`);
    if (!skill.includes(s)) coverageProblems.push(`${c}: state "${s}" not listed in component-skill.md`);
    if (!e2e.includes(`'${s}'`)) coverageProblems.push(`${c}: state "${s}" not asserted in ${c}.e2e.ts`);
  }
}
check(
  'state coverage',
  coverageProblems,
  'each declared state needs screenshots (both modes), doc page, skill and e2e coverage (AGENTS.md "State API" rule 7)',
);

// 13. version is consistent: package.json ↔ the header badge stamped into
// every page at SSG build time (SiteHeader reads package.json - no version
// literal anywhere to bump or forget).
const version = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version as string;
{
  const versionProblems: string[] = [];
  const indexPage = join(DOCS_DIST, 'index.html');
  if (!existsSync(indexPage)) versionProblems.push('dist/documentation/index.html missing - run `bun run build:docs`');
  else {
    const html = readFileSync(indexPage, 'utf8');
    const badge = html.match(/<span class="badge header-version"[^>]*>(v[^<]+)<\/span>/);
    if (!badge) versionProblems.push('index.html lost the header version badge (span.header-version)');
    else if (badge[1] !== `v${version}`) versionProblems.push(`header badge says ${badge[1]} but package.json says v${version} - run \`bun run build:docs\``);
  }
  check(
    'version consistency',
    versionProblems,
    'the badge is stamped from package.json at docs build time - run `bun run build:docs`',
  );
}

// 13b. generated theme files must equal a fresh render of the themes.ts
// dataset: src/theme/<id>.css is build.ts output (regenerated every build,
// like SKILL.md) and ships 1:1 as dist/theme/<id>.css. The doc-site theme
// switcher and the theme-switcher component load exactly these files, so
// stale or missing ones are user-visible breakage.
{
  const themeFileProblems: string[] = [];
  const themesSrc = readFileSync(join(SRC, 'documentation/runtime/themes.ts'), 'utf8');
  for (const t of parseThemes(themesSrc)) {
    const expected = themeCssText(t);
    if (expected === null) continue; // `default` == the token file itself
    const rel = join('theme', themeFileName(t.id));
    for (const [where, base] of [['src', SRC], ['dist', DIST]] as const) {
      const file = join(base, rel);
      if (!existsSync(file)) {
        themeFileProblems.push(`${rel} missing (${where}) - run \`bun run build\``);
      } else if (readFileSync(file, 'utf8') !== expected) {
        themeFileProblems.push(`${rel} (${where}) is stale vs themes.ts - run \`bun run build\``);
      }
    }
    // resource sidecars (df$.shadcn.loadTheme fetches theme/<id>.json for the
    // theme's font <link>s): must exist for link-bearing themes and NEVER for
    // themes without links (a stale sidecar would load foreign fonts).
    const json = themeJsonText(t);
    const jsonRel = join('theme', themeJsonFileName(t.id));
    for (const [where, base] of [['src', SRC], ['dist', DIST]] as const) {
      const file = join(base, jsonRel);
      if (json === null) {
        if (existsSync(file))
          themeFileProblems.push(`${jsonRel} (${where}) exists but ${t.id} declares no links - delete it`);
      } else if (!existsSync(file)) {
        themeFileProblems.push(`${jsonRel} missing (${where}) - run \`bun run build\``);
      } else if (readFileSync(file, 'utf8') !== json) {
        themeFileProblems.push(`${jsonRel} (${where}) is stale vs themes.ts - run \`bun run build\``);
      }
    }
  }
  check(
    'theme files fresh',
    themeFileProblems,
    'theme files are generated from themes.ts by build.ts - run `bun run build`',
  );
}

// 14. changelog data survived edits
check(
  'changelog data',
  existsSync(join(DOCS, 'data/changelog.json'))
    ? []
    : ['src/documentation/data/changelog.json missing - deploy.sh cannot add entries'],
  'restore the changelog data file (entries rendered by lib/components/changelog-entries.tsx)',
);

// 15. code ↔ skill ↔ docs parity: every variant/size/density IMPLEMENTED in
// the component CSS (data-variant/data-size/data-density selectors are the
// source of truth - the CSS ships what works) must be documented in BOTH the
// component skill and the doc page. Catches the classic drift: CSS gains a
// variant, docs and skill silently rot. A token counts as documented when it
// appears quoted ("x"), backticked (`x`), or as a table cell (| x |) - the
// forms the skill template and doc markup actually use.
const skillProblems: string[] = [];
for (const c of componentDirs) {
  const cssFile = join(COMPS, c, `${c}.css`);
  const skillFile = join(COMPS, c, 'component-skill.md');
  if (!existsSync(cssFile)) continue;
  const tokens = new Set(
    [...readFileSync(cssFile, 'utf8').matchAll(/data-(?:variant|size|density)="([a-z0-9-]+)"/g)].map((m) => m[1]),
  );
  if (tokens.size === 0) continue;
  const skillText = existsSync(skillFile) ? readFileSync(skillFile, 'utf8') : '';
  const doc = existsSync(join(DOCS_DIST, `${c}.html`)) ? readFileSync(join(DOCS_DIST, `${c}.html`), 'utf8') : '';
  const documented = (text: string, t: string) =>
    text.includes(`"${t}"`) || text.includes(`\`${t}\``) || new RegExp(`\\|\\s*${t}\\s*\\|`).test(text);
  const missSkill = [...tokens].filter((t) => !documented(skillText, t));
  const missDoc = [...tokens].filter((t) => !doc.includes(t));
  if (missSkill.length)
    skillProblems.push(`${c}: CSS implements [${missSkill.join(', ')}] but component-skill.md doesn't document it`);
  if (missDoc.length) skillProblems.push(`${c}: CSS implements [${missDoc.join(', ')}] but ${c}.html doesn't show it`);
}
check(
  'skill ↔ docs parity',
  skillProblems,
  'update component-skill.md (Variants/Sizes tables) and the doc page to cover what the CSS implements (AGENTS.md)',
);

// 15a. field-feature parity: a component CSS that styles `.field-*` helpers
// ships that feature, so the skill and the doc page must describe it —
// check 15 only tracks data-variant/data-size selectors, which field-heavy
// components (e.g. form) often lack entirely. Pure string analysis in
// scripts/lib/fields.ts (unit-tested in tests/fields.test.ts).
const fieldProblems = fieldFeatureProblems(
  componentDirs.map((c) => ({
    name: c,
    css: existsSync(join(COMPS, c, `${c}.css`)) ? readFileSync(join(COMPS, c, `${c}.css`), 'utf8') : '',
    skill: existsSync(join(COMPS, c, 'component-skill.md')) ? readFileSync(join(COMPS, c, 'component-skill.md'), 'utf8') : '',
    doc: docHtml.find(([p]) => p === `${c}.html`)?.[1] ?? '',
  })),
);
check(
  'field feature parity',
  fieldProblems,
  'a .field-* class styled in the component CSS must be documented in component-skill.md and the doc page (classes the feature ships with)',
);

// 15b. strict type-check of the tooling/test trees (bun run typecheck). The
// e2e rollout is all test code - a type error must not survive to CI. ~0.3 s.
// NOTE: tsc writes diagnostics to STDOUT - reading only stderr silently passed
// every failure (fixed after 12 real errors slipped past the gate).
const typecheck = Bun.spawnSync({ cmd: ['bun', 'run', 'typecheck'], cwd: ROOT });
check(
  'typecheck',
  typecheck.exitCode === 0
    ? []
    : `${typecheck.stdout?.toString() ?? ''}\n${typecheck.stderr?.toString() ?? ''}`
        .split('\n')
        .filter((l) => /\w+\.\w+\(\d+,\d+\): error/.test(l))
        .slice(0, 8),
  'fix the type errors above (bun run typecheck prints full output)',
);

// 15c. docs/ release snapshot: GitHub Pages publishes ./docs - the doc site
// (dist/documentation/* + SEO files + the 404.html fallback) with its
// ../component & ../theme refs rewritten to jsDelivr PINNED to the release
// (lib/mirror.ts). It is a snapshot of the committed version, republished
// only at a release: docs/release.json must name package.json's version and
// every live asset reference must load from that tag - never @latest (a
// 7-day browser cache kept visitors on the previous release) and never
// another version (pages and assets must always come from one release).
const docsProblems: string[] = [];
const DOCS_OUT = join(ROOT, 'docs');
if (existsSync(DOCS_OUT)) {
  const version = packageVersion(ROOT);
  const stampFile = join(DOCS_OUT, RELEASE_STAMP);
  const stamp = existsSync(stampFile) ? (JSON.parse(readFileSync(stampFile, 'utf8')) as { version?: string }).version : undefined;
  if (stamp !== version) docsProblems.push(`docs/${RELEASE_STAMP} names ${stamp ?? 'no version'}, package.json is ${version} - the snapshot was not republished for this release`);
  if (!existsSync(join(DOCS_OUT, 'index.html')) || !existsSync(join(DOCS_OUT, '404.html'))) docsProblems.push('docs/index.html or docs/404.html missing');
  for (const file of walk(DOCS_OUT, ['.html'])) {
    const bad = unpinnedRefs(readFileSync(file, 'utf8'), version);
    if (bad.length) docsProblems.push(`docs/${relative(DOCS_OUT, file)} loads ${bad.length} asset(s) not pinned to v${version}, e.g. ${bad[0]}`);
  }
} else {
  docsProblems.push('docs/ missing - GitHub Pages would publish nothing');
}
check(
  'docs release snapshot',
  docsProblems.slice(0, 8),
  'docs/ is republished at a release: deploy.sh bumps the version and `bun scripts/sync-docs.ts` re-snapshots it pinned to the new tag (`--force` to republish the current version)',
);

// 16. working tree cleanliness (warn): uncommitted changes make "green build"
// ambiguous - the agent must finish by committing so CI sees what was tested.
const gitProblems: string[] = [];
const gitStatus = Bun.spawnSync({ cmd: ['git', 'status', '--porcelain'], cwd: ROOT });
if (gitStatus.exitCode === 0) {
  const dirty = gitStatus.stdout.toString().trim().split('\n').filter(Boolean);
  if (dirty.length) {
    gitProblems.push(`${dirty.length} uncommitted change(s), e.g.: ${dirty.slice(0, 4).map((d) => d.slice(0, 40)).join(' | ')}`);
  }
} // no .git / git missing → check silently skips (tarball builds, CI without git)
check(
  'working tree committed',
  gitProblems,
  'commit the verified changes (git add -A && git commit) so CI and other agents see exactly what passed',
  true,
);

// 17. snippet escaping sentinel: an unescaped `<` inside <pre><code> breaks
// every strict HTML parser (parse5 "invalid-first-character-of-tag-name") —
// the SSG build escapes code text on render, so a hit here means someone
// hand-pasted markup into a code block (or a pre-processing plugin broke).
const escapeProblems: string[] = [];
for (const [f, html] of docHtml) {
  for (const m of html.matchAll(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g)) {
    if (/<[a-zA-Z/!?]/.test(m[1])) escapeProblems.push(`${f}: unescaped tag inside <pre><code>`);
  }
}
check(
  'snippet escaping',
  escapeProblems,
  'raw < in a code block means a snippet was hand-pasted - the docs build escapes code text on render; check the page source',
);

// 18. accessibility CSS promises (AGENTS.md "Accessibility CSS"): any
// component that animates must honor prefers-reduced-motion. Migration
// complete - keep this list empty as the ratchet (new components must comply
// from day one).
const REDUCED_MOTION_LEGACY: string[] = [];
const motionProblems: string[] = [];
const motionWarnings: string[] = [];
for (const c of componentDirs) {
  const cssFile = join(COMPS, c, `${c}.css`);
  if (!existsSync(cssFile)) continue;
  const css = readFileSync(cssFile, 'utf8');
  if (!/(transition|animation)\s*:/.test(css)) continue;
  if (css.includes('prefers-reduced-motion')) continue;
  const line = `${c}: animates but has no @media (prefers-reduced-motion: reduce) block`;
  if (REDUCED_MOTION_LEGACY.includes(c)) motionWarnings.push(line);
  else motionProblems.push(line);
}
check(
  'reduced motion',
  motionProblems,
  'add an @media (prefers-reduced-motion: reduce) { @layer components { … } } block suppressing transitions (see accordion.css)',
);
check(
  'reduced motion (legacy rollout)',
  motionWarnings,
  'same as above, then drop the name from REDUCED_MOTION_LEGACY in scripts/verify.ts',
  true,
);

// 19. init idempotency contract (AGENTS.md): JS that attaches listeners must
// guard against double-initialization (:not([data-init]) or a global flag) and
// re-run init via MutationObserver, or SPA navigation double-binds handlers.
const INIT_GUARD_LEGACY: string[] = [];
const initProblems: string[] = [];
const initWarnings: string[] = [];
for (const c of componentDirs) {
  const tsFile = join(COMPS, c, `${c}.ts`);
  if (!existsSync(tsFile)) continue;
  const src = readFileSync(tsFile, 'utf8');
  if (!src.includes('addEventListener')) continue;
  const guarded = src.includes('data-init') || /document\.__\w+/.test(src);
  const reInits = src.includes('MutationObserver');
  if (guarded && reInits) continue;
  const line = `${c}: ${guarded ? '' : 'no :not([data-init]) guard'}${guarded && !reInits ? 'and ' : ''}${reInits ? '' : 'no MutationObserver re-init'}`;
  if (INIT_GUARD_LEGACY.includes(c)) initWarnings.push(line);
  else initProblems.push(line);
}
check(
  'init idempotency',
  initProblems,
  'guard listeners with :not([data-init]) + el.dataset.init (or document.__flag for delegation) and add `new MutationObserver(init).observe(…)` (AGENTS.md)',
);
check(
  'init idempotency (legacy rollout)',
  initWarnings,
  'same as above, then drop the name from INIT_GUARD_LEGACY in scripts/verify.ts',
  true,
);

// 20. doc/tooling reference integrity: commands quoted in AGENTS.md and
// README must exist - renaming a script or make target silently rots the docs
// that agents follow as instructions.
const pkgScripts = new Set(Object.keys(JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts));
const makeTargets = new Set(
  [...readFileSync(join(ROOT, 'Makefile'), 'utf8').matchAll(/^([a-z][a-z0-9_-]*):/gm)].map((m) => m[1]),
);
const refProblems: string[] = [];
for (const md of ['AGENTS.md', 'README.md']) {
  const text = readFileSync(join(ROOT, md), 'utf8');
  // only backtick-quoted commands count - prose like "make sure" must not match
  for (const m of text.matchAll(/`bun run ([a-z][a-z0-9:-]*)`/g)) {
    if (!pkgScripts.has(m[1])) refProblems.push(`${md}: "bun run ${m[1]}" is not a package.json script`);
  }
  for (const m of text.matchAll(/`make ([a-z][a-z0-9_-]*)`/g)) {
    if (!makeTargets.has(m[1])) refProblems.push(`${md}: "make ${m[1]}" is not a Makefile target`);
  }
}
check(
  'doc command refs',
  refProblems,
  'fix the doc reference or restore the script/target - docs are agent instructions',
);

// 20b. field-description wiring: every live .field-description / .field-error
// paragraph on a doc page must carry an id that at least one aria-describedby
// in the same page points at. Visual proximity is invisible to screen
// readers - the Input "With description" example is the site's established
// pattern; this gate keeps the other pages from drifting off it. linkedom
// only sees live elements: escaped snippet markup is text, not DOM.
const descProblems: string[] = [];
// issue #18 second half: the wiring must also RESOLVE and sit on the right
// element. One linkedom pass per page feeds both pure checkers from
// scripts/lib/fields.ts (unit-tested in tests/fields.test.ts):
//  - every aria-describedby token must match exactly one id on the page
//    (dangling = silent hint loss, duplicate = unpredictable AT behavior)
//  - every referenced .field-description/.field-error must be referenced by
//    the field itself (input/select/textarea/fieldset), not a wrapper —
//    aria-describedby on a <div> names nothing for the focused control.
const resolveProblems: string[] = [];
for (const [page, html] of docHtml) {
  const { document } = parseHTML(html);
  const allRefs = [...document.querySelectorAll('[aria-describedby]')].map((el) => ({
    owner: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}`,
    tag: el.tagName.toLowerCase(),
    tokens: (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean),
  }));
  resolveProblems.push(
    ...ariaDescribedByProblems(
      page,
      allRefs,
      [...document.querySelectorAll('[id]')].map((el) => el.getAttribute('id')!).filter(Boolean),
    ),
    ...fieldDescriptionOwnerProblems(
      page,
      allRefs,
      [...document.querySelectorAll('.field-description[id], .field-error[id]')].map((el) => ({
        id: el.getAttribute('id')!,
        cls: el.classList[0],
      })),
    ),
  );
  const refs = new Set(allRefs.flatMap((r) => r.tokens));
  for (const el of document.querySelectorAll('.field-description, .field-error')) {
    const id = el.getAttribute('id');
    if (!id) descProblems.push(`${page}: a .${el.classList[0]} has no id for a control to reference`);
    else if (!refs.has(id)) descProblems.push(`${page}: #${id} is referenced by no aria-describedby - screen readers never announce it`);
  }
}
check(
  'field description wiring',
  descProblems,
  'give the description an id and point aria-describedby at it from the field/fieldset (see Input "With description")',
);
check(
  'aria-describedby resolution',
  resolveProblems,
  'each aria-describedby token must match exactly one id on the page, on the input/select/textarea/fieldset itself (issue #18)',
);

// 21. link integrity in the shipped doc pages: every local href/src and
// same-page #anchor must resolve inside dist/. Snippet blocks are excluded —
// they contain escaped examples (src="photo.jpg") meant to be illustrative.
// checked against the SHIPPED tree (pages reference compiled .js). linkedom
// gives us the same view the browser has: contents of <pre>, <script> and
// <style> - including the raw skill markdown embedded in
// <script type="text/plain"> - are text, not elements, so illustrative
// markup there (src="photo.jpg") is never mistaken for a live link.
// Cross-page anchors (page.html#id) resolve against the target page's id set
// (parsed once up front), so a renamed heading anchor is a build failure too.
const linkProblems: string[] = [];
if (existsSync(DIST)) {
  const pageIds = new Map<string, Set<string>>(
    docHtml.map(([page, html]) => [
      page,
      new Set(
        [...parseHTML(html).document.querySelectorAll('[id]')]
          .map((el) => el.getAttribute('id'))
          .filter((v): v is string => !!v),
      ),
    ]),
  );
  for (const f of docPages) {
    const { document } = parseHTML(readFileSync(join(DIST, 'documentation', f), 'utf8'));
    for (const el of document.querySelectorAll('[href],[src]')) {
      const url = (el.getAttribute(el.hasAttribute('href') ? 'href' : 'src') ?? '').trim();
      if (/^(https?:|mailto:|data:|javascript:)/i.test(url)) continue;
      // demo placeholders: no target at all, or the conventional "..." stub
      if (url === '' || url === '#' || url === '...') continue;
      if (url.startsWith('#')) {
        if (!pageIds.get(f)?.has(url.slice(1))) linkProblems.push(`${f}: dead anchor #${url.slice(1)}`);
        continue;
      }
      const hashAt = url.indexOf('#');
      const path = hashAt >= 0 ? url.slice(0, hashAt) : url;
      const anchor = hashAt >= 0 ? url.slice(hashAt + 1) : '';
      if (!path) continue;
      const targetAbs = join(DIST, 'documentation', path);
      if (!existsSync(targetAbs)) {
        linkProblems.push(`${f}: dead link ${url}`);
        continue;
      }
      // cross-page anchor: #id inside a sibling html page must exist there
      // too; non-html targets (CDN links, assets) carry no page ids of ours.
      if (anchor && targetAbs.endsWith('.html')) {
        const ids = pageIds.get(relative(join(DIST, 'documentation'), targetAbs));
        if (ids && !ids.has(anchor)) linkProblems.push(`${f}: dead cross-page anchor ${url}`);
      }
    }
  }
}
check(
  'doc link integrity',
  linkProblems,
  'fix or remove the link (dead links on the published docs site are user-facing breakage)',
);

// 21b. markdown source link integrity: every [text](target) in the prose
// sources (README/AGENTS/ARCH, src/SKILL.md, component skills, docs pages'
// MDX) must resolve - to a real file (relative to the source file) or to a
// heading anchor in the same file. This catches what the rendered-HTML gate
// above structurally can't: links that never became links (escaped
// `\[x\](y)` in MDX renders as literal text) and repo-relative links that
// only ever work on GitHub (a since-deleted MOTIVATION.md hid behind one).
// Fenced code samples are stripped before parsing (see scripts/lib/links.ts).
{
  const mdSources: MdDoc[] = [
    ...['README.md', 'AGENTS.md', 'ARCH.md', ROOT_SKILL_OUTPUT_FILE].map((f) => [f, join(ROOT, f)] as const),
    ...walk(SRC, ['.md']).map((p) => [relative(ROOT, p), p] as const),
    ...walk(DOCS_PAGES, ['.mdx']).map((p) => [relative(ROOT, p), p] as const),
  ]
    .filter(([, abs]) => existsSync(abs))
    .map(([name, abs]) => ({ name, text: readFileSync(abs, 'utf8') }));
  // existence resolved inside ROOT, relative to the doc's own folder. .mdx
  // pages additionally render one level up (dist/documentation/), so links
  // there address the SHIPPED surface - mapped back onto the sources:
  // `sibling.html` → the page's .mdx, `../x` → src/x (dist/components ← src/components).
  const pagesDir = relative(ROOT, DOCS_PAGES);
  const mdExists = (from: string, relPath: string): boolean => {
    const abs = join(ROOT, dirname(from), relPath);
    if (abs.startsWith(ROOT + sep) && existsSync(abs)) return true;
    if (!from.startsWith(pagesDir)) return false;
    if (relPath.endsWith('.html') && existsSync(join(DOCS_PAGES, relPath.replace(/\.html$/, '.mdx')))) return true;
    return existsSync(join(SRC, relPath.replace(/^\.\.\//, '')));
  };
  check(
    'markdown link integrity',
    markdownLinkProblems(mdSources, mdExists),
    'point every markdown link at an existing file (relative to its source) or a real heading; in .mdx use <DocLink href> - escaped \\[x\\](y) renders literally',
  );
}

// 22. fixture ↔ CSS parity: every variant/size the component CSS implements
// must be instantiated in its e2e fixture (docs parity rule, mechanical side).
const fixtureProblems: string[] = [];
for (const c of componentDirs) {
  const cssFile = join(COMPS, c, `${c}.css`);
  const fixture = join(ROOT, 'tests', 'e2e', `${c}.e2e-fixture.html`);
  if (!existsSync(cssFile) || !existsSync(fixture)) continue; // missing fixture = check 3
  const tokens = new Set(
    [...readFileSync(cssFile, 'utf8').matchAll(/data-(?:variant|size)="([a-z0-9-]+)"/g)].map((m) => m[1]),
  );
  const fx = readFileSync(fixture, 'utf8');
  const missing = [...tokens].filter((t) => !fx.includes(`"${t}"`));
  if (missing.length) fixtureProblems.push(`${c}: fixture lacks [${missing.join(', ')}]`);
}
check(
  'fixture ↔ CSS parity',
  fixtureProblems,
  'instantiate every documented variant/size in the e2e fixture (AGENTS.md "Docs ↔ E2E parity")',
);

// 23. portability: no machine-specific absolute paths anywhere in the repo
// sources/scripts/tests (repo rule - these paths break on other systems).
const pathProblems: string[] = [];
for (const f of [...walk(SRC, ['']), ...walk(join(ROOT, 'scripts'), ['']), ...walk(join(ROOT, 'tests'), [''])]) {
  if (/\.(woff2?|png|ico|jpg|jpeg|gif|webp)$/.test(f)) continue;
  const hit = readFileSync(f, 'utf8').match(/\/Users\/[a-z]+|[A-Z]:\\|file:\/\/\//);
  if (hit) pathProblems.push(`${relative(ROOT, f)}: ${hit[0]}`);
}
check(
  'portable paths',
  pathProblems,
  'use paths relative to the repo root (import.meta.dirname / relative joins)',
);

// 24. render drift (warn): a PNG whose bytes changed since capture while its
// component's inputs did NOT means something outside the repo altered the
// render (CDN asset, font, browser version) - worth a human/agent look.
const driftProblems: string[] = [];
const driftManifestPath = join(ROOT, 'screenshots', 'manifest.json');
if (existsSync(driftManifestPath) && existsSync(DIST)) {
  const dm = JSON.parse(readFileSync(driftManifestPath, 'utf8')) as {
    fingerprints?: Record<string, string>;
    renders?: Record<string, string>;
  };
  const nowFp = componentFingerprints(DIST);
  for (const [c, fp] of Object.entries(dm.fingerprints ?? {})) {
    if (nowFp[c] !== fp) continue; // inputs changed → the diff is expected
    for (const [key, hash] of Object.entries(dm.renders ?? {})) {
      // keys look like "light/button.png" or "dark/accordion-all-open.png"
      const file = key.slice(key.indexOf('/') + 1).replace(/\.png$/, '');
      if (file !== c && !file.startsWith(`${c}-`)) continue;
      const png = join(ROOT, 'screenshots', key);
      if (!existsSync(png)) continue;
      const actual = createHash('sha256').update(readFileSync(png)).digest('hex').slice(0, 16);
      if (actual !== hash) driftProblems.push(`screenshots/${key} changed pixels without any input changing`);
    }
  }
}
check(
  'render drift',
  driftProblems,
  'inspect the PNG against the component (external asset/browser change?) - or recapture with `bun run screenshots --force` once intentional',
  true,
);

// 25. no window globals (AGENTS.md "No window globals"): application globals
// live on globalThis under df$ - window is the browser-only alias
// (breaks isomorphic runtimes) and a collision magnet on hosts we don't own.
// Vendor globals (lucide, marked, …) are owned by their vendors: reads via
// globalThis.* are fine; assignments to window.* anywhere in src/ are not.
const windowProblems: string[] = [];
for (const f of walk(SRC, ['.ts', '.js'])) {
  const src = readFileSync(f, 'utf8');
  // matches window.x = / window['x'] = / window["x"] = assignment forms -
  // the . or [ is REQUIRED: an identifier that merely starts with "window"
  // (the window component's df$.windowApi / windowStates) is not the global
  for (const m of src.matchAll(/\bwindow\s*(?:\.|\[)['"]?\s*([A-Za-z_$][\w$]*)['"]?\s*\]?\s*(=|\+=|-=)/g)) {
    windowProblems.push(`${relative(ROOT, f)} assigns window.${m[1]}`);
  }
}
check(
  'no window globals',
  windowProblems,
  'use globalThis and scope the name under globalThis.df$ (AGENTS.md "No window globals")',
);

// 26. README ↔ index page parity: the intro pillar lists must say the same
// thing. README.md leads with `- **Name**` bullets (intro section, before the
// first `##` heading); pages/index.mdx renders the same pillars as card-title
// h3s. They diverged once ("Observable state" went into the README only) —
// now the gate catches it, and AGENTS.md demands both files change together.
{
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
  // the pillar bullets live under "## What this is", i.e. between the first
  // `##` and "## Quick start" - scan exactly that range
  const intro = readme.slice(0, readme.search(/^## Quick start$/m));
  const readmePillars = [...intro.matchAll(/^- \*\*(.+?)\*\*/gm)].map((m) => m[1].trim());
  const indexMdx = readFileSync(join(DOCS_PAGES, 'index.mdx'), 'utf8');
  // pillar cards are the only card-title h3s on the page today; the class
  // attribute may carry additional pattern classes (card-title-sm etc.)
  const indexPillars = [...indexMdx.matchAll(/<h3 class="card-title\b[^"]*"[^>]*>([^<]+)<\/h3>/g)].map((m) =>
    m[1].trim(),
  );
  const missing = readmePillars.filter((p) => !indexPillars.includes(p));
  const extra = indexPillars.filter((p) => !readmePillars.includes(p));
  check(
    'README ↔ index parity',
    [
      ...missing.map((p) => `index page card missing for README pillar "${p}"`),
      ...extra.map((p) => `README bullet missing for index page card "${p}"`),
    ],
    'keep README.md intro bullets and documentation/pages/index.mdx pillar cards in sync (AGENTS.md "README ↔ index parity") - change both files together',
  );
}

// 27. README ↔ index.html commit window: the two files state the same
// promises to humans and browser users, so touching one without the other
// within 15 minutes of commit time is treated as an un-synced edit (the
// hero paragraph diverged once: "No build step for consumers - dist/ is
// committed…" vs "No build step."). Identity of the touching commit passes;
// otherwise the two last-touch commits must be ≤ SYNC_WINDOW apart.
{
  const SYNC_WINDOW = 15 * 60; // seconds
  const PAIR: Array<[string, string]> = [
    ['README.md', 'README.md'],
    ['index page', 'src/documentation/pages/index.mdx'],
  ];
  const [readmeHash, readmeAt, indexHash, indexAt] = PAIR.flatMap(([, path]) =>
    Bun.spawnSync({ cmd: ['git', 'log', '-1', '--format=%H %ct', '--', path], cwd: ROOT })
      .stdout.toString()
      .trim()
      .split(' '),
  );
  const problems: string[] = [];
  if (readmeHash && indexHash && readmeHash !== indexHash) {
    const gap = Math.abs(Number(readmeAt) - Number(indexAt));
    if (gap > SYNC_WINDOW) {
      const older = Number(readmeAt) < Number(indexAt) ? 'README.md' : 'pages/index.mdx';
      problems.push(
        `${older} was last committed ${Math.round(gap / 60)} min apart from the other (> ${SYNC_WINDOW / 60} min) - its statements may have drifted`,
      );
    }
  }
  check(
    'README ↔ index commit window',
    problems,
    'update README.md and src/documentation/pages/index.mdx in the same commit (or within 15 min of each other) so their shared claims stay true (AGENTS.md "README ↔ index parity")',
  );
  }
  
  // 28. component boundary: dialog.js init() claims dialogs generically via a
  // :not(...) selector - every component that owns its own <dialog> (command,
  // alert-dialog, sheet, window) must be excluded there, or dialog.js - loaded first on
  // every page - stamps data-init and the real owner's init() silently skips
  // the element (this exact bug disabled the docs search palette once).
  {
    const dialogSrc = readFileSync(join(COMPS, 'dialog', 'dialog.ts'), 'utf8');
    const claim = dialogSrc.match(/querySelectorAll\((['"])dialog:not\([\s\S]*?\1\)/);
    const owned = ['alert-dialog', 'sheet', 'command', 'window'].filter(
      (c) => claim && !claim[0].includes(`not(.${c})`),
    );
    check(
      'dialog ownership boundary',
      claim
        ? owned.map((c) => `dialog.ts claims dialog.${c} too - add :not(.${c}) to its init() selector`)
        : ['dialog.ts lost the dialog:not(...) init selector - verify cannot check ownership'],
      'components own their dialogs (backdrop close, focus, filtering); dialog.js must :not-exclude each one - see AGENTS.md "Each component owns its dialog"',
    );
  }

  // 28b. DOM boundary (plans/defuss-query-morph-integration.md §5.1): component
  // code that has adopted the core df$ runtime (imports defussQuery) must route
  // structural writes through the sanctioned query ops (.morph()/.html()/
  // .append()/.before()/.after()/factory) - native sinks (innerHTML/outerHTML
  // writes, insertAdjacentHTML, insertAdjacentElement, replaceChildren,
  // insertBefore, appendChild) and the forbidden .prop() escapes are rejected.
  // The boundary keeps ONE renderer per collection, so morph can own
  // reconciliation. Exceptions are file-scoped, reasoned, and stale entries
  // fail too - they must never grow into fallback renderers (§5.1).
  {
    const MIGRATED_RE = /defussQuery/;
    const BANNED: Array<[RegExp, string]> = [
      [/\.\s*innerHTML\s*=[^=]/, 'innerHTML = (use .html()/.morph())'],
      [/\.\s*outerHTML\s*=[^=]/, 'outerHTML = (use .replaceWith())'],
      [/insertAdjacentHTML\s*\(/, 'insertAdjacentHTML( (use .before()/.after()/.append())'],
      [/insertAdjacentElement\s*\(/, 'insertAdjacentElement( (use .before()/.after()/.append())'],
      [/\.replaceChildren\s*\(/, '.replaceChildren( (use .morph()/.empty()+.append())'],
      [/\.insertBefore\s*\(/, '.insertBefore( (use .before()/.after())'],
      [/\.appendChild\s*\(/, '.appendChild( (use .append())'],
      [/\.\s*prop\(\s*['"`](innerHTML|outerHTML|textContent)['"`]/, '.prop("innerHTML"/"outerHTML"/"textContent") (§5.2 runtime-forbidden escape)'],
    ];
    // reasoned, file-scoped exceptions (name → justification). Keep EMPTY:
    // a needed exception must state why it cannot be a query op.
    const DOM_BOUNDARY_ALLOW: Record<string, string> = {};
    const problems: string[] = [];
    for (const c of componentDirs) {
      const file = join(COMPS, c, `${c}.ts`);
      if (!existsSync(file)) continue; // CSS-only component
      const src = readFileSync(file, 'utf8');
      if (!MIGRATED_RE.test(src)) continue; // not query-adopted yet (pre-baseline)
      const hitLines = src
        .split('\n')
        .map((line, i) => ({ line, n: i + 1 }))
        .filter(({ line }) => !/^\s*(\/\/|\*|\/\*)/.test(line)) // comments document the rule
        .filter(({ line }) => BANNED.some(([re]) => re.test(line)));
      if (DOM_BOUNDARY_ALLOW[c]) {
        if (hitLines.length === 0)
          problems.push(`${c}: DOM_BOUNDARY_ALLOW entry is stale (no banned writes left) - remove it`);
        else {
          const allowed = DOM_BOUNDARY_ALLOW[c];
          for (const { n } of hitLines)
            problems.push(`${c}:${n}: exception ${JSON.stringify(allowed)} - re-check whether a query op covers it now`);
        }
        continue;
      }
      for (const { line, n } of hitLines) {
        const label = BANNED.find(([re]) => re.test(line))![1];
        problems.push(`src/components/${c}/${c}.ts:${n}: ${label}`);
      }
    }
    check(
      'DOM boundary (migrated components)',
      problems,
      'route the write through the core df$ runtime - .morph()/.html() for content, .append()/.before()/.after() for moves/mounts, factory df$("<markup>") for static markup (plans/defuss-query-morph-integration.md §5.1; guide: DOM Querying & Morphing)',
    );
  }

  // 28c. runtime provenance (§6): core.js/all.js embed defuss-morph +
  // defuss-query, so EVERY shipped copy (readable + minified twins) must carry
  // the per-release pointer (version + pinned versions + LICENSE hashes), and
  // NOTICE.txt must equal a fresh render. Like stats.json freshness: the
  // provenance of a release is data, and data goes stale silently.
  {
    const problems: string[] = [];
    let expectedPointer: string | null = null;
    let expectedNotice: string | null = null;
    try {
      const input = collectProvenance(ROOT);
      expectedPointer = provenancePointer(input);
      expectedNotice = provenanceNotice(input);
    } catch (e) {
      problems.push(`provenance unresolvable: ${(e as Error).message} - run \`bun install\``);
    }
    if (expectedPointer) {
      for (const artifact of ['core.js', 'core.min.js', 'all.js', 'all.min.js']) {
        const f = join(DIST, 'components', artifact); // the SHIPPED copies carry the notice
        if (!existsSync(f)) {
          problems.push(`dist/components/${artifact} missing - rebuild`);
        } else if (!readFileSync(f, 'utf8').includes(expectedPointer)) {
          problems.push(
            `dist/components/${artifact} lacks the current provenance pointer (embedded upstreams changed, or the artifact predates the last bundle/minify) - rebuild`,
          );
        }
      }
      const notice = join(DIST, 'components/NOTICE.txt');
      if (!existsSync(notice)) problems.push('dist/components/NOTICE.txt missing - rebuild');
      else if (expectedNotice && readFileSync(notice, 'utf8') !== expectedNotice)
        problems.push('dist/components/NOTICE.txt is stale vs. installed upstreams - rebuild');
    }
    check(
      'runtime provenance',
      problems,
      'run `bun run build` - bundle.ts stamps the pointer into core/all (+ min twins) and writes NOTICE.txt (plans/defuss-query-morph-integration.md §6)',
    );
  }

  // 29. changelog ↔ version: the version COMMITTED in package.json must have an
  // entry in changelog.html - a release cut without a changelog is invisible to
  // readers, which happened to v0.7.14. Each entry carries the commit messages
  // of its release, and once the version is committed the changelog commit's
  // git hash is available too, so the entry must embed it as
  // <code class="changelog-hash"> (legacy entries predating this rule keep
  // their date badge). A missing entry means a two-commit fix: commit the
  // entry, then commit that commit's short hash into the entry itself.
  {
    const pkgAtHead = Bun.spawnSync({ cmd: ['git', 'show', 'HEAD:package.json'], cwd: ROOT });
    let committedVersion: string | null = null;
    try {
      committedVersion = pkgAtHead.exitCode === 0 ? (JSON.parse(pkgAtHead.stdout.toString()).version as string) : null;
    } catch {
      committedVersion = null; // unreadable HEAD manifest → treated as "no git" (warn, not fail)
    }
    /** Resolve a short hash against this repo and report whether it touched the changelog. */
    const resolveCommit = (hash: string): CommitInfo => {
      if (Bun.spawnSync({ cmd: ['git', 'cat-file', '-e', `${hash}^{commit}`], cwd: ROOT }).exitCode !== 0) return null;
      const files = Bun.spawnSync({ cmd: ['git', 'show', '--name-only', '--format=', hash], cwd: ROOT }).stdout.toString();
      return { exists: true, touchesChangelog: files.includes('documentation/data/changelog.json') || files.includes('documentation/changelog.html') };
    };
    const changelogJson = existsSync(join(DOCS, 'data/changelog.json'))
      ? readFileSync(join(DOCS, 'data/changelog.json'), 'utf8')
      : '{"entries":[]}';
    const { problems, warnings } = changelogProblems({
      entries: parseChangelogData(changelogJson),
      committedVersion,
      worktreeVersion: version,
      resolveCommit,
    });
    check('changelog ↔ version', problems, FIX_TWO_COMMITS);
    // entries are commit messages - prose with code spans and links only.
    // Raw markup in an <li> renders live (a v0.8.0 entry once embedded a
    // working <video> and a raw <hr> in the middle of the changelog).
    check(
      'changelog entries are text',
      changelogDataMarkupProblems(changelogJson),
      'escape element names in commit messages as <video> - only <code>/<strong>/<a>/<span>/<em>/<b>/<i>/<kbd>/<li> may appear raw',
    );
    check(
      'changelog pending bump',
      warnings,
      'add the entry for the bumped version NOW - commit it, then commit that commit\'s hash into the entry (AGENTS.md "Changelog") - before the version bump itself is committed',
      true,
    );
  }

  // 30. skill frontmatter + SKILL.md index: every component-skill.md declares
  // name/why/when/where/supportedStates (the discovery contract agents read —
  // AGENTS.md "Component skill template"), and the generated agent entry
  // point (src/SKILL.md → dist/SKILL.md) matches a fresh render of
  // SKILL_tpl.md + those frontmatters. Skills change → the index must be
  // rebuilt, same drift class as snippets and the search index.
  {
    const fmProblems = componentDirs
      .filter((c) => existsSync(join(COMPS, c, 'component-skill.md')))
      .filter((c) => !parseSkillFrontmatter(readFileSync(join(COMPS, c, 'component-skill.md'), 'utf8')))
      .map((c) => `src/components/${c}/component-skill.md has no valid frontmatter (${SKILL_FRONTMATTER_KEYS.join('/')})`);
    check(
      'skill frontmatter',
      fmProblems,
      `add a --- frontmatter block (${SKILL_FRONTMATTER_KEYS.join(', ')}) to each listed skill - then \`bun run build\` regenerates SKILL.md`,
    );
    let skillProblems: string[] = [];
    try {
      const fresh = buildSkillText(SRC);
      if (!existsSync(join(SRC, SKILL_OUTPUT_FILE))) skillProblems.push(`src/${SKILL_OUTPUT_FILE} missing`);
      else if (readFileSync(join(SRC, SKILL_OUTPUT_FILE), 'utf8') !== fresh)
        skillProblems.push(`src/${SKILL_OUTPUT_FILE} is stale vs ${SKILL_TEMPLATE_FILE} + skill frontmatter`);
    } catch (e) {
      skillProblems.push(`${(e as Error).message.split(' - ')[0]} - SKILL.md cannot be generated`);
    }
    check(
      'SKILL.md ↔ skills',
      skillProblems,
      'run `bun run build` (build.ts regenerates src/SKILL.md from SKILL_tpl.md + frontmatter; never edit SKILL.md by hand)',
    );
    // the repo-root SKILL.md (the whole project as ONE agent skill: install
    // paths, rules, docs map from nav.ts + page frontmatter, component index
    // from skill frontmatter) - same drift class, one more source set
    const rootProblems: string[] = [];
    try {
      const fresh = await buildRootSkillText(ROOT);
      if (!existsSync(join(ROOT, ROOT_SKILL_OUTPUT_FILE))) rootProblems.push(`${ROOT_SKILL_OUTPUT_FILE} missing at the repo root`);
      else if (readFileSync(join(ROOT, ROOT_SKILL_OUTPUT_FILE), 'utf8') !== fresh)
        rootProblems.push(`${ROOT_SKILL_OUTPUT_FILE} is stale vs src/${ROOT_SKILL_TEMPLATE_FILE} + nav.ts + page/skill frontmatter`);
      // its references/components/ copies: one per component skill, current, no extras
      const skillDir = dirname(join(ROOT, ROOT_SKILL_OUTPUT_FILE));
      const refs = buildSkillReferences(ROOT);
      for (const [rel, text] of refs) {
        const abs = join(skillDir, rel);
        if (!existsSync(abs)) rootProblems.push(`${relative(ROOT, abs)} missing`);
        else if (readFileSync(abs, 'utf8') !== text) rootProblems.push(`${relative(ROOT, abs)} is stale vs its component-skill.md`);
      }
      const refDir = join(skillDir, 'references', 'components');
      if (existsSync(refDir)) {
        for (const f of readdirSync(refDir)) {
          if (!refs.has(`references/components/${f}`)) rootProblems.push(`${relative(ROOT, join(refDir, f))} has no component-skill.md source`);
        }
      }
    } catch (e) {
      rootProblems.push(`${(e as Error).message.split(' - ')[0]} - ${ROOT_SKILL_OUTPUT_FILE} cannot be generated`);
    }
    check(
      'root SKILL.md ↔ sources',
      rootProblems,
      `run \`bun run build\` (build.ts regenerates the repo-root ${ROOT_SKILL_OUTPUT_FILE} from src/${ROOT_SKILL_TEMPLATE_FILE}; never edit it by hand)`,
    );
  }

  // 30b. architecture page ↔ ARCH.md: the published Overview page is a
  // generated render of the repo's design manifesto (ArchBody renders
  // ARCH.md via lib/arch-md.ts at SSG build time). Same drift class as
  // SKILL.md: edit ARCH.md, rebuild - never hand-edit the page (AGENTS.md
  // "ARCH.md ↔ architecture page sync").
  {
    const archProblems: string[] = [];
    try {
      const md = readFileSync(join(ROOT, 'ARCH.md'), 'utf8');
      const expectedBody = archBodyHtml(md.trim());
      const page = join(DOCS_DIST, 'architecture.html');
      if (!existsSync(page)) archProblems.push('dist/documentation/architecture.html missing - run `bun run build:docs`');
      else {
        const { document } = parseHTML(readFileSync(page, 'utf8'));
        // the § anchors are TOC chrome (the plugin injects them into every
        // page) - strip before comparing against the ARCH.md render
        document.querySelectorAll('.arch-prose .heading-anchor').forEach((el) => el.remove());
        const shown = document.querySelector('.arch-prose')?.innerHTML ?? '';
        // canonicalize both sides through the same HTML parse+serialize pass:
        // the SSG serializer and linkedom normalize markup differently at the
        // byte level, the DOM must be equal
        const { document: canon } = parseHTML(`<div class="arch-prose">${expectedBody}</div>`);
        const expected = canon.querySelector('.arch-prose')?.innerHTML ?? '';
        if (shown !== expected) archProblems.push('architecture page body is stale vs ARCH.md - run `bun run build:docs`');
      }
    } catch (e) {
      archProblems.push(`${(e as Error).message.split(' - ')[0]} - architecture page cannot be checked`);
    }
    check(
      'architecture ↔ ARCH.md',
      archProblems,
      'run `bun run build:docs` (ArchBody regenerates the page from ARCH.md; never edit the page by hand)',
    );
  }

  // 30c. component taxonomy type: every component declares exactly one type
  // (ATM | MOL | ORG | BLK | TPL - AGENTS.md "Component taxonomy") in its skill
  // frontmatter, and the other two carriers of that claim must agree with it:
  // the sidebar badge (site-nav reads the skill frontmatter at build time)
  // and the doc page badge (exact markup from scripts/lib/taxonomy.ts).
  {
    const typeProblems: string[] = [];
    for (const c of componentDirs) {
      const skill = join(COMPS, c, 'component-skill.md');
      if (!existsSync(skill)) continue; // reported by "component skills"
      const meta = parseSkillFrontmatter(readFileSync(skill, 'utf8'));
      if (!meta) continue; // reported by "skill frontmatter"
      const page = join(DOCS_DIST, `${c}.html`);
      if (!existsSync(page)) continue; // reported by "documentation pages"
      const html = readFileSync(page, 'utf8');
      // doc page badge: exact generated markup (never hand-written)
      if (!html.includes(typeBadgeHtml(meta.type as ComponentType))) {
        typeProblems.push(`${c}: doc page lacks the exact \`${meta.type}\` type badge`);
      }
      // sidebar badge on the same rendered page (site-nav built it from the
      // same skill frontmatter at SSG build time). The badge must sit INSIDE
      // the component's own link - a lazy match across </a> once passed on the
      // NEXT item's badge while a submenu parent (Image) rendered none.
      const sidebarBadge = html.match(new RegExp(`<a class="nav-link[^"]*" href="${c}\\.html"[^>]*>(?:(?!</a>)[\\s\\S])*?data-type="([A-Z]{3})"`));
      if (!sidebarBadge) typeProblems.push(`${c}: sidebar link lacks a type badge`);
      else if (sidebarBadge[1] !== meta.type) typeProblems.push(`${c}: sidebar badge says ${sidebarBadge[1]}, skill frontmatter says ${meta.type}`);
    }
    check(
      'component type badges',
      typeProblems,
      'one type per component, identical in all three places - skill `type:` frontmatter (source of truth), sidebar badge + doc page badge (both built from that frontmatter by defuss-ssg)',
    );
  }

  // 31. README/index "no JavaScript" stat: the docs advertise how many
  // components ship no JS; the claim must match the actual component tree
  // (a .ts source in src/components = ships a .js). Same gate for both
  // files so the parity pair can never state different numbers.
  {
    const withJs = componentDirs.filter((c) => existsSync(join(COMPS, c, `${c}.ts`)));
    const actual = { cssOnly: componentDirs.length - withJs.length, total: componentDirs.length };
    const statFix = `update the "**N of M components need no JavaScript**" line in README.md AND src/documentation/pages/index.mdx (within the 15-min parity window) to match the component tree (${actual.cssOnly} of ${actual.total})`;
    check(
      'README CSS-only stat',
      readmeCssOnlyProblems(readFileSync(join(ROOT, 'README.md'), 'utf8'), 'README.md', actual),
      statFix,
    );
    check(
      'index CSS-only stat',
      existsSync(join(DOCS_DIST, 'index.html'))
        ? readmeCssOnlyProblems(
            readFileSync(join(DOCS_DIST, 'index.html'), 'utf8'),
            'dist/documentation/index.html',
            actual,
          )
        : ['dist/documentation/index.html missing - run `bun run build:docs`'],
      statFix,
    );
  }

  // 32. theme contrast: the doc-site sidebar must stay readable under every
  // theme preset. Text tokens must reach WCAG AA against the background
  // they actually sit on (--sidebar / --sidebar-accent) - themes whose
  // sidebar-accent pairs failed this shipped invisible active nav links.
  {
    const themes = parseThemes(readFileSync(join(DOCS, 'runtime/themes.ts'), 'utf8'));
    // the "default" theme isn't in themes.ts - fold the shipped token file in
    const defaultModes = defaultTokenModes(readFileSync(join(SRC, 'theme/utils/default-semantic-tokens.css'), 'utf8'));
    const problems = sidebarContrastProblems([
      ...themes,
      { id: 'default', label: 'Default', modes: defaultModes },
    ]);
    check(
      'theme sidebar contrast',
      problems,
      'raise the flagged theme token(s) in src/documentation/runtime/themes.ts (or src/theme/utils/default-semantic-tokens.css) until the sidebar text pair reaches WCAG AA (>=4.5) - the measured pairs are pinned by tests/contrast.test.ts',
    );
    check(
      'theme radius consistency',
      radiusConsistencyProblems(themes),
      'declare the same `radius` in BOTH the light and dark block of the flagged theme(s) in src/documentation/runtime/themes.ts (AGENTS.md "Theme radius consistency")',
    );
  }

  // 33. component schemas (plans/cmp-schemas-and-codeexample.md §14/§25): every
  // <name>.schema.json beside a component parses under the schema contract
  // (scripts/lib/schema.ts - the single validator), its `name` matches the
  // component folder, and the runtime code that ships it imports none of them
  // (§23: schemas are documentation/tooling data - zero bytes in the bundle).
  const schemaFiles = componentDirs
    .map((d) => join(COMPS, d, `${d}.schema.json`))
    .filter((f) => existsSync(f));
  const schemaByName = new Map<string, ComponentSchema>();
  {
    const problems: string[] = [];
    for (const f of schemaFiles) {
      const dir = relative(COMPS, f).split(sep)[0];
      const rel = relative(ROOT, f);
      const { schema, problems: p } = parseComponentSchemaText(readFileSync(f, 'utf8'), rel);
      problems.push(...p);
      if (schema) {
        if (schema.name !== dir) problems.push(`${rel}: name "${schema.name}" ≠ component folder "${dir}"`);
        schemaByName.set(dir, schema);
      }
    }
    // runtime schema-free: no shipped runtime source references a schema file
    for (const f of walk(SRC, ['.ts'])) {
      const rel = relative(SRC, f);
      if (isDocsSsgAuthoringSrc(rel)) continue; // docs tooling MAY read schemas (§23)
      if (/schema\.json/.test(readFileSync(f, 'utf8'))) problems.push(`${rel} references a *.schema.json - runtime code must be schema-free (plan §23)`);
    }
    check(
      'component schemas',
      problems,
      'fix the flagged *.schema.json against the contract in scripts/lib/schema.ts / keep runtime sources schema-free (plan §14/§23)',
    );
  }

  // 34. schema publication freshness (§24): dist/schemas/ must carry a byte-exact
  // copy of every sidecar + the deterministic manifest scripts/build.ts writes.
  {
    const pub = join(DIST, 'schemas');
    const problems: string[] = [];
    const manifest = join(pub, 'manifest.json');
    if (!existsSync(manifest)) problems.push('dist/schemas/manifest.json missing - run `bun run build`');
    else if (readFileSync(manifest, 'utf8') !== schemaManifestText([...schemaByName.keys()]))
      problems.push('dist/schemas/manifest.json is stale - run `bun run build`');
    for (const [name] of schemaByName) {
      const published = join(pub, `${name}.schema.json`);
      if (!existsSync(published)) problems.push(`dist/schemas/${name}.schema.json missing - run \`bun run build\``);
      else if (!readFileSync(published).equals(readFileSync(join(COMPS, name, `${name}.schema.json`))))
        problems.push(`dist/schemas/${name}.schema.json differs from the src sidecar - run \`bun run build\``);
    }
    check('schemas published', problems, 'run `bun run build` (build.ts copies schemas + writes the sorted manifest)');
  }

  // 35. schema ↔ docs States-table parity (§13–§18/§25): every schema'd component
  // page carries the canonical contract table and matches the schema in BOTH
  // directions - every schema state documented, no phantom states, types /
  // enum values / defaults matching verbatim.
  {
    const problems: string[] = [];
    for (const [name, schema] of schemaByName) {
      const page = join(DOCS_PAGES, `${name}.mdx`);
      if (!existsSync(page)) {
        problems.push(`component "${name}" has a schema but no pages/${name}.mdx - every schema needs its documentation page (plan §25.4)`);
        continue;
      }
      const mdx = readFileSync(page, 'utf8');
      const t = findStatesTable(mdx);
      if (!t.found)
        problems.push(`pages/${name}.mdx: canonical ## States contract table missing (plan §13 - ## States / <StatesSection> + a \`\`\`states fence)`);
      else problems.push(...schemaStatesProblems(`pages/${name}.mdx`, schema, t.rows, t.problems));
    }
    check(
      'schema ↔ States docs',
      problems,
      "fix the Markdown States table so it matches the schema - do NOT loosen the schema to pass (plan §20); parse/compare lives in scripts/lib/schema.ts, pinned by tests/component-schema.test.ts",
    );
    // migration ratchet (plan §26 phase 4): interactive components without a
    // schema yet - shrink toward zero, same path STATE_API_LEGACY took
    const pending = componentDirs.filter((d) => !schemaByName.has(d) && existsSync(join(COMPS, d, `${d}.ts`)));
    check(
      'component schema coverage',
      pending.map((d) => `${d}: no ${d}.schema.json yet`),
      'audit the runtime and add <name>.schema.json beside the component + a ## States contract table on its page (plan §26 phase 4)',
      true,
    );
  }

  // 36. executable-example verification (§21/§22/§27): every example fence is a
  // non-empty source bound to a real component (its schema); CodeExample usage
  // stays source-only (the §5 regression: no dual-source props / children);
  // the retired dual-render mechanism stays gone.
  {
    const problems: string[] = [];
    const docsCfg = readFileSync(join(DOCS, 'config.ts'), 'utf8');
    if (!docsCfg.includes('remarkDocExamples'))
      problems.push('documentation/config.ts does not wire remarkDocExamples - example fences would render as plain code blocks (§22)');
    for (const file of readdirSync(DOCS_PAGES).filter((f) => f.endsWith('.mdx'))) {
      const mdx = readFileSync(join(DOCS_PAGES, file), 'utf8');
      const page = file.replace(/\.mdx$/, '');
      for (const ex of exampleFences(mdx)) {
        if (ex.body.trim() === '') problems.push(`pages/${file}:${ex.line} empty example fence (plan §21)`);
        const orphan = exampleFragment(ex.body);
        if (orphan)
          problems.push(`pages/${file}:${ex.line} example starts with ${orphan} - it needs its container (a list / table / select) to render, the fence runs on its own`);
        for (const ph of examplePlaceholders(ex.body))
          problems.push(`pages/${file}:${ex.line} placeholder element in an executable example - it renders nothing: ${ph}`);
        // schema="none": guide-page utility demos (layout/sizing/sizing-scale…)
        // demonstrate the optional modules, not a component - no contract to bind
        if (ex.schema === 'none') continue;
        const comp = ex.component ?? page;
        if (!existsSync(join(COMPS, comp)))
          problems.push(`pages/${file}:${ex.line} example schema component "${comp}" is not a shipped component (pages/${page}.mdx → add component="…"/schema="none" or ship the component)`);
      }
      for (const m of mdx.matchAll(/<CodeExample[^>]*?\s(code|preview|previewSource)=/g))
        problems.push(`pages/${file}: CodeExample received \`${m[1]}\` - dual-source prop, source={fence} only (plan §5)`);
      if (mdx.includes('</CodeExample>'))
        problems.push(`pages/${file}: CodeExample with children - the fence body is the ONLY source (plan §5)`);
    }
    const codePreviewHits = walk(SRC, ['.mdx', '.tsx', '.ts']).filter((f) => /CodePreview/.test(readFileSync(f, 'utf8')));
    for (const f of codePreviewHits) problems.push(`${relative(ROOT, f)} mentions CodePreview - the dual-render mechanism stays removed (plan §21)`);
    check(
      'example fences',
      problems,
      'one source per example: fix the fence/props on the flagged page (plan §21/§22); empty examples, placeholder elements ("...") and dual-source props are rejected - an example fence is executed verbatim',
    );
  }

  console.log(
  failed
    ? `\nverify: FAILED (${failed} check group(s), ${warned} warning group(s))`
    : `\nverify: OK${warned ? ` (${warned} warning group(s))` : ''}`,
);
process.exit(failed ? 1 : 0);
