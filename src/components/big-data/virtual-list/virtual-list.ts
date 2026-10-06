// -- Virtual List ---------------------------------------------
// Windowed list: only the rows on screen exist in the DOM, and their elements
// are recycled as you scroll, so a list of ten rows and a list of ten million
// cost the same. Plus the named-state API so agents/tests can drive states by
// name (AGENTS.md "State API").
//
// Two ways to feed it: setData(count, renderRow) - an index range, nothing
// stored - or setSource(rows, { render }) - an array of records behind a
// defuss-dataview source (src/shared/dataview.ts): filters and multisort run
// locally over every row, the query lives in the store
// (el.store.value.config.filters / .sorters) and the window shows its result.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent, dataSource, parseFilter, virtualWindow, sizerHeight, scrollTopFor } from '../../../shared/state-api.js';
import type { DataviewFilter, DataviewRow, DataviewSorter } from '../../../shared/dataview.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

// VERIFIED: (verify's component types ratchet - tsc -p tsconfig.components.json) every type
// this file's API docs state - arguments, return values, event details - holds
// against its code: a wrong one is a new type error and fails the build.

/** A query over the list's records - merged into the stored one. */
type VirtualListQuery = {
  /** filters over every record */
  filters?: DataviewFilter[];
  /** the order - several sorters sort by each in turn */
  sorters?: DataviewSorter[];
};

/** What setSource() takes besides the records. */
interface VirtualListSourceOptions {
  /** fill a recycled row element for a record (default: the id as text) */
  render?: (el: HTMLElement, record: DataviewRow, context: { index: number }) => void;
  /** the id field (default 'id') */
  idField?: string;
  /** the first query */
  query?: VirtualListQuery;
}

const virtualListStates = ['default', 'loading', 'empty'];

/** setState() configs per state - merged into the stored one ({ index } keeps the query). */
export interface VirtualListStateConfigs {
  /** Rows rendered. */
  default: {
    /** scroll this row into view (a one-off: not kept in the stored config) */
    index?: number;
    /** with a source: filters over every record */
    filters?: DataviewFilter[];
    /** with a source: the order */
    sorters?: DataviewSorter[];
  };
  /** Placeholder rows; the list is aria-busy. */
  loading: {
    /** with a source: filters over every record */
    filters?: DataviewFilter[];
    /** with a source: the order */
    sorters?: DataviewSorter[];
  };
  /** No rows - the data-empty-text shows. */
  empty: {
    /** with a source: filters over every record */
    filters?: DataviewFilter[];
    /** with a source: the order */
    sorters?: DataviewSorter[];
  };
}

/** Items per row: 1 is a list, more is a grid. */
const columnsOf = (list) => Math.max(1, parseInt(list.dataset.columns || '1', 10) || 1);

/** How many items the list shows: the source's query result, else the count. */
const itemCount = (list) => (list._source ? list._result.entries.length : list._count);

/** How many rows the items occupy — the unit the window is measured in. */
const rowCount = (list) => Math.ceil(itemCount(list) / columnsOf(list));

/** Height given to the sizer — clamped so the browser can render it (shared/virtual.ts). */
const listSizer = (list) => sizerHeight(rowCount(list), list._rowHeight);

/** fill one recycled element with item `index` */
function fill(list, el, index) {
  if (!list._source) return list._renderRow(el, index);
  const entry = list._result.entries[index];
  list._render(el, entry.row, { index, ...entry.meta });
}

/** Writes the window of rows that belongs at the current scroll position. */
function renderRows(list) {
  const rows = list._rows;
  if (!rows) return;
  const count = itemCount(list);
  const cols = columnsOf(list);
  const total = rowCount(list);
  const { first, count: pool, shift } = virtualWindow(list.scrollTop, list.clientHeight, list._rowHeight, total);

  // grow/shrink the recycled pool to the window size
  while (rows.children.length < pool) {
    const row = document.createElement('div');
    row.className = 'virtual-list-row';
    row.setAttribute('role', cols > 1 ? 'row' : 'listitem');
    dfDollar(rows).append(row);
  }
  while (rows.children.length > pool) {
    rows.lastElementChild.remove();
  }

  // The pool sits inside a translated wrapper: one translate per scroll frame
  // instead of one `top` write per row.
  rows.style.translate = `0 ${shift}px`;

  for (let i = 0; i < rows.children.length; i++) {
    const row = rows.children[i];
    const index = first + i;
    if (row._index === index) continue; // already showing this row — leave it be
    row._index = index;
    row.dataset.index = String(index);

    if (cols === 1) {
      row.setAttribute('aria-posinset', String(index + 1));
      row.setAttribute('aria-setsize', String(count));
      fill(list, row, index);
      continue;
    }

    // grid: the row holds `cols` recycled cells, and the tail row may be short
    row.setAttribute('aria-rowindex', String(index + 1));
    while (row.children.length < cols) {
      const cell = document.createElement('div');
      cell.className = 'virtual-list-cell';
      cell.setAttribute('role', 'gridcell');
      dfDollar(row).append(cell);
    }
    for (let c = 0; c < cols; c++) {
      const cell = row.children[c];
      const itemIndex = index * cols + c;
      cell.setAttribute('aria-colindex', String(c + 1));
      if (itemIndex >= count) {
        // past the last item: keep the cell for recycling, hide it from view
        cell.hidden = true;
        cell.dataset.index = '';
        continue;
      }
      cell.hidden = false;
      cell.dataset.index = String(itemIndex);
      fill(list, cell, itemIndex);
    }
  }
}

