/**
 * Why: the gate runs the full unit suite twice (plain, then with coverage) and verify again after the pipeline already
 * ran them, and once more on every rerun - minutes of identical work on identical inputs. A run whose inputs are byte
 * for byte those of a passing run proves nothing new; its result is that run's result. This is the pure half of
 * scripts/proven.ts: which files a proof's command depends on, the fingerprint over them, and when a recorded pass
 * may be replayed. The same skip-by-proof the e2e runner (tests/e2e/run.ts) and the screenshots manifest use.
 * VERIFIED: (tests/proof.test.ts) the decisions; (tests/e2e/site/proven.e2e.ts) the command in a throwaway repository.
 */

/** A command whose pass can be proven by its inputs. */
export interface Proof {
  /** files the command writes, never inputs (a test run records its totals in one) */
  outputs: string[];
  /** inputs git ignores that the command reads anyway (a file, or a folder whose file NAMES count) */
  ignoredInputs: string[];
  /** other proofs a pass of this one proves too, each with the command line it stands for (a coverage run runs the
   *  whole unit suite: `{ unit: 'vitest run' }`) */
  proves: Record<string, string>;
}

/**
 * The proofs: every input is a file git does not ignore (tracked or untracked), plus the ignored files the command
 * reads, plus HEAD and `git status` (verify reads commit times, HEAD's package.json and the status), plus the tool
 * versions. A superset is sound - an unrelated edit only costs a real run.
 */
export const PROOFS: Record<string, Proof> = {
  unit: { outputs: ['src/documentation/data/unit-tests.json'], ignoredInputs: [], proves: {} },
  coverage: { outputs: ['src/documentation/data/unit-tests.json'], ignoredInputs: [], proves: { unit: 'vitest run' } },
  // verify checks the screenshots manifest and that every component has its PNGs (screenshots/ is ignored)
  verify: { outputs: [], ignoredInputs: ['screenshots/manifest.json', 'screenshots/light/', 'screenshots/dark/'], proves: {} },
};

/** The files a proof hashes: the listed ones minus its outputs, sorted (a stable order is part of the fingerprint). */
export function proofFiles(listed: string[], proof: Proof): string[] {
  const out = new Set(proof.outputs);
  return [...new Set(listed)].filter((p) => !out.has(p)).sort();
}

/**
 * `git status --porcelain` without the proof's outputs - a test run that rewrites its totals file must not see its own
 * write as a changed input. VERIFIED: (tests/e2e/site/proven.e2e.ts) with the status unfiltered, the pass of a run
 * whose totals changed was never recorded.
 */
export function statusWithoutOutputs(porcelain: string, proof: Proof): string {
  return porcelain
    .split('\n')
    .filter((line) => line && !proof.outputs.some((o) => line.slice(3) === o || line.endsWith(` -> ${o}`)))
    .join('\n');
}

/** One line per fact the fingerprint covers: context first (HEAD, status, versions), then `path\0hash` per file. */
export function fingerprintLines(context: string[], files: [path: string, hash: string][]): string[] {
  return [...context.map((c) => `ctx\0${c}`), ...files.map(([p, h]) => `${p}\0${h}`)];
}

/** A pass of a command on inputs with this fingerprint. */
export interface ProofRecord {
  fingerprint: string;
  /** when it passed (ISO 8601) */
  at: string;
  /** what ran */
  command: string;
  /** its output, replayed when the same inputs come again */
  output: string;
}

/**
 * Replay instead of running: a recorded pass of the same command line on the same fingerprint, unless a fresh run
 * was asked for (FULL=1). VERIFIED: (tmp probe, 2026-10-13) keyed by the proof's name alone, `proven.ts verify --
 * echo hello` replayed verify's output.
 */
export const mayReplay = (record: ProofRecord | undefined, fingerprint: string, command: string, fresh: boolean): record is ProofRecord =>
  !fresh && !!record && record.fingerprint === fingerprint && record.command === command;

/** The line a replay starts with - a replay is never silent. */
export const replayHeader = (name: string, record: ProofRecord): string =>
  `proven: ${name} - these inputs passed at ${record.at} (fingerprint ${record.fingerprint.slice(0, 12)}, \`${record.command}\`); its output follows. FULL=1 runs it again.`;

/**
 * The records after a run: a pass records itself and what it also proves - only when its inputs did not change while
 * it ran (an edit during the run was never tested); a failure removes the proof it was asked for.
 */
export function afterRun(
  records: Record<string, ProofRecord>,
  name: string,
  proof: Proof,
  run: { code: number; before: string; after: string; command: string; output: string; at: string },
): Record<string, ProofRecord> {
  const next = { ...records };
  if (run.code !== 0) {
    delete next[name];
    return next;
  }
  if (run.before !== run.after) return next;
  const record: ProofRecord = { fingerprint: run.before, at: run.at, command: run.command, output: run.output };
  next[name] = record;
  for (const [n, command] of Object.entries(proof.proves)) next[n] = { ...record, command };
  return next;
}
