/**
 * Why: the changelog (`src/documentation/data/changelog.json`, rendered by
 * lib/components/changelog-entries.tsx) is the human-facing release history,
 * but package.json alone proves a version was cut. These pure helpers let
 * both `verify.ts` (hard gate) and unit tests evaluate "does the committed
 * version have a changelog entry, and does that entry carry the git hash of
 * the changelog commit (or a release date for legacy entries)?" without
 * touching the filesystem or git — callers inject those side effects.
 */

/** Class of the `<code>` element embedding the changelog commit's short hash. */
export const CHANGELOG_HASH_CLASS = 'changelog-hash';

/** The repair instruction embedded in every failure: two commits, entry first. */
export const FIX_TWO_COMMITS =
  'add the v<version> entry to src/documentation/data/changelog.json in its own commit (all commit messages since the last release), then a second commit that sets its `hash` field to the first commit\'s short hash — `bun run docs` after each (deploy.sh automates both)';

export type ChangelogEntry = {
  version: string;
  /** Release-date badge text; '' when absent. */
  date: string;
  /** Short git hash of the changelog commit; null when absent. */
  hash: string | null;
  /** `<li>` texts (commit messages, with allowlisted inline markup) in order. */
  messages: string[];
};

/** Result of resolving a hash against the repository (injected by the caller). */
export type CommitInfo = { exists: true; touchesChangelog: boolean } | null;

/**
 * Why: the changelog data file's shape (what ChangelogEntries renders and
 * deploy.sh mutates). Kept loose — a broken file surfaces as a gate failure
 * with a clear message rather than an opaque parse error.
 */
export interface ChangelogDoc {
  entries: Array<{ version: string; date?: string; hash?: string; commits?: string[] }>;
}

/**
 * Why: parse changelog.json into the same structured entries the gate asks
 * questions about. Strips markup from messages for the text view (the HTML
 * render keeps the allowlisted inline tags).
 */
export function parseChangelogData(jsonText: string): ChangelogEntry[] {
  const doc = JSON.parse(jsonText) as ChangelogDoc;
  return (doc.entries ?? []).map((e) => ({
    version: (e.version ?? '').replace(/^v/, ''),
    date: e.date ?? '',
    hash: e.hash ?? null,
    messages: (e.commits ?? []).map((c) => stripTags(c).trim()),
  }));
}

/** Strip REAL tags, then decode entities once (reversed order would make
 * escaped angle brackets become tags and be destroyed by the strip). */
function stripTags(text: string): string {
  return decodeEntities(text.replace(/<[^>]+>/g, ''));
}

// '&' built via char code so no source tool/entity normalizer can mangle the
// entity keys below (the old search-index header documents this exact trap).
const AMP = String.fromCharCode(38);
const HTML_ENTITIES: Record<string, string> = {
  [AMP + 'lt;']: '<',
  [AMP + 'gt;']: '>',
  [AMP + 'quot;']: '"',
  [AMP + '#39;']: "'",
  [AMP + 'amp;']: AMP,
};
const ENTITY_RE = new RegExp(AMP + '(?:lt|gt|quot|#39|amp);', 'g');

function decodeEntities(text: string): string {
  return text.replace(ENTITY_RE, (entity) => HTML_ENTITIES[entity] ?? entity);
}

/**
 * Inline tags a changelog commit message may contain. Changelog entries are
 * commit messages — prose with code spans and links, never rendered UI.
 * Anything outside this list is raw markup leaking through (an entry once
 * embedded a live `<video>` and a raw `<hr>`), so the gate rejects it.
 */
export const CHANGELOG_ALLOWED_TAGS = ['li', 'code', 'strong', 'a', 'span', 'em', 'b', 'i', 'kbd'];

/**
 * Why: enforce "changelog entries stay text" — scan each entry's commit
 * strings for tags outside the text allowlist. `<video>` written as text
 * (entities) is fine; a live <video> tag is not.
 */
export function changelogDataMarkupProblems(jsonText: string): string[] {
  let doc: ChangelogDoc;
  try {
    doc = JSON.parse(jsonText) as ChangelogDoc;
  } catch (e) {
    return [`changelog.json is not valid JSON: ${(e as Error).message}`];
  }
  const problems: string[] = [];
  for (const e of doc.entries ?? []) {
    for (const c of e.commits ?? []) {
      for (const t of c.matchAll(/<(\/?[a-zA-Z][a-zA-Z0-9]*)(?![a-zA-Z0-9])/g)) {
        const name = t[1].replace(/^\//, '').toLowerCase();
        if (!CHANGELOG_ALLOWED_TAGS.includes(name))
          problems.push(`changelog ${e.version}: commit contains raw <${t[1]}> — escape as <${name}> (entries are text, not UI)`);
      }
    }
  }
  return [...new Set(problems)];
}

/**
 * Why: the whole "is the changelog honest about the current version?" decision
 * as one pure function — verify.ts feeds it parsed entries plus the two
 * package.json versions (HEAD vs worktree) and a commit resolver; tests feed
 * it fixtures. Problems fail the build; warnings only inform.
 */
export function changelogProblems(args: {
  entries: ChangelogEntry[];
  /** package.json version as committed at HEAD; null when git is unavailable. */
  committedVersion: string | null;
  /** package.json version in the working tree. */
  worktreeVersion: string;
  resolveCommit: (hash: string) => CommitInfo;
}): { problems: string[]; warnings: string[] } {
  const { entries, committedVersion, worktreeVersion, resolveCommit } = args;
  const problems: string[] = [];
  const warnings: string[] = [];

  if (!committedVersion) {
    warnings.push('cannot read the committed package.json version (no git?) — changelog gate skipped');
    return { problems, warnings };
  }

  const current = entries.find((e) => e.version === committedVersion);
  if (!current) {
    problems.push(
      `v${committedVersion} is committed in package.json but changelog.json has no v${committedVersion} entry`,
    );
  } else {
    if (current.messages.length === 0) {
      problems.push(`changelog v${committedVersion} entry lists no commit messages`);
    }
    if (!current.hash) {
      // Once the version is committed the changelog commit hash IS available,
      // so the date-only escape hatch is legacy-only — new entries need it too.
      if (current.date) problems.push(`changelog v${committedVersion} entry has a date but no commit hash`);
    } else {
      const info = resolveCommit(current.hash);
      if (!info)
        problems.push(
          `changelog v${committedVersion} hash ${current.hash} does not resolve to a commit in this repository`,
        );
      else if (!info.touchesChangelog)
        problems.push(
          `changelog v${committedVersion} hash ${current.hash} points to a commit that does not touch changelog.json — it must be the commit that added the entry`,
        );
    }
  }

  for (const e of entries) {
    if (!e.date && !e.hash) problems.push(`changelog v${e.version} entry has neither a release date nor a commit hash`);
  }

  if (worktreeVersion !== committedVersion && !entries.some((e) => e.version === worktreeVersion)) {
    warnings.push(
      `package.json was bumped to v${worktreeVersion} (not yet committed) — its changelog entry must exist before that version gets committed`,
    );
  }

  return { problems, warnings };
}
