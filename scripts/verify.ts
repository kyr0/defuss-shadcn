#!/usr/bin/env bun
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { parseHTML } from 'linkedom';
import { auditUtilities, walk } from './lib/audit.ts';
import { componentFingerprints, declaredStates } from './lib/inputs.ts';
import { BUNDLE_ARTIFACTS, isDerivedArtifact, minifyArtifactProblems } from './lib/minify.ts';
import { STATS_FILE, statsClaimProblems, type StatsDoc } from './lib/stats.ts';
import { buildStatsFileText } from './lib/stats-files.ts';
import { snippetDrifts } from './lib/snippets.ts';
import { mirrorHashes } from './lib/mirror.ts';
import { changelogProblems, changelogMarkupProblems, FIX_TWO_COMMITS, parseChangelogEntries, type CommitInfo } from './lib/changelog.ts';
import {
  parseSkillFrontmatter,
  SKILL_FRONTMATTER_KEYS,
  SKILL_OUTPUT_FILE,
  SKILL_TEMPLATE_FILE,
} from './lib/skill.ts';
import { readmeCssOnlyProblems } from './lib/readme.ts';
import { ariaDescribedByProblems, fieldDescriptionOwnerProblems, fieldFeatureProblems } from './lib/fields.ts';
import { parseThemes, defaultTokenModes, sidebarContrastProblems, radiusConsistencyProblems } from './lib/contrast.ts';
import { buildSkillText } from './lib/skill-files.ts';
import { ARCH_OUTPUT_FILE, ARCH_TEMPLATE_FILE, buildArchPageText } from './lib/arch-page.ts';
import { typeBadgeHtml, type ComponentType } from './lib/taxonomy.ts';

/**
 * Why: one static, fast gate that proves the repo is self-consistent after any
 * change — run automatically at the end of `bun run build`. Every check names
 * the offending file and the fix. Failures exit 1; ⚠ warnings (known gaps,
 * e.g. not every component has an e2e test yet) report but don't fail.
 */

const ROOT = join(import.meta.dirname, '..');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');
const DOCS = join(SRC, 'documentation');
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
const docPages = readdirSync(DOCS).filter((f) => f.endsWith('.html'));

// 1. every component folder ships a component skill
check(
  'component skills',
  componentDirs.filter((c) => !existsSync(join(COMPS, c, 'component-skill.md'))).map((c) => `src/components/${c}/component-skill.md missing`),
  'write the skill (see AGENTS.md "Component skill template")',
);

// 2. every component has a documentation page
check(
  'documentation pages',
  componentDirs.filter((c) => !docPages.includes(`${c}.html`)).map((c) => `src/documentation/${c}.html missing`),
  `copy src/documentation/badge.html as template`,
);

// 3. every component has an e2e smoke test — rollout complete, hard gate.
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
const tokenFile = readFileSync(join(SRC, 'theme/default-semantic-tokens.css'), 'utf8');
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
  'use an existing token from theme/default-semantic-tokens.css or a literal value (no new tokens)',
);

// 5. no undefined utility-shaped classes (components = hard gate, doc pages = info)
const { docIssues, compIssues } = auditUtilities(ROOT);
check(
  'utility classes (doc pages)',
  docIssues,
  'define the class in documentation/css/docs-utilities.css',
  true,
);
check(
  'utility classes (components)',
  compIssues,
  'define the class in documentation/css/docs-utilities.css or replace with component CSS',
);

// 6. inline CSS/JS snippets on doc pages match their source files
const docHtml = docPages.map((p) => [p, readFileSync(join(DOCS, p), 'utf8')] as const);
const snippetProblems: string[] = [];
for (const [page, html] of docHtml) {
  const cssLink = html.match(/<a\s+href="(\.\.\/components\/[^"]+\.css)"[^>]*>view file<\/a>/)?.[1];
  if (cssLink) {
    const cssPath = join(DOCS, cssLink);
    if (existsSync(cssPath) && snippetDrifts(html, 'language-scss', readFileSync(cssPath, 'utf8'))) {
      snippetProblems.push(`${page} — CSS snippet out of date vs ${cssLink}`);
    }
  }
  const jsLink = html.match(/<a\s+href="(\.\.\/components\/[^"]+\.js)"[^>]*>view file<\/a>/)?.[1];
  if (jsLink) {
    const jsPath = join(DOCS, jsLink);
    const src = existsSync(jsPath.replace(/\.js$/, '.ts')) ? jsPath.replace(/\.js$/, '.ts') : jsPath;
    if (existsSync(src) && snippetDrifts(html, 'language-javascript', readFileSync(src, 'utf8'))) {
      snippetProblems.push(`${page} — JS snippet out of date vs ${relative(DOCS, src)}`);
    }
  }
}
check(
  'snippet sync',
  snippetProblems,
  'run `bun run sync-snippets`',
);

