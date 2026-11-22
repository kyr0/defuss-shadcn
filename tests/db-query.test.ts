import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { openMemory } from 'defuss-db';
import { createOps } from '../src/documentation/runtime/db/ops.ts';
import { parseDocument, project, QueryError, schemaOf, translateSort } from '../src/documentation/runtime/db/query.ts';

/**
 * Why: the Database Explorer's query bar speaks MongoDB's query language and defuss-db answers it - a filter that
 * translates to the wrong request shows the reader wrong documents without an error. These run every supported
 * operator against a real in-memory defuss-db and compare with the documents a plain loop selects.
 */

const docs = Array.from({ length: 60 }, (_, i) => ({
  id: i + 1,
  customer: ['Ada', 'Alan', 'Grace', 'Linus'][i % 4]!,
  country: ['DE', 'AT', 'FR'][i % 3]!,
  amount: (i * 37) % 200,
  paid: i % 2 === 0,
  createdAt: new Date(Date.UTC(2026, 0, 1 + i)),
  address: { city: ['Berlin', 'Wien', 'Paris', 'Lyon'][i % 4]!, zip: String(10000 + i) },
  ...(i % 5 === 0 ? { note: 'call first' } : {}),
}));
type Doc = (typeof docs)[number];

const ops = createOps((name) => openMemory({ name }));
const ids = async (filter: string, sort = '{ id: 1 }') =>
  (await ops.find('shop', 'orders', { filter, sort, limit: 1000 })).rows.map((r) => r.id);
const expected = (pick: (d: Doc) => boolean) => docs.filter(pick).map((d) => d.id);

beforeAll(async () => {
  await ops.createDatabase('admin');
  await ops.insertMany('shop', 'orders', docs);
});
afterAll(() => ops.close());

describe('parseDocument: the shell form a query bar holds', () => {
  it('reads JSON and the relaxed form - unquoted keys, single quotes, a trailing comma, ISODate, NumberLong', () => {
    expect(parseDocument('{ "a": 1 }')).toEqual({ a: 1 });
    expect(parseDocument("{ country: 'DE', amount: { $gt: 10, }, }")).toEqual({ country: 'DE', amount: { $gt: 10 } });
    expect(parseDocument("{ 'address.city': 'Berlin' }")).toEqual({ 'address.city': 'Berlin' });
    expect(parseDocument("{ at: { $gte: ISODate('2026-01-05') } }")).toEqual({ at: { $gte: new Date('2026-01-05') } });
    expect(parseDocument('{ n: NumberLong("9007199254740993") }')).toEqual({ n: 9007199254740993n });
    expect(parseDocument('{ at: { "$date": "2026-02-01T00:00:00Z" } }').at).toEqual(new Date('2026-02-01T00:00:00Z'));
    expect(parseDocument("{ s: 'it\\'s' }")).toEqual({ s: "it's" });
    expect(parseDocument('   ')).toEqual({});
  });
  it('names what is wrong', () => {
    expect(() => parseDocument('{ a: ', 'filter')).toThrow(QueryError);
    expect(() => parseDocument('[1]', 'sort')).toThrow(/sort: a document/);
    expect(() => parseDocument("{ a: 'open }")).toThrow(/not closed/);
  });
});

