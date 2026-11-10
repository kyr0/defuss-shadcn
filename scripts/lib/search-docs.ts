/**
 * The documents of the docs search (pure): what one rendered page contributes - the page itself and every section
 * its table of contents names (an h2, or an example card's label) - each as a lexical text and a short semantic one.
 *
 * Why two texts per document: the lexical index (BM25, built in the browser) reads the section's prose, capped,
 * while the ColBERT token index stores 64 bytes per token for every document and the browser downloads all of it.
 * VERIFIED: (2026-11-10, tmp/probe-colbert-node.mjs) a one-line page summary is about 25 tokens; the section's title
 * with its page's is about 10. The semantic text therefore carries what a reader would type a question about - the
 * names - and the lexical text the words of the page.
 *
 * The fs half (scripts/lib/search-docs-files.ts) parses the rendered pages and computes the fingerprint; build
 * (scripts/search-index.ts) and verify's `search index ↔ docs` gate read the documents through it, so both see the
 * same list.
 */
/** One searchable document: a page or one of its sections. */
export interface SearchDoc {
  /** the href from the docs root: `actions/button.html` or `actions/button.html#toc-sizes` */
  id: string;
  /** the page's or the section's title */
  title: string;
  /** a page: its sidebar section; a section: its page's title */
  group: string;
  /** the taxonomy type of a page (ATM, MOL ...), when it has one */
  type?: string;
  /** the words the lexical index reads (capped at TEXT_CHARS) */
  text: string;
  /** the short text ColBERT encodes */
  dense: string;
}

/** The page a document list is read from - its place in the sidebar. */
export interface SearchPage {
  /** the page from the docs root (`actions/button.html`) */
  rel: string;
  /** the sidebar label */
  title: string;
  /** the sidebar section */
  group: string;
  /** the taxonomy type, if any */
  type?: string;
}

/** characters of prose a document keeps for the lexical index */
export const TEXT_CHARS = 600;
/** words of the page summary in a page's semantic text */
export const DENSE_WORDS = 24;
/** the documents' format: a change of these rules is a change of every fingerprint */
export const SEARCH_DOCS_VERSION = 1;

/** sections that hold source listings, not prose: never searched */
const SKIP_SECTIONS = new Set(['toc-css', 'toc-javascript', 'toc-js']);
/** what a section's prose leaves out */
const NOT_PROSE = 'pre, script, style, template, .mockup-code, .code-example, .preview, nav, svg, button';

const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();
const cap = (s: string, n: number): string => (s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n) > n / 2 ? s.lastIndexOf(' ', n) : n));
const words = (s: string, n: number): string => s.split(' ').slice(0, n).join(' ');
/** a heading's own text: no § anchor, no type badge */
const headingText = (el: Element): string => {
  const copy = el.cloneNode(true) as Element;
  for (const x of Array.from(copy.querySelectorAll('.heading-anchor, .type-badge, .sidebar-dot'))) x.remove();
  return squash(copy.textContent ?? '');
};
/** an element's prose: its text without code, previews and controls */
const proseOf = (el: Element): string => {
  if (el.matches(NOT_PROSE)) return '';
  const copy = el.cloneNode(true) as Element;
  for (const x of Array.from(copy.querySelectorAll(NOT_PROSE + ', .heading-anchor'))) x.remove();
  return squash(copy.textContent ?? '');
};

/**
 * The documents of one rendered page: the page (its header's lead) first, then each section in the order of its
 * table of contents.
 * @param doc - the page's parsed document
 * @param page - the page's place in the sidebar
 * @returns the page's documents
 */
export function pageSearchDocs(doc: Document, page: SearchPage): SearchDoc[] {
  const main = doc.querySelector('main');
  if (!main) return [];
  const lead = squash(
    Array.from(main.querySelectorAll('.page-header > p:not(.text-sm)'))
      .map((p) => proseOf(p))
      .join(' '),
  );
  const description = squash(doc.querySelector('meta[name="description"]')?.getAttribute('content') ?? '');
  const summary = lead || description;
  const out: SearchDoc[] = [
    {
      id: page.rel,
      title: page.title,
      group: page.group,
      ...(page.type ? { type: page.type } : {}),
      text: cap(squash(`${summary} ${lead && description !== lead ? description : ''}`), TEXT_CHARS),
      dense: squash(`${page.title}. ${words(summary, DENSE_WORDS)}`),
    },
  ];
  const ids = Array.from(main.querySelectorAll('.page-toc-links a.toc-link[href^="#"]'))
    .map((a) => (a.getAttribute('href') ?? '').slice(1))
    .filter((id, i, all) => id && !SKIP_SECTIONS.has(id) && all.indexOf(id) === i);
  const targets = new Set(ids);
  /** whether an element is, or holds, the start of another section */
  const startsSection = (n: Element): boolean => targets.has(n.id) || ids.some((t) => !!n.querySelector(`[id="${t}"]`));
  for (const id of ids) {
    const el = main.querySelector(`[id="${id}"]`);
    if (!el) continue;
    const title = headingText(el);
    if (!title) continue;
    let text = '';
    const card = el.closest('.code-example');
    if (card) {
      // an example card: its label, then its hint
      const hint = el.nextElementSibling;
      text = hint && hint.matches('p') ? proseOf(hint) : '';
    } else {
      // a heading: the prose after it, up to the next section
      const parts: string[] = [];
      let n = el.nextElementSibling;
      while (n && !startsSection(n)) {
        parts.push(proseOf(n));
        if (parts.join(' ').length > TEXT_CHARS) break;
        n = n.nextElementSibling;
      }
      text = squash(parts.join(' '));
    }
    out.push({
      id: `${page.rel}#${id}`,
      title,
      group: page.title,
      text: cap(text, TEXT_CHARS),
      dense: squash(`${title} - ${page.title}`),
    });
  }
  return out;
}
