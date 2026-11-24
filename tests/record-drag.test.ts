import { describe, expect, it } from 'vitest';
import { dropEffects, placeRecords, subtreeOf, topRoots, withoutRecords } from '../src/shared/record-drag.ts';
import type { RecordFields } from '../src/shared/record-drag.ts';
import type { DataviewJsonValue, DataviewRow } from '../src/shared/dataview.ts';

/**
 * Why: every drop between Data Grids and Data Trees places its records through placeRecords - a wrong parent, a
 * duplicated id or a record lost on a move would corrupt the target's data silently (the view only shows what the
 * records say). These pin the documented rules: subtrees travel whole, taken ids are renamed and the children follow,
 * roots take the place's parent, a move within never lands on itself.
 */

const tree: RecordFields = { idField: 'id', parentIdField: 'parentId' };
const flat: RecordFields = { idField: 'id', parentIdField: null };
const files = [
  { id: 1, parentId: null, name: 'Docs' },
  { id: 2, parentId: 1, name: 'a.txt' },
  { id: 3, parentId: 1, name: 'Old' },
  { id: 4, parentId: 3, name: 'b.txt' },
  { id: 5, parentId: null, name: 'Music' },
];
const payload = (records: DataviewRow[], roots: DataviewJsonValue[], fields: RecordFields = tree) => ({
  version: 1 as const,
  records,
  roots,
  ...fields,
});

describe('dropEffects()', () => {
  it('reads move, copy or both; empty means both', () => {
    expect(dropEffects('move')).toEqual(['move']);
    expect(dropEffects('copy move')).toEqual(['copy', 'move']);
    expect(dropEffects('')).toEqual(['move', 'copy']);
    expect(dropEffects(undefined)).toEqual(['move', 'copy']);
    expect(dropEffects('fly')).toEqual(['move', 'copy']);
  });
});

describe('subtreeOf() / topRoots()', () => {
  it('takes a root with everything under it, in source order', () => {
    expect(subtreeOf(files, [1], tree).map((r) => r.id)).toEqual([1, 2, 3, 4]);
    expect(subtreeOf(files, [3, 5], tree).map((r) => r.id)).toEqual([3, 4, 5]);
  });
  it('takes only the roots in a flat grid', () => {
    expect(subtreeOf(files, [1], flat).map((r) => r.id)).toEqual([1]);
  });
  it('drops a root that lies under another root', () => {
    expect(topRoots(files, [4, 1], tree)).toEqual([1]);
    expect(topRoots(files, [2, 5], tree)).toEqual([2, 5]);
  });
});

describe('placeRecords()', () => {
  it('moves a subtree into another record within one tree: the root takes it as parent, the children follow', () => {
    const records = subtreeOf(files, [3], tree);
    const placed = placeRecords({ rows: files, ...tree, from: payload(records, [3]), at: { id: 5, place: 'into' }, copy: false, within: true })!;
    expect(placed.roots).toEqual([3]);
    expect(placed.rows.map((r) => [r.id, r.parentId])).toEqual([[1, null], [2, 1], [5, null], [3, 5], [4, 3]]);
  });

  it('refuses a move onto a moved record or into what lies under it', () => {
    const records = subtreeOf(files, [1], tree);
    for (const id of [1, 3, 4])
      expect(placeRecords({ rows: files, ...tree, from: payload(records, [1]), at: { id, place: 'into' }, copy: false, within: true })).toBeNull();
  });

  it('copies with new ids after the largest; the copies link to each other, not to the originals', () => {
    const records = subtreeOf(files, [3], tree);
    const placed = placeRecords({ rows: files, ...tree, from: payload(records, [3]), at: { id: 1, place: 'before' }, copy: true, within: false })!;
    expect(placed.inserted.map((r) => [r.id, r.parentId, r.name])).toEqual([[6, null, 'Old'], [7, 6, 'b.txt']]);
    expect(placed.rows.map((r) => r.id)).toEqual([6, 7, 1, 2, 3, 4, 5]);
  });

  it('renames a taken text id ("id-2", "id-3" ...) and keeps a free one', () => {
    const rows = [{ id: 'a' }, { id: 'a-2' }];
    const placed = placeRecords({ rows, ...flat, from: payload([{ id: 'a', x: 1 }, { id: 'b' }], ['a', 'b'], flat), at: { id: null, place: 'end' }, copy: false, within: false })!;
    expect(placed.inserted.map((r) => r.id)).toEqual(['a-3', 'b']);
    expect(placed.rows.map((r) => r.id)).toEqual(['a', 'a-2', 'a-3', 'b']);
  });

  it('lands after a record in a flat grid, and maps a tree into another parent field', () => {
    const grid = [{ id: 10 }, { id: 11 }];
    const after = placeRecords({ rows: grid, ...flat, from: payload([{ id: 1, name: 'x' }], [1], flat), at: { id: 10, place: 'after' }, copy: false, within: false })!;
    expect(after.rows.map((r) => r.id)).toEqual([10, 1, 11]);
    const other: RecordFields = { idField: 'key', parentIdField: 'parent' };
    const placed = placeRecords({ rows: [{ key: 'root', parent: null }], ...other, from: payload(subtreeOf(files, [3], tree), [3]), at: { id: 'root', place: 'into' }, copy: false, within: false })!;
    expect(placed.inserted).toEqual([
      { key: 3, parent: 'root', name: 'Old' },
      { key: 4, parent: 3, name: 'b.txt' },
    ]);
  });

  it('refuses a place that is no record of the target', () => {
    expect(placeRecords({ rows: files, ...tree, from: payload([{ id: 9 }], [9]), at: { id: 99, place: 'before' }, copy: false, within: false })).toBeNull();
  });
});

describe('withoutRecords()', () => {
  it('takes the given records out by id', () => {
    expect(withoutRecords(files, subtreeOf(files, [3], tree), 'id').map((r) => r.id)).toEqual([1, 2, 5]);
  });
});
