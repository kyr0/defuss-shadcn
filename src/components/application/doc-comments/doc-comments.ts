/* -- Document Comments ------------------------------------------------ */
/* A comment column beside a document: comments as Cards, each tied to a   */
/* span of the document's text (block id + exact text) that the runtime    */
/* wraps in a <mark>; the column scrolls on its own, a ButtonGroup walks   */
/* the comments up and down, Reply opens a composer under a card and the   */
/* answer becomes a child comment. A comment may quote another span of     */
/* the document - clicking the quote scrolls there and flashes it. The     */
/* model is one JSON document (version 1) authored in a <script> or loaded */
/* through df$.shadcn.docComments.load(); every change replaces it and    */
/* fires doc-comments-change. Bodies are Markdown (a small, escaped subset).*/
/* VERIFIED: (doc-comments.e2e) marks wrap the anchored text across inline */
/* elements, a mark click selects its card and a card its mark, prev/next, */
/* reply nesting, the quote flash, the change event, the render contract.  */

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const docCommentsStates = ['default', 'current'];

/** setState() configs per state. */
export interface DocCommentsStateConfigs {
  /** No comment selected: no card is current, no mark highlighted. */
  default: {};
  /** One comment is current: its card and its mark highlighted, both scrolled into view. */
  current: {
    /** the comment's id */
    id: string;
  };
}

/** A span of the document's text a comment anchors to or quotes. */
export interface DocCommentsSpan {
  /** the block's id: an element with data-id (an Editor.js block) or that id inside the document */
  block: string;
  /** the exact text inside that block */
  text: string;
  /** which occurrence of the text when it repeats (0 = the first) */
  occurrence?: number;
}

/** A quote inside a comment: another span of the document, with a note. */
export interface DocCommentsQuote extends DocCommentsSpan {
  /** what the quote says about that span (Markdown) */
  note?: string;
}

/** One comment of the model. */
export interface DocComment {
  /** unique id (the mark's data-comment) */
  id: string;
  /** the author's display name */
  author: string;
  /** when it was written (ISO 8601) */
  time?: string;
  /** the colour family: chart-1 ... chart-5 (severity, priority or author - the page decides) */
  color?: string;
  /** the span the comment is about; a reply inherits its parent's */
  anchor?: DocCommentsSpan;
  /** the comment text (Markdown: paragraphs, bold, italic, code, links) */
  body: string;
  /** other spans the comment refers to */
  quotes?: DocCommentsQuote[];
  /** the comment this one answers (a reply) */
  parent?: string;
}

/** The model: version 1, the comments in authoring order. */
export interface DocCommentsData {
  /** the format version (1) */
  version: 1;
  /** the comments */
  comments: DocComment[];
}

/** What doc-comments-change carries. */
export interface DocCommentsChangeDetail {
  /** how many comments the model holds now */
  comments: number;
  /** the comment that was added, when one was */
  id?: string;
}

/** What doc-comments-select carries. */
export interface DocCommentsSelectDetail {
  /** the comment that became current */
  id: string;
  /** what selected it: its mark, its card, the prev / next buttons or the API */
  source: 'mark' | 'card' | 'nav' | 'api';
}

/** What doc-comments-flash carries. */
export interface DocCommentsFlashDetail {
  /** the quoted block */
  block: string;
  /** the quoted text */
  text: string;
  /** whether the span was found in the document */
  found: boolean;
}

/** per-element runtime: the model + the document root */
interface DocCommentsRuntime {
  data: DocCommentsData;
}

const FLASH_MS = 1600;
const ICONS = {
  up: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>',
  down: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  reply: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>',
  quote: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/></svg>',
};

const esc = (s: string): string => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

/** the Markdown subset a comment body takes: paragraphs, **bold**, *italic*, `code`, [text](https://…) - escaped first */
function renderMarkdown(md: string): string {
  const inline = (t: string) => esc(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g, '<br>');
  return md.trim().split(/\n\s*\n/).map((p) => `<p>${inline(p.trim())}</p>`).join('');
}

const initials = (name: string): string => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');

/** a short, locale-aware time: today's time, else the date */
function formatTime(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const sameDay = d.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat(undefined, sameDay ? { hour: 'numeric', minute: '2-digit' } : { month: 'short', day: 'numeric' }).format(d);
}

/** the document the column comments on: data-for names an element; without it, the previous sibling */
function documentOf(el: HTMLElement): HTMLElement | null {
  const id = dfDollar(el).attr('data-for');
  return id ? dfDollar<HTMLElement>('#' + CSS.escape(id)).get(0) ?? null : el.previousElementSibling as HTMLElement | null;
}

