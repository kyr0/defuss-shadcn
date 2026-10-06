import { describe, expect, it } from 'vitest';
import { tscErrorCounts, typeRatchetProblems } from '../scripts/lib/type-check.ts';

/**
 * Why: verify's `component types (tsc ratchet)` decides from tsc's output
 * whether a documented type still holds. A miscounted file passes a wrong
 * annotation or fails a clean one - these pin the parse and the ratchet.
 */

describe('tscErrorCounts', () => {
  it('counts error lines per file, ignoring the rest of the output', () => {
    const out = [
      "src/components/a/a.ts(1,2): error TS2339: Property 'x' does not exist on type 'Element'.",
      'src/components/a/a.ts(9,4): error TS7006: Parameter t implicitly has an any type.',
      'src/components/b/b.ts(3,1): error TS2322: Type string is not assignable to type number.',
      '  some continuation line',
      'Found 3 errors in 2 files.',
    ].join('\n');
    expect(tscErrorCounts(out)).toEqual({ 'src/components/a/a.ts': 2, 'src/components/b/b.ts': 1 });
  });
  it('a clean run counts nothing', () => {
    expect(tscErrorCounts('')).toEqual({});
  });
});

describe('typeRatchetProblems', () => {
  it('passes a file at its baseline', () => {
    expect(typeRatchetProblems({ 'a.ts': 3 }, { 'a.ts': 3 })).toEqual([]);
  });
  it('fails a file above its baseline - a written type does not hold', () => {
    expect(typeRatchetProblems({ 'a.ts': 4 }, { 'a.ts': 3 })[0]).toMatch(/a\.ts: 4 type error\(s\), baseline 3 - a written type does not hold/);
  });
  it('fails a file below its baseline until the baseline is lowered - the ratchet only goes down', () => {
    expect(typeRatchetProblems({ 'a.ts': 1 }, { 'a.ts': 3 })[0]).toMatch(/lower TYPE_BASELINE .* to 1/);
  });
  it('a new file starts at 0, and a file that became clean must leave the baseline', () => {
    expect(typeRatchetProblems({ 'new.ts': 1 }, {})[0]).toMatch(/new\.ts: 1 type error\(s\), baseline 0/);
    expect(typeRatchetProblems({}, { 'gone.ts': 2 })[0]).toMatch(/gone\.ts: 0 type error\(s\), baseline 2/);
  });
});
