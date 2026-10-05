/**
 * Why: one query engine for every big-data component (virtual list, data
 * tree, data grid / tree grid). defuss-dataview sorts, pages and walks
 * hierarchies over plain row arrays; a DataSource wraps rows and answers
 * queries:
 *
 * - The full result of a query is computed ONCE and cached (sorting and
 *   filtering must scan every row) - every scroll window or page is a slice.
 * - Filters match case-insensitively in a pre-pass that yields the matching
 *   ids, which dataview then receives as one `in` filter - so a tree keeps the
 *   ancestors of its matches and sorting stays dataview's.
 * - Selection is not part of the query (a Set lookup at render time), so
 *   selecting never invalidates the cached result.
 *
 * Emitted once inside core (df$.dataview for pages and apps; components bind
 * through df$.shadcn.shared). A query is plain JSON - it is what the
 * components keep in their store (el.store.value.config).
 */
import {
  addRows,
  createDataview,
  evaluateDataview,
  removeRows,
  setParent,
  updateRows,
} from 'defuss-dataview';
import type { DataviewEntry, DataviewFilter, DataviewFilterOperator, DataviewJsonValue, DataviewRow, DataviewSorter } from 'defuss-dataview';

export { addRows, createDataview, evaluateDataview, removeRows, setParent, updateRows };
export type { DataviewEntry, DataviewFilter, DataviewFilterOperator, DataviewJsonValue, DataviewRow, DataviewSorter };

/** What a component asks a source - plain JSON, kept in its store. */
export interface DataQuery {
  filters?: DataviewFilter[];
  sorters?: DataviewSorter[];
  /** tree: the expanded ids. While a filter is active every branch holding a
   *  match opens (the matches must be visible) except `collapsed`. */
  expanded?: DataviewJsonValue[];
  /** tree, while filtering: branches the user closed again */
  collapsed?: DataviewJsonValue[];
}

export interface TreeFields {
  idField: string;
  parentIdField: string;
}

export interface DataResult<T extends DataviewRow> {
  /** every entry the query shows, in order - slice it for a window or page */
  entries: Array<DataviewEntry<T>>;
  /** all rows of the source */
  totalRows: number;
  /** rows that satisfy the filters */
  matchedRows: number;
  /** rows shown: matches + (tree) their ancestors, inside open branches */
  visibleRows: number;
}

export interface DataSource<T extends DataviewRow> {
  readonly rows: readonly T[];
  readonly idField: string;
  readonly tree?: TreeFields;
  /** the query's result (cached until the query or the rows change) */
  query(query?: DataQuery): DataResult<T>;
  /** replace the rows (a new array: dataview's helpers return one) */
  setRows(rows: readonly T[]): void;
  /** every id of a row that has children (tree) - for "expand all" */
  branchIds(): DataviewJsonValue[];
}

const lower = (v: unknown): string => (v == null ? '' : String(v)).toLowerCase();

/** one filter as a predicate - strings case-insensitively */
function predicate(filter: DataviewFilter): (row: DataviewRow) => boolean {
  const { field, op, value } = filter;
  if (op === 'in') {
    const set = new Set((Array.isArray(value) ? value : [value]).map((v) => (typeof v === 'string' ? v.toLowerCase() : v)));
    return (row) => {
      const v = row[field];
      return set.has(typeof v === 'string' ? v.toLowerCase() : (v as DataviewJsonValue));
    };
  }
  if (typeof value === 'string' && op !== 'gt' && op !== 'gte' && op !== 'lt' && op !== 'lte') {
    const needle = value.toLowerCase();
    switch (op) {
      case 'contains': return (row) => lower(row[field]).includes(needle);
      case 'startsWith': return (row) => lower(row[field]).startsWith(needle);
      case 'endsWith': return (row) => lower(row[field]).endsWith(needle);
      case 'neq': return (row) => lower(row[field]) !== needle;
      default: return (row) => lower(row[field]) === needle;
    }
  }
  return (row) => {
    const v = row[field] as number | null;
    switch (op) {
      case 'gt': return v != null && v > (value as number);
      case 'gte': return v != null && v >= (value as number);
      case 'lt': return v != null && v < (value as number);
      case 'lte': return v != null && v <= (value as number);
      case 'neq': return v !== value;
      default: return v === value;
    }
  };
}

