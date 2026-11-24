// -- Data Grid ------------------------------------------------
// A grid over any number of records: only the rows on screen exist in the
// DOM (shared windowing, src/shared/virtual.ts) and every query runs locally
// over all rows through defuss-dataview (src/shared/dataview.ts) - multisort,
// column filters, locked columns, pages, infinite loading, selection - and
// columns a reader arranges: a menu per header (sort, lock, show / hide),
// dragged into another place, resized at their edge (touch: hold, then drag). With
// data-parent-field every row may have a parent: the grid becomes an ARIA
// treegrid that still filters, sorts and pages.
//
// The query IS the state's config (AGENTS.md "State through stores"):
// el.store.value.config = { filters, sorters, locked, columns, hidden, widths,
// page, expanded, collapsed, selected } - plain JSON any code can subscribe to
// or set. The view (sort, filters, the columns' order, lock, visibility and
// widths, open rows) survives a reload: session
// storage by default, local storage or nothing per instance (data-persist,
// data-persist-prefix / -key, or setSource's persist option).

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import {
  defussGlobals,
  defussQuery,
  textLocale,
  componentState,
  bindComponent,
  persisted,
  viewPersistence,
  dataSource,
  parseFilter,
  filterText,
  cycleSort,
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
  carriesRecords,
  dropEffectFor,
  dropEffects,
  droppedRecords,
  endRecordDrag,
  placeRecords,
  recordDrag,
  startRecordDrag,
  subtreeOf,
  withoutRecords,
} from '../../../shared/state-api.js';
import type { CellEditor, EditorRules } from '../../../shared/editors.js';
import type { DropEffect, DropPlace, RecordDrag } from '../../../shared/record-drag.js';
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

/** The grid's query - its state config (merged on every query()). */
type DataGridQuery = {
  /** filters over every record (a tree grid shows a match with its ancestors) */
  filters?: DataviewFilter[];
  /** the sort order - several sorters sort by each in turn */
  sorters?: DataviewSorter[];
  /** the fields of the locked columns - they stick at the start, in column order */
  locked?: string[];
  /** every field in the order the reader arranged (locked columns still come first) */
  columns?: string[];
  /** the fields of the hidden columns */
  hidden?: string[];
  /** the widths in px of the columns the reader resized (the rest keep data-width) */
  widths?: Record<string, number>;
  /** the page shown, 0-based (data-paging="pages") */
  page?: number;
  /** tree grid: the ids of the open rows */
  expanded?: DataviewJsonValue[];
  /** tree grid, while filtering: the rows the user closed again */
  collapsed?: DataviewJsonValue[];
  /** the ids of the selected rows (data-select-model "row" - the default -, "checkbox" and "row column") */
  selected?: DataviewJsonValue[];
  /** the fields of the selected columns (data-select-model "column" and "row column") */
  selectedColumns?: string[];
  /** the selected cell ranges (data-select-model "cell") */
  selectedRanges?: DataGridRange[];
};

/** A cell: a record and a column. */
interface DataGridCellRef {
  /** the record's id */
  id: DataviewJsonValue;
  /** the column's field */
  field: string;
}

/** A rectangle of cells: every cell between two corners, wherever the query places their records and the reader
 *  arranged their columns (a corner the query does not show drops the range). */
interface DataGridRange {
  /** the corner the selection started at */
  from: DataGridCellRef;
  /** the opposite corner */
  to: DataGridCellRef;
}

/** A pasted value the grid did not write. */
interface DataGridPasteRefusal {
  /** the record's id */
  id: DataviewJsonValue;
  /** the column's field */
  field: string;
  /** the pasted text */
  text: string;
  /** why: the broken rule's message, 'Not a number', 'Not one of ...', or 'Cancelled' (data-grid-beforeedit) */
  message: string;
}

/** What a paste did - what paste() returns and data-grid-paste carries. */
interface DataGridPasteDetail {
  /** the cells whose value changed */
  written: number;
  /** the cells of the target that do not edit (no data-editable, or getEditorFn answered false) */
  skipped: number;
  /** the values refused, with the reason */
  refused: DataGridPasteRefusal[];
}

/** What data-grid-copy carries. */
interface DataGridCopyDetail {
  /** the tab-separated values put on the clipboard (an HTML table of them beside it) */
  text: string;
  /** how many rows were copied */
  rows: number;
  /** how many columns were copied */
  columns: number;
}

/** Where a record sits - what a custom cell receives. */
interface DataGridRowMeta {
  /** tree grid: 0 for a root row */
  depth: number;
  /** tree grid: whether it has child rows */
  hasChildren: boolean;
  /** tree grid: whether its children show */
  isExpanded: boolean;
  /** whether it matches the filters (false for an ancestor shown for a match) */
  isMatch: boolean;
  /** whether it is selected */
  isSelected: boolean;
  /** tree grid: its parent's id, null for a root */
  parentId: DataviewJsonValue | null;
}

/** Where an edit happens - what getEditorFn and validateFn receive. */
interface DataGridEditContext {
  /** the record being edited (unchanged until the edit commits) */
  record: DataviewRow;
  /** the column's field */
  field: string;
  /** the type the value edits as (data-editor, else the column's data-type, else the value's) */
  type: string;
  /** the column's rules (data-required, data-min, data-max, data-integer, data-pattern, data-options) */
  rules: EditorRules;
  /** the grid element */
  grid: HTMLElement;
}

/** What setSource() takes besides the records. */
interface DataGridOptions {
  /** an editor for a cell of an editable column: an element or a CellEditor ({ el, getValue, validate?, focus?,
   *  immediate?, multiline?, ownsEnter? }); null: the built-in one; false: this cell does not edit */
  getEditorFn?: (field: string, value: unknown, ctx: DataGridEditContext) => HTMLElement | CellEditor | null | false;
  /** refuse a value: return a message, or false for a generic one; anything else accepts it */
  validateFn?: (field: string, value: unknown, ctx: DataGridEditContext) => string | false | null | undefined;
  /** the id field (default 'id', or data-id-field) */
  idField?: string;
  /** a tree grid: the parent-id field (or data-parent-field) */
  parentIdField?: string;
  /** custom cell content per field: fill the cell's content element */
  cells?: Record<string, (el: HTMLElement, record: DataviewRow, meta: DataGridRowMeta) => void>;
  /** data-paging="infinite" from a remote source: the next records from offset (an empty answer ends the loading) */
  load?: (offset: number, size: number) => Promise<DataviewRow[]>;
  /** the starting query (a kept view wins over it) */
  query?: DataGridQuery;
  /** where the view is kept between visits (default: session storage under a generated key) */
  persist?: ViewPersistence;
}

/** What data-grid-beforeedit carries. */
interface DataGridBeforeEditDetail {
  /** the record as it is */
  record: DataviewRow;
  /** the column's field */
  field: string;
  /** the value about to be written */
  value: unknown;
  /** the value it holds now */
  oldValue: unknown;
}

/** What data-grid-edit carries. */
interface DataGridEditDetail {
  /** the record as it is now (a new object - the old one is never mutated) */
  record: DataviewRow;
  /** the column's field */
  field: string;
  /** the value written */
  value: unknown;
  /** the value it held */
  oldValue: unknown;
}

/** What data-grid-activate carries. */
interface DataGridActivateDetail {
  /** the row's record */
  record: DataviewRow;
  /** its position in the query (every page) */
  index: number;
}

/** Where records land in a grid: beside a record (before / after), into it (a tree grid: as its children), or at the
 *  end. */
interface DataGridDropAt {
  /** the record the records land beside or into; null at the end */
  id: DataviewJsonValue | null;
  /** 'before', 'after', 'into' (a tree grid) or 'end' */
  place: DropPlace;
}

/** What data-grid-beforedrop carries - cancel it to refuse the drop. */
interface DataGridBeforeDropDetail {
  /** the records as they will be inserted (new ids where a copy or a taken id needs one) */
  records: DataviewRow[];
  /** 'move' (they leave their source) or 'copy' */
  effect: DropEffect;
  /** the component they come from (a grid, a tree; this grid when they move within it); null from another document */
  source: HTMLElement | null;
  /** where they land */
  at: DataGridDropAt;
}

/** What data-grid-drop carries. */
interface DataGridDropDetail {
  /** the records as they were inserted */
  records: DataviewRow[];
  /** 'move' or 'copy' */
  effect: DropEffect;
  /** the component they came from; null from another document */
  source: HTMLElement | null;
  /** where they landed */
  at: DataGridDropAt;
}

/** What data-grid-dragend carries - on the grid the records were dragged from. */
interface DataGridDragEndDetail {
  /** the records dragged (on a move they have left this grid) */
  records: DataviewRow[];
  /** 'move' or 'copy' */
  effect: DropEffect;
  /** the component that took them */
  target: HTMLElement;
}

const dataGridStates = ['default', 'loading', 'empty'];

/** setState() configs per state - the config IS the grid's query, merged into the stored one ({ page: 3 } keeps the filters). */
export interface DataGridStateConfigs {
  /** The rows of the query; a query nothing matches lands in empty. */
  default: DataGridQuery;
  /** Busy: skeleton rows, aria-busy - a grid without records (or waiting for load()) starts here. */
  loading: DataGridQuery;
  /** No rows: the data-empty-text shows. */
  empty: DataGridQuery;
}

/** the part that is persisted (selection and the open page are per visit) */
const SAVED_KEYS = ['filters', 'sorters', 'locked', 'columns', 'hidden', 'widths', 'expanded'];

/** a kept value of one of SAVED_KEYS: widths is a map of numbers, every other key a list */
const keepable = (key, value) =>
  key === 'widths'
    ? typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.values(value).every((w) => typeof w === 'number' && w > 0)
    : Array.isArray(value);

const numberFormat = new Map();
/** a cell value as text: data-format="number" | "currency:EUR" | "percent" | "date" - in the text's locale (the grid's nearest [lang], else 'en') */
function format(value, spec, el) {
  if (value == null) return '';
  if (!spec) return String(value);
  const locale = textLocale(el);
  if (spec === 'date') {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(locale);
  }
  const key = `${locale}|${spec}`;
  if (!numberFormat.has(key)) {
    const [style, currency] = spec.split(':');
    numberFormat.set(
      key,
      new Intl.NumberFormat(
        locale,
        style === 'currency'
          ? { style, currency: currency || 'USD' }
          : style === 'percent'
            ? { style, maximumFractionDigits: 1 }
            : {},
      ),
    );
  }
  return typeof value === 'number' ? numberFormat.get(key).format(value) : String(value);
}

/** the header row: the first row of the head */
const headerRowOf = (root) => dfDollar(root).find('.data-grid-head > .data-grid-row').get(0);
/** the authored column headers of a grid (or of a detached copy), in DOM order */
const headersOf = (root) => {
  const row = headerRowOf(root);
  return row ? dfDollar(row).children('.data-grid-header').toArray() : [];
};

/** The columns, read once from the authored headers (authored order). */
function readColumns(grid) {
  return headersOf(grid).map((el) => ({
    el,
    field: el.dataset.field,
    filter: el.dataset.filter || '',
    type: el.dataset.type === 'number' ? 'number' : 'text',
    // data-format="" keeps the raw value (an id needs no thousands separator)
    format: el.hasAttribute('data-format') ? el.dataset.format : el.dataset.type === 'number' ? 'number' : '',
    width: el.dataset.width || 'minmax(8rem, 1fr)',
    align: el.dataset.align || (el.dataset.type === 'number' ? 'end' : ''),
    sortable: el.dataset.sortable !== 'false',
    lockable: el.dataset.lockable !== 'false',
    hideable: el.dataset.hideable !== 'false',
    resizable: el.dataset.resizable !== 'false',
    movable: el.dataset.movable !== 'false',
    // the authored arrangement - what Reset columns returns to
    lockedAtStart: el.hasAttribute('data-locked'),
    hiddenAtStart: el.hidden,
    // sort by another field than the one shown (a priority's rank, not its label)
    sortField: el.dataset.sortField || el.dataset.field,
    options: el.dataset.options ? el.dataset.options.split(',').map((o) => o.trim()) : null,
    // inline editing: data-editable, the editor's type (data-editor) and the rules a value must keep
    editable: el.hasAttribute('data-editable'),
    editor: el.dataset.editor || '',
    rules: columnRules(el),
  }));
}

/** a column's edit rules, from its header's attributes */
function columnRules(el: HTMLElement): EditorRules {
  const num = (name) => (el.dataset[name] != null && el.dataset[name] !== '' ? Number(el.dataset[name]) : undefined);
  const rules: EditorRules = {};
  if (el.hasAttribute('data-required')) rules.required = true;
  if (el.hasAttribute('data-integer')) rules.integer = true;
  if (num('min') != null) rules.min = num('min');
  if (num('max') != null) rules.max = num('max');
  if (el.dataset.step) rules.step = el.dataset.step;
  if (num('minLength') != null) rules.minLength = num('minLength');
  if (num('maxLength') != null) rules.maxLength = num('maxLength');
  if (el.dataset.pattern) rules.pattern = el.dataset.pattern;
  if (el.dataset.message) rules.message = el.dataset.message;
  return rules;
}

/**
 * The persisted view: where (viewPersistence: data-persist, -prefix, -key,
 * or the config) and what was kept there. Re-attaching (setSource with a
 * persist option) moves the instance to the new place.
 */
function attachPersistence(grid, config) {
  grid._saved?.destroy();
  const where = viewPersistence(
    grid,
    'data-grid',
    String(dfDollar('.data-grid').toArray().indexOf(grid)),
    config || {},
  );
  grid._saved = where
    ? persisted<Record<string, unknown>>(
        where.key,
        {},
        {
          area: where.area,
          validate: (v): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v),
        },
      )
    : null;
  const kept = {};
  for (const k of SAVED_KEYS) if (keepable(k, grid._saved?.value[k])) kept[k] = grid._saved.value[k];
  return kept;
}

/** the authored sort: data-sort="asc|desc" on headers, in column order */
const authoredSort = (grid) =>
  grid._columns
    .filter((c) => c.el.dataset.sort === 'asc' || c.el.dataset.sort === 'desc')
    .map((c) => ({ field: c.sortField, direction: c.el.dataset.sort }));

/** locked fields first (in the given order), then the rest */
function ordered(items, locked, fieldOf) {
  const set = new Set(locked || []);
  return [...items.filter((i) => set.has(fieldOf(i))), ...items.filter((i) => !set.has(fieldOf(i)))];
}

/** the items in the reader's column order (config.columns; a field it does not name keeps its authored place after them) */
function inColumnOrder(items, config, fieldOf) {
  const rank = new Map<string, number>((config.columns || []).map((f, i) => [f, i]));
  const at = (item, i) => rank.get(fieldOf(item)) ?? rank.size + i;
  return items
    .map((item, i) => [at(item, i), item])
    .sort((a, b) => a[0] - b[0])
    .map((p) => p[1]);
}

/** the display order: the column order, locked columns first */
const arrange = (items, config, fieldOf) => ordered(inColumnOrder(items, config, fieldOf), config.locked, fieldOf);

/**
 * The markup of a state, for render() AND the live element (one function):
 * header order (locked columns first), data-locked, aria-sort and the sort
 * priority. 'default' with the authored config IS the authored markup.
 */
function applyMarkup(root, state) {
  const config = state.config || {};
  const headers = root._columns ? root._columns.map((c) => c.el) : headersOf(root);
  const row = headerRowOf(root);
  const locked = new Set(config.locked || []);
  const sorters = config.sorters || [];
  const hidden = new Set(config.hidden || []);
  // the column models: a header says whether its column is selected
  const picked = selectsColumns(root) ? new Set(config.selectedColumns || []) : null;
  // never every column (layoutColumns shows them all then)
  if (headers.every((el) => hidden.has(el.dataset.field))) hidden.clear();
  const order = arrange(headers, config, (el) => el.dataset.field);
  // only move what is out of place: an authored order stays untouched
  if (row && order.some((el, i) => dfDollar(row).children('.data-grid-header').get(i) !== el)) {
    order.forEach((el) => dfDollar(row).append(el));
  }
  for (const el of headers) {
    const at = sorters.findIndex((s) => s.field === (el.dataset.sortField || el.dataset.field));
    const dir = at < 0 ? null : sorters[at].direction || sorters[at].dir || 'asc';
    dfDollar(el)
      .attr('data-locked', locked.has(el.dataset.field) ? '' : null)
      .attr('hidden', hidden.has(el.dataset.field) ? '' : null)
      .attr('aria-sort', dir ? (dir === 'asc' ? 'ascending' : 'descending') : null)
      .attr('data-sort-index', dir && sorters.length > 1 ? String(at + 1) : null)
      .attr('aria-selected', picked ? String(picked.has(el.dataset.field)) : null);
  }
  dfDollar(root).attr('data-state', state.name);
  // the grid is the viewport (init): it is the one busy
  dfDollar(root)
    .children('.data-grid-viewport')
    .attr('aria-busy', state.name === 'loading' ? 'true' : null);
}

