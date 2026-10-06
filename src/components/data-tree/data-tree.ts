// -- Data Tree ------------------------------------------------
// A tree over any number of records that each name their parent: only the
// rows on screen exist (shared windowing, src/shared/virtual.ts), and the
// hierarchy, filtering and sorting run locally over every record through
// defuss-dataview (src/shared/dataview.ts). A filter keeps the ancestors of
// every match and opens the way to it; collapsing keeps the query.
//
// The query IS the state's config (AGENTS.md "State through stores"):
// el.store.value.config = { filters, sorters, expanded, collapsed, selected }.
// The view survives a reload: session storage by default, local storage or
// nothing per instance (data-persist, data-persist-prefix / -key, or
// setSource's persist option).

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import {
  defussGlobals,
  defussQuery,
  componentState,
  bindComponent,
  persisted,
  viewPersistence,
  dataSource,
  parseFilter,
  filterText,
  virtualWindow,
  sizerHeight,
  scrollIntoViewTop,
} from '../../shared/state-api.js';
import type { DataviewFilter, DataviewJsonValue, DataviewRow, DataviewSorter } from '../../shared/dataview.js';
import type { ViewPersistence } from '../../shared/store.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

// VERIFIED: (verify's component types ratchet - tsc -p tsconfig.components.json) every type
// this file's API docs state - arguments, return values, event details - holds
// against its code: a wrong one is a new type error and fails the build.

/** The tree's query - its state config (merged on every query()). */
interface DataTreeQuery {
  /** filters over every record (a match shows with its ancestors) */
  filters?: DataviewFilter[];
  /** the order of siblings */
  sorters?: DataviewSorter[];
  /** the ids of the open branches */
  expanded?: DataviewJsonValue[];
  /** while filtering: the branches the user closed again */
  collapsed?: DataviewJsonValue[];
  /** the selected record's id, null for none */
  selected?: DataviewJsonValue | null;
}

/** Where a record sits in the tree - what render() and data-tree-select receive. */
interface DataTreeMeta {
  /** 0 for a root */
  depth: number;
  /** whether it has child records */
  hasChildren: boolean;
  /** whether its branch is open */
  isExpanded: boolean;
  /** whether it matches the filters (false for an ancestor shown for a match) */
  isMatch: boolean;
  /** whether it is the selected record */
  isSelected: boolean;
  /** its parent's id, null for a root */
  parentId: DataviewJsonValue | null;
}

/** What setSource() takes besides the records. */
interface DataTreeOptions {
  /** the id field (default 'id', or data-id-field) */
  idField?: string;
  /** the parent-id field (default 'parentId', or data-parent-field) */
  parentIdField?: string;
  /** fill an item's label yourself (default: the data-label-field value as text) */
  render?: (el: HTMLElement, record: DataviewRow, meta: DataTreeMeta) => void;
  /** the starting view (a kept view wins over it) */
  query?: DataTreeQuery;
  /** where the view is kept between visits (default: session storage under a generated key) */
  persist?: ViewPersistence;
}

/** What data-tree-select carries. */
interface DataTreeSelectDetail {
  /** the selected record */
  record: DataviewRow;
  /** where it sits in the tree */
  meta: DataTreeMeta;
}

const dataTreeStates = ['default', 'loading', 'empty'];

/** setState() configs per state - the config IS the tree's query, merged into the stored one ({ expanded } keeps the filters). */
export interface DataTreeStateConfigs {
  /** The visible items of the query; nothing visible lands in empty. */
  default: DataTreeQuery;
  /** Busy: placeholder rows, aria-busy - a tree without records starts here. */
  loading: DataTreeQuery;
  /** Nothing to show: the data-empty-text shows. */
  empty: DataTreeQuery;
}
let uid = 0;

// the config being shown: set first thing in apply (the store records it
// only AFTER the DOM work - reading the store there would be one step behind)
const configOf = (tree) => tree._config ?? tree.store?.value.config ?? {};
const labelField = (tree) => tree.dataset.labelField || 'name';