describe('a filter document against a real defuss-db', () => {
  it('equality, comparisons and $in on top-level fields', async () => {
    expect(await ids("{ country: 'DE' }")).toEqual(expected((d) => d.country === 'DE'));
    expect(await ids('{ amount: { $gt: 100, $lte: 150 } }')).toEqual(
      expected((d) => d.amount > 100 && d.amount <= 150),
    );
    expect(await ids("{ country: { $ne: 'DE' } }")).toEqual(expected((d) => d.country !== 'DE'));
    expect(await ids("{ customer: { $in: ['Ada', 'Grace'] } }")).toEqual(
      expected((d) => ['Ada', 'Grace'].includes(d.customer)),
    );
    expect(await ids('{ paid: true, amount: { $lt: 50 } }')).toEqual(expected((d) => d.paid && d.amount < 50));
  });
  it('dates compare by time', async () => {
    expect(await ids("{ createdAt: { $gte: ISODate('2026-02-01') } }")).toEqual(
      expected((d) => d.createdAt >= new Date('2026-02-01')),
    );
  });
  it('dot paths, $nin, $exists and $not', async () => {
    expect(await ids("{ 'address.city': 'Wien' }")).toEqual(expected((d) => d.address.city === 'Wien'));
    expect(await ids("{ country: { $nin: ['DE', 'AT'] } }")).toEqual(
      expected((d) => !['DE', 'AT'].includes(d.country)),
    );
    expect(await ids('{ note: { $exists: true } }')).toEqual(expected((d) => 'note' in d));
    expect(await ids('{ note: { $exists: false } }')).toEqual(expected((d) => !('note' in d)));
    expect(await ids('{ amount: { $not: { $gt: 20 } } }')).toEqual(expected((d) => !(d.amount > 20)));
  });
  it('$or, $and and $nor', async () => {
    expect(await ids("{ $or: [{ country: 'FR' }, { amount: { $gt: 180 } }] }")).toEqual(
      expected((d) => d.country === 'FR' || d.amount > 180),
    );
    expect(await ids("{ $and: [{ paid: false }, { 'address.city': 'Lyon' }] }")).toEqual(
      expected((d) => !d.paid && d.address.city === 'Lyon'),
    );
    expect(await ids("{ $nor: [{ country: 'DE' }, { paid: true }] }")).toEqual(
      expected((d) => !(d.country === 'DE' || d.paid)),
    );
  });
  it('$regex as a prefix, a suffix or a substring', async () => {
    expect(await ids("{ customer: { $regex: '^Al' } }")).toEqual(expected((d) => d.customer.startsWith('Al')));
    expect(await ids("{ customer: { $regex: 'ace$' } }")).toEqual(expected((d) => d.customer.endsWith('ace')));
    expect(await ids("{ customer: { $regex: 'nu' } }")).toEqual(expected((d) => d.customer.includes('nu')));
    await expect(ids("{ customer: { $regex: 'a.c' } }")).rejects.toThrow(/\$regex takes/);
  });
  it('findAll: every match in its order for the windowed views, up to a cap; a later page may skip the count', async () => {
    const all = await ops.findAll('shop', 'orders', { filter: "{ country: 'DE' }", sort: '{ amount: -1, id: 1 }' });
    const want = docs
      .filter((d) => d.country === 'DE')
      .sort((a, b) => b.amount - a.amount || a.id - b.id)
      .map((d) => d.id);
    expect(all.rows.map((r) => r.id)).toEqual(want);
    expect(all.total).toBe(want.length);
    const capped = await ops.findAll('shop', 'orders', { sort: '{ id: 1 }' }, 7);
    expect([capped.rows.length, capped.total]).toEqual([7, docs.length]);
    const later = await ops.find('shop', 'orders', { sort: '{ id: 1 }', skip: 20, limit: 5, count: false });
    expect(later.rows.map((r) => r.id)).toEqual([21, 22, 23, 24, 25]);
  });
  it('arrays as MongoDB matches them: an element matches, $all, $size, $elemMatch; $type, $mod, $regex with i', async () => {
    const rows = [
      { id: 1, tags: ['red', 'blue'], n: 4, lines: [{ sku: 'a', qty: 2 }] },
      { id: 2, tags: ['blue'], n: 7, lines: [{ sku: 'b', qty: 9 }] },
      { id: 3, tags: [], n: 'seven', lines: [] },
      { id: 4, tags: ['Red'], n: 10, lines: [{ sku: 'a', qty: 12 }] },
    ];
    await ops.insertMany('lab', 'tagged', rows);
    const find = async (filter: string) =>
      (await ops.find('lab', 'tagged', { filter, sort: '{ id: 1 }' })).rows.map((r) => r.id);
    expect(await find("{ tags: 'blue' }")).toEqual([1, 2]);
    expect(await find("{ tags: { $all: ['red', 'blue'] } }")).toEqual([1]);
    expect(await find('{ tags: { $size: 0 } }')).toEqual([3]);
    expect(await find("{ lines: { $elemMatch: { sku: 'a', qty: { $gt: 5 } } } }")).toEqual([4]);
    expect(await find("{ 'lines.qty': { $gt: 8 } }")).toEqual([2, 4]);
    expect(await find("{ n: { $type: 'string' } }")).toEqual([3]);
    expect(await find('{ n: { $mod: [2, 0] } }')).toEqual([1, 4]);
    expect(await find("{ tags: { $regex: '^red', $options: 'i' } }")).toEqual([1, 4]);
  });
  it('sort, skip, limit and the exact total', async () => {
    const r = await ops.find('shop', 'orders', {
      filter: "{ country: 'AT' }",
      sort: '{ amount: -1, id: 1 }',
      skip: 2,
      limit: 3,
    });
    const all = docs.filter((d) => d.country === 'AT').sort((a, b) => b.amount - a.amount || a.id - b.id);
    expect(r.rows.map((x) => x.id)).toEqual(all.slice(2, 5).map((d) => d.id));
    expect(r.total).toBe(all.length);
    expect(translateSort({ a: 1, b: -1 })).toEqual([
      { field: 'a', direction: 'asc' },
      { field: 'b', direction: 'desc' },
    ]);
    expect(() => translateSort({ a: 2 })).toThrow(/1 or -1/);
  });
  it('an index answers an equality filter (explain names it)', async () => {
    await ops.createIndex('shop', 'orders', { name: 'byCountry', fields: ['country'] });
    const r = await ops.find('shop', 'orders', { filter: "{ country: 'DE' }" });
    expect(r.access).toBe('equality');
  });
});

