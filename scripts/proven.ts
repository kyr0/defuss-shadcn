#!/usr/bin/env bun
/**
 * Why: the vae gate and the pipeline run the full unit suite, its coverage run and verify again and again on the same
 * tree - after the pipeline ran them, and on every gate rerun. A command whose inputs are byte for byte those of a
 * recorded pass is not run again: its recorded output is replayed under a header that says so. Anything else runs
 * for real, and a pass is recorded only when its inputs did not change while it ran. The proofs (inputs, outputs,
 * what a pass also proves) live in scripts/lib/proof.ts; the records in .cache/proven.json (gitignored - deleting
 * it only costs real runs). FULL=1 always runs the command.
 * VERIFIED: (tests/e2e/site/proven.e2e.ts, in a throwaway repository) run, replay, a changed input, an edit during
 * the run, a failure, FULL=1; (tests/proof.test.ts) the decisions.
 *
 * Usage: bun scripts/proven.ts <unit|coverage|verify> -- <command> [args...]
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterRun, fingerprintLines, mayReplay, PROOFS, proofFiles, replayHeader, statusWithoutOutputs, type ProofRecord } from './lib/proof.ts';

const [name, dashes, ...command] = process.argv.slice(2);
const proof = PROOFS[name];
if (!proof || dashes !== '--' || command.length === 0) {
  console.error(`usage: bun scripts/proven.ts <${Object.keys(PROOFS).join('|')}> -- <command> [args...]`);
  process.exit(2);
}
const git = (...args: string[]) => {
  const out = Bun.spawnSync(['git', ...args], { stdout: 'pipe', stderr: 'pipe' });
  if (out.exitCode !== 0) throw new Error(`git ${args.join(' ')}: ${out.stderr.toString().trim()}`);
  return out.stdout.toString();
};
const top = Bun.spawnSync(['git', 'rev-parse', '--show-toplevel'], { stdout: 'pipe', stderr: 'pipe' });
if (top.exitCode !== 0) {
  // no git checkout (a downloaded archive): no inputs to prove - the command runs as it is
  console.log(`proven: ${name} - not a git checkout, so nothing is recorded or replayed`);
  process.exit(await Bun.spawn(command, { stdin: 'inherit', stdout: 'inherit', stderr: 'inherit' }).exited);
}
const ROOT = top.stdout.toString().trim();
const RECORDS = join(ROOT, '.cache', 'proven.json');

/** sha256 over the proof's inputs: HEAD, the status, the tool versions, every input file's content */
function fingerprint(): string {
  const listed = git('-C', ROOT, 'ls-files', '-z', '-co', '--exclude-standard').split('\0').filter(Boolean);
  const files: [string, string][] = [];
  for (const p of proofFiles(listed, proof)) {
    const abs = join(ROOT, p);
    // a tracked file deleted in the working tree counts as missing
    files.push([p, existsSync(abs) ? createHash('sha256').update(readFileSync(abs)).digest('hex') : 'missing']);
  }
  for (const input of proof.ignoredInputs) {
    const abs = join(ROOT, input);
    if (input.endsWith('/'))
      files.push([input, existsSync(abs) && statSync(abs).isDirectory() ? readdirSync(abs).sort().join('\0') : 'missing']);
    else files.push([input, existsSync(abs) ? createHash('sha256').update(readFileSync(abs)).digest('hex') : 'missing']);
  }
  const head = Bun.spawnSync(['git', '-C', ROOT, 'rev-parse', 'HEAD'], { stdout: 'pipe' }).stdout.toString().trim() || 'no commit';
  const node = Bun.spawnSync(['node', '--version'], { stdout: 'pipe' }).stdout.toString().trim();
  const context = [`head ${head}`, `status ${statusWithoutOutputs(git('-C', ROOT, 'status', '--porcelain'), proof)}`, `bun ${Bun.version}`, `node ${node}`, `platform ${process.platform} ${process.arch}`];
  const h = createHash('sha256');
  for (const line of fingerprintLines(context, files)) h.update(`${line}\n`);
  return h.digest('hex');
}

const records: Record<string, ProofRecord> = existsSync(RECORDS) ? JSON.parse(readFileSync(RECORDS, 'utf8')) : {};
const before = fingerprint();
const fresh = process.env.FULL === '1';
const record = records[name];
if (mayReplay(record, before, command.join(' '), fresh)) {
  console.log(replayHeader(name, record));
  process.stdout.write(record.output);
  process.exit(0);
}

// a real run: the output streams through and is kept for a later replay
const proc = Bun.spawn(command, { cwd: process.cwd(), stdin: 'inherit', stdout: 'pipe', stderr: 'pipe' });
const chunks: string[] = [];
const pump = async (stream: ReadableStream<Uint8Array>, sink: { write(chunk: Uint8Array): unknown }) => {
  const decoder = new TextDecoder();
  for await (const chunk of stream) {
    sink.write(chunk);
    chunks.push(decoder.decode(chunk, { stream: true }));
  }
};
await Promise.all([pump(proc.stdout, process.stdout), pump(proc.stderr, process.stderr)]);
const code = await proc.exited;
const after = code === 0 ? fingerprint() : before;
if (code === 0 && after !== before) console.log(`proven: ${name} - an input changed while it ran; the pass is not recorded`);
const next = afterRun(records, name, proof, { code, before, after, command: command.join(' '), output: chunks.join(''), at: new Date().toISOString() });
mkdirSync(join(ROOT, '.cache'), { recursive: true });
writeFileSync(RECORDS, `${JSON.stringify(next)}\n`);
process.exit(code);
