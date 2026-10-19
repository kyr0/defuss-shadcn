import { describe, expect, it } from 'vitest';
import { afterRun, fingerprintLines, mayReplay, PROOFS, proofFiles, replayHeader, statusWithoutOutputs, type ProofRecord } from '../scripts/lib/proof.ts';

/**
 * Why: scripts/proven.ts replays a recorded pass instead of running a command again - so the decisions it rests on
 * must hold: an output is never an input, a pass is recorded only on unchanged inputs, a failure removes the proof,
 * FULL=1 always runs, a coverage pass proves the unit suite too. (The command itself: tests/e2e/site/proven.e2e.ts.)
 */
const record = (fingerprint: string): ProofRecord => ({ fingerprint, at: '2026-10-13T12:00:00.000Z', command: 'vitest run', output: 'ok\n' });
const run = (code: number, before: string, after = before) => ({ code, before, after, command: 'vitest run', output: 'out\n', at: '2026-10-13T12:00:00.000Z' });

describe('proof decisions (scripts/lib/proof.ts)', () => {
  it('proofFiles: the outputs a command writes are never its inputs; the list is sorted and unique', () => {
    expect(proofFiles(['b.ts', 'src/documentation/data/unit-tests.json', 'a.ts', 'b.ts'], PROOFS.unit)).toEqual(['a.ts', 'b.ts']);
    // verify READS the test totals (the tests.* figures), so they are its input
    expect(proofFiles(['src/documentation/data/unit-tests.json'], PROOFS.verify)).toEqual(['src/documentation/data/unit-tests.json']);
  });

  it('fingerprintLines: the context comes first and every file is its path and hash - a renamed file is a change', () => {
    expect(fingerprintLines(['head abc'], [['a.ts', '1']])).toEqual(['ctx\0head abc', 'a.ts\x001']);
    expect(fingerprintLines([], [['a.ts', '1']])).not.toEqual(fingerprintLines([], [['b.ts', '1']]));
  });

  it('statusWithoutOutputs: the status keeps every changed path but the outputs the proof itself writes', () => {
    const status = ' M a.ts\n M src/documentation/data/unit-tests.json\n?? new.ts\n';
    expect(statusWithoutOutputs(status, PROOFS.unit)).toBe(' M a.ts\n?? new.ts');
    expect(statusWithoutOutputs(status, PROOFS.verify)).toBe(' M a.ts\n M src/documentation/data/unit-tests.json\n?? new.ts');
  });

  it('mayReplay: only a recorded pass of the same command line on the same fingerprint, and never with FULL=1', () => {
    expect(mayReplay(record('f1'), 'f1', 'vitest run', false)).toBe(true);
    expect(mayReplay(record('f1'), 'f2', 'vitest run', false)).toBe(false);
    expect(mayReplay(undefined, 'f1', 'vitest run', false)).toBe(false);
    expect(mayReplay(record('f1'), 'f1', 'vitest run', true)).toBe(false);
    // another command under the same proof's name never replays its output
    expect(mayReplay(record('f1'), 'f1', 'echo hello', false)).toBe(false);
  });

  it('afterRun: a pass records itself (and what it proves too); inputs changed during the run record nothing; a failure removes the proof', () => {
    const coverage = afterRun({}, 'coverage', PROOFS.coverage, run(0, 'f1'));
    expect(Object.keys(coverage).sort()).toEqual(['coverage', 'unit']);
    expect(coverage.unit.fingerprint).toBe('f1');
    expect(coverage.unit.output).toBe('out\n');
    // recorded under the unit suite's own command line - `bun run test:run` replays it
    expect(coverage.unit.command).toBe('vitest run');
    expect(coverage.coverage.command).toBe('vitest run');
    // the unit suite proves only itself
    expect(Object.keys(afterRun({}, 'unit', PROOFS.unit, run(0, 'f1')))).toEqual(['unit']);
    // an edit while it ran was never tested
    expect(afterRun({ unit: record('f0') }, 'unit', PROOFS.unit, run(0, 'f1', 'f2'))).toEqual({ unit: record('f0') });
    // a failure always runs again, other proofs stay
    expect(afterRun({ unit: record('f1'), verify: record('v1') }, 'unit', PROOFS.unit, run(1, 'f1'))).toEqual({ verify: record('v1') });
  });

  it('replayHeader: a replay names itself, when the inputs passed, the command and how to run it again', () => {
    const line = replayHeader('verify', record('4a840ed76896ffff'));
    expect(line).toContain('proven: verify');
    expect(line).toContain('2026-10-13T12:00:00.000Z');
    expect(line).toContain('4a840ed76896');
    expect(line).toContain('`vitest run`');
    expect(line).toContain('FULL=1');
  });
});
