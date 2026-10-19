import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, sep } from 'node:path';
import { componentDirs } from '../../src/documentation/lib/component-dirs.ts';
import { appResolver } from '../../scripts/lib/apps.ts';
import { componentSources } from '../../scripts/lib/apps-files.ts';
import { e2eInputs, fixturesNamed, inputContent } from '../../scripts/lib/e2e-select.ts';

/**
 * Why: `bun run e2e` runs tests/e2e/*.e2e.ts as isolated child processes (one
 * crash must not hide the other components' results) - and only the ones whose
 * inputs changed since they last passed. Each file's inputs come from what it
 * loads (scripts/lib/e2e-select.ts: its fixtures and the built dist files they
 * link, the modules it imports); their content is fingerprinted, and a pass records
 * the fingerprint in .cache/e2e-manifest.json. A failed or never-run file
 * always runs.
 *
 *   bun run e2e                 # what changed (or failed)
 *   bun run e2e --all           # everything (E2E_ALL=1 too - releases do this)
 *   bun run e2e accordion diff  # these files, whatever changed
 *   bun run e2e --list          # what would run, and why - runs nothing
 */

const dir = import.meta.dirname;
const ROOT = join(dir, '..', '..');
const MANIFEST = join(ROOT, '.cache', 'e2e-manifest.json');
const args = process.argv.slice(2);
const runAll = args.includes('--all') || process.env.E2E_ALL === '1';
const picked = args.filter((a) => !a.startsWith('--'));

// tests/e2e/<folder>/<name>.e2e.ts - one folder per sidebar section + `site` (scripts/lib/e2e-select.ts e2eFolder)
const files = readdirSync(dir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .flatMap((d) => readdirSync(join(dir, d.name)).filter((f) => f.endsWith('.e2e.ts')).map((f) => `${d.name}/${f}`))
  .sort();
if (files.length === 0) {
  console.error('No *.e2e.ts tests found in tests/e2e/<folder>/');
  process.exit(1);
}

// -- fingerprints --------------------------------------------------------------------------
/** generated or scratch trees under the inputs that never decide a test */
const SKIP = /(^|\/)(node_modules|\.ssg-temp|\.cache)(\/|$)|^src\/documentation\/(public\/js|dist)\//;
const fileHash = new Map<string, string>();
const hashOf = (rel: string): string => {
  let h = fileHash.get(rel);
  if (!h) {
    h = createHash('sha256').update(inputContent(rel, readFileSync(join(ROOT, rel)))).digest('hex');
    fileHash.set(rel, h);
  }
  return h;
};
const listing = new Map<string, string[]>();
/** every file under a directory prefix (repo-relative), sorted */
const filesUnder = (prefix: string): string[] => {
  let out = listing.get(prefix);
  if (out) return out;
  out = [];
  const walk = (abs: string) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const p = join(abs, entry.name);
      const rel = relative(ROOT, p);
      if (SKIP.test(rel)) continue;
      if (entry.isDirectory()) walk(p);
      else if (entry.isFile()) out!.push(rel);
    }
  };
  const abs = join(ROOT, prefix);
  if (existsSync(abs) && statSync(abs).isDirectory()) walk(abs);
  out.sort();
  listing.set(prefix, out);
  return out;
};
const fingerprint = (inputs: string[]): string => {
  const h = createHash('sha256');
  // a file under two inputs (an imported module inside a folder the test loads) counts once, where it first appears:
  // the fingerprint depends on the files, not on how the planner names them
  const seen = new Set<string>();
  for (const input of inputs) {
    const paths = input.endsWith('/') ? filesUnder(input) : existsSync(join(ROOT, input)) ? [input] : [];
    for (const p of paths) {
      if (seen.has(p)) continue;
      seen.add(p);
      h.update(`${p}\0${hashOf(p)}\n`);
    }
  }
  return h.digest('hex');
};

