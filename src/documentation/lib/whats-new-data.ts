import { readFileSync } from 'node:fs';
import { repoFile } from './repo';
import { tocId } from './toc-id';

/**
 * The "What's new" record at build time: data/whats-new.json (scripts/lib/whats-new.ts writes the pending
 * release from git) - which sidebar pages each release created or updated, newest first. The pages carry the
 * newest WHATS_NEW_RELEASES of it: the versions on <html data-whats-new> (DocPage), a page's marks on its sidebar
 * link (SiteNav) and the lists in the front page's dialog (WhatsNewDialog). runtime/whats-new.ts decides per
 * browser which marks show.
 * An updated page also names its examples (by label): the toc's ids link them (`<page>.html#toc-<label>`), the
 * whats-new-examples plugin marks their labels on the page.
 * VERIFIED: (documentation.e2e "What's new") <html data-whats-new> carries the record's newest versions.
 */
export interface WhatsNewRelease {
  /** its version, or "unreleased" */
  version: string;
  /** page ids it added */
  created: string[];
  /** page ids it changed */
  updated: string[];
  /** per updated page: the labels of the examples it added and changed */
  examples?: Record<string, { created: string[]; updated: string[] }>;
}

/** One example a release added or changed: its label, its kind and its address. */
export interface WhatsNewExample {
  label: string;
  kind: 'created' | 'updated';
  href: string;
}

/** the record's key for the work no release tag holds yet (scripts/lib/whats-new.ts UNRELEASED) */
export const UNRELEASED_KEY = 'unreleased';

/** how many releases the pages carry - a reader back after that many releases sees all of them marked */
export const WHATS_NEW_RELEASES = 6;

let cache: WhatsNewRelease[] | null = null;

/** every release of the record, newest first (the changelog lists them all) */
export function allWhatsNewReleases(): WhatsNewRelease[] {
  cache ??= (
    JSON.parse(readFileSync(repoFile('src', 'documentation', 'data', 'whats-new.json'), 'utf8')) as {
      releases: WhatsNewRelease[];
    }
  ).releases;
  return cache;
}

/** the releases the pages carry, newest first */
export const whatsNewReleases = (): WhatsNewRelease[] => allWhatsNewReleases().slice(0, WHATS_NEW_RELEASES);

/** the examples a release added and changed on a page, in page order, created first - each with its address */
export function whatsNewExamples(release: WhatsNewRelease, id: string): WhatsNewExample[] {
  const e = release.examples?.[id];
  if (!e) return [];
  const to = (kind: 'created' | 'updated') => (label: string) => ({ label, kind, href: `${id}.html#${tocId(label)}` });
  return [...e.created.map(to('created')), ...e.updated.map(to('updated'))];
}

/** an example label's marks on a page, newest first ("<version>:created|updated"), for every label the record names */
export function whatsNewExampleMarks(id: string): Map<string, string> {
  const marks = new Map<string, string[]>();
  for (const r of whatsNewReleases())
    for (const e of whatsNewExamples(r, id)) marks.set(e.label, [...(marks.get(e.label) ?? []), `${r.version}:${e.kind}`]);
  return new Map([...marks].map(([label, tokens]) => [label, tokens.join(' ')]));
}

/** a page's marks, newest first: "<version>:created" or "<version>:updated" per release that touched it ('' for none) */
export function whatsNewMarks(id: string): string {
  return whatsNewReleases()
    .flatMap((r) => (r.created.includes(id) ? [`${r.version}:created`] : r.updated.includes(id) ? [`${r.version}:updated`] : []))
    .join(' ');
}