describe('projection, aggregation and schema', () => {
  it('includes or excludes fields, dot paths too', () => {
    const d = docs[0]!;
    expect(project(d, { customer: 1, 'address.city': 1 })).toEqual({
      id: 1,
      customer: 'Ada',
      address: { city: 'Berlin' },
    });
    expect(project(d, { customer: 1, id: 0 })).toEqual({ customer: 'Ada' });
    expect(Object.keys(project(d, { address: 0, createdAt: 0 }))).not.toContain('address');
    expect(() => project(d, { a: 1, b: 0 })).toThrow(/not both/);
  });
  it('groups what the filter matches and measures each group', async () => {
    const r = await ops.aggregate('shop', 'orders', {
      filter: '{ paid: true }',
      groupBy: ['country'],
      measures: [{ op: 'count' }, { op: 'sum', field: 'amount' }],
    });
    for (const row of r.rows) {
      const group = docs.filter((d) => d.paid && d.country === row.keys[0]);
      expect(row.values).toEqual([group.length, group.reduce((n, d) => n + d.amount, 0)]);
    }
    expect(r.rows.reduce((n, x) => n + (x.values[0] as number), 0)).toBe(docs.filter((d) => d.paid).length);
  });
  it('groups by text (case-folded), by a calendar unit and measures text: distinct counts, values, first and last', async () => {
    const byCustomer = await ops.aggregate('shop', 'orders', {
      groupBy: [{ field: 'customer', by: 'upper' }],
      measures: [
        { op: 'count' },
        { op: 'countDistinct', field: 'country' },
        { op: 'distinct', field: 'address.city' },
        { op: 'min', field: 'country' },
        { op: 'max', field: 'createdAt' },
      ],
      order: 'key',
    });
    expect(byCustomer.rows.map((r) => r.keys[0])).toEqual(['ADA', 'ALAN', 'GRACE', 'LINUS']);
    for (const row of byCustomer.rows) {
      const g = docs.filter((d) => d.customer.toUpperCase() === row.keys[0]);
      expect(row.values).toEqual([
        g.length,
        new Set(g.map((d) => d.country)).size,
        [...new Set(g.map((d) => d.address.city))].sort(),
        g.map((d) => d.country).sort()[0],
        new Date(Math.max(...g.map((d) => d.createdAt.getTime()))),
      ]);
    }
    const byMonth = await ops.aggregate('shop', 'orders', {
      groupBy: [{ field: 'createdAt', by: 'month' }],
      measures: [{ op: 'count' }],
      order: 'key',
    });
    expect(byMonth.rows.map((r) => [(r.keys[0] as Date).toISOString().slice(0, 7), r.values[0]])).toEqual([
      ['2026-01', 31],
      ['2026-02', 28],
      ['2026-03', 1],
    ]);
    expect(byMonth.groups).toBe(3);
  });
  it('groups dates by a part in a time zone, by bins and by weeks from Sunday; median, percentiles, deviations', async () => {
    const DAY = 86_400_000;
    // midnight UTC is 19:00 of the day before in New York: the weekday moves back one day
    const byWeekday = await ops.aggregate('shop', 'orders', {
      groupBy: [{ field: 'createdAt', by: 'weekday' }],
      measures: [{ op: 'count' }],
      order: 'key',
      timeZone: 'America/New_York',
    });
    const weekday = (d: Date) => ((d.getUTCDay() + 6) % 7) + 1;
    const want = new Map<number, number>();
    for (const d of docs) want.set(weekday(new Date(d.createdAt.getTime() - DAY)), (want.get(weekday(new Date(d.createdAt.getTime() - DAY))) ?? 0) + 1);
    expect(byWeekday.rows.map((r) => [r.keys[0], r.values[0]])).toEqual([...want].sort((a, b) => a[0] - b[0]));
    const hour = await ops.aggregate('shop', 'orders', {
      groupBy: [{ field: 'createdAt', by: 'hourOfDay' }],
      measures: [{ op: 'count' }],
      timeZone: 'Europe/Berlin',
    });
    expect(hour.rows.map((r) => [r.keys[0], r.values[0]])).toEqual([[1, docs.length]]);
    // ten-day bins counted from 2000-01-01, as MongoDB's $dateTrunc binSize counts them
    const bins = await ops.aggregate('shop', 'orders', {
      groupBy: [{ field: 'createdAt', by: 'day', bin: 10 }],
      measures: [{ op: 'count' }],
      order: 'key',
    });
    const origin = Date.UTC(2000, 0, 1);
    const binOf = (d: Date) => origin + Math.floor((d.getTime() - origin) / (10 * DAY)) * 10 * DAY;
    const wantBins = new Map<number, number>();
    for (const d of docs) wantBins.set(binOf(d.createdAt), (wantBins.get(binOf(d.createdAt)) ?? 0) + 1);
    expect(bins.rows.map((r) => [(r.keys[0] as Date).getTime(), r.values[0]])).toEqual([...wantBins]);
    const weeks = await ops.aggregate('shop', 'orders', {
      groupBy: [{ field: 'createdAt', by: 'week', weekStart: 'sunday' }],
      measures: [{ op: 'count' }],
      order: 'key',
    });
    expect(weeks.rows.every((r) => (r.keys[0] as Date).getUTCDay() === 0)).toBe(true);
    expect(weeks.rows.reduce((n, r) => n + (r.values[0] as number), 0)).toBe(docs.length);

    const stats = await ops.aggregate('shop', 'orders', {
      groupBy: [{ field: 'country' }],
      measures: [
        { op: 'median', field: 'amount' },
        { op: 'p90', field: 'amount' },
        { op: 'stdDevSamp', field: 'amount' },
        { op: 'stdDevPop', field: 'amount' },
      ],
      order: 'key',
    });
    // exact percentiles, interpolated linearly between the closest ranks (R's and NumPy's default)
    const pct = (xs: number[], p: number) => {
      const s = [...xs].sort((a, b) => a - b);
      const at = (s.length - 1) * p;
      const lo = Math.floor(at);
      return s[lo]! + (s[Math.min(lo + 1, s.length - 1)]! - s[lo]!) * (at - lo);
    };
    const sd = (xs: number[], sample: boolean) => {
      const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
      return Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - (sample ? 1 : 0)));
    };
    for (const row of stats.rows) {
      const xs = docs.filter((d) => d.country === row.keys[0]).map((d) => d.amount);
      const [median, p90, sdSamp, sdPop] = row.values as number[];
      expect(median).toBeCloseTo(pct(xs, 0.5), 9);
      expect(p90).toBeCloseTo(pct(xs, 0.9), 9);
      expect(sdSamp).toBeCloseTo(sd(xs, true), 9);
      expect(sdPop).toBeCloseTo(sd(xs, false), 9);
    }
  });
  it('a sampled schema names every path, how often it appears and its types', () => {
    const fields = Object.fromEntries(schemaOf(docs).map((f) => [f.path, f]));
    expect(fields['address.city']!.count).toBe(docs.length);
    expect(fields.createdAt!.types).toEqual({ date: docs.length });
    expect(fields.note!.count).toBe(docs.filter((d) => 'note' in d).length);
  });
  it("the JSON Schema view: defuss-db's analyzeSchema over a spread sample; As of needs history", async () => {
    const r = await ops.jsonSchema('shop', 'orders', { sample: 20 });
    expect([r.sampled, r.total, r.at]).toEqual([20, docs.length, null]);
    expect(r.schema.properties!.createdAt).toMatchObject({ type: 'string', format: 'date-time', 'x-dson': 'date' });
    expect(r.schema.properties!.note!['x-presence']).toBeGreaterThan(0);
    expect(r.schema.required).toContain('address');
    await expect(ops.jsonSchema('shop', 'orders', { at: '2026-01-01T00:00:00Z' })).rejects.toThrow(/History is disabled/);
  });
});

