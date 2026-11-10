// -- whats-new-core.ts - which "What's new" marks a reader sees (pure) ------------------------------
// The pages carry, newest first, the releases of data/whats-new.json (<html data-whats-new>) and each sidebar link
// its page's marks ("0.9.14:created unreleased:updated"). This browser keeps { visited, baseline, seen }: the release
// it saw last, the one before that visit, and the pages opened since. A reader sees the marks of the releases newer
// than the baseline, minus the pages they opened: back after two releases, both are marked; on a first visit only the
// newest one (the baseline is the release before it). Bundled into js/head.js through whats-new.ts.
// VERIFIED: (tests/whats-new.test.ts) a first visit sees the newest release, a reader back after two releases sees both,
// an opened page loses its mark.

/** What this browser keeps (prefs.whatsNew). */
export interface WhatsNewSeen {
  /** the release the last visit showed */
  visited: string;
  /** the release before it: everything newer is news */
  baseline: string;
  /** the pages opened since (ids) */
  seen: string[];
}

/** at most this many opened pages are kept */
export const SEEN_LIMIT = 500;

/** The record after this visit: a first visit takes the release before the newest as its baseline; a visit to a
 *  newer release than the last one makes the last one the baseline and forgets the pages opened. */
export function visit(prev: WhatsNewSeen | null | undefined, versions: string[]): WhatsNewSeen {
  const current = versions[0] ?? '';
  if (!prev || !prev.visited) return { visited: current, baseline: versions[1] ?? '', seen: [] };
  if (prev.visited === current) return prev;
  return { visited: current, baseline: prev.visited, seen: [] };
}

/** The releases newer than the baseline - all the pages carry when the baseline is older than any of them. */
export function freshVersions(versions: string[], baseline: string): Set<string> {
  const i = baseline ? versions.indexOf(baseline) : -1;
  return new Set(i < 0 ? versions : versions.slice(0, i));
}

/** A page's mark for this reader - created wins over updated; null when opened already or in no fresh release. */
export function markOf(marks: string, fresh: Set<string>, seen: string[], id: string): 'created' | 'updated' | null {
  if (!marks || seen.includes(id)) return null;
  let out: 'updated' | null = null;
  for (const token of marks.split(/\s+/)) {
    const [version, kind] = token.split(':');
    if (!fresh.has(version)) continue;
    if (kind === 'created') return 'created';
    if (kind === 'updated') out = 'updated';
  }
  return out;
}

/** The record with a page opened. */
export const opened = (state: WhatsNewSeen, id: string): WhatsNewSeen =>
  state.seen.includes(id) ? state : { ...state, seen: [...state.seen, id].slice(-SEEN_LIMIT) };
