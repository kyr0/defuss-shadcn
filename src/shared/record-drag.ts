/**
 * Why: dragging records between the big-data components - a Data Grid (a Tree Grid too) and a Data Tree, between two
 * instances or within one - is ONE concern with one owner, emitted once in core (df$.shadcn.shared): the drag in
 * progress, what it carries, which effect a drop has and where the records land. Each component asks this module for
 * them; neither reaches into the other (AGENTS.md "Compose").
 *
 * The native Drag and Drop API carries the drag (a pointer library would not reach another window or a
 * spreadsheet): the source writes text/plain (tab-separated values), text/html (a table) and RECORDS_MIME (the
 * records as JSON). Inside one document the drag in progress is kept here, so a move takes the records out of their
 * source once the target holds them; a drop from another document can only copy (its source is out of reach).
 * VERIFIED: (data-grid.e2e "drag and drop", data-tree.e2e "drag and drop", tests/record-drag.test.ts) grids and
 * trees move and copy through these functions.
 */
import type { DataviewJsonValue, DataviewRow } from './dataview.js';

/** The data type a record drag carries its records in (JSON: RecordDragPayload). */
export const RECORDS_MIME = 'application/x-defuss-records+json';

/** What a drop does with the records: moves them out of their source, or copies them. */
export type DropEffect = 'move' | 'copy';

/** Where dropped records land: before or after a record, into it (as its children - a tree), or at the end. */
export type DropPlace = 'before' | 'after' | 'into' | 'end';

/** A drop's place: the record it is beside (null at the end) and how. */
export interface DropAt {
  /** the id of the record the drop lands beside or into; null for 'end' */
  id: DataviewJsonValue | null;
  /** before or after it, into it, or at the end */
  place: DropPlace;
}

/** The fields that link records: the id and, in a tree, the parent's id. */
export interface RecordFields {
  /** the id field */
  idField: string;
  /** the parent id field; null in a flat grid */
  parentIdField: string | null;
}

/** A drag of records in progress, as its source describes it. */
export interface RecordDrag extends RecordFields {
  /** the component the records come from */
  source: HTMLElement;
  /** the records dragged: the roots and, from a tree, everything under them, in source order */
  records: DataviewRow[];
  /** the ids of the dragged roots */
  roots: DataviewJsonValue[];
  /** the effects the source allows (data-drag) */
  effects: DropEffect[];
  /** take the dragged records out of the source - a move, once the target holds them */
  remove(): void;
  /** the drag ended in a drop on target with this effect (after remove() on a move) */
  done(effect: DropEffect, target: HTMLElement): void;
}

/** What RECORDS_MIME carries: the records and how they link - all another document learns of a drag. */
export interface RecordDragPayload extends RecordFields {
  version: 1;
  records: DataviewRow[];
  roots: DataviewJsonValue[];
}

let current: RecordDrag | null = null;

/** The effects an attribute allows: "move", "copy", both, or both when empty ("" or missing on a present attribute). */
export function dropEffects(value: string | null | undefined): DropEffect[] {
  const words = (value ?? '').split(/\s+/).filter((w): w is DropEffect => w === 'move' || w === 'copy');
  return words.length ? [...new Set(words)] : ['move', 'copy'];
}

/** The roots and everything under them (a flat source: the roots), in source order; a root under another root counts once. */
export function subtreeOf(
  rows: readonly DataviewRow[],
  roots: readonly DataviewJsonValue[],
  fields: RecordFields,
): DataviewRow[] {
  const take = new Set<unknown>(roots);
  if (fields.parentIdField) {
    const children = new Map<unknown, DataviewRow[]>();
    for (const r of rows) {
      const p = r[fields.parentIdField] ?? null;
      if (!children.has(p)) children.set(p, []);
      children.get(p)!.push(r);
    }
    const queue = [...roots];
    while (queue.length) {
      const id = queue.shift();
      for (const child of children.get(id) ?? []) {
        const cid = child[fields.idField];
        if (take.has(cid)) continue;
        take.add(cid);
        queue.push(cid as DataviewJsonValue);
      }
    }
  }
  return rows.filter((r) => take.has(r[fields.idField]));
}