describe('the registry: databases, collections, drops', () => {
  it('lists databases with their collections; a dropped collection leaves the list', async () => {
    await ops.insert('shop', 'carts', { id: 'c1', items: 2 });
    expect((await ops.collections('shop')).map((c) => c.name)).toEqual(['carts', 'orders']);
    await ops.dropCollection('shop', 'carts');
    expect((await ops.collections('shop')).map((c) => c.name)).toEqual(['orders']);
    await ops.createCollection('shop', 'carts');
    expect((await ops.collections('shop')).find((c) => c.name === 'carts')?.count).toBe(0);
    const dbs = await ops.databases();
    expect(dbs.find((d) => d.name === 'shop')?.documents).toBe(docs.length);
  });
  it('refuses names the store cannot hold, and dropping admin', async () => {
    await expect(ops.collections('Shop')).rejects.toThrow(/database name/);
    await expect(ops.find('shop', '1x')).rejects.toThrow(/collection name/);
    await expect(ops.dropDatabase('admin')).rejects.toThrow(/cannot be dropped/);
  });
  it('collection options: history and timestamps on creation or later, read back, and timestamps stay on', async () => {
    await ops.createCollection('cms', 'posts', { history: true, timestamps: true });
    await ops.createCollection('cms', 'drafts');
    expect(await ops.collectionOptions('cms', 'posts')).toEqual({ history: true, timestamps: true });
    expect(await ops.collectionOptions('cms', 'drafts')).toEqual({ history: false, timestamps: false });
    await ops.insert('cms', 'posts', { id: 'p1', title: 'Hello' });
    const p1 = (await ops.get('cms', 'posts', 'p1')) as unknown as Record<string, unknown>;
    expect(p1._createdAt).toBeInstanceOf(Date);
    expect(p1._updatedAt).toEqual(p1._createdAt);
    // reading the options twice changes nothing; an ordinary insert keeps both
    await ops.insert('cms', 'drafts', { id: 'd1', title: 'Later' });
    expect(await ops.collectionOptions('cms', 'drafts')).toEqual({ history: false, timestamps: false });
    expect((await ops.collections('cms')).map(({ name, history, timestamps }) => [name, history, timestamps])).toEqual([
      ['drafts', false, false],
      ['posts', true, true],
    ]);
    // turned on later: existing documents are stamped, history starts with a seed version
    expect(await ops.enableOption('cms', 'drafts', 'timestamps')).toEqual({ history: false, timestamps: true });
    expect(((await ops.get('cms', 'drafts', 'd1')) as unknown as Record<string, unknown>)._createdAt).toBeInstanceOf(Date);
    expect(await ops.enableOption('cms', 'drafts', 'history')).toEqual({ history: true, timestamps: true });
    expect((await ops.history('cms', 'drafts', 'd1')).map((v) => v.kind)).toEqual(['seed']);
  });
  it("history and restore: a document's versions newest first; a deleted one comes back, a live one does not", async () => {
    await ops.put('cms', 'posts', { id: 'p1', title: 'Hello, world' });
    await ops.remove('cms', 'posts', 'p1');
    expect(await ops.get('cms', 'posts', 'p1')).toBeUndefined();
    const versions = await ops.history('cms', 'posts', 'p1');
    expect(versions.map((v) => [v.kind, v.document?.title ?? null])).toEqual([
      ['delete', null],
      ['put', 'Hello, world'],
      ['put', 'Hello'],
    ]);
    expect(versions[0]!.from).toBeInstanceOf(Date);
    expect(await ops.restore('cms', 'posts', 'p1')).toBe(true);
    expect(await ops.get('cms', 'posts', 'p1')).toMatchObject({ id: 'p1', title: 'Hello, world' });
    expect(await ops.restore('cms', 'posts', 'p1')).toBe(false);
    await expect(ops.history('shop', 'orders', 1)).rejects.toThrow(/History is disabled/);
  });
  it('an export imports into another database with its documents and indexes', async () => {
    const bytes = await ops.export('shop');
    await ops.import('copy', bytes);
    expect((await ops.collections('copy')).find((c) => c.name === 'orders')).toMatchObject({
      count: docs.length,
      indexes: 1,
    });
  });
});
