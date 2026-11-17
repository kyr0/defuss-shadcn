import { describe, expect, it } from 'vitest';
import { aggregate, dataSource } from '../src/shared/dataview.ts';

/**
 * Why: aggregation is what lets a chart show a million rows as a handful of groups (df$.shadcn.chart.bind, the Graph
 * Explorer's shares, the Knowledge Graph's dataset pages) - a wrong group, a lost row in "other" or a stale cache
 * would put wrong numbers on every chart built on it. These pin the spec's documented semantics.
 */

const DAY = 864e5;
const rows = [
  { id: 1, region: 'EU', channel: 'web', amount: 10, at: Date.UTC(2026, 0, 5, 10) },
  { id: 2, region: 'EU', channel: 'app', amount: 30, at: Date.UTC(2026, 0, 5, 23) },
  { id: 3, region: 'US', channel: 'web', amount: 5, at: Date.UTC(2026, 0, 7) },
  { id: 4, region: 'US', channel: 'web', amount: null, at: Date.UTC(2026, 1, 1) },
  { id: 5, region: 'AP', channel: 'app', amount: 20, at: '2026-01-12T08:00:00Z' },
  { id: 6, region: null, channel: 'web', amount: 7, at: 'not a date' },
];

describe('aggregate()', () => {
  it('counts every row without a group key', () => {
    expect(aggregate(rows)).toEqual([{ count: 6 }]);
  });

  it('groups by a field and measures: count, sum, avg, min, max, distinct (numbers only; null values skipped)', () => {
    const out = aggregate(rows, {
      groupBy: 'region',
      measures: [
        { op: 'count' },
        { op: 'sum', field: 'amount' },
        { op: 'avg', field: 'amount', as: 'mean' },
        { op: 'min', field: 'amount' },
        { op: 'max', field: 'amount' },
        { op: 'distinct', field: 'channel', as: 'channels' },
      ],
    });
    // default order: the first key ascending, null last
    expect(out.map((r) => r.region)).toEqual(['AP', 'EU', 'US', null]);
    expect(out[1]).toEqual({ region: 'EU', count: 2, sum_amount: 40, mean: 20, min_amount: 10, max_amount: 30, channels: 2 });
    // US: one amount is null - counted as a row, not as a number
    expect(out[2]).toMatchObject({ count: 2, sum_amount: 5, mean: 5, min_amount: 5 });
  });

  it('groups by several keys', () => {
    const out = aggregate(rows, { groupBy: ['region', 'channel'], sort: { by: 'count', direction: 'desc' } });
    expect(out[0]).toEqual({ region: 'US', channel: 'web', count: 2 });
    expect(out).toHaveLength(5);
  });

  it('bins numbers by a width and time by a calendar unit (UTC; a week starts on Monday; ISO strings read)', () => {
    expect(aggregate(rows, { groupBy: { field: 'amount', bucket: 10, as: 'bin' } }).map((r) => [r.bin, r.count])).toEqual([
      [0, 2],
      [10, 1],
      [20, 1],
      [30, 1],
      [null, 1],
    ]);
    const days = aggregate(rows, { groupBy: { field: 'at', bucket: 'day', as: 'day' } });
    expect(days[0]).toEqual({ day: Date.UTC(2026, 0, 5), count: 2 });
    expect(days.at(-1)).toEqual({ day: null, count: 1 });
    const weeks = aggregate(rows, { groupBy: { field: 'at', bucket: 'week', as: 'week' } });
    // 2026-01-05 is a Monday: the 5th and the 7th share its week, the 12th starts the next
    expect(weeks.slice(0, 2)).toEqual([
      { week: Date.UTC(2026, 0, 5), count: 3 },
      { week: Date.UTC(2026, 0, 12), count: 1 },
    ]);
    const months = aggregate(rows, { groupBy: { field: 'at', bucket: 'month', as: 'month' } });
    expect(months.slice(0, 2)).toEqual([
      { month: Date.UTC(2026, 0, 1), count: 4 },
      { month: Date.UTC(2026, 1, 1), count: 1 },
    ]);
  });

  it('fills the empty bins of one binned key, with zero measures', () => {
    const out = aggregate(
      rows.filter((r) => typeof r.at === 'number'),
      { groupBy: { field: 'at', bucket: 'day', as: 'day' }, measures: [{ op: 'count' }, { op: 'sum', field: 'amount' }], fill: true },
    );
    // the 5th to the 1st of February: 28 days
    expect(out).toHaveLength(28);
    expect(out[1]).toEqual({ day: Date.UTC(2026, 0, 6), count: 0, sum_amount: 0 });
    expect(out.reduce((n, r) => n + Number(r.count), 0)).toBe(4);
    expect(out.every((r, k) => k === 0 || Number(r.day) - Number(out[k - 1].day) === DAY)).toBe(true);
  });

  it('keeps the largest groups and merges the rest into `other`, so the totals still add up', () => {
    const many = Array.from({ length: 100 }, (_, i) => ({ id: i, key: 'k' + (i % 7), v: i }));
    const out = aggregate(many, { groupBy: 'key', measures: [{ op: 'count' }, { op: 'sum', field: 'v' }], limit: 3, other: 'rest' });
    expect(out).toHaveLength(4);
    expect(out.at(-1)!.key).toBe('rest');
    expect(out.reduce((n, r) => n + Number(r.count), 0)).toBe(100);
    expect(out.reduce((n, r) => n + Number(r.sum_v), 0)).toBe(4950);
    // a limit sorts by the first measure, largest first
    expect(Number(out[0].count)).toBeGreaterThanOrEqual(Number(out[1].count));
    // without `other` the rest is dropped
    expect(aggregate(many, { groupBy: 'key', limit: 2 })).toHaveLength(2);
  });

  it('rejects a spec it cannot run, naming the problem', () => {
    expect(() => aggregate(rows, { measures: [{ op: 'sum' }] })).toThrow(/needs a field/);
    expect(() => aggregate(rows, { groupBy: { field: 'amount', bucket: 0 } })).toThrow(/positive width/);
    expect(() => aggregate(rows, { groupBy: { field: 'at', bucket: 'fortnight' as never } })).toThrow(/unknown time bucket/);
    expect(() => aggregate(rows, { groupBy: 'region', sort: { by: 'nope' } })).toThrow(/not a key or a measure/);
  });
});