// -- selection models -----------------------------------------------------------
// data-select turns selection on (single | multiple); data-select-model picks what a click, a key or a sweep
// selects: rows (the default), cells (Excel's ranges), columns, or rows and columns ("row column": a cell's row, a
// header's column - one kind at a time). The selection is config: selected (row ids), selectedColumns (fields),
// selectedRanges (corner records and fields) - JSON a page can store, set and follow.

type SelectionModel = 'row' | 'checkbox' | 'cell' | 'column' | 'both';
type SelectionKind = 'row' | 'cell' | 'column';

/** the grid's selection model: none without data-select */
function modelOf(grid): SelectionModel | null {
  if (!grid.dataset?.select) return null;
  const words = (grid.dataset.selectModel || 'row').split(/\s+/);
  if (words.includes('cell')) return 'cell';
  // rows, with a checkbox in front of each (and one for all in the head)
  if (words.includes('checkbox')) return 'checkbox';
  const rows = words.includes('row');
  const columns = words.includes('column');
  return rows && columns ? 'both' : columns ? 'column' : 'row';
}
const multi = (grid) => grid.dataset.select === 'multiple';
function selectsColumns(grid) {
  const model = modelOf(grid);
  return model === 'column' || model === 'both';
}
/** what a click, a key or a sweep in the body selects */
function bodyKind(grid): SelectionKind {
  const model = modelOf(grid);
  return model === 'cell' ? 'cell' : model === 'column' ? 'column' : 'row';
}
/** a click's way of selecting: Shift extends, Ctrl / Cmd toggles, else just this one */
const howOf = (e) => (e.shiftKey ? 'range' : e.ctrlKey || e.metaKey ? 'toggle' : 'only');

/** a record's position in a query result: one id map per result, built when first asked */
const positions = new WeakMap<object, Map<unknown, number>>();
function indexOfId(grid, id) {
  const result = grid._result;
  if (!result || !grid._source) return -1;
  let map = positions.get(result);
  if (!map) {
    const field = grid._source.idField;
    const built = new Map<unknown, number>();
    result.entries.forEach((e, i) => built.set(e.row[field], i));
    positions.set(result, built);
    map = built;
  }
  return map.get(id) ?? -1;
}
/** the id of the record at a position in the query */
const idAt = (grid, g) => (g >= 0 ? grid._result?.entries[g]?.row[grid._source.idField] : undefined);
/** a column's place in the shown order */
const colOf = (grid, field) => grid._order.findIndex((c) => c.field === field);

/**
 * The selection over the query as a test per cell - g a position in the query, c a column in the shown order. Rows
 * and columns are set lookups; ranges are boxes resolved from their corners.
 */
function selectionView(grid, config) {
  const model = modelOf(grid);
  if (!model || !grid._source || !grid._order) return null;
  const n = grid._result?.entries.length ?? 0;
  const m = grid._order.length;
  if (model === 'cell') {
    const boxes: { r0: number; r1: number; c0: number; c1: number }[] = [];
    for (const r of config.selectedRanges || []) {
      const a = indexOfId(grid, r?.from?.id);
      const b = indexOfId(grid, r?.to?.id);
      const c = colOf(grid, r?.from?.field);
      const d = colOf(grid, r?.to?.field);
      if (a < 0 || b < 0 || c < 0 || d < 0) continue;
      boxes.push({ r0: Math.min(a, b), r1: Math.max(a, b), c0: Math.min(c, d), c1: Math.max(c, d) });
    }
    return {
      kind: 'cell' as const,
      boxes,
      has: (g, c) => boxes.some((b) => g >= b.r0 && g <= b.r1 && c >= b.c0 && c <= b.c1),
    };
  }
  const fields = config.selectedColumns || [];
  if (model === 'column' || (model === 'both' && fields.length)) {
    const cols = new Set<number>(fields.map((f) => colOf(grid, f)).filter((c) => c >= 0));
    return { kind: 'column' as const, cols, has: (g, c) => g >= 0 && g < n && cols.has(c) };
  }
  const rows = grid._selected as Set<unknown>;
  return { kind: 'row' as const, rows, has: (g, c) => c >= 0 && c < m && g >= 0 && g < n && rows.has(idAt(grid, g)) };
}

/** how many distinct cells boxes cover (they may overlap): row bands between their edges, merged column spans */
function areaOf(boxes) {
  const ys = [...new Set<number>(boxes.flatMap((b) => [b.r0, b.r1 + 1]))].sort((a, b) => a - b);
  let total = 0;
  for (let i = 0; i < ys.length - 1; i++) {
    const spans = boxes
      .filter((b) => b.r0 <= ys[i] && b.r1 >= ys[i])
      .map((b) => [b.c0, b.c1])
      .sort((a, b) => a[0] - b[0]);
    let width = 0;
    let end = -1;
    for (const [c0, c1] of spans) {
      if (c1 <= end) continue;
      width += c1 - Math.max(c0, end + 1) + 1;
      end = c1;
    }
    total += width * (ys[i + 1] - ys[i]);
  }
  return total;
}

/** the footer's word on the selection */
function selectionText(view, count) {
  if (!view) return '';
  if (view.kind === 'row') return view.rows.size ? ` · ${count(view.rows.size)} selected` : '';
  if (view.kind === 'column') {
    const n = view.cols.size;
    return n ? ` · ${count(n)} ${n === 1 ? 'column' : 'columns'} selected` : '';
  }
  const n = areaOf(view.boxes);
  return n ? ` · ${count(n)} ${n === 1 ? 'cell' : 'cells'} selected` : '';
}

// -- the query --------------------------------------------------------------

// the config being shown: set first thing in apply (the store records it
// only AFTER the DOM work - reading the store there would be one step behind)
const configOf = (grid) => grid._config ?? grid.store?.value.config ?? {};
const isTree = (grid) => !!grid._source?.tree;
const paging = (grid) => grid.dataset.paging || 'virtual';
const pageSize = (grid) => Math.max(1, parseInt(grid.dataset.pageSize || '50', 10) || 50);

/** evaluate the config's query (cached per query inside the source) */
function evaluate(grid, config) {
  if (!grid._source) return (grid._result = { entries: [], totalRows: 0, matchedRows: 0, visibleRows: 0 });
  return (grid._result = grid._source.query({
    filters: config.filters,
    sorters: config.sorters,
    expanded: config.expanded,
    collapsed: config.collapsed,
  }));
}

/** the entries the body shows: everything (virtual), one page, or the pages loaded */
function shown(grid, config) {
  const entries = grid._result?.entries ?? [];
  const mode = paging(grid);
  if (mode === 'virtual') return entries;
  const size = pageSize(grid);
  const page = Math.max(0, config.page || 0);
  return mode === 'pages' ? entries.slice(page * size, (page + 1) * size) : entries.slice(0, (page + 1) * size);
}
const pageCount = (grid) => Math.max(1, Math.ceil((grid._result?.entries.length ?? 0) / pageSize(grid)));

// -- layout -----------------------------------------------------------------

const parts = (grid) => grid._parts;
const rowHeight = (grid) => grid._rowHeight;

/** column template + the sticky offsets of the locked columns */
function layoutColumns(grid, config) {
  const all = arrange(grid._columns, config, (c) => c.field);
  const hidden = new Set(config.hidden || []);
  // a kept view that hides every column (its fields renamed since) shows them all
  const visible = all.filter((c) => !hidden.has(c.field));
  const columns = visible.length ? visible : all;
  grid._order = columns;
  const widths = config.widths || {};
  const check = syncCheckHead(grid);
  grid.style.setProperty(
    '--data-grid-template',
    (check ? 'var(--data-grid-check-width) ' : '') +
      columns.map((c) => (widths[c.field] > 0 ? `${widths[c.field]}px` : c.width)).join(' '),
  );
  const locked = new Set(config.locked || []);
  // offsets are measured: widths may be rem, minmax(), fr - the checkbox column sticks first, the locked ones after it
  let left = check ? check.getBoundingClientRect().width : 0;
  grid._lockLeft = {};
  for (const column of columns) {
    if (!locked.has(column.field)) {
      column.el.style.removeProperty('inset-inline-start');
      continue;
    }
    grid._lockLeft[column.field] = left;
    column.el.style.insetInlineStart = `${left}px`;
    left += column.el.getBoundingClientRect().width;
  }
  grid.toggleAttribute('data-has-locked', locked.size > 0);
}

// -- the checkbox model: a checkbox in front of every row, one in the head for all ---------------------------------

/** the checkbox model is on */
const checks = (grid) => modelOf(grid) === 'checkbox';

/**
 * A check cell: the system's Checkbox in a cell of its own, first in its row whatever the column order (CSS order) -
 * the row's last child, so every column keeps its index. Hidden from assistive technology: the row's aria-selected
 * says what it says, and Space selects from the keyboard.
 */
function checkCell(withBox = true) {
  const cell = document.createElement('div');
  cell.className = 'data-grid-check';
  cell.setAttribute('aria-hidden', 'true');
  if (withBox) {
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'checkbox';
    box.tabIndex = -1;
    cell.append(box);
  }
  return cell;
}

/** the head's check cell, made or taken away with the model; returns it while the model is on */
function syncCheckHead(grid) {
  const row = headerRowOf(grid);
  const on = checks(grid);
  if (on && !grid._parts.check && row) {
    grid._parts.check = checkCell();
    row.append(grid._parts.check);
  } else if (!on && grid._parts.check) {
    grid._parts.check.remove();
    grid._parts.check = null;
  }
  return grid._parts.check ?? null;
}

/** the head's checkbox: checked when every row of the query is selected, mixed when some are */
function syncCheckAll(grid) {
  const box = grid._parts.check?.firstElementChild as HTMLInputElement | undefined;
  if (!box) return;
  const idField = grid._source?.idField ?? 'id';
  const entries = grid._result?.entries ?? [];
  let n = 0;
  if (grid._selected.size) for (const e of entries) if (grid._selected.has(e.row[idField])) n++;
  box.checked = n > 0 && n === entries.length;
  box.indeterminate = n > 0 && n < entries.length;
  box.disabled = !multi(grid) || !entries.length;
}

/** the head's checkbox clicked: every row of the query selected, or - all were - none of them */
function toggleAll(grid) {
  if (!multi(grid)) return;
  const idField = grid._source?.idField ?? 'id';
  const ids = (grid._result?.entries ?? []).map((e) => e.row[idField]);
  const all = ids.length > 0 && ids.every((id) => grid._selected.has(id));
  const shown = new Set(ids);
  setSelection(grid, {
    selected: all ? [...grid._selected].filter((id) => !shown.has(id)) : [...new Set([...grid._selected, ...ids])],
  });
}

/** the filter row (columns with data-filter): built once, kept in step */
function buildFilters(grid) {
  if (!grid._columns.some((c) => c.filter) || grid._parts.filters) return;
  const row = document.createElement('div');
  row.className = 'data-grid-row data-grid-filters';
  row.setAttribute('role', 'row');
  row.setAttribute('aria-rowindex', '2');
  grid._parts.filters = row;
  dfDollar(grid._parts.head).append(row);
}

function syncFilters(grid, config) {
  const row = grid._parts.filters;
  if (!row) return;
  const filters = config.filters || [];
  const locked = new Set(config.locked || []);
  // rebuilt only when the column order changed; values are properties
  const key = grid._order.map((c) => c.field).join('|') + (checks(grid) ? '|check' : '');
  if (row._key !== key) {
    row._key = key;
    row.textContent = '';
    // the checkbox column's place in the filter row
    if (checks(grid)) row.append(checkCell(false));
    for (const column of grid._order) {
      const cell = document.createElement('div');
      cell.className = 'data-grid-filter-cell';
      cell.setAttribute('role', 'gridcell');
      cell.dataset.field = column.field;
      if (column.filter) {
        const label = `Filter ${column.el.textContent.trim()}`;
        let input;
        if (column.filter === 'select') {
          input = document.createElement('select');
          const options = column.options || distinct(grid, column.field);
          const all = document.createElement('option');
          all.value = '';
          all.textContent = 'All';
          input.append(
            all,
            ...options.map((o) => Object.assign(document.createElement('option'), { value: o, textContent: o })),
          );
        } else {
          input = document.createElement('input');
          input.type = 'search';
          input.placeholder = column.type === 'number' ? '> 100' : 'Filter…';
          input.inputMode = column.type === 'number' ? 'decimal' : 'search';
          input.autocomplete = 'off';
        }
        input.className = 'data-grid-filter';
        input.dataset.field = column.field;
        input.dataset.kind = column.filter === 'select' ? 'select' : column.type;
        input.setAttribute('aria-label', label);
        cell.append(input);
      }
      row.append(cell);
    }
  }
  for (const cell of dfDollar(row).children('.data-grid-filter-cell').toArray()) {
    const field = cell.dataset.field;
    if (locked.has(field)) cell.style.insetInlineStart = `${grid._lockLeft[field] ?? 0}px`;
    else cell.style.removeProperty('inset-inline-start');
    cell.toggleAttribute('data-locked', locked.has(field));
    const input = cell.firstElementChild as HTMLInputElement | null;
    // never under the cursor: the person is typing in it
    if (input && input !== document.activeElement) input.value = filterText(filters.find((f) => f.field === field));
  }
}

/** the values a select filter offers (first 100 distinct, sorted) */
function distinct(grid, field) {
  const seen = new Set();
  for (const row of grid._source?.rows ?? []) {
    if (row[field] != null) seen.add(String(row[field]));
    if (seen.size >= 100) break;
  }
  return [...seen].sort();
}

/** a header's label: its text (the tools the runtime adds carry none) */
const labelOf = (column) => column.el.textContent.trim();

/** per header: the menu button (the arrow) and, unless data-resizable="false", the resize handle at its end edge */
function buildHeaderTools(grid) {
  for (const column of grid._columns) {
    const label = labelOf(column);
    if (!dfDollar(column.el).children('.data-grid-menu-button').get(0)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'data-grid-menu-button';
      button.tabIndex = -1;
      button.dataset.field = column.field;
      button.setAttribute('aria-haspopup', 'menu');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', `${label} column menu`);
      dfDollar(column.el).append(button);
    }
    if (column.resizable && !dfDollar(column.el).children('.data-grid-resizer').get(0)) {
      const handle = document.createElement('span');
      handle.className = 'data-grid-resizer';
      handle.dataset.field = column.field;
      handle.setAttribute('role', 'separator');
      handle.setAttribute('aria-orientation', 'vertical');
      handle.setAttribute('aria-label', `Resize ${label}`);
      dfDollar(column.el).append(handle);
    }
  }
}

// -- rendering --------------------------------------------------------------

/** fill one body cell */
function fillCell(grid, cell, column, entry, first) {
  const record = entry.row;
  cell.dataset.field = column.field;
  cell.toggleAttribute('data-locked', column.field in grid._lockLeft);
  if (column.field in grid._lockLeft) cell.style.insetInlineStart = `${grid._lockLeft[column.field]}px`;
  else cell.style.removeProperty('inset-inline-start');
  if (column.align) cell.dataset.align = column.align;
  else delete cell.dataset.align;
  cell.toggleAttribute('data-editable', !!column.editable && !grid.hasAttribute('data-readonly'));
  delete cell.dataset.editing;
  cell.textContent = '';
  if (first && isTree(grid)) {
    cell.style.setProperty('--depth', String(entry.meta.depth));
    const toggle = document.createElement('span');
    toggle.className = 'data-grid-toggle';
    toggle.setAttribute('aria-hidden', 'true');
    if (!entry.meta.hasChildren) toggle.dataset.leaf = '';
    cell.append(toggle);
  } else {
    cell.style.removeProperty('--depth');
  }
  const custom = grid._cells?.[column.field];
  if (custom) {
    const host = document.createElement('span');
    host.className = 'data-grid-content';
    custom(host, record, entry.meta);
    cell.append(host);
  } else {
    const text = document.createElement('span');
    text.className = 'data-grid-content';
    text.textContent = format(record[column.field], column.format, grid);
    cell.append(text);
  }
}