/** Default row content when the consumer supplies no renderer. */
const defaultRenderRow = (row, index) => {
  row.textContent = `Row ${index + 1}`;
};

/**
 * The markup of a state, for render(): the attributes a state writes, applied
 * to a detached copy of the authored markup ('default' IS the authored
 * markup). The live element gets the same markup from triggerStateChange -
 * the e2e render round trip proves they agree.
 */
function applyMarkup(el, stateName) {
  dfDollar(el).attr('data-state', stateName).attr('aria-busy', stateName === 'loading' ? 'true' : null);
}

/**
 * A source's query changed (or its rows): evaluate it (cached per query in
 * the source), size the sizer, recycle every row. Returns the item count.
 */
function refresh(list, config) {
  if (list._source) list._result = list._source.query({ filters: config.filters, sorters: config.sorters });
  const sizer = list._rows?.parentElement;
  if (sizer) sizer.style.height = `${listSizer(list)}px`;
  if (columnsOf(list) > 1) list.setAttribute('aria-rowcount', String(rowCount(list)));
  if (list._rows) {
    Array.from(list._rows.children as HTMLCollectionOf<HTMLElement>).forEach((row) => { row._index = -1; });
  }
  return itemCount(list);
}

/**
 * UI side of setState: 'default' shows the rows (config `{ index }` scrolls
 * that row into view; with a source, `{ filters, sorters }` is the query -
 * a query nothing matches lands in 'empty'), 'loading' shows placeholder rows
 * and marks the list busy, 'empty' shows the empty message.
 */
function triggerStateChange(list, stateName, config, incoming = config) {
  if (list._source && stateName !== 'loading' && !refresh(list, config) && stateName === 'default') stateName = 'empty';
  list.dataset.state = stateName;
  // the state it lands in (a query with no match is 'empty')
  list.dataset.stateName = stateName;
  switch (stateName) {
    case 'default':
      list.removeAttribute('aria-busy');
      renderRows(list);
      if (typeof incoming.index === 'number') {
        const item = Math.floor(Math.max(0, Math.min(itemCount(list) - 1, incoming.index)) / columnsOf(list));
        list.scrollTop = scrollTopFor(item, list.clientHeight, list._rowHeight, rowCount(list));
        renderRows(list);
      }
      break;
    case 'loading':
      list.setAttribute('aria-busy', 'true');
      break;
    case 'empty':
      list.removeAttribute('aria-busy');
      break;
  }
}

/** Registry-level API; pass the list element explicitly. Unknown names throw. */
export const virtualListApi = componentState({
  component: 'virtual-list',
  states: virtualListStates,
  // a config merges: the query stays when only { index } is passed
  mergeConfig: true,
  apply: (list, state, _previous, incoming) => triggerStateChange(list, state.name, state.config, incoming),
  markup: (el, state) => applyMarkup(el, state.name),
});

df$.virtualListApi = virtualListApi;
df$.virtualListStates = virtualListStates;

/**
 * Public imperative API (AGENTS.md "No window globals"): hand a list its data.
 * `count` may be any number the platform can hold — nothing is allocated per
 * row. `renderRow(rowElement, index)` fills a recycled element; it must not
 * assume the element is empty or new.
 */
df$.virtualList = {
  /**
   * An index range instead of records: count rows, renderRow(row, index) fills a recycled element - nothing is stored per row.
   * @param list - the .virtual-list element
   * @param count - how many rows (floored, at least 0; 0 shows the empty state)
   * @param renderRow - fills the recycled element of row `index`; omitted, the last one given stays
   */
  setData(list: HTMLElement, count: number, renderRow?: (row: HTMLElement, index: number) => void): void {
    list._source = null;
    list._count = Math.max(0, Math.floor(count) || 0);
    if (renderRow) list._renderRow = renderRow;
    refresh(list, {});
    if (list.store) virtualListApi.setState(list, list._count ? 'default' : 'empty');
  },
  /**
   * Records instead of a count: `rows` is any array of objects, `render(el,
   * record, { index })` fills a recycled element. Filters and multisort run
   * over every row (defuss-dataview); `query` is the first one.
   * @param list - the .virtual-list element
   * @param rows - the records
   * @param options - render, the id field and the first query
   */
  setSource(list: HTMLElement, rows: DataviewRow[], { render, idField = 'id', query = {} }: VirtualListSourceOptions = {}): void {
    list._source = dataSource(rows, { idField });
    list._result = list._source.query(query);
    if (render) list._render = render;
    list._render ??= (el, record) => { el.textContent = String(record[idField]); };
    if (list.store) virtualListApi.setState(list, 'default', { filters: [], sorters: [], ...query });
    else list._pendingQuery = query;
  },
  /**
   * Run a query (merged into the stored one): { filters?, sorters? }.
   * @param list - the .virtual-list element
   * @param query - the keys to change
   */
  query(list: HTMLElement, query: VirtualListQuery): void {
    virtualListApi.setState(list, 'default', query);
  },
  /**
   * The rows the current query shows.
   * @param list - the .virtual-list element
   * @returns the records, in list order ([] for an index range from setData)
   */
  rows(list: HTMLElement): DataviewRow[] {
    return list._source ? list._result.entries.map((entry) => entry.row) : [];
  },
};

