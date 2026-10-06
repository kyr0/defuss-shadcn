// -- Autocomplete ---------------------------------------------
// A text input that suggests as you type, from data of any size and any
// place: local records, a URL, or your own network client. Every request is
// a defuss-dataview request - { query, filters, sorters, page, pageSize } -
// so local records are filtered, sorted and paged by the same engine a server
// can run, results arrive page by page as the list scrolls (infinite), typing
// is debounced, and a newer query aborts the request still in flight
// (AbortController) - a stale answer never lands.
//
// APG combobox (list autocomplete, listbox popup): focus stays in the input,
// aria-activedescendant names the active option.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent, dataSource, safeShowPopover, textLocale } from '../../../shared/state-api.js';
import type { DataviewFilter, DataviewRow, DataviewSorter } from '../../../shared/dataview.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

// VERIFIED: (verify's component types ratchet - tsc -p tsconfig.components.json) every type
// this file's API docs state - arguments, return values, event details - holds
// against its code: a wrong one is a new type error and fails the build.

/** One request to the loader - a dataview request, one page of one query. */
interface AutocompleteRequest {
  /** the text typed */
  query: string;
  /** the configured filters, plus the query as a filter on the search field */
  filters: DataviewFilter[];
  /** the configured sort order */
  sorters: DataviewSorter[];
  /** the page asked for, 0-based (scrolling to the end of the list asks for the next) */
  page: number;
  /** records per page */
  pageSize: number;
}

/** A loader's answer: the records, or the records with paging facts (items / data / results are read as rows too). */
type AutocompleteAnswer = DataviewRow[] | { rows: DataviewRow[]; hasMore?: boolean; total?: number };

/** What configure() takes - every key optional; data attributes set the defaults. */
interface AutocompleteConfig {
  /** local records: a dataview source, filtered and sorted in the browser */
  rows?: DataviewRow[];
  /** a JSON endpoint the default client GETs with ?q=&page=&pageSize=&sort=, or a function building the URL per request */
  url?: string | ((request: AutocompleteRequest) => string);
  /** your own client: answers a request (abort with the signal when the next keystroke supersedes it) */
  load?: (request: AutocompleteRequest, options: { signal: AbortSignal }) => AutocompleteAnswer | Promise<AutocompleteAnswer>;
  /** the default client's fetch, extra headers and a parse step from the JSON to an answer */
  client?: { fetch?: typeof fetch; headers?: Record<string, string>; parse?: (json: unknown, request: AutocompleteRequest) => AutocompleteAnswer };
  /** the field the query matches (default: the label field) */
  searchField?: string;
  /** how the query matches: anywhere in the field, or at its start */
  match?: 'contains' | 'startsWith';
  /** the sort order of the results */
  sorters?: DataviewSorter[];
  /** filters every request carries */
  filters?: DataviewFilter[];
  /** records per page (default 20) */
  pageSize?: number;
  /** ms to wait after a keystroke before asking (default 200) */
  debounce?: number;
  /** characters before the first request (default 1) */
  minChars?: number;
  /** the field shown as the option text (default 'label') */
  labelField?: string;
  /** the field written to the hidden value input (default 'id') */
  valueField?: string;
  /** compute the option text instead of reading labelField */
  label?: (record: DataviewRow) => string;
  /** compute the value instead of reading valueField */
  value?: (record: DataviewRow) => unknown;
  /** fill an option element yourself (after the default label markup) */
  render?: (option: HTMLElement, record: DataviewRow, context: { query: string; index: number }) => void;
}

/** What autocomplete-request carries. */
interface AutocompleteRequestDetail {
  /** the request the loader receives next */
  request: AutocompleteRequest;
}

/** What autocomplete-select carries. */
interface AutocompleteSelectDetail {
  /** the record taken */
  record: DataviewRow;
  /** its value (valueField or value()) - also in the hidden value input */
  value: unknown;
  /** its label - now the input's text */
  label: string;
}

const autocompleteStates = ['default', 'open', 'loading', 'empty', 'error'];

