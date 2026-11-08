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
 * - Aggregation (aggregate(), source.aggregate()) groups the rows a query's
 *   filters match - by fields, numeric bins or calendar units - and measures
 *   each group (count, sum, avg, min, max, distinct). defuss-dataview filters,
 *   sorts and pages but does not group; this is the step a chart needs to show
 *   a million rows as a handful of bars, and it reuses the filter pre-pass the
 *   grids already ran. VERIFIED: (Chromium, 1,000,000 rows, the Big Data
 *   charts page) one aggregation takes 25-50 ms after a 60-70 ms filter scan;
 *   tests/dataview.test.ts pins the spec's semantics.
 *
 * Emitted once inside core (df$.dataview for pages and apps; components bind
 * through df$.shadcn.shared). A query is plain JSON - it is what the
 * components keep in their store (el.store.value.config).
 */
import { addRows, createDataview, evaluateDataview, removeRows, setParent, updateRows } from 'defuss-dataview';
import type {
  DataviewEntry,
  DataviewFilter,
  DataviewFilterOperator,
  DataviewJsonValue,
  DataviewRow,
  DataviewSorter,
} from 'defuss-dataview';

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
  /** the rows a query's filters match, grouped and measured (cached until the filters, the spec or the rows change) */
  aggregate(query: DataQuery | undefined, spec: AggregateSpec): AggregateResult;
}

/** A group key of an aggregation: a field, optionally binned. */
export interface AggregateGroup {
  /** the field grouped by (a dot path) */
  field: string;
  /** a numeric bin width (10: 0-9, 10-19, ...) or a calendar unit for time values (ms since 1970, a Date or an ISO
   *  string); the key is the bin's start - a number, or the unit's start in ms (UTC) */
  bucket?: number | AggregateUnit;
  /** the key's name in a result row (default: the field) */
  as?: string;
}

/** A calendar unit of a time bucket (UTC; a week starts on Monday). */
export type AggregateUnit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

/** A measure of every group. */
export interface AggregateMeasure {
  /** count: the rows; sum, avg, min, max: over the field's numbers; distinct: how many different values */
  op: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct';
  /** the field measured (every op but count) */
  field?: string;
  /** the measure's name in a result row (default: the op, or op_field) */
  as?: string;
}

/** How rows become groups - plain JSON, so a chart can keep it. */
export interface AggregateSpec {
  /** the group keys (none: one group of every row) */
  groupBy?: string | AggregateGroup | Array<string | AggregateGroup>;
  /** what each group measures (default: count) */
  measures?: AggregateMeasure[];
  /** the order of the groups: by a key or a measure (default: the first key ascending; with a limit: the first measure
   *  descending) */
  sort?: { by: string; direction?: 'asc' | 'desc' };
  /** keep the first groups after sorting; the rest become one group named `other` (or are dropped without it) */
  limit?: number;
  /** the key of the group the groups past the limit are merged into */
  other?: string;
  /** one binned key: the empty bins between the first and the last group too, with zero measures (at most 10,000) */
  fill?: boolean;
}

/** One group: its keys and its measures. */
export type AggregateRow = Record<string, DataviewJsonValue>;

/** What source.aggregate() answers. */
export interface AggregateResult {
  /** the groups, in order */
  rows: AggregateRow[];
  /** the rows the filters matched - what the groups were made of */
  matchedRows: number;
  /** every row of the source */
  totalRows: number;
}

const lower = (v: unknown): string => (v == null ? '' : String(v)).toLowerCase();

/** one filter as a predicate - strings case-insensitively */
function predicate(filter: DataviewFilter): (row: DataviewRow) => boolean {
  const { field, op, value } = filter;
  if (op === 'in') {
    const set = new Set(
      (Array.isArray(value) ? value : [value]).map((v) => (typeof v === 'string' ? v.toLowerCase() : v)),
    );
    return (row) => {
      const v = row[field];
      return set.has(typeof v === 'string' ? v.toLowerCase() : (v as DataviewJsonValue));
    };
  }
  if (typeof value === 'string' && op !== 'gt' && op !== 'gte' && op !== 'lt' && op !== 'lte') {
    const needle = value.toLowerCase();
    switch (op) {
      case 'contains':
        return (row) => lower(row[field]).includes(needle);
      case 'startsWith':
        return (row) => lower(row[field]).startsWith(needle);
      case 'endsWith':
        return (row) => lower(row[field]).endsWith(needle);
      case 'neq':
        return (row) => lower(row[field]) !== needle;
      default:
        return (row) => lower(row[field]) === needle;
    }
  }
  return (row) => {
    const v = row[field] as number | null;
    switch (op) {
      case 'gt':
        return v != null && v > (value as number);
      case 'gte':
        return v != null && v >= (value as number);
      case 'lt':
        return v != null && v < (value as number);
      case 'lte':
        return v != null && v <= (value as number);
      case 'neq':
        return v !== value;
      default:
        return v === value;
    }
  };
}

