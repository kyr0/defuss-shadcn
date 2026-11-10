/**
 * The docs search, page side: starts the search worker (js/search/search-worker.js, runtime/search-worker.ts) and
 * renders its answers into the header's command palette (#docs-palette, lib/components/site-header.tsx).
 *
 * - The palette opens with the static list of every page and heading (js/search-index.js, layout.ts) and the
 *   Command component's own text filter. Once the worker's lexical index is ready, a typed query goes to the worker
 *   and its ranked hits replace that list: the palette switches to `data-filter="none"` (the component then leaves
 *   the items to the page and keeps groups, the empty state and the keys); an empty query or closing the palette
 *   puts the static list back.
 * - The worker starts when the page has loaded and the browser is idle, so the search never competes with the page's
 *   own requests; with the browser's data saver on, only the lexical lane starts - the status line offers the
 *   semantic one (the model download) instead.
 * - The status line names the lane that answers (keyword, or keyword + semantic), the download's progress and the
 *   language defuss-lid read in the query.
 * Everything goes through df$ (AGENTS.md "DOM through df$"); hits are written as escaped markup through .html().
 * VERIFIED: (tests/e2e/site/docs-search.e2e.ts) both lanes load after the load event without a keystroke, a second
 * visit requests only the manifest, and the data saver leaves the model to the status line's button.
 */
import type { LaneState, PageMessage, SearchHit, WorkerEvent } from './search-messages';

const $ = globalThis.df$;
const root = document.documentElement;
const docsRoot = new URL(root.getAttribute('data-docs-root') || '', location.href);
const dialog = $('#docs-palette').get(0) as HTMLDialogElement | undefined;
const list = $('#docs-palette-list').get(0) as HTMLElement | undefined;
const input = dialog ? ($(dialog).find('.command-input').get(0) as HTMLInputElement | undefined) : undefined;
const status = $('#docs-palette-status').get(0) as HTMLElement | undefined;

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const languageName = (tag: string): string => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(tag) ?? tag;
  } catch {
    return tag;
  }
};
const saveData = (): boolean => {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !!connection?.saveData;
};

let worker: Worker | undefined;
let lanes: { lexical: LaneState; semantic: LaneState } = { lexical: 'idle', semantic: 'idle' };
let asked = 0;
/** the static list's nodes while the worker's hits are shown */
let saved: Element[] | null = null;

/** the worker's hits in place of the static list */
function showHits(hits: SearchHit[]): void {
  if (!list || !dialog) return;
  if (!saved) {
    saved = $(list).children().toArray();
    $(saved).remove();
  }
  $(dialog).attr('data-filter', 'none');
  const items = hits
    .map(
      (hit) =>
        `<button class="command-item docs-hit" type="button" data-href="${esc(hit.id)}">` +
        `<span class="docs-hit-text"><span class="docs-hit-title">${esc(hit.title)}` +
        (hit.type ? ` <span class="type-badge" data-type="${esc(hit.type)}" title="${esc(hit.type)}">${esc(hit.type)}</span>` : '') +
        `</span>${hit.snippet ? `<span class="docs-hit-snippet">${esc(hit.snippet)}</span>` : ''}</span>` +
        `<span class="command-shortcut">${esc(hit.group)}</span></button>`,
    )
    .join('');
  $(list).html(hits.length ? `<div class="command-group" data-docs-results>${items}</div>` : '');
}

/** the static list back, the component's own filter on again */
function showStatic(): void {
  if (!list || !dialog) return;
  if (saved) {
    $(list).empty();
    $(list).append(saved);
    saved = null;
  }
  $(dialog).attr('data-filter', null);
  showLanguage(undefined);
}

function showLanguage(language: string | undefined): void {
  if (!status) return;
  const badge = $(status).find('[data-docs-search-language]');
  badge.text(language ? languageName(language) : '').attr('title', language ? `defuss-lid reads the query as ${languageName(language)}` : null);
  badge.prop('hidden', !language);
}

const PHASES: Record<string, string> = { documents: 'search index', tokens: 'token index', runtime: 'ONNX Runtime', model: 'model', index: 'index' };
function showStatus(event: Extract<WorkerEvent, { type: 'status' }>): void {
  // a lane that just became ready answers the typed query again (keyword first, then keyword + semantic); a
  // progress report changes no lane and asks nothing
  const changed = event.lexical !== lanes.lexical || event.semantic !== lanes.semantic;
  lanes = { lexical: event.lexical, semantic: event.semantic };
  if (!status) return;
  $(status).prop('hidden', false).attr('data-lexical', event.lexical).attr('data-semantic', event.semantic);
  const mode = $(status).find('.docs-search-mode');
  const bar = $(status).find('progress');
  const offer = $(status).find('[data-docs-search-semantic]');
  let text = '';
  let progress: number | undefined;
  if (event.lexical !== 'ready') text = event.lexical === 'error' ? 'Search index unavailable - filtering the page list' : 'Loading the search index...';
  else if (event.semantic === 'ready') text = 'Keyword + semantic search';
  else if (event.semantic === 'loading') {
    text = `Keyword search - loading semantic search (${PHASES[event.phase ?? ''] ?? 'starting'})`;
    if (event.total) progress = Math.round((100 * (event.loaded ?? 0)) / event.total);
  } else if (event.semantic === 'error') text = 'Keyword search - semantic search unavailable';
  else text = 'Keyword search';
  mode.text(text).attr('title', event.error ?? null);
  bar.prop('hidden', progress === undefined);
  if (progress !== undefined) bar.prop('value', progress);
  offer.prop('hidden', !(event.lexical === 'ready' && event.semantic === 'idle'));
  if (changed && event.lexical === 'ready' && input?.value.trim()) ask(input.value);
}

function onMessage({ data }: MessageEvent<WorkerEvent>): void {
  if (data.type === 'status') showStatus(data);
  else if (data.type === 'results') {
    // a late answer to an earlier query, or to a query already cleared, shows nothing
    if (data.id !== asked || !input?.value.trim()) return;
    showHits(data.hits);
    showLanguage(data.language);
  } else if (data.type === 'error' && status) $(status).find('.docs-search-mode').attr('title', data.message);
}

const send = (message: PageMessage): void => worker?.postMessage(message);
function start(semantic: boolean): void {
  if (worker || !dialog) return;
  worker = new Worker(new URL('js/search/search-worker.js', docsRoot), { type: 'module' });
  worker.addEventListener('message', onMessage);
  send({ type: 'start', manifest: new URL('search/manifest.json', docsRoot).href, semantic });
}

function ask(text: string): void {
  const query = text.trim();
  if (!query) return showStatic();
  if (lanes.lexical !== 'ready') return; // the component's text filter answers until then
  asked += 1;
  send({ type: 'search', id: asked, text: query });
}

if (dialog && list && input) {
  $(input).on('input', () => {
    start(!saveData());
    ask(input.value);
  });
  // the component clears the query on close; the static list returns with it
  $(dialog).on('close', () => {
    if (!dialog.open) showStatic();
  });
  if (status)
    $(status)
      .find('[data-docs-search-semantic]')
      .on('click', () => send({ type: 'semantic' }));
  // after the page's own requests: the load event, then an idle moment
  const idle = (): void => {
    const later = (globalThis as { requestIdleCallback?: (fn: () => void, options: { timeout: number }) => number }).requestIdleCallback;
    if (later) later(() => start(!saveData()), { timeout: 5000 });
    else setTimeout(() => start(!saveData()), 1500);
  };
  if (document.readyState === 'complete') idle();
  else addEventListener('load', idle, { once: true });
}
