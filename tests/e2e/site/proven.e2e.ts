import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Why: `bun run test:run`, `test:coverage` and `verify` go through scripts/proven.ts, which replays a recorded pass
 * instead of running the command on the same inputs again - the vae gate relies on it after the pipeline ran them.
 * A replay must never stand in for a run on other inputs. This drives the command in a throwaway git repository
 * (under output/, gitignored) with shell commands that count their runs: run, replay, a changed input, FULL=1, an
 * edit during the run, a failure, a coverage pass proving the unit suite, an output file that is no input.
 */
const ROOT = join(import.meta.dirname, '..', '..', '..');
const PROVEN = join(ROOT, 'scripts', 'proven.ts');
mkdirSync(join(ROOT, 'output'), { recursive: true });
const base = mkdtempSync(join(ROOT, 'output', 'proven-e2e-'));
const repo = join(base, 'repo');
const runs = join(base, 'runs.log');
let failures = 0;
async function check(label: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${label}\n    ${err instanceof Error ? err.message : err}`);
  }
}
const sh = (cmd: string[], env: Record<string, string> = {}) => {
  const out = Bun.spawnSync(cmd, { cwd: repo, env: { ...process.env, ...env }, stdout: 'pipe', stderr: 'pipe' });
  return { code: out.exitCode, out: out.stdout.toString() + out.stderr.toString() };
};
/** run a shell command through proven.ts; it appends a line to runs.log each time it really runs */
const proven = (proof: string, script: string, env: Record<string, string> = {}) =>
  sh(['bun', PROVEN, proof, '--', 'sh', '-c', `echo "ran ${proof}"; echo x >> "${runs}"; ${script}`], env);
const count = () => (existsSync(runs) ? readFileSync(runs, 'utf8').split('\n').filter(Boolean).length : 0);

try {
  mkdirSync(repo);
  sh(['git', 'init', '-q']);
  writeFileSync(join(repo, '.gitignore'), '.cache/\n');
  writeFileSync(join(repo, 'a.txt'), 'one\n');
  sh(['git', 'add', '-A']);
  sh(['git', '-c', 'user.email=e2e@example.invalid', '-c', 'user.name=e2e', 'commit', '-qm', 'init']);

  await check('a first run runs the command, streams its output and records the pass', () => {
    const r = proven('verify', 'true');
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /ran verify/);
    assert.equal(count(), 1);
    assert.ok(JSON.parse(readFileSync(join(repo, '.cache', 'proven.json'), 'utf8')).verify, 'recorded');
  });

  await check('the same inputs again: the recorded output is replayed under a header - the command does not run', () => {
    const r = proven('verify', 'true');
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /^proven: verify - these inputs passed at \S+ \(fingerprint [0-9a-f]{12}/);
    assert.match(r.out, /ran verify/);
    assert.equal(count(), 1);
  });

  await check('a changed input (an edited file, a new untracked file) runs it again', () => {
    writeFileSync(join(repo, 'a.txt'), 'two\n');
    assert.equal(proven('verify', 'true').code, 0);
    assert.equal(count(), 2);
    writeFileSync(join(repo, 'new.txt'), 'new\n');
    assert.equal(proven('verify', 'true').code, 0);
    assert.equal(count(), 3);
    assert.match(proven('verify', 'true').out, /^proven: verify/);
    assert.equal(count(), 3);
  });

  await check('FULL=1 always runs it', () => {
    assert.equal(proven('verify', 'true', { FULL: '1' }).code, 0);
    assert.equal(count(), 4);
  });

  await check('an input edited while it ran: the pass is not recorded, the next call runs again', () => {
    const r = proven('verify', `echo edited >> "${join(repo, 'a.txt')}"`, { FULL: '1' });
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /an input changed while it ran; the pass is not recorded/);
    assert.equal(count(), 5);
    assert.doesNotMatch(proven('verify', 'true').out, /^proven:/);
    assert.equal(count(), 6);
  });

  await check('a failure keeps its exit code and removes the proof: the next call runs again', () => {
    const r = proven('verify', 'exit 3', { FULL: '1' });
    assert.equal(r.code, 3, r.out);
    assert.equal(JSON.parse(readFileSync(join(repo, '.cache', 'proven.json'), 'utf8')).verify, undefined);
    assert.doesNotMatch(proven('verify', 'true').out, /^proven:/);
    assert.equal(count(), 8);
  });

  await check('a coverage pass proves the unit suite: `bun run test:run` (vitest run) replays the coverage run', () => {
    assert.equal(proven('coverage', 'echo "All files | 74.4"').code, 0);
    const before = count();
    // a replay never starts vitest - there is none in this repository
    const r = sh(['bun', PROVEN, 'unit', '--', 'vitest', 'run']);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /^proven: unit/);
    assert.match(r.out, /All files \| 74\.4/);
    assert.equal(count(), before);
  });

  await check('another command under a proof\'s name never replays its output - it runs', () => {
    assert.match(proven('verify', 'true').out, /^proven: verify/);
    const r = sh(['bun', PROVEN, 'verify', '--', 'sh', '-c', 'echo other command']);
    assert.equal(r.code, 0, r.out);
    assert.doesNotMatch(r.out, /^proven:/);
    assert.match(r.out, /other command/);
  });

  await check('outside a git checkout the command runs, its exit code passes through, nothing is recorded', () => {
    const plain = join(base, 'plain');
    mkdirSync(plain);
    // git looks no further up than base: plain/ is in no repository
    const env = { ...process.env, GIT_CEILING_DIRECTORIES: base };
    const run = (code: number) => Bun.spawnSync(['bun', PROVEN, 'verify', '--', 'sh', '-c', `echo plain run; exit ${code}`], { cwd: plain, env, stdout: 'pipe', stderr: 'pipe' });
    const ok = run(0);
    assert.equal(ok.exitCode, 0);
    assert.match(ok.stdout.toString(), /not a git checkout[\s\S]*plain run/);
    assert.equal(run(4).exitCode, 4);
    assert.ok(!existsSync(join(plain, '.cache')), 'no records');
  });

  await check('an output the command writes is no input: a test run that rewrites its totals file still replays', () => {
    mkdirSync(join(repo, 'src', 'documentation', 'data'), { recursive: true });
    const totals = join(repo, 'src', 'documentation', 'data', 'unit-tests.json');
    writeFileSync(totals, '{"tests":1}\n');
    sh(['git', 'add', '-A']);
    sh(['git', '-c', 'user.email=e2e@example.invalid', '-c', 'user.name=e2e', 'commit', '-qm', 'totals']);
    // the totals file changes during the run - it is unit's output, so the pass is recorded anyway
    const write = `echo '{"tests":2}' > "${totals}"`;
    const r = proven('unit', write, { FULL: '1' });
    assert.doesNotMatch(r.out, /an input changed/);
    assert.match(proven('unit', write).out, /^proven: unit/);
  });
} finally {
  rmSync(base, { recursive: true, force: true });
}

if (failures) {
  console.error(`proven.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('proven.e2e: all checks passed');
