/**
 * A collection's documents as a file and back - the Database Explorer's Export and Import of a collection: JSON
 * (an Extended JSON array), NDJSON (one Extended JSON document per line) or CSV (dot paths as columns), each plain,
 * gzip or Brotli. The database archive (every collection with its indexes) is defuss-db's own export; this is the
 * file another tool reads - MongoDB's mongoexport writes the same Extended JSON, a spreadsheet the CSV.
 *
 * Why Extended JSON and not plain JSON: a document's Dates and BigInts come back as Dates and BigInts
 * ({ "$date": ... }, { "$numberLong": ... }), which plain JSON would turn into strings. CSV keeps only what a cell
 * holds: numbers, booleans and ISO dates are read back as such, everything else as text.
 *
 * VERIFIED: tests/db-transfer.test.ts round-trips every format and compression through a real openMemory database.
 */
import { revive, stringify } from './query.ts';

export type TransferFormat = 'json' | 'ndjson' | 'csv';
export type Compression = 'none' | 'gzip' | 'brotli';
type Doc = Record<string, unknown>;

/** The file name extension of a format and compression (`.ndjson.gz`). */
export const extension = (format: TransferFormat, compression: Compression): string =>
  `.${format}${compression === 'gzip' ? '.gz' : compression === 'brotli' ? '.br' : ''}`;

/** What a file name says (`orders.ndjson.gz` → ndjson, gzip); null where it says nothing. */
export function detect(name: string): {
  format: TransferFormat | null;
  compression: Compression | null;
  archive: boolean;
} {
  const n = name.toLowerCase();
  const compression = n.endsWith('.gz') ? 'gzip' : n.endsWith('.br') ? 'brotli' : null;
  const base = compression ? n.replace(/\.(gz|br)$/, '') : n;
  const archive = base.endsWith('.dbsonl');
  const format = /\.(ndjson|jsonl)$/.test(base)
    ? 'ndjson'
    : base.endsWith('.json')
      ? 'json'
      : base.endsWith('.csv')
        ? 'csv'
        : null;
  return { format, compression, archive };
}

/** Bytes compressed: gzip through the platform's CompressionStream, Brotli through defuss-brotli (WASM). */
export async function compress(bytes: Uint8Array, compression: Compression): Promise<Uint8Array> {
  if (compression === 'gzip') return stream(bytes, new CompressionStream('gzip'));
  if (compression === 'brotli') {
    const codec = await import('defuss-brotli/compressor');
    await codec.init();
    return codec.compress(bytes, { quality: 6 });
  }
  return bytes;
}

/** Bytes decompressed; gzip is recognized by its magic bytes, Brotli (which has none) by the name or `compression`. */
export async function decompress(bytes: Uint8Array, compression: Compression | null): Promise<Uint8Array> {
  if (compression === 'gzip' || (compression === null && bytes[0] === 0x1f && bytes[1] === 0x8b))
    return stream(bytes, new DecompressionStream('gzip'));
  if (compression === 'brotli') {
    const codec = await import('defuss-brotli/decompressor');
    await codec.init();
    return codec.decompress(bytes, { maxOutputSize: 512 * 1024 * 1024 });
  }
  return bytes;
}

async function stream(bytes: Uint8Array, through: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(
    new Blob([bytes as BlobPart]).stream().pipeThrough(through as unknown as TransformStream<Uint8Array, Uint8Array>),
  );
  return new Uint8Array(await out.arrayBuffer());
}

/** Documents as the text of a format. */
export function encode(docs: Doc[], format: TransferFormat): string {
  if (format === 'json') return `[\n${docs.map((d) => '  ' + stringify(d, 0)).join(',\n')}\n]\n`;
  if (format === 'ndjson') return docs.map((d) => stringify(d, 0)).join('\n') + (docs.length ? '\n' : '');
  // CSV: one column per dot path of a scalar (objects are flattened, arrays stay one JSON cell)
  const rows = docs.map((d) => flatten(d));
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cell = (v: unknown) => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[",\n\r]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return (
    [columns.map(cell).join(','), ...rows.map((r) => columns.map((c) => cell(r[c])).join(','))].join('\r\n') + '\r\n'
  );
}