/** setState() configs per state - merged into the stored one (a state change keeps the query and the choice). */
export interface AutocompleteStateConfigs {
  /** Closed, nothing in flight. */
  default: {
    /** the query: a string shows it in the input and searches for it; getState() reports the last one */
    query?: string;
    /** reported by getState(): the chosen suggestion's value, null before a choice */
    value?: unknown;
    /** reported by getState(): the chosen suggestion's label */
    label?: string;
  };
  /** The list shows suggestions - opening with nothing listed searches for what is typed. */
  open: {
    /** the query: a string shows it in the input and searches for it; getState() reports the last one */
    query?: string;
    /** reported by getState(): the chosen suggestion's value, null before a choice */
    value?: unknown;
    /** reported by getState(): the chosen suggestion's label */
    label?: string;
  };
  /** The first page is on its way: placeholder rows, aria-busy on the input. */
  loading: {
    /** the query: a string shows it in the input and searches for it; getState() reports the last one */
    query?: string;
    /** reported by getState(): the chosen suggestion's value, null before a choice */
    value?: unknown;
    /** reported by getState(): the chosen suggestion's label */
    label?: string;
  };
  /** The query matched nothing - the data-empty-text shows. */
  empty: {
    /** the query: a string shows it in the input and searches for it; getState() reports the last one */
    query?: string;
    /** reported by getState(): the chosen suggestion's value, null before a choice */
    value?: unknown;
    /** reported by getState(): the chosen suggestion's label */
    label?: string;
  };
  /** The source failed: its message and a Retry button. */
  error: {
    /** the message shown (default "Something went wrong.") */
    message?: string;
    /** the query: a string shows it in the input and searches for it; getState() reports the last one */
    query?: string;
    /** reported by getState(): the chosen suggestion's value, null before a choice */
    value?: unknown;
    /** reported by getState(): the chosen suggestion's label */
    label?: string;
  };
}
/** the states that show the popup */
const SHOWN = new Set(['open', 'loading', 'empty', 'error']);
let uid = 0;

const num = (v, fallback) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : fallback);

/** the parts of an instance (authored: input; the rest is found or made) */
const inputOf = (root) => dfDollar(root).find('.autocomplete-input').get(0);
const popoverOf = (root) => dfDollar(root).find('.autocomplete-popover').get(0);
const listOf = (root) => dfDollar(root).find('.autocomplete-list').get(0);

/**
 * The markup of a state, for render() AND the live element: data-state on
 * the root, aria-expanded / aria-busy on the input. The popup itself lives in
 * the top layer (a popover), not in an attribute.
 */
function applyMarkup(root, state) {
  dfDollar(root).attr('data-state', state.name);
  const input = inputOf(root);
  if (input) {
    dfDollar(input)
      .attr('aria-expanded', SHOWN.has(state.name) ? 'true' : 'false')
      .attr('aria-busy', state.name === 'loading' ? 'true' : null);
  }
}

// -- configuration ---------------------------------------------------------------

/**
 * The instance's config: attributes first (data-debounce, data-min-chars,
 * data-page-size, data-url, data-label-field, data-value-field,
 * data-search-field, data-sort="field:dir", data-match="contains|startsWith"),
 * then whatever configure() passed.
 */
function configOf(root) {
  const d = root.dataset;
  const [sortField, sortDir] = (d.sort || '').split(':');
  const base = {
    debounce: num(d.debounce, 200),
    minChars: num(d.minChars, 1),
    pageSize: num(d.pageSize, 20),
    url: d.url || null,
    labelField: d.labelField || 'label',
    valueField: d.valueField || 'id',
    searchField: d.searchField || null,
    match: d.match === 'startsWith' ? 'startsWith' : 'contains',
    sorters: sortField ? [{ field: sortField, direction: sortDir === 'desc' ? 'desc' : 'asc' }] : [],
    filters: [],
  };
  return { ...base, ...root._config };
}

const labelOf = (cfg, record) => (typeof cfg.label === 'function' ? cfg.label(record) : String(record?.[cfg.labelField] ?? ''));
const valueOf = (cfg, record) => (typeof cfg.value === 'function' ? cfg.value(record) : record?.[cfg.valueField]);

/** the dataview request for a query and a page */
function requestFor(cfg, query, page) {
  const field = cfg.searchField || cfg.labelField;
  return {
    query,
    filters: [...(cfg.filters || []), ...(query ? [{ field, op: cfg.match, value: query }] : [])],
    sorters: cfg.sorters || [],
    page,
    pageSize: cfg.pageSize,
  };
}

/** a loader's answer, whatever shape it came in: { rows, hasMore, total } */
function normalize(answer, request) {
  const raw = Array.isArray(answer) ? { rows: answer } : answer || {};
  const rows = raw.rows ?? raw.items ?? raw.data ?? raw.results ?? [];
  const total = Number.isFinite(raw.total) ? raw.total : undefined;
  const hasMore = typeof raw.hasMore === 'boolean'
    ? raw.hasMore
    : total !== undefined ? (request.page + 1) * request.pageSize < total : rows.length >= request.pageSize;
  return { rows, hasMore, total };
}