/**
 * The markup of a state, for render() AND the live element: data-state and
 * aria-busy. Everything else a tree shows is its records (runtime).
 */
function applyMarkup(el, state) {
  dfDollar(el)
    .attr('data-state', state.name)
    .attr('aria-busy', state.name === 'loading' ? 'true' : null);
}

/** position among visible siblings (aria-posinset / aria-setsize), per result */
function siblingInfo(tree) {
  const result = tree._result;
  if (tree._siblings?.result === result) return tree._siblings;
  const size = new Map();
  const pos = Array.from({ length: result.entries.length }, () => 0);
  result.entries.forEach((entry, i) => {
    const parent = entry.meta.parentId ?? null;
    const n = (size.get(parent) ?? 0) + 1;
    size.set(parent, n);
    pos[i] = n;
  });
  tree._siblings = { result, size, pos };
  return tree._siblings;
}

/** writes the window of items that belongs at the current scroll position */
function renderItems(tree) {
  const pool = tree._pool;
  if (!pool || !tree._result) return;
  const entries = tree._result.entries;
  const total = entries.length;
  const h = tree._rowHeight;
  const win = virtualWindow(tree.scrollTop, tree.clientHeight, h, total);
  tree._sizer.style.height = `${sizerHeight(total, h)}px`;
  while (pool.children.length < win.count) {
    const item = document.createElement('div');
    item.className = 'data-tree-item';
    item.setAttribute('role', 'treeitem');
    item.id = `${tree._uid}-item-${pool.children.length}`;
    const toggle = document.createElement('span');
    toggle.className = 'data-tree-toggle';
    toggle.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'data-tree-label';
    item.append(toggle, label);
    pool.append(item);
  }
  while (pool.children.length > win.count) pool.lastElementChild.remove();
  pool.style.translate = `0 ${win.shift}px`;
  const { size, pos } = siblingInfo(tree);
  const selected = configOf(tree).selected ?? null;
  const idField = tree._source.idField;
  let active = null;
  for (let i = 0; i < pool.children.length; i++) {
    const item = pool.children[i];
    const index = win.first + i;
    const entry = entries[index];
    const key = `${tree._gen}:${index}`;
    if (item._key !== key) {
      item._key = key;
      item._index = index;
      item.dataset.index = String(index);
      const meta = entry.meta;
      item.style.setProperty('--depth', String(meta.depth));
      item.setAttribute('aria-level', String(meta.depth + 1));
      item.setAttribute('aria-setsize', String(size.get(meta.parentId ?? null)));
      item.setAttribute('aria-posinset', String(pos[index]));
      if (meta.hasChildren) item.setAttribute('aria-expanded', String(meta.isExpanded));
      else item.removeAttribute('aria-expanded');
      item.toggleAttribute('data-match', !!(configOf(tree).filters || []).length && meta.isMatch);
      const label = item.lastElementChild;
      if (tree._render) {
        label.textContent = '';
        tree._render(label, entry.row, meta);
      } else {
        label.textContent = String(entry.row[labelField(tree)] ?? '');
      }
    }
    item.setAttribute('aria-selected', String(selected !== null && entry.row[idField] === selected));
    item.toggleAttribute('data-active', index === tree._active);
    if (index === tree._active) active = item;
  }
  if (active) tree.setAttribute('aria-activedescendant', active.id);
  else tree.removeAttribute('aria-activedescendant');
}