/** writes the window of rows that belongs at the current scroll position */
function renderRows(grid) {
  const { viewport, body, pool } = parts(grid);
  if (!pool || !grid._order) return;
  const config = configOf(grid);
  const entries = grid._shown || [];
  const total = entries.length;
  const headH = grid._parts.head.offsetHeight;
  const view = Math.max(rowHeight(grid), viewport.clientHeight - headH);
  const win = virtualWindow(Math.max(0, viewport.scrollTop), view, rowHeight(grid), total);
  body.style.height = `${sizerHeight(total, rowHeight(grid))}px`;
  while (pool.children.length < win.count) {
    const row = document.createElement('div');
    row.className = 'data-grid-row';
    row.setAttribute('role', 'row');
    pool.append(row);
  }
  while (pool.children.length > win.count) pool.lastElementChild.remove();
  pool.style.translate = `0 ${win.shift}px`;
  const selected = grid._selected;
  const base = paging(grid) === 'pages' ? Math.max(0, config.page || 0) * pageSize(grid) : 0;
  const headRows = grid._parts.filters ? 2 : 1;
  const focus = grid._focus;
  let edShown = false;
  // the selection: rows carry aria-selected in the row models, cells in the others; every selected cell is marked
  // (data-selected) and names the edges of its region it lies on (data-edge) - the strong line is drawn there
  const model = modelOf(grid);
  const sel = selectionView(grid, config);
  // the checkbox column is column -1: part of a selected row's frame
  const checkOn = model === 'checkbox';
  const isSel = (g, c) =>
    !!sel && g >= base && g < base + total && (c === -1 ? checkOn && sel.has(g, 0) : sel.has(g, c));
  const rowAria = model === 'row' || model === 'checkbox' || model === 'both';
  const cellAria = model === 'cell' || model === 'column' || model === 'both';
  const hover = grid._hover ?? null;
  const columns = grid._order.length;
  const draggable = grid.hasAttribute('data-drag');
  for (let i = 0; i < pool.children.length; i++) {
    const row = pool.children[i];
    const index = win.first + i;
    const entry = entries[index];
    const key = `${grid._gen}:${index}`;
    if (row._key !== key) {
      row._key = key;
      row._index = index;
      row.dataset.index = String(index);
      row.setAttribute('aria-rowindex', String(base + index + headRows + 1));
      // the check cell goes back after the cells (below)
      row._check?.remove();
      while (row.children.length < grid._order.length) {
        const cell = document.createElement('div');
        cell.className = 'data-grid-cell';
        cell.setAttribute('role', 'gridcell');
        row.append(cell);
      }
      while (row.children.length > grid._order.length) row.lastElementChild.remove();
      grid._order.forEach((column, c) => {
        fillCell(grid, row.children[c], column, entry, c === 0);
        row.children[c].setAttribute('aria-colindex', String(c + 1));
      });
      if (isTree(grid)) {
        row.setAttribute('aria-level', String(entry.meta.depth + 1));
        if (entry.meta.hasChildren) row.setAttribute('aria-expanded', String(entry.meta.isExpanded));
        else row.removeAttribute('aria-expanded');
      }
    }
    const id = entry.row[grid._source.idField];
    const ed = grid._editor;
    if (ed && ed.id === id) {
      edShown = true;
      if (!row.contains(ed.wrap)) {
        // the row was filled again (a scroll moved its record to another pool element, a resize): the editor goes
        // back into its cell, with its focus
        const focused =
          ed.wrap.contains(document.activeElement) ||
          !document.activeElement ||
          document.activeElement === document.body;
        ed.rowEl = row;
        placeEditor(grid, ed);
        if (focused) (editorControl(ed.editor) as HTMLElement).focus({ preventScroll: true });
      }
    }
    if (rowAria) row.setAttribute('aria-selected', String(selected.has(id)));
    else row.removeAttribute('aria-selected');
    // the row being edited does not drag: a drag in its field selects text
    const drags = draggable && !(ed && ed.id === id);
    if (row.draggable !== drags) row.draggable = drags;
    if (checkOn) {
      if (!row._check) row._check = checkCell();
      if (row.lastElementChild !== row._check) row.append(row._check);
      (row._check.firstElementChild as HTMLInputElement).checked = selected.has(id);
    } else if (row._check) {
      row._check.remove();
      row._check = null;
    }
    const g = base + index;
    for (let c = checkOn ? -1 : 0; c < columns; c++) {
      const cell = c < 0 ? row._check : row.children[c];
      if (c >= 0) cell.tabIndex = focus.row === index && focus.col === c ? 0 : -1;
      const on = isSel(g, c);
      cell.toggleAttribute('data-selected', on);
      if (c >= 0 && cellAria) cell.setAttribute('aria-selected', String(on));
      else cell.removeAttribute('aria-selected');
      const edge = on
        ? [
            !isSel(g - 1, c) && 'top',
            !isSel(g + 1, c) && 'bottom',
            !isSel(g, c - 1) && 'start',
            !isSel(g, c + 1) && 'end',
          ]
            .filter(Boolean)
            .join(' ')
        : '';
      if (!edge) delete cell.dataset.edge;
      else if (cell.dataset.edge !== edge) cell.dataset.edge = edge;
      cell.toggleAttribute('data-hover', hover !== null && cell.dataset.field === hover);
    }
  }
  // the editor's record scrolled out of the window: write what it holds (refused: drop it)
  if (grid._editor && !edShown && !grid._writing)
    queueMicrotask(() => {
      if (grid._editor && !commitEdit(grid, 'none')) cancelEdit(grid, false);
    });
}