/**
 * The default network client: GET <url>?q=&page=&pageSize=&sort=field:dir
 * (or url(request) for your own URL), through client.fetch (default:
 * globalThis.fetch) with the AbortSignal, the JSON through client.parse.
 */
async function networkLoad(cfg, request, signal) {
  const client = cfg.client || {};
  let url;
  if (typeof cfg.url === 'function') url = cfg.url(request);
  else {
    const params = new URLSearchParams({ q: request.query, page: String(request.page), pageSize: String(request.pageSize) });
    if (request.sorters[0]) params.set('sort', `${request.sorters[0].field}:${request.sorters[0].direction || 'asc'}`);
    url = `${cfg.url}${String(cfg.url).includes('?') ? '&' : '?'}${params}`;
  }
  const doFetch = client.fetch || globalThis.fetch.bind(globalThis);
  const response = await doFetch(url, { signal, headers: { accept: 'application/json', ...client.headers } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText || 'request failed'}`.trim());
  const json = await response.json();
  return client.parse ? client.parse(json, request) : json;
}

/** local records: a dataview source - filtered and sorted once per query, paged by slicing */
function localLoad(root, cfg, request) {
  if (!root._source || root._source.rows !== cfg.rows) root._source = dataSource(cfg.rows, { idField: cfg.valueField });
  const entries = root._source.query({ filters: request.filters, sorters: request.sorters }).entries;
  const start = request.page * request.pageSize;
  return { rows: entries.slice(start, start + request.pageSize).map((e) => e.row), total: entries.length };
}

/** one request through the configured loader: load(), else rows, else the network */
function runLoad(root, cfg, request, signal) {
  if (typeof cfg.load === 'function') return cfg.load(request, { signal });
  if (Array.isArray(cfg.rows)) return localLoad(root, cfg, request);
  if (cfg.url) return networkLoad(cfg, request, signal);
  throw new Error('autocomplete: no data - configure rows, url or load');
}

// -- the popup ---------------------------------------------------------------------

/** the label with the query marked (text nodes only - never markup) */
function markMatch(el, label, query) {
  el.textContent = '';
  const at = query ? label.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (at < 0) {
    el.append(label);
    return;
  }
  const mark = document.createElement('mark');
  mark.className = 'autocomplete-match';
  mark.textContent = label.slice(at, at + query.length);
  el.append(label.slice(0, at), mark, label.slice(at + query.length));
}

/** append a page of records as options */
function appendOptions(root, rows) {
  const cfg = configOf(root);
  const list = listOf(root);
  const query = root._run.query;
  for (const record of rows) {
    const index = root._run.records.length;
    root._run.records.push(record);
    const option = document.createElement('div');
    option.className = 'autocomplete-option';
    option.setAttribute('role', 'option');
    option.id = `${root._uid}-opt-${index}`;
    option.dataset.index = String(index);
    option.setAttribute('aria-selected', 'false');
    if (cfg.render) cfg.render(option, record, { query, index });
    else {
      const label = document.createElement('span');
      label.className = 'autocomplete-label';
      markMatch(label, labelOf(cfg, record), query);
      option.append(label);
    }
    list.append(option);
  }
}

function setStatus(root, text) {
  const status = dfDollar(root).find('.autocomplete-status').get(0);
  if (status) status.textContent = text;
}

/** the counts line under the options */
function describe(root) {
  const run = root._run;
  const n = run.records.length;
  if (!n) return;
  const num = (v) => v.toLocaleString(textLocale(root)); // the text's locale, never the browser's
  const total = run.total !== undefined ? ` of ${num(run.total)}` : '';
  setStatus(root, run.loadingMore ? `${num(n)}${total} · loading more…` : `${num(n)}${total}${run.hasMore ? ' · scroll for more' : ''}`);
}

/** move the active option (keyboard / pointer), keep it in view */
function activate(root, index) {
  const run = root._run;
  const n = run.records.length;
  if (!n) return;
  run.active = Math.max(0, Math.min(n - 1, index));
  const input = inputOf(root);
  for (const option of dfDollar(listOf(root)).children('.autocomplete-option').toArray()) {
    const on = Number(option.dataset.index) === run.active;
    option.toggleAttribute('data-active', on);
    if (on) {
      input.setAttribute('aria-activedescendant', option.id);
      option.scrollIntoView({ block: 'nearest' });
    }
  }
  // the end of the list is near: the next page
  if (run.active >= n - 3) loadMore(root);
}

// -- searching -------------------------------------------------------------------------

/** cancel what is in flight (a newer query, a close) */
function abort(root) {
  root._controller?.abort();
  root._controller = null;
  clearTimeout(root._timer);
}

/**
 * Start a search for `query` (page 0): abort the previous request, show
 * 'loading', then 'open' / 'empty' / 'error' when THIS request answers (a
 * request a newer one replaced lands nowhere).
 */
async function search(root, query) {
  abort(root);
  const cfg = configOf(root);
  const input = inputOf(root);
  root._run = { query, records: [], page: 0, hasMore: false, total: undefined, active: -1, loadingMore: false, seq: (root._run?.seq || 0) + 1 };
  listOf(root).textContent = '';
  input.removeAttribute('aria-activedescendant');
  if (query.length < cfg.minChars) {
    autocompleteApi.setState(root, 'default');
    return;
  }
  setStatus(root, 'Searching…');
  autocompleteApi.setState(root, 'loading');
  await fetchPage(root, 0);
}

async function fetchPage(root, page) {
  const cfg = configOf(root);
  const run = root._run;
  const seq = run.seq;
  const controller = new AbortController();
  root._controller = controller;
  const request = requestFor(cfg, run.query, page);
  // Fires before every request (each page) - detail.request is the dataview request the loader receives.
  root.dispatchEvent(new CustomEvent<AutocompleteRequestDetail>('autocomplete-request', { bubbles: true, detail: { request } }));
  try {
    const answer = normalize(await runLoad(root, cfg, request, controller.signal), request);
    if (controller.signal.aborted || seq !== root._run.seq) return; // a newer query owns the list
    run.page = page;
    run.hasMore = answer.hasMore;
    run.total = answer.total;
    run.loadingMore = false;
    appendOptions(root, answer.rows);
    if (!run.records.length) {
      setStatus(root, '');
      autocompleteApi.setState(root, 'empty');
      return;
    }
    describe(root);
    if (root.store.value.name !== 'open') autocompleteApi.setState(root, 'open');
    if (run.active < 0) activate(root, 0);
    // a short first page may not fill the list - keep going until it does
    const list = listOf(root);
    if (run.hasMore && list.scrollHeight <= list.clientHeight) loadMore(root);
  } catch (error) {
    if (controller.signal.aborted || error?.name === 'AbortError' || seq !== root._run.seq) return;
    run.loadingMore = false;
    root._error = error;
    if (run.records.length) {
      // a later page failed: keep what is there, say so
      setStatus(root, `Could not load more - ${error?.message || error}`);
      return;
    }
    setStatus(root, '');
    autocompleteApi.setState(root, 'error', { message: String(error?.message || error) });
  } finally {
    if (root._controller === controller) root._controller = null;
  }
}

/** infinite: the next page, once at a time */
function loadMore(root) {
  const run = root._run;
  if (!run || !run.hasMore || run.loadingMore || root._controller) return;
  run.loadingMore = true;
  describe(root);
  fetchPage(root, run.page + 1);
}

/** take a record: the input shows its label, the value field (if any) its value */
function choose(root, index) {
  const record = root._run?.records[index];
  if (!record) return;
  const cfg = configOf(root);
  const label = labelOf(cfg, record);
  const value = valueOf(cfg, record);
  inputOf(root).value = label;
  const hidden = dfDollar(root).find('.autocomplete-value').get(0);
  if (hidden) hidden.value = value == null ? '' : String(value);
  abort(root);
  autocompleteApi.setState(root, 'default', { query: label, value: value ?? null, label });
  // Fires when a suggestion is taken - its record, value and label.
  root.dispatchEvent(new CustomEvent<AutocompleteSelectDetail>('autocomplete-select', { bubbles: true, detail: { record, value, label } }));
}

// -- State API ---------------------------------------------------------------------------

/**
 * UI side of setState: the states that show the popup open it (anchored to
 * the input), 'default' closes it. `{ query }` in a setState from outside
 * types that query (the search runs); `{ message }` is an error's text.
 */
function triggerStateChange(root, state, incoming) {
  const popover = popoverOf(root);
  applyMarkup(root, state);
  if (popover) {
    if (SHOWN.has(state.name)) {
      if (!popover.matches(':popover-open')) safeShowPopover(popover);
    } else if (popover.matches(':popover-open')) {
      try { popover.hidePopover(); } catch { /* already closed */ }
    }
  }
  if (state.name === 'default') {
    abort(root);
    inputOf(root)?.removeAttribute('aria-activedescendant');
  }
  if (state.name === 'error') setStatus(root, '');
  const message = dfDollar(root).find('.autocomplete-error-text').get(0);
  if (message) message.textContent = state.name === 'error' ? String(state.config.message || 'Something went wrong.') : '';
  // a query passed in from outside: show it and search for it
  // 'open' with nothing listed yet: the suggestions for what is typed
  const typed = inputOf(root)?.value.trim() ?? '';
  if (state.name === 'open' && incoming.query === undefined && !root._run?.records.length && typed) {
    queueMicrotask(() => search(root, typed));
  }
  if (typeof incoming.query === 'string' && SHOWN.has(state.name) && incoming.query !== root._run?.query) {
    inputOf(root).value = incoming.query;
    // after this state is recorded - the search moves on to 'loading' / 'open'
    queueMicrotask(() => search(root, incoming.query));
  }
}

export const autocompleteApi = componentState({
  component: 'autocomplete',
  states: autocompleteStates,
  // the config merges: a state change keeps the query and the chosen value
  mergeConfig: true,
  apply: (root, state, _previous, incoming) => triggerStateChange(root, state, incoming),
  markup: (el, state) => applyMarkup(el, state),
});

df$.autocompleteApi = autocompleteApi;
df$.autocompleteStates = autocompleteStates;

// -- df$.shadcn.autocomplete: the imperative surface ---------------------------------------

const resolve = (target) => (typeof target === 'string' ? dfDollar(target).get(0) : target);

df$.autocomplete = {
  /**
   * Bind data and behavior. Data (one of): rows (local records - a dataview
   * source), url (string or (request) => url; the default client GETs it
   * with ?q=&page=&pageSize=&sort=), load(request, { signal }) - your own
   * client, returning records or { rows, hasMore, total }. client: { fetch,
   * headers, parse(json, request) } customizes the default client. Query:
   * searchField, match ('contains' | 'startsWith'), sorters, filters,
   * pageSize, debounce (ms), minChars. Display: label / value (field names
   * or functions), render(option, record, { query, index }).
   * @param target - the .autocomplete element or its selector
   * @param config - data source, query and display options, merged into the current config
   */
  configure(target: string | HTMLElement, config: AutocompleteConfig = {}): void {
    const root = resolve(target);
    root._config = { ...root._config, ...config };
    if (config.labelField) root._config.labelField = config.labelField;
    root._source = null;
  },
  /**
   * Search for a query now (no debounce): the input shows it and the list loads.
   * @param target - the .autocomplete element or its selector
   * @param query - the text to search for
   * @returns settles when the first page has loaded (or the request failed)
   */
  search: (target: string | HTMLElement, query: string): Promise<void> => {
    const root = resolve(target);
    inputOf(root).value = query;
    return search(root, query);
  },
  /**
   * Close the popup and cancel what is in flight.
   * @param target - the .autocomplete element or its selector
   */
  close: (target: string | HTMLElement): void => { autocompleteApi.setState(resolve(target), 'default'); },
  /**
   * The records the list holds now.
   * @param target - the .autocomplete element or its selector
   * @returns a copy of the loaded records, every page so far, in list order
   */
  records: (target: string | HTMLElement): DataviewRow[] => [...(resolve(target)._run?.records ?? [])],
};

// -- init --------------------------------------------------------------------------------------

function init() {
  dfDollar('.autocomplete:not([data-init])').toArray().forEach((root) => {
    root.dataset.init = '';
    const input = inputOf(root);
    if (!input) return;
    root._uid = root.id || `autocomplete-${++uid}`;
    // the popup: authored, or made - a manual popover (focus stays in the input)
    let popover = popoverOf(root);
    if (!popover) {
      popover = document.createElement('div');
      popover.className = 'autocomplete-popover';
      dfDollar(root).append(popover);
    }
    popover.setAttribute('popover', 'manual');
    if (!popover.id) popover.id = `${root._uid}-popover`;
    let list = listOf(root);
    if (!list) {
      list = document.createElement('div');
      list.className = 'autocomplete-list';
      dfDollar(popover).append(list);
    }
    list.setAttribute('role', 'listbox');
    if (!list.id) list.id = `${root._uid}-list`;
    if (!list.hasAttribute('aria-label') && !list.hasAttribute('aria-labelledby')) list.setAttribute('aria-label', input.getAttribute('aria-label') || 'Suggestions');
    if (!dfDollar(popover).find('.autocomplete-status').get(0)) {
      const status = document.createElement('div');
      status.className = 'autocomplete-status';
      status.setAttribute('role', 'status');
      dfDollar(popover).append(status);
    }
    if (!dfDollar(popover).find('.autocomplete-error').get(0)) {
      const error = document.createElement('div');
      error.className = 'autocomplete-error';
      const text = document.createElement('span');
      text.className = 'autocomplete-error-text';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'autocomplete-retry';
      retry.textContent = 'Retry';
      error.append(text, retry);
      dfDollar(popover).append(error);
    }
    if (!dfDollar(popover).find('.autocomplete-empty').get(0)) {
      const empty = document.createElement('div');
      empty.className = 'autocomplete-empty';
      empty.textContent = root.dataset.emptyText || 'No matches.';
      dfDollar(popover).append(empty);
    }
    // the APG combobox wiring
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', list.id);
    input.setAttribute('autocomplete', 'off');
    if (!input.hasAttribute('aria-expanded')) input.setAttribute('aria-expanded', 'false');
    // anchored under the input (CSS anchor positioning)
    const anchor = `--autocomplete-${root._uid}`;
    input.style.anchorName = anchor;
    popover.style.positionAnchor = anchor;
    root._run = { query: '', records: [], page: 0, hasMore: false, active: -1, seq: 0 };
    // the closed state's markup, from the start (data-state, aria-expanded)
    applyMarkup(root, { name: 'default' });

    // typing: debounced search (a newer keystroke restarts the wait) - and
    // whatever is in flight is already stale: abort it now, not after the wait
    input.addEventListener('input', () => {
      abort(root);
      const query = input.value.trim();
      const hidden = dfDollar(root).find('.autocomplete-value').get(0);
      if (hidden) hidden.value = '';
      root._timer = setTimeout(() => search(root, query), configOf(root).debounce);
    });
    input.addEventListener('keydown', (e) => {
      const name = root.store.value.name;
      const run = root._run;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (name === 'default') search(root, input.value.trim());
          else activate(root, run.active + 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (name !== 'default') activate(root, run.active - 1);
          break;
        case 'PageDown':
          if (name !== 'default') { e.preventDefault(); activate(root, run.active + 10); }
          break;
        case 'PageUp':
          if (name !== 'default') { e.preventDefault(); activate(root, run.active - 10); }
          break;
        case 'Enter':
          if (name === 'open' && run.active >= 0) { e.preventDefault(); choose(root, run.active); }
          break;
        case 'Escape':
          // APG: Escape closes the popup; a second Escape clears the input
          if (name !== 'default') autocompleteApi.setState(root, 'default');
          else if (input.value) { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); }
          e.preventDefault();
          break;
        case 'Tab':
          if (name !== 'default') autocompleteApi.setState(root, 'default');
          break;
      }
    });
    // pointer: pressing an option takes it (pointerdown keeps the focus in the input)
    list.addEventListener('pointerdown', (e) => {
      const option = e.target.closest?.('.autocomplete-option');
      if (!option) return;
      e.preventDefault();
      choose(root, Number(option.dataset.index));
    });
    list.addEventListener('pointermove', (e) => {
      const option = e.target.closest?.('.autocomplete-option');
      if (option && Number(option.dataset.index) !== root._run.active) activate(root, Number(option.dataset.index));
    });
    // infinite: near the end of the list, the next page
    list.addEventListener('scroll', () => {
      if (list.scrollTop + list.clientHeight >= list.scrollHeight - 48) loadMore(root);
    }, { passive: true });
    popover.addEventListener('click', (e) => {
      if (e.target.closest?.('.autocomplete-retry')) search(root, root._run.query);
    });
    // leaving the widget closes it
    root.addEventListener('focusout', (e) => {
      if (e.relatedTarget && root.contains(e.relatedTarget)) return;
      if (root.store.value.name !== 'default') autocompleteApi.setState(root, 'default');
    });

    // el.store + el.api (AGENTS.md "State through stores")
    bindComponent(root, autocompleteApi, { name: 'default', config: { query: '', value: null, label: '' } });
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