/** evaluate the config's query, re-render; returns the visible count */
function refresh(tree, config, previous) {
  if (!tree._source) return 0;
  tree._result = tree._source.query({ filters: config.filters, sorters: config.sorters, expanded: config.expanded, collapsed: config.collapsed });
  tree._gen = (tree._gen || 0) + 1;
  const prev = previous?.config || {};
  if (JSON.stringify(prev.filters ?? []) !== JSON.stringify(config.filters ?? [])) {
    tree.scrollTop = 0;
    // the first match is where the eye goes
    const first = tree._result.entries.findIndex((e) => e.meta.isMatch);
    tree._active = (config.filters || []).length ? Math.max(0, first) : 0;
  }
  tree._active = Math.min(tree._active ?? 0, Math.max(0, tree._result.entries.length - 1));
  renderItems(tree);
  return tree._result.entries.length;
}

/**
 * UI side of setState: 'default' shows the records of the config's query
 * (none match → 'empty'), 'loading' shows placeholder rows, 'empty' shows
 * data-empty-text. Every state keeps the query.
 */
function triggerStateChange(tree, state, previous) {
  tree._config = state.config;
  let name = state.name;
  if (name !== 'loading') {
    const rows = refresh(tree, state.config, previous);
    if (name === 'default' && !rows) name = 'empty';
  }
  applyMarkup(tree, { name, config: state.config });
  tree.dataset.stateName = name;
  if (tree._saved) {
    tree._saved.set({ filters: state.config.filters ?? [], sorters: state.config.sorters ?? [], expanded: state.config.expanded ?? [], selected: state.config.selected ?? null });
  }
  // bound filter inputs show the query (a restored one too) - never the one being typed in
  if (tree.id) {
    for (const input of dfDollar(`[data-tree-filter="${CSS.escape(tree.id)}"]`).toArray()) {
      if (input === document.activeElement) continue;
      const field = input.dataset.field || labelField(tree);
      input.value = filterText((state.config.filters || []).find((x) => x.field === field));
    }
  }
}

/** the persisted view (viewPersistence: data-persist, -prefix, -key, or the config) */
const KEPT = ['filters', 'sorters', 'expanded'];
function attachPersistence(tree, config) {
  tree._saved?.destroy();
  const where = viewPersistence(tree, 'data-tree', String(dfDollar('.data-tree').toArray().indexOf(tree)), config || {});
  tree._saved = where
    ? persisted(where.key, {}, { area: where.area, validate: (v) => typeof v === 'object' && v !== null && !Array.isArray(v) })
    : null;
  const kept = {};
  for (const k of KEPT) if (Array.isArray(tree._saved?.value[k])) kept[k] = tree._saved.value[k];
  if (tree._saved && tree._saved.value.selected !== undefined) kept.selected = tree._saved.value.selected;
  return kept;
}

/** Registry-level API; pass the tree explicitly. Unknown names throw. */
export const dataTreeApi = componentState({
  component: 'data-tree',
  states: dataTreeStates,
  // a config merges: { expanded } keeps the filters
  mergeConfig: true,
  apply: (tree, state, previous) => triggerStateChange(tree, state, previous),
  markup: (el, state) => applyMarkup(el, state),
});

df$.dataTreeApi = dataTreeApi;
df$.dataTreeStates = dataTreeStates;

// -- interaction ------------------------------------------------------------------

const query = (tree, patch) => dataTreeApi.setState(tree, tree.store.value.name === 'loading' ? 'loading' : 'default', patch);
const entryAt = (tree, index) => tree._result?.entries[index];

function setExpanded(tree, index, open) {
  const entry = entryAt(tree, index);
  if (!entry?.meta.hasChildren || entry.meta.isExpanded === open) return false;
  const id = entry.row[tree._source.idField];
  const config = configOf(tree);
  if ((config.filters || []).length) {
    const collapsed = new Set(config.collapsed || []);
    if (open) collapsed.delete(id);
    else collapsed.add(id);
    query(tree, { collapsed: [...collapsed] });
  } else {
    const expanded = new Set(config.expanded || []);
    if (open) expanded.add(id);
    else expanded.delete(id);
    query(tree, { expanded: [...expanded] });
  }
  return true;
}