/**
 * Declarative query controls, anywhere on the page (one document listener):
 * <input data-virtual-list-filter="list-id" data-field="name"> filters a
 * source-backed list (data-kind="number" for > 10 / <= 3 …), and
 * <select data-virtual-list-sort="list-id"> sorts it by "field:asc|desc"
 * values ("" = source order). Several filters on one list combine (AND).
 */
if (!document.__virtualListQueryInit) {
  document.__virtualListQueryInit = true;
  const target = (el, attr) => dfDollar('#' + CSS.escape(el.getAttribute(attr))).get(0);
  document.addEventListener('input', (e) => {
    const input = (e.target as HTMLElement).closest?.<HTMLInputElement>('[data-virtual-list-filter]');
    const list = input && target(input, 'data-virtual-list-filter');
    if (!list?._source || !list.store) return;
    clearTimeout(list._filterTimer);
    list._filterTimer = setTimeout(() => {
      const filters = dfDollar<HTMLInputElement>(`[data-virtual-list-filter="${CSS.escape(list.id)}"]`).toArray()
        .map((el) => parseFilter(el.dataset.field || list._source.idField, el.value, (el.dataset.kind || 'text') as 'text' | 'number' | 'select'))
        .filter(Boolean);
      virtualListApi.setState(list, 'default', { filters });
    }, 150);
  });
  document.addEventListener('change', (e) => {
    const select = (e.target as HTMLElement).closest?.<HTMLSelectElement>('[data-virtual-list-sort]');
    const list = select && target(select, 'data-virtual-list-sort');
    if (!list?._source || !list.store) return;
    const [field, direction] = select.value.split(':');
    virtualListApi.setState(list, 'default', { sorters: field ? [{ field, direction: direction === 'desc' ? 'desc' : 'asc' }] : [] });
  });
}

function init() {
  dfDollar('.virtual-list:not([data-init])').toArray().forEach((list) => {
    list.dataset.init = '';

    // the sizer gives the scrollbar its length; the pool rides inside it
    let sizer = dfDollar(list).find('.virtual-list-sizer').get(0);
    if (!sizer) {
      sizer = document.createElement('div');
      sizer.className = 'virtual-list-sizer';
      dfDollar(list).append(sizer);
    }
    let rows = dfDollar(sizer).find('.virtual-list-rows').get(0);
    if (!rows) {
      rows = document.createElement('div');
      rows.className = 'virtual-list-rows';
      dfDollar(sizer).append(rows);
    }

    list._rows = rows;
    list._renderRow = list._renderRow || defaultRenderRow;
    list._rowHeight =
      parseFloat(getComputedStyle(list).getPropertyValue('--virtual-list-row-height')) || 40;
    // Data may arrive BEFORE this element is initialized: on SPA navigation the
    // page's setup runs synchronously after the content swap, while this init
    // is a MutationObserver callback that lands afterwards. Keep what setData
    // stored — clobbering it here is what left a freshly navigated page empty.
    if (typeof list._count !== 'number') {
      list._count = parseInt(list.dataset.count || '0', 10) || 0;
    }

    const cols = columnsOf(list);
    list.setAttribute('role', cols > 1 ? 'grid' : 'list');
    if (cols > 1) list.setAttribute('aria-colcount', String(cols));
    if (!list.hasAttribute('tabindex')) list.tabIndex = 0; // arrow keys scroll it

    sizer.style.height = `${listSizer(list)}px`;

    // one render per animation frame, however many scroll events arrive
    let queued = false;
    list.addEventListener(
      'scroll',
      () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          if (list.dataset.state !== 'loading' && list.dataset.state !== 'empty') renderRows(list);
        });
      },
      { passive: true },
    );

    // the visible window depends on the container height, not just scrolling
    new ResizeObserver(() => {
      if (list.dataset.state !== 'loading' && list.dataset.state !== 'empty') renderRows(list);
    }).observe(list);

    // el.store + el.api (AGENTS.md "State through stores")

    bindComponent(list, virtualListApi);

    if (list._source) virtualListApi.setState(list, 'default', { filters: [], sorters: [], ...list._pendingQuery });
    else virtualListApi.setState(list, list._count ? 'default' : 'empty');
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
