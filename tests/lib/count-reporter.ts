import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Reporter, TestModule } from 'vitest/node';

/**
 * Why: the docs state how many unit tests the suite runs (the flagship deck's
 * verifier slide). Counting `it(` in the sources gives 450; the suite runs
 * 599, because `it.each` tables expand at run time. The only true figure is
 * the one a run reports, so this reporter records the totals of every FULL
 * run (all test files, nothing filtered) as src/documentation/data/
 * unit-tests.json - the `tests.*` source of the data-stat figures (`bun run
 * figures`; verify's `stat figures` gate). No date, so a run that changes
 * nothing rewrites nothing. A filtered run (`vitest tests/store.test.ts`)
 * leaves the record alone.
 * VERIFIED: (bun run test:run, then verify's stat figures gate) the slide's
 * "Unit tests" figure equals the suite's reported total.
 */
const ROOT = join(import.meta.dirname, '..', '..');
const OUT = join(ROOT, 'src', 'documentation', 'data', 'unit-tests.json');

export default class CountReporter implements Reporter {
  onTestRunEnd(testModules: ReadonlyArray<TestModule>): void {
    const onDisk = readdirSync(join(ROOT, 'tests')).filter((f) => f.endsWith('.test.ts')).length;
    if (testModules.length < onDisk) return; // a filtered run - not the suite
    let tests = 0;
    let passed = 0;
    for (const m of testModules) {
      for (const t of m.children.allTests()) {
        tests++;
        if (t.result().state === 'passed') passed++;
      }
    }
    if (!tests) return;
    const next = JSON.stringify({ schema: 1, files: testModules.length, tests, passed }, null, 2) + '\n';
    let prev = '';
    try {
      prev = readFileSync(OUT, 'utf8');
    } catch {
      /* first record */
    }
    if (prev !== next) writeFileSync(OUT, next);
  }
}
