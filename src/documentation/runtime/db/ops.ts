/**
 * Every operation the Database Explorer asks of defuss-db - one dispatcher, run in the OPFS worker (db-worker.ts) and
 * on the page in memory mode (db.ts). The caller names an operation and its arguments; values cross the worker
 * boundary by structured clone, so a document keeps its Dates, Maps, Sets, BigInts and typed arrays.
 *
 * defuss-db has no drop for a collection or a database: a drop empties it, removes its indexes and records it in the
 * `admin` database (`dropped`), which also lists the databases (`databases`) - MongoDB's own place for them.
 */
import { analyzeSchema, type Collection, type Database } from 'defuss-db';
import { mongoRequest, scalarOptions } from 'defuss-db/mongo';
import { getPath, parseDocument, project, schemaOf, type Builders } from './query.ts';
import { compress, decode, decompress, encode, type Compression, type TransferFormat } from './transfer.ts';

/** A query bar: filter, sort and projection as typed, the page and its size. */
export interface FindSpec {
  filter?: string;
  sort?: string;
  project?: string;
  skip?: number;
  limit?: number;
  /** false: no exact total (a later page of a query whose total is known - the count scans every match) */
  count?: boolean;
}
/**
 * One measure of an aggregation: count (documents, or with a field the documents that have it), the distinct values
 * of a field (their number or the values), or a sum, average, minimum or maximum - min / max of text and dates too.
 */
export interface MeasureSpec {
  /** median, p90 / p95 / p99 (exact percentiles) and the standard deviations read numbers, as sum and avg do. */
  op: MeasureOp;
  field?: string;
}
export type MeasureOp = (typeof MEASURE_OPS)[number];
export const MEASURE_OPS = [
  'count',
  'countDistinct',
  'distinct',
  'sum',
  'avg',
  'min',
  'max',
  'median',
  'p90',
  'p95',
  'p99',
  'stdDevPop',
  'stdDevSamp',
] as const;
/** The measures that read numbers only. */
export const NUMERIC_OPS: readonly MeasureOp[] = ['sum', 'avg', 'median', 'p90', 'p95', 'p99', 'stdDevPop', 'stdDevSamp'];
/** A date's calendar units (a key groups by the start of its unit) and its parts (a key groups by the number). */
export const DATE_UNITS = ['year', 'quarter', 'month', 'week', 'day', 'hour', 'minute'] as const;
export const DATE_PARTS = {
  monthOfYear: 'month',
  dayOfMonth: 'day',
  dayOfYear: 'dayOfYear',
  isoWeek: 'isoWeek',
  weekday: 'weekday',
  hourOfDay: 'hour',
} as const;
/**
 * How a group key is read: the value, in lower / upper case, one group per array element, the start of a date's
 * unit or a part of the date (hour of day 0-23, weekday 1 = Monday ... 7, month 1-12 ...).
 */