// 6b. doc-page code-block integrity: unbalanced <pre> tags mean a snippet's
// opening tag was destroyed and raw code leaked into live markup (accordion/
// dialog shipped exactly that — the parser then swallows real DOM and site.js
// mis-pairs code toggles); duplicate real-DOM ids mean a whole section was
// duplicated (both pages also shipped that, breaking `built with` anchors and
// any getElementById consumer). Ids quoted inside <pre>/inline <code> are
// prose, not DOM, so both are stripped before the duplicate scan.
const codeBlockProblems: string[] = [];
for (const [page, html] of docHtml) {
  const opens = html.match(/<pre[\s>]/g)?.length ?? 0;
  const closes = html.match(/<\/pre>/g)?.length ?? 0;
  if (opens !== closes) {
    codeBlockProblems.push(
      `${page}: ${opens} <pre> open vs ${closes} </pre> close tags — a code block's opening tag was destroyed, raw code leaked into markup`,
    );
    continue;
  }
  const realDom = html.replace(/<pre[\s>][\s\S]*?<\/pre>/g, '').replace(/<code[\s>][\s\S]*?<\/code>/g, '');
  const ids: string[] = [];
  for (const m of realDom.matchAll(/(?<![\w-])id="([^"]+)"/g)) ids.push(m[1]);
  const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (dupes.length) {
    codeBlockProblems.push(`${page}: duplicate element id(s) ${dupes.join(', ')} — a section is duplicated`);
  }
}
check(
  'doc code-block integrity',
  codeBlockProblems,
  'repair the page markup: every <pre><code class="language-…"> block needs its opening tag, and each section id must appear exactly once',
);

// 7. every doc page loads the single-file bundle (scripts/bundle.ts): one
// all.css link + one all.js module script replace the old per-component
// include lists (cross-page demos still work — the bundle covers all
// components). Stray per-component stylesheet/script tags are banned so the
// lists can't creep back; <a href> "view file" anchors, data-spec-href spans
// and escaped code samples (&lt;link…) stay legal — only real tags match.
const importProblems: string[] = [];
for (const [page, html] of docHtml) {
  if (!html.includes('<link rel="stylesheet" href="../components/all.css">')) {
    importProblems.push(`${page} missing the all.css bundle link`);
  }
  if (!html.includes('<script type="module" src="../components/all.js"></script>')) {
    importProblems.push(`${page} missing the all.js bundle script`);
  }
  for (const m of html.matchAll(/<link\b[^>]*\bhref="\.\.\/components\/[^/"]+\/[^/"]+\.css"/g)) {
    importProblems.push(`${page} loads a per-component stylesheet (${m[0]}) — the all.css bundle replaced the include lists`);
  }
  for (const m of html.matchAll(/<script\b[^>]*\bsrc="\.\.\/components\/[^/"]+\/[^/"]+\.js"/g)) {
    importProblems.push(`${page} imports a per-component script (${m[0]}) — the all.js bundle replaced the include lists`);
  }
}
check(
  'cross-page imports',
  importProblems,
  'load the bundle on every doc page: <link rel="stylesheet" href="../components/all.css"> and <script type="module" src="../components/all.js"></script>',
);

// 8. every doc page is reachable from the sidebar (layout.ts NAV/BUILT)
const layout = readFileSync(join(DOCS, 'js/layout.ts'), 'utf8');
check(
  'sidebar coverage',
  docPages.filter((p) => !layout.includes(`'${p}'`)).map((p) => `${p} not referenced in js/layout.ts`),
  "add the page to the NAV array (and BUILT set if real) in js/layout.ts",
);

// 9. oxlint clean (oxlint exits non-zero only on errors — warnings pass by policy)
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
  distProblems.push('dist/ does not exist — run `bun run build`');
} else {
  for (const f of walk(SRC, [''])) {
    const rel = relative(SRC, f);
    // ambient type declarations compile nothing and ship nothing; src/shared
    // is a build-time-only helper (inlined into dist component .js files)
    if (rel.endsWith('.d.ts') || rel.startsWith(`shared${sep}`)) continue;
    if (rel.endsWith('.ts')) {
      const js = join(DIST, rel.replace(/\.ts$/, '.js'));
      if (!existsSync(js)) distProblems.push(`dist/${relative(SRC, f).replace(/\.ts$/, '.js')} missing — rebuild`);
      else if (readFileSync(js, 'utf8').trim() === '') distProblems.push(`dist/${relative(SRC, rel)} is empty — rebuild`);
    } else {
      const mirror = join(DIST, rel);
      if (!existsSync(mirror)) distProblems.push(`dist/${rel} missing — rebuild`);
      else if(!readFileSync(mirror).equals(readFileSync(f))) distProblems.push(`dist/${rel} differs from src — rebuild`);
    }
  }
  const srcSet = new Set(walk(SRC, ['']).map((f) => relative(SRC, f).replace(/\.ts$/, '.js')));
  for (const f of walk(DIST, [''])) {
    const rel = relative(DIST, f);
    // scripts/minify.ts + tsc sourceMap write derived twins, scripts/stats.ts
    // writes the generated stats document, scripts/bundle.ts writes the
    // single-file bundle — none of them are orphans
    if (isDerivedArtifact(rel) || BUNDLE_ARTIFACTS.has(rel) || rel === STATS_FILE) continue;
    if (!srcSet.has(rel)) distProblems.push(`dist/${rel} is orphaned (no src/ counterpart) — rebuild`);
  }
}
check(
  'dist 1:1',
  distProblems,
  'run `bun run build` (never edit dist/ directly)',
);

