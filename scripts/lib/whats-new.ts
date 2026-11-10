// -- what's new: the pages each release created or changed (pure) -----------------------------------
// src/documentation/data/whats-new.json keeps, newest first, one entry per release: the sidebar pages it created
// and the ones it updated. The docs mark what a reader has not seen yet (runtime/whats-new.ts: the releases since
// their last visit, else the newest); the "What's new" dialog on the front page lists them. The entry of the work
// not released yet is derived from git - the files changed since the last release tag - so it cannot drift: build.ts
// writes it, verify's `what's new ↔ release diff` gate fails when it lags. Released entries are history and stay as
// written (the record starts with the work after v0.9.13; earlier releases were never tracked).
//
// A file belongs to a page when it is the page's .mdx, or a file of the component the page is named after (its
// skill, its sheet, its script, its schema, its parts file). A page that did not exist at the release is created,
// any other one updated. Pages listed nowhere (alpha) and files of no page (scripts, the shared layer) count for
// nothing: the record says which pages a reader should look at again.
// An updated page also names its examples (the ```html example fences, by label) that the release added or changed -
// the docs mark them on the page, list them at its top and link them from the changelog (#toc-<label>). An example
// is changed when its source differs beyond whitespace (a reformat changes nothing); a fence without a label, or one
// whose label is an expression, has no anchor and counts only for its page.
// VERIFIED: (tests/whats-new.test.ts) a component's files count for the page named after it, a page new since the tag
// is created, a component whose page is not listed counts for nothing, an example is created, changed or unchanged
// by its label and its source.

/** The examples of one page a release added and changed (their labels, in page order). */
export interface WhatsNewExamples {
  created: string[];
  updated: string[];
}

/** One release's pages. */
export interface WhatsNewRelease {
  /** its version ("0.9.14"), or "unreleased" for the work since the last release tag */
  version: string;
  /** page ids the release added */
  created: string[];
  /** page ids the release changed */
  updated: string[];
  /** per updated page (that has any): the examples it added and changed */
  examples?: Record<string, WhatsNewExamples>;
}

/** An example as the page holds it: its label and its source. */
export interface ExampleSource {
  label: string | null;
  body: string;
}

/** The examples a page added and changed since the release: a label new to the page is created, a label whose
 *  source differs beyond whitespace is updated. Labels that cannot be an anchor (none, or an expression) are left out. */
export function exampleChanges(before: readonly ExampleSource[], after: readonly ExampleSource[]): WhatsNewExamples {
  const flat = (s: string) => s.replace(/\s+/g, '');
  const anchored = (e: ExampleSource): e is ExampleSource & { label: string } => !!e.label && !e.label.includes('{');
  const old = new Map(before.filter(anchored).map((e) => [e.label, flat(e.body)]));
  const out: WhatsNewExamples = { created: [], updated: [] };
  for (const e of after.filter(anchored)) {
    if (!old.has(e.label)) out.created.push(e.label);
    else if (old.get(e.label) !== flat(e.body)) out.updated.push(e.label);
  }
  return out;
}

/** The whole record, newest first. */
export interface WhatsNewData {
  version: 1;
  releases: WhatsNewRelease[];
}

/** The key of the work no release tag holds yet. */
export const UNRELEASED = 'unreleased';

/** What the entry of the pending release is computed from. */
export interface ReleaseInput {
  /** repo-relative paths changed since the last release tag (added, modified, renamed, deleted, untracked) */
  changed: string[];
  /** every listed page id → its .mdx (repo-relative) */
  pages: Map<string, string>;
  /** the page ids that existed at the release (the .mdx file names then) */
  pagesBefore: Set<string>;
  /** every component name → its source folder (repo-relative, ending in "/") */
  components: Map<string, string>;
  /** a page's examples at the release and now - asked for the pages the release updates */
  examples?: (id: string) => { before: ExampleSource[]; after: ExampleSource[] };
}

/** The pages a set of changed files touches: created when the page is new since the release, else updated. */
export function releaseEntry(version: string, input: ReleaseInput): WhatsNewRelease {
  const byFile = new Map([...input.pages].map(([id, file]) => [file, id]));
  const touched = new Set<string>();
  for (const path of input.changed) {
    const id = byFile.get(path);
    if (id) {
      touched.add(id);
      continue;
    }
    for (const [name, dir] of input.components)
      if (path.startsWith(dir)) {
        if (input.pages.has(name)) touched.add(name);
        break;
      }
  }
  const created: string[] = [],
    updated: string[] = [];
  for (const id of [...touched].sort()) (input.pagesBefore.has(id) ? updated : created).push(id);
  const examples: Record<string, WhatsNewExamples> = {};
  for (const id of input.examples ? updated : []) {
    const { before, after } = input.examples!(id);
    const changes = exampleChanges(before, after);
    if (changes.created.length || changes.updated.length) examples[id] = changes;
  }
  return Object.keys(examples).length ? { version, created, updated, examples } : { version, created, updated };
}

/** The key the pending work goes under: the package version while it has no tag (a release under way), else
 *  "unreleased". */
export const pendingKey = (version: string, tagged: boolean): string => (tagged ? UNRELEASED : version);

/** The record with the pending release put first: a release under way replaces "unreleased"; an empty
 *  "unreleased" leaves the record. Released entries keep what they say. */
export function withRelease(data: WhatsNewData, entry: WhatsNewRelease): WhatsNewData {
  const rest = data.releases.filter((r) => r.version !== entry.version && r.version !== UNRELEASED);
  const empty = !entry.created.length && !entry.updated.length;
  return { version: 1, releases: empty && entry.version === UNRELEASED ? rest : [entry, ...rest] };
}

/** What differs between the record and the pending entry git gives - [] when the record is current. */
export function releaseProblems(data: WhatsNewData, entry: WhatsNewRelease): string[] {
  if (whatsNewText(withRelease(data, entry)) === whatsNewText(data)) return [];
  const have = data.releases.find((r) => r.version === entry.version);
  const empty = !entry.created.length && !entry.updated.length;
  const problems: string[] = [];
  if (!have && !empty)
    problems.push(`no entry "${entry.version}" - ${entry.created.length} page(s) created, ${entry.updated.length} updated since the last release`);
  if (have && empty && entry.version === UNRELEASED)
    problems.push(`"${UNRELEASED}" lists pages, but nothing changed since the last release`);
  if (have)
    for (const kind of ['created', 'updated'] as const) {
      const a = new Set(have[kind]),
        b = new Set(entry[kind]);
      const missing = [...b].filter((x) => !a.has(x)),
        extra = [...a].filter((x) => !b.has(x));
      if (missing.length) problems.push(`"${entry.version}" ${kind} lacks ${missing.join(', ')}`);
      if (extra.length) problems.push(`"${entry.version}" ${kind} lists ${extra.join(', ')}, which git does not show as ${kind}`);
    }
  if (have && JSON.stringify(have.examples ?? {}) !== JSON.stringify(entry.examples ?? {}))
    problems.push(`"${entry.version}" names other changed examples than the pages' sources since the last release`);
  if (!problems.length)
    problems.push(`the record is out of order (newest first) or still holds "${UNRELEASED}" while ${entry.version} is under way`);
  return problems;
}

/** The record as written: two-space JSON, a newline at the end. */
export const whatsNewText = (data: WhatsNewData): string => JSON.stringify(data, null, 2) + '\n';
