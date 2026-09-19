#!/usr/bin/env bun
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { SKILL_OUTPUT_FILE } from './lib/skill.ts';
import { buildSkillText } from './lib/skill-files.ts';
import { parseThemes } from './lib/contrast.ts';
import { themeCssText, themeFileName } from './lib/theme-css.ts';

/**
 * Why: the whole build — `bun run build` produces dist/ from src/ 1:1.
 * tsc handles .ts → .js (type stripping, see tsconfig.json); every other
 * file type is copied verbatim so the dist shape stays exactly what the
 * CDN/Netlify consumers expect.
 *
 * Special case (plans/defuss-query-morph-integration.md §2.6): components import
 * the shared State-API helpers from src/shared/, but the shared
 * IMPLEMENTATION is emitted once inside core.js (scripts/bundle.ts). This
 * post-pass rewrites each component's shared import into a small entry guard
 * + direct bindings to df$.shadcn.shared (scripts/templates/
 * component-shared-binding.js) — no inlined helper copies, no imports in the
 * shipped single files, and a missing/mismatched core fails before any
 * registry write or DOM mutation.
 */

const ROOT = join(import.meta.dirname, '..');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');
// any named import from the shared helper file, e.g. `{ defussGlobals }` or
// `{ defussGlobals, safeShowPopover }` — the binding block carries the exact
// imported names either way. An import that does NOT match (unsupported
// shape) stays as a live import and fails verify's `core bindings (dist)` gate.
const SHARED_IMPORT = /import \{([^}]+)\} from '\.\.\/\.\.\/shared\/state-api\.js';\n/;
/** the ABI literal core stamps at df$.shadcn.shared.abi (single source) */
const SHARED_ABI = readFileSync(join(SRC, 'shared', 'version.ts'), 'utf8').match(
  /SHARED_ABI = '([^']+)'/,
)?.[1];
if (!SHARED_ABI) {
  console.error('build: cannot read SHARED_ABI from src/shared/version.ts');
  process.exit(1);
}
/** the entry-guard template — external file per the repo's no-inline-template rule */
const SHARED_BINDING = readFileSync(join(ROOT, 'scripts', 'templates', 'component-shared-binding.js'), 'utf8');
/** bind the exact names the component imported from shared */
const sharedBindingFor = (names: string): string =>
  SHARED_BINDING.replaceAll('__DF_SHADCN_ABI__', SHARED_ABI).replaceAll(
    '__DF_SHARED_NAMES__',
    names.replace(/\s+/g, ' ').trim(),
  );

// fresh tree so deleted sources never linger in dist/
rmSync(DIST, { recursive: true, force: true });

// 0. regenerate the agent-facing SKILL.md index from src/SKILL_tpl.md + the
// component-skill.md frontmatter, BEFORE copying, so dist/SKILL.md (the file
// agents actually read) can never lag the skills.
writeFileSync(join(SRC, SKILL_OUTPUT_FILE), buildSkillText(SRC));

// 0b. regenerate one theme stylesheet per tweakcn preset into src/theme/,
// from the themes.ts dataset (single source). The 1:1 copy below ships them
// as dist/theme/<id>.css — drop-in companions to utils/default-semantic-
// tokens.css; the doc site's theme switcher and the theme-switcher component
// load/unload exactly these files via <link>. verify's `theme files fresh`
// gate fails if themes.ts and the generated files drift.
{
  const themes = parseThemes(readFileSync(join(SRC, 'documentation/runtime/themes.ts'), 'utf8'));
  for (const t of themes) {
    const css = themeCssText(t);
    if (css === null) continue; // `default` == the token file itself
    writeFileSync(join(SRC, 'theme', themeFileName(t.id)), css);
  }
  console.log(`theme-css: ${themes.filter((t) => themeCssText(t) !== null).length} theme files → src/theme/`);
}

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

// rewrite each component's shared import into the core binding guard, so the
// shipped files reference the once-installed df$.shadcn.shared functions and
// keep zero local module dependencies
let bound = 0;
for (const dir of readdirSync(join(DIST, 'components'))) {
  const js = join(DIST, 'components', dir, `${dir}.js`);
  if (!existsSync(js)) continue;
  const code = readFileSync(js, 'utf8');
  const m = code.match(SHARED_IMPORT);
  if (!m) continue; // no shared import (CSS-only or self-contained) — nothing to bind
  writeFileSync(js, code.replace(SHARED_IMPORT, () => sharedBindingFor(m[1])));
  bound++;
}
// src/shared + src/core are build-time-only: their implementations are bundled
// once into core.js by scripts/bundle.ts — never shipped as loose module trees
rmSync(join(DIST, 'shared'), { recursive: true, force: true });
rmSync(join(DIST, 'core'), { recursive: true, force: true });

console.log(`dist/ built from src/ (${bound} component files bound to df$.shadcn.shared)`);
