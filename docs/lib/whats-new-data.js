import { readFileSync } from 'node:fs';
import { repoFile } from './repo';
import { tocId } from './toc-id';
/** the record's key for the work no release tag holds yet (scripts/lib/whats-new.ts UNRELEASED) */
export const UNRELEASED_KEY = 'unreleased';
/** how many releases the pages carry - a reader back after that many releases sees all of them marked */
export const WHATS_NEW_RELEASES = 6;
let cache = null;
/** every release of the record, newest first (the changelog lists them all) */
export function allWhatsNewReleases() {
    cache ??= JSON.parse(readFileSync(repoFile('src', 'documentation', 'data', 'whats-new.json'), 'utf8')).releases;
    return cache;
}
/** the releases the pages carry, newest first */
export const whatsNewReleases = () => allWhatsNewReleases().slice(0, WHATS_NEW_RELEASES);
/** the examples a release added and changed on a page, in page order, created first - each with its address */
export function whatsNewExamples(release, id) {
    const e = release.examples?.[id];
    if (!e)
        return [];
    const to = (kind) => (label) => ({ label, kind, href: `${id}.html#${tocId(label)}` });
    return [...e.created.map(to('created')), ...e.updated.map(to('updated'))];
}
/** an example label's marks on a page, newest first ("<version>:created|updated"), for every label the record names */
export function whatsNewExampleMarks(id) {
    const marks = new Map();
    for (const r of whatsNewReleases())
        for (const e of whatsNewExamples(r, id))
            marks.set(e.label, [...(marks.get(e.label) ?? []), `${r.version}:${e.kind}`]);
    return new Map([...marks].map(([label, tokens]) => [label, tokens.join(' ')]));
}
/** a page's marks, newest first: "<version>:created" or "<version>:updated" per release that touched it ('' for none) */
export function whatsNewMarks(id) {
    return whatsNewReleases()
        .flatMap((r) => (r.created.includes(id) ? [`${r.version}:created`] : r.updated.includes(id) ? [`${r.version}:updated`] : []))
        .join(' ');
}
//# sourceMappingURL=whats-new-data.js.map