/** the block element a span names: [data-id], else #id inside the document, else the document */
function blockOf(root: HTMLElement, id: string): HTMLElement | null {
  return dfDollar(root).find<HTMLElement>(`[data-id="${CSS.escape(id)}"]`).get(0) ?? dfDollar(root).find<HTMLElement>('#' + CSS.escape(id)).get(0) ?? (root.id === id ? root : null);
}

/** the Range of the n-th occurrence of `text` in a block's text nodes (marks excluded from nothing: text is text) */
function findRange(block: HTMLElement, text: string, occurrence = 0): Range | null {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let all = '';
  let n: Text | null;
  while ((n = walker.nextNode() as Text | null)) { nodes.push(n); all += n.data; }
  let from = 0;
  let at = -1;
  for (let i = 0; i <= occurrence; i++) {
    at = all.indexOf(text, from);
    if (at < 0) return null;
    from = at + 1;
  }
  const range = document.createRange();
  let offset = 0;
  let started = false;
  for (const node of nodes) {
    const end = offset + node.data.length;
    if (!started && at < end) { range.setStart(node, at - offset); started = true; }
    if (started && at + text.length <= end) { range.setEnd(node, at + text.length - offset); return range; }
    offset = end;
  }
  return null;
}

/** wrap every text node of a range in its own element (a span may cross inline elements) */
function wrapRange(range: Range, make: () => HTMLElement): HTMLElement[] {
  const marks: HTMLElement[] = [];
  const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let n: Text | null;
  if (range.commonAncestorContainer.nodeType === Node.TEXT_NODE) nodes.push(range.commonAncestorContainer as Text);
  while ((n = walker.nextNode() as Text | null)) if (range.intersectsNode(n)) nodes.push(n);
  // the boundaries BEFORE splitting: a live Range moves its points into the new node a splitText creates
  const { startContainer, startOffset, endContainer, endOffset } = range;
  for (const node of nodes) {
    let target = node;
    let endCut = node === endContainer ? endOffset : -1;
    if (node === startContainer && startOffset > 0) {
      target = node.splitText(startOffset);
      if (endCut >= 0) endCut -= startOffset;
    }
    if (endCut >= 0 && endCut < target.data.length) target.splitText(endCut);
    if (!target.data) continue;
    const mark = make();
    target.before(mark);
    mark.append(target);
    marks.push(mark);
  }
  return marks;
}

/** remove a wrapper, keeping its text */
function unwrap(mark: HTMLElement): void {
  const parent = mark.parentNode;
  if (!parent) return;
  while (mark.firstChild) dfDollar(mark).before(mark.firstChild);
  mark.remove();
  parent.normalize();
}

/** the anchor a comment resolves to: its own, else its parent's */
function anchorOf(data: DocCommentsData, c: DocComment): DocCommentsSpan | undefined {
  let cur: DocComment | undefined = c;
  const seen = new Set<string>();
  while (cur && !cur.anchor && cur.parent && !seen.has(cur.id)) { seen.add(cur.id); cur = data.comments.find((x) => x.id === cur!.parent); }
  return cur?.anchor;
}

/** (re)wrap the marks of every top-level comment whose mark is missing - the caret stays where it is */
function placeMarks(el: HTMLElement): void {
  const root = documentOf(el);
  const data = runtimeOf(el).data;
  if (!root) return;
  for (const c of data.comments) {
    if (c.parent) continue;
    const anchor = anchorOf(data, c);
    if (!anchor || dfDollar(root).find(`mark.doc-comments-mark[data-comment="${CSS.escape(c.id)}"]`).length) continue;
    const block = blockOf(root, anchor.block);
    const range = block && findRange(block, anchor.text, anchor.occurrence ?? 0);
    if (!range) continue;
    wrapRange(range, () => {
      const m = document.createElement('mark');
      m.className = 'doc-comments-mark';
      m.dataset.comment = c.id;
      if (c.color) m.dataset.color = c.color;
      m.title = `Comment by ${c.author}`;
      return m;
    });
  }
}

/** remove every mark this column placed */
function clearMarks(el: HTMLElement): void {
  const root = documentOf(el);
  if (!root) return;
  dfDollar(root).find<HTMLElement>('mark.doc-comments-mark, mark.doc-comments-flash').each((_i, m) => unwrap(m));
}

