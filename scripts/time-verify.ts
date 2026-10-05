#!/usr/bin/env bun
import { execSync, spawnSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import { cpus, platform, release, totalmem } from 'node:os';
import { join } from 'node:path';

/**
 * Why: the flagship deck states how long the verifier takes - a claim, so it
 * needs evidence. This runs `bun scripts/verify.ts` once (on a green tree),
 * measures the wall time, counts the gates it passed and records WHERE it
 * ran - machine, chip, memory, OS, Bun - plus who drove it (`--agent`), as
 * src/documentation/data/verify-timing.json. The deck renders that file's
 * figures (data-stat="verify.*"), and verify's `stat figures` gate fails when
 * the slide and the measurement disagree. A failing verify run records
 * nothing.
 *
 *   bun scripts/time-verify.ts --agent "Claude Code · Opus 5.5 (high effort)"
 */

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'src', 'documentation', 'data', 'verify-timing.json');
const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

/** a human machine name: "MacBook Air · Apple M4" on macOS, the CPU model elsewhere */
function machine(): { name: string; chip: string } {
  if (platform() === 'darwin') {
    try {
      const hw = execSync('system_profiler SPHardwareDataType', { encoding: 'utf8' });
      const field = (k: string) => hw.match(new RegExp(`${k}: (.+)`))?.[1].trim();
      return { name: field('Model Name') ?? 'Mac', chip: field('Chip') ?? cpus()[0]?.model ?? 'unknown' };
    } catch {
      /* fall through to the generic answer */
    }
  }
  return { name: platform(), chip: cpus()[0]?.model.trim() ?? 'unknown' };
}

const started = performance.now();
const run = spawnSync('bun', ['scripts/verify.ts'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const seconds = Math.round((performance.now() - started) / 100) / 10;
const out = `${run.stdout}\n${run.stderr}`;
if (run.status !== 0 || !/verify: OK/.test(out)) {
  console.error(out.split('\n').filter((l) => /✗|verify:/.test(l)).join('\n'));
  console.error('time-verify: verify is not green - nothing recorded (fix the tree first)');
  process.exit(1);
}
const gates = out.split('\n').filter((l) => /^\s+✓ /.test(l)).length;
const e2eFiles = readdirSync(join(ROOT, 'tests', 'e2e')).filter((f) => f.endsWith('.e2e.ts')).length;
const { name, chip } = machine();
const timing = {
  command: 'bun scripts/verify.ts',
  seconds,
  gates,
  e2eFiles,
  machine: name,
  chip,
  cores: cpus().length,
  memoryGB: Math.round(totalmem() / 1024 ** 3),
  os: platform() === 'darwin' ? `macOS ${execSync('sw_vers -productVersion', { encoding: 'utf8' }).trim()}` : `${platform()} ${release()}`,
  bun: Bun.version,
  agent: arg('agent') ?? 'none (run by hand)',
  date: new Date().toISOString().slice(0, 10),
};
writeFileSync(OUT, `${JSON.stringify(timing, null, 2)}\n`);
console.log(`time-verify: ${seconds} s for ${gates} gates on ${name} · ${chip} → ${OUT.slice(ROOT.length + 1)}`);