export type GroupBy = 'value' | 'lower' | 'upper' | 'each' | (typeof DATE_UNITS)[number] | keyof typeof DATE_PARTS;
export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
/** A key of an aggregation: a field (dot paths too), how it groups, and for a unit its bin and first weekday. */
export interface KeySpec {
  field: string;
  by?: GroupBy;
  /** Units per group of a calendar unit (15 minutes, 2 weeks), counted from 2000-01-01 as MongoDB counts them. */
  bin?: number;
  /** The first day of a week key; Monday (the ISO week) when absent. */
  weekStart?: Weekday;
}
/** What a collection keeps besides its documents: their versions and their _createdAt / _updatedAt stamps. */
export interface CollectionOptions {
  /** defuss-db's $trackHistory: every version is kept - As of, a document's history, restore after a delete. */
  history: boolean;
  /** defuss-db's $timestamps: every write sets _createdAt and _updatedAt; once on, it stays on. */
  timestamps: boolean;
}
/** One version of a document in a collection that tracks history, newest first. */
export interface DocumentVersion {
  /** seed: the document when history was turned on; put: a write; delete: the delete. */
  kind: 'seed' | 'put' | 'delete';
  from: Date;
  until: Date | null;
  revision: number;
  /** The document as this version holds it; none for a delete. */
  document: Record<string, unknown> | null;
}
/** An aggregation: the filter, the keys to group by, the measures, the order of the groups and how many. */
export interface AggregateSpec {
  filter?: string;
  groupBy: (string | KeySpec)[];
  measures: MeasureSpec[];
  /** The IANA time zone dates are grouped in (calendar units and parts); UTC when absent. */
  timeZone?: string;
  /** 'measure' (default): the first measure, largest first; 'key': the first key ascending. */
  order?: 'measure' | 'key';
  limit?: number;
}
/** An export of a collection's documents (Export > Collection). */
export interface ExportSpec {
  filter?: string;
  sort?: string;
  format: TransferFormat;
  compression: Compression;
}
/** An import of documents: the file's format (null: by its content) and compression, and what a known id does. */
export interface ImportSpec {
  format: TransferFormat | null;
  compression: Compression | null;
  /** insert: a document whose id exists fails the import; upsert: it replaces that document. */
  mode: 'insert' | 'upsert';
}
/** An index as the app creates it. */
export interface IndexSpec {
  name: string;
  fields: string[];
  order?: ('asc' | 'desc')[];
  unique?: boolean;
}

/**
 * The transaction budget every database opens with. defuss-db's default (10,000 operations, 64 MiB) is one index
 * build over 10,000 documents - VERIFIED: an index on the 30,000 sample events failed with "Transaction capacity
 * exceeded". An explorer creates indexes on whole collections, so it opens with room for them (defuss-db's
 * OPERATIONS: raise maxTransactionOperations / maxTransactionBytes for large builds).
 */
export const OPEN_LIMITS = { maxTransactionOperations: 500_000, maxTransactionBytes: 512 * 1024 * 1024 };
/** The most documents findAll hands a windowed view (the sample collections hold 30,000 at most). */
export const FIND_ALL_CAP = 100_000;

const NAME = /^[a-z][a-z0-9_-]{0,63}$/;
const COLLECTION = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
export const SYSTEM_DB = 'admin';