/** the counts and the pager below the rows */
function renderFooter(grid, config) {
  const count = (n) => format(n, 'number', grid);
  const footer = grid._parts.footer;
  if (!footer) return;
  const result = grid._result;
  const shownRows = grid._shown?.length ?? 0;
  const visible = result.entries.length;
  const filtered = (config.filters || []).length > 0;
  const mode = paging(grid);
  let text;
  if (isTree(grid)) {
    text = `${count(visible)} rows shown`;
    text += filtered
      ? ` · ${count(result.matchedRows)} of ${count(result.totalRows)} match`
      : ` of ${count(result.totalRows)}`;
  } else {
    text = filtered ? `${count(visible)} of ${count(result.totalRows)} rows match` : `${count(visible)} rows`;
  }
  if (mode === 'pages' && visible) {
    const start = Math.max(0, config.page || 0) * pageSize(grid);
    text = `${count(start + 1)}–${count(start + shownRows)} of ${text}`;
  }
  if (mode === 'infinite' && visible) text = `${count(shownRows)} loaded · ${text}`;
  text += selectionText(selectionView(grid, config), count);
  if (!grid._parts.status) {
    const status = document.createElement('span');
    status.className = 'data-grid-status';
    status.setAttribute('role', 'status');
    footer.append(status);
    grid._parts.status = status;
  }
  grid._parts.status.textContent = text;
  if (mode !== 'pages') return;
  if (!grid._parts.pager) {
    const pager = document.createElement('div');
    pager.className = 'data-grid-pager';
    for (const [act, name] of [
      ['first', 'First page'],
      ['prev', 'Previous page'],
      ['label'],
      ['next', 'Next page'],
      ['last', 'Last page'],
    ]) {
      if (act === 'label') {
        const label = document.createElement('span');
        label.className = 'data-grid-page-label';
        pager.append(label);
        continue;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'data-grid-page-btn';
      button.dataset.page = act;
      button.setAttribute('aria-label', name);
      pager.append(button);
    }
    footer.append(pager);
    grid._parts.pager = pager;
  }
  const page = Math.max(0, config.page || 0);
  const pages = pageCount(grid);
  dfDollar(grid._parts.pager)
    .find('.data-grid-page-label')
    .get(0).textContent = `Page ${count(page + 1)} of ${count(pages)}`;
  for (const button of dfDollar(grid._parts.pager).find<HTMLButtonElement>('[data-page]').toArray()) {
    const back = button.dataset.page === 'first' || button.dataset.page === 'prev';
    button.disabled = back ? page <= 0 : page >= pages - 1;
  }
}

/**
 * The DOM side of a config: evaluate the query, lay out the columns, fill
 * the filter row, render the window and the footer. Returns the row count.
 */
function refresh(grid, config, previous) {
  const before = grid._result;
  grid._config = config;
  // a new query or records: the open editor's cell may go - write it first (refused: drop it)
  if (grid._editor && !grid._writing) {
    grid._writing = true;
    if (!commitEdit(grid, 'none')) grid._editor = null;
    grid._writing = false;
  }
  evaluate(grid, config);
  grid._selected = new Set(config.selected || []);
  grid._shown = shown(grid, config);
  layoutColumns(grid, config);
  syncFilters(grid, config);
  syncCheckAll(grid);
  // a selection that changed alone (select()) over the same result fills no cell again - only the marks move; a
  // refill under a press would swap the content the pointer is on, and the click and the double click after it
  // would land on a removed node
  if (!(grid._selecting && grid._result === before)) grid._gen = (grid._gen || 0) + 1;
  const prev = previous?.config || {};
  // a new query starts at the top
  const moved = ['filters', 'sorters', 'page'].some(
    (k) => JSON.stringify(prev[k] ?? null) !== JSON.stringify(config[k] ?? null),
  );
  if (moved && paging(grid) !== 'infinite') grid._parts.viewport.scrollTop = 0;
  if (moved) grid._focus = { row: grid._focus.row < 0 ? -1 : 0, col: grid._focus.col };
  const { viewport } = grid._parts;
  viewport.setAttribute('aria-rowcount', String((grid._result.entries.length || 0) + (grid._parts.filters ? 2 : 1)));
  viewport.setAttribute('aria-colcount', String(grid._order.length));
  // a hidden column takes its cell with it
  if (grid._focus.col >= grid._order.length) grid._focus = { ...grid._focus, col: Math.max(0, grid._order.length - 1) };
  renderRows(grid);
  renderFooter(grid, config);
  return grid._result.entries.length;
}

/**
 * UI side of setState: 'default' shows the rows of the config's query (none
 * match → it lands in 'empty'), 'loading' marks the grid busy (skeleton
 * rows), 'empty' shows data-empty-text. Every state keeps the query.
 */
function triggerStateChange(grid, state, previous) {
  grid._config = state.config;
  let name = state.name;
  if (name !== 'loading' && grid._parts) {
    const rows = refresh(grid, state.config, previous);
    if (name === 'default' && !rows) name = 'empty';
  }
  applyMarkup(grid, { name, config: state.config });
  grid.dataset.stateName = name;
  if (grid._saved) {
    const keep = {};
    for (const k of SAVED_KEYS) if (state.config[k] !== undefined) keep[k] = state.config[k];
    grid._saved.set(keep);
  }
}

/** Registry-level API; pass the grid explicitly. Unknown names throw. */
export const dataGridApi = componentState({
  component: 'data-grid',
  states: dataGridStates,
  // a config merges: { page: 3 } keeps the filters
  mergeConfig: true,
  apply: (grid, state, previous) => triggerStateChange(grid, state, previous),
  markup: (el, state) => applyMarkup(el, state),
});

df$.dataGridApi = dataGridApi;
df$.dataGridStates = dataGridStates;

// -- interaction --------------------------------------------------------------

/** merge into the query (the store applies it) */
const query = (grid, patch) =>
  dataGridApi.setState(grid, grid.store.value.name === 'loading' ? 'loading' : 'default', patch);

/** a selection change: the marks move, no cell is filled again (refresh) */
function setSelection(grid, patch) {
  grid._selecting = true;
  try {
    query(grid, patch);
  } finally {
    grid._selecting = false;
  }
}

/** what a kind of selection holds now (what a range adds to when it starts beside it) */
function currentOf(grid, kind: SelectionKind) {
  const config = configOf(grid);
  if (kind === 'row') return [...grid._selected];
  return kind === 'column' ? config.selectedColumns || [] : config.selectedRanges || [];
}

/**
 * Select at a cell - g its position in the query, c its column in the shown order - as a row, a column or a cell
 * (kind). how: 'only' (just this one), 'toggle' (add or remove it), 'range' (from the anchor to it, beside what was
 * selected before the anchor). The anchor - set by 'only' and 'toggle' - is a record and a field, so a range still
 * starts there after the query moved it; data-select="single" keeps one.
 */
function select(grid, g, c, how, kind: SelectionKind) {
  const model = modelOf(grid);
  const column = grid._order?.[c];
  if (!model || !grid._source || !column) return;
  const id = idAt(grid, g);
  if (kind !== 'column' && id === undefined) return;
  const many = multi(grid);
  const a = grid._anchor;
  const from =
    a && a.kind === kind ? { g: kind === 'column' ? 0 : indexOfId(grid, a.id), c: colOf(grid, a.field) } : null;
  if (how === 'range' && (!many || !from || from.g < 0 || from.c < 0)) how = 'only';
  if (how !== 'range') grid._anchor = { id, field: column.field, kind };
  grid._lead = { id, field: column.field, kind };
  const keep = how === 'range' ? grid._keep || [] : [];
  const union = (xs, ys) => [...new Set([...xs, ...ys])];
  const config = configOf(grid);
  if (kind === 'row') {
    const sel = [...grid._selected];
    let next;
    if (how === 'range') {
      const ids = (grid._result?.entries ?? [])
        .slice(Math.min(from.g, g), Math.max(from.g, g) + 1)
        .map((e) => e.row[grid._source.idField]);
      next = union(keep, ids);
    } else if (how === 'toggle' && grid._selected.has(id)) next = grid._keep = sel.filter((x) => x !== id);
    else if (how === 'toggle' && many) {
      grid._keep = sel;
      next = [...sel, id];
    } else {
      grid._keep = [];
      next = [id];
    }
    setSelection(grid, model === 'both' ? { selected: next, selectedColumns: [] } : { selected: next });
    return;
  }
  if (kind === 'column') {
    const sel = config.selectedColumns || [];
    let next;
    if (how === 'range')
      next = union(
        keep,
        grid._order.slice(Math.min(from.c, c), Math.max(from.c, c) + 1).map((x) => x.field),
      );
    else if (how === 'toggle' && sel.includes(column.field)) next = grid._keep = sel.filter((f) => f !== column.field);
    else if (how === 'toggle' && many) {
      grid._keep = sel;
      next = [...sel, column.field];
    } else {
      grid._keep = [];
      next = [column.field];
    }
    setSelection(grid, model === 'both' ? { selectedColumns: next, selected: [] } : { selectedColumns: next });
    return;
  }
  const ranges = config.selectedRanges || [];
  const here = { id, field: column.field };
  const single = (r) =>
    r.from.id === id && r.to.id === id && r.from.field === column.field && r.to.field === column.field;
  let next;
  if (how === 'range') next = [...keep, { from: { id: a.id, field: a.field }, to: here }];
  else if (how === 'toggle' && ranges.some(single)) next = grid._keep = ranges.filter((r) => !single(r));
  else if (how === 'toggle' && many) {
    grid._keep = ranges;
    next = [...ranges, { from: here, to: { ...here } }];
  } else {
    grid._keep = [];
    next = [{ from: here, to: { ...here } }];
  }
  setSelection(grid, { selectedRanges: next });
}

/** everything the model selects: every row the query shows (all pages), every shown column, or every cell */
function selectAll(grid) {
  const model = modelOf(grid);
  const entries = grid._result?.entries ?? [];
  const idField = grid._source?.idField ?? 'id';
  if (model === 'column') return setSelection(grid, { selectedColumns: grid._order.map((c) => c.field) });
  if (model === 'cell') {
    if (!entries.length) return;
    const first = grid._order[0].field;
    const last = grid._order[grid._order.length - 1].field;
    return setSelection(grid, {
      selectedRanges: [
        {
          from: { id: entries[0].row[idField], field: first },
          to: { id: entries[entries.length - 1].row[idField], field: last },
        },
      ],
    });
  }
  setSelection(grid, {
    selected: entries.map((e) => e.row[idField]),
    ...(model === 'both' ? { selectedColumns: [] } : {}),
  });
}

/**
 * After a key moved the focus: the cell model selects the cell it reached (Shift: the range to it); the other models
 * extend with Shift - rows along a column, columns along a row. A range starts at the cell the focus left when the
 * last selection ended elsewhere (arrows moved on without selecting), beside what is selected.
 */
function followFocus(grid, e, prevRow, prevCol) {
  const model = modelOf(grid);
  const { row, col } = grid._focus;
  if (!model || row < 0) return;
  const base = baseOf(grid);
  const extend = e.shiftKey && multi(grid) && prevRow >= 0;
  if (model === 'cell' && !extend) return select(grid, base + row, col, 'only', 'cell');
  if (!extend) return;
  const kind: SelectionKind | null =
    model === 'cell'
      ? 'cell'
      : row !== prevRow && model !== 'column'
        ? 'row'
        : col !== prevCol && model !== 'row'
          ? 'column'
          : null;
  if (!kind) return;
  const lead = grid._lead;
  const at = (l) =>
    kind === 'column'
      ? colOf(grid, l.field) === prevCol
      : indexOfId(grid, l.id) === base + prevRow && (kind === 'row' || colOf(grid, l.field) === prevCol);
  if (!(lead?.kind === kind && at(lead))) {
    grid._anchor = { id: idAt(grid, base + prevRow), field: grid._order[prevCol].field, kind };
    grid._keep = currentOf(grid, kind);
  }
  select(grid, base + row, col, 'range', kind);
}

/** the first shown row's position in the query (pages: the page's start) */
const baseOf = (grid) => (paging(grid) === 'pages' ? Math.max(0, configOf(grid).page || 0) * pageSize(grid) : 0);

function toggleExpand(grid, index, open?: boolean) {
  const entry = grid._shown[index];
  if (!entry?.meta.hasChildren) return;
  const id = entry.row[grid._source.idField];
  const want = open ?? !entry.meta.isExpanded;
  if (want === entry.meta.isExpanded) return;
  const config = configOf(grid);
  if ((config.filters || []).length) {
    // while filtering every branch with a match is open; closing one is an exception
    const collapsed = new Set(config.collapsed || []);
    if (want) collapsed.delete(id);
    else collapsed.add(id);
    query(grid, { collapsed: [...collapsed] });
  } else {
    const expanded = new Set(config.expanded || []);
    if (want) expanded.add(id);
    else expanded.delete(id);
    query(grid, { expanded: [...expanded] });
  }
}

/** move the active cell, keep it on screen, focus it */
function focusCell(grid, row, col) {
  const total = grid._shown.length;
  row = Math.max(-1, Math.min(total - 1, row));
  col = Math.max(0, Math.min(grid._order.length - 1, col));
  grid._focus = { row, col };
  const { viewport } = parts(grid);
  if (row >= 0) {
    const view = viewport.clientHeight - grid._parts.head.offsetHeight;
    viewport.scrollTop = scrollIntoViewTop(row, viewport.scrollTop, view, rowHeight(grid), total);
  }
  renderRows(grid);
  for (const [c, header] of grid._order.entries()) header.el.tabIndex = row === -1 && c === col ? 0 : -1;
  const target =
    row === -1
      ? grid._order[col].el
      : dfDollar(grid._parts.pool)
          .children('.data-grid-row')
          .toArray()
          .find((r) => r._index === row)?.children[col];
  target?.focus({ preventScroll: row === -1 });
}

// -- inline editing ---------------------------------------------------------

/** the editable column a cell belongs to, or null */
const editableColumn = (grid, col) => {
  const column = grid._order?.[col];
  return column?.editable ? column : null;
};

/** what getEditorFn / validateFn receive */
const editContext = (grid, record, column): DataGridEditContext => ({
  record,
  field: column.field,
  type:
    column.editor ||
    (column.type === 'number'
      ? 'number'
      : valueType(record[column.field], column.options ? { options: column.options } : null)),
  rules: { ...column.rules, ...(column.options ? { options: column.options } : {}) },
  grid,
});

/** the pool row that shows a record, if it is in the window */
const rowElOf = (grid, id) =>
  dfDollar(grid._parts.pool)
    .children('.data-grid-row')
    .toArray()
    .find((r) => grid._shown[r._index]?.row[grid._source.idField] === id);

/** put the open editor into its cell (after a re-render filled the cell again) */
function placeEditor(grid, ed) {
  const col = grid._order.findIndex((c) => c.field === ed.field);
  const cell = ed.rowEl?.children[col];
  if (!cell) return;
  ed.cell = cell;
  cell.dataset.editing = '';
  const content = dfDollar(cell).children('.data-grid-content').get(0);
  if (content && content !== ed.wrap) content.replaceWith(ed.wrap);
  else if (!cell.contains(ed.wrap)) dfDollar(cell).append(ed.wrap);
}

/** open the editor of a cell (row = its place in the query, col = its column in the shown order) */
function openEdit(grid, row, col) {
  const column = editableColumn(grid, col);
  const entry = grid._shown?.[row];
  if (!column || !entry || grid.hasAttribute('data-readonly')) return false;
  if (grid._editor && !commitEdit(grid, 'none')) return false;
  const record = entry.row;
  const value = record[column.field];
  const ctx = editContext(grid, record, column);
  const custom = grid._sourceOptions?.getEditorFn?.(column.field, value, ctx);
  if (custom === false) return false;
  const editor: CellEditor =
    asEditor(custom) ?? builtinEditor(ctx.type, value, ctx.rules, { colorClass: 'data-grid-color-input' });
  focusCell(grid, row, col);
  const id = record[grid._source.idField];
  const wrap = document.createElement('span');
  wrap.className = 'data-grid-editor data-grid-content';
  dfDollar(wrap).append(editor.el);
  const ed = { id, field: column.field, column, editor, wrap, value, record, rowEl: rowElOf(grid, id), cell: null };
  grid._editor = ed;
  placeEditor(grid, ed);
  wrap.addEventListener('keydown', (e) => {
    const act = editorKey(e, editor);
    if (!act) return;
    if (act === 'cancel') {
      e.preventDefault();
      e.stopPropagation();
      cancelEdit(grid);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    commitEdit(grid, act === 'commit' ? 'stay' : act);
  });
  wrap.addEventListener('change', () => {
    if (editor.immediate) commitEdit(grid, 'stay');
  });
  wrap.addEventListener('focusout', (e) => {
    if (wrap.contains(e.relatedTarget as Node)) return;
    // after the click that moved focus is handled (it may open another editor)
    setTimeout(() => {
      if (grid._editor === ed && !wrap.contains(document.activeElement)) commitEdit(grid, 'none');
    }, 0);
  });
  focusEditor(editor);
  return true;
}

/** close the editor without writing - the cell shows its value again */
function cancelEdit(grid, focus = true) {
  const ed = grid._editor;
  if (!ed) return;
  grid._editor = null;
  grid._gen++;
  renderRows(grid);
  if (focus) focusRecord(grid, ed.id, ed.field);
}

/** focus a record's cell in a column (wherever the query placed it) */
function focusRecord(grid, id, field, by = 0) {
  const row = grid._shown.findIndex((x) => x.row[grid._source.idField] === id);
  const col = grid._order.findIndex((c) => c.field === field);
  if (row < 0 || col < 0) return;
  if (!by) return focusCell(grid, row, col);
  // Tab / Shift + Tab: the next editable cell of the row, then of the next row
  const editable = grid._order.map((c, i) => (c.editable ? i : -1)).filter((i) => i >= 0);
  let at = editable.indexOf(col) + by;
  let r = row;
  if (at >= editable.length) [at, r] = [0, row + 1];
  if (at < 0) [at, r] = [editable.length - 1, row - 1];
  if (r < 0 || r >= grid._shown.length) return focusCell(grid, row, col);
  openEdit(grid, r, editable[at]);
}

/** show why a value is refused, under the editor (announced) */
function showEditProblem(ed, problem) {
  const control = editorControl(ed.editor);
  control.setAttribute('aria-invalid', 'true');
  let note = dfDollar(ed.wrap).children('.data-grid-error').get(0);
  if (!note) {
    note = document.createElement('span');
    note.className = 'data-grid-error';
    note.setAttribute('role', 'alert');
    note.id = `dg-error-${Math.random().toString(36).slice(2, 8)}`;
    dfDollar(ed.wrap).append(note);
    control.setAttribute('aria-describedby', note.id);
  }
  dfDollar(note).text(problem);
}

/**
 * Write new values into records (id → the fields to change): each a new record in place of the old one in the
 * source, then the query runs once again. Returns the new records by id.
 */
function writeRecords(grid, patches: Map<unknown, Record<string, unknown>>) {
  const idField = grid._source.idField;
  const rows = grid._source.rows;
  const written = new Map<unknown, DataviewRow>();
  const next = rows.map((r) => {
    const patch = patches.get(r[idField]);
    if (!patch) return r;
    const record = { ...r, ...patch };
    written.set(r[idField], record);
    return record;
  });
  if (!written.size) return written;
  grid._source.setRows(next);
  // the same query over the new rows: the sort and the filters place the records again
  grid._writing = true;
  triggerStateChange(grid, grid.store.value, grid.store.value);
  grid._writing = false;
  return written;
}

/** write one record's new values (writeRecords) */
const writeRecord = (grid, id, patch) => writeRecords(grid, new Map([[id, patch]])).get(id) ?? null;

/**
 * Commit the open editor: validate (the editor, the column's rules, validateFn), ask data-grid-beforeedit
 * (cancelable), write the record, then data-grid-edit. Returns false while the value is refused (the editor stays).
 */
function commitEdit(grid, then = 'stay') {
  const ed = grid._editor;
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
  const ctx = editContext(grid, ed.record, ed.column);
  if (!problem) problem = editorProblem(ctx.rules, value);
  if (!problem) {
    const answer = grid._sourceOptions?.validateFn?.(ed.field, value, ctx);
    if (typeof answer === 'string' && answer) problem = answer;
    else if (answer === false) problem = 'Invalid value';
  }
  if (problem) {
    showEditProblem(ed, problem);
    return false;
  }
  grid._editor = null;
  const oldValue = ed.value;
  // Fires before an edited value is written - cancelable: preventDefault() keeps the old value.
  const before = new CustomEvent<DataGridBeforeEditDetail>('data-grid-beforeedit', {
    bubbles: true,
    cancelable: true,
    detail: { record: ed.record, field: ed.field, value, oldValue },
  });
  const same = JSON.stringify(value) === JSON.stringify(oldValue) && !ed.editor.patch;
  if (same || !grid.dispatchEvent(before)) {
    grid._gen++;
    renderRows(grid);
  } else {
    const record = writeRecord(grid, ed.id, { ...ed.editor.patch?.(), [ed.field]: value });
    // Fires after an edited value was written - the new record, the field, the new and the old value.
    grid.dispatchEvent(
      new CustomEvent<DataGridEditDetail>('data-grid-edit', {
        bubbles: true,
        detail: { record, field: ed.field, value, oldValue },
      }),
    );
  }
  if (then === 'stay') focusRecord(grid, ed.id, ed.field);
  else if (then === 'next' || then === 'prev') focusRecord(grid, ed.id, ed.field, then === 'next' ? 1 : -1);
  return true;
}

function onKeydown(grid, e) {
  if (e.target.closest?.('.data-grid-filters, .data-grid-footer, .data-grid-menu, .data-grid-editor')) return;
  // a control in a custom cell keeps its keys, as it keeps its clicks (onClick): a field types a space and moves its
  // caret, a checkbox ticks on Space, a select opens on Enter - the grid would take them for row navigation
  if (e.target.closest?.('.data-grid-row :is(a, button, input, select, textarea, label, [contenteditable])')) return;
  const { row, col } = grid._focus;
  // Ctrl / Cmd + C and V: the browser's own copy and paste, through a stand-in (clipboardKey) - no preventDefault
  if ((e.ctrlKey || e.metaKey) && !e.altKey && /^[cv]$/i.test(e.key)) {
    clipboardKey(grid, e.key.toLowerCase() === 'c' ? 'copy' : 'paste');
    return;
  }
  const page = Math.max(
    1,
    Math.floor((grid._parts.viewport.clientHeight - grid._parts.head.offsetHeight) / rowHeight(grid)) - 1,
  );
  const last = grid._shown.length - 1;
  const entry = row >= 0 ? grid._shown[row] : null;
  // a header: Alt+Arrow Down opens its menu, Alt+Shift+Arrow Left / Right moves the column, Alt+Arrow Left / Right
  // resizes it
  const header = row === -1 ? grid._order[col] : null;
  if (header && e.altKey && !e.ctrlKey && !e.metaKey) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      openMenu(grid, header);
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const later = e.key === 'ArrowRight';
      if (e.shiftKey) {
        if (header.movable) dropColumn(grid, header.field, later ? col + 2 : col - 1);
        focusCell(grid, -1, grid._order.indexOf(header));
      } else if (header.resizable) {
        const width = Math.round(header.el.getBoundingClientRect().width) + (later ? KEY_STEP : -KEY_STEP);
        query(grid, { widths: { ...configOf(grid).widths, [header.field]: Math.max(MIN_WIDTH, width) } });
        focusCell(grid, -1, col);
      }
      return;
    }
  }
  let next = null;
  switch (e.key) {
    case 'ArrowDown':
      next = [Math.min(last, row + 1), col];
      break;
    case 'ArrowUp':
      next = [Math.max(-1, row - 1), col];
      break;
    case 'ArrowRight':
      if (isTree(grid) && !e.shiftKey && entry && col === 0 && entry.meta.hasChildren && !entry.meta.isExpanded) {
        toggleExpand(grid, row, true);
        next = [row, 0];
      } else next = [row, col + 1];
      break;
    case 'ArrowLeft':
      if (isTree(grid) && !e.shiftKey && entry && col === 0) {
        if (entry.meta.hasChildren && entry.meta.isExpanded) {
          toggleExpand(grid, row, false);
          next = [row, 0];
        } else if (entry.meta.parentId != null) {
          const parent = grid._shown.findIndex((x) => x.row[grid._source.idField] === entry.meta.parentId);
          next = [parent >= 0 ? parent : row, 0];
        } else next = [row, 0];
      } else next = [row, col - 1];
      break;
    case 'Home':
      next = e.ctrlKey || e.metaKey ? [Math.min(row, 0), col] : [row, 0];
      break;
    case 'End':
      next = e.ctrlKey || e.metaKey ? [last, col] : [row, grid._order.length - 1];
      break;
    case 'PageDown':
      next = [Math.min(last, Math.max(0, row) + page), col];
      break;
    case 'PageUp':
      next = [Math.max(0, row - page), col];
      break;
    case ' ': {
      // Space toggles what the model selects (Shift: the range to it); "row column": Ctrl / Cmd + Space, or a header,
      // the column - as in a spreadsheet
      const model = modelOf(grid);
      const how = e.shiftKey ? 'range' : 'toggle';
      const g = row < 0 ? -1 : baseOf(grid) + row;
      if (model === 'column' || (model === 'both' && (row < 0 || e.ctrlKey || e.metaKey)))
        select(grid, g, col, how, 'column');
      else if (model && row >= 0) select(grid, g, col, how, model === 'cell' ? 'cell' : 'row');
      next = [row, col];
      break;
    }
    case 'a':
    case 'A':
      // APG grid: Ctrl/Cmd+A selects everything the model selects - every row of the query, column or cell
      if (!(e.ctrlKey || e.metaKey) || !multi(grid) || !modelOf(grid)) return;
      selectAll(grid);
      next = [row, col];
      break;
    case 'F2':
      if (row < 0 || !openEdit(grid, row, col)) return;
      e.preventDefault();
      return;
    case 'Enter':
      if (row >= 0 && !e.shiftKey && editableColumn(grid, col) && openEdit(grid, row, col)) {
        e.preventDefault();
        return;
      }
      if (row === -1) {
        const column = grid._order[col];
        if (column.sortable)
          query(grid, { sorters: cycleSort(configOf(grid).sorters, column.sortField, e.shiftKey), page: 0 });
        next = [-1, col];
      } else if (entry) {
        // Fires on Enter on a row - its record and its position in the query.
        grid.dispatchEvent(
          new CustomEvent<DataGridActivateDetail>('data-grid-activate', {
            bubbles: true,
            detail: { record: entry.row, index: row },
          }),
        );
      }
      break;
    default:
      return;
  }
  e.preventDefault();
  if (!next) return;
  focusCell(grid, next[0], next[1]);
  if (MOVES.has(e.key)) followFocus(grid, e, row, col);
}

/** the keys that move the focus - the cell model's selection follows them, Shift extends in every model */
const MOVES = new Set(['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageDown', 'PageUp']);

function onClick(grid, e) {
  const t = e.target;
  // the click that ends a drag, a resize or a long press is no sort
  if (grid._suppressClick || t.closest('.data-grid-menu, .data-grid-resizer, .data-grid-editor')) return;
  const menuButton = t.closest('.data-grid-menu-button');
  if (menuButton) {
    const column = grid._columns.find((c) => c.field === menuButton.dataset.field);
    // light dismiss closed it on the way here: the same arrow again only closes
    if (grid._menuClosedBy !== menuButton && column) openMenu(grid, column);
    grid._menuClosedBy = null;
    return;
  }
  const pageButton = t.closest('[data-page]');
  if (pageButton && grid._parts.footer.contains(pageButton)) {
    const page = Math.max(0, configOf(grid).page || 0);
    const target = { first: 0, prev: page - 1, next: page + 1, last: pageCount(grid) - 1 }[pageButton.dataset.page];
    query(grid, { page: Math.max(0, Math.min(pageCount(grid) - 1, target)) });
    return;
  }
  // the checkbox model: the head's box selects every row or none, a row's box toggles its row (Shift: the range to it)
  const check = t.closest('.data-grid-check');
  if (check && check === grid._parts.check) return toggleAll(grid);
  const checkRow = check?.closest('.data-grid-row');
  if (checkRow && grid._parts.pool.contains(checkRow)) {
    select(grid, baseOf(grid) + checkRow._index, 0, e.shiftKey ? 'range' : 'toggle', 'row');
    focusCell(grid, checkRow._index, Math.max(0, grid._focus.col));
    return;
  }
  const header = t.closest('.data-grid-header');
  if (header && grid.contains(header)) {
    const column = grid._columns.find((c) => c.el === header);
    const at = grid._order.indexOf(column);
    // the column models select a column with its header (Shift: a range, Ctrl / Cmd: toggle) - sorting stays in
    // its menu and on Enter
    if (column && at >= 0 && selectsColumns(grid)) select(grid, -1, at, howOf(e), 'column');
    else if (column?.sortable)
      query(grid, { sorters: cycleSort(configOf(grid).sorters, column.sortField, e.shiftKey), page: 0 });
    grid._focus = { row: -1, col: at };
    return;
  }
  const row = t.closest('.data-grid-row');
  if (!row || !grid._parts.pool.contains(row)) return;
  const index = row._index;
  const cell = t.closest('.data-grid-cell');
  const col = Math.max(0, [...row.children].indexOf(cell));
  grid._focus = { row: index, col };
  if (t.closest('.data-grid-toggle')) return toggleExpand(grid, index);
  if (t.closest('a, button, input, select, textarea, label')) return;
  // a mouse or a pen selected on its press (onBodyPress); a tap or a click from script selects here
  if (grid._pressed) return;
  select(grid, baseOf(grid) + index, col, howOf(e), bodyKind(grid));
}