/** A document's scalars by dot path, as CSV cells hold them: Dates as ISO text, arrays and binary as JSON. */
function flatten(doc: Doc, prefix = '', out: Record<string, unknown> = {}): Record<string, unknown> {
  for (const [k, v] of Object.entries(doc)) {
    const path = prefix + k;
    if (v instanceof Date) out[path] = Number.isNaN(v.getTime()) ? '' : v.toISOString();
    else if (typeof v === 'bigint') out[path] = v.toString();
    else if (
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      !(v instanceof Map) &&
      !ArrayBuffer.isView(v) &&
      !(v instanceof Set)
    )
      flatten(v as Doc, path + '.', out);
    else if (v !== null && typeof v === 'object') out[path] = stringify(v, 0);
    else out[path] = v;
  }
  return out;
}

/** The documents of a file's text. A JSON file may also be one document or MongoDB's NDJSON with a .json name. */
export function decode(text: string, format: TransferFormat | null): Doc[] {
  const src = text.replace(/^\uFEFF/, '');
  const fmt = format ?? sniff(src);
  if (fmt === 'csv') return parseCsv(src);
  if (fmt === 'json') {
    const t = src.trim();
    if (!t) return [];
    try {
      const value = JSON.parse(t);
      const list = Array.isArray(value) ? value : [value];
      return list.map((d, i) => asDoc(revive(d), i + 1));
    } catch (err) {
      // mongoexport writes one document per line under a .json name
      if (t.startsWith('{') && t.includes('\n')) return decode(src, 'ndjson');
      throw new Error(`JSON: ${(err as Error).message}`);
    }
  }
  const docs: Doc[] = [];
  src.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    try {
      docs.push(asDoc(revive(JSON.parse(line)), i + 1));
    } catch (err) {
      throw new Error(`line ${i + 1}: ${(err as Error).message}`);
    }
  });
  return docs;
}

function asDoc(v: unknown, n: number): Doc {
  if (!v || typeof v !== 'object' || Array.isArray(v) || v instanceof Date)
    throw new Error(`document ${n} is no object`);
  return v as Doc;
}

const sniff = (t: string): TransferFormat => {
  const s = t.trimStart();
  if (s.startsWith('[')) return 'json';
  if (s.startsWith('{')) return /\}\s*\r?\n\s*\{/.test(s) ? 'ndjson' : 'json';
  return 'csv';
};

/** RFC 4180 CSV; the header's dot paths become nested fields, cells are typed (number, boolean, ISO date, JSON). */
function parseCsv(text: string): Doc[] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === '') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (quoted) throw new Error('CSV: a quoted cell is not closed');
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.some((c) => c !== ''));
  if (!header) return [];
  return body.map((r) => {
    const doc: Doc = {};
    header.forEach((path, i) => {
      const raw = r[i] ?? '';
      if (raw === '') return;
      const parts = path.split('.');
      let at = doc;
      for (const p of parts.slice(0, -1)) at = (at[p] ??= {}) as Doc;
      at[parts.at(-1)!] = typed(raw);
    });
    return doc;
  });
}

function typed(raw: string): unknown {
  if (/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(raw)) {
    const n = Number(raw);
    return Number.isSafeInteger(n) || !/^-?\d+$/.test(raw) ? n : BigInt(raw);
  }
  if (raw === 'true' || raw === 'false') return raw === 'true';
  if (/^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d+)?)?(Z|[+-]\d\d:\d\d)$/.test(raw)) return new Date(raw);
  if (/^[[{]/.test(raw)) {
    try {
      return revive(JSON.parse(raw));
    } catch {
      return raw;
    }
  }
  return raw;
}
