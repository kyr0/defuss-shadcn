import { describe, expect, it } from 'vitest';
import {
  changelogDataMarkupProblems,
  changelogProblems,
  parseChangelogData,
  type ChangelogEntry,
  type CommitInfo,
} from '../scripts/lib/changelog.ts';

/**
 * Why: the changelog gate in verify.ts decides whether a release is allowed;
 * its logic lives in the pure scripts/lib/changelog.ts so these tests pin the
 * contract (entry required for the committed version, commit-hash after
 * commit, date before commit) without touching git or the filesystem.
 */

/** Minimal changelog.json in exactly the shape deploy.sh writes. */
function doc(entries: Array<{ version: string; date?: string; hash?: string; commits?: string[] }>): string {
  return JSON.stringify({ entries });
}

/**
 * Entities are written as & escapes (see scripts/lib/changelog.ts):
 * literal "&" in this file would be entity-normalized by editors/tools
 * before it reaches the parser, silently defeating the decode test.
 */
const DEFAULT_MESSAGE = 'some change &amp; escape &lt;check&gt;';
const DECODED_MESSAGE = 'some change & escape <check>';

const okCommit = (hash: string): CommitInfo => ({ exists: true, touchesChangelog: hash.startsWith('a') });
const resolve: (hash: string) => CommitInfo = (hash) => okCommit(hash);

describe('parseChangelogData', () => {
  it('extracts version (v-prefix stripped), date, hash and decoded messages per entry', () => {
    const [e] = parseChangelogData(
      doc([{ version: 'v1.2.3', date: 'April 19, 2026', hash: 'abc1234', commits: [DEFAULT_MESSAGE] }]),
    );
    expect(e).toEqual({
      version: '1.2.3',
      date: 'April 19, 2026',
      hash: 'abc1234',
      messages: [DECODED_MESSAGE],
    });
  });

  it('returns an empty list when no entries exist', () => {
    expect(parseChangelogData(doc([]))).toEqual([]);
  });

  it('keeps entries in document order', () => {
    const entries = parseChangelogData(doc([{ version: 'v2.0.0' }, { version: 'v1.9.0' }]));
    expect(entries.map((e: ChangelogEntry) => e.version)).toEqual(['2.0.0', '1.9.0']);
  });
});

describe('changelogProblems', () => {
  const base = { resolveCommit: resolve, worktreeVersion: '1.0.0' };

  it('passes when the committed version has a hashed entry touching the changelog', () => {
    const entries: ChangelogEntry[] = parseChangelogData(
      doc([{ version: 'v1.0.0', date: 'd', hash: 'aaaaaaa', commits: ['x'] }]),
    );
    const { problems, warnings } = changelogProblems({ ...base, entries, committedVersion: '1.0.0' });
    expect(problems).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('fails when the committed version has no changelog entry', () => {
    const { problems } = changelogProblems({
      ...base,
      entries: parseChangelogData(doc([{ version: 'v0.9.0', date: 'd', hash: 'aaaaaaa', commits: ['x'] }])),
      committedVersion: '1.0.0',
    });
    expect(problems.join('\n')).toMatch(/v1\.0\.0.*no v1\.0\.0 entry/);
  });

  it('fails when an entry has no commit messages at all', () => {
    const entries = [{ version: '1.0.0', date: 'd', hash: 'aaaaaaa', messages: [] }];
    const { problems } = changelogProblems({ ...base, entries, committedVersion: '1.0.0' });
    expect(problems.join('\n')).toMatch(/no commit messages/);
  });

  it('fails when the committed version\'s entry is date-only (hash available after commit)', () => {
    const entries = parseChangelogData(doc([{ version: 'v1.0.0', date: 'd', commits: ['x'] }]));
    const { problems } = changelogProblems({ ...base, entries, committedVersion: '1.0.0' });
    expect(problems.join('\n')).toMatch(/date but no commit hash/);
  });

  it('fails when the embedded hash does not resolve to a commit', () => {
    const entries = parseChangelogData(doc([{ version: 'v1.0.0', date: 'd', hash: 'deadbee', commits: ['x'] }]));
    const { problems } = changelogProblems({
      ...base,
      entries,
      committedVersion: '1.0.0',
      resolveCommit: (h) => (h === 'aaaaaaa' ? { exists: true, touchesChangelog: true } : null),
    });
    expect(problems.join('\n')).toMatch(/deadbee does not resolve/);
  });

  it('fails when the embedded hash points to a commit that did not touch the changelog', () => {
    const entries = parseChangelogData(doc([{ version: 'v1.0.0', date: 'd', hash: 'bbbbbbb', commits: ['x'] }]));
    const { problems } = changelogProblems({ ...base, entries, committedVersion: '1.0.0' });
    expect(problems.join('\n')).toMatch(/bbbbbbb.*does not touch changelog/);
  });

  it('flags any entry lacking both a date and a hash', () => {
    const entries: ChangelogEntry[] = [{ version: '0.5.0', date: '', hash: null, messages: ['x'] }];
    const { problems } = changelogProblems({ ...base, entries, committedVersion: '0.5.0' });
    expect(problems.join('\n')).toMatch(/v0\.5\.0 entry has neither a release date nor a commit hash/);
  });

  it('warns (not fails) when the worktree version is bumped ahead of the changelog', () => {
    const entries = parseChangelogData(doc([{ version: 'v1.0.0', date: 'd', hash: 'aaaaaaa', commits: ['x'] }]));
    const { problems, warnings } = changelogProblems({
      ...base,
      entries,
      worktreeVersion: '1.1.0',
      committedVersion: '1.0.0',
    });
    expect(problems).toEqual([]);
    expect(warnings.join('\n')).toMatch(/v1\.1\.0/);
  });

  it('warns and skips the gate when git cannot report the committed version', () => {
    const { problems, warnings } = changelogProblems({ ...base, entries: [], committedVersion: null });
    expect(problems).toEqual([]);
    expect(warnings.join('\n')).toMatch(/changelog gate skipped/);
  });
});

describe('changelogDataMarkupProblems', () => {
  it('accepts prose with code/strong/link/span and entity-escaped element names', () => {
    const json = doc([
      {
        version: 'v2.0.0',
        date: 'd',
        commits: ['a <strong>fix</strong> to <code>video</code> — see <a href="#">the docs</a> & <code>&lt;video&gt;</code> handling'],
      },
    ]);
    expect(changelogDataMarkupProblems(json)).toEqual([]);
  });

  it('flags raw element markup inside an entry (it would render live)', () => {
    const problems = changelogDataMarkupProblems(
      doc([{ version: 'v2.0.0', date: 'd', commits: ['now a native <video controls> element'] }]),
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/v2\.0\.0/);
    expect(problems[0]).toMatch(/<video>/);
  });

  it('flags the historic offenders (hr, main) individually', () => {
    const problems = changelogDataMarkupProblems(
      doc([{ version: 'v2.0.0', date: 'd', commits: ['a raw <hr> and the <main> width'] }]),
    );
    expect(problems.some((p: string) => p.includes('<hr>'))).toBe(true);
    expect(problems.some((p: string) => p.includes('<main>'))).toBe(true);
  });

  it('reports invalid JSON as one clear problem', () => {
    const problems = changelogDataMarkupProblems('{not json');
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/not valid JSON/);
  });
});
