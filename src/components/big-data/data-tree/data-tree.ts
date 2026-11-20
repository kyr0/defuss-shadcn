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
  asEditor,
  builtinEditor,
  editorControl,
  editorKey,
  editorProblem,
  focusEditor,
  valueType,
} from '../../../shared/state-api.js';
import type { CellEditor, EditorRules } from '../../../shared/editors.js';
import type {
  DataSource,
  DataviewFilter,
  DataviewJsonValue,
  DataviewRow,
  DataviewSorter,
} from '../../../shared/dataview.js';
import type { ViewPersistence } from '../../../shared/store.js';

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

/** Where an edit happens - what getEditorFn and validateFn receive. */
interface DataTreeEditContext {
  /** the record being edited (unchanged until the edit commits) */
  record: DataviewRow;
  /** where it sits in the tree */
  meta: DataTreeMeta;
  /** the field that edits (data-edit-field, else the label field) */
  field: string;
  /** the type it edits as (data-editor, else from the value) */
  type: string;
  /** the tree's rules (data-required, data-min-length, data-max-length, data-pattern) */
  rules: EditorRules;
  /** the tree element */
  tree: HTMLElement;
}

/** What setSource() takes besides the records. */
interface DataTreeOptions {
  /** an editor for an item (data-editable on the tree): an element or a CellEditor; null: the built-in Input; false:
   *  this item does not edit */
  getEditorFn?: (field: string, value: unknown, ctx: DataTreeEditContext) => HTMLElement | CellEditor | null | false;
  /** refuse a value: return a message, or false for a generic one; anything else accepts it */
  validateFn?: (field: string, value: unknown, ctx: DataTreeEditContext) => string | false | null | undefined;
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

/** What data-tree-beforeedit carries. */
interface DataTreeBeforeEditDetail {
  /** the record as it is */
  record: DataviewRow;
  /** the field that edits */
  field: string;
  /** the value about to be written */
  value: unknown;
  /** the value it holds now */
  oldValue: unknown;
}

/** What data-tree-edit carries. */
interface DataTreeEditDetail {
  /** the record as it is now (a new object - the old one is never mutated) */
  record: DataviewRow;
  /** the field that edited */
  field: string;
  /** the value written */
  value: unknown;
  /** the value it held */
  oldValue: unknown;
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
  let edShown = false;
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
      delete item.dataset.editing;
      const label = item.lastElementChild;
      if (tree._render) {
        label.textContent = '';
        tree._render(label, entry.row, meta);
      } else {
        label.textContent = String(entry.row[labelField(tree)] ?? '');
      }
    }
    const ed = tree._editor;
    if (ed && ed.id === entry.row[idField]) {
      edShown = true;
      if (!item.contains(ed.wrap)) {
        // the item was filled again (a scroll moved its record to another pool element): the editor goes back
        const focused = ed.wrap.contains(document.activeElement) || document.activeElement === document.body;
        placeTreeEditor(item, ed);
        if (focused) (editorControl(ed.editor) as HTMLElement).focus({ preventScroll: true });
      }
    }
    item.setAttribute('aria-selected', String(selected !== null && entry.row[idField] === selected));
    item.toggleAttribute('data-active', index === tree._active);
    if (index === tree._active) active = item;
  }
  if (active) tree.setAttribute('aria-activedescendant', active.id);
  else tree.removeAttribute('aria-activedescendant');
  // the edited record scrolled out of the window: write what the editor holds (refused: drop it)
  if (tree._editor && !edShown && !tree._writing)
    queueMicrotask(() => {
      if (tree._editor && !commitTreeEdit(tree, false)) cancelTreeEdit(tree, false);
    });
}

// -- inline editing ---------------------------------------------------------

/** the field an edit writes */
const editField = (tree) => tree.dataset.editField || labelField(tree);