const runtimeOf = (el: HTMLElement): DocCommentsRuntime => {
  if (!el._comments) el._comments = { data: { version: 1, comments: [] } } satisfies DocCommentsRuntime;
  return el._comments as DocCommentsRuntime;
};

/** the comments in reading order: top-level by their mark's position in the document, replies under their parent by time */
function ordered(el: HTMLElement): DocComment[] {
  const data = runtimeOf(el).data;
  const root = documentOf(el);
  const tops = data.comments.filter((c) => !c.parent || !data.comments.some((p) => p.id === c.parent));
  const markOf = (c: DocComment) => (root ? dfDollar(root).find<HTMLElement>(`mark.doc-comments-mark[data-comment="${CSS.escape(c.id)}"]`).get(0) : undefined);
  tops.sort((a, b) => {
    const ma = markOf(a), mb = markOf(b);
    if (!ma || !mb) return ma ? -1 : mb ? 1 : 0;
    return ma.compareDocumentPosition(mb) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });
  return tops;
}

const cardMarkup = (data: DocCommentsData, c: DocComment, depth: number): string => {
  const anchor = anchorOf(data, c);
  const replies = data.comments.filter((r) => r.parent === c.id).sort((a, b) => String(a.time ?? '').localeCompare(String(b.time ?? '')));
  const color = c.color ? ` data-color="${esc(c.color)}"` : '';
  return `<li class="card doc-comments-card" data-id="${esc(c.id)}"${color} data-depth="${depth}">
  <div class="card-header doc-comments-card-header">
    <span class="avatar" data-size="sm"><span class="avatar-fallback">${esc(initials(c.author))}</span></span>
    <div class="doc-comments-meta"><strong class="doc-comments-author">${esc(c.author)}</strong>${c.time ? ` <time class="doc-comments-time" datetime="${esc(c.time)}">${esc(formatTime(c.time))}</time>` : ''}</div>
  </div>
  ${depth === 0 && anchor ? `<button class="doc-comments-anchor" type="button" data-doc-comments-action="go" title="Scroll to the text">${esc(anchor.text)}</button>` : ''}
  <div class="card-content doc-comments-body">${renderMarkdown(c.body)}</div>
  ${(c.quotes ?? []).map((q, i) => `<button class="doc-comments-quote" type="button" data-doc-comments-action="flash" data-quote="${i}" title="Scroll to the quoted text">${ICONS.quote}<q>${esc(q.text)}</q>${q.note ? `<span class="doc-comments-quote-note">${renderMarkdown(q.note)}</span>` : ''}</button>`).join('')}
  <div class="card-footer doc-comments-actions">
    <button class="btn" data-variant="ghost" data-size="sm" type="button" data-doc-comments-action="reply" aria-expanded="false">${ICONS.reply} Reply</button>
  </div>
  <form class="textarea-group doc-comments-reply" hidden aria-label="Reply">
    <textarea class="textarea" data-rows="2" data-max-rows="6" aria-label="Your reply" placeholder="Reply..."></textarea>
    <div class="textarea-group-actions">
      <span class="textarea-group-spacer"></span>
      <button class="btn" data-variant="ghost" data-size="sm" type="button" data-doc-comments-action="cancel">Cancel</button>
      <button class="btn" data-size="sm" type="submit">Reply</button>
    </div>
  </form>
  ${replies.length ? `<ol class="doc-comments-replies">${replies.map((r) => cardMarkup(data, r, depth + 1)).join('')}</ol>` : ''}
</li>`;
};

/** render the column from the model (head + list); marks are placed separately */
function renderColumn(el: HTMLElement): void {
  const data = runtimeOf(el).data;
  const tops = ordered(el);
  const head = `<div class="doc-comments-head">
  <span class="doc-comments-title">Comments <span class="badge" data-variant="secondary" data-count>${data.comments.length}</span></span>
  <div class="btn-group" role="group" aria-label="Go to comment">
    <button class="btn" data-variant="outline" data-size="icon-sm" type="button" data-doc-comments-action="prev" aria-label="Previous comment">${ICONS.up}</button>
    <button class="btn" data-variant="outline" data-size="icon-sm" type="button" data-doc-comments-action="next" aria-label="Next comment">${ICONS.down}</button>
  </div>
</div>
<ol class="doc-comments-list">${tops.map((c) => cardMarkup(data, c, 0)).join('')}</ol>
${data.comments.length ? '' : '<p class="doc-comments-empty">No comments yet.</p>'}`;
  const keep = dfDollar(el).children('script.doc-comments-source').get(0);
  dfDollar(el).html(head);
  if (keep) el.prepend(keep); // the authored source stays first (a node, not markup)
  const current = dfDollar(el).attr('data-current');
  if (current) markCurrent(el, current);
}

