import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { appResolver } from '../../scripts/lib/apps.ts';
import { componentSources } from '../../scripts/lib/apps-files.ts';
import { e2eInputs, fixturesNamed } from '../../scripts/lib/e2e-select.ts';

/**
 * Why: `bun run e2e` runs tests/e2e/*.e2e.ts as isolated child processes (one
 * crash must not hide the other components' results) - and only the ones whose
 * inputs changed since they last passed. Each file's inputs come from what it
 * loads (scripts/lib/e2e-select.ts: its fixtures, the dist files they link and
 * the sources behind them); their content is fingerprinted, and a pass records
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

const files = readdirSync(dir)
  .filter((f) => f.endsWith('.e2e.ts'))
  .sort();
if (files.length === 0) {
  console.error('No *.e2e.ts tests found in tests/e2e/');
  process.exit(1);
}

// -- fingerprints --------------------------------------------------------------------------
/** generated or scratch trees under the inputs that never decide a test */
const SKIP = /(^|\/)(node_modules|\.ssg-temp|\.cache)(\/|$)|^src\/documentation\/(public\/js|dist)\//;
const fileHash = new Map<string, string>();
const hashOf = (rel: string): string => {
  let h = fileHash.get(rel);
  if (!h) {
    h = createHash('sha256').update(readFileSync(join(ROOT, rel))).digest('hex');
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
  for (const input of inputs) {
    const paths = input.endsWith('/') ? filesUnder(input) : existsSync(join(ROOT, input)) ? [input] : [];
    for (const p of paths) h.update(`${p}\0${hashOf(p)}\n`);
  }
  return h.digest('hex');
};

const resolve = appResolver(componentSources());
const isComponent = (name: string) => existsSync(join(ROOT, 'src', 'components', name));
const plan = files.map((file) => {
  const name = file.replace(/\.e2e\.ts$/, '');
  const test = readFileSync(join(dir, file), 'utf8');
  const fixtures: Record<string, string> = {};
  for (const fx of fixturesNamed(test)) if (existsSync(join(dir, fx))) fixtures[fx] = readFileSync(join(dir, fx), 'utf8');
  const own = `${name}.e2e-fixture.html`;
  if (!fixtures[own] && existsSync(join(dir, own))) fixtures[own] = readFileSync(join(dir, own), 'utf8');
  const inputs = e2eInputs({ name, test, fixtures, componentsOf: resolve, isComponent });
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