/** the tree's edit rules, from its attributes */
function treeRules(tree): EditorRules {
  const d = tree.dataset;
  const rules: EditorRules = {};
  if (tree.hasAttribute('data-required')) rules.required = true;
  if (d.minLength) rules.minLength = Number(d.minLength);
  if (d.maxLength) rules.maxLength = Number(d.maxLength);
  if (d.pattern) rules.pattern = d.pattern;
  if (d.message) rules.message = d.message;
  if (d.options) rules.options = d.options.split(',').map((o) => o.trim());
  return rules;
}

const treeContext = (tree, entry): DataTreeEditContext => {
  const field = editField(tree);
  const rules = treeRules(tree);
  return {
    record: entry.row,
    meta: entry.meta,
    field,
    type: tree.dataset.editor || valueType(entry.row[field], rules),
    rules,
    tree,
  };
};

/** put the open editor into an item's label */
function placeTreeEditor(item, ed) {
  ed.item = item;
  item.dataset.editing = '';
  const label = item.lastElementChild;
  label.textContent = '';
  label.append(ed.wrap);
}

/** open the editor of the item at an index */
function openTreeEdit(tree, index) {
  if (!tree.hasAttribute('data-editable') || tree.hasAttribute('data-readonly')) return false;
  const entry = entryAt(tree, index);
  if (!entry) return false;
  if (tree._editor && !commitTreeEdit(tree, false)) return false;
  const ctx = treeContext(tree, entry);
  const value = entry.row[ctx.field];
  const custom = tree._sourceOptions?.getEditorFn?.(ctx.field, value, ctx);
  if (custom === false) return false;
  const editor: CellEditor = asEditor(custom) ?? builtinEditor(ctx.type, value, ctx.rules);
  activate(tree, index);
  const wrap = document.createElement('span');
  wrap.className = 'data-tree-editor';
  wrap.append(editor.el);
  const ed = { id: entry.row[tree._source.idField], field: ctx.field, editor, wrap, value, entry, item: null };
  tree._editor = ed;
  const item = dfDollar(tree._pool)
    .children('.data-tree-item')
    .toArray()
    .find((x) => x._index === index);
  if (item) placeTreeEditor(item, ed);
  wrap.addEventListener('keydown', (e) => {
    e.stopPropagation(); // the tree's keys (arrows, Space, Enter) stay out of the editor
    const act = editorKey(e, editor);
    if (!act) return;
    e.preventDefault();
    if (act === 'cancel') cancelTreeEdit(tree);
    else commitTreeEdit(tree);
  });
  wrap.addEventListener('click', (e) => e.stopPropagation());
  wrap.addEventListener('dblclick', (e) => e.stopPropagation());
  wrap.addEventListener('change', () => {
    if (editor.immediate) commitTreeEdit(tree);
  });
  wrap.addEventListener('focusout', (e) => {
    if (wrap.contains(e.relatedTarget as Node)) return;
    setTimeout(() => {
      if (tree._editor === ed && !wrap.contains(document.activeElement)) commitTreeEdit(tree, false);
    }, 0);
  });
  focusEditor(editor);
  return true;
}

/** close the editor without writing; the tree takes the focus back */
function cancelTreeEdit(tree, focus = true) {
  if (!tree._editor) return;
  tree._editor = null;
  tree._gen = (tree._gen || 0) + 1;
  renderItems(tree);
  if (focus) tree.focus({ preventScroll: true });
}

/** write one record's new values: a new record replaces the old one, the query runs again */
function writeTreeRecord(tree, id, patch) {
  const idField = tree._source.idField;
  const rows = tree._source.rows;
  const at = rows.findIndex((r) => r[idField] === id);
  if (at < 0) return null;
  const record = { ...rows[at], ...patch };
  const next = rows.slice();
  next[at] = record;
  tree._source.setRows(next);
  tree._writing = true;
  triggerStateChange(tree, tree.store.value, tree.store.value);
  tree._writing = false;
  // the active item follows its record (a sort may move it)
  const index = tree._result.entries.findIndex((x) => x.row[idField] === id);
  if (index >= 0) activate(tree, index);
  return record;
}

