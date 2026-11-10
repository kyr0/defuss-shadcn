import { describe, expect, it } from 'vitest';
import { exampleChanges, pendingKey, releaseEntry, releaseProblems, UNRELEASED, withRelease, type WhatsNewData } from '../scripts/lib/whats-new.ts';
import { freshVersions, markOf, opened, SEEN_LIMIT, visit } from '../src/documentation/runtime/whats-new-core.ts';

/**
 * Why: the "What's new" record decides which pages the docs point a reader at. scripts/lib/whats-new.ts maps the
 * files git shows changed since the last release to sidebar pages (verify's `what's new ↔ release diff` gate compares
 * the record against it); runtime/whats-new-core.ts decides per browser which of those marks show. Both are pure;
 * the documentation e2e proves them in the built site.
 */

const input = {
  changed: [
    'src/documentation/pages/actions/button.mdx',
    'src/components/data-display/badge/badge.css',
    'src/components/data-display/badge/badge.parts.md',
    'src/documentation/pages/website/industry-spa.mdx',
    'src/components/shared-nothing/README.md',
    'src/components/application/studio/studio.css',
  ],
  pages: new Map([
    ['button', 'src/documentation/pages/actions/button.mdx'],
    ['badge', 'src/documentation/pages/data-display/badge.mdx'],
    ['industry-spa', 'src/documentation/pages/website/industry-spa.mdx'],
  ]),
  pagesBefore: new Set(['button', 'badge', 'studio']),
  components: new Map([
    ['badge', 'src/components/data-display/badge/'],
    ['studio', 'src/components/application/studio/'],
  ]),
};

describe('releaseEntry', () => {
  it("maps a page's .mdx and its component's files to the page; new pages are created", () => {
    expect(releaseEntry(UNRELEASED, input)).toEqual({ version: UNRELEASED, created: ['industry-spa'], updated: ['badge', 'button'] });
  });
  it('counts files of no listed page for nothing (a component whose page is not listed, a stray file)', () => {
    const e = releaseEntry('0.9.14', { ...input, changed: ['src/components/application/studio/studio.css', 'src/components/x/y.md'] });
    expect([e.created, e.updated]).toEqual([[], []]);
  });
});

describe('exampleChanges', () => {
  const before = [
    { label: 'Default', body: '<button class="btn">Save</button>' },
    { label: 'Outline', body: '<button class="btn" data-variant="outline">Save</button>' },
    { label: 'Gone', body: '<p>x</p>' },
    { label: null, body: '<p>no label</p>' },
  ];
  it('a label new to the page is created, a source that differs is updated, in page order', () => {
    const after = [
      { label: 'Ghost', body: '<button class="btn" data-variant="ghost">Save</button>' },
      { label: 'Default', body: '<button class="btn" data-size="sm">Save</button>' },
      { label: 'Outline', body: '<button class="btn" data-variant="outline">Save</button>' },
    ];
    expect(exampleChanges(before, after)).toEqual({ created: ['Ghost'], updated: ['Default'] });
  });
  it('a reformat changes nothing; an example without a label, or with an expression for one, has no anchor', () => {
    const after = [
      { label: 'Default', body: '<button\n  class="btn"\n>\n  Save\n</button>' },
      { label: null, body: '<p>changed</p>' },
      { label: 'Count {n}', body: '<p>new</p>' },
    ];
    expect(exampleChanges(before, after)).toEqual({ created: [], updated: [] });
  });
});

describe('releaseEntry - examples', () => {
  const sources: Record<string, { before: { label: string; body: string }[]; after: { label: string; body: string }[] }> = {
    button: { before: [{ label: 'Default', body: 'a' }], after: [{ label: 'Default', body: 'b' }, { label: 'Ghost', body: 'c' }] },
    badge: { before: [{ label: 'Default', body: 'a' }], after: [{ label: 'Default', body: 'a' }] },
  };
  it('an updated page names the examples it added and changed; a page with none and a new page name none', () => {
    const e = releaseEntry(UNRELEASED, { ...input, examples: (id) => sources[id] ?? { before: [], after: [{ label: 'X', body: 'x' }] } });
    expect(e.examples).toEqual({ button: { created: ['Ghost'], updated: ['Default'] } });
  });
  it('the record notices a release whose examples differ from git', () => {
    const entry = releaseEntry(UNRELEASED, { ...input, examples: (id) => sources[id] ?? { before: [], after: [] } });
    const stale: WhatsNewData = { version: 1, releases: [{ ...entry, examples: { button: { created: [], updated: ['Default'] } } }] };
    expect(releaseProblems(stale, entry).join(' ')).toMatch(/other changed examples/);
    expect(releaseProblems(withRelease(stale, entry), entry)).toEqual([]);
  });
});