/** The roots that are not under another root (a parent and its child dragged together: the parent carries it). */
export function topRoots(records: readonly DataviewRow[], roots: readonly DataviewJsonValue[], fields: RecordFields) {
  if (!fields.parentIdField) return [...roots];
  const byId = new Map(records.map((r) => [r[fields.idField], r]));
  const set = new Set<unknown>(roots);
  return roots.filter((id) => {
    let parent = byId.get(id)?.[fields.parentIdField!];
    const seen = new Set<unknown>();
    while (parent != null && !seen.has(parent)) {
      if (set.has(parent)) return false;
      seen.add(parent);
      parent = byId.get(parent)?.[fields.parentIdField!];
    }
    return true;
  });
}

/** Begin a drag: the data for other documents and applications, the drag image, and the drag kept for this document. */
export function startRecordDrag(e: DragEvent, drag: RecordDrag, text: { plain: string; html: string }, label: string) {
  current = drag;
  const dt = e.dataTransfer;
  if (!dt) return;
  const payload: RecordDragPayload = {
    version: 1,
    records: drag.records,
    roots: drag.roots,
    idField: drag.idField,
    parentIdField: drag.parentIdField,
  };
  try {
    dt.setData(RECORDS_MIME, JSON.stringify(payload));
  } catch {
    // a record that is no JSON (a cycle, a BigInt): this document still has the drag
  }
  dt.setData('text/plain', text.plain);
  dt.setData('text/html', text.html);
  dt.effectAllowed = drag.effects.length === 2 ? 'copyMove' : drag.effects[0];
  // one line of text instead of a picture of the pressed row: what is dragged, and how many
  const image = document.createElement('div');
  image.className = 'record-drag-image';
  image.textContent = label;
  // styled here: the grid and the tree share it, and the browser takes its picture before any sheet could differ
  image.style.cssText =
    'position:absolute;top:-1000px;left:0;padding:0.25rem 0.625rem;border:1px solid var(--border);' +
    'border-radius:var(--radius-md);background:var(--popover);color:var(--popover-foreground);' +
    'font:500 0.8125rem/1.4 var(--font-sans);white-space:nowrap;box-shadow:var(--shadow-md)';
  document.body.append(image);
  dt.setDragImage(image, -12, -12);
  setTimeout(() => image.remove());
}

/** The drag in progress in this document, null when none (or its source is gone). */
export const recordDrag = (): RecordDrag | null => (current?.source.isConnected ? current : null);

/** Whether a drag event carries records: one of this document's, or another's (RECORDS_MIME). */
export const carriesRecords = (e: DragEvent): boolean =>
  !!recordDrag() || !!e.dataTransfer?.types.includes(RECORDS_MIME);

/** End the drag kept for this document (its source's dragend, or a drop that finished it). */
export function endRecordDrag(drag?: RecordDrag | null) {
  if (!drag || drag === current) current = null;
}

/**
 * The effect a drop has: what the source allows and the target takes (data-drag, data-drop); with both, Alt / Option
 * or Ctrl copies and anything else moves. A drag from another document only copies. Null: no drop here.
 */
export function dropEffectFor(e: DragEvent, target: DropEffect[], drag: RecordDrag | null): DropEffect | null {
  const allowed = (drag ? drag.effects : ['copy']).filter((x) => target.includes(x as DropEffect)) as DropEffect[];
  if (!allowed.length) return null;
  if (allowed.length === 1) return allowed[0];
  return e.altKey || e.ctrlKey ? 'copy' : 'move';
}

/** The records a drop brings: this document's drag, else the JSON another document wrote. */
export function droppedRecords(e: DragEvent): RecordDragPayload | null {
  const drag = recordDrag();
  if (drag)
    return {
      version: 1,
      records: drag.records,
      roots: drag.roots,
      idField: drag.idField,
      parentIdField: drag.parentIdField,
    };
  try {
    const data = JSON.parse(e.dataTransfer?.getData(RECORDS_MIME) || 'null');
    if (data?.version === 1 && Array.isArray(data.records) && Array.isArray(data.roots) && data.idField) return data;
  } catch {
    // not ours
  }
  return null;
}