/**
 * Commit the open editor: validate (the editor, the tree's rules, validateFn), ask data-tree-beforeedit (cancelable),
 * write the record, then data-tree-edit. Returns false while the value is refused (the editor stays).
 */
function commitTreeEdit(tree, focus = true) {
  const ed = tree._editor;
  if (!ed) return true;
  let problem = ed.editor.validate?.() ?? '';
  let value;
  if (!problem) {
    try {
      value = ed.editor.getValue();
    } catch (error) {
      problem = String((error as Error).message ?? error);
    }
  }
  const ctx = treeContext(tree, ed.entry);
  if (!problem) problem = editorProblem(ctx.rules, value);
  if (!problem) {
    const answer = tree._sourceOptions?.validateFn?.(ed.field, value, ctx);
    if (typeof answer === 'string' && answer) problem = answer;
    else if (answer === false) problem = 'Invalid value';
  }
  if (problem) {
    const control = editorControl(ed.editor);
    control.setAttribute('aria-invalid', 'true');
    let note = dfDollar(ed.wrap).children('.data-tree-error').get(0);
    if (!note) {
      note = document.createElement('span');
      note.className = 'data-tree-error';
      note.setAttribute('role', 'alert');
      note.id = `dt-error-${Math.random().toString(36).slice(2, 8)}`;
      ed.wrap.append(note);
      control.setAttribute('aria-describedby', note.id);
    }
    dfDollar(note).text(problem);
    return false;
  }
  tree._editor = null;
  const oldValue = ed.value;
  // Fires before an edited value is written - cancelable: preventDefault() keeps the old value.
  const before = new CustomEvent<DataTreeBeforeEditDetail>('data-tree-beforeedit', {
    bubbles: true,
    cancelable: true,
    detail: { record: ed.entry.row, field: ed.field, value, oldValue },
  });
  const same = JSON.stringify(value) === JSON.stringify(oldValue) && !ed.editor.patch;
  if (same || !tree.dispatchEvent(before)) {
    tree._gen = (tree._gen || 0) + 1;
    renderItems(tree);
  } else {
    const record = writeTreeRecord(tree, ed.id, { ...ed.editor.patch?.(), [ed.field]: value });
    // Fires after an edited value was written - the new record, the field, the new and the old value.
    tree.dispatchEvent(
      new CustomEvent<DataTreeEditDetail>('data-tree-edit', {
        bubbles: true,
        detail: { record, field: ed.field, value, oldValue },
      }),
    );
  }
  if (focus) tree.focus({ preventScroll: true });
  return true;
}

