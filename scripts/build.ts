#!/usr/bin/env bun
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { SKILL_OUTPUT_FILE } from './lib/skill.ts';
import { buildSkillText } from './lib/skill-files.ts';

/**
 * Why: the whole build — `bun run build` produces dist/ from src/ 1:1.
 * tsc handles .ts → .js (type stripping, see tsconfig.json); every other
 * file type is copied verbatim so the dist shape stays exactly what the
 * CDN/Netlify consumers expect.
 *
 * Special case: components import the shared State API preamble from
 * src/components/_shared/, but shipped .js files must stay isolated
 * copy-paste/CDN-ready single files. A post-pass inlines the compiled helper
 * into each importer (replacing the import statement) and drops _shared/
 * from dist/ — the browser never sees an inter-component module graph.
 */

const ROOT = join(import.meta.dirname, '..');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');
// any named import from the shared helper file, e.g. `{ defussGlobals }` or
// `{ defussGlobals, safeShowPopover }` — the whole helper is inlined either way
const SHARED_IMPORT = /import \{[^}]+\} from '\.\.\/\.\.\/shared\/state-api\.js';\n/;

// fresh tree so deleted sources never linger in dist/
rmSync(DIST, { recursive: true, force: true });

// 0. regenerate the agent-facing SKILL.md index from src/SKILL_tpl.md + the
// component-skill.md frontmatter, BEFORE copying, so dist/SKILL.md (the file
// agents actually read) can never lag the skills.
writeFileSync(join(SRC, SKILL_OUTPUT_FILE), buildSkillText(SRC));

// 1. TypeScript → JavaScript (emits straight into dist/, same structure)
const tsc = Bun.spawnSync({
  cmd: ['bunx', 'tsc', '-p', ROOT],
  stdout: 'inherit',
  stderr: 'inherit',
});
if (tsc.exitCode !== 0) {
  console.error('tsc failed');
  process.exit(tsc.exitCode);
}

// 2. everything that isn't a .ts source is copied as-is (tsc already wrote
//    the .js twins into dist/, so only the originals are skipped).
//    The docs tree (src/documentation/) is NOT copied at all: its pages,
//    components, runtime and public assets are defuss-ssg inputs — the SSG
//    build (scripts/build-docs.ts) renders dist/documentation/ from them.
cpSync(SRC, DIST, {
  recursive: true,
  filter: (s) => {
    const rel = relative(SRC, s).replace(/\\/g, '/');
    if (rel === 'documentation' || rel.startsWith('documentation/')) return false;
    return !s.endsWith('.ts');
  },
});

// inline the shared preamble into each component .js that imports it, so the
// shipped files keep zero local module dependencies
const helperPath = join(DIST, 'shared', 'state-api.js');
if (existsSync(helperPath)) {
  // drop `export` — each module gets its own hoisted copy of the functions.
  // Also drop the helper's own sourceMappingURL comment: dist/shared/ (and its
  // .map) is deleted below, and tsc appends the comment WITHOUT a trailing
  // newline — inlining it would comment out the component's first code line.
  // ponytail: the component's own .js.map was emitted before this insertion,
  // so mapped lines after the inlined block shift by the helper's height
  // (debug-quality only). Upgrade path: merge maps with a real remapping lib.
  const helper = readFileSync(helperPath, 'utf8')
    .replace(/^export /gm, '')
    .replace(/\/\/# sourceMappingURL=.*\n?/g, '')
    .replace(/\n*$/, '\n');
  for (const dir of readdirSync(join(DIST, 'components'))) {
    const js = join(DIST, 'components', dir, `${dir}.js`);
    if (!existsSync(js)) continue;
    const code = readFileSync(js, 'utf8');
    // function replacer: the helper's comments contain backtick-$-backtick,
    // which string replacements would interpret as `$` (pre-match) patterns
    if (SHARED_IMPORT.test(code)) writeFileSync(js, code.replace(SHARED_IMPORT, () => helper));
  }
  rmSync(join(DIST, 'shared'), { recursive: true, force: true });
}

console.log('dist/ built from src/');
