/**
 * The Database Explorer's query language - MongoDB's filter, sort and projection documents over defuss-db - is
 * defuss-db's own `defuss-db/mongo`, re-exported for the explorer's modules. What stays here is the explorer's own:
 * the Fields view of a sampled schema.
 * VERIFIED: tests/db-query.test.ts runs defuss-db 3.1.0's mongo entry through the explorer's operations on a real
 * memory database.
 */
export {
  getPath,
  parseDocument,
  project,
  QueryError,
  revive,
  stringify,
  translateFilter,
  translateSort,
  type Builders,
  type MongoFilter as DbFilter,
  type MongoSorter as DbSorter,
  type Translated,
} from 'defuss-db/mongo';

/** The type a schema view names for a value. */
export function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  if (value instanceof Map) return 'map';
  if (value instanceof Set) return 'set';
  if (ArrayBuffer.isView(value)) return 'binary';
  return typeof value === 'object' ? 'object' : typeof value;
}

/** One field of a sampled schema: its path, how often it appears and with which types. */
export interface SchemaField {
  path: string;
  count: number;
  types: Record<string, number>;
  examples: unknown[];
}

/**
 * The schema of a sample (what Compass's Schema tab shows): every field path down to `depth`, how many documents
 * hold it and the types it holds there. Arrays count as one type; their items are not descended into.
 */
export function schemaOf(docs: Record<string, unknown>[], depth = 3): SchemaField[] {
  const fields = new Map<string, SchemaField>();
  const walk = (value: Record<string, unknown>, prefix: string, level: number) => {
    for (const [key, v] of Object.entries(value)) {
      const path = prefix + key;
      const f = fields.get(path) ?? { path, count: 0, types: {}, examples: [] };
      f.count++;
      const t = typeOf(v);
      f.types[t] = (f.types[t] ?? 0) + 1;
      if (f.examples.length < 3 && t !== 'object' && t !== 'array' && !f.examples.some((e) => Object.is(e, v)))
        f.examples.push(v);
      fields.set(path, f);
      if (t === 'object' && level < depth) walk(v as Record<string, unknown>, path + '.', level + 1);
    }
  };
  for (const d of docs) walk(d, '', 1);
  return [...fields.values()];
}