/** Everything placeRecords needs: the target's records, the dropped ones, where and how they land. */
export interface PlaceSpec extends RecordFields {
  /** the target's records */
  rows: readonly DataviewRow[];
  /** the dropped records and how they link (the source's fields) */
  from: RecordDragPayload;
  /** where they land */
  at: DropAt;
  /** a copy: every record gets an id of its own */
  copy: boolean;
  /** the target is the source and this is a move: the records leave their place first */
  within: boolean;
}

/** What a drop placed: the target's new records, the records as they were inserted, and the ids of their roots. */
export interface Placed {
  rows: DataviewRow[];
  inserted: DataviewRow[];
  roots: DataviewJsonValue[];
}

/**
 * Where the dropped records land, as the target's new records. A copy - or a record whose id the target already
 * holds - gets a new id (numbers: after the largest; text: "id-2", "id-3" ...) and its children follow it. In a tree
 * the roots take the place's parent (before / after: the record's parent, into: the record, end: none); the records
 * keep their order and land beside the record in the target's own order (a sort places them again). Null when the
 * drop is refused: a move onto one of the moved records, or into what lies under them.
 */
export function placeRecords(spec: PlaceSpec): Placed | null {
  const { idField, parentIdField, from, at } = spec;
  const fromParent = from.parentIdField;
  const roots = topRoots(from.records, from.roots, from);
  const moving = new Set(from.records.map((r) => r[from.idField]));
  if (spec.within && at.id !== null && moving.has(at.id)) return null;
  const base = spec.within ? spec.rows.filter((r) => !moving.has(r[idField])) : spec.rows.slice();
  const target = at.id === null ? null : base.find((r) => r[idField] === at.id);
  if (at.id !== null && !target) return null;
  // the new ids: free in the target
  const taken = new Set<unknown>(base.map((r) => r[idField]));
  let next = Math.max(0, ...[...taken].filter((x): x is number => typeof x === 'number' && Number.isFinite(x))) + 1;
  const ids = new Map<unknown, DataviewJsonValue>();
  for (const r of from.records) {
    const old = r[from.idField] as DataviewJsonValue;
    let id = old;
    if (spec.copy || taken.has(id)) {
      if (typeof old === 'number') id = next++;
      else for (let n = 2; taken.has((id = `${old}-${n}`)); n++);
    }
    taken.add(id);
    ids.set(old, id);
  }
  const parent = !parentIdField
    ? null
    : at.place === 'into'
      ? at.id
      : at.place === 'end'
        ? null
        : ((target?.[parentIdField] ?? null) as DataviewJsonValue | null);
  const rootSet = new Set<unknown>(roots);
  const inserted = from.records.map((r) => {
    const old = r[from.idField];
    const record: DataviewRow = { ...r };
    delete record[from.idField];
    record[idField] = ids.get(old);
    if (parentIdField) {
      const was = fromParent ? r[fromParent] : null;
      if (fromParent && fromParent !== parentIdField) delete record[fromParent];
      record[parentIdField] = rootSet.has(old) || !ids.has(was) ? parent : ids.get(was);
    }
    return record;
  });
  const index =
    at.place === 'end' || at.place === 'into' || !target
      ? base.length
      : base.indexOf(target) + (at.place === 'after' ? 1 : 0);
  return {
    rows: [...base.slice(0, index), ...inserted, ...base.slice(index)],
    inserted,
    roots: roots.map((id) => ids.get(id)!),
  };
}

/** The records without the ones given (their ids). */
export function withoutRecords(rows: readonly DataviewRow[], records: readonly DataviewRow[], idField: string) {
  const gone = new Set(records.map((r) => r[idField]));
  return rows.filter((r) => !gone.has(r[idField]));
}