/** Wrap rows (flat, or a tree by `tree` fields) as a cached query source. */
export function dataSource<T extends DataviewRow>(rows: readonly T[], options: { idField?: string; tree?: TreeFields } = {}): DataSource<T> {
  const idField = options.tree?.idField ?? options.idField ?? 'id';
  let current = rows;
  let cacheKey = '';
  let cache: DataResult<T> | null = null;
  let matchKey = '';
  let matchIds: DataviewJsonValue[] | null = null;
  let branches: DataviewJsonValue[] | null = null;

  /** ids of the rows every filter accepts (cached per filter set) */
  const matching = (filters: DataviewFilter[]): DataviewJsonValue[] => {
    const key = JSON.stringify(filters);
    if (matchIds && key === matchKey) return matchIds;
    const tests = filters.map(predicate);
    const ids: DataviewJsonValue[] = [];
    for (const row of current) if (tests.every((t) => t(row))) ids.push(row[idField] as DataviewJsonValue);
    matchKey = key;
    matchIds = ids;
    return ids;
  };

  return {
    get rows() { return current; },
    idField,
    tree: options.tree,
    query(q = {}) {
      const key = JSON.stringify([q.filters ?? [], q.sorters ?? [], q.expanded ?? [], q.collapsed ?? []]);
      if (cache && key === cacheKey) return cache;
      const filters = (q.filters ?? []).filter((f) => f && f.field && f.value !== '' && f.value != null);
      const filtering = filters.length > 0;
      const view = createDataview({
        idField,
        sorters: q.sorters ?? [],
        filters: filtering ? [{ field: idField, op: 'in', value: matching(filters) }] : [],
        tree: options.tree
          ? {
            ...options.tree,
            includeAncestors: true,
            // filtering opens the way to every match; otherwise what the user opened
            ...(filtering ? { expandAll: true, collapsedIds: q.collapsed ?? [] } : { expandedIds: q.expanded ?? [] }),
          }
          : undefined,
      });
      const result = evaluateDataview(current, view);
      cache = { entries: result.entries, totalRows: result.totalRows, matchedRows: result.matchedRows, visibleRows: result.visibleRows };
      cacheKey = key;
      return cache;
    },
    setRows(next) {
      current = next;
      cache = null;
      cacheKey = '';
      matchIds = null;
      branches = null;
    },
    branchIds() {
      if (!options.tree) return [];
      if (branches) return branches;
      const parents = new Set<unknown>();
      for (const row of current) {
        const parent = row[options.tree.parentIdField];
        if (parent != null) parents.add(parent);
      }
      branches = current.filter((row) => parents.has(row[idField])).map((row) => row[idField] as DataviewJsonValue);
      return branches;
    },
  };
}

/**
 * A column filter typed by a person, as a query filter: numbers take an
 * optional operator (`>10`, `<=3`, `!=0`, `=7`), text matches anywhere
 * (`contains`), a choice matches exactly. Empty text = no filter (null).
 */
export function parseFilter(field: string, text: string, kind: 'text' | 'number' | 'select' = 'text'): DataviewFilter | null {
  const raw = text.trim();
  if (!raw) return null;
  if (kind === 'select') return { field, op: 'eq', value: raw };
  if (kind === 'number') {
    const m = /^(>=|<=|!=|>|<|=)?\s*(-?\d+(?:\.\d+)?)$/.exec(raw);
    if (!m) return null;
    const ops: Record<string, DataviewFilterOperator> = { '>=': 'gte', '<=': 'lte', '!=': 'neq', '>': 'gt', '<': 'lt', '=': 'eq' };
    return { field, op: ops[m[1] ?? '='] ?? 'eq', value: Number(m[2]) };
  }
  return { field, op: 'contains', value: raw };
}

/** The text a filter came from (the inverse of parseFilter) - for inputs. */
export function filterText(filter: DataviewFilter | undefined): string {
  if (!filter) return '';
  const sym: Partial<Record<DataviewFilterOperator, string>> = { gte: '>=', lte: '<=', neq: '!=', gt: '>', lt: '<' };
  return (sym[filter.op] ?? '') + String(filter.value ?? '');
}

/**
 * Multisort the way spreadsheets do: a plain click sorts by this field alone
 * (asc → desc → off); `add` (Shift+click) keeps the other fields and cycles
 * this one in place.
 */
export function cycleSort(sorters: DataviewSorter[] = [], field: string, add = false): DataviewSorter[] {
  const at = sorters.findIndex((s) => s.field === field);
  const dir = at < 0 ? undefined : (sorters[at].direction ?? sorters[at].dir ?? 'asc');
  const next = dir === undefined ? 'asc' : dir === 'asc' ? 'desc' : null;
  if (!add) return next ? [{ field, direction: next }] : [];
  const kept = sorters.map((s) => ({ field: s.field, direction: s.direction ?? s.dir ?? 'asc' }));
  if (at < 0) return [...kept, { field, direction: 'asc' }];
  if (!next) return kept.filter((_, i) => i !== at);
  kept[at] = { field, direction: next };
  return kept;
}