function select(tree, index) {
  const entry = entryAt(tree, index);
  if (!entry) return;
  query(tree, { selected: entry.row[tree._source.idField] });
  // Fires when an item is selected (click, Enter, Space) - its record and its tree meta (depth, hasChildren ...).
  tree.dispatchEvent(new CustomEvent<DataTreeSelectDetail>('data-tree-select', { bubbles: true, detail: { record: entry.row, meta: entry.meta } }));
}

/** move the active item and keep it on screen */
function activate(tree, index) {
  const total = tree._result?.entries.length ?? 0;
  if (!total) return;
  tree._active = Math.max(0, Math.min(total - 1, index));
  tree.scrollTop = scrollIntoViewTop(tree._active, tree.scrollTop, tree.clientHeight, tree._rowHeight, total);
  renderItems(tree);
}

function onKeydown(tree, e) {
  const index = tree._active ?? 0;
  const entry = entryAt(tree, index);
  if (!entry) return;
  const page = Math.max(1, Math.floor(tree.clientHeight / tree._rowHeight) - 1);
  switch (e.key) {
    case 'ArrowDown': activate(tree, index + 1); break;
    case 'ArrowUp': activate(tree, index - 1); break;
    case 'ArrowRight':
      // closed: open it; open: step to its first child
      if (entry.meta.hasChildren && !setExpanded(tree, index, true)) activate(tree, index + 1);
      break;
    case 'ArrowLeft':
      if (entry.meta.hasChildren && entry.meta.isExpanded) setExpanded(tree, index, false);
      else if (entry.meta.parentId != null) {
        const parent = tree._result.entries.findIndex((x) => x.row[tree._source.idField] === entry.meta.parentId);
        if (parent >= 0) activate(tree, parent);
      }
      break;
    case 'Home': activate(tree, 0); break;
    case 'End': activate(tree, tree._result.entries.length - 1); break;
    case 'PageDown': activate(tree, index + page); break;
    case 'PageUp': activate(tree, index - page); break;
    case 'Enter':
    case ' ':
      select(tree, index);
      break;
    case '*': {
      // APG: open every sibling of the active item
      const parent = entry.meta.parentId ?? null;
      const ids = tree._result.entries.filter((x) => (x.meta.parentId ?? null) === parent && x.meta.hasChildren).map((x) => x.row[tree._source.idField]);
      query(tree, { expanded: [...new Set([...(configOf(tree).expanded || []), ...ids])] });
      break;
    }
    default:
      return;
  }
  e.preventDefault();
}

function onClick(tree, e) {
  const item = e.target.closest?.('.data-tree-item');
  if (!item || !tree._pool.contains(item)) return;
  tree._active = item._index;
  if (e.target.closest('.data-tree-toggle')) {
    const entry = entryAt(tree, item._index);
    setExpanded(tree, item._index, !entry?.meta.isExpanded);
    return;
  }
  select(tree, item._index);
}

// one page-wide listener: <input data-tree-filter="tree-id" [data-field]> filters that tree
if (!document.__dataTreeFilterInit) {
  document.__dataTreeFilterInit = true;
  document.addEventListener('input', (e) => {
    const input = e.target.closest?.('[data-tree-filter]');
    if (!input) return;
    const tree = dfDollar('#' + CSS.escape(input.dataset.treeFilter)).get(0);
    if (!tree?.store) return;
    clearTimeout(tree._filterTimer);
    tree._filterTimer = setTimeout(() => {
      const filter = parseFilter(input.dataset.field || labelField(tree), input.value, 'text');
      query(tree, { filters: filter ? [filter] : [], collapsed: [] });
    }, 150);
  });
}

// -- df$.shadcn.dataTree: the imperative surface ----------------------------------

const resolve = (target) => (typeof target === 'string' ? dfDollar(target).get(0) : target);