/** Wrap rows (flat, or a tree by `tree` fields) as a cached query source. */
export function dataSource<T extends DataviewRow>(
  rows: readonly T[],
  options: { idField?: string; tree?: TreeFields } = {},
): DataSource<T> {
  const idField = options.tree?.idField ?? options.idField ?? 'id';
  let current = rows;
  let cacheKey = '';
  let cache: DataResult<T> | null = null;
  let matchKey = '';
  let matchIds: DataviewJsonValue[] | null = null;
  let matchRows: T[] = [];
  let branches: DataviewJsonValue[] | null = null;
  let aggKey = '';
  let aggCache: AggregateResult | null = null;

  /** the rows every filter accepts and their ids (cached per filter set - the grid's query and a chart's
   *  aggregation over the same filters share one scan) */
  const matching = (filters: DataviewFilter[]): DataviewJsonValue[] => {
    const key = JSON.stringify(filters);
    if (matchIds && key === matchKey) return matchIds;
    const tests = filters.map(predicate);
    const ids: DataviewJsonValue[] = [];
    const hits: T[] = [];
    for (const row of current)
      if (tests.every((t) => t(row))) {
        ids.push(row[idField] as DataviewJsonValue);
        hits.push(row);
      }
    matchKey = key;
    matchIds = ids;
    matchRows = hits;
    return ids;
  };
  const activeFilters = (q: DataQuery = {}): DataviewFilter[] =>
    (q.filters ?? []).filter((f) => f && f.field && f.value !== '' && f.value != null);

  return {
    get rows() {
      return current;
    },
    idField,
    tree: options.tree,
    query(q = {}) {
      const key = JSON.stringify([q.filters ?? [], q.sorters ?? [], q.expanded ?? [], q.collapsed ?? []]);
      if (cache && key === cacheKey) return cache;
      const filters = activeFilters(q);
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
      cache = {
        entries: result.entries,
        totalRows: result.totalRows,
        matchedRows: result.matchedRows,
        visibleRows: result.visibleRows,
      };
      cacheKey = key;
      return cache;
    },
    setRows(next) {
      current = next;
      cache = null;
      cacheKey = '';
      matchIds = null;
      matchRows = [];
      branches = null;
      aggCache = null;
      aggKey = '';
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
    aggregate(q, spec) {
      const filters = activeFilters(q);
      const key = JSON.stringify([filters, spec]);
      if (aggCache && key === aggKey) return aggCache;
      let rows: readonly T[] = current;
      if (filters.length) {
        matching(filters);
        rows = matchRows;
      }
      aggCache = { rows: aggregate(rows, spec), matchedRows: rows.length, totalRows: current.length };
      aggKey = key;
      return aggCache;
    },
  };
}

// -- aggregation -----------------------------------------------------------------------------

const UNIT_MS: Partial<Record<AggregateUnit, number>> = { minute: 6e4, hour: 36e5, day: 864e5, week: 6048e5 };

/** a dot path's value (own properties only, like dataview's fields) */
function valueAt(row: DataviewRow, path: string): unknown {
  if (!path.includes('.')) return Object.hasOwn(row, path) ? row[path] : undefined;
  let v: unknown = row;
  for (const part of path.split('.')) {
    if (v == null || typeof v !== 'object' || !Object.hasOwn(v, part)) return undefined;
    v = (v as Record<string, unknown>)[part];
  }
  return v;
}

/** a time value in ms (a number, a Date, an ISO string), or NaN */
function timeOf(v: unknown): number {
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'string' && v) return Date.parse(v);
  return Number.NaN;
}