// -- pointer in the body: a press selects, a drag sweeps a range (a finger rests first) ------------------------

/**
 * A press on a body cell. A mouse or a pen selects at once (Shift extends, Ctrl / Cmd toggles) and a drag from there
 * sweeps the range to the cell under the pointer - past an edge the grid scrolls on. A finger scrolls; resting about
 * half a second it starts the sweep instead (a tap selects through the click).
 */
function onBodyPress(grid, e) {
  if (!modelOf(grid) || e.button !== 0 || !e.isPrimary) return;
  const t = e.target;
  if (t.closest('.data-grid-toggle, .data-grid-editor, a, button, input, select, textarea, label, [contenteditable]'))
    return;
  const rowEl = t.closest('.data-grid-row');
  const cell = t.closest('.data-grid-cell');
  if (!rowEl || !cell || !grid._parts.pool.contains(rowEl)) return;
  const at = { row: rowEl._index, col: [...rowEl.children].indexOf(cell) };
  const kind = bodyKind(grid);
  const sweep = {
    id: e.pointerId,
    kind,
    touch: e.pointerType === 'touch',
    x: e.clientX,
    y: e.clientY,
    lastX: e.clientX,
    lastY: e.clientY,
    to: at,
    active: false,
    captured: false,
    timer: 0 as ReturnType<typeof setTimeout> | 0,
    edge: null as number[] | null,
    frame: 0,
  };
  grid._sweep = sweep;
  const start = (how) => {
    sweep.active = true;
    grid._focus = { ...at };
    select(grid, baseOf(grid) + at.row, at.col, how, kind);
  };
  // rows that drag (data-drag) never sweep - the browser's drag takes the pointer. A press on a selected row waits
  // for the click: it may be dragged with the others; any other press selects at once
  if (grid.hasAttribute('data-drag')) {
    grid._sweep = null;
    if (sweep.touch) return; // a tap selects through the click
    if (howOf(e) === 'only' && kind === 'row' && grid._selected.has(idAt(grid, baseOf(grid) + at.row))) return;
    grid._pressed = true;
    grid._focus = { ...at };
    select(grid, baseOf(grid) + at.row, at.col, howOf(e), kind);
    return;
  }
  if (sweep.touch) {
    sweep.timer = setTimeout(() => {
      start(e.shiftKey ? 'range' : 'only');
      grid.setAttribute('data-sweeping', '');
      if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(10);
    }, LONG_PRESS_MS);
    return;
  }
  grid._pressed = true;
  start(howOf(e));
}

function onSweepMove(grid, e) {
  const sweep = grid._sweep;
  if (e.pointerId !== sweep.id) return;
  if (!sweep.active) {
    // a finger that moves before it rests scrolls
    if (sweep.touch && Math.hypot(e.clientX - sweep.x, e.clientY - sweep.y) > TOUCH_SLOP) endSweep(grid);
    return;
  }
  // a mouse released outside the page sent its pointerup elsewhere
  if (!sweep.touch && !e.buttons) return endSweep(grid);
  sweep.lastX = e.clientX;
  sweep.lastY = e.clientY;
  sweepTo(grid);
}

/** the range to the cell under the pointer (past an edge: the edge's cell), and the scrolling past an edge */
function sweepTo(grid) {
  const sweep = grid._sweep;
  if (!sweep?.active) return;
  const { viewport, head, body } = grid._parts;
  const box = viewport.getBoundingClientRect();
  const top = box.top + head.offsetHeight;
  const bottom = box.top + viewport.clientHeight;
  const left = box.left;
  const right = box.left + viewport.clientWidth;
  const x = Math.min(right - 1, Math.max(left + 1, sweep.lastX));
  const y = Math.min(bottom - 1, Math.max(top + 1, sweep.lastY));
  const total = grid._shown.length;
  // rows by arithmetic (uniform height), columns by their headers' boxes - locked ones first, as they lie on top
  const row = Math.max(0, Math.min(total - 1, Math.floor((y - body.getBoundingClientRect().top) / rowHeight(grid))));
  let col = grid._order.findIndex((c) => {
    const r = c.el.getBoundingClientRect();
    return x >= r.left && x < r.right;
  });
  if (col < 0) col = sweep.to.col;
  if (row !== sweep.to.row || col !== sweep.to.col) {
    sweep.to = { row, col };
    if (!sweep.captured) {
      // captured only now: a press that does not move keeps its click and its double click on the cell
      try {
        viewport.setPointerCapture(sweep.id);
      } catch {
        // a pointer that already ended
      }
      sweep.captured = true;
      grid.setAttribute('data-sweeping', '');
    }
    grid._focus = { row, col };
    select(grid, baseOf(grid) + row, col, 'range', sweep.kind);
  }
  const dy = sweep.lastY < top ? -1 : sweep.lastY > bottom ? 1 : 0;
  const dx = sweep.lastX < left ? -1 : sweep.lastX > right ? 1 : 0;
  sweep.edge = dx || dy ? [dx, dy] : null;
  if (sweep.edge && !sweep.frame)
    sweep.frame = requestAnimationFrame(() => {
      sweep.frame = 0;
      if (grid._sweep !== sweep || !sweep.edge) return;
      viewport.scrollTop += sweep.edge[1] * rowHeight(grid);
      viewport.scrollLeft += sweep.edge[0] * 24;
      sweepTo(grid);
    });
}

/** end a sweep: the cell it ended on takes the focus; the click after a sweep or a resting finger selects nothing */
function endSweep(grid) {
  const sweep = grid._sweep;
  if (!sweep) return;
  grid._sweep = null;
  clearTimeout(sweep.timer);
  cancelAnimationFrame(sweep.frame);
  if (sweep.captured)
    try {
      grid._parts.viewport.releasePointerCapture(sweep.id);
    } catch {
      // released with the pointer
    }
  grid.removeAttribute('data-sweeping');
  if (sweep.active && (sweep.touch || sweep.captured)) {
    grid._suppressClick = true;
    setTimeout(() => {
      grid._suppressClick = false;
    });
    focusCell(grid, sweep.to.row, sweep.to.col);
  }
}

/** the column models: the column under the pointer is marked (data-hover) in every row */
function hoverAt(grid, t) {
  const el = selectsColumns(grid) ? t?.closest?.('.data-grid-cell, .data-grid-header') : null;
  const field = el && grid.contains(el) ? el.dataset.field || null : null;
  if (field === (grid._hover ?? null)) return;
  grid._hover = field;
  for (const row of grid._parts.pool.children)
    for (const cell of row.children) cell.toggleAttribute('data-hover', field !== null && cell.dataset.field === field);
}

// -- drag and drop: rows out of a grid with data-drag, into one with data-drop -----------------------------------
// The drag, its effect and where a drop lands belong to src/shared/record-drag.ts (a Data Tree drags the same way);
// this grid finds its rows, draws where they would land and writes its records.

/** how a grid's records link: the id and, in a tree grid, the parent's id */
const fieldsOf = (grid) => ({
  idField: grid._source.idField as string,
  parentIdField: (grid._source.tree?.parentIdField ?? null) as string | null,
});

/** the rows a drag from this row carries: the selected rows when it is one of them (query order), else itself */
function dragIds(grid, index): DataviewJsonValue[] {
  const idField = grid._source.idField;
  const id = grid._shown[index]?.row[idField];
  if (id === undefined) return [];
  if (bodyKind(grid) !== 'row' || !grid._selected.has(id)) return [id];
  return (grid._result?.entries ?? []).map((e) => e.row[idField]).filter((x) => grid._selected.has(x));
}

function onDragStart(grid, e: DragEvent) {
  const rowEl = e.target as HTMLElement & { _index?: number };
  // a link or a picture in a cell drags itself
  if (!grid.hasAttribute('data-drag') || !grid._source || !rowEl.classList?.contains('data-grid-row')) return;
  if (!grid._parts.pool.contains(rowEl)) return;
  const roots = dragIds(grid, rowEl._index);
  if (!roots.length) return e.preventDefault();
  const fields = fieldsOf(grid);
  // a tree grid's rows come with everything under them
  const records = subtreeOf(grid._source.rows, roots, fields);
  const matrix = records.map((r) => grid._order.map((c) => plainValue(r[c.field], c)));
  const drag: RecordDrag = {
    source: grid,
    records,
    roots,
    ...fields,
    effects: dropEffects(grid.dataset.drag),
    remove: () => writeRows(grid, withoutRecords(grid._source.rows, records, fields.idField)),
    done: (effect, target) =>
      // Fires on the grid rows were dragged from, once a drop took them - on a move they have left it.
      grid.dispatchEvent(
        new CustomEvent<DataGridDragEndDetail>('data-grid-dragend', {
          bubbles: true,
          detail: { records, effect, target },
        }),
      ),
  };
  grid._pressed = false;
  const first = grid._order[0];
  const root = records.find((r) => r[fields.idField] === roots[0]);
  const label = roots.length > 1 ? `${roots.length} rows` : format(root?.[first.field], first.format, grid) || '1 row';
  startRecordDrag(e, drag, { plain: toTsv(matrix), html: toHtml(matrix) }, label);
  grid.setAttribute('data-dragging-rows', '');
}

function onDragEnd(grid) {
  grid.removeAttribute('data-dragging-rows');
  const drag = recordDrag();
  if (drag?.source === grid) endRecordDrag(drag);
}

/** where a drop over the body lands: beside the row under the pointer - a tree grid's middle half drops into it */
function dropAt(grid, e: DragEvent): { at: DataGridDropAt; index: number } {
  const h = rowHeight(grid);
  const y = e.clientY - grid._parts.body.getBoundingClientRect().top;
  const index = Math.max(0, Math.floor(y / h));
  const entry = grid._shown[index];
  if (!entry) return { at: { id: null, place: 'end' }, index: grid._shown.length };
  const f = y / h - index;
  const place: DropPlace = isTree(grid)
    ? f < 0.25
      ? 'before'
      : f > 0.75
        ? 'after'
        : 'into'
    : f < 0.5
      ? 'before'
      : 'after';
  return { at: { id: entry.row[grid._source.idField], place }, index };
}

/** the line (or, into a row, the frame) where a drop would land; null takes it away */
function showDrop(grid, at: DataGridDropAt | null, index = 0) {
  let mark = grid._parts.drop;
  if (!at) {
    mark?.remove();
    grid._parts.drop = null;
    return;
  }
  if (!mark) {
    mark = grid._parts.drop = document.createElement('div');
    mark.className = 'data-grid-row-drop';
    mark.setAttribute('aria-hidden', 'true');
  }
  if (mark.parentElement !== grid._parts.body) grid._parts.body.append(mark);
  const h = rowHeight(grid);
  const row = at.place === 'end' ? grid._shown.length : at.place === 'after' ? index + 1 : index;
  mark.dataset.place = at.place;
  mark.style.top = `${row * h}px`;
}

/** a drag near the top or the bottom edge scrolls the rows on */
function dragScroll(grid, e: DragEvent) {
  const { viewport, head } = grid._parts;
  const box = viewport.getBoundingClientRect();
  const edge = rowHeight(grid);
  if (e.clientY < box.top + head.offsetHeight + edge) viewport.scrollTop -= 12;
  else if (e.clientY > box.top + viewport.clientHeight - edge) viewport.scrollTop += 12;
}

function onDragOver(grid, e: DragEvent) {
  if (!grid.hasAttribute('data-drop') || !grid._source || !carriesRecords(e)) return;
  const drag = recordDrag();
  const effect = dropEffectFor(e, dropEffects(grid.dataset.drop), drag);
  const { at, index } = dropAt(grid, e);
  dragScroll(grid, e);
  // a move onto the rows it moves (or into what lies under them) goes nowhere
  const within = drag?.source === grid && effect === 'move';
  const fields = fieldsOf(grid);
  if (!effect || (within && at.id !== null && drag.records.some((r) => r[fields.idField] === at.id))) {
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';
    showDrop(grid, null);
    return;
  }
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = effect;
  showDrop(grid, at, index);
}

function onDrop(grid, e: DragEvent) {
  showDrop(grid, null);
  if (!grid.hasAttribute('data-drop') || !grid._source) return;
  const drag = recordDrag();
  const payload = droppedRecords(e);
  const effect = dropEffectFor(e, dropEffects(grid.dataset.drop), drag);
  if (!payload || !effect) return;
  e.preventDefault();
  dropRecords(grid, payload, effect, dropAt(grid, e).at, drag);
}

/**
 * Take dropped records: data-grid-beforedrop may refuse them; a move out of another component lets go of them first
 * (its own write), then the grid writes its records once, opens the row they went into and selects them.
 */
function dropRecords(grid, payload, effect: DropEffect, at: DataGridDropAt, drag: RecordDrag | null) {
  const fields = fieldsOf(grid);
  const within = !!drag && drag.source === grid && effect === 'move';
  const placed = placeRecords({
    rows: grid._source.rows,
    ...fields,
    from: payload,
    at,
    copy: effect === 'copy',
    within,
  });
  const source = drag?.source ?? null;
  const detail = { records: placed?.inserted ?? [], effect, source, at };
  if (
    !placed ||
    // Fires before dropped records are written - cancel it to refuse them (the drag ends without a change).
    !grid.dispatchEvent(
      new CustomEvent<DataGridBeforeDropDetail>('data-grid-beforedrop', { bubbles: true, cancelable: true, detail }),
    )
  ) {
    endRecordDrag(drag);
    return null;
  }
  if (drag && effect === 'move' && !within) drag.remove();
  const patch: DataGridQuery = {};
  if (modelOf(grid) && bodyKind(grid) === 'row') patch.selected = multi(grid) ? placed.roots : placed.roots.slice(0, 1);
  if (at.place === 'into' && isTree(grid))
    patch.expanded = [...new Set([...(configOf(grid).expanded || []), at.id as DataviewJsonValue])];
  writeRows(grid, placed.rows, patch);
  drag?.done(effect, grid);
  endRecordDrag(drag);
  if (grid._order.length) focusRecord(grid, placed.roots[0], grid._order[0].field);
  // Fires after dropped records were written into the grid - as inserted, with new ids where they needed one.
  grid.dispatchEvent(new CustomEvent<DataGridDropDetail>('data-grid-drop', { bubbles: true, detail }));
  return placed.inserted;
}

/**
 * Replace the records (a drop, a move out, insert(), remove()): the selection keeps what is left, the query runs
 * again over the new records; patch (the dropped records selected, a row opened) goes with it in one write.
 */
function writeRows(grid, next: DataviewRow[], patch: DataGridQuery = {}) {
  grid._source.setRows(next);
  const ids = new Set(next.map((r) => r[grid._source.idField]));
  const selected = configOf(grid).selected || [];
  const kept = selected.filter((id) => ids.has(id));
  if (!patch.selected && kept.length !== selected.length) patch = { ...patch, selected: kept };
  grid._writing = true;
  try {
    if (Object.keys(patch).length) query(grid, patch);
    else triggerStateChange(grid, grid.store.value, grid.store.value);
  } finally {
    grid._writing = false;
  }
}

// -- the clipboard: the selection out as a spreadsheet reads it, values in where cells edit --------------------

const pad2 = (n) => String(n).padStart(2, '0');