const resolve = appResolver(componentSources());
// a component's repo-relative folder (src/components/<section>/<name>/), from its section folder
const componentDir = (name: string): string | undefined => {
  const c = componentDirs(join(ROOT, 'src', 'components')).find((x) => x.name === name);
  return c ? `${relative(ROOT, c.dir).split(sep).join('/')}/` : undefined;
};
// every repo module a test imports, transitively - Bun's own import scanner (type-only imports run nothing and are
// dropped by it); null when a module cannot be read or a relative import resolves to no file
const scanners: Record<string, Bun.Transpiler> = {};
const scanner = (rel: string): Bun.Transpiler | undefined => {
  const loader = ({ '.ts': 'ts', '.tsx': 'tsx', '.js': 'js', '.mjs': 'js' } as const)[extname(rel) as '.ts'];
  return loader && (scanners[loader] ??= new Bun.Transpiler({ loader }));
};
const moduleFile = (fromDir: string, spec: string): string | undefined => {
  const base = join(fromDir, spec);
  for (const p of [base, `${base}.ts`, `${base}.tsx`, base.replace(/\.js$/, '.ts'), join(base, 'index.ts')]) {
    if (existsSync(p) && statSync(p).isFile()) return relative(ROOT, p).split(sep).join('/');
  }
  return undefined;
};
const importsOf = (entry: string): Record<string, string> | null => {
  const out: Record<string, string> = {};
  const visit = (rel: string) => {
    for (const imp of scanner(rel)?.scanImports(readFileSync(join(ROOT, rel), 'utf8')) ?? []) {
      if (!imp.path.startsWith('.')) continue; // a package (bun.lock pins it) or a runtime builtin
      const target = moduleFile(join(ROOT, dirname(rel)), imp.path);
      if (!target) throw new Error(`${rel}: no file for ${imp.path}`);
      if (target in out || target === entry) continue;
      out[target] = readFileSync(join(ROOT, target), 'utf8');
      visit(target);
    }
  };
  try {
    visit(entry);
    return out;
  } catch {
    return null;
  }
};
const plan = files.map((file) => {
  const folder = file.slice(0, file.indexOf('/'));
  const name = file.slice(folder.length + 1).replace(/\.e2e\.ts$/, '');
  const test = readFileSync(join(dir, file), 'utf8');
  const fixtures: Record<string, string> = {};
  for (const fx of fixturesNamed(test)) if (existsSync(join(dir, folder, fx))) fixtures[fx] = readFileSync(join(dir, folder, fx), 'utf8');
  const own = `${name}.e2e-fixture.html`;
  if (!fixtures[own] && existsSync(join(dir, folder, own))) fixtures[own] = readFileSync(join(dir, folder, own), 'utf8');
  const inputs = e2eInputs({ name, test, fixtures, componentsOf: resolve, componentDir, imports: importsOf(`tests/e2e/${file}`) });
  return { file, name, print: fingerprint(inputs) };
});

const manifest: Record<string, string> = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
const due = plan.filter((p) => (picked.length ? picked.includes(p.name) : runAll || manifest[p.name] !== p.print));
const skipped = plan.length - due.length;
console.log(
  picked.length
    ? `e2e: ${due.length} picked`
    : runAll
      ? `e2e: all ${plan.length} file(s) (--all)`
      : `e2e: ${due.length} of ${plan.length} file(s) changed since their last pass - ${skipped} unchanged skipped (--all runs everything)`,
);

if (args.includes('--list')) {
  for (const p of due) console.log(`  ${p.file}${manifest[p.name] ? ' (inputs changed)' : ' (no passing run recorded)'}`);
  process.exit(0);
}

let failed = 0;
for (const p of due) {
  console.log(`\n▶ ${p.file}`);
  const proc = Bun.spawnSync({
    cmd: [process.execPath, join(dir, p.file)],
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if (proc.exitCode === 0) manifest[p.name] = p.print;
  else {
    failed++;
    delete manifest[p.name]; // a failure always runs again
  }
}
// forget files that no longer exist
for (const name of Object.keys(manifest)) if (!plan.some((p) => p.name === name)) delete manifest[name];
mkdirSync(join(ROOT, '.cache'), { recursive: true });
writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 1)}\n`);

console.log(`\n${due.length - failed}/${due.length} e2e file(s) passed${skipped ? ` (${skipped} unchanged, skipped)` : ''}`);
process.exit(failed ? 1 : 0);
