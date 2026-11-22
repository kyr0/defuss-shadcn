import { describe, expect, it } from 'vitest';
import { openMemory } from 'defuss-db';
import { createOps } from '../src/documentation/runtime/db/ops.ts';
import {
  compress,
  decode,
  decompress,
  detect,
  encode,
  extension,
  type Compression,
  type TransferFormat,
} from '../src/documentation/runtime/db/transfer.ts';

/**
 * Why: Export > Collection writes a file another tool (or this app) reads back - a Date that comes back as a string,
 * a nested field that comes back flat or a compressed file that does not open loses the reader's data. These round-trip
 * every format and compression through a real in-memory defuss-db.
 */
const docs = Array.from({ length: 25 }, (_, i) => ({
  id: `o-${i}`,
  customer: i % 3 ? `Ada "${i}"` : 'Grace, Hopper',
  amount: i * 2.5,
  paid: i % 2 === 0,
  createdAt: new Date(Date.UTC(2026, 0, 1 + i, 9)),
  address: { city: ['Berlin', 'Wien'][i % 2]!, zip: String(10000 + i) },
  tags: i % 4 ? ['a', 'b'] : [],
  ...(i % 5 === 0 ? { note: 'line one\nline two' } : {}),
}));

describe('collection transfer', () => {
  it('reads a file name: format, compression, archive', () => {
    expect(detect('orders.ndjson.gz')).toEqual({ format: 'ndjson', compression: 'gzip', archive: false });
    expect(detect('orders.JSONL')).toEqual({ format: 'ndjson', compression: null, archive: false });
    expect(detect('shop.dbsonl.br')).toEqual({ format: null, compression: 'brotli', archive: true });
    expect(detect('people.csv.br')).toEqual({ format: 'csv', compression: 'brotli', archive: false });
    expect(extension('csv', 'gzip')).toBe('.csv.gz');
    expect(extension('json', 'none')).toBe('.json');
  });

  it('JSON and NDJSON keep every value and type', () => {
    for (const format of ['json', 'ndjson'] as TransferFormat[]) {
      const back = decode(encode(docs, format), format);
      expect(back).toEqual(docs);
      expect(back[0]!.createdAt).toBeInstanceOf(Date);
      // and found by its content alone
      expect(decode(encode(docs, format), null)).toEqual(docs);
    }
    // a BigInt as Extended JSON
    expect(decode(encode([{ id: 1, n: 12n }], 'ndjson'), 'ndjson')[0]!.n).toBe(12n);
  });

  it('CSV flattens nested fields to dot paths and reads cells back as numbers, booleans and dates', () => {
    const text = encode(docs, 'csv');
    expect(text.split('\r\n')[0]).toBe('id,customer,amount,paid,createdAt,address.city,address.zip,tags,note');
    expect(text).toContain('"Grace, Hopper"');
    expect(text).toContain('"Ada ""1"""');
    const back = decode(text, 'csv');
    expect(back.length).toBe(docs.length);
    // a zip of digits reads back as a number: a CSV cell has no type
    expect(back).toEqual(docs.map((d) => ({ ...d, address: { ...d.address, zip: Number(d.address.zip) } })));
  });

  it('gzip and Brotli round-trip; gzip is recognized without a name', async () => {
    const bytes = new TextEncoder().encode(encode(docs, 'ndjson'));
    for (const c of ['none', 'gzip', 'brotli'] as Compression[]) {
      const packed = await compress(bytes, c);
      if (c !== 'none') expect(packed.length).toBeLessThan(bytes.length / 2);
      expect(await decompress(packed, c)).toEqual(bytes);
    }
    expect(await decompress(await compress(bytes, 'gzip'), null)).toEqual(bytes);
  });

  it('says where a file is broken', () => {
    expect(() => decode('{"id":1}\n{"id":', 'ndjson')).toThrow(/line 2/);
    expect(() => decode('[1, 2]', 'json')).toThrow(/document 1 is no object/);
    expect(() => decode('a,b\n"x,1', 'csv')).toThrow(/not closed/);
  });

  it('exports a collection and imports it into another - insert refuses a known id, upsert replaces it', async () => {
    const ops = createOps((name) => openMemory({ name }));
    await ops.createDatabase('admin');
    await ops.insertMany('shop', 'orders', docs);
    const out = await ops.exportCollection('shop', 'orders', {
      filter: '{ paid: true }',
      sort: '{ amount: -1 }',
      format: 'ndjson',
      compression: 'gzip',
    });
    expect(out.count).toBe(13);
    const preview = await ops.previewImport(out.bytes, { format: null, compression: null });
    expect(preview.count).toBe(13);
    expect(preview.sample[0]!.id).toBe('o-24');
    expect(
      await ops.importCollection('copy', 'orders', out.bytes, { format: null, compression: null, mode: 'insert' }),
    ).toBe(13);
    const got = await ops.find('copy', 'orders', { sort: '{ amount: -1 }', limit: 100 });
    expect(got.rows).toEqual(docs.filter((d) => d.paid).sort((a, b) => b.amount - a.amount));
    await expect(
      ops.importCollection('copy', 'orders', out.bytes, { format: null, compression: null, mode: 'insert' }),
    ).rejects.toThrow();
    const changed = await compress(
      new TextEncoder().encode(encode([{ ...docs[0]!, amount: 999 }, { customer: 'new' }], 'json')),
      'brotli',
    );
    expect(
      await ops.importCollection('copy', 'orders', changed, { format: 'json', compression: 'brotli', mode: 'upsert' }),
    ).toBe(2);
    expect(((await ops.get('copy', 'orders', 'o-0')) as { amount?: number } | undefined)?.amount).toBe(999);
    expect((await ops.collections('copy'))[0]!.count).toBe(14);
    await ops.close();
  });
});