/** evaluate the config's query, re-render; returns the visible count */
function refresh(tree, config, previous) {
  if (!tree._source) return 0;
  // a new query: the edited item may go - write it first (refused: drop it)
  if (tree._editor && !tree._writing) {
    tree._writing = true;
    if (!commitTreeEdit(tree, false)) tree._editor = null;
    tree._writing = false;
  }
  tree._result = tree._source.query({
    filters: config.filters,
    sorters: config.sorters,
    expanded: config.expanded,
    collapsed: config.collapsed,
  });
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
    tree._saved.set({
      filters: state.config.filters ?? [],
      sorters: state.config.sorters ?? [],
      expanded: state.config.expanded ?? [],
      selected: state.config.selected ?? null,
    });
  }
  // bound filter inputs show the query (a restored one too) - never the one being typed in
  if (tree.id) {
    for (const input of dfDollar<HTMLInputElement>(`[data-tree-filter="${CSS.escape(tree.id)}"]`).toArray()) {
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
  const where = viewPersistence(
    tree,
    'data-tree',
    String(dfDollar('.data-tree').toArray().indexOf(tree)),
    config || {},
  );
  tree._saved = where
    ? persisted<Record<string, unknown>>(
        where.key,
        {},
        {
          area: where.area,
          validate: (v): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v),
        },
      )
    : null;
  const kept: Record<string, unknown> = {};
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

const query = (tree, patch) =>
  dataTreeApi.setState(tree, tree.store.value.name === 'loading' ? 'loading' : 'default', patch);
const entryAt = (tree, index) => tree._result?.entries[index];

/** a record's ancestors, the root first (parent ids cached per source) */
function ancestorsOf(tree, id) {
  const src = tree._source;
  if (tree._parents?.source !== src) {
    const field = tree._parentField || 'parentId';
    const map = new Map();
    for (const row of src.rows) map.set(row[src.idField], row[field] ?? null);
    tree._parents = { source: src, map };
  }
  const map = tree._parents.map;
  const out = [];
  const seen = new Set();
  for (let at = map.get(id) ?? null; at !== null && map.has(at) && !seen.has(at); at = map.get(at) ?? null) {
    seen.add(at);
    out.unshift(at);
  }
  return out;
}

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
  } else if (open && tree.hasAttribute('data-exclusive')) {
    // one open way: the branch and its ancestors - its open siblings close, with what was open below them
    query(tree, { expanded: [...ancestorsOf(tree, id), id] });
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
  tree.dispatchEvent(
    new CustomEvent<DataTreeSelectDetail>('data-tree-select', {
      bubbles: true,
      detail: { record: entry.row, meta: entry.meta },
    }),
  );
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
  if (tree._editor && tree._editor.wrap.contains(e.target)) return;
  const index = tree._active ?? 0;
  const entry = entryAt(tree, index);
  if (!entry) return;
  const page = Math.max(1, Math.floor(tree.clientHeight / tree._rowHeight) - 1);
  switch (e.key) {
    case 'ArrowDown':
      activate(tree, index + 1);
      break;
    case 'ArrowUp':
      activate(tree, index - 1);
      break;
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
    case 'Home':
      activate(tree, 0);
      break;
    case 'End':
      activate(tree, tree._result.entries.length - 1);
      break;
    case 'PageDown':
      activate(tree, index + page);
      break;
    case 'PageUp':
      activate(tree, index - page);
      break;
    case 'F2':
      if (!openTreeEdit(tree, index)) return;
      break;
    case 'Enter':
    case ' ':
      select(tree, index);
      break;
    case '*': {
      // APG: open every sibling of the active item
      const parent = entry.meta.parentId ?? null;
      const ids = tree._result.entries
        .filter((x) => (x.meta.parentId ?? null) === parent && x.meta.hasChildren)
        .map((x) => x.row[tree._source.idField]);
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
    const input = (e.target as HTMLElement).closest?.<HTMLInputElement>('[data-tree-filter]');
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
    tree._parentField = parentIdField;
    tree._render = options.render || null;
    tree._sourceOptions = options;
    // options.query starts the view; a kept view (options.persist moves it) wins
    if (tree.store)
      dataTreeApi.setState(tree, 'default', {
        ...options.query,
        ...(options.persist ? attachPersistence(tree, options.persist) : {}),
      });
  },
  /**
   * Merge into the query: { filters?, sorters?, expanded?, selected? }.
   * @param target - the .data-tree element or its selector
   * @param patch - the query keys to change
   */
  query: (target: string | HTMLElement, patch: DataTreeQuery): void => {
    query(resolve(target), patch);
  },
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
   * Shows a record: opens the way to it (with data-exclusive only that way - every other branch closes), selects it
   * and scrolls it into view as the active item. No data-tree-select fires - the page asked for it.
   * @param target - the .data-tree element or its selector
   * @param id - the record's id
   * @returns false when the record is unknown or a filter hides it
   */
  reveal(target: string | HTMLElement, id: DataviewJsonValue): boolean {
    const tree = resolve(target);
    if (!tree?._source || !tree.store) return false;
    if (!tree._source.rows.some((r) => r[tree._source.idField] === id)) return false;
    const way = ancestorsOf(tree, id);
    const config = configOf(tree);
    if ((config.filters || []).length) {
      const collapsed = new Set(config.collapsed || []);
      for (const a of way) collapsed.delete(a);
      query(tree, { collapsed: [...collapsed], selected: id });
    } else {
      const expanded = tree.hasAttribute('data-exclusive') ? way : [...new Set([...(config.expanded || []), ...way])];
      query(tree, { expanded, selected: id });
    }
    const index = tree._result?.entries.findIndex((e) => e.row[tree._source.idField] === id) ?? -1;
    if (index < 0) return false;
    activate(tree, index);
    return true;
  },
  /**
   * The tree's query source: its records (source.rows - every edit included) and the cached query over them.
   * @param target - the .data-tree element or its selector
   * @returns its source, undefined before setSource()
   */
  source: (target: string | HTMLElement): DataSource<DataviewRow> | undefined => resolve(target)._source,
  /**
   * Open the editor of a record's item (data-editable on the tree) - its branch opens and it scrolls into view first.
   * @param target - the .data-tree element or its selector
   * @param id - the record's id
   * @returns false when it does not edit (no such record, no data-editable, getEditorFn answered false)
   */
  edit(target: string | HTMLElement, id: DataviewJsonValue): boolean {
    const tree = resolve(target);
    if (!(df$.dataTree as { reveal(t: HTMLElement, id: DataviewJsonValue): boolean }).reveal(tree, id)) return false;
    const index = tree._result.entries.findIndex((x) => x.row[tree._source.idField] === id);
    return openTreeEdit(tree, index);
  },
  /**
   * Commit the open editor.
   * @param target - the .data-tree element or its selector
   * @returns false when its value is refused (the editor stays open with the message); true otherwise
   */
  commit: (target: string | HTMLElement): boolean => commitTreeEdit(resolve(target)),
  /**
   * Close the open editor without writing.
   * @param target - the .data-tree element or its selector
   */
  cancel: (target: string | HTMLElement): void => cancelTreeEdit(resolve(target)),
  /**
   * Write new values into one record from script - what an edit writes. The record is replaced by a new object; the
   * query runs again. Fires data-tree-edit per field.
   * @param target - the .data-tree element or its selector
   * @param id - the record's id
   * @param patch - the fields to change and their new values
   * @returns the new record, null when no record has that id
   */
  update(target: string | HTMLElement, id: DataviewJsonValue, patch: DataviewRow): DataviewRow | null {
    const tree = resolve(target);
    const old = tree._source.rows.find((r) => r[tree._source.idField] === id);
    if (!old) return null;
    const record = writeTreeRecord(tree, id, patch);
    for (const field of Object.keys(patch))
      tree.dispatchEvent(
        new CustomEvent<DataTreeEditDetail>('data-tree-edit', {
          bubbles: true,
          detail: { record, field, value: patch[field], oldValue: old[field] },
        }),
      );
    return record;
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
  dfDollar('.data-tree:not([data-init])')
    .toArray()
    .forEach((tree) => {
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
      const config = {
        filters: [],
        sorters: [],
        expanded: [],
        collapsed: [],
        selected: null,
        ...early.query,
        ...attachPersistence(tree, early.persist),
      };

      let queued = false;
      tree.addEventListener(
        'scroll',
        () => {
          if (queued) return;
          queued = true;
          requestAnimationFrame(() => {
            queued = false;
            renderItems(tree);
          });
        },
        { passive: true },
      );
      new ResizeObserver(() => renderItems(tree)).observe(tree);
      tree.addEventListener('click', (e) => onClick(tree, e));
      tree.addEventListener('keydown', (e) => onKeydown(tree, e));
      // a double click on an item edits it (data-editable)
      tree.addEventListener('dblclick', (e) => {
        const item = (e.target as HTMLElement).closest?.<HTMLElement & { _index?: number }>('.data-tree-item');
        if (!item || !tree._pool.contains(item) || (e.target as HTMLElement).closest('.data-tree-toggle')) return;
        if (openTreeEdit(tree, item._index)) e.preventDefault();
      });

      // el.store + el.api (AGENTS.md "State through stores"): no records yet = loading
      bindComponent(tree, dataTreeApi, { name: tree._source ? 'default' : 'loading', config });
      dataTreeApi.setState(tree, tree._source ? 'default' : 'loading', config);
    });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
