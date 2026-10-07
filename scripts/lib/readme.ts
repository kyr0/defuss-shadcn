/**
 * Why: the README (and doc-site index) advertise how many components are
 * JavaScript-free. That count drifts the moment a component gains or loses
 * behavior, so verify.ts compares the stated "N of M components need no
 * JavaScript" line against the actual src/components tree. Pure helper —
 * callers inject file contents and the measured counts; tests feed fixtures.
 */

/** The machine-checked claim; tolerant of bold markers and whitespace. */
const STAT_RE = /(\d+)\s+of\s+(\d+)\s+components\s+need\s+no\s+JavaScript/i;

export type ActualStats = { cssOnly: number; total: number };

/**
 * Why: one function validates the same claim wherever it appears (README.md,
 * documentation/index.html) so the parity pair can never state different
 * numbers. Returns zero problems when the line exists and matches the actual
 * component tree; otherwise a problem string whose text names the fix.
 */
export function readmeCssOnlyProblems(text: string, file: string, actual: ActualStats): string[] {
  const match = text.match(STAT_RE);
  if (!match)
    return [
      `${file} does not state how many components need no JavaScript - expected "${actual.cssOnly} of ${actual.total} components need no JavaScript"`,
    ];
  const cssOnly = Number(match[1]);
  const total = Number(match[2]);
  if (cssOnly !== actual.cssOnly || total !== actual.total)
    return [
      `${file} claims ${cssOnly} of ${total} components need no JavaScript, but the component tree has ${actual.cssOnly} of ${actual.total}`,
    ];
  return [];
}

/** One side of the README ↔ index pair: its last commit (hash, Unix seconds) and whether it has uncommitted edits. */
export type PairFile = { name: string; hash: string; at: number; dirty: boolean };

/**
 * Why: README.md and the index page state the same promises, so they land together. The check once read only
 * commit history. VERIFIED: (2026-10-07, commit f33c7e73) a README-only edit passed it, got committed, and from then
 * on failed every verify run - while the commit gate refused the commit that would land both files. Uncommitted
 * edits therefore count: edits to both
 * pass (they land in one commit), an edit to one alone fails before it is committed. With neither edited, the
 * last commits touching each must be the same commit or at most `windowSeconds` apart.
 */
export function commitWindowProblems(a: PairFile, b: PairFile, windowSeconds: number): string[] {
  if (a.dirty && b.dirty) return [];
  if (a.dirty !== b.dirty) {
    const [edited, other] = a.dirty ? [a, b] : [b, a];
    return [`${edited.name} has uncommitted edits but ${other.name} has none - edit both so they land in one commit`];
  }
  if (!a.hash || !b.hash || a.hash === b.hash) return [];
  const gap = Math.abs(a.at - b.at);
  if (gap <= windowSeconds) return [];
  const older = a.at < b.at ? a.name : b.name;
  return [`${older} was last committed ${Math.round(gap / 60)} min apart from the other (> ${windowSeconds / 60} min) - its statements may have drifted`];
}