/** the markup of a state: data-current on the column; the live cards and marks follow */
function applyMarkup(el: HTMLElement, name: string, config: Record<string, unknown>): void {
  dfDollar(el).attr('data-current', name === 'current' && config.id ? String(config.id) : null);
}

function markCurrent(el: HTMLElement, id: string | null): void {
  dfDollar(el).find<HTMLElement>('.doc-comments-card[aria-current]').each((_i, c) => dfDollar(c).attr('aria-current', null));
  const root = documentOf(el);
  if (root) dfDollar(root).find<HTMLElement>('mark.doc-comments-mark[data-current]').each((_i, m) => dfDollar(m).attr('data-current', null));
  if (!id) return;
  dfDollar(el).find<HTMLElement>(`.doc-comments-card[data-id="${CSS.escape(id)}"]`).each((_i, c) => dfDollar(c).attr('aria-current', 'true'));
  if (root) dfDollar(root).find<HTMLElement>(`mark.doc-comments-mark[data-comment="${CSS.escape(id)}"]`).each((_i, m) => dfDollar(m).attr('data-current', ''));
}

const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const scrollTo = (node: HTMLElement | undefined, block: ScrollLogicalPosition) => node?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block, inline: 'nearest' });

/** The DOM side of a state: the column's markup, the current card and mark, both scrolled into view. */
function triggerStateChange(el: HTMLElement, stateName: string, config: Record<string, unknown>): void {
  applyMarkup(el, stateName, config);
  const id = stateName === 'current' ? String(config.id ?? '') : null;
  markCurrent(el, id);
  if (id) {
    scrollTo(dfDollar(el).find<HTMLElement>(`.doc-comments-card[data-id="${CSS.escape(id)}"]`).get(0), 'nearest');
    const root = documentOf(el);
    if (root) scrollTo(dfDollar(root).find<HTMLElement>(`mark.doc-comments-mark[data-comment="${CSS.escape(id)}"]`).get(0), 'center');
  }
}

/** Registry-level API; pass the element explicitly. Unknown names throw. */
export const docCommentsApi = componentState({
  component: 'doc-comments',
  states: docCommentsStates,
  apply: (el, state) => triggerStateChange(el, state.name, state.config),
  read: (el) => {
    const id = dfDollar(el).attr('data-current');
    return id ? { name: 'current', config: { id } } : { name: 'default', config: {} };
  },
  markup: (el, state) => applyMarkup(el, state.name, state.config),
});

df$.docCommentsApi = docCommentsApi;
df$.docCommentsStates = docCommentsStates;

function emitChange(el: HTMLElement, id?: string): void {
  // Fires after the model changed (load, add, reply) - how many comments it holds, and the added one's id.
  el.dispatchEvent(new CustomEvent<DocCommentsChangeDetail>('doc-comments-change', { bubbles: true, detail: { comments: runtimeOf(el).data.comments.length, id } }));
}

function select(el: HTMLElement, id: string, source: DocCommentsSelectDetail['source']): boolean {
  if (!runtimeOf(el).data.comments.some((c) => c.id === id)) return false;
  el.api?.setState('current', { id });
  // Fires when a comment becomes current - from its mark, its card, the prev / next buttons or the API.
  el.dispatchEvent(new CustomEvent<DocCommentsSelectDetail>('doc-comments-select', { bubbles: true, detail: { id, source } }));
  return true;
}

/** the cards in column order (top-level, then replies, as rendered) */
const cardIds = (el: HTMLElement): string[] => dfDollar(el).find<HTMLElement>('.doc-comments-card').toArray().map((c) => c.dataset.id ?? '');

function step(el: HTMLElement, dir: 1 | -1, source: DocCommentsSelectDetail['source']): string | null {
  const ids = cardIds(el);
  if (!ids.length) return null;
  const cur = dfDollar(el).attr('data-current');
  const at = cur ? ids.indexOf(cur) : -1;
  const next = at < 0 ? (dir > 0 ? 0 : ids.length - 1) : (at + dir + ids.length) % ids.length;
  select(el, ids[next]!, source);
  return ids[next]!;
}

