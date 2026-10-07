import { describe, expect, it } from 'vitest';
import { commitWindowProblems, readmeCssOnlyProblems } from '../scripts/lib/readme.ts';

/**
 * Why: verify.ts's "README/index CSS-only stat" gates compare the advertised
 * "N of M components need no JavaScript" claim against the real component
 * tree. The comparison logic lives in scripts/lib/readme.ts as a pure
 * function so these tests pin the contract (line present, numbers correct,
 * both files checked) without touching the filesystem.
 */
const actual = { cssOnly: 42, total: 68 };

describe('readmeCssOnlyProblems', () => {
  it('passes when the stated counts match the actual tree', () => {
    const text = 'Some intro. **42 of 68 components need no JavaScript.** More text.';
    expect(readmeCssOnlyProblems(text, 'README.md', actual)).toEqual([]);
  });

  it('flags stale counts with a problem naming both numbers', () => {
    const problems = readmeCssOnlyProblems(
      '**28 of 54 components need no JavaScript.**',
      'README.md',
      actual,
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('README.md');
    expect(problems[0]).toContain('28 of 54');
    expect(problems[0]).toContain('42 of 68');
  });

  it('flags a missing line so the fix instruction points at both files', () => {
    const problems = readmeCssOnlyProblems('# README without stats', 'a.md', actual);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('a.md');
    expect(problems[0]).toContain('need no JavaScript');
  });

  it('tolerates whitespace and casing variants of the claim', () => {
    const text = '42 of 68 components need no javascript';
    expect(readmeCssOnlyProblems(text, 'x', actual)).toEqual([]);
  });
});

describe('commitWindowProblems', () => {
  const WINDOW = 15 * 60;
  const readme = (at: number, dirty = false, hash = 'r') => ({ name: 'README.md', hash, at, dirty });
  const index = (at: number, dirty = false, hash = 'i') => ({ name: 'pages/index.mdx', hash, at, dirty });

  it('passes uncommitted edits to both files, however far apart their last commits are', () => {
    expect(commitWindowProblems(readme(0, true), index(4 * 3600, true), WINDOW)).toEqual([]);
  });

  it('fails an uncommitted edit to one file alone, naming both', () => {
    const problems = commitWindowProblems(readme(0, true), index(0, false, 'r'), WINDOW);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('README.md has uncommitted edits');
    expect(problems[0]).toContain('pages/index.mdx');
  });

  it('passes a clean pair touched by the same commit or within the window', () => {
    expect(commitWindowProblems(readme(0, false, 'x'), index(9999, false, 'x'), WINDOW)).toEqual([]);
    expect(commitWindowProblems(readme(0), index(WINDOW), WINDOW)).toEqual([]);
  });

  it('fails a clean pair committed further apart, naming the older file', () => {
    const problems = commitWindowProblems(readme(3780), index(0), WINDOW);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('pages/index.mdx was last committed 63 min apart');
  });
});
