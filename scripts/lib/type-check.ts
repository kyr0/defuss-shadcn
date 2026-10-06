/**
 * Why: the API docs state a TypeScript type for every argument, return
 * value and event-detail field (src/documentation/lib/component-api.ts) -
 * a claim, so the compiler must check it. The component sources are still
 * mostly untyped JS (1,212 loose-mode errors when the check landed, nearly
 * all properties stashed on elements), so a clean check is a refactor of
 * its own. Instead the error count per file is a ratchet, like
 * dom-discipline.ts's QUERY_BASELINE: it may never rise (a wrong annotation
 * adds an error at a call site or in the body), and when it falls the
 * baseline must follow (scripts/lib/type-baseline.ts).
 *
 * VERIFIED: (tests/type-check.test.ts) a rise fails as broken types, a fall
 * fails until the baseline follows, a new file starts at 0.
 *
 * Pure: tsc output in, counts and problem lines out. verify runs
 * `tsc -p tsconfig.components.json`.
 */

/** tsc's `path(line,col): error TSxxxx` lines → errors per repo-relative file */
export function tscErrorCounts(output: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const m of output.matchAll(/^([^\s(][^(]*)\(\d+,\d+\): error TS\d+/gm)) counts[m[1]] = (counts[m[1]] ?? 0) + 1;
  return counts;
}

/** the ratchet: a file above its baseline is new type debt, below it the baseline must come down */
export function typeRatchetProblems(counts: Readonly<Record<string, number>>, baseline: Readonly<Record<string, number>>): string[] {
  const problems: string[] = [];
  for (const file of [...new Set([...Object.keys(counts), ...Object.keys(baseline)])].sort()) {
    const now = counts[file] ?? 0;
    const was = baseline[file] ?? 0;
    if (now > was) problems.push(`${file}: ${now} type error(s), baseline ${was} - a written type does not hold (run \`bunx tsc -p tsconfig.components.json\`)`);
    else if (now < was) problems.push(`${file}: ${now} type error(s), baseline ${was} - lower TYPE_BASELINE in scripts/lib/type-baseline.ts to ${now}`);
  }
  return problems;
}