/** scroll to a quoted span and flash it for a moment */
function flash(el: HTMLElement, quote: DocCommentsSpan): boolean {
  const root = documentOf(el);
  const block = root && blockOf(root, quote.block);
  const range = block && findRange(block, quote.text, quote.occurrence ?? 0);
  const found = !!range;
  if (range) {
    const marks = wrapRange(range, () => { const m = document.createElement('mark'); m.className = 'doc-comments-flash'; return m; });
    scrollTo(marks[0], 'center');
    setTimeout(() => marks.forEach(unwrap), FLASH_MS);
  }
  // Fires when a quote is followed - the span it names and whether the document still holds it.
  el.dispatchEvent(new CustomEvent<DocCommentsFlashDetail>('doc-comments-flash', { bubbles: true, detail: { block: quote.block, text: quote.text, found } }));
  return found;
}

function addComment(el: HTMLElement, comment: Partial<DocComment>): string | null {
  const data = runtimeOf(el).data;
  if (!comment.body || !comment.body.trim()) return null;
  if (comment.parent && !data.comments.some((c) => c.id === comment.parent)) return null;
  if (!comment.parent && !comment.anchor) return null;
  let id = comment.id || `c${data.comments.length + 1}`;
  while (data.comments.some((c) => c.id === id)) id = `${id}-${Math.random().toString(36).slice(2, 6)}`;
  const parent = comment.parent ? data.comments.find((c) => c.id === comment.parent) : undefined;
  const full: DocComment = { ...comment, id, author: comment.author || dfDollar(el).attr('data-author') || 'You', time: comment.time ?? new Date().toISOString(), body: comment.body.trim(), color: comment.color ?? parent?.color };
  runtimeOf(el).data = { version: 1, comments: [...data.comments, full] };
  placeMarks(el);
  renderColumn(el);
  emitChange(el, id);
  return id;
}

function load(el: HTMLElement, data: DocCommentsData): void {
  clearMarks(el);
  const comments = Array.isArray(data?.comments) ? data.comments.filter((c) => c && typeof c.id === 'string' && typeof c.body === 'string').map((c) => ({ ...c, author: c.author || 'Anonymous' })) : [];
  runtimeOf(el).data = { version: 1, comments };
  placeMarks(el);
  renderColumn(el);
  emitChange(el);
}

function sourceOf(el: HTMLElement): DocCommentsData | null {
  const text = dfDollar(el).children<HTMLScriptElement>('script.doc-comments-source').get(0)?.textContent ?? '';
  if (!text.trim()) return null;
  try { return JSON.parse(text) as DocCommentsData; } catch { return null; }
}

function onAction(el: HTMLElement, button: HTMLElement): void {
  const action = button.dataset.docCommentsAction;
  const card = button.closest<HTMLElement>('.doc-comments-card');
  const id = card?.dataset.id ?? '';
  if (action === 'prev') step(el, -1, 'nav');
  else if (action === 'next') step(el, 1, 'nav');
  else if (action === 'go' && id) select(el, id, 'card');
  else if (action === 'flash' && card) {
    const c = runtimeOf(el).data.comments.find((x) => x.id === id);
    const q = c?.quotes?.[Number(button.dataset.quote)];
    if (q) flash(el, q);
  } else if (action === 'reply' && card) {
    const form = dfDollar(card).children<HTMLFormElement>('form.doc-comments-reply').get(0);
    if (!form) return;
    const open = form.hidden;
    form.hidden = !open;
    dfDollar(button).attr('aria-expanded', String(open));
    if (open) dfDollar(form).find<HTMLTextAreaElement>('textarea').get(0)?.focus();
  } else if (action === 'cancel' && card) {
    const form = dfDollar(card).children<HTMLFormElement>('form.doc-comments-reply').get(0);
    if (form) { form.hidden = true; form.reset(); }
    dfDollar(card).find<HTMLElement>('[data-doc-comments-action="reply"]').first().attr('aria-expanded', 'false');
  }
}

