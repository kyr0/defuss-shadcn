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