// 10a. every shipped component file must carry its minified twins (the
// Installation page advertises *.min.css / *.min.js / *.min.js.map / *.js.map
// to consumers — a component shipping without them is a broken CDN URL).
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

// 10d. dist/stats.json must match the CURRENT dist/components/ tree — it is
// generated by scripts/stats.ts (counts per taxonomy type, JS/CSS-only split,
// byte sizes incl. minified + gzipped). Byte-comparison against exactly what
// the writer produces (shared lib/stats-files.ts), so a component edit or a
// minify re-run without regenerating stats fails here.
const statsProblems: string[] = [];
if (existsSync(DIST)) {
  const statsPath = join(DIST, STATS_FILE);
  if (!existsSync(statsPath)) statsProblems.push(`dist/${STATS_FILE} missing — generated by scripts/stats.ts`);
  else if (!readFileSync(statsPath).equals(Buffer.from(buildStatsFileText(DIST), 'utf8')))
    statsProblems.push(`dist/${STATS_FILE} is stale vs. dist/components/ — rebuild`);
}
check(
  'stats.json fresh',
  statsProblems,
  'run `bun run stats` (or `bun run build`, which regenerates it after minify)',
);

// 10e. README + doc-site index must PROMINENTLY state the current numbers —
// total, withJs, withoutJs and the KiB-formatted gzip sizes — as the exact
// sentence generated from dist/stats.json (shared renderer in lib/stats.ts).
// A stale or missing claim is misinformation: the docs promise the site's
// data, so verify compares the rendered sentence, not hand-typed digits.
// (Runs after the fresh gate, which already fails if stats.json lags dist/.)
if (statsProblems.length === 0) {
  const statsDoc = JSON.parse(readFileSync(join(DIST, STATS_FILE), 'utf8')) as StatsDoc;
  const claim = statsClaimProblems(readFileSync(join(ROOT, 'README.md'), 'utf8'), 'README.md', statsDoc).concat(
    statsClaimProblems(readFileSync(join(DOCS, 'index.html'), 'utf8'), 'src/documentation/index.html', statsDoc),
  );
  check(
    'stats claim (README + index)',
    claim,
    'state the current footprint verbatim in both files — update the sentence to match dist/stats.json and run `bun run docs` (README.md and src/documentation/index.html are a parity pair, commit them together)',
  );
}