describe('pendingKey / withRelease', () => {
  const history: WhatsNewData = { version: 1, releases: [{ version: '0.9.14', created: ['a'], updated: [] }] };
  it('goes under the version while it has no tag, else under "unreleased"', () => {
    expect(pendingKey('0.9.15', false)).toBe('0.9.15');
    expect(pendingKey('0.9.15', true)).toBe(UNRELEASED);
  });
  it('puts the pending entry first and keeps released entries', () => {
    const next = withRelease(history, { version: UNRELEASED, created: [], updated: ['b'] });
    expect(next.releases.map((r) => r.version)).toEqual([UNRELEASED, '0.9.14']);
  });
  it('a release under way replaces "unreleased"; an empty "unreleased" leaves the record', () => {
    const pending = withRelease(history, { version: UNRELEASED, created: [], updated: ['b'] });
    expect(withRelease(pending, { version: '0.9.15', created: [], updated: ['b'] }).releases.map((r) => r.version)).toEqual(['0.9.15', '0.9.14']);
    expect(withRelease(pending, { version: UNRELEASED, created: [], updated: [] })).toEqual(history);
  });
});

describe('releaseProblems', () => {
  const data: WhatsNewData = { version: 1, releases: [{ version: UNRELEASED, created: [], updated: ['a', 'b'] }] };
  it('is empty when the record says what git says', () => {
    expect(releaseProblems(data, { version: UNRELEASED, created: [], updated: ['a', 'b'] })).toEqual([]);
  });
  it('names the pages a stale record lacks or lists wrongly', () => {
    expect(releaseProblems(data, { version: UNRELEASED, created: ['c'], updated: ['a'] })).toEqual([
      '"unreleased" created lacks c',
      '"unreleased" updated lists b, which git does not show as updated',
    ]);
  });
  it('fails an entry nothing backs, and a missing one', () => {
    expect(releaseProblems(data, { version: UNRELEASED, created: [], updated: [] })[0]).toMatch(/nothing changed/);
    expect(releaseProblems({ version: 1, releases: [] }, { version: UNRELEASED, created: ['x'], updated: [] })[0]).toMatch(/no entry "unreleased"/);
  });
});

describe('the reader: visit / freshVersions / markOf / opened', () => {
  const versions = [UNRELEASED, '0.9.14', '0.9.13'];
  it('a first visit sees the newest release only', () => {
    const s = visit(null, versions);
    expect(s).toEqual({ visited: UNRELEASED, baseline: '0.9.14', seen: [] });
    expect([...freshVersions(versions, s.baseline)]).toEqual([UNRELEASED]);
  });
  it('back after two releases, both are news; the same release again keeps what was opened', () => {
    const s = visit({ visited: '0.9.13', baseline: '0.9.12', seen: ['x'] }, versions);
    expect(s).toEqual({ visited: UNRELEASED, baseline: '0.9.13', seen: [] });
    expect([...freshVersions(versions, s.baseline)]).toEqual([UNRELEASED, '0.9.14']);
    const same = { visited: UNRELEASED, baseline: '0.9.14', seen: ['x'] };
    expect(visit(same, versions)).toBe(same);
  });
  it('a baseline older than the record makes every release news', () => {
    expect([...freshVersions(versions, '0.8.0')]).toEqual(versions);
  });
  it('a page: created wins over updated, only in fresh releases, never once opened', () => {
    const fresh = new Set([UNRELEASED, '0.9.14']);
    expect(markOf(`${UNRELEASED}:updated 0.9.14:created`, fresh, [], 'p')).toBe('created');
    expect(markOf(`${UNRELEASED}:updated`, fresh, [], 'p')).toBe('updated');
    expect(markOf('0.9.13:created', fresh, [], 'p')).toBeNull();
    expect(markOf(`${UNRELEASED}:updated`, fresh, ['p'], 'p')).toBeNull();
  });
  it('opened keeps a page once and at most SEEN_LIMIT', () => {
    const s = { visited: 'v', baseline: '', seen: ['a'] };
    expect(opened(s, 'a')).toBe(s);
    let big = { ...s, seen: [] as string[] };
    for (let i = 0; i < SEEN_LIMIT + 5; i++) big = opened(big, `p${i}`);
    expect(big.seen.length).toBe(SEEN_LIMIT);
    expect(big.seen[0]).toBe('p5');
  });
});