function init() {
  dfDollar('.doc-comments:not([data-init])').toArray().forEach((el: HTMLElement) => {
    el.dataset.init = '';
    // el.store + el.api (AGENTS.md "State through stores")
    bindComponent(el, docCommentsApi);
    const source = sourceOf(el);
    runtimeOf(el).data = source ? { version: 1, comments: source.comments ?? [] } : { version: 1, comments: [] };
    placeMarks(el);
    renderColumn(el);
    dfDollar(el).on('click', (e: Event) => {
      const button = (e.target as HTMLElement).closest<HTMLElement>('[data-doc-comments-action]');
      if (button && el.contains(button)) onAction(el, button);
    });
    dfDollar(el).on('submit', (e: Event) => {
      const form = (e.target as HTMLElement).closest<HTMLFormElement>('form.doc-comments-reply');
      if (!form) return;
      e.preventDefault();
      const card = form.closest<HTMLElement>('.doc-comments-card');
      const body = dfDollar(form).find<HTMLTextAreaElement>('textarea').get(0)?.value ?? '';
      if (card && body.trim()) addComment(el, { parent: card.dataset.id, body });
    });
    const root = documentOf(el);
    if (root) {
      dfDollar(root).on('click', (e: Event) => {
        const mark = (e.target as HTMLElement).closest<HTMLElement>('mark.doc-comments-mark');
        if (mark?.dataset.comment) select(el, mark.dataset.comment, 'mark');
      });
      // an Editor.js document mounts its blocks later; a change may have re-rendered a block (its mark gone)
      dfDollar(root).on('editorjs-ready', () => { placeMarks(el); renderColumn(el); });
      dfDollar(root).on('editorjs-change', () => placeMarks(el));
    }
  });
}

const resolve = (target: string | HTMLElement): HTMLElement | undefined => (typeof target === 'string' ? dfDollar(target).get(0) : target);

df$.docComments = {
  /**
   * Replace the model: the column re-renders, the marks are placed again.
   * @param target - the .doc-comments element or its selector
   * @param data - the comments document (version 1)
   */
  load: (target: string | HTMLElement, data: DocCommentsData): void => { const el = resolve(target); if (el) load(el, data); },
  /**
   * The current model - comments as authored and added, with their anchors and quotes.
   * @param target - the .doc-comments element or its selector
   * @returns the comments document (version 1); empty when the element is unknown
   */
  data: (target: string | HTMLElement): DocCommentsData => { const el = resolve(target); return el ? structuredClone(runtimeOf(el).data) : { version: 1, comments: [] }; },
  /**
   * Add a comment: an anchor (a span of the document) for a new thread, or a parent for a reply. The id is generated when missing.
   * @param target - the .doc-comments element or its selector
   * @param comment - the comment; body required, plus anchor or parent
   * @returns the new comment's id, or null when it was refused (no body, no anchor and no parent, unknown parent)
   */
  add: (target: string | HTMLElement, comment: Partial<DocComment>): string | null => { const el = resolve(target); return el ? addComment(el, comment) : null; },
  /**
   * Answer a comment - what the Reply composer sends.
   * @param target - the .doc-comments element or its selector
   * @param parentId - the comment to answer
   * @param body - the reply (Markdown)
   * @param author - the author; default: the column's data-author, else "You"
   * @returns the reply's id, or null when refused
   */
  reply: (target: string | HTMLElement, parentId: string, body: string, author?: string): string | null => { const el = resolve(target); return el ? addComment(el, { parent: parentId, body, author }) : null; },
  /**
   * Make a comment current: its card and its mark highlighted and scrolled into view (the current state).
   * @param target - the .doc-comments element or its selector
   * @param id - the comment's id
   * @returns true when the comment exists
   */
  go: (target: string | HTMLElement, id: string): boolean => { const el = resolve(target); return el ? select(el, id, 'api') : false; },
  /**
   * The next comment down the column (wrapping) - the ↓ button.
   * @param target - the .doc-comments element or its selector
   * @returns the id that became current, or null without comments
   */
  next: (target: string | HTMLElement): string | null => { const el = resolve(target); return el ? step(el, 1, 'api') : null; },
  /**
   * The previous comment up the column (wrapping) - the ↑ button.
   * @param target - the .doc-comments element or its selector
   * @returns the id that became current, or null without comments
   */
  prev: (target: string | HTMLElement): string | null => { const el = resolve(target); return el ? step(el, -1, 'api') : null; },
  /**
   * Scroll to a span of the document and flash it for a moment - what clicking a quote does.
   * @param target - the .doc-comments element or its selector
   * @param quote - the span: block id + exact text (+ occurrence)
   * @returns true when the span was found
   */
  flash: (target: string | HTMLElement, quote: DocCommentsSpan): boolean => { const el = resolve(target); return el ? flash(el, quote) : false; },
  /**
   * Place the marks again (after the document was re-rendered) and re-render the column.
   * @param target - the .doc-comments element or its selector
   */
  refresh: (target: string | HTMLElement): void => { const el = resolve(target); if (el) { placeMarks(el); renderColumn(el); } },
};

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