export function createOps(open: (name: string) => Promise<Database>) {
  const dbs = new Map<string, Promise<Database>>();
  const db = (name: string): Promise<Database> => {
    if (!NAME.test(name))
      throw new Error(`"${name}": a database name is 1-64 lowercase letters, digits, _ or -, starting with a letter`);
    let d = dbs.get(name);
    if (!d) dbs.set(name, (d = open(name)));
    return d;
  };
  const coll = async (dbName: string, name: string) => {
    if (!COLLECTION.test(name))
      throw new Error(`"${name}": a collection name is 1-64 letters, digits, _ or -, starting with a letter`);
    return (await db(dbName)).collection(name);
  };
  const admin = async () => (await db(SYSTEM_DB)).collection('databases');
  const dropped = async () => (await db(SYSTEM_DB)).collection('dropped');
  const droppedKey = (d: string, c: string) => `${d}.${c}`;
  const timed = async <T>(fn: () => Promise<T>) => {
    const t0 = performance.now();
    const value = await fn();
    return { value, ms: Math.round((performance.now() - t0) * 10) / 10 };
  };
  /**
   * Whether a collection tracks history and stamps its documents. defuss-db reports neither, so the explorer asks
   * the way the answer shows: audit() raises HISTORY_NOT_ENABLED without history, and opening with `$timestamps:
   * false` raises SCHEMA_MISMATCH once timestamps are on (they are persistent).
   * VERIFIED: tmp/probe-db31-track.ts against defuss-db 3.1.0; tests/db-query.test.ts "collection options".
   */
  const optionsOf = async (dbName: string, name: string): Promise<CollectionOptions> => {
    const d = await db(dbName);
    const c = d.collection(name);
    const code = (err: unknown) => (err as { code?: string } | null)?.code;
    let history = true;
    try {
      await c.audit('' as never, { limit: 1 });
    } catch (err) {
      if (code(err) !== 'HISTORY_NOT_ENABLED') throw err;
      history = false;
    }
    let timestamps = false;
    try {
      await d.ensureCollection(name, { $timestamps: false } as never);
    } catch (err) {
      if (code(err) !== 'SCHEMA_MISMATCH') throw err;
      timestamps = true;
    }
    return { history, timestamps };
  };
  /**
   * The request a query bar asks for (filters, where, sorters) on a collection.
   * VERIFIED: (tests/db-query.test.ts "an index answers an equality filter") defuss-db 3.1.0 matches a field path
   * through arrays, as MongoDB does, so a top-level condition stays an index filter only for the fields its indexes
   * cover (indexes reject arrays) - scalarOptions names them; without it every query explains as a scan.
   */
  const request = async (c: Collection, spec: FindSpec) =>
    mongoRequest(c.q, spec.filter ?? '', spec.sort ?? '', await scalarOptions(c as never));

  return {
    /** The databases: the admin registry, each with its collections and documents counted. */
    async databases() {
      const reg = (await (await admin()).find()) as { id: string; created?: Date }[];
      return Promise.all(
        reg.map(async (r) => {
          const names = await this.collections(r.id);
          return {
            name: r.id,
            created: r.created ?? null,
            collections: names.length,
            documents: names.reduce((n, c) => n + c.count, 0),
          };
        }),
      );
    },
    /** Creates (or keeps) a database and lists it. */
    async createDatabase(name: string) {
      await db(name);
      const reg = await admin();
      if (!(await reg.has(name))) await reg.put({ id: name, created: new Date() } as never);
      return name;
    },
    /** Empties a database's collections, removes their indexes and its registry entry. */
    async dropDatabase(name: string) {
      if (name === SYSTEM_DB) throw new Error('the admin database keeps the registry - it cannot be dropped');
      for (const c of await this.collections(name)) await this.dropCollection(name, c.name);
      await (await admin()).delete(name);
      const d = await dbs.get(name);
      dbs.delete(name);
      await d?.close();
      return true;
    },
    /** A database's collections (dropped ones left out), each with its document count and indexes. */
    async collections(dbName: string) {
      const d = await db(dbName);
      const gone = new Set(((await (await dropped()).find()) as { id: string }[]).map((r) => r.id));
      const names = (await d.collections()).filter((n) => !gone.has(droppedKey(dbName, n))).sort();
      return Promise.all(
        names.map(async (name) => {
          const c = d.collection(name);
          return {
            name,
            count: await c.count(),
            indexes: (await c.indexes()).length,
            ...(await optionsOf(dbName, name)),
          };
        }),
      );
    },
    /** Creates a collection (or opens an existing one), with history and timestamps when asked for. */
    async createCollection(dbName: string, name: string, options: Partial<CollectionOptions> = {}) {
      await this.createDatabase(dbName);
      if (!COLLECTION.test(name))
        throw new Error(`"${name}": a collection name is 1-64 letters, digits, _ or -, starting with a letter`);
      await (
        await db(dbName)
      ).ensureCollection(name, {
        ...(options.history ? { $trackHistory: true } : {}),
        ...(options.timestamps ? { $timestamps: true } : {}),
      } as never);
      await (await dropped()).delete(droppedKey(dbName, name));
      return name;
    },
    /** Whether a collection tracks history and stamps its documents. */
    async collectionOptions(dbName: string, name: string) {
      await coll(dbName, name);
      return optionsOf(dbName, name);
    },
    /**
     * Turns history or timestamps on for an existing collection - one way: history starts with a seed version of
     * every document, existing documents are stamped now, and neither can be turned off again.
     */
    async enableOption(dbName: string, name: string, option: keyof CollectionOptions) {
      await coll(dbName, name);
      await (
        await db(dbName)
      ).ensureCollection(name, (option === 'history' ? { $trackHistory: true } : { $timestamps: true }) as never);
      return optionsOf(dbName, name);
    },
    /** A document's versions, newest first (a collection that tracks history). */
    async history(dbName: string, name: string, id: string | number, limit = 100): Promise<DocumentVersion[]> {
      const c = await coll(dbName, name);
      const versions = await c.audit(id as never, { limit });
      return versions.map((v) => ({
        kind: v.kind,
        from: v.from,
        until: v.until,
        revision: v.revision,
        document: (v.document as Record<string, unknown> | undefined) ?? null,
      }));
    },
    /** Writes back the version a delete removed, as a new version; false when the document is live or never was. */
    async restore(dbName: string, name: string, id: string | number) {
      return (await coll(dbName, name)).restore(id as never);
    },
    async dropCollection(dbName: string, name: string) {
      const c = await coll(dbName, name);
      await c.deleteMany({});
      for (const i of await c.indexes()) await c.dropIndex(i.name);
      await (await dropped()).put({ id: droppedKey(dbName, name), at: new Date() } as never);
      return true;
    },
    /** A page of a query: the documents (projected), the total that matched, the time and the access path. */
    async find(dbName: string, name: string, spec: FindSpec = {}) {
      const c = await coll(dbName, name);
      const req = await request(c, spec);
      const projection = parseDocument(spec.project ?? '', 'projection');
      const limit = Math.max(1, Math.min(spec.limit ?? 20, 1000));
      const { value: result, ms } = await timed(() =>
        c.query({ ...req, offset: spec.skip ?? 0, limit } as never, spec.count === false ? {} : { count: 'exact' }),
      );
      const plan = await c.explain(req as never);
      return {
        rows: (result.rows as unknown as Record<string, unknown>[]).map((r) => project(r, projection)),
        total: result.summary.totalResultRows ?? null,
        scanned: result.summary.scannedRows ?? null,
        ms,
        revision: String(result.summary.revision ?? ''),
        access: plan.access.kind as string,
        index: (plan.access as { index?: string }).index ?? null,
      };
    },
    /**
     * Every document a query matches, in its order, up to `cap` - for the views that window their rows themselves
     * (the Table view's Data Grid, the JSON view's Virtual List): they scroll, sort and count over all of it, so
     * nothing is loaded while the reader scrolls.
     */
    async findAll(dbName: string, name: string, spec: FindSpec = {}, cap = FIND_ALL_CAP) {
      const c = await coll(dbName, name);
      const req = await request(c, spec);
      const projection = parseDocument(spec.project ?? '', 'projection');
      const { value: result, ms } = await timed(() =>
        c.query({ ...req, limit: Math.max(1, cap) } as never, { count: 'exact' }),
      );
      const plan = await c.explain(req as never);
      return {
        rows: (result.rows as unknown as Record<string, unknown>[]).map((r) => project(r, projection)),
        total: result.summary.totalResultRows ?? null,
        scanned: result.summary.scannedRows ?? null,
        ms,
        revision: String(result.summary.revision ?? ''),
        access: plan.access.kind as string,
        index: (plan.access as { index?: string }).index ?? null,
      };
    },
    async get(dbName: string, name: string, id: string | number) {
      return (await coll(dbName, name)).get(id as never);
    },
    async insert(dbName: string, name: string, doc: Record<string, unknown>) {
      await this.createCollection(dbName, name);
      return (await coll(dbName, name)).insert(doc as never);
    },
    /** Many documents in atomic batches (a transaction holds 10,000 operations - indexes count). */
    async insertMany(dbName: string, name: string, docs: Record<string, unknown>[], batch = 1000) {
      await this.createCollection(dbName, name);
      const c = await coll(dbName, name);
      let n = 0;
      for (let i = 0; i < docs.length; i += batch) n += (await c.insertMany(docs.slice(i, i + batch) as never)).length;
      return n;
    },
    /** Replaces a whole document (an edited one). */
    async put(dbName: string, name: string, doc: Record<string, unknown>) {
      return (await coll(dbName, name)).put(doc as never);
    },
    async update(dbName: string, name: string, id: string | number, patch: Record<string, unknown>) {
      return (await coll(dbName, name)).update(id as never, patch as never);
    },
    async remove(dbName: string, name: string, id: string | number) {
      return (await coll(dbName, name)).delete(id as never);
    },
    /** Deletes what a filter matches; returns how many. */
    async deleteMany(dbName: string, name: string, filter: string) {
      const c = await coll(dbName, name);
      return c.deleteMany((await request(c, { filter })) as never);
    },
    async indexes(dbName: string, name: string) {
      return (await coll(dbName, name)).indexes();
    },
    async createIndex(dbName: string, name: string, spec: IndexSpec) {
      const c = await coll(dbName, name);
      await c.createIndex({
        name: spec.name,
        fields: spec.fields,
        ...(spec.order ? { order: spec.order } : {}),
        ...(spec.unique ? { unique: true } : {}),
      } as never);
      return spec.name;
    },
    async dropIndex(dbName: string, name: string, index: string) {
      return (await coll(dbName, name)).dropIndex(index);
    },
    /** Groups what a filter matches and measures each group, the largest count first. */
    async aggregate(dbName: string, name: string, spec: AggregateSpec) {
      const c = await coll(dbName, name);
      const q = c.q as unknown as Builders & Record<string, (...a: unknown[]) => unknown>;
      const ref = (f: string) => (f.includes('.') ? q.path(f) : q.field(f));
      const num = (f: string) => (f.includes('.') ? q.number(q.path(f)) : q.field(f));
      const keys = spec.groupBy.map((k) => (typeof k === 'string' ? { field: k, by: 'value' as GroupBy } : k));
      // defuss-db's grouping keys: case-folded text, one group per element, calendar units and parts in a time zone
      const zone = spec.timeZone && spec.timeZone !== 'UTC' ? { timeZone: spec.timeZone } : {};
      const key = (k: KeySpec) => {
        const r = ref(k.field);
        if (!k.by || k.by === 'value') return r;
        if (k.by === 'lower' || k.by === 'upper' || k.by === 'each') return q[k.by]!(r);
        if (k.by in DATE_PARTS) return q.datePart!(r, DATE_PARTS[k.by as keyof typeof DATE_PARTS], zone);
        return q.dateTrunc!(r, k.by, {
          ...zone,
          ...(k.bin && k.bin > 1 ? { binSize: k.bin } : {}),
          ...(k.by === 'week' && k.weekStart && k.weekStart !== 'monday' ? { startOfWeek: k.weekStart } : {}),
        });
      };
      const groupBy = Object.fromEntries(keys.map((k, i) => [`g${i}`, key(k)]));
      const measure = (m: MeasureSpec) => {
        if (m.op === 'count') return m.field ? q.count(ref(m.field)) : q.count();
        if (!m.field) throw new Error(`${m.op}: which field?`);
        // sums, averages, medians, percentiles and deviations read numbers; the others compare any value (text, dates)
        const p = { p90: 0.9, p95: 0.95, p99: 0.99 }[m.op as 'p90'];
        if (p) return q.percentile!(num(m.field), p);
        return NUMERIC_OPS.includes(m.op) ? q[m.op]!(num(m.field)) : q[m.op]!(ref(m.field));
      };
      const measures = Object.fromEntries(spec.measures.map((m, i) => [`m${i}`, measure(m)]));
      const req = await request(c, { filter: spec.filter });
      const orderBy =
        spec.order === 'key' && keys.length
          ? [{ field: 'g0', direction: 'asc' }]
          : [{ field: 'm0', direction: spec.measures[0]?.op === 'distinct' ? 'asc' : 'desc' }];
      const { value: result, ms } = await timed(() =>
        c.aggregate(
          { ...req, ...(keys.length ? { groupBy } : {}), measures, orderBy } as never,
          { limit: spec.limit ?? 50 } as never,
        ),
      );
      return {
        rows: (result.rows as unknown as Record<string, unknown>[]).map((r) => ({
          keys: keys.map((_k, i) => r[`g${i}`]),
          values: spec.measures.map((_m, i) => r[`m${i}`]),
        })),
        groups: result.summary.totalResultRows ?? null,
        ms,
      };
    },
    /** The schema of a sample: field paths, how often and with which types they appear. */
    async schema(dbName: string, name: string, sample = 500) {
      const c = await coll(dbName, name);
      const docs = (await c.find({ limit: sample } as never)) as unknown as Record<string, unknown>[];
      return { sampled: docs.length, fields: schemaOf(docs) };
    },
    /**
     * The collection's JSON Schema from a sample spread over all of it (defuss-db's analyzeSchema) - with `at` (ISO
     * text) as the collection was then, which needs a collection that tracks history.
     */
    async jsonSchema(dbName: string, name: string, options: { sample?: number; at?: string } = {}) {
      const c = await coll(dbName, name);
      const at = options.at ? new Date(options.at) : undefined;
      const r = await analyzeSchema(c as never, { sample: options.sample ?? 1000, ...(at ? { at } : {}) });
      return { schema: r.schema, sampled: r.sampled, total: r.total, at: r.at };
    },
    /** Distinct values of a field in a sample (the query bar's suggestions). */
    async values(dbName: string, name: string, field: string, sample = 300) {
      const c = await coll(dbName, name);
      const docs = (await c.find({ limit: sample } as never)) as unknown as Record<string, unknown>[];
      return [
        ...new Set(docs.map((d) => getPath(d, field)).filter((v) => v !== undefined && typeof v !== 'object')),
      ].slice(0, 50);
    },
    async stats(dbName: string) {
      const s = (await (await db(dbName)).stats()) as Record<string, unknown>;
      return {
        revision: String(s.revision ?? ''),
        bytes: (s.committedBytes ?? s.bytes ?? null) as number | null,
        entries: (s.storedEntries ?? null) as number | null,
        durability: (s.durability ?? null) as string | null,
      };
    },
    /** A Brotli archive of the database (collections, documents, indexes). */
    async export(dbName: string) {
      return (await db(dbName)).export({ quality: 4 } as never);
    },
    async import(dbName: string, bytes: Uint8Array) {
      await this.createDatabase(dbName);
      return (await db(dbName)).import(bytes as never);
    },
    /** A collection's documents (the filter's, in the sort's order) as a file: JSON, NDJSON or CSV, compressed. */
    async exportCollection(dbName: string, name: string, spec: ExportSpec) {
      const c = await coll(dbName, name);
      const req = await request(c, spec);
      const docs = (await c.find(req as never)) as unknown as Record<string, unknown>[];
      const text = encode(docs, spec.format);
      const bytes = await compress(new TextEncoder().encode(text), spec.compression);
      return { bytes, count: docs.length, rawBytes: text.length };
    },
    /** The documents of a file, read but not written: their number, the format read and the first few. */
    async previewImport(bytes: Uint8Array, spec: Pick<ImportSpec, 'format' | 'compression'>) {
      const docs = decode(new TextDecoder().decode(await decompress(bytes, spec.compression)), spec.format);
      return { count: docs.length, sample: docs.slice(0, 3) };
    },
    /** Writes a file's documents into a collection, 1,000 per transaction; returns how many. */
    async importCollection(dbName: string, name: string, bytes: Uint8Array, spec: ImportSpec) {
      const docs = decode(new TextDecoder().decode(await decompress(bytes, spec.compression)), spec.format);
      await this.createCollection(dbName, name);
      const c = await coll(dbName, name);
      let n = 0;
      for (let i = 0; i < docs.length; i += 1000) {
        const part = docs.slice(i, i + 1000);
        if (spec.mode === 'upsert') {
          // one transaction per part: a document with an id replaces the one it names, one without gets a new id
          await (
            await db(dbName)
          ).transaction(async (tx) => {
            const t = tx.collection(name);
            for (const d of part) await (d.id === undefined ? t.insert(d as never) : t.put(d as never));
          });
          n += part.length;
        } else n += (await c.insertMany(part as never)).length;
      }
      return n;
    },
    async close() {
      for (const d of dbs.values()) await (await d).close();
      dbs.clear();
      return true;
    },
  };
}

export type Ops = ReturnType<typeof createOps>;