/** the start of a calendar unit, ms (UTC) */
function unitStart(ms: number, unit: AggregateUnit): number {
  const fixed = UNIT_MS[unit];
  // 1970-01-01 was a Thursday: weeks start four days later (Monday 1970-01-05)
  if (unit === 'week') return Math.floor((ms - 4 * 864e5) / fixed!) * fixed! + 4 * 864e5;
  if (fixed) return Math.floor(ms / fixed) * fixed;
  const d = new Date(ms);
  return unit === 'month' ? Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) : Date.UTC(d.getUTCFullYear(), 0, 1);
}

/** the next unit's start after a unit start */
function unitNext(ms: number, unit: AggregateUnit): number {
  const fixed = UNIT_MS[unit];
  if (fixed) return ms + fixed;
  const d = new Date(ms);
  return unit === 'month'
    ? Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)
    : Date.UTC(d.getUTCFullYear() + 1, 0, 1);
}

/** a group key's value for a row */
function keyFn(group: AggregateGroup): (row: DataviewRow) => DataviewJsonValue {
  const { field, bucket } = group;
  if (bucket === undefined) return (row) => (valueAt(row, field) ?? null) as DataviewJsonValue;
  if (typeof bucket === 'number') {
    if (!(bucket > 0)) throw new RangeError('aggregate: a numeric bucket must be a positive width');
    return (row) => {
      const v = valueAt(row, field);
      return typeof v === 'number' && Number.isFinite(v) ? Math.floor(v / bucket) * bucket : null;
    };
  }
  if (!['minute', 'hour', 'day', 'week', 'month', 'year'].includes(bucket))
    throw new RangeError(`aggregate: unknown time bucket "${bucket}"`);
  return (row) => {
    const t = timeOf(valueAt(row, field));
    return Number.isFinite(t) ? unitStart(t, bucket) : null;
  };
}

interface Acc {
  keys: DataviewJsonValue[];
  count: number;
  /** per measure: [sum, numbers seen, min, max] or the distinct values */
  m: Array<[number, number, number, number] | Set<unknown>>;
}

const compare = (a: unknown, b: unknown): number => {
  if (a === b) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
};

/**
 * Rows grouped and measured: by fields, numeric bins or calendar units (UTC), each group counted, summed, averaged,
 * its minimum, maximum or its different values - the plain rows a chart's dataset takes. One pass over the rows; a
 * row whose bucketed value is not a number or a time falls into the null group.
 * @param rows - the rows (a source's matches: source.aggregate(query, spec) filters first)
 * @param spec - the group keys, the measures, the order, a limit and the bins to fill
 * @returns one row per group: its keys (named by `as`, else the field) and its measures (named by `as`, else op or
 *   op_field)
 */