df$.dataTree = {
  /**
   * Hand the tree its records. Options: idField ('id'), parentIdField
   * ('parentId', or data-parent-field), render(el, record, meta) for the
   * label (default: the data-label-field value), query (the starting view),
   * persist ({ area: 'session' | 'local' | 'none', prefix, key }).
   * @param target - the .data-tree element or its selector
   * @param rows - the records, a flat list linked by parent id
   * @param options - fields, label rendering, the starting view and its persistence
   */
  setSource(target: string | HTMLElement, rows: DataviewRow[], options: DataTreeOptions = {}): void {
    const tree = resolve(target);
    const idField = options.idField || tree.dataset.idField || 'id';
    const parentIdField = options.parentIdField || tree.dataset.parentField || 'parentId';
    tree._source = dataSource(rows, { idField, tree: { idField, parentIdField } });
    tree._render = options.render || null;
    tree._sourceOptions = options;
    // options.query starts the view; a kept view (options.persist moves it) wins
    if (tree.store) dataTreeApi.setState(tree, 'default', { ...options.query, ...(options.persist ? attachPersistence(tree, options.persist) : {}) });
  },
  /**
   * Merge into the query: { filters?, sorters?, expanded?, selected? }.
   * @param target - the .data-tree element or its selector
   * @param patch - the query keys to change
   */
  query: (target: string | HTMLElement, patch: DataTreeQuery): void => { query(resolve(target), patch); },
  /**
   * Open every branch.
   * @param target - the .data-tree element or its selector
   */
  expandAll(target: string | HTMLElement): void {
    const tree = resolve(target);
    query(tree, { expanded: tree._source.branchIds(), collapsed: [] });
  },
  /**
   * Close every branch (while filtering: the ways to the matches too).
   * @param target - the .data-tree element or its selector
   */
  collapseAll(target: string | HTMLElement): void {
    const tree = resolve(target);
    const filtering = (configOf(tree).filters || []).length > 0;
    query(tree, filtering ? { collapsed: tree._source.branchIds() } : { expanded: [] });
  },
  /**
   * The selected record.
   * @param target - the .data-tree element or its selector
   * @returns the record whose id is selected, null when none is
   */
  selected(target: string | HTMLElement): DataviewRow | null {
    const tree = resolve(target);
    const id = configOf(tree).selected ?? null;
    return id === null ? null : (tree._source?.rows.find((r) => r[tree._source.idField] === id) ?? null);
  },
};

// -- init --------------------------------------------------------------------------

function init() {
  dfDollar('.data-tree:not([data-init])').toArray().forEach((tree) => {
    tree.dataset.init = '';
    tree._uid = tree.id || `data-tree-${++uid}`;
    const sizer = document.createElement('div');
    sizer.className = 'data-tree-sizer';
    const pool = document.createElement('div');
    pool.className = 'data-tree-items';
    pool.setAttribute('role', 'presentation');
    sizer.append(pool);
    dfDollar(tree).append(sizer);
    tree._sizer = sizer;
    tree._pool = pool;
    tree._active = 0;
    tree._rowHeight = parseFloat(getComputedStyle(tree).getPropertyValue('--data-tree-row-height')) || 32;
    tree.setAttribute('role', 'tree');
    if (!tree.hasAttribute('tabindex')) tree.tabIndex = 0;

    const early = tree._sourceOptions || {};
    const config = { filters: [], sorters: [], expanded: [], collapsed: [], selected: null, ...early.query, ...attachPersistence(tree, early.persist) };

    let queued = false;
    tree.addEventListener('scroll', () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        renderItems(tree);
      });
    }, { passive: true });
    new ResizeObserver(() => renderItems(tree)).observe(tree);
    tree.addEventListener('click', (e) => onClick(tree, e));
    tree.addEventListener('keydown', (e) => onKeydown(tree, e));

    // el.store + el.api (AGENTS.md "State through stores"): no records yet = loading
    bindComponent(tree, dataTreeApi, { name: tree._source ? 'default' : 'loading', config });
    dataTreeApi.setState(tree, tree._source ? 'default' : 'loading', config);
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