describe('source.aggregate()', () => {
  it('aggregates the rows the filters match (case-insensitive like the grids), reports the counts and caches', () => {
    const source = dataSource(rows);
    const spec = { groupBy: 'channel' };
    const eu = source.aggregate({ filters: [{ field: 'region', op: 'eq', value: 'eu' }] }, spec);
    expect(eu).toEqual({
      rows: [
        { channel: 'app', count: 1 },
        { channel: 'web', count: 1 },
      ],
      matchedRows: 2,
      totalRows: 6,
    });
    // the same filters and spec: the same answer object
    expect(source.aggregate({ filters: [{ field: 'region', op: 'eq', value: 'eu' }] }, spec)).toBe(eu);
    // an empty filter value is no filter
    expect(source.aggregate({ filters: [{ field: 'region', op: 'eq', value: '' }] }, spec).matchedRows).toBe(6);
    // new rows: a new answer
    source.setRows(rows.slice(0, 2));
    expect(source.aggregate({}, spec).totalRows).toBe(2);
  });

  it('shares the filter scan with the grid query', () => {
    const source = dataSource(rows);
    const filters = [{ field: 'channel', op: 'eq' as const, value: 'web' }];
    expect(source.query({ filters }).matchedRows).toBe(4);
    expect(source.aggregate({ filters }, {}).rows).toEqual([{ count: 4 }]);
  });
});

describe('source.query()', () => {
  it('sorts strings in the reader\'s order, as 0.4 did: case and accents beside their letter (defuss-dataview 0.5 sorts by code units unless asked)', () => {
    const source = dataSource([
      { id: 1, name: 'b' },
      { id: 2, name: 'B' },
      { id: 3, name: 'ä' },
      { id: 4, name: 'a' },
      { id: 5, name: 'c' },
    ]);
    const names = source.query({ sorters: [{ field: 'name', direction: 'asc' }] }).entries.map((e) => e.row.name);
    expect(names).toEqual([...names].sort((x, y) => x.localeCompare(y)));
    expect(names.indexOf('ä')).toBeLessThan(names.indexOf('b'));
    expect(names.at(-1)).toBe('c');
  });

  it('a tree filter keeps the ancestors of its matches, case-insensitively; branchIds lists the parents; setRows drops the cache', () => {
    const tree = [
      { id: 'eu', parentId: null, name: 'Europe' },
      { id: 'de', parentId: 'eu', name: 'Germany' },
      { id: 'ber', parentId: 'de', name: 'Berlin' },
      { id: 'us', parentId: null, name: 'United States' },
    ];
    const source = dataSource(tree, { tree: { idField: 'id', parentIdField: 'parentId' } });
    const hit = source.query({ filters: [{ field: 'name', op: 'contains', value: 'BERL' }] });
    expect(hit.matchedRows).toBe(1);
    expect(hit.entries.map((e) => e.row.id)).toEqual(['eu', 'de', 'ber']);
    expect(source.branchIds().sort()).toEqual(['de', 'eu']);
    expect(source.query({ expanded: [] }).entries.map((e) => e.row.id)).toEqual(['eu', 'us']);
    source.setRows([...tree, { id: 'fr', parentId: 'eu', name: 'France' }]);
    expect(source.query({ expanded: ['eu'] }).entries.map((e) => e.row.id)).toEqual(['eu', 'de', 'fr', 'us']);
  });
});