/** a value as a spreadsheet reads it: numbers as they are, a date column's day as YYYY-MM-DD, objects as JSON */
function plainValue(value, column) {
  if (value == null) return '';
  if (typeof value === 'string' && column.format === 'date' && /^\d{4}-\d{2}-\d{2}/.test(value))
    return value.slice(0, 10);
  if (value instanceof Date || (column.format === 'date' && typeof value === 'number')) {
    const d = new Date(value as number | Date);
    if (!Number.isNaN(d.getTime())) return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/** one TSV field: quoted (quotes doubled) when it holds a tab, a line break or a quote - as Excel writes it */
const tsvField = (text) => (/[\t\r\n"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);
const htmlText = (text) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\r?\n/g, '<br>');

/**
 * The selection as a matrix of values: the selected rows (query order) × every shown column, every row × the selected
 * columns, or the rows and columns the ranges touch - a cell outside them empty. Null when nothing is selected.
 */
function selectionMatrix(grid): string[][] | null {
  const view = selectionView(grid, configOf(grid));
  if (!view) return null;
  const entries = grid._result?.entries ?? [];
  const every = (k) => Array.from({ length: k }, (_, i) => i);
  const byNumber = (a, b) => a - b;
  let rows: number[];
  let cols: number[];
  if (view.kind === 'row') {
    rows = [...view.rows]
      .map((id) => indexOfId(grid, id))
      .filter((g) => g >= 0)
      .sort(byNumber);
    cols = every(grid._order.length);
  } else if (view.kind === 'column') {
    rows = every(entries.length);
    cols = [...view.cols].sort(byNumber);
  } else {
    const rs = new Set<number>();
    const cs = new Set<number>();
    for (const b of view.boxes) {
      for (let g = b.r0; g <= b.r1; g++) rs.add(g);
      for (let c = b.c0; c <= b.c1; c++) cs.add(c);
    }
    rows = [...rs].sort(byNumber);
    cols = [...cs].sort(byNumber);
  }
  if (!rows.length || !cols.length) return null;
  return rows.map((g) =>
    cols.map((c) => {
      const column = grid._order[c];
      return view.has(g, c) ? plainValue(entries[g].row[column.field], column) : '';
    }),
  );
}
const toTsv = (matrix: string[][]) => matrix.map((line) => line.map(tsvField).join('\t')).join('\n');
const toHtml = (matrix: string[][]) =>
  `<table><tbody>${matrix.map((line) => `<tr>${line.map((v) => `<td>${htmlText(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

/** TSV as Excel and Google Sheets write it: fields by tabs, lines by line breaks, a quoted field may hold both */
function parseTsv(text: string): string[][] {
  const lines: string[][] = [];
  let line: string[] = [];
  let field = '';
  let quoted = false;
  let fresh = true;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch !== '"') field += ch;
      else if (text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = false;
      continue;
    }
    if (ch === '"' && fresh) {
      quoted = true;
      fresh = false;
    } else if (ch === '\t') {
      line.push(field);
      field = '';
      fresh = true;
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      line.push(field);
      lines.push(line);
      line = [];
      field = '';
      fresh = true;
    } else {
      field += ch;
      fresh = false;
    }
  }
  // a last line break ends the last line - no empty line after it
  if (field !== '' || line.length) lines.push([...line, field]);
  return lines;
}

/** a pasted number: plain, or written in the grid's locale (grouping, its decimal mark, a currency, a percent) */
function parseNumber(text: string, grid): number {
  const plain = Number(text.replace(/[\s  ]/g, ''));
  if (!Number.isNaN(plain)) return plain;
  const parts = new Intl.NumberFormat(textLocale(grid)).formatToParts(12345.6);
  const group = parts.find((p) => p.type === 'group')?.value ?? ',';
  const decimal = parts.find((p) => p.type === 'decimal')?.value ?? '.';
  let s = text
    .replace(/[\s  ]/g, '')
    .split(group)
    .join('');
  const percent = s.endsWith('%');
  s = s
    .split(decimal)
    .join('.')
    .replace(/[^\d.+-]/g, '');
  const n = s ? Number(s) : NaN;
  return percent ? n / 100 : n;
}

/** a pasted text as a cell's value - the column's edit type decides - or why it cannot be one */
function pastedValue(text: string, ctx: DataGridEditContext, grid): { value?: unknown; problem?: string } {
  const t = text.trim();
  if (ctx.type === 'number') return { value: t === '' ? null : parseNumber(t, grid) };
  if (ctx.type === 'boolean') {
    if (/^(true|yes|on|1|x|✓)$/i.test(t)) return { value: true };
    if (/^(false|no|off|0|)$/i.test(t)) return { value: false };
    return { problem: 'Not true or false' };
  }
  if (ctx.rules.options && t !== '') {
    const option = ctx.rules.options.find((o) => String(o).toLowerCase() === t.toLowerCase());
    return option === undefined ? { problem: `Not one of ${ctx.rules.options.join(', ')}` } : { value: option };
  }
  return { value: ctx.type === 'string' || ctx.type === 'enum' ? t : text };
}

/**
 * Paste TSV into the selection. Only selected cells change - the selected rows, columns or ranges - except one
 * selected cell, where the block starts. A clipboard of one line fills every selected row, of one column every
 * selected column; otherwise lines and values land once, in order, and what does not fit is cut. A cell of a column
 * that does not edit is skipped; each value goes through the column's rules and validateFn, and
 * data-grid-beforeedit may cancel it. Everything is written in one go.
 */
function pasteInto(grid, text: string): DataGridPasteDetail {
  const detail: DataGridPasteDetail = { written: 0, skipped: 0, refused: [] };
  const clip = parseTsv(text);
  const view = selectionView(grid, configOf(grid));
  if (!view || !clip.length || grid.hasAttribute('data-readonly') || grid._editor) return detail;
  const entries = grid._result?.entries ?? [];
  const n = entries.length;
  const m = grid._order.length;
  const h = clip.length;
  const w = Math.max(...clip.map((l) => l.length));
  const targets = new Map<number, string>();
  /** cell (g, c) takes clipboard (i, j) - a one-line / one-column clipboard fills */
  const put = (g, c, i, j) => {
    if (g < 0 || g >= n || c < 0 || c >= m || (h > 1 && i >= h) || (w > 1 && j >= w)) return;
    const value = clip[h === 1 ? 0 : i][w === 1 ? 0 : j];
    if (value !== undefined) targets.set(g * m + c, value);
  };
  let block = null;
  if (view.kind === 'row') {
    const rows = [...view.rows]
      .map((id) => indexOfId(grid, id))
      .filter((g) => g >= 0)
      .sort((a, b) => a - b);
    rows.forEach((g, i) => {
      for (let c = 0; c < m; c++) put(g, c, i, c);
    });
  } else if (view.kind === 'column') {
    const cols = [...view.cols].sort((a, b) => a - b);
    for (let g = 0; g < (h === 1 ? n : Math.min(h, n)); g++) cols.forEach((c, j) => put(g, c, g, j));
  } else if (
    view.boxes.length === 1 &&
    view.boxes[0].r0 === view.boxes[0].r1 &&
    view.boxes[0].c0 === view.boxes[0].c1
  ) {
    // one cell: the block starts there - and is selected once written
    const { r0, c0 } = view.boxes[0];
    for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) put(r0 + i, c0 + j, i, j);
    block = {
      from: { id: idAt(grid, r0), field: grid._order[c0].field },
      to: { id: idAt(grid, Math.min(n - 1, r0 + h - 1)), field: grid._order[Math.min(m - 1, c0 + w - 1)].field },
    };
  } else {
    for (const b of view.boxes)
      for (let g = b.r0; g <= b.r1; g++) for (let c = b.c0; c <= b.c1; c++) put(g, c, g - b.r0, c - b.c0);
  }
  const idField = grid._source.idField;
  const patches = new Map<unknown, Record<string, unknown>>();
  const changes: { id: unknown; field: string; value: unknown; oldValue: unknown }[] = [];
  for (const [key, cellText] of targets) {
    const column = grid._order[key % m];
    const record = entries[Math.floor(key / m)].row;
    const id = record[idField];
    const ctx = editContext(grid, record, column);
    if (!column.editable || grid._sourceOptions?.getEditorFn?.(column.field, record[column.field], ctx) === false) {
      detail.skipped++;
      continue;
    }
    const parsed = pastedValue(cellText, ctx, grid);
    let problem = parsed.problem || editorProblem(ctx.rules, parsed.value);
    if (!problem) {
      const answer = grid._sourceOptions?.validateFn?.(column.field, parsed.value, ctx);
      if (typeof answer === 'string' && answer) problem = answer;
      else if (answer === false) problem = 'Invalid value';
    }
    const refuse = (message) => detail.refused.push({ id, field: column.field, text: cellText, message });
    if (problem) {
      refuse(problem);
      continue;
    }
    const oldValue = record[column.field];
    if (JSON.stringify(parsed.value) === JSON.stringify(oldValue)) continue;
    // Fires before an edited value is written - cancelable: preventDefault() keeps the old value.
    const before = new CustomEvent<DataGridBeforeEditDetail>('data-grid-beforeedit', {
      bubbles: true,
      cancelable: true,
      detail: { record, field: column.field, value: parsed.value, oldValue },
    });
    if (!grid.dispatchEvent(before)) {
      refuse('Cancelled');
      continue;
    }
    patches.set(id, { ...patches.get(id), [column.field]: parsed.value });
    changes.push({ id, field: column.field, value: parsed.value, oldValue });
  }
  const written = writeRecords(grid, patches);
  for (const change of changes)
    // Fires after an edited value was written - the new record, the field, the new and the old value.
    grid.dispatchEvent(
      new CustomEvent<DataGridEditDetail>('data-grid-edit', {
        bubbles: true,
        detail: {
          record: written.get(change.id) as DataviewRow,
          field: change.field,
          value: change.value,
          oldValue: change.oldValue,
        },
      }),
    );
  detail.written = changes.length;
  if (block && block.from.id !== undefined && block.to.id !== undefined) {
    grid._anchor = { ...block.from, kind: 'cell' };
    grid._keep = [];
    setSelection(grid, { selectedRanges: [block] });
  }
  // Fires after a paste - how many cells it wrote, how many do not edit, and the values refused with the reason.
  grid.dispatchEvent(new CustomEvent<DataGridPasteDetail>('data-grid-paste', { bubbles: true, detail }));
  return detail;
}

/**
 * Ctrl / Cmd + C and V. A hidden textarea takes the focus for the browser's own copy or paste: its copy and paste
 * events carry the clipboard both ways - TSV and an HTML table out, text in - in every browser, in a sandboxed frame,
 * with no permission to ask (a focused div gets no copy event in Safari, and navigator.clipboard needs a permission
 * an opaque frame does not have). The focus goes back to the cell in the same task.
 */
function clipboardKey(grid, act: 'copy' | 'paste') {
  if (grid._editor || !modelOf(grid)) return;
  let matrix: string[][] | null = null;
  if (act === 'copy') {
    matrix = selectionMatrix(grid);
    if (!matrix) return;
  } else if (grid.hasAttribute('data-readonly') || !grid._order.some((c) => c.editable)) return;
  const back = document.activeElement as HTMLElement | null;
  const proxy = document.createElement('textarea');
  proxy.className = 'data-grid-clipboard';
  proxy.setAttribute('aria-hidden', 'true');
  proxy.tabIndex = -1;
  if (matrix) proxy.value = toTsv(matrix);
  const done = () => {
    if (!proxy.isConnected) return;
    proxy.remove();
    back?.focus({ preventScroll: true });
  };
  proxy.addEventListener('copy', (e) => {
    if (!matrix || !e.clipboardData) return;
    e.preventDefault();
    e.clipboardData.setData('text/plain', proxy.value);
    e.clipboardData.setData('text/html', toHtml(matrix));
    // Fires after Ctrl / Cmd + C put the selection on the clipboard - the text and its size.
    grid.dispatchEvent(
      new CustomEvent<DataGridCopyDetail>('data-grid-copy', {
        bubbles: true,
        detail: { text: proxy.value, rows: matrix.length, columns: matrix[0].length },
      }),
    );
  });
  proxy.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain') ?? '';
    done();
    if (text) pasteInto(grid, text);
  });
  dfDollar(grid).append(proxy);
  proxy.focus({ preventScroll: true });
  proxy.select();
  setTimeout(done);
}

/** the filter row → config.filters (debounced while typing) */
function onFilterInput(grid, e) {
  const input = (e.target as HTMLElement).closest?.<HTMLInputElement>('.data-grid-filter');
  if (!input) return;
  clearTimeout(grid._filterTimer);
  grid._filterTimer = setTimeout(
    () => {
      const filters = dfDollar(grid._parts.filters)
        .find<HTMLInputElement>('.data-grid-filter')
        .toArray()
        .map((el) => parseFilter(el.dataset.field, el.value, el.dataset.kind as 'text' | 'number' | 'select'))
        .filter(Boolean);
      query(grid, { filters, page: 0, collapsed: [] });
    },
    e.type === 'change' ? 0 : 200,
  );
}

/** infinite: near the end, load the next page (from the rows, or the loader) */
async function onNearEnd(grid, force = false) {
  if (paging(grid) !== 'infinite' || grid._loadingMore || !grid._source) return;
  const config = configOf(grid);
  const loaded = grid._source.rows.length > 0;
  const loadedRows = ((config.page || 0) + 1) * pageSize(grid);
  const { viewport } = parts(grid);
  if (!force && viewport.scrollTop + viewport.clientHeight < viewport.scrollHeight - rowHeight(grid) * 4) return;
  if (loadedRows < (grid._result?.entries.length ?? 0)) {
    query(grid, { page: (config.page || 0) + 1 });
    return;
  }
  if (!grid._load || grid._exhausted) return;
  grid._loadingMore = true;
  grid.setAttribute('data-loading-more', '');
  try {
    const more = await grid._load(grid._source.rows.length, pageSize(grid));
    if (!more?.length) grid._exhausted = true;
    else grid._source.setRows([...grid._source.rows, ...more]);
    // the first page arrives in 'loading'; every later one adds a page
    dataGridApi.setState(grid, 'default', loaded && more?.length ? { page: (config.page || 0) + 1 } : {});
  } finally {
    grid._loadingMore = false;
    grid.removeAttribute('data-loading-more');
  }
  // a short first page may not fill the viewport - keep going until it does
  if (!grid._exhausted && grid._parts.viewport.scrollHeight <= grid._parts.viewport.clientHeight) onNearEnd(grid, true);
}

// -- arranging the columns: the menu, moving, resizing ----------------------------

/** the narrowest a column may be dragged (px) */
const MIN_WIDTH = 48;
/** what Alt+Arrow Left / Right adds or takes (px) */
const KEY_STEP = 16;
/** how long a finger rests on a header before it lifts the column (ms) */
const LONG_PRESS_MS = 450;
/** how far a mouse moves before a press on a header becomes a drag, and a finger before a resting touch scrolls (px) */
const DRAG_SLOP = 6;
const TOUCH_SLOP = 10;
// anchor() needs CSS anchor positioning; without it the menu is placed once from the arrow's box
const anchorPositioning = typeof CSS !== 'undefined' && CSS.supports('anchor-name: --a');
let menuSeq = 0;

/** the column order as fields, hidden columns included (no lock grouping) */
const columnFields = (grid, config) => inColumnOrder(grid._columns, config, (c) => c.field).map((c) => c.field);

/** lock or unlock a column; locked keeps the column order */
function setLocked(grid, field, on) {
  const config = configOf(grid);
  const locked = new Set(config.locked || []);
  if (on) locked.add(field);
  else locked.delete(field);
  query(grid, { locked: columnFields(grid, config).filter((f) => locked.has(f)) });
}

/** show or hide a column - never the last one shown */
function setHidden(grid, field, on) {
  const config = configOf(grid);
  const hidden = new Set(config.hidden || []);
  if (on) hidden.add(field);
  else hidden.delete(field);
  if (grid._columns.every((c) => hidden.has(c.field))) return;
  query(grid, { hidden: grid._columns.map((c) => c.field).filter((f) => hidden.has(f)) });
}

/**
 * Move a column to a gap between the shown columns (0 = before the first, n = after the last). A gap inside the
 * locked group locks it, one past it unlocks it, the gap between the two keeps its lock; a hidden column stays after
 * the column it followed.
 */
function dropColumn(grid, field, gap) {
  const config = configOf(grid);
  const shownFields = grid._order.map((c) => c.field);
  const from = shownFields.indexOf(field);
  const column = grid._columns.find((c) => c.field === field);
  if (from < 0 || !column) return;
  gap = Math.max(0, Math.min(shownFields.length, gap));
  if (gap === from || gap === from + 1) return;
  const locked = new Set(config.locked || []);
  const rest = shownFields.filter((f) => f !== field);
  const lockedCount = rest.filter((f) => locked.has(f)).length;
  let at = gap > from ? gap - 1 : gap;
  if (at < lockedCount && !column.lockable) at = lockedCount;
  if (at < lockedCount) locked.add(field);
  else if (at > lockedCount) locked.delete(field);
  rest.splice(at, 0, field);
  const before = arrange(grid._columns, config, (c) => c.field).map((c) => c.field);
  const hidden = new Set(config.hidden || []);
  before.forEach((f, i) => {
    if (!hidden.has(f)) return;
    const after = rest.indexOf(before[i - 1]);
    rest.splice(after + 1, 0, f);
  });
  query(grid, { columns: rest, locked: rest.filter((f) => locked.has(f)) });
}

/** back to the authored columns: their order, lock, visibility and widths */
function resetColumns(grid) {
  query(grid, {
    columns: grid._columns.map((c) => c.field),
    locked: grid._columns.filter((c) => c.lockedAtStart).map((c) => c.field),
    hidden: grid._columns.filter((c) => c.hiddenAtStart).map((c) => c.field),
    widths: {},
  });
}

// -- the column menu: one popover per grid, anchored to the arrow it opened from

function menuOf(grid) {
  if (grid._menu) return grid._menu;
  const menu = document.createElement('div');
  menu.className = 'data-grid-menu';
  menu.id = `data-grid-menu-${++menuSeq}`;
  menu.setAttribute('popover', 'auto');
  menu.setAttribute('role', 'menu');
  dfDollar(grid).append(menu);
  menu.addEventListener('click', (e) => onMenuClick(grid, e));
  menu.addEventListener('keydown', (e) => onMenuKey(grid, e));
  menu.addEventListener('toggle', (e) => {
    const open = (e as Event & { newState?: string }).newState === 'open';
    const button = grid._menuButton;
    button?.setAttribute('aria-expanded', String(open));
    if (open) return;
    // closed from inside (Escape, Tab, a pick): back to its header, or where it was when the column went away
    const inside = menu.contains(document.activeElement) || document.activeElement === document.body;
    const column = grid._columns.find((c) => c.field === grid._menuField);
    grid._menuField = null;
    if (inside && column) {
      const at = grid._order.indexOf(column);
      focusCell(grid, -1, at >= 0 ? at : Math.min(grid._focus.col, grid._order.length - 1));
    }
  });
  grid._menu = menu;
  return menu;
}

/** a menu item: a button with its role, its action and its checked state */
function menuItem(role, action, text, checked, disabled, field?: string) {
  const item = document.createElement('button');
  item.type = 'button';
  item.className = 'data-grid-menu-item';
  item.tabIndex = -1;
  item.setAttribute('role', role);
  item.dataset.action = action;
  if (field) item.dataset.field = field;
  if (checked !== null) item.setAttribute('aria-checked', String(checked));
  item.disabled = disabled;
  item.textContent = text;
  return item;
}

function menuPart(className, role) {
  const el = document.createElement('div');
  el.className = className;
  el.setAttribute('role', role);
  return el;
}

/** (re)write the menu for the column it is open for: sort, lock, the shown columns, reset */
function fillMenu(grid) {
  const menu = grid._menu;
  const column = grid._columns.find((c) => c.field === grid._menuField);
  if (!menu || !column) return;
  const config = configOf(grid);
  const sorter = (config.sorters || []).find((x) => x.field === column.sortField);
  const dir = sorter ? sorter.direction || sorter.dir || 'asc' : null;
  const locked = new Set(config.locked || []);
  const hidden = new Set(config.hidden || []);
  const shownCount = grid._columns.filter((c) => !hidden.has(c.field)).length;
  menu.setAttribute('aria-label', `${labelOf(column)} column`);
  const group = menuPart('data-grid-menu-group', 'group');
  group.setAttribute('aria-label', 'Columns');
  const title = document.createElement('div');
  title.className = 'data-grid-menu-label';
  title.setAttribute('aria-hidden', 'true');
  title.textContent = 'Columns';
  group.append(
    title,
    ...arrange(grid._columns, config, (c) => c.field).map((c) => {
      const isShown = !hidden.has(c.field);
      return menuItem(
        'menuitemcheckbox',
        'show',
        labelOf(c),
        isShown,
        !c.hideable || (isShown && shownCount === 1),
        c.field,
      );
    }),
  );
  menu.textContent = '';
  menu.append(
    menuItem('menuitemradio', 'asc', 'Sort ascending', dir === 'asc', !column.sortable),
    menuItem('menuitemradio', 'desc', 'Sort descending', dir === 'desc', !column.sortable),
    menuPart('data-grid-menu-separator', 'separator'),
    menuItem('menuitemcheckbox', 'lock', 'Lock column', locked.has(column.field), !column.lockable),
    menuPart('data-grid-menu-separator', 'separator'),
    group,
    menuPart('data-grid-menu-separator', 'separator'),
    menuItem('menuitem', 'reset', 'Reset columns', null, false),
  );
}

const menuItems = (grid) =>
  dfDollar(grid._menu)
    .find<HTMLButtonElement>('.data-grid-menu-item')
    .toArray()
    .filter((b) => !b.disabled);

/** open a column's menu at its arrow, the first item focused */
function openMenu(grid, column) {
  const menu = menuOf(grid);
  const button = dfDollar(column.el).children('.data-grid-menu-button').get(0) as HTMLElement | undefined;
  if (!button || column.el.hidden) return;
  if (grid._menuButton && grid._menuButton !== button) {
    grid._menuButton.style.removeProperty('anchor-name');
    grid._menuButton.setAttribute('aria-expanded', 'false');
  }
  grid._menuButton = button;
  // the toggle event comes a task later - the arrow says so now
  button.setAttribute('aria-expanded', 'true');
  grid._menuField = column.field;
  const anchor = `--${menu.id}`;
  button.style.setProperty('anchor-name', anchor);
  menu.style.setProperty('position-anchor', anchor);
  fillMenu(grid);
  if (!menu.matches(':popover-open')) menu.showPopover();
  if (!anchorPositioning) {
    const box = button.getBoundingClientRect();
    menu.style.top = `${Math.min(box.bottom + 4, innerHeight - menu.offsetHeight - 8)}px`;
    menu.style.left = `${Math.max(8, Math.min(box.right - menu.offsetWidth, innerWidth - menu.offsetWidth - 8))}px`;
  }
  menuItems(grid)[0]?.focus({ preventScroll: true });
}

function onMenuClick(grid, e) {
  const item = e.target.closest('.data-grid-menu-item');
  const column = grid._columns.find((c) => c.field === grid._menuField);
  if (!item || item.disabled || !column) return;
  const action = item.dataset.action;
  if (action === 'asc' || action === 'desc') {
    query(grid, { sorters: [{ field: column.sortField, direction: action }], page: 0 });
    grid._menu.hidePopover();
    return;
  }
  if (action === 'reset') {
    resetColumns(grid);
    grid._menu.hidePopover();
    return;
  }
  if (action === 'lock') setLocked(grid, column.field, item.getAttribute('aria-checked') !== 'true');
  if (action === 'show') {
    const hide = item.getAttribute('aria-checked') === 'true';
    setHidden(grid, item.dataset.field, hide);
    // its own column went: the arrow it hangs from is gone
    if (hide && item.dataset.field === column.field) {
      grid._menu.hidePopover();
      return;
    }
  }
  // a checkbox keeps the menu open: write it again, the same item focused
  fillMenu(grid);
  const again = menuItems(grid).find(
    (b) => b.dataset.action === action && (b.dataset.field ?? '') === (item.dataset.field ?? ''),
  );
  again?.focus({ preventScroll: true });
}

/** APG menu keys: arrows, Home / End move; Enter / Space are the buttons' own; Tab leaves (Escape is the popover's) */
function onMenuKey(grid, e) {
  const items = menuItems(grid);
  const at = items.indexOf(document.activeElement as HTMLButtonElement);
  let next = -1;
  if (e.key === 'ArrowDown') next = (at + 1) % items.length;
  else if (e.key === 'ArrowUp') next = (at - 1 + items.length) % items.length;
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = items.length - 1;
  else if (e.key === 'Tab') {
    e.preventDefault();
    grid._menu.hidePopover();
    return;
  } else return;
  e.preventDefault();
  items[next]?.focus({ preventScroll: true });
}

// -- pointer: press a header to drag it (a finger holds first), drag an end edge to resize

const isRtl = (grid) => getComputedStyle(grid).direction === 'rtl';

function onPointerDown(grid, e) {
  if (e.button !== 0 || !e.isPrimary) return;
  const t = e.target;
  const header = t.closest('.data-grid-header');
  if (!header || !grid._parts.head.contains(header)) return;
  const column = grid._columns.find((c) => c.el === header);
  if (!column) return;
  const menuButton = t.closest('.data-grid-menu-button');
  if (menuButton) {
    // light dismiss is about to close the menu this arrow opened - the click must not open it again
    grid._menuClosedBy = grid._menu?.matches(':popover-open') && grid._menuButton === menuButton ? menuButton : null;
    return;
  }
  const handle = t.closest('.data-grid-resizer');
  if (handle) {
    if (!column.resizable) return;
    e.preventDefault();
    try {
      handle.setPointerCapture(e.pointerId);
    } catch {
      // a pointer that already ended
    }
    grid._press = {
      id: e.pointerId,
      column,
      x: e.clientX,
      resize: true,
      handle,
      start: header.getBoundingClientRect().width,
      width: 0,
      rtl: isRtl(grid),
    };
    handle.setAttribute('data-active', '');
    grid.setAttribute('data-resizing', '');
    return;
  }
  const press = {
    id: e.pointerId,
    column,
    x: e.clientX,
    y: e.clientY,
    touch: e.pointerType === 'touch',
    long: false,
    dragging: false,
    timer: 0 as ReturnType<typeof setTimeout> | 0,
    gap: -1,
    tx: 0,
    lastX: e.clientX,
    edge: 0,
  };
  grid._press = press;
  // a finger that rests lifts the column: then it drags it, or opens the menu where it lets go
  if (press.touch)
    press.timer = setTimeout(() => {
      press.long = true;
      header.setAttribute('data-pressed', '');
      // Chrome refuses (and logs) a vibration before the page's first tap
      if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(10);
    }, LONG_PRESS_MS);
}

function onPointerMove(grid, e) {
  if (grid._sweep) return onSweepMove(grid, e);
  const press = grid._press;
  if (!press || e.pointerId !== press.id) return;
  // a mouse released outside the grid sent its pointerup elsewhere: no button, no press
  if (!press.touch && !press.dragging && !press.resize && !e.buttons) {
    endPress(grid);
    return;
  }
  if (press.resize) {
    const dx = (e.clientX - press.x) * (press.rtl ? -1 : 1);
    press.width = Math.max(MIN_WIDTH, Math.round(press.start + dx));
    if (!press.frame)
      press.frame = requestAnimationFrame(() => {
        press.frame = 0;
        showWidths(grid, { ...configOf(grid).widths, [press.column.field]: press.width });
      });
    return;
  }
  const dx = e.clientX - press.x;
  const dy = e.clientY - press.y;
  if (!press.dragging) {
    if (press.touch && !press.long) {
      // a finger that moves before it rests scrolls
      if (Math.hypot(dx, dy) > TOUCH_SLOP) endPress(grid);
      return;
    }
    if (Math.abs(dx) < DRAG_SLOP || !press.column.movable) return;
    beginDrag(grid, e);
  }
  press.lastX = e.clientX;
  dragTo(grid);
}

/** the live widths while a resize runs: the template and the locked offsets, no store write */
function showWidths(grid, widths) {
  const config = { ...configOf(grid), widths };
  layoutColumns(grid, config);
  syncFilters(grid, config);
  grid._gen++;
  renderRows(grid);
}

function beginDrag(grid, e) {
  const press = grid._press;
  const header = press.column.el;
  press.dragging = true;
  press.grab = e.clientX - header.getBoundingClientRect().left;
  try {
    header.setPointerCapture(e.pointerId);
  } catch {
    // a pointer that already ended
  }
  if (grid._menu?.matches(':popover-open')) grid._menu.hidePopover();
  header.setAttribute('data-dragging', '');
  grid.setAttribute('data-dragging', '');
  const marker = document.createElement('div');
  marker.className = 'data-grid-drop-marker';
  marker.setAttribute('aria-hidden', 'true');
  dfDollar(grid._parts.head).append(marker);
  press.marker = marker;
}

/** follow the pointer: the column moves with it, the marker shows the gap it lands in, the edges scroll */
function dragTo(grid) {
  const press = grid._press;
  if (!press?.dragging) return;
  const header = press.column.el;
  const rtl = isRtl(grid);
  const rects = grid._order.map((c) => {
    const r = c.el.getBoundingClientRect();
    // the dragged header is drawn moved: its slot is where it was
    return c === press.column ? { left: r.left - press.tx, right: r.right - press.tx, width: r.width } : r;
  });
  const own = rects[grid._order.indexOf(press.column)];
  press.tx = press.lastX - press.grab - own.left;
  header.style.translate = `${press.tx}px 0`;
  const mid = (r) => r.left + r.width / 2;
  let gap = rects.filter((r) => (rtl ? mid(r) > press.lastX : mid(r) < press.lastX)).length;
  gap = Math.max(0, Math.min(rects.length, gap));
  press.gap = gap;
  const head = grid._parts.head.getBoundingClientRect();
  const edge =
    gap < rects.length ? (rtl ? rects[gap].right : rects[gap].left) : rtl ? rects[gap - 1].left : rects[gap - 1].right;
  press.marker.style.left = `${edge - head.left}px`;
  // the gaps beside its own place move nothing
  const from = grid._order.indexOf(press.column);
  press.marker.hidden = gap === from || gap === from + 1;
  const view = grid._parts.viewport.getBoundingClientRect();
  press.edge = press.lastX < view.left + 32 ? -1 : press.lastX > view.right - 32 ? 1 : 0;
  if (press.edge && !press.scrolling) {
    press.scrolling = true;
    const step = () => {
      if (grid._press !== press || !press.edge) {
        press.scrolling = false;
        return;
      }
      grid._parts.viewport.scrollLeft += press.edge * 12;
      dragTo(grid);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}

function onPointerUp(grid, e) {
  if (grid._pressed)
    // the click comes in the same task as the pointerup, or not at all
    setTimeout(() => {
      grid._pressed = false;
    });
  if (grid._sweep?.id === e.pointerId) endSweep(grid);
  const press = grid._press;
  if (!press || e.pointerId !== press.id) return;
  if (press.resize) {
    if (press.width) query(grid, { widths: { ...configOf(grid).widths, [press.column.field]: press.width } });
    endPress(grid, true);
    return;
  }
  if (press.dragging) {
    const { column, gap } = press;
    endPress(grid, true);
    if (gap >= 0) dropColumn(grid, column.field, gap);
    focusCell(grid, -1, grid._order.indexOf(column));
    return;
  }
  const long = press.long;
  endPress(grid, long);
  if (long) openMenu(grid, press.column);
}

/** clean up a press; swallow the click it ends in when it was a drag, a resize or a long press */
function endPress(grid, swallowClick = false) {
  const press = grid._press;
  if (!press) return;
  grid._press = null;
  clearTimeout(press.timer);
  cancelAnimationFrame(press.frame);
  press.column.el.removeAttribute('data-pressed');
  press.column.el.removeAttribute('data-dragging');
  press.column.el.style.removeProperty('translate');
  press.marker?.remove();
  press.handle?.removeAttribute('data-active');
  grid.removeAttribute('data-dragging');
  grid.removeAttribute('data-resizing');
  if (swallowClick) {
    grid._suppressClick = true;
    // the click comes in the same task as the pointerup, or not at all
    setTimeout(() => {
      grid._suppressClick = false;
    });
  }
}

// -- df$.shadcn.dataGrid: the imperative surface -------------------------------

const resolve = (target) => (typeof target === 'string' ? dfDollar(target).get(0) : target);

df$.dataGrid = {
  /**
   * Hand the grid its records. Options: idField ('id'), parentIdField (a
   * tree grid; or data-parent-field), cells ({ field: (el, record, meta) })
   * custom cell content, load(offset, size) returning a Promise<records[]> for
   * data-paging="infinite" from a remote source, query ({ sorters, filters,
   * locked, ... }) the starting query, persist ({ area: 'session' | 'local' |
   * 'none', prefix, key }) where the view is kept - a kept view wins over
   * the starting query.
   * @param target - the .data-grid element or its selector
   * @param rows - the records (a tree grid: a flat list linked by parent id)
   * @param options - fields, custom cells, a remote loader, the starting view and its persistence
   */
  setSource(target: string | HTMLElement, rows: DataviewRow[], options: DataGridOptions = {}): void {
    const grid = resolve(target);
    grid._sourceOptions = options;
    const parentIdField = options.parentIdField || grid.dataset.parentField;
    const idField = options.idField || grid.dataset.idField || 'id';
    grid._source = dataSource(rows, { idField, tree: parentIdField ? { idField, parentIdField } : undefined });
    grid._cells = options.cells || null;
    grid._load = options.load || null;
    grid._exhausted = false;
    // the grid is the viewport (init)
    dfDollar(grid)
      .children('.data-grid-viewport')
      .attr('role', parentIdField ? 'treegrid' : 'grid');
    if (!grid.store) return;
    if (grid._parts.filters) grid._parts.filters._key = ''; // select options follow the data
    const patch = { ...options.query, ...(options.persist ? attachPersistence(grid, options.persist) : {}) };
    // a loader with nothing loaded yet: 'loading' until its first page lands
    if (grid._load && !rows.length) {
      dataGridApi.setState(grid, 'loading', { ...patch, page: 0 });
      onNearEnd(grid, true);
      return;
    }
    dataGridApi.setState(grid, 'default', patch);
  },
  /**
   * Merge into the query: { filters?, sorters?, locked?, page?, expanded?, selected? }.
   * @param target - the .data-grid element or its selector
   * @param patch - the query keys to change
   */
  query: (target: string | HTMLElement, patch: DataGridQuery): void => {
    query(resolve(target), patch);
  },
  /**
   * The records the query shows.
   * @param target - the .data-grid element or its selector
   * @returns the records in query order, every page
   */
  rows: (target: string | HTMLElement): DataviewRow[] => (resolve(target)._result?.entries ?? []).map((e) => e.row),
  /**
   * The grid's query source: its records, the cached query and aggregation over them (source.aggregate(query,
   * spec)) - a chart that groups what the grid's filters match reads this, not a second copy of the records.
   * @param target - the .data-grid element or its selector
   * @returns its source, undefined before setSource()
   */
  source: (target: string | HTMLElement): DataSource<DataviewRow> | undefined => resolve(target)._source,
  /**
   * The selected records.
   * @param target - the .data-grid element or its selector
   * @returns the selected records, in source order
   */
  selected(target: string | HTMLElement): DataviewRow[] {
    const grid = resolve(target);
    const ids = grid._selected ?? new Set();
    return (grid._source?.rows ?? []).filter((r) => ids.has(r[grid._source.idField]));
  },
  /**
   * Select everything the selection model selects: every row the query shows (all pages), every shown column
   * (data-select-model="column"), or every cell (data-select-model="cell") - what Ctrl / Cmd + A does.
   * @param target - the .data-grid element or its selector
   */
  selectAll: (target: string | HTMLElement): void => selectAll(resolve(target)),
  /**
   * Select nothing: no row, no column, no cell.
   * @param target - the .data-grid element or its selector
   */
  clearSelection: (target: string | HTMLElement): void => {
    setSelection(resolve(target), { selected: [], selectedColumns: [], selectedRanges: [] });
  },
  /**
   * The selection as a spreadsheet reads it - what Ctrl / Cmd + C copies: tab-separated values, a line a row, a value
   * quoted when it holds a tab, a line break or a quote. The selected rows with every shown column, every row of the
   * query with the selected columns, or the rows and columns the cell ranges touch (a cell outside them empty).
   * Numbers stay plain, a date column's day is YYYY-MM-DD.
   * @param target - the .data-grid element or its selector
   * @returns the text, '' when nothing is selected
   */
  copyText(target: string | HTMLElement): string {
    const matrix = selectionMatrix(resolve(target));
    return matrix ? toTsv(matrix) : '';
  },
  /**
   * Paste tab-separated values (from Excel, Google Sheets or a grid) into the selection - what Ctrl / Cmd + V does.
   * Only selected cells change, except a single selected cell, where the block starts (and is selected after). A
   * one-line clipboard fills every selected row, a one-column one every selected column; otherwise the values land
   * once, in order. Cells of columns that do not edit are skipped; every value passes the column's rules and
   * validateFn, and data-grid-beforeedit may cancel it. One write, then data-grid-edit per cell and data-grid-paste.
   * @param target - the .data-grid element or its selector
   * @param text - tab-separated values, a line a row
   * @returns how many cells were written and skipped, and the values refused with the reason
   */
  paste: (target: string | HTMLElement, text: string): DataGridPasteDetail => pasteInto(resolve(target), text),
  /**
   * Tree grid: open every branch.
   * @param target - the .data-grid element or its selector
   */
  expandAll(target: string | HTMLElement): void {
    const grid = resolve(target);
    query(grid, { expanded: grid._source.branchIds(), collapsed: [] });
  },
  /**
   * Tree grid: close every branch (while filtering: the ways to the matches too).
   * @param target - the .data-grid element or its selector
   */
  collapseAll(target: string | HTMLElement): void {
    const grid = resolve(target);
    const filtering = (configOf(grid).filters || []).length > 0;
    query(grid, filtering ? { collapsed: grid._source.branchIds() } : { expanded: [] });
  },
  /**
   * Back to the authored columns: their order, lock (data-locked), visibility (hidden) and widths (data-width) - what
   * the column menu's "Reset columns" does.
   * @param target - the .data-grid element or its selector
   */
  resetColumns: (target: string | HTMLElement): void => resetColumns(resolve(target)),
  /**
   * Open the editor of a record's cell (an editable column - data-editable on its header). The record is scrolled
   * into view first.
   * @param target - the .data-grid element or its selector
   * @param id - the record's id
   * @param field - the column's field
   * @returns false when the cell does not edit (no such record shown, a column without data-editable, getEditorFn
   *   answered false)
   */
  edit(target: string | HTMLElement, id: DataviewJsonValue, field: string): boolean {
    const grid = resolve(target);
    const row = grid._shown.findIndex((x) => x.row[grid._source.idField] === id);
    const col = grid._order.findIndex((c) => c.field === field);
    if (row < 0 || col < 0) return false;
    focusCell(grid, row, col);
    return openEdit(grid, row, col);
  },
  /**
   * Commit the open editor.
   * @param target - the .data-grid element or its selector
   * @returns false when its value is refused (the editor stays open with the message); true otherwise
   */
  commit: (target: string | HTMLElement): boolean => commitEdit(resolve(target)),
  /**
   * Close the open editor without writing.
   * @param target - the .data-grid element or its selector
   */
  cancel: (target: string | HTMLElement): void => cancelEdit(resolve(target)),
  /**
   * Write new values into one record - what an edit writes, from script (a custom cell's own control, a form beside
   * the grid). The record is replaced by a new object; the query runs again. Fires data-grid-edit per field.
   * @param target - the .data-grid element or its selector
   * @param id - the record's id
   * @param patch - the fields to change and their new values
   * @returns the new record, null when no record has that id
   */
  update(target: string | HTMLElement, id: DataviewJsonValue, patch: DataviewRow): DataviewRow | null {
    const grid = resolve(target);
    const old = grid._source.rows.find((r) => r[grid._source.idField] === id);
    if (!old) return null;
    const record = writeRecord(grid, id, patch);
    for (const field of Object.keys(patch))
      grid.dispatchEvent(
        new CustomEvent<DataGridEditDetail>('data-grid-edit', {
          bubbles: true,
          detail: { record, field, value: patch[field], oldValue: old[field] },
        }),
      );
    return record;
  },
  /**
   * Insert records - what a drop writes, from script (a button that moves the selected rows to another grid, the
   * keyboard's way to do what a drag does). They land where at says, in their order; a record whose id the grid
   * already holds gets a new one (numbers: after the largest, text: "id-2" ...). In a tree grid records may bring
   * their children (linked by parent id among themselves); the others take the place's parent - into a record: it.
   * No event fires - the page asked for it.
   * @param target - the .data-grid element or its selector
   * @param records - the records to insert
   * @param at - where: beside a record ({ id, place: 'before' | 'after' }), into one (a tree grid: 'into'), or at the
   *   end (the default)
   * @returns the records as inserted (with their ids), null when the place is no record of the grid
   */
  insert(
    target: string | HTMLElement,
    records: DataviewRow[],
    at: DataGridDropAt = { id: null, place: 'end' },
  ): DataviewRow[] | null {
    const grid = resolve(target);
    if (!grid?._source || !grid.store) return null;
    const fields = fieldsOf(grid);
    const placed = placeRecords({
      rows: grid._source.rows,
      ...fields,
      from: { version: 1, records, roots: records.map((r) => r[fields.idField] as DataviewJsonValue), ...fields },
      at,
      copy: false,
      within: false,
    });
    if (!placed) return null;
    writeRows(grid, placed.rows);
    return placed.inserted;
  },
  /**
   * Take records out - what a move takes out of the grid it leaves. In a tree grid everything under them goes with
   * them. The selection keeps what is left. No event fires - the page asked for it.
   * @param target - the .data-grid element or its selector
   * @param ids - the ids of the records to take out
   * @returns the records taken out (a tree grid: with the ones under them), in source order
   */
  remove(target: string | HTMLElement, ids: DataviewJsonValue[]): DataviewRow[] {
    const grid = resolve(target);
    if (!grid?._source || !grid.store) return [];
    const fields = fieldsOf(grid);
    const gone = subtreeOf(grid._source.rows, ids, fields);
    if (gone.length) writeRows(grid, withoutRecords(grid._source.rows, gone, fields.idField));
    return gone;
  },
};

// -- init --------------------------------------------------------------------------

function init() {
  dfDollar('.data-grid:not([data-init])')
    .toArray()
    .forEach((grid) => {
      grid.dataset.init = '';
      const viewport = dfDollar(grid).children('.data-grid-viewport').get(0);
      const head = viewport && dfDollar(viewport).children('.data-grid-head').get(0);
      const body = viewport && dfDollar(viewport).children('.data-grid-body').get(0);
      if (!viewport || !head || !body) return;
      let footer = dfDollar(grid).children('.data-grid-footer').get(0);
      if (!footer) {
        footer = document.createElement('div');
        footer.className = 'data-grid-footer';
        dfDollar(grid).append(footer);
      }
      // the empty message: CSS attr() reads the body's own attribute
      body.dataset.emptyText = grid.dataset.emptyText || 'No rows match.';
      const pool = document.createElement('div');
      pool.className = 'data-grid-rows';
      pool.setAttribute('role', 'presentation');
      dfDollar(body).append(pool);
      grid._parts = { viewport, head, body, pool, footer };
      grid._columns = readColumns(grid);
      // before its first query (no records yet) a grid shows no rows in the authored column order - keys and clicks on
      // its headers read both
      grid._order = grid._columns;
      grid._shown = [];
      grid._focus = { row: 0, col: 0 };
      grid._selected = new Set();
      grid._rowHeight = parseFloat(getComputedStyle(grid).getPropertyValue('--data-grid-row-height')) || 36;
      // the grid is the viewport - the element that holds the rows and nothing else: the footer's status and pager
      // and the column menu stay outside it (a grid owns rows only). The name authored on the root moves with it
      // (a plain div may not carry one).
      // A name written later - a translation (defuss-i18n writes aria-label) - moves too.
      if (!viewport.hasAttribute('role')) viewport.setAttribute('role', grid.dataset.parentField ? 'treegrid' : 'grid');
      const moveName = () => {
        for (const name of ['aria-label', 'aria-labelledby']) {
          const value = grid.getAttribute(name);
          if (value === null) continue;
          viewport.setAttribute(name, value);
          grid.removeAttribute(name);
        }
      };
      moveName();
      new MutationObserver(moveName).observe(grid, {
        attributes: true,
        attributeFilter: ['aria-label', 'aria-labelledby'],
      });
      if (grid.dataset.select === 'multiple') viewport.setAttribute('aria-multiselectable', 'true');
      const headerRow = headerRowOf(grid);
      headerRow?.setAttribute('role', 'row');
      headerRow?.setAttribute('aria-rowindex', '1');
      for (const column of grid._columns) {
        column.el.setAttribute('role', 'columnheader');
        column.el.tabIndex = -1;
      }
      buildHeaderTools(grid);
      buildFilters(grid);

      // the authored query (data-locked / data-sort headers), then setSource's
      // starting query (records may arrive first), then the kept view
      const early = grid._sourceOptions || {};
      const config = {
        filters: [],
        sorters: authoredSort(grid),
        locked: grid._columns.filter((c) => c.lockedAtStart).map((c) => c.field),
        columns: grid._columns.map((c) => c.field),
        hidden: grid._columns.filter((c) => c.hiddenAtStart).map((c) => c.field),
        widths: {},
        page: 0,
        expanded: [],
        collapsed: [],
        selected: [],
        selectedColumns: [],
        selectedRanges: [],
        ...early.query,
        ...attachPersistence(grid, early.persist),
      };

      // one render per animation frame, however many scroll events arrive
      let queued = false;
      viewport.addEventListener(
        'scroll',
        () => {
          if (queued) return;
          queued = true;
          requestAnimationFrame(() => {
            queued = false;
            renderRows(grid);
            onNearEnd(grid);
          });
        },
        { passive: true },
      );
      new ResizeObserver(() => {
        if (!grid._order) return;
        layoutColumns(grid, configOf(grid));
        grid._gen++;
        renderRows(grid);
      }).observe(grid);
      grid.addEventListener('click', (e) => onClick(grid, e));
      head.addEventListener('pointerdown', (e) => onPointerDown(grid, e));
      grid.addEventListener('pointermove', (e) => onPointerMove(grid, e));
      grid.addEventListener('pointerup', (e) => onPointerUp(grid, e));
      grid.addEventListener('pointercancel', () => {
        endPress(grid);
        endSweep(grid);
      });
      body.addEventListener('pointerdown', (e) => onBodyPress(grid, e));
      grid.addEventListener('pointerover', (e) => hoverAt(grid, e.target));
      grid.addEventListener('pointerleave', () => hoverAt(grid, null));
      // a finger that rested sweeps a range: the grid must not scroll under it, nor a long-press menu open
      body.addEventListener(
        'touchmove',
        (e) => {
          if (grid._sweep?.active && grid._sweep.touch) e.preventDefault();
        },
        { passive: false },
      );
      body.addEventListener('contextmenu', (e) => {
        if (grid._sweep?.touch) e.preventDefault();
      });
      // a finger that lifted a column drags it: the page must not scroll under it
      head.addEventListener(
        'touchmove',
        (e) => {
          if (grid._press && (grid._press.long || grid._press.dragging || grid._press.resize)) e.preventDefault();
        },
        { passive: false },
      );
      // right click, the context-menu key, Shift+F10: the header's menu (a finger's long press opens it on release)
      head.addEventListener('contextmenu', (e) => {
        const header = (e.target as HTMLElement).closest('.data-grid-header');
        const column = grid._columns.find((c) => c.el === header);
        if (!column) return;
        e.preventDefault();
        if (grid._press?.touch) grid._press.long = true;
        else openMenu(grid, column);
      });
      grid.addEventListener('dblclick', (e) => {
        // a double click on an editable cell opens its editor
        const cell = (e.target as HTMLElement).closest<HTMLElement>('.data-grid-cell');
        const rowEl = cell?.closest<HTMLElement & { _index?: number }>('.data-grid-row');
        if (cell && rowEl && grid._parts.pool.contains(rowEl) && !cell.hasAttribute('data-editing')) {
          if (openEdit(grid, rowEl._index, [...rowEl.children].indexOf(cell))) e.preventDefault();
          return;
        }
        // a double click on a resize handle gives the column its authored width again
        const handle = (e.target as HTMLElement).closest<HTMLElement>('.data-grid-resizer');
        if (!handle) return;
        const field = handle.dataset.field ?? '';
        const { [field]: _dropped, ...widths } = configOf(grid).widths || {};
        query(grid, { widths });
      });
      grid.addEventListener('keydown', (e) => onKeydown(grid, e));
      // rows drag out (data-drag) and records drop in (data-drop) - the native Drag and Drop API
      body.addEventListener('dragstart', (e) => onDragStart(grid, e));
      body.addEventListener('dragend', () => onDragEnd(grid));
      viewport.addEventListener('dragenter', (e) => onDragOver(grid, e));
      viewport.addEventListener('dragover', (e) => onDragOver(grid, e));
      viewport.addEventListener('dragleave', (e) => {
        if (!viewport.contains(e.relatedTarget as Node | null)) showDrop(grid, null);
      });
      viewport.addEventListener('drop', (e) => onDrop(grid, e));
      // the selection model, the drag and the drop are read as they are: switching one draws the rows again (the
      // checkbox column comes or goes)
      new MutationObserver(() => {
        if (!grid.store || !grid._source) return;
        grid._gen++;
        triggerStateChange(grid, grid.store.value, grid.store.value);
      }).observe(grid, { attributes: true, attributeFilter: ['data-select', 'data-select-model', 'data-drag'] });
      grid.addEventListener('input', (e) => onFilterInput(grid, e));
      grid.addEventListener('change', (e) => onFilterInput(grid, e));
      grid.addEventListener('focusin', (e) => {
        // the first Tab lands on the active cell
        if (e.target === grid) focusCell(grid, grid._focus.row, grid._focus.col);
      });

      // el.store + el.api (AGENTS.md "State through stores"): no records yet = loading
      bindComponent(grid, dataGridApi, { name: grid._source ? 'default' : 'loading', config });
      dataGridApi.setState(
        grid,
        grid._source && !(grid._load && !grid._source.rows.length) ? 'default' : 'loading',
        config,
      );
      if (grid._load && !grid._source.rows.length) onNearEnd(grid, true);
    });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