// 10b. State API contract (AGENTS.md "State API"): every JS component must
// expose the global preamble + a declared default state + a bound per-element
// api. Ratchet rollout: components listed in STATE_API_LEGACY predate the
// contract and only warn — remove a name from the list as it is migrated, and
// every NEW JS component must satisfy the contract from day one.
// Migration complete: every JS component satisfies the State API contract —
// keep this list empty as the ratchet (new components must comply from day one).
const STATE_API_LEGACY: string[] = [];
const STATE_API_PATTERNS: Array<[string, RegExp]> = [
  // preamble comes from the shared helper (build inlines it into dist .js);
  // inline globals still accepted so hand-rolled/legacy styles pass too
  ['defussGlobals() preamble', /(defussGlobals\(\)|globalThis\._defussShadcn\s*=)/],
  ['registry api assignment', /(_defussShadcn|defussGlobals\(\))\.\w+Api\s*=/],
  ['registry states assignment', /(_defussShadcn|defussGlobals\(\))\.\w+States\s*=/],
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
    ? `${name}: no ${name}States = ['default', …] declared — refactor this component to support at least the 'default' state following the State API architecture${rest ? ` (also missing: ${rest})` : ''}`
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

// 10c. shipped JS must contain the inlined preamble: every component whose
// src/ .ts uses defussGlobals() must ship a .js that CALLS it — build.ts is
// responsible for the inlining; if someone edits dist/ or breaks the build
// post-pass, the registry globals silently vanish at runtime.
const inlineProblems: string[] = [];
for (const name of componentDirs) {
  const tsFile = join(COMPS, name, `${name}.ts`);
  if (!existsSync(tsFile) || !readFileSync(tsFile, 'utf8').includes('defussGlobals()')) continue;
  const distJs = join(DIST, 'components', name, `${name}.js`);
  if (!existsSync(distJs)) continue; // already reported by dist 1:1
  const shipped = readFileSync(distJs, 'utf8');
  if (!shipped.includes('defussGlobals()')) {
    inlineProblems.push(`${name}.js missing defussGlobals() call — run \`bun run build\` or add the import in src`);
  } else if (shipped.includes('_shared/state-api') || shipped.includes('../../shared/')) {
    inlineProblems.push(`${name}.js still imports _shared — build post-pass failed to inline`);
  }
}
check(
  'inlined preamble (dist)',
  inlineProblems,
  'run `bun run build`; never edit dist/ directly',
);

// 11. every component doc page exposes a default-state .preview block — the
//     contract create-screenshots.ts (and the agent's eye) relies on
const previewProblems: string[] = [];
for (const c of componentDirs) {
  const page = join(DOCS, `${c}.html`);
  if (existsSync(page) && !readFileSync(page, 'utf8').includes('class="preview"')) {
    previewProblems.push(`src/documentation/${c}.html has no .preview block`);
  }
}
check(
  'preview blocks',
  previewProblems,
  'wrap the default demo in <div class="preview">…</div> (see badge.html)',
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
  'run `bun run screenshots` (incremental — re-shoots only components changed since the manifest)',
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

  const doc = existsSync(join(DOCS, `${c}.html`)) ? readFileSync(join(DOCS, `${c}.html`), 'utf8') : '';
  if (!doc.includes('data-state-demo')) coverageProblems.push(`${c}: doc page lacks a [data-state-demo] anchor for state capture`);

  const skill = existsSync(join(COMPS, c, 'component-skill.md'))
    ? readFileSync(join(COMPS, c, 'component-skill.md'), 'utf8')
    : '';
  const e2e = existsSync(join(ROOT, 'tests', 'e2e', `${c}.e2e.ts`))
    ? readFileSync(join(ROOT, 'tests', 'e2e', `${c}.e2e.ts`), 'utf8')
    : '';

  for (const s of states) {
    if (s !== 'default' && MODES.some((m) => !existsSync(join(ROOT, 'screenshots', m, `${c}-${s}.png`)))) {
      coverageProblems.push(`${c}: no screenshot for state "${s}" (both modes) — add [data-state-demo] + run \`bun run screenshots\``);
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

// 13. version is consistent: package.json ↔ the SITE_VERSION constant in
// layout.ts, from which the header pill AND the footer render. Any OTHER
// hard-coded v-semver literal in that file is stale by definition (the
// footer read "v0.7.0" forever because it was a second, un-synced literal —
// this check forbids that pattern instead of trusting the bump).
const version = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version as string;
const headerLayout = readFileSync(join(DOCS, 'js/layout.ts'), 'utf8');
{
  const sv = headerLayout.match(/var SITE_VERSION = '([^']*)'/);
  const versionProblems: string[] = [];
  if (!sv) versionProblems.push("js/layout.ts lost the `var SITE_VERSION = 'v…'` constant");
  else if (sv[1] !== `v${version}`)
    versionProblems.push(`SITE_VERSION is ${sv[1]} but package.json says v${version} (header pill + footer both render this)`);
  // every v-semver anywhere in the shell file must live on the SITE_VERSION
  // assignment — pill/footer render the constant; the old footer kept its own
  // 'v0.7.0' INSIDE a longer string where a quote-anchored regex misses it
  headerLayout.split('\n').forEach((line, i) => {
    if (/var SITE_VERSION =/.test(line)) return;
    const hit = line.match(/\bv\d+\.\d+\.\d+\b/);
    if (hit) versionProblems.push(`stale hard-coded ${hit[0]} at js/layout.ts:${i + 1} — render SITE_VERSION instead`);
  });

  check(
    'version consistency',
    versionProblems,
    'set SITE_VERSION in src/documentation/js/layout.ts to v<package.json version> (deploy.sh does this) — header pill and footer derive from that single constant',
  );
}

// 14. changelog injection marker survived edits
check(
  'changelog marker',
  readFileSync(join(DOCS, 'changelog.html'), 'utf8').includes('<!-- CHANGELOG_ENTRIES -->')
    ? []
    : ['marker "<!-- CHANGELOG_ENTRIES -->" removed from changelog.html'],
  'restore the marker or deploy.sh cannot add entries',
);

// 15. code ↔ skill ↔ docs parity: every variant/size IMPLEMENTED in the
// component CSS (data-variant/data-size selectors are the source of truth —
// the CSS ships what works) must be documented in BOTH the component skill
// and the doc page. Catches the classic drift: CSS gains a variant, docs and
// skill silently rot. A token counts as documented when it appears quoted
// ("x"), backticked (`x`), or as a table cell (| x |) — the forms the skill
// template and doc markup actually use.
const skillProblems: string[] = [];
for (const c of componentDirs) {
  const cssFile = join(COMPS, c, `${c}.css`);
  const docPage = join(DOCS, `${c}.html`);
  const skillFile = join(COMPS, c, 'component-skill.md');
  if (!existsSync(cssFile)) continue;
  const tokens = new Set(
    [...readFileSync(cssFile, 'utf8').matchAll(/data-(?:variant|size)="([a-z0-9-]+)"/g)].map((m) => m[1]),
  );
  if (tokens.size === 0) continue;
  const skillText = existsSync(skillFile) ? readFileSync(skillFile, 'utf8') : '';
  const doc = existsSync(docPage) ? readFileSync(docPage, 'utf8') : '';
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
// e2e rollout is all test code — a type error must not survive to CI. ~0.3 s.
// NOTE: tsc writes diagnostics to STDOUT — reading only stderr silently passed
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

// 15c. docs/ mirror freshness: GitHub Pages publishes ./docs — the documen-
// tation site (dist/documentation/* + SEO files + the 404.html fallback copy
// of index.html), with ../component & ../theme refs CDN-rewritten. Compared
// against exactly what sync-docs.ts writes (shared lib/mirror.ts), so a green
// gate means the published tree is current.
const docsProblems: string[] = [];
const DOCS_OUT = join(ROOT, 'docs');
if (existsSync(DOCS_OUT) && existsSync(DIST)) {
  const expected = mirrorHashes(DIST);
  const actual = new Map(
    walk(DOCS_OUT, [''])
      .filter((f) => !f.endsWith('.DS_Store'))
      .map((f) => [relative(DOCS_OUT, f), createHash('sha256').update(readFileSync(f)).digest('hex')]),
  );
  for (const [rel, hash] of expected) {
    if (!actual.has(rel)) docsProblems.push(`docs/${rel} missing`);
    else if (actual.get(rel) !== hash) docsProblems.push(`docs/${rel} is stale (differs from the mirrored dist/)`);
  }
  for (const rel of actual.keys()) if (!expected.has(rel)) docsProblems.push(`docs/${rel} is stale (not in the doc site)`);
} else if (!existsSync(DOCS_OUT) && existsSync(DIST)) {
  docsProblems.push('docs/ missing — GitHub Pages would publish nothing');
}
check(
  'docs mirror fresh',
  docsProblems.slice(0, 8),
  'run `bun run docs` (re-builds dist/ and re-mirrors the doc site to docs/ for GitHub Pages)',
);

// 16. working tree cleanliness (warn): uncommitted changes make "green build"
// ambiguous — the agent must finish by committing so CI sees what was tested.
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
// this bit us when htmlEncode silently degraded to identity replacements.
const escapeProblems: string[] = [];
for (const f of readdirSync(DOCS).filter((x) => x.endsWith('.html'))) {
  const html = readFileSync(join(DOCS, f), 'utf8');
  for (const m of html.matchAll(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g)) {
    if (/<[a-zA-Z/!?]/.test(m[1])) escapeProblems.push(`${f}: unescaped tag inside <pre><code>`);
  }
}
check(
  'snippet escaping',
  escapeProblems,
  'raw < in a snippet means htmlEncode was bypassed — run `bun run sync-snippets` (never paste source into doc pages by hand)',
);

// 18. accessibility CSS promises (AGENTS.md "Accessibility CSS"): any
// component that animates must honor prefers-reduced-motion. Migration
// complete — keep this list empty as the ratchet (new components must comply
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
// README must exist — renaming a script or make target silently rots the docs
// that agents follow as instructions.
const pkgScripts = new Set(Object.keys(JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts));
const makeTargets = new Set(
  [...readFileSync(join(ROOT, 'Makefile'), 'utf8').matchAll(/^([a-z][a-z0-9_-]*):/gm)].map((m) => m[1]),
);
const refProblems: string[] = [];
for (const md of ['AGENTS.md', 'README.md']) {
  const text = readFileSync(join(ROOT, md), 'utf8');
  // only backtick-quoted commands count — prose like "make sure" must not match
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
  'fix the doc reference or restore the script/target — docs are agent instructions',
);

// 20b. field-description wiring: every live .field-description / .field-error
// paragraph on a doc page must carry an id that at least one aria-describedby
// in the same page points at. Visual proximity is invisible to screen
// readers — the Input "With description" example is the site's established
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
    else if (!refs.has(id)) descProblems.push(`${page}: #${id} is referenced by no aria-describedby — screen readers never announce it`);
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
// <style> — including the raw skill markdown embedded in
// <script type="text/plain"> — are text, not elements, so illustrative
// markup there (src="photo.jpg") is never mistaken for a live link.
// Ceiling (ponytail): cross-page anchors (page.html#id) only check the page.
const linkProblems: string[] = [];
if (existsSync(DIST)) {
  for (const f of readdirSync(join(DIST, 'documentation')).filter((x) => x.endsWith('.html'))) {
    const { document } = parseHTML(readFileSync(join(DIST, 'documentation', f), 'utf8'));
    const ids = new Set([...document.querySelectorAll('[id]')].map((el) => el.getAttribute('id')));
    for (const el of document.querySelectorAll('[href],[src]')) {
      const url = (el.getAttribute(el.hasAttribute('href') ? 'href' : 'src') ?? '').trim();
      if (/^(https?:|mailto:|data:|javascript:)/i.test(url)) continue;
      // demo placeholders: no target at all, or the conventional "..." stub
      if (url === '' || url === '#' || url === '...') continue;
      if (url.startsWith('#')) {
        if (!ids.has(url.slice(1))) linkProblems.push(`${f}: dead anchor #${url.slice(1)}`);
        continue;
      }
      const [path] = url.split('#');
      if (!path) continue;
      if (!existsSync(join(DIST, 'documentation', path))) linkProblems.push(`${f}: dead link ${url}`);
    }
  }
}
check(
  'doc link integrity',
  linkProblems,
  'fix or remove the link (dead links on the published docs site are user-facing breakage)',
);

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
// sources/scripts/tests (repo rule — these paths break on other systems).
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
// render (CDN asset, font, browser version) — worth a human/agent look.
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
  'inspect the PNG against the component (external asset/browser change?) — or recapture with `bun run screenshots --force` once intentional',
  true,
);

// 25. no window globals (AGENTS.md "No window globals"): application globals
// live on globalThis under _defussShadcn — window is the browser-only alias
// (breaks isomorphic runtimes) and a collision magnet on hosts we don't own.
// Vendor globals (lucide, marked, …) are owned by their vendors: reads via
// globalThis.* are fine; assignments to window.* anywhere in src/ are not.
const windowProblems: string[] = [];
for (const f of walk(SRC, ['.ts', '.js'])) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bwindow\s*(?:\.|[\['])\s*([A-Za-z_$][\w$]*)\s*(=|\+=|-=)/g)) {
    windowProblems.push(`${relative(ROOT, f)} assigns window.${m[1]}`);
  }
}
check(
  'no window globals',
  windowProblems,
  'use globalThis and scope the name under globalThis._defussShadcn (AGENTS.md "No window globals")',
);

// 26. README ↔ index.html parity: the intro pillar lists must say the same
// thing. README.md leads with `- **Name**` bullets (intro section, before the
// first `##` heading); index.html renders the same pillars as card-title h3s.
// They diverged once ("Observable state" went into the README only) — now the
// gate catches it, and AGENTS.md demands both files change together.
{
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
  // the pillar bullets live under "## What this is", i.e. between the first
  // `##` and "## Quick start" — scan exactly that range
  const intro = readme.slice(0, readme.search(/^## Quick start$/m));
  const readmePillars = [...intro.matchAll(/^- \*\*(.+?)\*\*/gm)].map((m) => m[1].trim());
  const indexHtml = readFileSync(join(DOCS, 'index.html'), 'utf8');
  // pillar cards are the only card-title h3s on the page today
  const indexPillars = [...indexHtml.matchAll(/<h3 class="card-title"[^>]*>([^<]+)<\/h3>/g)].map((m) =>
    m[1].trim(),
  );
  const missing = readmePillars.filter((p) => !indexPillars.includes(p));
  const extra = indexPillars.filter((p) => !readmePillars.includes(p));
  check(
    'README ↔ index parity',
    [
      ...missing.map((p) => `index.html card missing for README pillar "${p}"`),
      ...extra.map((p) => `README bullet missing for index.html card "${p}"`),
    ],
    'keep README.md intro bullets and documentation/index.html pillar cards in sync (AGENTS.md "README ↔ index parity") — change both files together',
  );
}

// 27. README ↔ index.html commit window: the two files state the same
// promises to humans and browser users, so touching one without the other
// within 15 minutes of commit time is treated as an un-synced edit (the
// hero paragraph diverged once: "No build step for consumers — dist/ is
// committed…" vs "No build step."). Identity of the touching commit passes;
// otherwise the two last-touch commits must be ≤ SYNC_WINDOW apart.
{
  const SYNC_WINDOW = 15 * 60; // seconds
  const PAIR: Array<[string, string]> = [
    ['README.md', 'README.md'],
    ['index.html', 'src/documentation/index.html'],
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
      const older = Number(readmeAt) < Number(indexAt) ? 'README.md' : 'index.html';
      problems.push(
        `${older} was last committed ${Math.round(gap / 60)} min apart from the other (> ${SYNC_WINDOW / 60} min) — its statements may have drifted`,
      );
    }
  }
  check(
    'README ↔ index commit window',
    problems,
    'update README.md and src/documentation/index.html in the same commit (or within 15 min of each other) so their shared claims stay true (AGENTS.md "README ↔ index parity")',
  );
  }
  
  // 28. component boundary: dialog.js init() claims dialogs generically via a
  // :not(...) selector — every component that owns its own <dialog> (command,
  // alert-dialog, sheet) must be excluded there, or dialog.js — loaded first on
  // every page — stamps data-init and the real owner's init() silently skips
  // the element (this exact bug disabled the docs search palette once).
  {
    const dialogSrc = readFileSync(join(COMPS, 'dialog', 'dialog.ts'), 'utf8');
    const claim = dialogSrc.match(/querySelectorAll\((['"])dialog:not\([\s\S]*?\1\)/);
    const owned = ['alert-dialog', 'sheet', 'command'].filter(
      (c) => claim && !claim[0].includes(`not(.${c})`),
    );
    check(
      'dialog ownership boundary',
      claim
        ? owned.map((c) => `dialog.ts claims dialog.${c} too — add :not(.${c}) to its init() selector`)
        : ['dialog.ts lost the dialog:not(...) init selector — verify cannot check ownership'],
      'components own their dialogs (backdrop close, focus, filtering); dialog.js must :not-exclude each one — see AGENTS.md "Each component owns its dialog"',
    );
  }

  // 29. changelog ↔ version: the version COMMITTED in package.json must have an
  // entry in changelog.html — a release cut without a changelog is invisible to
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
      return { exists: true, touchesChangelog: files.includes('documentation/changelog.html') };
    };
    const { problems, warnings } = changelogProblems({
      entries: parseChangelogEntries(readFileSync(join(DOCS, 'changelog.html'), 'utf8')),
      committedVersion,
      worktreeVersion: version,
      resolveCommit,
    });
    check('changelog ↔ version', problems, FIX_TWO_COMMITS);
    // entries are commit messages — prose with code spans and links only.
    // Raw markup in an <li> renders live (a v0.8.0 entry once embedded a
    // working <video> and a raw <hr> in the middle of the changelog).
    check(
      'changelog entries are text',
      changelogMarkupProblems(readFileSync(join(SRC, 'documentation/changelog.html'), 'utf8')),
      'escape element names in <li> bodies as <video> — only <code>/<strong>/<a>/<span>/<em>/<b>/<i>/<kbd>/<li> may appear raw',
    );
    check(
      'changelog pending bump',
      warnings,
      'add the entry for the bumped version NOW — commit it, then commit that commit\'s hash into the entry (AGENTS.md "Changelog") — before the version bump itself is committed',
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
      `add a --- frontmatter block (${SKILL_FRONTMATTER_KEYS.join(', ')}) to each listed skill — then \`bun run build\` regenerates SKILL.md`,
    );
    let skillProblems: string[] = [];
    try {
      const fresh = buildSkillText(SRC);
      if (!existsSync(join(SRC, SKILL_OUTPUT_FILE))) skillProblems.push(`src/${SKILL_OUTPUT_FILE} missing`);
      else if (readFileSync(join(SRC, SKILL_OUTPUT_FILE), 'utf8') !== fresh)
        skillProblems.push(`src/${SKILL_OUTPUT_FILE} is stale vs ${SKILL_TEMPLATE_FILE} + skill frontmatter`);
    } catch (e) {
      skillProblems.push(`${(e as Error).message.split(' — ')[0]} — SKILL.md cannot be generated`);
    }
    check(
      'SKILL.md ↔ skills',
      skillProblems,
      'run `bun run build` (build.ts regenerates src/SKILL.md from SKILL_tpl.md + frontmatter; never edit SKILL.md by hand)',
    );
  }

  // 30b. architecture page ↔ ARCH.md: the published Overview page is a
  // generated render of the repo's design manifesto (build.ts regenerates it
  // from ARCH.md + architecture_tpl.html). Same drift class as SKILL.md:
  // edit ARCH.md, rebuild — never hand-edit the page (AGENTS.md "ARCH.md ↔
  // architecture page sync").
  {
    let archProblems: string[] = [];
    try {
      const fresh = buildArchPageText(SRC);
      if (!existsSync(join(SRC, 'documentation', ARCH_OUTPUT_FILE))) archProblems.push(`src/documentation/${ARCH_OUTPUT_FILE} missing`);
      else if (readFileSync(join(SRC, 'documentation', ARCH_OUTPUT_FILE), 'utf8') !== fresh)
        archProblems.push(`src/documentation/${ARCH_OUTPUT_FILE} is stale vs ARCH.md + ${ARCH_TEMPLATE_FILE}`);
    } catch (e) {
      archProblems.push(`${(e as Error).message.split(' — ')[0]} — architecture page cannot be generated`);
    }
    check(
      'architecture ↔ ARCH.md',
      archProblems,
      'run `bun run build` (build.ts regenerates the architecture page from ARCH.md; never edit architecture.html by hand)',
    );
  }

  // 30c. component taxonomy type: every component declares exactly one type
  // (ATM | MOL | ORG | BLK | TPL — AGENTS.md "Component taxonomy") in its skill
  // frontmatter, and the other two carriers of that claim must agree with it:
  // the sidebar badge (layout.ts reads the generated search-index `d` field)
  // and the doc page badge (exact markup from scripts/lib/taxonomy.ts). A
  // generic PREVIEW marker anywhere in the sidebar is a failure — the type
  // replaced it.
  {
    const typeProblems: string[] = [];
    const indexFile = join(DOCS, 'js/search-index.js');
    const indexText = existsSync(indexFile) ? readFileSync(indexFile, 'utf8') : '';
    if (!indexText) typeProblems.push('src/documentation/js/search-index.js missing — sidebar badges cannot be checked');
    for (const c of componentDirs) {
      const skill = join(COMPS, c, 'component-skill.md');
      if (!existsSync(skill)) continue; // reported by "component skills"
      const meta = parseSkillFrontmatter(readFileSync(skill, 'utf8'));
      if (!meta) continue; // reported by "skill frontmatter"
      // sidebar: layout.ts derives its badge map from search-index page entries
      const entry = indexText.match(new RegExp(`\\{[^{}]*"h":"${c}\\.html"[^{}]*\\}`));
      const sidebar = entry && entry[0].match(/"d":"([A-Z]{3})"/);
      if (!sidebar) typeProblems.push(`${c}: sidebar has no type badge (skill type absent from search index)`);
      else if (sidebar[1] !== meta.type)
        typeProblems.push(`${c}: sidebar badge says ${sidebar[1]}, skill frontmatter says ${meta.type}`);
      // doc page: exact generated badge markup (never hand-written)
      const page = join(DOCS, `${c}.html`);
      if (!existsSync(page)) continue; // reported by "documentation pages"
      if (!readFileSync(page, 'utf8').includes(typeBadgeHtml(meta.type as ComponentType)))
        typeProblems.push(`${c}: doc page lacks the exact \`${meta.type}\` type badge`);
    }
    const layoutSrc = readFileSync(join(DOCS, 'js/layout.ts'), 'utf8');
    if (layoutSrc.includes('PREVIEW')) typeProblems.push('src/documentation/js/layout.ts still renders the generic PREVIEW badge');
    check(
      'component type badges',
      typeProblems,
      'one type per component, identical in all three places — skill `type:` frontmatter (source of truth), sidebar badge + search-index (`bun run build` regenerates both from frontmatter), doc page badge (see AGENTS.md "Component taxonomy")',
    );
  }

  // 31. README/index "no JavaScript" stat: the docs advertise how many
  // components ship no JS; the claim must match the actual component tree
  // (a .ts source in src/components = ships a .js). Same gate for both
  // files so the parity pair can never state different numbers.
  {
    const withJs = componentDirs.filter((c) => existsSync(join(COMPS, c, `${c}.ts`)));
    const actual = { cssOnly: componentDirs.length - withJs.length, total: componentDirs.length };
    const statFix = `update the "**N of M components need no JavaScript**" line in README.md AND src/documentation/index.html (within the 15-min parity window) to match the component tree (${actual.cssOnly} of ${actual.total})`;
    check(
      'README CSS-only stat',
      readmeCssOnlyProblems(readFileSync(join(ROOT, 'README.md'), 'utf8'), 'README.md', actual),
      statFix,
    );
    check(
      'index CSS-only stat',
      readmeCssOnlyProblems(
        readFileSync(join(DOCS, 'index.html'), 'utf8'),
        'src/documentation/index.html',
        actual,
      ),
      statFix,
    );
  }

  // 32. theme contrast: the doc-site sidebar must stay readable under every
  // theme preset. Text tokens must reach WCAG AA against the background
  // they actually sit on (--sidebar / --sidebar-accent) — themes whose
  // sidebar-accent pairs failed this shipped invisible active nav links.
  {
    const themes = parseThemes(readFileSync(join(DOCS, 'js/themes.ts'), 'utf8'));
    // the "default" theme isn't in themes.ts — fold the shipped token file in
    const defaultModes = defaultTokenModes(readFileSync(join(SRC, 'theme/default-semantic-tokens.css'), 'utf8'));
    const problems = sidebarContrastProblems([
      ...themes,
      { id: 'default', label: 'Default', modes: defaultModes },
    ]);
    check(
      'theme sidebar contrast',
      problems,
      'raise the flagged theme token(s) in src/documentation/js/themes.ts (or src/theme/default-semantic-tokens.css) until the sidebar text pair reaches WCAG AA (>=4.5) — the measured pairs are pinned by tests/contrast.test.ts',
    );
    check(
      'theme radius consistency',
      radiusConsistencyProblems(themes),
      'declare the same `radius` in BOTH the light and dark block of the flagged theme(s) in src/documentation/js/themes.ts (AGENTS.md "Theme radius consistency")',
    );
  }

  console.log(
  failed
    ? `\nverify: FAILED (${failed} check group(s), ${warned} warning group(s))`
    : `\nverify: OK${warned ? ` (${warned} warning group(s))` : ''}`,
);
process.exit(failed ? 1 : 0);