export function aggregate(rows: readonly DataviewRow[], spec: AggregateSpec = {}): AggregateRow[] {
  const groups = (spec.groupBy === undefined ? [] : Array.isArray(spec.groupBy) ? spec.groupBy : [spec.groupBy]).map(
    (g) => (typeof g === 'string' ? { field: g } : g),
  );
  const measures = spec.measures?.length ? spec.measures : [{ op: 'count' as const }];
  for (const m of measures)
    if (m.op !== 'count' && !m.field) throw new TypeError(`aggregate: the measure "${m.op}" needs a field`);
  const keyNames = groups.map((g) => g.as ?? g.field);
  const measureNames = measures.map((m) => m.as ?? (m.op === 'count' ? 'count' : m.op + '_' + m.field));
  const keys = groups.map(keyFn);
  const fresh = (k: DataviewJsonValue[]): Acc => ({
    keys: k,
    count: 0,
    m: measures.map((m) => (m.op === 'distinct' ? new Set() : [0, 0, Infinity, -Infinity])),
  });
  const add = (acc: Acc, row: DataviewRow): void => {
    acc.count++;
    for (let j = 0; j < measures.length; j++) {
      const m = measures[j];
      if (m.op === 'count') continue;
      const v = valueAt(row, m.field!);
      const slot = acc.m[j];
      if (slot instanceof Set) {
        if (v != null) slot.add(v);
        continue;
      }
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      slot[0] += v;
      slot[1]++;
      if (v < slot[2]) slot[2] = v;
      if (v > slot[3]) slot[3] = v;
    }
  };
  const map = new Map<unknown, Acc>();
  const single = keys.length === 1 ? keys[0] : null;
  for (const row of rows) {
    let acc: Acc | undefined;
    if (single) {
      const k = single(row);
      acc = map.get(k);
      if (!acc) map.set(k, (acc = fresh([k])));
    } else {
      const ks = keys.map((f) => f(row));
      const id = keys.length ? JSON.stringify(ks) : '';
      acc = map.get(id);
      if (!acc) map.set(id, (acc = fresh(ks)));
    }
    add(acc, row);
  }
  // the empty bins of one binned key, between the first and the last group
  const g0 = groups[0];
  if (spec.fill && groups.length === 1 && g0.bucket !== undefined && map.size > 1) {
    const present = [...map.keys()].filter((k): k is number => typeof k === 'number');
    if (present.length) {
      const lo = Math.min(...present),
        hi = Math.max(...present);
      const step = (k: number): number =>
        typeof g0.bucket === 'number' ? k + g0.bucket : unitNext(k, g0.bucket as AggregateUnit);
      let n = 0;
      for (let k = lo; k <= hi && n < 10_000; k = step(k), n++) if (!map.has(k)) map.set(k, fresh([k]));
    }
  }
  let list = [...map.values()];
  const value = (acc: Acc, j: number): DataviewJsonValue => {
    const m = measures[j];
    if (m.op === 'count') return acc.count;
    const slot = acc.m[j];
    if (slot instanceof Set) return slot.size;
    if (m.op === 'sum') return slot[0];
    if (!slot[1]) return null;
    return m.op === 'avg' ? slot[0] / slot[1] : m.op === 'min' ? slot[2] : slot[3];
  };
  const sortBy = spec.sort?.by ?? (spec.limit !== undefined ? measureNames[0] : keyNames[0]);
  const dir = spec.sort?.direction ?? (spec.sort || spec.limit === undefined ? 'asc' : 'desc');
  if (sortBy !== undefined) {
    const ki = keyNames.indexOf(sortBy),
      mi = measureNames.indexOf(sortBy);
    if (ki < 0 && mi < 0) throw new RangeError(`aggregate: cannot sort by "${sortBy}" - not a key or a measure`);
    const pick = (a: Acc): unknown => (ki >= 0 ? a.keys[ki] : value(a, mi));
    list.sort((a, b) => (dir === 'desc' ? -1 : 1) * compare(pick(a), pick(b)));
  }
  if (spec.limit !== undefined && list.length > spec.limit) {
    const rest = list.slice(spec.limit);
    list = list.slice(0, Math.max(0, spec.limit));
    if (spec.other !== undefined) {
      const other = fresh(keyNames.map((_, i) => (i === 0 ? spec.other! : null)));
      for (const acc of rest) {
        other.count += acc.count;
        acc.m.forEach((slot, j) => {
          const into = other.m[j];
          if (slot instanceof Set) for (const v of slot) (into as Set<unknown>).add(v);
          else {
            const t = into as [number, number, number, number];
            t[0] += slot[0];
            t[1] += slot[1];
            t[2] = Math.min(t[2], slot[2]);
            t[3] = Math.max(t[3], slot[3]);
          }
        });
      }
      list.push(other);
    }
  }
  return list.map((acc) => {
    const out: AggregateRow = {};
    keyNames.forEach((name, i) => (out[name] = acc.keys[i]));
    measureNames.forEach((name, j) => (out[name] = value(acc, j)));
    return out;
  });
}

/**
 * A column filter typed by a person, as a query filter: numbers take an
 * optional operator (`>10`, `<=3`, `!=0`, `=7`), text matches anywhere
 * (`contains`), a choice matches exactly. Empty text = no filter (null).
 */
export function parseFilter(
  field: string,
  text: string,
  kind: 'text' | 'number' | 'select' = 'text',
): DataviewFilter | null {
  const raw = text.trim();
  if (!raw) return null;
  if (kind === 'select') return { field, op: 'eq', value: raw };
  if (kind === 'number') {
    const m = /^(>=|<=|!=|>|<|=)?\s*(-?\d+(?:\.\d+)?)$/.exec(raw);
    if (!m) return null;
    const ops: Record<string, DataviewFilterOperator> = {
      '>=': 'gte',
      '<=': 'lte',
      '!=': 'neq',
      '>': 'gt',
      '<': 'lt',
      '=': 'eq',
    };
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
