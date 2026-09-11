/**
 * Why: dead links are how documentation rots silently — GitHub renders the
 * files fine, the broken target never shows, and only a reader clicking it
 * finds out. This parses the markdown *sources* (README, skills, docs pages)
 * statically: every `[label](target)` outside fenced code must resolve to a
 * file, a heading anchor in the same document, or be an external URL.
 * `verify` feeds it the real tree (fs-backed `exists`); the unit tests feed
 * it synthetic docs. Escaped `\[x\](y)` link syntax is reported too — in MDX
 * it renders as literal text, so the "link" never works (shipped pages had
 * exactly this bug).
 */

/** One parsed markdown document. */
export interface MdDoc {
  /** display path (e.g. `README.md`) — used in problem messages and `exists` calls */
  name: string;
  /** raw markdown / MDX source */
  text: string;
}

/** URL schemes we never resolve on disk. */
const EXTERNAL = /^(https?:|mailto:|tel:|data:|javascript:)/i;
/** conventional demo placeholders that are not meant to resolve anywhere */
const PLACEHOLDER = new Set(['', '#', '...']);

/** `[text](url)` — group 1 = leading `\` (escaped ⇒ renders literally),
 * optional `!` covers images so their `src` is existence-checked too.
 * Group 3 captures the backslash in an escaped closer `\[x\](y)`, keeping
 * the reported label clean (`x`, not `x\`). */
const LINK = /(\\?)!?\[([^\][]*?)(\\?)\]\(([^)\s]*)\)/g;

/**
 * Why: sample markup inside ``` / ~~~ fences contains links, headings and
 * ids that are illustrative, not live content — strip whole fences before
 * parsing so they never count.
 */
export function withoutCodeFences(text: string): string {
  const out: string[] = [];
  let open: string | null = null;
  for (const line of text.split('\n')) {
    const fence = line.match(/^\s*(```|~~~)/);
    if (fence && !open) {
      open = fence[1];
      continue;
    }
    if (fence && fence[1] === open) {
      open = null;
      continue;
    }
    if (!open) out.push(line);
  }
  return out.join('\n');
}

/**
 * Why: `[Testing](#testing)` targets are GitHub-style heading slugs; anchors
 * must be derived the same way the platform derives them (lowercase, inline
 * markup stripped, punctuation dropped, spaces → hyphens).
 */
export function headingSlug(heading: string): string {
  // links contribute only their text; code spans/HTML keep their content
  // (GitHub escapes `<x>` to visible text, and the punctuation strip below
  // already drops the markup characters). Being slightly lenient (collapsing
  // hyphens) can only ever accept an anchor — never falsely reject one.
  return heading
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N} -]/gu, '')
    .replace(/ /g, '-')
    .replace(/-+/g, '-');
}

/** Heading slugs + literal `id="…"` anchors available outside code fences. */
function docAnchors(text: string): Set<string> {
  const prose = withoutCodeFences(text);
  const anchors = new Set<string>();
  for (const m of prose.matchAll(/^ {0,3}#{1,6}\s+(.+)$/gm)) anchors.add(headingSlug(m[1]));
  for (const m of prose.matchAll(/\sid="([^"]+)"/g)) anchors.add(m[1]);
  return anchors;
}

/**
 * Pure checker: for each doc, every non-external markdown link must resolve.
 * `exists(from, relPath)` answers whether `relPath` (relative to the doc's
 * own folder, `%xx`-decoded, without `#anchor`) exists — verify maps it onto
 * the real filesystem; tests use a fake. Ceiling (ponytail): anchors inside
 * *other* files (`other.md#section`) are only checked for the file itself;
 * same-file anchors are fully checked against headings/ids.
 */
export function markdownLinkProblems(
  docs: MdDoc[],
  exists: (from: string, relPath: string) => boolean,
): string[] {
  const problems: string[] = [];
  for (const doc of docs) {
    const prose = withoutCodeFences(doc.text);
    let anchors: Set<string> | null = null; // computed lazily, only when a #link appears
    for (const [, esc, label, _closerEsc, rawTarget] of prose.matchAll(LINK)) {
      if (esc) {
        problems.push(
          `${doc.name}: escaped link "\\[${label}\\](${rawTarget})" renders as literal text — link it for real (HTML <a href>, or <DocLink href> in .mdx)`,
        );
        continue;
      }
      if (EXTERNAL.test(rawTarget) || PLACEHOLDER.has(rawTarget)) continue;
      const target = decodeURIComponent(rawTarget);
      const hashAt = target.indexOf('#');
      const path = hashAt >= 0 ? target.slice(0, hashAt) : target;
      const anchor = hashAt >= 0 ? target.slice(hashAt + 1) : '';
      if (path) {
        if (!exists(doc.name, path)) problems.push(`${doc.name}: dead link (${target}) — ${path} not found`);
        // cross-file anchors: out of scope (see ceiling) — file presence is enough
      } else if (anchor) {
        anchors ??= docAnchors(doc.text);
        if (!anchors.has(anchor))
          problems.push(`${doc.name}: dead anchor #${anchor} — no heading with that slug in the file`);
      }
    }
  }
  return problems;
}
